'use strict';

import {
  buildStoredZip,
  calculateStoredZipByteLength,
  CLASSIC_ZIP_MAX_BYTES,
  type StoredZipEntry
} from '../archive/stored-zip.js';
import { extractAppNameFromBundle } from '../utils.js';
import { hasIncompleteActualDiffTruncation } from './engine.js';
import { buildXlsxBlob, type XlsxCellStyle, type XlsxSheet } from './xlsx-builder.js';
import { buildDiffXlsxExport, type DiffXlsxContext } from './xlsx-export.js';

export const DEFAULT_DIFF_XLSX_BATCH_MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;

const ZIP_MIME_TYPE = 'application/zip';
const XLSX_EXTENSION = '.xlsx';
const ZIP_EXTENSION = '.zip';
const MAX_ARCHIVE_FILENAME_CODE_POINTS = 180;
const MAX_ENTRY_FILENAME_CODE_POINTS = 96;
const MAX_BUSINESS_NAME_CODE_POINTS = 36;
const BATCH_SUMMARY_ENTRY_NAME = '000_一括比較結果.xlsx';

export interface DiffXlsxBatchExportItem {
  label: string;
  context: DiffXlsxContext;
}

export interface DiffXlsxBatchExportFailure {
  /** Zero-based index in the input item array. */
  index: number;
  label: string;
  message: string;
}

export interface DiffXlsxBatchExportProgress {
  stage: 'building' | 'archiving';
  /** One-based workbook position while building; total while archiving. */
  current: number;
  total: number;
  label?: string;
}

export interface DiffXlsxBatchExportOptions {
  maxArchiveBytes?: number;
  generatedAt?: Date | string | number;
  archiveFilename?: string;
  onProgress?: (progress: DiffXlsxBatchExportProgress) => void;
}

export interface DiffXlsxBatchExportResult {
  filename: string;
  blob: Blob;
  /** Successful workbook entry names in input order. */
  entries: string[];
  failures: DiffXlsxBatchExportFailure[];
}

export type DiffXlsxBatchExportErrorCode = 'NO_SUCCESSFUL_WORKBOOK' | 'MAX_ARCHIVE_BYTES';

interface DiffXlsxBatchSummaryCounts {
  total: number;
  added: number;
  removed: number;
  changed: number;
  moved: number;
}

interface DiffXlsxBatchSummaryRow {
  sequence: number;
  sourceName: string;
  targetName: string;
  status: '差分なし' | '差分あり' | '比較未完了' | 'Excel生成失敗';
  counts: DiffXlsxBatchSummaryCounts | null;
  pairNameStatus: '一致' | '名称が異なります' | '名称未取得';
  filename: string;
}

export class DiffXlsxBatchExportError extends Error {
  readonly code: DiffXlsxBatchExportErrorCode;
  readonly failures: DiffXlsxBatchExportFailure[];
  readonly maxArchiveBytes?: number;
  readonly requiredArchiveBytes?: number;

  constructor(
    code: DiffXlsxBatchExportErrorCode,
    message: string,
    options: {
      failures?: DiffXlsxBatchExportFailure[];
      maxArchiveBytes?: number;
      requiredArchiveBytes?: number;
    } = {}
  ) {
    super(message);
    this.name = 'DiffXlsxBatchExportError';
    this.code = code;
    this.failures = [...(options.failures || [])];
    this.maxArchiveBytes = options.maxArchiveBytes;
    this.requiredArchiveBytes = options.requiredArchiveBytes;
  }
}

function resolveGeneratedAt(value: DiffXlsxBatchExportOptions['generatedAt']): Date {
  const date = value === undefined ? new Date() : (value instanceof Date ? new Date(value.getTime()) : new Date(value));
  if (!Number.isFinite(date.getTime())) throw new TypeError('generatedAt must be a valid date');
  return date;
}

function resolveMaxArchiveBytes(value: number | undefined): number {
  const resolved = value === undefined ? DEFAULT_DIFF_XLSX_BATCH_MAX_ARCHIVE_BYTES : value;
  if (!Number.isSafeInteger(resolved) || resolved <= 0 || resolved > CLASSIC_ZIP_MAX_BYTES) {
    throw new RangeError(`maxArchiveBytes must be an integer from 1 to ${CLASSIC_ZIP_MAX_BYTES}`);
  }
  return resolved;
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.trim() || 'Excelの生成に失敗しました';
}

function safeLabel(value: unknown, index: number): string {
  return String(value || '').trim() || `比較 ${index + 1}`;
}

function normalizeFilenameText(value: unknown): string {
  return String(value || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[._ ]+/g, '')
    .replace(/[. ]+$/g, '');
}

function truncateCodePoints(value: string, maxCodePoints: number): string {
  const points = Array.from(value);
  return points.length <= maxCodePoints ? value : points.slice(0, Math.max(0, maxCodePoints)).join('');
}

function contextAppName(context: DiffXlsxContext, side: 'source' | 'target'): string {
  try {
    return extractAppNameFromBundle(side === 'source' ? context.sourceBundle : context.targetBundle).trim();
  } catch {
    return '';
  }
}

function businessName(value: unknown): string {
  const original = String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!original) return '';
  let name = original.replace(/^\d+\s*[.．:：、_\-]\s*/u, '').trim();
  for (let index = 0; index < 3; index += 1) {
    const bracket = name.match(/^[【\[［(（]([^】\]］)）]+)[】\]］)）]\s*/u);
    if (!bracket) break;
    const marker = bracket[1].normalize('NFKC');
    if (!/(?:検証|本番|開発|環境|テスト|production|staging|prod|stg|dev|qa|mg)/iu.test(marker)) break;
    name = name.slice(bracket[0].length).trim();
  }
  return name || original;
}

function comparableBusinessName(value: unknown): string {
  return businessName(value)
    .normalize('NFKC')
    .toLocaleLowerCase('ja-JP')
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function pairNameStatus(sourceName: string, targetName: string): DiffXlsxBatchSummaryRow['pairNameStatus'] {
  if (!sourceName || !targetName) return '名称未取得';
  return comparableBusinessName(sourceName) === comparableBusinessName(targetName)
    ? '一致'
    : '名称が異なります';
}

function shortBusinessName(value: unknown): string {
  return truncateCodePoints(businessName(value), MAX_BUSINESS_NAME_CODE_POINTS).replace(/[. ]+$/g, '');
}

function shortWorkbookLabel(item: DiffXlsxBatchExportItem, index: number): string {
  const sourceFull = businessName(contextAppName(item.context, 'source'));
  const targetFull = businessName(contextAppName(item.context, 'target'));
  const source = shortBusinessName(sourceFull);
  const target = shortBusinessName(targetFull);
  if (source && target) {
    return comparableBusinessName(sourceFull) === comparableBusinessName(targetFull)
      ? source
      : `${source}_vs_${target}`;
  }
  return source || target || shortBusinessName(safeLabel(item.label, index)) || `比較_${index + 1}`;
}

function ensureExtension(value: string, extension: string): string {
  const withoutExtension = value.toLocaleLowerCase('en-US').endsWith(extension)
    ? value.slice(0, -extension.length)
    : value;
  return `${withoutExtension || '出力'}${extension}`;
}

function orderedXlsxEntryName(rawFilename: unknown, inputIndex: number, total: number): string {
  const prefixWidth = Math.max(3, String(Math.max(1, total)).length);
  const prefix = `${String(inputIndex + 1).padStart(prefixWidth, '0')}_`;
  const normalized = ensureExtension(normalizeFilenameText(rawFilename), XLSX_EXTENSION);
  const stem = normalized.slice(0, -XLSX_EXTENSION.length);
  const maxStem = MAX_ENTRY_FILENAME_CODE_POINTS - Array.from(prefix).length - XLSX_EXTENSION.length;
  const safeStem = truncateCodePoints(stem, Math.max(1, maxStem)).replace(/[. ]+$/g, '') || `比較_${inputIndex + 1}`;
  return `${prefix}${safeStem}${XLSX_EXTENSION}`;
}

function summarizeRows(context: DiffXlsxContext): DiffXlsxBatchSummaryCounts {
  const counts: DiffXlsxBatchSummaryCounts = { total: 0, added: 0, removed: 0, changed: 0, moved: 0 };
  for (const row of context.rows || []) {
    if (!row || row._displayOnly || row.type === 'same') continue;
    counts.total += 1;
    if (row.moved || row.type === 'moved') counts.moved += 1;
    else if (row.type === 'added') counts.added += 1;
    else if (row.type === 'removed') counts.removed += 1;
    else counts.changed += 1;
  }
  return counts;
}

function comparisonIncomplete(context: DiffXlsxContext): boolean {
  return !!((context.fetchIssues || []).length
    || (context.partialIssues || []).length
    || hasIncompleteActualDiffTruncation(context.truncation));
}

function successfulSummaryRow(
  item: DiffXlsxBatchExportItem,
  index: number,
  filename: string
): DiffXlsxBatchSummaryRow {
  const rawSourceName = contextAppName(item.context, 'source');
  const rawTargetName = contextAppName(item.context, 'target');
  const sourceName = rawSourceName || '名称未取得';
  const targetName = rawTargetName || '名称未取得';
  const counts = summarizeRows(item.context);
  return {
    sequence: index + 1,
    sourceName,
    targetName,
    status: comparisonIncomplete(item.context) ? '比較未完了' : counts.total > 0 ? '差分あり' : '差分なし',
    counts,
    pairNameStatus: pairNameStatus(rawSourceName, rawTargetName),
    filename
  };
}

function failedSummaryRow(
  item: DiffXlsxBatchExportItem,
  index: number
): DiffXlsxBatchSummaryRow {
  const rawSourceName = contextAppName(item.context, 'source');
  const rawTargetName = contextAppName(item.context, 'target');
  const sourceName = rawSourceName || '名称未取得';
  const targetName = rawTargetName || '名称未取得';
  return {
    sequence: index + 1,
    sourceName,
    targetName,
    status: 'Excel生成失敗',
    counts: null,
    pairNameStatus: pairNameStatus(rawSourceName, rawTargetName),
    filename: ''
  };
}

function summaryStatusStyle(status: DiffXlsxBatchSummaryRow['status']): XlsxCellStyle {
  if (status === '差分なし') return 'kpiGood';
  if (status === '差分あり') return 'kpiChange';
  if (status === '比較未完了') return 'kpiWarning';
  return 'kpiDanger';
}

function buildBatchSummaryBlob(summaryRows: readonly DiffXlsxBatchSummaryRow[]): Blob {
  const rows: XlsxSheet['rows'] = [
    ['No.', '比較元', '比較先', '結果', '合計', '追加', '削除', '変更', '並び順変更', 'アプリ名', 'Excelファイル'],
    ...summaryRows.map((row) => [
      row.sequence,
      row.sourceName,
      row.targetName,
      row.status,
      row.counts?.total ?? null,
      row.counts?.added ?? null,
      row.counts?.removed ?? null,
      row.counts?.changed ?? null,
      row.counts?.moved ?? null,
      row.pairNameStatus,
      row.filename
    ])
  ];
  const cellStyles: XlsxSheet['cellStyles'] = rows.map(() => []);
  for (let index = 1; index < rows.length; index += 1) {
    const summary = summaryRows[index - 1];
    cellStyles[index] = [
      'center',
      'normal',
      'normal',
      summaryStatusStyle(summary.status),
      'center',
      'center',
      'center',
      'center',
      'center',
      summary.pairNameStatus === '一致' ? 'center' : 'warning',
      'normal'
    ];
  }
  return buildXlsxBlob([{
    name: '一括比較結果',
    rows,
    headerRow: 1,
    freezeRows: 1,
    freezeColumns: 1,
    autoFilter: true,
    colWidths: [7, 30, 30, 14, 10, 10, 10, 10, 14, 26, 48],
    rowStyles: rows.map(() => 'normal'),
    cellStyles,
    rowHeights: rows.map((_, index) => index === 0 ? 32 : 38),
    styledEmptyCellsAsBlank: true,
    materializeEmptyCellsFromRow: 1,
    showGridLines: false,
    zoomScale: 90,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 1 },
      horizontalCentered: true,
      footer: '&P / &N'
    }
  }]);
}

function defaultArchiveFilename(successCount: number, generatedAt: Date): string {
  const pad2 = (value: number) => String(value).padStart(2, '0');
  const stamp = `${generatedAt.getFullYear()}${pad2(generatedAt.getMonth() + 1)}${pad2(generatedAt.getDate())}`
    + `_${pad2(generatedAt.getHours())}${pad2(generatedAt.getMinutes())}${pad2(generatedAt.getSeconds())}`;
  return `設定差分確認_一括_${successCount}件_${stamp}${ZIP_EXTENSION}`;
}

function safeArchiveFilename(rawFilename: unknown, fallback: string): string {
  const normalized = ensureExtension(normalizeFilenameText(rawFilename) || fallback, ZIP_EXTENSION);
  const stem = normalized.slice(0, -ZIP_EXTENSION.length);
  const maxStem = MAX_ARCHIVE_FILENAME_CODE_POINTS - ZIP_EXTENSION.length;
  return `${truncateCodePoints(stem, maxStem).replace(/[. ]+$/g, '') || '設定差分確認_一括'}${ZIP_EXTENSION}`;
}

function notifyProgress(
  callback: DiffXlsxBatchExportOptions['onProgress'],
  progress: DiffXlsxBatchExportProgress
): void {
  if (!callback) return;
  try {
    callback(progress);
  } catch {
    // Progress rendering must not corrupt an otherwise valid output file.
  }
}

export async function buildDiffXlsxBatchExport(
  items: readonly DiffXlsxBatchExportItem[],
  options: DiffXlsxBatchExportOptions = {}
): Promise<DiffXlsxBatchExportResult> {
  const total = items.length;
  const generatedAt = resolveGeneratedAt(options.generatedAt);
  const maxArchiveBytes = resolveMaxArchiveBytes(options.maxArchiveBytes);
  const zipEntries: StoredZipEntry[] = [];
  const entryNames: string[] = [];
  const failures: DiffXlsxBatchExportFailure[] = [];
  const summaryRows: DiffXlsxBatchSummaryRow[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const label = safeLabel(item?.label, index);
    notifyProgress(options.onProgress, { stage: 'building', current: index + 1, total, label });
    try {
      const workbook = buildDiffXlsxExport(item.context);
      const data = new Uint8Array(await workbook.blob.arrayBuffer());
      const entryName = orderedXlsxEntryName(`${shortWorkbookLabel(item, index)}${XLSX_EXTENSION}`, index, total);
      const candidateEntries = [...zipEntries, { name: entryName, data }];
      const requiredArchiveBytes = calculateStoredZipByteLength(candidateEntries);
      if (requiredArchiveBytes > maxArchiveBytes) {
        throw new DiffXlsxBatchExportError(
          'MAX_ARCHIVE_BYTES',
          `一括ExcelのZIPサイズが上限 ${maxArchiveBytes.toLocaleString()} バイトを超えます`,
          { failures, maxArchiveBytes, requiredArchiveBytes }
        );
      }
      zipEntries.push({ name: entryName, data });
      entryNames.push(entryName);
      summaryRows.push(successfulSummaryRow(item, index, entryName));
    } catch (error) {
      if (error instanceof DiffXlsxBatchExportError && error.code === 'MAX_ARCHIVE_BYTES') throw error;
      const message = safeErrorMessage(error);
      failures.push({ index, label, message });
      summaryRows.push(failedSummaryRow(item, index));
    }
  }

  if (zipEntries.length === 0) {
    throw new DiffXlsxBatchExportError(
      'NO_SUCCESSFUL_WORKBOOK',
      '一括保存できるExcelを生成できませんでした',
      { failures }
    );
  }

  const summaryData = new Uint8Array(await buildBatchSummaryBlob(summaryRows).arrayBuffer());
  const archiveEntries: StoredZipEntry[] = [
    { name: BATCH_SUMMARY_ENTRY_NAME, data: summaryData },
    ...zipEntries
  ];
  const requiredArchiveBytes = calculateStoredZipByteLength(archiveEntries);
  if (requiredArchiveBytes > maxArchiveBytes) {
    throw new DiffXlsxBatchExportError(
      'MAX_ARCHIVE_BYTES',
      `一括ExcelのZIPサイズが上限 ${maxArchiveBytes.toLocaleString()} バイトを超えます`,
      { failures, maxArchiveBytes, requiredArchiveBytes }
    );
  }

  notifyProgress(options.onProgress, { stage: 'archiving', current: total, total });
  const blob = buildStoredZip(archiveEntries, { mimeType: ZIP_MIME_TYPE, modifiedAt: generatedAt });
  if (blob.size > maxArchiveBytes) {
    throw new DiffXlsxBatchExportError(
      'MAX_ARCHIVE_BYTES',
      `一括ExcelのZIPサイズが上限 ${maxArchiveBytes.toLocaleString()} バイトを超えます`,
      { failures, maxArchiveBytes, requiredArchiveBytes: blob.size }
    );
  }

  const fallbackFilename = defaultArchiveFilename(zipEntries.length, generatedAt);
  return {
    filename: safeArchiveFilename(options.archiveFilename, fallbackFilename),
    blob,
    entries: entryNames,
    failures
  };
}
