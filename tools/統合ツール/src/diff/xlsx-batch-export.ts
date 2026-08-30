'use strict';

import {
  buildStoredZip,
  calculateStoredZipByteLength,
  CLASSIC_ZIP_MAX_BYTES,
  type StoredZipEntry
} from '../archive/stored-zip.js';
import { extractAppNameFromBundle } from '../utils.js';
import { hasIncompleteActualDiffTruncation } from './engine.js';
import {
  buildXlsxBlob,
  makeExcelCellTextVisible,
  type XlsxCellStyle,
  type XlsxSheet
} from './xlsx-builder.js';
import {
  buildDiffXlsxExport,
  customerIncompleteScopeSuffix,
  summarizeCustomerDiffContext,
  type DiffXlsxContext
} from './xlsx-export.js';

export const DEFAULT_DIFF_XLSX_BATCH_MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;

const ZIP_MIME_TYPE = 'application/zip';
const XLSX_EXTENSION = '.xlsx';
const ZIP_EXTENSION = '.zip';
const MAX_ARCHIVE_FILENAME_CODE_POINTS = 180;
const MAX_ENTRY_FILENAME_CODE_POINTS = 96;
const MAX_BUSINESS_NAME_CODE_POINTS = 36;
const MAX_BATCH_SUMMARY_ERROR_CODE_POINTS = 280;
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
  /** 差分の有無。取得の完全性とは分けて示す。 */
  status: '差分なし' | '差分あり' | '差分は確認できず' | '絞り込み後：掲載対象なし' | 'Excel生成失敗';
  /** 取得できた範囲。差分の有無とは独立に判断する。 */
  coverage: '全範囲を取得' | '一部未取得' | '—';
  /** 未取得・打切りになった設定領域。 */
  coverageDetail: string;
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
  const normalized = (message.trim() || 'Excelの生成に失敗しました').replace(/\r\n?/g, '\n');
  return makeBatchErrorTextVisible(normalized, MAX_BATCH_SUMMARY_ERROR_CODE_POINTS);
}

/**
 * XML 1.0 禁止文字と不正サロゲートを、一括結果でも追跡できる可視トークンへ変換する。
 * XLSX ビルダーのセル文字可視化と重ならない別の括弧を使い、二重変換を避ける。
 */
function makeBatchErrorTextVisible(value: unknown, maxCodePoints: number): string {
  const text = String(value ?? '');
  let visible = '';
  let visibleCodePoints = 0;
  let truncated = false;
  const token = (code: number) => `⟪U+${code.toString(16).toUpperCase().padStart(4, '0')}⟫`;
  const append = (segment: string): boolean => {
    const count = Array.from(segment).length;
    if (visibleCodePoints + count > maxCodePoints) {
      truncated = true;
      return false;
    }
    visible += segment;
    visibleCodePoints += count;
    return true;
  };
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xD800 && code <= 0xDBFF) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xDC00 && next <= 0xDFFF) {
        if (!append(text.slice(index, index + 2))) break;
        index += 1;
      } else {
        if (!append(token(code))) break;
      }
    } else if (
      (code >= 0xDC00 && code <= 0xDFFF)
      || code <= 0x08
      || (code >= 0x0B && code <= 0x0C)
      || (code >= 0x0E && code <= 0x1F)
      || code === 0xFFFE
      || code === 0xFFFF
    ) {
      if (!append(token(code))) break;
    } else {
      if (!append(text.charAt(index))) break;
    }
  }
  if (!truncated) return visible;
  const suffix = '…（以降省略）';
  const keep = Math.max(0, maxCodePoints - Array.from(suffix).length);
  return Array.from(visible).slice(0, keep).join('') + suffix;
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

function failedAppIdentity(
  item: DiffXlsxBatchExportItem,
  index: number,
  side: 'source' | 'target',
  rawName: string
): string {
  const lines = [rawName || '名称未取得'];
  if (!rawName) lines.push(`比較ラベル: ${safeLabel(item.label, index)}`);

  let bundle: DiffXlsxContext['sourceBundle'] | DiffXlsxContext['targetBundle'];
  try {
    bundle = side === 'source' ? item.context.sourceBundle : item.context.targetBundle;
  } catch {
    bundle = undefined;
  }
  if (!bundle || typeof bundle !== 'object') return lines.join('\n');

  try {
    const identity: string[] = [];
    const appId = bundle.appId == null ? '' : String(bundle.appId).trim();
    const guestId = bundle.guestId == null ? '' : String(bundle.guestId).trim();
    if (appId) identity.push(`App ID: ${appId}`);
    identity.push(guestId ? `ゲスト ${guestId}` : '通常スペース');
    identity.push(bundle.preview ? 'プレビュー' : '運用');
    lines.push(identity.join(' / '));
  } catch {
    // 識別子の読み取り自体が失敗しても、取得済みの名称・比較ラベルは残す。
  }
  return lines.join('\n');
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
  const summary = summarizeCustomerDiffContext(item.context);
  const counts: DiffXlsxBatchSummaryCounts = {
    total: summary.total,
    added: summary.added,
    removed: summary.removed,
    changed: summary.changed,
    moved: summary.moved
  };
  const incomplete = comparisonIncomplete(item.context);
  const filteredWithoutRows = item.context.exportMode === 'filtered' && counts.total === 0;
  return {
    sequence: index + 1,
    sourceName,
    targetName,
    // 未取得があっても、確認できた範囲の差分の有無は伝える。0件は「差分なし」と言い切らない。
    status: counts.total > 0
      ? '差分あり'
      : incomplete
        ? '差分は確認できず'
        : filteredWithoutRows
          ? '絞り込み後：掲載対象なし'
          : '差分なし',
    coverage: incomplete ? '一部未取得' : '全範囲を取得',
    coverageDetail: incomplete ? (customerIncompleteScopeSuffix(item.context) || '詳細は各Excelの「確認できなかった範囲」を確認') : '',
    counts,
    pairNameStatus: pairNameStatus(rawSourceName, rawTargetName),
    filename
  };
}

function failedSummaryRow(
  item: DiffXlsxBatchExportItem,
  index: number,
  message: string
): DiffXlsxBatchSummaryRow {
  const rawSourceName = contextAppName(item.context, 'source');
  const rawTargetName = contextAppName(item.context, 'target');
  const sourceName = failedAppIdentity(item, index, 'source', rawSourceName);
  const targetName = failedAppIdentity(item, index, 'target', rawTargetName);
  return {
    sequence: index + 1,
    sourceName,
    targetName,
    status: 'Excel生成失敗',
    coverage: '—',
    coverageDetail: `Excelを生成できませんでした\n原因: ${message}`,
    counts: null,
    pairNameStatus: pairNameStatus(rawSourceName, rawTargetName),
    filename: ''
  };
}

function summaryStatusStyle(status: DiffXlsxBatchSummaryRow['status']): XlsxCellStyle {
  if (status === '差分なし') return 'statusGood';
  if (status === '差分あり') return 'statusDifference';
  if (status === '差分は確認できず') return 'statusIncomplete';
  if (status === '絞り込み後：掲載対象なし') return 'zebraCenter';
  return 'statusError';
}

function summaryCoverageStyle(coverage: DiffXlsxBatchSummaryRow['coverage']): XlsxCellStyle {
  if (coverage === '全範囲を取得') return 'statusGood';
  if (coverage === '一部未取得') return 'statusIncomplete';
  return 'diffAbsent';
}

function summaryPairNameStyle(pairNameStatus: DiffXlsxBatchSummaryRow['pairNameStatus']): XlsxCellStyle {
  if (pairNameStatus === '一致') return 'statusGood';
  if (pairNameStatus === '名称が異なります') return 'statusIncomplete';
  return 'statusError';
}

function summaryCoverageDetailStyle(
  summary: DiffXlsxBatchSummaryRow,
  alternate: boolean
): XlsxCellStyle {
  if (summary.status === 'Excel生成失敗') return 'warning';
  if (summary.coverage === '一部未取得') return 'review';
  return alternate ? 'zebra' : 'normal';
}

const BATCH_SUMMARY_COLUMN_COUNT = 13;
/** BATCH_SUMMARY_COLUMN_COUNT 列目の列記号。見出しの結合範囲に使う。 */
const BATCH_SUMMARY_COLUMN_LAST = 'M';
const BATCH_SUMMARY_COLUMN_WIDTHS = [7, 28, 28, 16, 13, 30, 10, 10, 10, 10, 14, 22, 44];
const BATCH_SUMMARY_DATA_ROW_HEIGHT = 32;
const BATCH_SUMMARY_DATA_ROW_MAX_HEIGHT = 220;
const BATCH_SUMMARY_DATA_LINE_HEIGHT = 17;

function batchSummaryVisualTextWidth(value: unknown): number {
  let width = 0;
  for (const char of String(value ?? '')) {
    const codePoint = char.codePointAt(0) || 0;
    if (char === '\t') width += 4;
    // Excelの列幅は全角2文字ぶんよりやや広いため、過大な空白行にならない係数で見積もる。
    else if (codePoint <= 0xff || (codePoint >= 0xff61 && codePoint <= 0xff9f)) width += 1;
    else width += 1.7;
  }
  return width;
}

function batchSummaryWrappedLines(value: unknown, columnWidth: number): number {
  const capacity = Math.max(8, Math.floor(columnWidth - 1));
  return makeExcelCellTextVisible(value).split(/\r?\n/).reduce((total, line) => (
    total + Math.max(1, Math.ceil(batchSummaryVisualTextWidth(line) / capacity))
  ), 0);
}

function batchSummaryDataRowHeight(row: readonly unknown[]): number {
  const maxLines = row.reduce<number>((max, value, columnIndex) => (
    Math.max(max, batchSummaryWrappedLines(value, BATCH_SUMMARY_COLUMN_WIDTHS[columnIndex] || 10))
  ), 1);
  return Math.min(
    BATCH_SUMMARY_DATA_ROW_MAX_HEIGHT,
    BATCH_SUMMARY_DATA_ROW_HEIGHT + Math.max(0, maxLines - 1) * BATCH_SUMMARY_DATA_LINE_HEIGHT
  );
}

function buildBatchSummaryOverview(summaryRows: readonly DiffXlsxBatchSummaryRow[]): string {
  const withDiff = summaryRows.filter((row) => row.status === '差分あり').length;
  const noDiff = summaryRows.filter((row) => row.status === '差分なし').length;
  const filteredEmpty = summaryRows.filter((row) => row.status === '絞り込み後：掲載対象なし').length;
  const incomplete = summaryRows.filter((row) => row.coverage === '一部未取得').length;
  const failed = summaryRows.filter((row) => row.status === 'Excel生成失敗').length;
  const totalChanges = summaryRows.reduce((sum, row) => sum + (row.counts?.total ?? 0), 0);
  const parts = [
    `比較 ${summaryRows.length}件`,
    `差分あり ${withDiff}件`,
    `差分なし ${noDiff}件`,
    `変更 合計 ${totalChanges}件`
  ];
  if (filteredEmpty) parts.push(`絞り込み後：掲載対象なし ${filteredEmpty}件`);
  if (incomplete) parts.push(`一部未取得 ${incomplete}件`);
  if (failed) parts.push(`Excel生成失敗 ${failed}件`);
  return parts.join('　/　');
}

function buildBatchSummaryBlob(summaryRows: readonly DiffXlsxBatchSummaryRow[]): Blob {
  const blank = Array.from({ length: BATCH_SUMMARY_COLUMN_COUNT - 1 }, () => '');
  const rows: XlsxSheet['rows'] = [
    ['kintone 設定差分 一括比較結果', ...blank],
    [buildBatchSummaryOverview(summaryRows), ...blank],
    [
      'No.', '比較元', '比較先', '結果', '取得状態', '未取得・打切りの範囲',
      '合計', '追加', '削除', '変更', '並び順変更', 'アプリ名', 'Excelファイル'
    ],
    ...summaryRows.map((row) => [
      row.sequence,
      row.sourceName,
      row.targetName,
      row.status,
      row.coverage,
      row.coverageDetail,
      row.counts?.total ?? '—',
      row.counts?.added ?? '—',
      row.counts?.removed ?? '—',
      row.counts?.changed ?? '—',
      row.counts?.moved ?? '—',
      row.pairNameStatus,
      row.filename || '—'
    ])
  ];
  const headerRowIndex = 2;
  const cellStyles: XlsxSheet['cellStyles'] = rows.map(() => []);
  cellStyles[0] = ['title'];
  cellStyles[1] = ['subtitle'];
  for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
    const summary = summaryRows[index - headerRowIndex - 1];
    const alternate = (index - headerRowIndex - 1) % 2 === 1;
    const neutralStyle: XlsxCellStyle = alternate ? 'zebra' : 'normal';
    const neutralCenterStyle: XlsxCellStyle = alternate ? 'zebraCenter' : 'center';
    cellStyles[index] = [
      neutralCenterStyle,
      neutralStyle,
      neutralStyle,
      summaryStatusStyle(summary.status),
      summaryCoverageStyle(summary.coverage),
      summaryCoverageDetailStyle(summary, alternate),
      neutralCenterStyle,
      neutralCenterStyle,
      neutralCenterStyle,
      neutralCenterStyle,
      neutralCenterStyle,
      summaryPairNameStyle(summary.pairNameStatus),
      neutralStyle
    ];
    if (!summary.counts) {
      for (let column = 6; column <= 10; column += 1) cellStyles[index][column] = 'diffAbsent';
    }
    if (!summary.filename) cellStyles[index][12] = 'diffAbsent';
  }
  return buildXlsxBlob([{
    name: '一括比較結果',
    rows,
    headerRow: headerRowIndex + 1,
    freezeRows: headerRowIndex + 1,
    freezeColumns: 1,
    autoFilter: true,
    colWidths: BATCH_SUMMARY_COLUMN_WIDTHS,
    rowStyles: rows.map(() => 'normal'),
    cellStyles,
    rowHeights: rows.map((_, index) => {
      if (index === 0) return 34;
      if (index === 1) return 28;
      return index === headerRowIndex ? 32 : batchSummaryDataRowHeight(rows[index]);
    }),
    styledEmptyCellsAsBlank: true,
    materializeEmptyCellsFromRow: headerRowIndex + 1,
    merges: [
      `A1:${BATCH_SUMMARY_COLUMN_LAST}1`,
      `A2:${BATCH_SUMMARY_COLUMN_LAST}2`
    ],
    showGridLines: false,
    zoomScale: 90,
    print: {
      orientation: 'landscape',
      fitToWidth: 2,
      fitToHeight: 0,
      repeatRows: { from: headerRowIndex + 1, to: headerRowIndex + 1 },
      horizontalCentered: true,
      footer: '&L一括比較結果&R&P / &N'
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
      summaryRows.push(failedSummaryRow(item, index, message));
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
