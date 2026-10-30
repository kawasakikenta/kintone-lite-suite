'use strict';

import { downloadBlob, kusConfirm, buildExportFilename, buildAppFilenameLabel, sanitizeFilenamePart } from '../utils.js';
import { FILE_DOWNLOAD_TIMEOUT_MS, apiGet, apiPost, apiPut, buildApiPrefix, fetchBundle, fetchRecordsByQuery, isRevisionConflictError } from '../api.js';
import { loadJSZipLite } from '../jszipLoader.js';
import { RunCancelledError, activeRun, createRequestSignal, isRunCancelledError, sleepUnlessCancelled, throwIfCancelled } from '../runControl.js';
import { createCancelReport, describeInnerCancel, formatCancelledHeadline, isCancelStop } from './run-cancel-summary.js';
import {
  sanitizeZipSegment,
  uniqueZipName,
  uniqueZipEntryName,
  writeInChunks
} from './record-query.js';
import { buildRecordCsvExport, type RecordCsvExportOptions } from './record-csv-export.js';
import { readRecordViews, readAttachmentFields } from './record-metadata.js';
import { parseCsvText, planCsvImport, formatCsvImportReport, type CsvImportReport } from './record-csv-import.js';
import { readProcessActionChoices } from './record-process-metadata.js';
export { parseCsvText, validateCsvImportHeader, coerceCsvImportValue, splitCsvListValue } from './record-csv-import.js';

/**
 * Paste-friendly parser used by every record-management operation.
 * Commas (including Japanese commas), spaces and newlines are accepted and
 * duplicate IDs are removed without changing the user's order.
 */
export function parseRecordAppIds(value: unknown): string[] {
  const tokens = String(value ?? '').split(/[\s,\u3001\uFF0C]+/).filter(Boolean);
  const invalid = tokens.filter((id) => !/^\d+$/.test(id) || Number(id) <= 0);
  if (invalid.length) throw new Error(`アプリIDは正の数値で入力してください: ${invalid.join(', ')}`);
  return [...new Set(tokens)];
}

/** Validate one app/guest pair before constructing a REST path. */
export function validateRecordConnection(appId: unknown, guestId: unknown = ''): { appId: string; guestId: string } {
  const ids = parseRecordAppIds(appId);
  if (ids.length !== 1) throw new Error('アプリIDは1件ずつ指定してください');
  const guest = String(guestId ?? '').trim();
  if (guest && !/^[1-9]\d*$/.test(guest)) throw new Error('ゲストIDは正の数値で入力してください');
  return { appId: ids[0], guestId: guest };
}

/** ステータス欄の色。boolean は旧い呼び出し互換で、true は 'err'、false / 省略は 'busy' として扱う。 */
export type RecordStatusTone = 'busy' | 'ok' | 'warn' | 'err' | 'info';
export type RecordStatusCallback = (message: string, tone?: RecordStatusTone | boolean) => void;

/** 処理側が渡した色（boolean を含む）を、パネルのステータス欄に渡せる色へそろえる。 */
export function toPanelTone(tone?: RecordStatusTone | boolean): RecordStatusTone {
  if (tone === true) return 'err';
  if (!tone) return 'busy';
  return tone;
}

/**
 * 1 アプリぶんの結果の要約。完了メッセージに件数を出すため、各操作が返す。
 * counts は種類ごとの件数で、複数アプリでは run*BatchStandalone が合算して describe に渡す。
 */
export interface RecordOperationSummary {
  /** 件数の種類ごとの値（例: { 件: 250 }、{ レコード: 250, 添付: 30 }） */
  counts: Record<string, number>;
  /** 書き込みを伴う操作の、このアプリで書き込んだレコード数。失敗時の「書き込み済み」の集計に使う。 */
  written?: number;
  /** 完了文を作る。counts は完了したアプリの合算、appIds は完了したアプリ */
  describe: (counts: Record<string, number>, appIds: string[]) => string;
}

export interface RecordOperationResult {
  warning?: string;
  cancelled?: boolean;
  summary?: RecordOperationSummary;
}

/** 複数アプリのときは「3アプリで計 750件…」、1 アプリのときは「250件…（App 202）」の形にそろえる件数つきの完了文。 */
function countedSummary(tail: string, opts: { withApp?: boolean } = {}) {
  return (counts: Record<string, number>, appIds: string[]): string => {
    const total = counts['件'] || 0;
    if (appIds.length === 1) return `${total}件${tail}${opts.withApp ? `（App ${appIds[0]}）` : ''}`;
    return `${appIds.length}アプリで計 ${total}件${tail}`;
  };
}

/**
 * Run every pasted app ID and retain per-app warnings in the final outcome.
 * An operation returns `cancelled` when the user declined its confirmation, so the
 * final message never reports an app that was not touched as completed.
 * 各操作が `summary` を返すと、完了メッセージに件数（複数アプリは合算）を出す。
 */
export async function runRecordAppBatchStandalone(
  appIdsValue: unknown,
  operation: (appId: string, index: number, total: number) => Promise<void | RecordOperationResult>,
  setStatus: RecordStatusCallback
): Promise<{ message: string; tone: RecordStatusTone }> {
  const appIds = parseRecordAppIds(appIdsValue);
  if (!appIds.length) throw new Error('対象アプリIDを1件以上入力してください');
  const failures: string[] = [];
  const warnings: string[] = [];
  const cancelled: string[] = [];
  const completed: Array<{ appId: string; summary?: RecordOperationSummary }> = [];
  let failedWritten = 0;
  let failedUnwritten = 0;
  let writeKnown = false;
  for (let i = 0; i < appIds.length; i++) {
    const appId = appIds[i];
    setStatus(`App ${appId}: 実行中 (${i + 1}/${appIds.length})`);
    try {
      const result = await operation(appId, i, appIds.length);
      if (result && result.warning) warnings.push(`App ${appId}: ${result.warning}`);
      if (result && result.cancelled) cancelled.push(`App ${appId}`);
      else completed.push({ appId, summary: result ? result.summary : undefined });
    } catch (error: any) {
      if (isCancelStop(error)) {
        // 対象が 1 アプリなら、内側の件数つき報告（例: 200/450 件を処理）をそのまま要点にする
        if (appIds.length === 1 && error?.cancelReport === true) throw error;
        // 1 回の中止を残りのアプリ数ぶんの失敗にしない。ここで止め、処理済み・失敗・未実行をアプリ単位で伝える。
        throw createCancelReport(i, appIds.length, [
          ...describeInnerCancel(`App ${appId}`, error),
          ...failures.map((failure) => `失敗 ${failure}`),
          ...warnings.map((warning) => `警告 ${warning}`),
          ...cancelled.map((target) => `確認でキャンセルしたため実行していません: ${target}`),
          `未実行（中止）: ${appIds.slice(i).map((id) => `App ${id}`).join(', ')}`
        ]);
      }
      failures.push(`App ${appId}: ${error?.message || String(error)}`);
      const partial = error?.partial;
      if (partial && Number.isFinite(Number(partial.done)) && Number.isFinite(Number(partial.total))) {
        writeKnown = true;
        failedWritten += Number(partial.done);
        failedUnwritten += Math.max(0, Number(partial.total) - Number(partial.done));
      }
    }
  }
  const warningSummary = warnings.length ? `警告 ${warnings.length}アプリ:\n${warnings.join('\n')}` : '';
  const cancelSummary = cancelled.length ? `確認でキャンセルしたため実行していません（${cancelled.length}アプリ）: ${cancelled.join(', ')}` : '';
  const summaries = completed.filter((item) => item.summary) as Array<{ appId: string; summary: RecordOperationSummary }>;
  const successWritten = summaries.reduce((sum, item) => sum + (item.summary.written ?? 0), 0);
  if (summaries.some((item) => item.summary.written !== undefined)) writeKnown = true;
  if (failures.length) {
    // 最初の行に、成功したアプリ数と書き込み済み・未処理のレコード数（分かるとき）を残す
    const known = [
      completed.length ? `成功 ${completed.length}アプリ` : '',
      writeKnown ? `書き込み済み ${successWritten + failedWritten}件` : '',
      writeKnown && failedUnwritten ? `未処理 ${failedUnwritten}件` : ''
    ].filter(Boolean);
    const error = new Error(`${appIds.length}アプリ中${failures.length}アプリで失敗しました${known.length ? `（${known.join('・')}）` : ''}\n${failures.join('\n')}${warningSummary ? `\n${warningSummary}` : ''}${cancelSummary ? `\n${cancelSummary}` : ''}`);
    // 一部のアプリが成功しているときは、エラーではなく警告として知らせる
    if (completed.length) Object.assign(error, { partialSuccess: true });
    throw error;
  }
  if (cancelled.length === appIds.length) {
    // 確認ダイアログですべて「いいえ」を選んだ: 何も実行していないので、完了ともエラーとも言わない。
    // 「キャンセルしました」を含めると、ワークフローは確認画面へ戻る。
    const message = '確認でキャンセルしました（実行していません）';
    setStatus(message, 'info');
    return { message, tone: 'info' };
  }
  let headline: string;
  if (summaries.length && summaries.length === completed.length) {
    const counts: Record<string, number> = {};
    for (const { summary } of summaries) for (const [key, value] of Object.entries(summary.counts)) counts[key] = (counts[key] || 0) + value;
    headline = summaries[0].summary.describe(counts, completed.map((item) => item.appId));
  } else {
    headline = `${completed.length}アプリの操作が完了しました`;
  }
  const tone: RecordStatusTone = warningSummary || cancelSummary ? 'warn' : 'ok';
  const message = `${headline}${cancelSummary ? `\n${cancelSummary}` : ''}${warningSummary ? `\n${warningSummary}` : ''}`;
  setStatus(message, tone);
  return { message, tone };
}

const CANCEL_WRITE_WAIT_MESSAGE = '書き込み中のリクエストの応答を待っています。応答が返ると次のリクエストの前で止めます。応答がない場合は kintone 画面で結果を確認してください。';

/**
 * 中止を押したあと、書き込みの応答が長く返らないときの案内を出す。
 * 書き込み中のリクエストは打ち切らない（サーバー側で確定したか分からなくなるため）ので、
 * 応答待ちで止まって見えることを利用者に伝える。処理の中（トークンが有効な間）から呼び、戻り値で監視を止める。
 */
export function watchCancelledWriteWait(
  notify: (message: string) => void,
  opts: { afterMs?: number; intervalMs?: number } = {}
): () => void {
  const token = activeRun();
  if (!token) return () => {};
  const afterMs = opts.afterMs ?? 10000;
  const timer = setInterval(() => {
    if (!token.cancelled || token.writes < 1 || Date.now() - token.cancelledAt < afterMs) return;
    clearInterval(timer);
    notify(CANCEL_WRITE_WAIT_MESSAGE);
  }, opts.intervalMs ?? 1000);
  return () => clearInterval(timer);
}

// ---------------------------------------------------------------------------
// 添付ファイル取得
// ---------------------------------------------------------------------------
export type FileFetchResult =
  | { ok: true; blob: Blob }
  | { ok: false; reason: string };

/**
 * /file.json からファイル本体を取得する。403（閲覧権限なし）は再試行せず、
 * それ以外の失敗は 1 回だけ再試行する。失敗理由は呼び出し側で集計して利用者に見せる。
 */
async function downloadFileBlob(prefix: string, fileKey: string): Promise<FileFetchResult> {
  if (!fileKey) return { ok: false, reason: 'fileKey がありません' };
  const url = prefix + '/file.json?fileKey=' + encodeURIComponent(fileKey);
  const headers = { 'X-Requested-With': 'XMLHttpRequest' };
  let lastReason = '';
  let request: ReturnType<typeof createRequestSignal> | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    // 中止は取得失敗として記録せず、呼び出し側のループを止める。
    throwIfCancelled();
    try {
      // 中止と応答待ちの上限（FILE_DOWNLOAD_TIMEOUT_MS）のどちらでも打ち切る
      request = createRequestSignal(FILE_DOWNLOAD_TIMEOUT_MS);
      const resp = await fetch(url, { method: 'GET', headers, signal: request.signal });
      if (resp.status === 403) return { ok: false, reason: '閲覧権限なし (HTTP 403)' };
      if (!resp.ok) {
        lastReason = `HTTP ${resp.status}`;
      } else {
        return { ok: true, blob: await resp.blob() };
      }
    } catch (e: any) {
      if (isRunCancelledError(e) || isRunCancelledError((request?.signal as any)?.reason)) throw e instanceof RunCancelledError ? e : new RunCancelledError();
      lastReason = request?.timedOut() ? `応答待ちが ${Math.round(FILE_DOWNLOAD_TIMEOUT_MS / 1000)} 秒を超えました（timeout）` : (e?.message || String(e));
    } finally {
      request?.release();
    }
    if (attempt === 0) await sleepUnlessCancelled(500);
  }
  return { ok: false, reason: lastReason || '取得失敗' };
}

export interface FileFailure {
  recordId: string;
  fileName: string;
  fileKey: string;
  reason: string;
}

function formatFileFailures(failures: FileFailure[]): string {
  return failures
    .map((f) => `record ${f.recordId}\t${f.fileName || '(名称不明)'}\t${f.reason}`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// レコード取得
// ---------------------------------------------------------------------------
function describeFetchMode(mode: 'keyset' | 'cursor'): string {
  return mode === 'cursor' ? ' / cursor API' : '';
}

async function fetchAllRecords(prefix: string, app: string, query: string, setStatus: RecordStatusCallback): Promise<any[]> {
  setStatus('レコード取得中...');
  const result = await fetchRecordsByQuery(prefix, app, query || '', {
    onProgress: (n, mode) => setStatus(`レコード取得中... (${n}件取得済${describeFetchMode(mode)})`)
  });
  return result.records;
}

interface RecordStatusTarget {
  id: number;
  revision: string;
}

async function fetchRecordStatusTargets(prefix: string, app: string, query: string, setStatus: RecordStatusCallback): Promise<RecordStatusTarget[]> {
  setStatus('対象レコード取得中...');
  const result = await fetchRecordsByQuery(prefix, app, query || '', {
    fields: ['$id', '$revision'],
    onProgress: (n, mode) => setStatus(`対象レコード取得中... (${n}件${describeFetchMode(mode)})`)
  });
  // 確認前に全対象の revision を確定する。欠落時に省略すると競合検査が無効になる。
  return result.records.map((record: any) => {
    const id = Number(record?.$id?.value);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('対象レコードのIDを確認できないため、ステータス更新を中止しました。対象レコードを取得し直してください。');
    }
    const rawRevision = record?.$revision?.value;
    const revision = typeof rawRevision === 'string' || typeof rawRevision === 'number' ? String(rawRevision) : '';
    if (!/^\d+$/.test(revision)) {
      throw new Error(`レコード ${id} の revision を確認できないため、ステータス更新を中止しました。対象レコードを取得し直してください。`);
    }
    return { id, revision };
  });
}

// ---------------------------------------------------------------------------
// CSV 出力
// ---------------------------------------------------------------------------
type RecordCsvExport = ReturnType<typeof buildRecordCsvExport>;

function csvExportManifest(appId: string, guestId: string, recordCount: number, csv: RecordCsvExport) {
  return {
    schemaVersion: 1,
    appId,
    guestId: guestId || '',
    recordCount,
    parentFile: 'records.csv',
    recordIdColumn: csv.tables.length ? '$id' : null,
    tables: csv.tables.map((table) => ({
      fieldCode: table.fieldCode,
      fileName: table.fileName,
      rowCount: table.rowCount,
      parentIdColumn: '$id',
      rowIdColumn: '$rowId',
      rowIndexColumn: '$rowIndex'
    })),
    warnings: csv.warnings,
    notes: [
      '親の records.csv は1レコード1行です。テーブル列は行数を表示します。',
      '明細CSVの $id は親レコードID、$rowId はテーブル行ID、$rowIndex はテーブル内の行番号（1始まり）です。',
      'テーブルごとに独立したCSVです。別のテーブルとの行の組み合わせは作りません。',
      'CSVは閲覧・集計用です。このツールのCSV取込でテーブルを復元することはできません。',
      '添付フィールドはファイル名のみです。実体を保存する場合はバックアップで「添付ファイルも保存」を選択してください。',
      "= + - @ で始まる文字列セルは Excel の数式実行を防ぐため先頭に ' を付けています（数値は対象外）。"
    ]
  };
}

function addRecordCsvFiles(zip: any, csv: RecordCsvExport, prefix = ''): void {
  zip.file(`${prefix}records.csv`, csv.parentCsv);
  for (const table of csv.tables) zip.file(`${prefix}${table.fileName}`, table.csvText);
}

export function recordExportFilename(filename: unknown, extension: 'csv' | 'zip', fallback: string): string {
  // 拡張子だけ・パス区切りや禁則文字を含む入力でも、空の名前や意図しない階層名にしない。
  const stem = String(filename || '').trim().replace(/\.(csv|zip)$/i, '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  // 先頭・末尾のドットや空白だけが残る名前（`...` や `../` 由来）は隠しファイル・空名になるので除く。
  const safe = stem ? sanitizeFilenamePart(stem, '').replace(/^[. ]+|[. ]+$/g, '') : '';
  return safe ? `${safe}.${extension}` : fallback;
}

/**
 * 複数アプリに同じ ZIP 名を指定すると、どのアプリのファイルか区別できない同名ダウンロードが
 * 並ぶ。複数アプリのときだけ `_app<ID>` を付ける（空欄の自動命名にはアプリ ID が入っている）。
 */
export function zipNameForApp(zipName: unknown, appId: string, multiple: boolean): string {
  const requested = String(zipName || '').trim();
  return requested && multiple ? `${requested.replace(/\.zip$/i, '')}_app${appId}.zip` : requested;
}

async function buildCsvExportForApp(
  appId: string,
  guestId: string,
  query: string,
  setStatus: RecordStatusCallback,
  exportOptions?: RecordCsvExportOptions
) {
  const target = validateRecordConnection(appId, guestId);
  appId = target.appId;
  guestId = target.guestId;
  const prefix = buildApiPrefix(guestId, false);

  setStatus(`App ${appId}: フィールド情報取得中...`);
  const fieldParams = exportOptions?.headerMode && exportOptions.headerMode !== 'code'
    ? { app: appId, lang: 'user' }
    : { app: appId };
  const fields = await apiGet(prefix, '/app/form/fields.json', fieldParams);
  const properties = fields.properties || {};
  if (!Object.keys(properties).length) throw new Error(`App ${appId}: 出力できるフィールドがありません`);

  const records = await fetchAllRecords(prefix, appId, query || '', (message) => setStatus(`App ${appId}: ${message}`));

  setStatus(`App ${appId}: CSV生成中... (${records.length}件)`);
  return {
    appId,
    guestId: guestId || '',
    recordCount: records.length,
    csv: buildRecordCsvExport(records, properties, exportOptions)
  };
}

/** 出力は完了したが利用者に見せる必要がある未取得・失敗の内訳（空なら問題なし）。 */
export interface CsvExportOutcome {
  issues: string[];
}

export async function runCsvExportStandalone(opts, setStatus): Promise<CsvExportOutcome> {
  const { appId, guestId, query, filename, headerMode, lineEnding, neutralizeFormula } = opts;
  const exportOptions: RecordCsvExportOptions = { headerMode, lineEnding, neutralizeFormula };
  const result = await buildCsvExportForApp(appId, guestId, query || '', setStatus, exportOptions);
  const appLabel = buildAppFilenameLabel(appId, '');
  if (!result.csv.tables.length) {
    const blob = new Blob([result.csv.parentCsv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(recordExportFilename(filename, 'csv', buildExportFilename('レコード', 'csv', { appLabel })), blob);
    setStatus(`CSV出力完了 (${result.recordCount}件)`, 'ok');
    return { issues: [] };
  }

  const JSZipCtor = await loadJSZipLite();
  const zip = new JSZipCtor();
  addRecordCsvFiles(zip, result.csv);
  zip.file('manifest.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    query: query || '',
    ...csvExportManifest(result.appId, result.guestId, result.recordCount, result.csv)
  }, null, 2));
  setStatus(`ZIP生成中... (${result.recordCount}件 / テーブル ${result.csv.tables.length}件)`);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(recordExportFilename(filename, 'zip', buildExportFilename('レコード', 'zip', { appLabel })), blob);
  const warningNote = result.csv.warnings.length ? `（未取得のテーブル ${result.csv.warnings.length}件、詳細は manifest.json）` : '';
  setStatus(`CSV出力完了: ${result.recordCount}件 / テーブル明細 ${result.csv.tables.length}ファイルをZIPに保存${warningNote}`, result.csv.warnings.length > 0 ? 'warn' : 'ok');
  return { issues: result.csv.warnings };
}

export async function runCsvExportBatchStandalone(opts, setStatus): Promise<CsvExportOutcome> {
  const rawApps = Array.isArray(opts?.apps) ? opts.apps : [];
  const apps = rawApps
    .filter((a) => a?.appId != null && String(a.appId).trim())
    .map((app) => {
      const target = validateRecordConnection(app.appId, app.guestId || '');
      return { ...app, appId: target.appId, guestId: target.guestId };
    });
  const query = opts?.query || '';
  const filename = String(opts?.filename || '').trim();
  const exportOptions: RecordCsvExportOptions = {
    headerMode: opts?.headerMode,
    lineEnding: opts?.lineEnding,
    neutralizeFormula: opts?.neutralizeFormula
  };
  if (!apps.length) throw new Error('対象アプリを1件以上入力してください');
  if (apps.length === 1) {
    const app = apps[0];
    return await runCsvExportStandalone({ appId: app.appId, guestId: app.guestId || '', query, filename, ...exportOptions }, setStatus);
  }

  const JSZip = await loadJSZipLite();
  const zip = new JSZip();
  const used = new Set<string>();
  let totalRecords = 0;
  let warningCount = 0;
  const successes: string[] = [];
  const failures: string[] = [];
  const tableWarnings: string[] = [];
  /** 中止で止めたアプリの位置。-1 は最後まで実行した。 */
  let stoppedAt = -1;

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    let folder = '';
    setStatus(`CSV出力中... (${i + 1}/${apps.length})`);
    try {
      // 全明細を生成してから格納し、取得・変換に失敗したアプリの一部だけを保存しない。
      const result = await buildCsvExportForApp(app.appId, app.guestId || '', query, setStatus, exportOptions);
      const guestSuffix = result.guestId ? `_guest${sanitizeZipSegment(result.guestId)}` : '';
      folder = uniqueZipEntryName(used, `app_${sanitizeZipSegment(result.appId)}${guestSuffix}`);
      addRecordCsvFiles(zip, result.csv, `${folder}/`);
      zip.file(`${folder}/manifest.json`, JSON.stringify({
        generatedAt: new Date().toISOString(),
        appName: app.appName || '',
        query,
        ...csvExportManifest(result.appId, result.guestId, result.recordCount, result.csv)
      }, null, 2));
      totalRecords += result.recordCount;
      warningCount += result.csv.warnings.length;
      tableWarnings.push(...result.csv.warnings.map((warning) => `App ${result.appId}${result.guestId ? ` / Guest ${result.guestId}` : ''}: ${warning}`));
      successes.push(`${folder}/: App ${result.appId}${result.guestId ? ` / Guest ${result.guestId}` : ''} / ${result.recordCount}件 / テーブル ${result.csv.tables.length}件${result.csv.warnings.length ? ` / 未取得 ${result.csv.warnings.length}件（フォルダ内manifest.json参照）` : ''}`);
    } catch (error: any) {
      if (folder) zip.remove(folder);
      if (isCancelStop(error)) { stoppedAt = i; break; }
      failures.push(`App ${app.appId}${app.guestId ? ` / Guest ${app.guestId}` : ''}: ${error?.message || String(error)}`);
    }
  }
  const notRun = stoppedAt >= 0
    ? apps.slice(stoppedAt).map((app) => `App ${app.appId}${app.guestId ? ` / Guest ${app.guestId}` : ''}`)
    : [];
  if (stoppedAt >= 0 && !successes.length) {
    throw createCancelReport(stoppedAt, apps.length, [
      ...failures.map((failure) => `失敗 ${failure}`),
      `未実行（中止）: ${notRun.join(', ')}`,
      'ZIP は保存していません'
    ]);
  }
  if (failures.length === apps.length) {
    throw new Error(`すべてのアプリで CSV 出力に失敗しました\n${failures.join('\n')}`);
  }

  const manifest = [
    'kintone CSV 一括出力マニフェスト',
    `出力日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
    `対象アプリ数: ${apps.length}（成功 ${successes.length} / 失敗 ${failures.length}${notRun.length ? ` / 未実行（中止） ${notRun.length}` : ''}）`,
    ...(notRun.length ? ['', '利用者の操作で中止したため、一部のアプリは出力していません。'] : []),
    `総レコード数: ${totalRecords}`,
    `未取得のテーブル: ${warningCount}件`,
    `共通クエリ: ${query || '(なし)'}`,
    '',
    'アプリごとのフォルダに親 records.csv、tables/ 配下の明細CSV、対応関係を記載した manifest.json を格納しています。',
    '明細CSVの $id を同じフォルダの親 records.csv の $id に紐付けてください。',
    '',
    ...successes,
    ...(failures.length ? ['', '失敗:', ...failures] : []),
    ...(notRun.length ? ['', '未実行（中止）:', ...notRun.map((target) => `${target}: 未実行（中止）`)] : [])
  ].join('\n');
  zip.file('manifest.txt', manifest);

  setStatus(`ZIP生成中... (${successes.length}アプリ / ${totalRecords}件)`);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(recordExportFilename(filename, 'zip', buildExportFilename('CSV出力', 'zip')), blob);
  const issues = [
    notRun.length ? `未実行（中止） ${notRun.length}アプリ` : '',
    failures.length ? `失敗 ${failures.length}アプリ` : '',
    warningCount ? `未取得のテーブル ${warningCount}件` : ''
  ].filter(Boolean);
  const issueNote = issues.length ? `（${issues.join(' / ')}、詳細は manifest.txt）` : '';
  const cancelNote = notRun.length ? `${formatCancelledHeadline(stoppedAt, apps.length)}。処理済みの分だけを保存しました。` : '';
  setStatus(`${cancelNote}CSV一括出力${notRun.length ? '（一部）' : '完了'}${issueNote}: ${successes.length}アプリ / ${totalRecords}件`, issues.length > 0 ? 'warn' : 'ok');
  return { issues: [...notRun.map((target) => `未実行（中止） ${target}`), ...failures.map((failure) => `失敗 ${failure}`), ...tableWarnings] };
}

// ---------------------------------------------------------------------------
// CSV 取込
// ---------------------------------------------------------------------------
async function readImportFile(file: File): Promise<string> {
  if (!file) throw new Error('CSVファイルを選択してください');
  if (typeof file.text === 'function') return file.text();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(String((e.target as FileReader).result || ''));
    reader.onerror = () => reject(new Error('ファイルの読み取りに失敗'));
    reader.readAsText(file);
  });
}

async function inspectCsvImportBatch(opts, setStatus) {
  const appIds = parseRecordAppIds(opts.appIdsText || opts.appId);
  if (!appIds.length) throw new Error('対象アプリIDを入力してください');
  setStatus('CSVファイルを読み込み中...');
  const text = await readImportFile(opts.file);
  // Excel の既定の「CSV (コンマ区切り)」は Shift_JIS。UTF-8 として読むと日本語が U+FFFD に化け、
  // 事前検査を通ったまま文字化けした値が登録されてしまう。
  if (text.includes('\uFFFD')) throw new Error('CSVをUTF-8として読み取れず、文字化け（�）を検出しました。Excelでは「CSV UTF-8（コンマ区切り）」で保存し直してください。');
  const rows = parseCsvText(text.replace(/^\uFEFF/, ''));
  const prefix = buildApiPrefix(opts.guestId || '', false);
  const plans: Array<{ appId: string; properties: Record<string, any>; report?: CsvImportReport; error?: string }> = [];
  for (const appId of appIds) {
    setStatus(`App ${appId}: CSVを事前検査中...`);
    try {
      const response = await apiGet(prefix, '/app/form/fields.json', { app: appId });
      const { records: _records, recordRows: _recordRows, ...report } = planCsvImport(rows, response?.properties);
      plans.push({ appId, properties: response.properties, report });
    } catch (error: any) {
      if (isCancelStop(error)) {
        throw createCancelReport(plans.length, appIds.length, [
          ...plans.filter((plan) => plan.error).map((plan) => `事前検査に失敗 App ${plan.appId}: ${plan.error}`),
          `未実行（中止）: ${appIds.slice(plans.length).map((id) => `App ${id}`).join(', ')}`,
          'レコードはまだ書き込んでいません'
        ]);
      }
      plans.push({ appId, properties: {}, error: error?.message || String(error) || '事前検査に失敗しました' });
    }
  }
  return { prefix, rows, plans };
}

/** Read-only inspection for all destination apps; no records are created. */
export async function runPreviewCsvImportStandalone(opts, setStatus) {
  const { plans } = await inspectCsvImportBatch(opts, setStatus);
  const result = plans.map(({ appId, report, error }) => ({ appId, report, error }));
  const problems = plans.filter(plan => plan.error || plan.report.issueCount).length;
  setStatus(problems ? `事前検査: ${problems}アプリに問題があります。まだ書き込んでいません。` : `事前検査完了: ${plans.length}アプリ。まだ書き込んでいません。`, problems > 0 ? 'warn' : 'ok');
  return result;
}

/**
 * 100 件ずつの書き込み。中止されたときは「失敗」ではなく、何件を書き込み済みで何件を書き込んでいないかを伝える。
 * 中止は次のチャンクを送る前に止まるため、書き込み済みの件数は確定している。
 */
async function writeChunksUnlessCancelled<T>(
  items: T[],
  label: string,
  writeChunk: (chunk: T[], chunkIndex: number) => Promise<void>,
  onProgress: (done: number, total: number) => void,
  describeItem?: (index: number) => string
): Promise<number> {
  try {
    return await writeInChunks(items, label, writeChunk, onProgress, undefined, describeItem);
  } catch (error: any) {
    if (!isRunCancelledError(error)) throw error;
    const done = Math.max(0, Number(error?.partial?.done) || 0);
    throw createCancelReport(done, items.length, [
      `${label}: ${done}件を書き込み済み、残り ${items.length - done}件は書き込んでいません`,
      '書き込み済みのレコードは取り消していません'
    ]);
  }
}

export async function runCsvImportBatchStandalone(opts, setStatus) {
  // Recheck all apps before the first write. Never reuse a stale UI preview.
  const { prefix, rows, plans } = await inspectCsvImportBatch(opts, setStatus);
  const problems = plans.filter(plan => plan.error || plan.report.issueCount);
  // 全アプリを対象にしても 1 つのメッセージが数千行にならないよう、表示は先頭 20 アプリまでにして残りは件数で示す。
  const LISTED_APP_LIMIT = 20;
  const omitted = (total: number) => total > LISTED_APP_LIMIT ? [`…ほか ${total - LISTED_APP_LIMIT} アプリ（合計 ${total} アプリ）`] : [];
  if (problems.length) {
    const problemBlocks = problems.slice(0, LISTED_APP_LIMIT).map(plan => `App ${plan.appId}: ${plan.error || formatCsvImportReport(plan.report)}`);
    throw new Error(`CSVの事前検査で問題を検出しました。全対象アプリへの書き込みを中止しました。\n${[...problemBlocks, ...omitted(problems.length).map(line => `${line}の詳細は「CSVを事前検査」で確認できます`)].join('\n\n')}`);
  }
  const confirmText = [
    `CSVから ${plans.length}アプリの本番レコードへ追加します${opts.guestId ? `（ゲスト ${opts.guestId}）` : ''}。`,
    ...plans.slice(0, LISTED_APP_LIMIT).map(plan => `App ${plan.appId}: ${plan.report.count}件 / ${plan.report.columns.length}フィールド`),
    ...omitted(plans.length),
    '追加したレコードは自動では取り消せません。実行しますか？'
  ].join('\n');
  if (!kusConfirm(confirmText)) {
    const warning = 'CSV取込をキャンセルしました';
    setStatus(warning, 'info');
    return { warning };
  }
  await runRecordAppBatchStandalone(plans.map(plan => plan.appId).join(','), async (appId): Promise<RecordOperationResult> => {
    const plan = plans.find(item => item.appId === appId);
    // Build just one app's payload at a time, keeping multi-app memory bounded.
    const { records, recordRows } = planCsvImport(rows, plan.properties);
    const ok = await writeChunksUnlessCancelled(records, `App ${appId} の CSV取込`,
      batch => apiPost(prefix, '/records.json', { app: appId, records: batch }),
      (done, total) => setStatus(`App ${appId}: インポート中... (${done} / ${total}件)`),
      index => `CSV ${recordRows[index]}行目`);
    setStatus(`App ${appId}: ${ok}件を取り込みました`);
    return { summary: { counts: { 件: ok }, written: ok, describe: countedSummary('を取り込みました', { withApp: true }) } };
  }, setStatus);
}

export async function runCsvImportStandalone(opts, setStatus) {
  return runCsvImportBatchStandalone({ ...opts, appIdsText: opts.appId }, setStatus);
}

// ---------------------------------------------------------------------------
// ステータス一括更新
// ---------------------------------------------------------------------------
export async function runBatchProcessStandalone(opts, setStatus) {
  const { appId: rawAppId, guestId: rawGuestId, query, action: rawAction, assignee: rawAssignee } = opts;
  const { appId, guestId } = validateRecordConnection(rawAppId, rawGuestId);
  const action = String(rawAction ?? '');
  const assignee = String(rawAssignee ?? '').trim();
  if (!action.trim()) throw new Error('アクション名を入力してください');
  const prefix = buildApiPrefix(guestId, false);

  const targets = await fetchRecordStatusTargets(prefix, appId, query || '', setStatus);
  if (!targets.length) throw new Error('処理対象のレコードが0件です');
  const confirmText = [
    `App ${appId}${guestId ? `（ゲスト ${guestId}）` : ''} の ${targets.length}件 にアクション「${action}」を実行します${assignee ? `（作業者: ${assignee}）` : ''}。`,
    `条件: ${query || '(全件)'}`,
    '本番レコードのステータスが変わり、自動では元に戻せません。実行しますか？'
  ].join('\n');
  if (!kusConfirm(confirmText)) {
    setStatus('ステータス一括更新をキャンセルしました', 'info');
    return { cancelled: true };
  }

  const ok = await writeChunksUnlessCancelled(
    targets,
    `App ${appId} のステータス更新`,
    async (batch) => {
      try {
        await apiPut(prefix, '/records/status.json', {
          app: appId,
          records: batch.map(({ id, revision }) => ({ id, revision, action, ...(assignee ? { assignee } : {}) }))
        });
      } catch (error: any) {
        if (!isRevisionConflictError(error)) throw error;
        const reported = new Error(
          `App ${appId} の対象レコードは取得後に別の更新が入ったため中止しました（revision 競合）。対象レコードを取得し直し、条件と内容を確認してから再実行してください。\n${error?.message || String(error)}`
        );
        Object.assign(reported, { revisionConflict: true, original: error, ...(error?.code ? { code: error.code } : {}) });
        throw reported;
      }
    },
    (done, total) => setStatus(`ステータス更新中... ${done}/${total}件`),
    index => `レコードID ${targets[index]?.id}`
  );
  const summary: RecordOperationSummary = { counts: { 件: ok }, written: ok, describe: countedSummary('のステータスを更新しました', { withApp: true }) };
  setStatus(summary.describe(summary.counts, [appId]), 'ok');
  return { summary };
}

// ---------------------------------------------------------------------------
// レコードコピー
// ---------------------------------------------------------------------------
const COPY_SYSTEM_TYPES = new Set([
  'RECORD_NUMBER', 'CREATOR', 'CREATED_TIME', 'MODIFIER', 'UPDATED_TIME',
  'STATUS', 'STATUS_ASSIGNEE', 'CALC', 'CATEGORY', '__ID__', '__REVISION__',
  'REFERENCE_TABLE', 'LABEL', 'HR', 'SPACER', 'GROUP'
]);
const COPY_SYSTEM_CODES = new Set(['$id', '$revision', '作成者', '作成日時', '更新者', '更新日時', 'レコード番号', 'ステータス', '作業者']);

export interface CopyPayloadPlan {
  records: Array<Record<string, any>>;
  /** コピー元にあるがコピー先に無い、または書き込めないため除外したフィールドコード */
  droppedFields: string[];
  /** コピー元に存在した FILE フィールドコード（サブテーブル内は テーブルコード.フィールドコード）、重複なし・ソート済み */
  droppedFileFields: string[];
  /** コピー元レコードのうち添付が 1 件以上あったレコードの件数 */
  recordsWithFiles: number;
}

/**
 * コピー元レコードから、コピー先へ POST できる形の payload を作る。
 * - システム項目・ファイル・計算フィールドは除外
 * - コピー先のフィールド定義（targetProps）を渡した場合、存在しないフィールドは除外して報告する
 * - サブテーブルの行には id を含めない（新規行として追加する）
 */
export function buildCopyRecordPayloads(records: any[], targetProps?: Record<string, any> | null): CopyPayloadPlan {
  const dropped = new Set<string>();
  const fileFields = new Set<string>();
  let recordsWithFiles = 0;
  const targetKnown = targetProps && typeof targetProps === 'object' ? targetProps : null;
  const canWriteTop = (code: string, field: any): boolean => {
    if (COPY_SYSTEM_CODES.has(code) || COPY_SYSTEM_TYPES.has(field?.type)) return false;
    if (field?.type === 'FILE') { fileFields.add(code); return false; }
    if (targetKnown && !targetKnown[code]) { dropped.add(code); return false; }
    if (targetKnown && targetKnown[code]?.type !== field?.type) { dropped.add(`${code}(型不一致)`); return false; }
    return true;
  };
  const out = records.map((rec) => {
    const payload: Record<string, any> = {};
    let recHasFile = false;
    for (const [code, field] of Object.entries(rec || {}) as Array<[string, any]>) {
      if (!field || typeof field !== 'object') continue;
      if (!canWriteTop(code, field)) {
        if (field?.type === 'FILE' && Array.isArray(field.value) && field.value.length > 0) recHasFile = true;
        continue;
      }
      if (field.type === 'SUBTABLE') {
        const childDefs = targetKnown ? targetKnown[code]?.fields || {} : null;
        const rows = Array.isArray(field.value) ? field.value : [];
        payload[code] = {
          value: rows.map((row: any) => {
            const inner = row && typeof row === 'object' && row.value && typeof row.value === 'object' ? row.value : {};
            const cells: Record<string, any> = {};
            for (const [childCode, childField] of Object.entries(inner) as Array<[string, any]>) {
              if (!childField || typeof childField !== 'object') continue;
              if (COPY_SYSTEM_CODES.has(childCode) || COPY_SYSTEM_TYPES.has(childField.type)) continue;
              if (childField.type === 'FILE') {
                fileFields.add(`${code}.${childCode}`);
                if (Array.isArray(childField.value) && childField.value.length > 0) recHasFile = true;
                continue;
              }
              if (childDefs && !childDefs[childCode]) { dropped.add(`${code}.${childCode}`); continue; }
              if (childDefs && childDefs[childCode]?.type !== childField.type) { dropped.add(`${code}.${childCode}(型不一致)`); continue; }
              cells[childCode] = { value: childField.value };
            }
            return { value: cells };
          })
        };
      } else {
        payload[code] = { value: field.value };
      }
    }
    if (recHasFile) recordsWithFiles++;
    return payload;
  });
  return { records: out, droppedFields: [...dropped].sort(), droppedFileFields: [...fileFields].sort(), recordsWithFiles };
}

export interface RecordCopyCompatibilityReport {
  compatibleFields: string[];
  droppedMissing: string[];
  droppedMismatch: string[];
  excludedSystemOrFile: string[];
}

export function inspectRecordCopyCompatibility(
  sourceProps: Record<string, any> | null | undefined,
  targetProps: Record<string, any> | null | undefined
): RecordCopyCompatibilityReport {
  const src = sourceProps && typeof sourceProps === 'object' ? sourceProps : {};
  const tgt = targetProps && typeof targetProps === 'object' ? targetProps : {};
  const compatibleFields: string[] = [];
  const droppedMissing: string[] = [];
  const droppedMismatch: string[] = [];
  const excludedSystemOrFile: string[] = [];

  for (const [code, field] of Object.entries(src)) {
    if (!field || typeof field !== 'object') continue;
    const type = String(field.type || '');
    const label = String(field.label || code);
    const display = `${label}［${code}］`;
    if (COPY_SYSTEM_CODES.has(code) || COPY_SYSTEM_TYPES.has(type) || type === 'FILE' || field.expression) {
      excludedSystemOrFile.push(`${display}(${type === 'FILE' ? 'FILE' : field.expression ? '自動計算' : type})`);
      continue;
    }
    const targetField = tgt[code];
    if (!targetField) {
      droppedMissing.push(display);
      continue;
    }
    const targetType = String(targetField.type || '');
    if (targetType !== type) {
      droppedMismatch.push(`${display}(${type} → ${targetType})`);
      continue;
    }
    if (type === 'SUBTABLE') {
      const srcChildren = field.fields && typeof field.fields === 'object' ? field.fields : {};
      const tgtChildren = targetField.fields && typeof targetField.fields === 'object' ? targetField.fields : {};
      let compatibleSubCount = 0;
      for (const [childCode, childField] of Object.entries(srcChildren) as Array<[string, any]>) {
        if (!childField || typeof childField !== 'object') continue;
        const cType = String(childField.type || '');
        const cDisplay = `${code}.${childCode}`;
        if (COPY_SYSTEM_CODES.has(childCode) || COPY_SYSTEM_TYPES.has(cType) || cType === 'FILE' || childField.expression) {
          excludedSystemOrFile.push(`${cDisplay}(${cType === 'FILE' ? 'FILE' : childField.expression ? '自動計算' : cType})`);
          continue;
        }
        const tChild = tgtChildren[childCode];
        if (!tChild) {
          droppedMissing.push(cDisplay);
        } else if (String(tChild.type || '') !== cType) {
          droppedMismatch.push(`${cDisplay}(${cType} → ${String(tChild.type || '')})`);
        } else {
          compatibleSubCount++;
        }
      }
      compatibleFields.push(`${display}(サブテーブル: 一致 ${compatibleSubCount}列)`);
    } else {
      compatibleFields.push(display);
    }
  }
  return {
    compatibleFields,
    droppedMissing,
    droppedMismatch,
    excludedSystemOrFile
  };
}

export function formatRecordCopyPreview(report: RecordCopyCompatibilityReport): string {
  return [
    `コピー対象フィールド (${report.compatibleFields.length}件): ${report.compatibleFields.join(', ') || 'なし'}`,
    `コピー先に無いため除外 (${report.droppedMissing.length}件): ${report.droppedMissing.join(', ') || 'なし'}`,
    `型不一致のため除外 (${report.droppedMismatch.length}件): ${report.droppedMismatch.join(', ') || 'なし'}`,
    `システム・添付・自動計算のため除外 (${report.excludedSystemOrFile.length}件): ${report.excludedSystemOrFile.join(', ') || 'なし'}`
  ].join('\n');
}

export async function runPreviewRecordCopyStandalone(
  opts: { sourceAppId: string; sourceGuestId?: string; targetAppsText: string; targetGuestId?: string },
  setStatus: RecordStatusCallback
): Promise<Array<{ targetAppId: string; report?: RecordCopyCompatibilityReport; error?: string }>> {
  const srcConn = validateRecordConnection(opts.sourceAppId, opts.sourceGuestId || '');
  const targetAppIds = parseRecordAppIds(opts.targetAppsText);
  if (!targetAppIds.length) throw new Error('コピー先の対象アプリIDを1件以上入力してください');
  const srcPrefix = buildApiPrefix(srcConn.guestId, false);
  const tgtPrefix = buildApiPrefix(opts.targetGuestId || '', false);
  setStatus(`コピー元 App ${srcConn.appId} のフィールド定義を取得中...`);
  const srcFields = await apiGet(srcPrefix, '/app/form/fields.json', { app: srcConn.appId, lang: 'user' });
  const srcProps = srcFields?.properties || {};
  const results: Array<{ targetAppId: string; report?: RecordCopyCompatibilityReport; error?: string }> = [];
  for (const targetAppId of targetAppIds) {
    setStatus(`コピー先 App ${targetAppId} のフィールド互換性を確認中...`);
    try {
      const tgtFields = await apiGet(tgtPrefix, '/app/form/fields.json', { app: targetAppId, lang: 'user' });
      const report = inspectRecordCopyCompatibility(srcProps, tgtFields?.properties || {});
      results.push({ targetAppId, report });
    } catch (error: any) {
      if (isCancelStop(error)) {
        throw createCancelReport(results.length, targetAppIds.length, [
          ...results.filter((r) => r.error).map((r) => `確認に失敗 App ${r.targetAppId}: ${r.error}`),
          `未実行（中止）: ${targetAppIds.slice(results.length).map((id) => `App ${id}`).join(', ')}`,
          'まだコピーは実行していません'
        ]);
      }
      results.push({ targetAppId, error: error?.message || String(error) });
    }
  }
  const hasWarn = results.some((r) => r.error || (r.report && (!r.report.compatibleFields.length || r.report.droppedMissing.length > 0 || r.report.droppedMismatch.length > 0)));
  setStatus(`フィールド互換性確認完了: ${results.length}アプリ。まだコピーは実行していません。`, hasWarn ? 'warn' : 'ok');
  return results;
}

export async function runRecordCopyStandalone(opts, setStatus) {
  const { sourceAppId, sourceGuestId, targetAppId, targetGuestId, query } = opts;
  if (!sourceAppId || !targetAppId) throw new Error('コピー元とコピー先のアプリIDを指定してください');
  const srcPrefix = buildApiPrefix(sourceGuestId || '', false);
  const tgtPrefix = buildApiPrefix(targetGuestId || '', false);

  setStatus(`コピー先 App ${targetAppId} のフィールド定義を確認中...`);
  const targetFields = await apiGet(tgtPrefix, '/app/form/fields.json', { app: targetAppId });
  const targetProps = targetFields?.properties;
  if (!targetProps || typeof targetProps !== 'object' || Array.isArray(targetProps)) throw new Error(`コピー先 App ${targetAppId} のフィールド設定の応答が不正です`);

  const records = await fetchAllRecords(srcPrefix, sourceAppId, query || '', setStatus);
  if (!records.length) {
    const warning = 'コピー対象のレコードがありません';
    setStatus(warning, 'warn');
    return { warning };
  }
  const plan = buildCopyRecordPayloads(records, targetProps);
  const droppedNote = plan.droppedFields.length
    ? `コピー先に無い/型が違うため除外: ${plan.droppedFields.slice(0, 10).join(', ')}${plan.droppedFields.length > 10 ? ` 他${plan.droppedFields.length - 10}件` : ''}`
    : '';
  // コピー先を取り違えると全フィールドが除外され、空レコードを大量に作ってしまう。
  if (!plan.records.some((record) => Object.keys(record).length)) {
    throw new Error(`コピーできるフィールドがありません（コピー先 App ${targetAppId} に一致するフィールドがありません）。コピー元とコピー先のアプリIDを確認してください。${droppedNote ? `\n${droppedNote}` : ''}`);
  }
  const fileNote = plan.droppedFileFields.length
    ? `添付ファイルはコピーされません: ${plan.droppedFileFields.slice(0, 10).join(', ')}${plan.droppedFileFields.length > 10 ? ` 他${plan.droppedFileFields.length - 10}件` : ''}（${plan.droppedFileFields.length}フィールド、添付ありレコード ${plan.recordsWithFiles}件）。必要な場合はコピー後に手動で再アップロードしてください。`
    : '';
  const confirmText = [
    `コピー元 App ${sourceAppId} → コピー先 App ${targetAppId}${targetGuestId ? `（ゲスト ${targetGuestId}）` : ''}`,
    `${plan.records.length}件を本番レコードとして新規追加します（既存レコードは変更しません）。`,
    'ファイル・システム項目・計算項目は除外されます。',
    fileNote,
    droppedNote,
    '実行しますか？'
  ].filter(Boolean).join('\n');
  if (!kusConfirm(confirmText)) {
    setStatus('レコードコピーをキャンセルしました', 'info');
    return { cancelled: true };
  }

  const ok = await writeChunksUnlessCancelled(
    plan.records,
    `App ${sourceAppId} → ${targetAppId} のレコードコピー`,
    (batch) => apiPost(tgtPrefix, '/records.json', { app: targetAppId, records: batch }),
    (done, total) => setStatus(`コピー中... ${done} / ${total}件`),
    index => `コピー元レコードID ${records[index]?.$id?.value ?? index + 1}`
  );
  const fileDropNote = plan.droppedFileFields.length ? `添付除外 ${plan.droppedFileFields.length}フィールド` : '';
  const dropWarning = [fileDropNote, droppedNote].filter(Boolean).join(' / ');
  const summary: RecordOperationSummary = {
    counts: { 件: ok },
    written: ok,
    describe: (counts, appIds) => appIds.length === 1
      ? `${counts['件']}件をコピーしました（コピー先 App ${appIds[0]}）`
      : `${appIds.length}アプリへ計 ${counts['件']}件をコピーしました`
  };
  const drops = plan.droppedFields.length > 0 || plan.droppedFileFields.length > 0;
  setStatus(`${summary.describe(summary.counts, [targetAppId])}${dropWarning ? `（${dropWarning}）` : ''}`, drops ? 'warn' : 'ok');
  return { summary, ...(dropWarning ? { warning: dropWarning } : {}) };
}

// ---------------------------------------------------------------------------
// 添付ファイル一括ダウンロード
// ---------------------------------------------------------------------------
/** フォルダ名に使うフィールド値。ユーザー・組織等の選択値（オブジェクト）は code/name を使う。 */
function folderLabelFromField(field: any): string {
  const label = (item: any): string => item && typeof item === 'object' ? String(item.code || item.name || '') : String(item ?? '');
  const value = field?.value;
  return (Array.isArray(value) ? value.map(label).filter(Boolean).join(',') : label(value)).trim();
}

/** 添付ファイル一括ダウンロード（条件で絞り、指定したファイルフィールドの中身を ZIP 化） */
/** 添付ファイル保存の完了文。取得失敗があれば件数を添える。 */
function describeAttachmentSummary(counts: Record<string, number>, appIds: string[]): string {
  const files = counts['ファイル'] || 0;
  const failed = counts['取得失敗'] || 0;
  const failNote = failed ? `（取得失敗 ${failed}件）` : '';
  if (!files) return `保存した添付ファイルはありません${failNote}`;
  return appIds.length === 1
    ? `添付ファイル ${files}件を保存しました${failNote}`
    : `${appIds.length}アプリで計 ${files}件の添付ファイルを保存しました${failNote}`;
}

export async function runAttachmentDownloadStandalone(opts, setStatus: RecordStatusCallback): Promise<RecordOperationResult> {
  const { appId, guestId, query, fileFieldCode, folderFieldCode, zipName } = opts;
  const tableFieldCode = String(opts.tableFieldCode || '');
  if (!appId) throw new Error('アプリIDを入力してください');
  if (!fileFieldCode) throw new Error('ファイルフィールドコードを入力してください');
  const prefix = buildApiPrefix(guestId || '', false);

  const fields = await runLoadAttachmentFieldsStandalone({ appId, guestId }, setStatus);
  if (!fields.some(field => field.fileFieldCode === fileFieldCode && field.tableFieldCode === tableFieldCode)) {
    throw new Error(`添付フィールド「${tableFieldCode ? `${tableFieldCode} / ` : ''}${fileFieldCode}」がありません。フィールド名ではなくコードと、テーブルの指定を確認してください`);
  }

  const records = await fetchAllRecords(prefix, appId, query || '', setStatus);
  if (!records.length) throw new Error('対象レコードが0件です');
  // Empty tables are valid. Missing fields are distinct from empty file arrays.
  const groups = records.flatMap((rec, index) => {
    const recordId = String(rec.$id?.value || index + 1);
    const parent = rec?.[tableFieldCode || fileFieldCode];
    if (!parent || parent.type !== (tableFieldCode ? 'SUBTABLE' : 'FILE') || !Array.isArray(parent.value)) {
      throw new Error(`レコード ${recordId}: フィールド「${tableFieldCode || fileFieldCode}」を取得できません。閲覧権限を確認してください`);
    }
    const rows = tableFieldCode ? parent.value : [{ value: { [fileFieldCode]: parent } }];
    return rows.map((row, rowIndex) => {
      const field = row.value?.[fileFieldCode];
      if (field?.type !== 'FILE' || !Array.isArray(field.value)) {
        throw new Error(`レコード ${recordId} / テーブル行 ${rowIndex + 1}: 添付フィールド「${fileFieldCode}」を取得できません。閲覧権限を確認してください`);
      }
      return { rec, recordId, rowId: tableFieldCode ? String(row.id || rowIndex + 1) : '', files: field.value };
    });
  });

  if (!groups.some(group => group.files.length)) {
    const warning = 'ダウンロード対象の添付がありませんでした';
    setStatus(warning, 'warn');
    return { warning, summary: { counts: { ファイル: 0, 取得失敗: 0 }, describe: describeAttachmentSummary } };
  }
  const JSZipCtor = await loadJSZipLite();
  const zip = new JSZipCtor();
  let fileCount = 0;
  const failures: FileFailure[] = [];
  const manifest: any[] = [];
  const usedByFolder = new Map<string, Set<string>>();

  for (let i = 0; i < groups.length; i++) {
    const { rec, recordId, rowId, files } = groups[i];
    setStatus(`添付DL中 (${i + 1}/${groups.length}${failures.length ? ` / 失敗 ${failures.length}` : ''})`);
    if (!files.length) continue;
    let folderName = folderFieldCode ? folderLabelFromField(rec[folderFieldCode]) : '';
    if (!folderName) folderName = `Record_${recordId}`;
    const folderPath = [sanitizeZipSegment(folderName, `Record_${recordId}`),
      ...(tableFieldCode ? [...(folderName === `Record_${recordId}` ? [] : [`Record_${recordId}`]), sanitizeZipSegment(tableFieldCode), `Row_${sanitizeZipSegment(rowId)}`] : [])].join('/');
    const folder = zip.folder(folderPath);
    const used = usedByFolder.get(folderPath) || new Set<string>();
    usedByFolder.set(folderPath, used);
    for (const f of files) {
      let result: FileFetchResult;
      try {
        result = await downloadFileBlob(prefix, f.fileKey);
      } catch (error) {
        if (!isCancelStop(error)) throw error;
        throw createCancelReport(i, groups.length, [
          `中断したレコード: ${recordId}${rowId ? ` / テーブル行 ${rowId}` : ''}`,
          `取得済み ${fileCount}ファイル / 取得失敗 ${failures.length}件`,
          '添付ファイルの ZIP は保存していません'
        ]);
      }
      const entry = { recordId, tableFieldCode, rowId, fileFieldCode, name: String(f.name || ''),
        size: String(f.size ?? ''), contentType: String(f.contentType || ''), path: '', error: '' };
      if (result.ok === true) {
        const name = uniqueZipName(used, f.name || 'file.bin', f.fileKey, fileCount);
        folder.file(name, result.blob);
        entry.path = `${folderPath}/${name}`;
        fileCount++;
      } else {
        entry.error = result.reason;
        failures.push({ recordId, fileName: String(f.name || ''), fileKey: String(f.fileKey || ''), reason: `${rowId ? `テーブル ${tableFieldCode} / 行 ${rowId}: ` : ''}${result.reason}` });
      }
      manifest.push(entry);
    }
  }
  if (!fileCount) {
    if (failures.length) {
      throw new Error(`添付ファイルを1件も取得できませんでした（失敗 ${failures.length}件）\n${formatFileFailures(failures.slice(0, 5))}${failures.length > 5 ? '\n…' : ''}`);
    }
    setStatus('ダウンロード対象の添付がありませんでした', 'warn');
    return { warning: 'ダウンロード対象の添付がありませんでした', summary: { counts: { ファイル: 0, 取得失敗: 0 }, describe: describeAttachmentSummary } };
  }
  if (failures.length) {
    zip.file('download_errors.txt', `取得できなかった添付ファイル ${failures.length}件\n${formatFileFailures(failures)}\n`);
  }
  zip.file('manifest.json', JSON.stringify({ appId: String(appId), guestId: String(guestId || ''), query: query || '', files: manifest }, null, 2));
  setStatus(`ZIP生成中 (${fileCount}ファイル)`);
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(recordExportFilename(zipName, 'zip', buildExportFilename('添付ファイル', 'zip', { appLabel: buildAppFilenameLabel(appId, '') })), zipBlob);
  const summary: RecordOperationSummary = { counts: { ファイル: fileCount, 取得失敗: failures.length }, describe: describeAttachmentSummary };
  const headline = summary.describe(summary.counts, [String(appId)]);
  if (failures.length) {
    const detail = `取得失敗 ${failures.length}件の詳細は ZIP 内の download_errors.txt`;
    setStatus(`${headline}\n${detail}`, 'warn');
    return { warning: detail, summary };
  }
  setStatus(headline, 'ok');
  return { summary };
}

// ---------------------------------------------------------------------------
// レコードバックアップ
// ---------------------------------------------------------------------------
/**
 * 軽量レコードバックアップ:
 *  - 親レコードCSV、テーブルごとの明細CSV、取得したレコードのJSON
 *  - 任意で添付ファイル（添付フィールド/サブテーブル内ファイル）
 *  - 任意でコメント
 *  - 任意でアプリ設定（fetchBundle）
 * を1つのZIPに格納する。フル版の plugin_config までは取らない。
 * 取得できなかった添付・コメントは manifest.json に残し、完了メッセージにも件数を出す。
 */
/** バックアップの完了文。保存しなかった種類（添付・コメント）は件数に含めない。 */
function describeBackupSummary(counts: Record<string, number>, appIds: string[]): string {
  const parts = [`レコード ${counts['レコード'] || 0}件`];
  if ('添付' in counts) parts.push(`添付 ${counts['添付']}件`);
  if ('コメント' in counts) parts.push(`コメント ${counts['コメント']}件`);
  return `${appIds.length === 1 ? '' : `${appIds.length}アプリの`}バックアップを保存しました（${parts.join('・')}）`;
}

export async function runRecordBackupStandalone(opts, setStatus: RecordStatusCallback): Promise<RecordOperationResult> {
  const { appId, guestId, query, zipName, includeFiles, includeComments, includeAppSettings, appScopes } = opts;
  if (!appId) throw new Error('アプリIDを入力してください');
  const prefix = buildApiPrefix(guestId || '', false);

  setStatus('フィールド情報取得中...');
  const fields = await apiGet(prefix, '/app/form/fields.json', { app: appId });
  const propKeys = Object.keys(fields.properties || ({} as any));
  if (!propKeys.length) throw new Error('出力できるフィールドがありません');

  const records = await fetchAllRecords(prefix, appId, query || '', setStatus);
  if (!records.length) throw new Error('対象レコードが0件です');

  const JSZipCtor = await loadJSZipLite();
  const zip = new JSZipCtor();
  const notes: string[] = [];

  const csvExport = buildRecordCsvExport(records, fields.properties);
  addRecordCsvFiles(zip, csvExport);
  notes.push(...csvExport.warnings);
  zip.file('records.json', JSON.stringify({ generatedAt: new Date().toISOString(), appId, recordCount: records.length, records }, null, 2));

  let fileCount = 0;
  const fileFailures: FileFailure[] = [];
  if (includeFiles) {
    const collected: Array<{ rec: any; fieldCode: string; childCode?: string; rowIndex?: number; fileIndex: number; file: any }> = [];
    for (const rec of records) {
      for (const [code, field] of Object.entries(rec) as Array<[string, any]>) {
        if (!field || typeof field !== 'object') continue;
        if (field.type === 'FILE') {
          (field.value || []).forEach((file: any, idx: number) => collected.push({ rec, fieldCode: code, fileIndex: idx, file }));
        } else if (field.type === 'SUBTABLE') {
          (field.value || []).forEach((subRow: any, rowIdx: number) => {
            for (const [childCode, childField] of Object.entries(subRow.value || ({} as any)) as Array<[string, any]>) {
              if (childField?.type !== 'FILE') continue;
              (childField.value || []).forEach((file: any, idx: number) => collected.push({ rec, fieldCode: code, childCode, rowIndex: rowIdx, fileIndex: idx, file }));
            }
          });
        }
      }
    }
    if (!collected.length) notes.push('添付ファイルなし');
    const blobCache = new Map<string, FileFetchResult>();
    const usedByDir = new Map<string, Set<string>>();
    for (let i = 0; i < collected.length; i++) {
      const ent = collected[i];
      setStatus(`添付ファイル取得中 (${i + 1}/${collected.length}${fileFailures.length ? ` / 失敗 ${fileFailures.length}` : ''})`);
      const recordId = String(ent.rec?.$id?.value || 'unknown');
      let result = blobCache.get(ent.file.fileKey);
      if (!result) {
        try {
          result = await downloadFileBlob(prefix, ent.file.fileKey);
        } catch (error) {
          if (!isCancelStop(error)) throw error;
          throw createCancelReport(i, collected.length, [
            `添付ファイルの取得を中止しました（取得済み ${fileCount}ファイル / 取得失敗 ${fileFailures.length}件）`,
            'バックアップの ZIP は保存していません（途中までのバックアップを完全なものと取り違えないため）'
          ]);
        }
        blobCache.set(ent.file.fileKey, result);
      }
      if (result.ok === false) {
        fileFailures.push({ recordId, fileName: String(ent.file.name || ''), fileKey: String(ent.file.fileKey || ''), reason: result.reason });
        continue;
      }
      const parts = ['attachments', `record_${sanitizeZipSegment(recordId)}`];
      if (ent.childCode) {
        parts.push(sanitizeZipSegment(ent.fieldCode || 'subtable'));
        parts.push(`row_${(ent.rowIndex || 0) + 1}`);
        parts.push(sanitizeZipSegment(ent.childCode));
      } else {
        parts.push(sanitizeZipSegment(ent.fieldCode || 'files'));
      }
      // 同じフォルダに同名・同じ fileKey 接頭辞のファイルがあっても、後続が先のファイルを上書きしない。
      const dir = parts.join('/');
      const used = usedByDir.get(dir) || new Set<string>();
      usedByDir.set(dir, used);
      zip.file(`${dir}/${uniqueZipName(used, ent.file.name || 'file.bin', ent.file.fileKey, ent.fileIndex)}`, result.blob);
      fileCount++;
    }
    if (fileFailures.length) {
      notes.push(`添付ファイル取得失敗 ${fileFailures.length}件（manifest.json の fileFailures 参照）`);
    }
  } else {
    notes.push('添付ファイル未取得');
  }

  let commentCount = 0;
  const commentFailures: Array<{ recordId: string; reason: string }> = [];
  if (includeComments) {
    const out: any[] = [];
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const recordId = String(rec?.$id?.value || '').trim();
      if (!recordId) continue;
      setStatus(`コメント取得中 (${i + 1}/${records.length}${commentFailures.length ? ` / 失敗 ${commentFailures.length}` : ''})`);
      try {
        const comments: any[] = [];
        let offset = 0;
        const limit = 10; // record/comments.json の上限
        while (true) {
          const resp = await apiGet(prefix, '/record/comments.json', { app: appId, record: recordId, order: 'asc', offset, limit });
          const batch = resp.comments || [];
          comments.push(...batch);
          if (batch.length < limit) break;
          offset += batch.length;
        }
        if (comments.length) {
          out.push({ recordId, comments });
          commentCount += comments.length;
        }
      } catch (e: any) {
        if (isCancelStop(e)) {
          throw createCancelReport(i, records.length, [
            `コメントの取得を中止しました（取得済み ${commentCount}件 / 取得失敗 ${commentFailures.length}レコード）`,
            'バックアップの ZIP は保存していません（途中までのバックアップを完全なものと取り違えないため）'
          ]);
        }
        // 1 レコードの失敗で残りを捨てず、失敗したレコードを記録して続行する。
        commentFailures.push({ recordId, reason: e?.message || String(e) });
      }
    }
    zip.file('comments.json', JSON.stringify({ generatedAt: new Date().toISOString(), appId, commentCount, failures: commentFailures, records: out }, null, 2));
    if (commentFailures.length) notes.push(`コメント取得失敗 ${commentFailures.length}レコード（manifest.json の commentFailures 参照）`);
  } else {
    notes.push('コメント未取得');
  }

  let appOk = 0;
  let appNg = 0;
  const appNgSections: string[] = [];
  if (includeAppSettings && appScopes && appScopes.length) {
    setStatus('アプリ設定取得中...');
    const settings = await fetchBundle({
      appId,
      guestId: guestId || '',
      preview: false,
      sections: appScopes,
      onProgress: (p: number, l: string) => setStatus(`アプリ設定取得中 ${Math.round(p * 100)}% (${l})`)
    });
    for (const key of appScopes) {
      const sec = settings.sections[key];
      if (sec && sec._fetchError) { appNg++; appNgSections.push(key); } else appOk++;
    }
    if (appNg) {
      if (appOk === 0) {
        notes.push(`警告: 選択されたすべてのアプリ設定セクション（${appNg}件）の取得に失敗しました（権限または環境を確認してください）: ${appNgSections.join(', ')}`);
      } else {
        notes.push(`アプリ設定取得失敗 ${appNg}セクション: ${appNgSections.join(', ')}`);
      }
    }
    zip.file(`app_settings/app_${appId}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), appId, scopes: appScopes, bundle: settings }, null, 2));
  } else if (!includeAppSettings) {
    notes.push('アプリ設定未取得');
  } else {
    notes.push('アプリ設定の保存範囲が未選択のため取得していません');
  }

  zip.file('manifest.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    appId,
    query: query || '',
    recordCount: records.length,
    csvExport: csvExportManifest(appId, guestId || '', records.length, csvExport),
    fileCount,
    fileFailures,
    commentCount,
    commentFailures,
    appSettings: { ok: appOk, ng: appNg, ngSections: appNgSections, scopes: appScopes || [] },
    notes
  }, null, 2));

  setStatus(`ZIP生成中 (${records.length}件 / 添付 ${fileCount} / コメント ${commentCount})`);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(recordExportFilename(zipName, 'zip', buildExportFilename('レコードバックアップ', 'zip', { appLabel: buildAppFilenameLabel(appId, '') })), blob);
  const failureCount = fileFailures.length + commentFailures.length + appNg + csvExport.warnings.length;
  const allSettingsFailed = Boolean(includeAppSettings && appScopes?.length && appOk === 0 && appNg > 0);
  const detail = failureCount
    ? `取得失敗: 添付 ${fileFailures.length} / コメント ${commentFailures.length} / 設定 ${appNg}${allSettingsFailed ? ' [全セクション失敗]' : ''} / テーブル ${csvExport.warnings.length}（詳細は manifest.json）`
    : '';
  const summary: RecordOperationSummary = {
    counts: { レコード: records.length, ...(includeFiles ? { 添付: fileCount } : {}), ...(includeComments ? { コメント: commentCount } : {}) },
    describe: describeBackupSummary
  };
  const headline = summary.describe(summary.counts, [String(appId)]);
  setStatus(detail ? `${headline}\n${detail}` : headline, failureCount > 0 ? 'warn' : 'ok');
  return { summary, ...(detail ? { warning: detail } : {}) };
}

// ---------------------------------------------------------------------------
// 補助情報の取得
// ---------------------------------------------------------------------------
/** ステータス管理（アクション/状態リスト）を取得 — シミュレーション/プルダウン用 */
export async function runLoadStatusActionsStandalone(opts, setStatus) {
  const { appId, guestId } = validateRecordConnection(opts.appId, opts.guestId);
  const prefix = buildApiPrefix(guestId, false);
  setStatus('プロセス管理情報を取得中...');
  const res = await apiGet(prefix, '/app/status.json', { app: appId, lang: 'user' });
  if (!res.enable) {
    setStatus('プロセス管理は無効です', 'warn');
    return { enabled: false, states: [], actions: [], statusFieldCode: '' };
  }
  const states = Object.keys(res.states || {}).sort((a, b) => Number(res.states[a].index) - Number(res.states[b].index));
  const actions = readProcessActionChoices(res);
  const fields = await apiGet(prefix, '/app/form/fields.json', { app: appId, lang: 'user' });
  const statusField = Object.entries(fields?.properties || {}).find(([, field]: [string, any]) => field?.type === 'STATUS');
  const statusFieldCode = statusField ? String((statusField[1] as any).code || statusField[0]) : '';
  setStatus(`プロセス管理: 状態 ${states.length}件 / アクション ${actions.length}件`);
  return { enabled: true, states, actions, statusFieldCode };
}

/** 一覧（views）を取得 — クエリ補助用 */
export async function runLoadViewsStandalone(opts, setStatus) {
  const { appId, guestId } = validateRecordConnection(opts.appId, opts.guestId);
  const prefix = buildApiPrefix(guestId, false);
  setStatus('一覧情報を取得中...');
  const resp = await apiGet(prefix, '/app/views.json', { app: appId, lang: 'user' });
  const views = readRecordViews(resp);
  setStatus(`一覧: ${views.length}件`);
  return views;
}

/** Field labels and codes, including FILE fields nested in SUBTABLE.fields. */
export async function runLoadAttachmentFieldsStandalone(opts, setStatus) {
  const { appId, guestId } = validateRecordConnection(opts.appId, opts.guestId);
  setStatus('添付フィールド情報を取得中...');
  const response = await apiGet(buildApiPrefix(guestId, false), '/app/form/fields.json', { app: appId, lang: 'user' });
  const fields = readAttachmentFields(response);
  setStatus(`添付フィールド: ${fields.length}件${fields.length ? '' : '（添付フィールドがありません）'}`);
  return fields;
}
