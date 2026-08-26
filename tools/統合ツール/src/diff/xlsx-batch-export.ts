'use strict';

import {
  buildStoredZip,
  calculateStoredZipByteLength,
  CLASSIC_ZIP_MAX_BYTES,
  type StoredZipEntry
} from '../archive/stored-zip.js';
import { buildDiffXlsxExport, type DiffXlsxContext } from './xlsx-export.js';

export const DEFAULT_DIFF_XLSX_BATCH_MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;

const ZIP_MIME_TYPE = 'application/zip';
const XLSX_EXTENSION = '.xlsx';
const ZIP_EXTENSION = '.zip';
const MAX_ARCHIVE_FILENAME_CODE_POINTS = 180;
const MAX_ENTRY_FILENAME_CODE_POINTS = 180;

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

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const label = safeLabel(item?.label, index);
    notifyProgress(options.onProgress, { stage: 'building', current: index + 1, total, label });
    try {
      const workbook = buildDiffXlsxExport(item.context);
      const data = new Uint8Array(await workbook.blob.arrayBuffer());
      const entryName = orderedXlsxEntryName(workbook.filename, index, total);
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
    } catch (error) {
      if (error instanceof DiffXlsxBatchExportError && error.code === 'MAX_ARCHIVE_BYTES') throw error;
      failures.push({ index, label, message: safeErrorMessage(error) });
    }
  }

  if (zipEntries.length === 0) {
    throw new DiffXlsxBatchExportError(
      'NO_SUCCESSFUL_WORKBOOK',
      '一括保存できるExcelを生成できませんでした',
      { failures }
    );
  }

  notifyProgress(options.onProgress, { stage: 'archiving', current: total, total });
  const blob = buildStoredZip(zipEntries, { mimeType: ZIP_MIME_TYPE, modifiedAt: generatedAt });
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
