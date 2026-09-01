'use strict';

import { downloadBlob, kusConfirm, buildExportFilename, buildAppFilenameLabel } from '../utils.js';
import { apiGet, apiPost, apiPut, buildApiPrefix, fetchBundle, fetchRecordsByQuery } from '../api.js';
import { loadJSZipLite } from '../jszipLoader.js';
import {
  buildRecordsCsvText,
  sanitizeZipSegment,
  uniqueZipName,
  writeInChunks
} from './record-query.js';

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

/** Run the same operation for all pasted app IDs, even when one app fails. */
export async function runRecordAppBatchStandalone(
  appIdsValue: unknown,
  operation: (appId: string, index: number, total: number) => Promise<void>,
  setStatus: (message: string, error?: boolean) => void
): Promise<void> {
  const appIds = parseRecordAppIds(appIdsValue);
  if (!appIds.length) throw new Error('対象アプリIDを1件以上入力してください');
  const failures: string[] = [];
  for (let i = 0; i < appIds.length; i++) {
    const appId = appIds[i];
    setStatus(`App ${appId}: 実行中 (${i + 1}/${appIds.length})`);
    try {
      await operation(appId, i, appIds.length);
    } catch (error: any) {
      failures.push(`App ${appId}: ${error?.message || String(error)}`);
    }
  }
  if (failures.length) {
    throw new Error(`${appIds.length}件中${failures.length}件が失敗しました\n${failures.join('\n')}`);
  }
  setStatus(`${appIds.length}アプリの操作が完了しました`);
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
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(url, { method: 'GET', headers });
      if (resp.status === 403) return { ok: false, reason: '閲覧権限なし (HTTP 403)' };
      if (!resp.ok) {
        lastReason = `HTTP ${resp.status}`;
      } else {
        return { ok: true, blob: await resp.blob() };
      }
    } catch (e: any) {
      lastReason = e?.message || String(e);
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
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

async function fetchAllRecords(prefix: string, app: string, query: string, setStatus: (m: string) => void): Promise<any[]> {
  setStatus('レコード取得中...');
  const result = await fetchRecordsByQuery(prefix, app, query || '', {
    onProgress: (n, mode) => setStatus(`レコード取得中... (${n}件取得済${describeFetchMode(mode)})`)
  });
  return result.records;
}

async function fetchRecordIds(prefix: string, app: string, query: string, setStatus: (m: string) => void): Promise<number[]> {
  setStatus('対象レコード取得中...');
  const result = await fetchRecordsByQuery(prefix, app, query || '', {
    fields: ['$id'],
    onProgress: (n, mode) => setStatus(`対象レコード取得中... (${n}件${describeFetchMode(mode)})`)
  });
  return result.records
    .map((r: any) => Number(r?.$id?.value))
    .filter((id: number) => Number.isFinite(id) && id > 0);
}

// ---------------------------------------------------------------------------
// CSV 出力
// ---------------------------------------------------------------------------
async function buildCsvExportForApp(appId: string, guestId: string, query: string, setStatus: (m: string) => void) {
  if (!appId) throw new Error('アプリIDを入力してください');
  const prefix = buildApiPrefix(guestId || '', false);

  setStatus(`App ${appId}: フィールド情報取得中...`);
  const fields = await apiGet(prefix, '/app/form/fields.json', { app: appId });
  const propKeys = Object.keys(fields.properties || ({} as any));
  if (!propKeys.length) throw new Error(`App ${appId}: 出力できるフィールドがありません`);

  const records = await fetchAllRecords(prefix, appId, query || '', (message) => setStatus(`App ${appId}: ${message}`));
  if (!records.length) throw new Error(`App ${appId}: 出力するレコードがありません`);

  setStatus(`App ${appId}: CSV生成中... (${records.length}件)`);
  return {
    appId,
    guestId: guestId || '',
    recordCount: records.length,
    csvText: buildRecordsCsvText(records, propKeys)
  };
}

export async function runCsvExportStandalone(opts, setStatus) {
  const { appId, guestId, query, filename } = opts;
  const result = await buildCsvExportForApp(appId, guestId, query || '', setStatus);
  const blob = new Blob([result.csvText], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(filename || buildExportFilename('レコード', 'csv', { appLabel: buildAppFilenameLabel(appId, '') }), blob);
  setStatus(`CSV出力完了 (${result.recordCount}件)`);
}

export async function runCsvExportBatchStandalone(opts, setStatus) {
  const apps = (opts?.apps || []).filter((a) => a?.appId);
  const query = opts?.query || '';
  const filename = String(opts?.filename || '').trim();
  if (!apps.length) throw new Error('対象アプリを1件以上入力してください');
  if (apps.length === 1) {
    const app = apps[0];
    await runCsvExportStandalone({ appId: app.appId, guestId: app.guestId || '', query, filename }, setStatus);
    return;
  }

  const JSZip = await loadJSZipLite();
  const zip = new JSZip();
  const used = new Set<string>();
  let totalRecords = 0;
  const failures: string[] = [];

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    setStatus(`CSV出力中... (${i + 1}/${apps.length})`);
    try {
      const result = await buildCsvExportForApp(app.appId, app.guestId || '', query, setStatus);
      totalRecords += result.recordCount;
      const label = buildAppFilenameLabel(result.appId, app.appName || '');
      const baseName = buildExportFilename('レコード', 'csv', { appLabel: label }).replace(/\.csv$/i, '');
      const guestSuffix = result.guestId ? `_guest${sanitizeZipSegment(result.guestId)}` : '';
      const entryName = uniqueZipName(used, `${baseName}${guestSuffix}.csv`, result.appId, i);
      zip.file(entryName, result.csvText);
    } catch (error: any) {
      // 1 アプリの失敗で全体を捨てず、成功分は ZIP に入れて失敗一覧を manifest に残す。
      failures.push(`App ${app.appId}: ${error?.message || String(error)}`);
    }
  }
  if (failures.length === apps.length) {
    throw new Error(`すべてのアプリで CSV 出力に失敗しました\n${failures.join('\n')}`);
  }

  const manifest = [
    'kintone CSV 一括出力マニフェスト',
    `出力日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
    `対象アプリ数: ${apps.length}（成功 ${apps.length - failures.length} / 失敗 ${failures.length}）`,
    `総レコード数: ${totalRecords}`,
    `共通クエリ: ${query || '(なし)'}`,
    '',
    ...apps.map((a, i) => `${i + 1}. App ${a.appId}${a.guestId ? ` / Guest ${a.guestId}` : ''}${a.appName ? ` / ${a.appName}` : ''}`),
    ...(failures.length ? ['', '失敗:', ...failures] : [])
  ].join('\n');
  zip.file('manifest.txt', manifest);

  setStatus(`ZIP生成中... (${apps.length}アプリ / ${totalRecords}件)`);
  const blob = await zip.generateAsync({ type: 'blob' });
  const zipName = filename || buildExportFilename('CSV出力', 'zip');
  downloadBlob(zipName.toLowerCase().endsWith('.zip') ? zipName : `${zipName}.zip`, blob);
  if (failures.length) {
    setStatus(`CSV一括出力完了（失敗 ${failures.length}アプリ、詳細は manifest.txt）: ${apps.length - failures.length}アプリ / ${totalRecords}件`, true);
    return;
  }
  setStatus(`CSV一括出力完了 (${apps.length}アプリ / ${totalRecords}件)`);
}

// ---------------------------------------------------------------------------
// CSV 取込
// ---------------------------------------------------------------------------
const CSV_IMPORT_UNSUPPORTED_FIELD_TYPES = new Set([
  'RECORD_NUMBER', 'CREATOR', 'CREATED_TIME', 'MODIFIER', 'UPDATED_TIME',
  'STATUS', 'STATUS_ASSIGNEE', 'CALC', 'CATEGORY', '__ID__', '__REVISION__',
  'FILE', 'SUBTABLE', 'REFERENCE_TABLE', 'LABEL', 'HR', 'SPACER'
]);

export function splitCsvListValue(value: unknown): string[] {
  const text = String(value == null ? '' : value).trim();
  if (!text) return [];
  return text.split(',').map((item) => item.trim()).filter(Boolean);
}

export function coerceCsvImportValue(rawValue: unknown, fieldDef: any): unknown {
  const type = String(fieldDef?.type || '');
  if (type === 'CHECK_BOX' || type === 'MULTI_SELECT') return splitCsvListValue(rawValue);
  if (type === 'USER_SELECT' || type === 'ORGANIZATION_SELECT' || type === 'GROUP_SELECT') {
    return splitCsvListValue(rawValue).map((code) => ({ code }));
  }
  if (type === 'NUMBER') return String(rawValue == null ? '' : rawValue).trim();
  return rawValue;
}

export function validateCsvImportHeader(header: string[], properties: Record<string, any>): void {
  if (header.includes('$id')) throw new Error('CSV内にシステムフィールド（$idなど）が含まれています。インポート時は除外してください。');
  const unknown: string[] = [];
  const unsupported: string[] = [];
  for (const code of header) {
    if (!code) continue;
    const def = properties?.[code];
    if (!def) {
      unknown.push(code);
      continue;
    }
    if (CSV_IMPORT_UNSUPPORTED_FIELD_TYPES.has(String(def.type || ''))) {
      unsupported.push(`${code}(${def.type})`);
    }
  }
  if (unknown.length) throw new Error(`CSVヘッダに存在しないフィールドコードがあります: ${unknown.join(', ')}`);
  if (unsupported.length) throw new Error(`CSVインポート非対応のフィールドが含まれています: ${unsupported.join(', ')}`);
}

/** RFC4180 風の最小 CSV パーサ（ダブルクォート内の改行・"" エスケープ対応）。 */
export function parseCsvText(csv: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = '';
  let inQ = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    const n = csv[i + 1];
    if (inQ) {
      if (c === '"') {
        if (n === '"') { cell += '"'; i++; } else inQ = false;
      } else {
        cell += c;
      }
      continue;
    }
    if (c === '"') inQ = true;
    else if (c === ',') { current.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && n === '\n') i++;
      current.push(cell);
      rows.push(current);
      current = [];
      cell = '';
    } else cell += c;
  }
  if (cell || current.length) { current.push(cell); rows.push(current); }
  return rows;
}

export async function runCsvImportStandalone(opts, setStatus) {
  const { appId, guestId, file } = opts;
  if (!appId) throw new Error('アプリIDを入力してください');
  if (!file) throw new Error('CSVファイルを選択してください');
  const prefix = buildApiPrefix(guestId || '', false);

  setStatus('CSVファイルを読み込み中...');
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(String((e.target as FileReader).result || ''));
    reader.onerror = () => reject(new Error('ファイルの読み取りに失敗'));
    reader.readAsText(file);
  });

  const rows = parseCsvText(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('ヘッダ行とデータ行が必要です');
  const header = rows[0].map((h) => h.trim());
  setStatus('フィールド情報を確認中...');
  const fields = await apiGet(prefix, '/app/form/fields.json', { app: appId });
  const properties = fields?.properties || ({} as any);
  validateCsvImportHeader(header, properties);

  const records: any[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length === 1 && rows[i][0] === '') continue;
    const rec: Record<string, any> = {};
    for (let j = 0; j < header.length; j++) {
      if (!header[j]) continue;
      const val = rows[i][j] !== undefined ? rows[i][j] : '';
      rec[header[j]] = { value: coerceCsvImportValue(val, properties[header[j]]) };
    }
    records.push(rec);
  }
  if (!records.length) throw new Error('登録するデータがありません');
  const confirmText = [
    `App ${appId}${guestId ? `（ゲスト ${guestId}）` : ''} の本番レコードへ CSV から ${records.length}件 を追加します。`,
    `対象フィールド: ${header.filter(Boolean).length}件`,
    '追加したレコードは自動では取り消せません。実行しますか？'
  ].join('\n');
  if (!kusConfirm(confirmText)) {
    setStatus('CSV取込をキャンセルしました');
    return;
  }

  const ok = await writeInChunks(
    records,
    `App ${appId} の CSV取込`,
    (batch) => apiPost(prefix, '/records.json', { app: appId, records: batch }),
    (done, total) => setStatus(`インポート中... (${done} / ${total}件)`)
  );
  setStatus(`インポート完了: ${ok}件`);
}

// ---------------------------------------------------------------------------
// ステータス一括更新
// ---------------------------------------------------------------------------
export async function runBatchProcessStandalone(opts, setStatus) {
  const { appId, guestId, query, action, assignee } = opts;
  if (!appId) throw new Error('アプリIDを入力してください');
  if (!action) throw new Error('アクション名を入力してください');
  const prefix = buildApiPrefix(guestId || '', false);

  const ids = await fetchRecordIds(prefix, appId, query || '', setStatus);
  if (!ids.length) throw new Error('処理対象のレコードが0件です');
  const confirmText = [
    `App ${appId}${guestId ? `（ゲスト ${guestId}）` : ''} の ${ids.length}件 にアクション「${action}」を実行します${assignee ? `（作業者: ${assignee}）` : ''}。`,
    `条件: ${query || '(全件)'}`,
    '本番レコードのステータスが変わり、自動では元に戻せません。実行しますか？'
  ].join('\n');
  if (!kusConfirm(confirmText)) {
    setStatus('ステータス一括更新をキャンセルしました');
    return;
  }

  const ok = await writeInChunks(
    ids,
    `App ${appId} のステータス更新`,
    (batch) => apiPut(prefix, '/records/status.json', {
      app: appId,
      records: batch.map((id) => {
        const r: any = { id, action };
        if (assignee) r.assignee = assignee;
        return r;
      })
    }),
    (done, total) => setStatus(`ステータス更新中... ${done}/${total}件`)
  );
  setStatus(`ステータス一括更新完了 (${ok}件)`);
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
}

/**
 * コピー元レコードから、コピー先へ POST できる形の payload を作る。
 * - システム項目・ファイル・計算フィールドは除外
 * - コピー先のフィールド定義（targetProps）を渡した場合、存在しないフィールドは除外して報告する
 * - サブテーブルの行には id を含めない（新規行として追加する）
 */
export function buildCopyRecordPayloads(records: any[], targetProps?: Record<string, any> | null): CopyPayloadPlan {
  const dropped = new Set<string>();
  const targetKnown = targetProps && typeof targetProps === 'object' ? targetProps : null;
  const canWriteTop = (code: string, field: any): boolean => {
    if (COPY_SYSTEM_CODES.has(code) || COPY_SYSTEM_TYPES.has(field?.type) || field?.type === 'FILE') return false;
    if (targetKnown && !targetKnown[code]) { dropped.add(code); return false; }
    if (targetKnown && targetKnown[code]?.type !== field?.type) { dropped.add(`${code}(型不一致)`); return false; }
    return true;
  };
  const out = records.map((rec) => {
    const payload: Record<string, any> = {};
    for (const [code, field] of Object.entries(rec || {}) as Array<[string, any]>) {
      if (!field || typeof field !== 'object') continue;
      if (!canWriteTop(code, field)) continue;
      if (field.type === 'SUBTABLE') {
        const childDefs = targetKnown ? targetKnown[code]?.fields || {} : null;
        const rows = Array.isArray(field.value) ? field.value : [];
        payload[code] = {
          value: rows.map((row: any) => {
            const inner = row && typeof row === 'object' && row.value && typeof row.value === 'object' ? row.value : {};
            const cells: Record<string, any> = {};
            for (const [childCode, childField] of Object.entries(inner) as Array<[string, any]>) {
              if (!childField || typeof childField !== 'object') continue;
              if (COPY_SYSTEM_CODES.has(childCode) || COPY_SYSTEM_TYPES.has(childField.type) || childField.type === 'FILE') continue;
              if (childDefs && !childDefs[childCode]) { dropped.add(`${code}.${childCode}`); continue; }
              cells[childCode] = { value: childField.value };
            }
            return { value: cells };
          })
        };
      } else {
        payload[code] = { value: field.value };
      }
    }
    return payload;
  });
  return { records: out, droppedFields: [...dropped].sort() };
}

export async function runRecordCopyStandalone(opts, setStatus) {
  const { sourceAppId, sourceGuestId, targetAppId, targetGuestId, query } = opts;
  if (!sourceAppId || !targetAppId) throw new Error('コピー元とコピー先のアプリIDを指定してください');
  const srcPrefix = buildApiPrefix(sourceGuestId || '', false);
  const tgtPrefix = buildApiPrefix(targetGuestId || '', false);

  setStatus(`コピー先 App ${targetAppId} のフィールド定義を確認中...`);
  const targetFields = await apiGet(tgtPrefix, '/app/form/fields.json', { app: targetAppId });
  const targetProps = targetFields?.properties || ({} as any);

  const records = await fetchAllRecords(srcPrefix, sourceAppId, query || '', setStatus);
  if (!records.length) { setStatus('コピー対象のレコードがありません'); return; }
  const plan = buildCopyRecordPayloads(records, targetProps);
  const droppedNote = plan.droppedFields.length
    ? `コピー先に無い/型が違うため除外: ${plan.droppedFields.slice(0, 10).join(', ')}${plan.droppedFields.length > 10 ? ` 他${plan.droppedFields.length - 10}件` : ''}`
    : '';
  const confirmText = [
    `コピー元 App ${sourceAppId} → コピー先 App ${targetAppId}${targetGuestId ? `（ゲスト ${targetGuestId}）` : ''}`,
    `${plan.records.length}件を本番レコードとして新規追加します（既存レコードは変更しません）。`,
    'ファイル・システム項目・計算項目は除外されます。',
    droppedNote,
    '実行しますか？'
  ].filter(Boolean).join('\n');
  if (!kusConfirm(confirmText)) {
    setStatus('レコードコピーをキャンセルしました');
    return;
  }

  const ok = await writeInChunks(
    plan.records,
    `App ${sourceAppId} → ${targetAppId} のレコードコピー`,
    (batch) => apiPost(tgtPrefix, '/records.json', { app: targetAppId, records: batch }),
    (done, total) => setStatus(`コピー中... ${done} / ${total}件`)
  );
  setStatus(`レコードコピー完了: ${ok}件${droppedNote ? `（${droppedNote}）` : ''}`, plan.droppedFields.length > 0);
}

// ---------------------------------------------------------------------------
// 添付ファイル一括ダウンロード
// ---------------------------------------------------------------------------
/** 添付ファイル一括ダウンロード（条件で絞り、指定したファイルフィールドの中身を ZIP 化） */
export async function runAttachmentDownloadStandalone(opts, setStatus) {
  const { appId, guestId, query, fileFieldCode, folderFieldCode, zipName } = opts;
  if (!appId) throw new Error('アプリIDを入力してください');
  if (!fileFieldCode) throw new Error('ファイルフィールドコードを入力してください');
  const prefix = buildApiPrefix(guestId || '', false);

  const records = await fetchAllRecords(prefix, appId, query || '', setStatus);
  if (!records.length) throw new Error('対象レコードが0件です');
  const fieldMissing = records.every((rec) => !rec?.[fileFieldCode]);
  if (fieldMissing) throw new Error(`フィールド「${fileFieldCode}」が取得結果に存在しません。フィールドコードを確認してください`);

  const JSZipCtor = await loadJSZipLite();
  const zip = new JSZipCtor();
  let fileCount = 0;
  const failures: FileFailure[] = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    setStatus(`添付DL中 (${i + 1}/${records.length}${failures.length ? ` / 失敗 ${failures.length}` : ''})`);
    const files: any[] = rec?.[fileFieldCode]?.value || [];
    if (!files.length) continue;
    const recordId = String(rec.$id?.value || i + 1);
    let folderName = folderFieldCode && rec[folderFieldCode]?.value;
    if (!folderName) folderName = `Record_${recordId}`;
    const folder = zip.folder(sanitizeZipSegment(folderName, `Record_${recordId}`));
    const used = new Set<string>();
    for (const f of files) {
      const result = await downloadFileBlob(prefix, f.fileKey);
      if (result.ok === true) {
        folder.file(uniqueZipName(used, f.name || 'file.bin', f.fileKey, fileCount), result.blob);
        fileCount++;
      } else {
        failures.push({ recordId, fileName: String(f.name || ''), fileKey: String(f.fileKey || ''), reason: result.reason });
      }
    }
  }
  if (!fileCount) {
    if (failures.length) {
      throw new Error(`添付ファイルを1件も取得できませんでした（失敗 ${failures.length}件）\n${formatFileFailures(failures.slice(0, 5))}${failures.length > 5 ? '\n…' : ''}`);
    }
    setStatus('ダウンロード対象の添付がありませんでした', true);
    return;
  }
  if (failures.length) {
    zip.file('download_errors.txt', `取得できなかった添付ファイル ${failures.length}件\n${formatFileFailures(failures)}\n`);
  }
  setStatus(`ZIP生成中 (${fileCount}ファイル)`);
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipName || buildExportFilename('添付ファイル', 'zip', { appLabel: buildAppFilenameLabel(appId, '') }), zipBlob);
  if (failures.length) {
    setStatus(`添付一括DL完了: ${fileCount}ファイル（取得失敗 ${failures.length}件、詳細は download_errors.txt）`, true);
    return;
  }
  setStatus(`添付一括DL完了: ${fileCount}ファイル`);
}

// ---------------------------------------------------------------------------
// レコードバックアップ
// ---------------------------------------------------------------------------
/**
 * 軽量レコードバックアップ:
 *  - CSV（全フィールド）
 *  - 任意で添付ファイル（添付フィールド/サブテーブル内ファイル）
 *  - 任意でコメント
 *  - 任意でアプリ設定（fetchBundle）
 * を1つのZIPに格納する。フル版の plugin_config までは取らない。
 * 取得できなかった添付・コメントは manifest.json に残し、完了メッセージにも件数を出す。
 */
export async function runRecordBackupStandalone(opts, setStatus) {
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

  zip.file('records.csv', buildRecordsCsvText(records, propKeys));
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
    for (let i = 0; i < collected.length; i++) {
      const ent = collected[i];
      setStatus(`添付ファイル取得中 (${i + 1}/${collected.length}${fileFailures.length ? ` / 失敗 ${fileFailures.length}` : ''})`);
      const recordId = String(ent.rec?.$id?.value || 'unknown');
      let result = blobCache.get(ent.file.fileKey);
      if (!result) {
        result = await downloadFileBlob(prefix, ent.file.fileKey);
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
      const filePrefix = sanitizeZipSegment(String(ent.file.fileKey || '').slice(0, 12) || String(ent.fileIndex + 1));
      parts.push(`${filePrefix}_${sanitizeZipSegment(ent.file.name || 'file.bin', 'file.bin')}`);
      zip.file(parts.join('/'), result.blob);
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
    if (appNg) notes.push(`アプリ設定取得失敗 ${appNg}セクション: ${appNgSections.join(', ')}`);
    zip.file(`app_settings/app_${appId}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), appId, scopes: appScopes, bundle: settings }, null, 2));
  } else if (!includeAppSettings) {
    notes.push('アプリ設定未取得');
  }

  zip.file('manifest.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    appId,
    query: query || '',
    recordCount: records.length,
    fileCount,
    fileFailures,
    commentCount,
    commentFailures,
    appSettings: { ok: appOk, ng: appNg, ngSections: appNgSections, scopes: appScopes || [] },
    notes
  }, null, 2));

  setStatus(`ZIP生成中 (${records.length}件 / 添付 ${fileCount} / コメント ${commentCount})`);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipName || buildExportFilename('レコードバックアップ', 'zip', { appLabel: buildAppFilenameLabel(appId, '') }), blob);
  const failureCount = fileFailures.length + commentFailures.length + appNg;
  const failureNote = failureCount
    ? `（取得失敗: 添付 ${fileFailures.length} / コメント ${commentFailures.length} / 設定 ${appNg} → manifest.json 参照）`
    : '';
  setStatus(`バックアップ完了: ${records.length}件 / 添付 ${fileCount} / コメント ${commentCount}${failureNote}`, failureCount > 0);
}

// ---------------------------------------------------------------------------
// 補助情報の取得
// ---------------------------------------------------------------------------
/** ステータス管理（アクション/状態リスト）を取得 — シミュレーション/プルダウン用 */
export async function runLoadStatusActionsStandalone(opts, setStatus) {
  const { appId, guestId } = opts;
  if (!appId) throw new Error('アプリIDを入力してください');
  const prefix = buildApiPrefix(guestId || '', false);
  setStatus('プロセス管理情報を取得中...');
  const res = await apiGet(prefix, '/app/status.json', { app: appId });
  if (!res.enable) {
    setStatus('プロセス管理は無効です', true);
    return { enabled: false, states: [], actions: [] };
  }
  const states = Object.keys(res.states || ({} as any));
  const actions = (res.actions || []).map((a: any) => ({ name: a.name, from: a.from, to: a.to }));
  setStatus(`プロセス管理: 状態 ${states.length}件 / アクション ${actions.length}件`);
  return { enabled: true, states, actions };
}

/** 一覧（views）を取得 — クエリ補助用 */
export async function runLoadViewsStandalone(opts, setStatus) {
  const { appId, guestId } = opts;
  if (!appId) throw new Error('アプリIDを入力してください');
  const prefix = buildApiPrefix(guestId || '', false);
  setStatus('一覧情報を取得中...');
  const resp = await apiGet(prefix, '/app/views.json', { app: appId });
  const views = (Object.entries(resp.views || ({} as any)) as Array<[string, any]>)
    .map(([name, v]) => ({ name, id: String(v.id), filter: String(v.filterCond || ''), type: String(v.type), index: Number(v.index || 0) }))
    .filter((v) => v.type === 'LIST')
    .sort((a, b) => a.index - b.index);
  setStatus(`一覧: ${views.length}件`);
  return views;
}
