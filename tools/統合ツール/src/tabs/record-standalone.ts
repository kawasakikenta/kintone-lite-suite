'use strict';

import { downloadBlob, kusConfirm, buildExportFilename, buildAppFilenameLabel } from '../utils.js';
import { apiGet, apiPost, apiPut, buildApiPrefix, fetchBundle } from '../api.js';

const JSZIP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

function loadJSZipLite(): Promise<any> {
  const w = window as any;
  if (w.JSZip) return Promise.resolve(w.JSZip);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${JSZIP_CDN}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).JSZip));
      existing.addEventListener('error', () => reject(new Error('JSZipの読み込みに失敗')));
      return;
    }
    const s = document.createElement('script');
    s.src = JSZIP_CDN;
    s.onload = () => resolve((window as any).JSZip);
    s.onerror = () => reject(new Error('JSZipの読み込みに失敗'));
    document.head.appendChild(s);
  });
}

function sanitizeZipSegment(value: any, fallback = 'item'): string {
  const cleaned = String(value == null ? '' : value)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\u0000-\u001f]/g, '')
    .trim();
  return cleaned || fallback;
}

function uniqueZipName(used: Set<string>, raw: string, fileKey: string, idx: number): string {
  const safeName = sanitizeZipSegment(raw || 'file.bin', 'file.bin');
  const safePrefix = sanitizeZipSegment(String(fileKey || '').slice(0, 12) || String(idx + 1), 'file');
  const base = `${safePrefix}_${safeName}`;
  let cand = base;
  let n = 2;
  while (used.has(cand)) {
    const dot = base.lastIndexOf('.');
    if (dot > 0) cand = `${base.slice(0, dot)}_${n}${base.slice(dot)}`;
    else cand = `${base}_${n}`;
    n++;
  }
  used.add(cand);
  return cand;
}

async function downloadFileBlob(prefix: string, fileKey: string): Promise<Blob | null> {
  const url = prefix + '/file.json?fileKey=' + encodeURIComponent(fileKey);
  const headers = { 'X-Requested-With': 'XMLHttpRequest' };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(url, { method: 'GET', headers });
      if (resp.status === 403) return null;
      if (!resp.ok) throw new Error('ダウンロード失敗: ' + resp.status);
      return await resp.blob();
    } catch (e) {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
    }
  }
  return null;
}

function hasOrderByClause(query) {
  return /\border\s+by\b/i.test(String(query || ''));
}

function hasPagingClause(query) {
  return /\blimit\s+\d+/i.test(String(query || '')) || /\boffset\s+\d+/i.test(String(query || ''));
}

function buildPagedQuery(query, offset) {
  const base = String(query || '').trim();
  if (hasPagingClause(base)) {
    throw new Error('クエリ内の limit/offset はページング動作と競合します。limit/offset を取り除いて再実行してください。');
  }
  const parts = [];
  if (base) parts.push(base);
  if (!hasOrderByClause(base)) parts.push('order by $id asc');
  parts.push('limit 500');
  parts.push(`offset ${Number(offset || 0)}`);
  return parts.join(' ');
}

function buildKeysetQuery(query, lastRecordId) {
  const base = String(query || '').trim();
  if (hasPagingClause(base)) {
    throw new Error('クエリ内の limit/offset はページング動作と競合します。limit/offset を取り除いて再実行してください。');
  }
  const idCond = `$id > ${Number(lastRecordId || 0)}`;
  if (!base) return `${idCond} order by $id asc limit 500`;
  if (hasOrderByClause(base)) return null;
  return `(${base}) and ${idCond} order by $id asc limit 500`;
}

function csvEscape(val) {
  const s = String(val == null ? '' : val);
  return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function extractRecordCsvValue(rec, code) {
  const f = rec[code];
  if (!f) return '';
  if (['USER_SELECT', 'ORGANIZATION_SELECT', 'GROUP_SELECT'].includes(f.type)) return (f.value || []).map(v => v.code || v.name).join(',');
  if (['CHECK_BOX', 'MULTI_SELECT'].includes(f.type)) return (f.value || []).join(',');
  if (f.type === 'FILE') return (f.value || []).map(file => file.name).join(',');
  if (f.type === 'SUBTABLE') return (f.value || []).length + '行';
  if (typeof f.value === 'object' && f.value !== null) return JSON.stringify(f.value);
  return f.value;
}

function buildRecordsCsvText(records, propKeys) {
  const lines = [propKeys.map(csvEscape).join(',')];
  for (const rec of records) lines.push(propKeys.map(k => csvEscape(extractRecordCsvValue(rec, k))).join(','));
  return '\uFEFF' + lines.join('\n');
}

async function buildCsvExportForApp(appId, guestId, query, setStatus) {
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

async function fetchAllRecords(prefix, app, query, setStatus) {
  let all = [];
  let offset = 0;
  let lastRecordId = 0;
  while (true) {
    setStatus(`レコード取得中... (${all.length}件取得済)`);
    const q = buildKeysetQuery(query, lastRecordId) || buildPagedQuery(query, offset);
    const resp = await apiGet(prefix, '/records.json', { app, query: q });
    const batch = resp.records || [];
    all = all.concat(batch);
    if (batch.length < 500) break;
    lastRecordId = Number(batch[batch.length - 1]?.$id?.value || lastRecordId);
    offset += 500;
  }
  return all;
}

async function fetchRecordIds(prefix, app, query, setStatus) {
  const ids = [];
  let offset = 0;
  let lastRecordId = 0;
  while (true) {
    setStatus(`対象レコード取得中... (${ids.length}件)`);
    const q = buildKeysetQuery(query, lastRecordId) || buildPagedQuery(query, offset);
    const resp = await apiGet(prefix, '/records.json', { app, query: q, fields: ['$id'] });
    const batch = resp.records || [];
    if (!batch.length) break;
    batch.forEach((r) => ids.push(Number(r.$id.value)));
    if (batch.length < 500) break;
    lastRecordId = Number(batch[batch.length - 1]?.$id?.value || lastRecordId);
    offset += 500;
  }
  return ids;
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

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    setStatus(`CSV出力中... (${i + 1}/${apps.length})`);
    const result = await buildCsvExportForApp(app.appId, app.guestId || '', query, setStatus);
    totalRecords += result.recordCount;
    const label = buildAppFilenameLabel(result.appId, app.appName || '');
    const baseName = buildExportFilename('レコード', 'csv', { appLabel: label }).replace(/\.csv$/i, '');
    const guestSuffix = result.guestId ? `_guest${sanitizeZipSegment(result.guestId)}` : '';
    const entryName = uniqueZipName(used, `${baseName}${guestSuffix}.csv`, result.appId, i);
    zip.file(entryName, result.csvText);
  }

  const manifest = [
    'kintone CSV 一括出力マニフェスト',
    `出力日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
    `対象アプリ数: ${apps.length}`,
    `総レコード数: ${totalRecords}`,
    `共通クエリ: ${query || '(なし)'}`,
    '',
    ...apps.map((a, i) => `${i + 1}. App ${a.appId}${a.guestId ? ` / Guest ${a.guestId}` : ''}${a.appName ? ` / ${a.appName}` : ''}`)
  ].join('\n');
  zip.file('manifest.txt', manifest);

  setStatus(`ZIP生成中... (${apps.length}アプリ / ${totalRecords}件)`);
  const blob = await zip.generateAsync({ type: 'blob' });
  const zipName = filename || buildExportFilename('CSV出力', 'zip');
  downloadBlob(zipName.toLowerCase().endsWith('.zip') ? zipName : `${zipName}.zip`, blob);
  setStatus(`CSV一括出力完了 (${apps.length}アプリ / ${totalRecords}件)`);
}

const CSV_IMPORT_UNSUPPORTED_FIELD_TYPES = new Set([
  'RECORD_NUMBER', 'CREATOR', 'CREATED_TIME', 'MODIFIER', 'UPDATED_TIME',
  'STATUS', 'STATUS_ASSIGNEE', 'CALC', 'CATEGORY', '__ID__', '__REVISION__',
  'FILE', 'SUBTABLE', 'REFERENCE_TABLE', 'LABEL', 'HR', 'SPACER'
]);

function splitCsvListValue(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return [];
  return text.split(',').map((item) => item.trim()).filter(Boolean);
}

function coerceCsvImportValue(rawValue, fieldDef) {
  const type = String(fieldDef?.type || '');
  if (type === 'CHECK_BOX' || type === 'MULTI_SELECT') return splitCsvListValue(rawValue);
  if (type === 'USER_SELECT' || type === 'ORGANIZATION_SELECT' || type === 'GROUP_SELECT') {
    return splitCsvListValue(rawValue).map((code) => ({ code }));
  }
  if (type === 'NUMBER') return String(rawValue == null ? '' : rawValue).trim();
  return rawValue;
}

function validateCsvImportHeader(header, properties) {
  if (header.includes('$id')) throw new Error('CSV内にシステムフィールド（$idなど）が含まれています。インポート時は除外してください。');
  const unknown = [];
  const unsupported = [];
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

  const parseCsv = (csv: string): string[][] => {
    const rows: string[][] = [];
    let current: string[] = [], cell = '', inQ = false;
    for (let i = 0; i < csv.length; i++) {
      const c = csv[i], n = csv[i + 1];
      if (inQ) { if (c === '"') { if (n === '"') { cell += '"'; i++; } else inQ = false; } else cell += c; }
      else { if (c === '"') inQ = true; else if (c === ',') { current.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && n === '\n') i++; current.push(cell); rows.push(current); current = []; cell = ''; } else cell += c; }
    }
    if (cell || current.length) { current.push(cell); rows.push(current); }
    return rows;
  };

  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
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
  if (!kusConfirm(`CSVから ${records.length}件 のレコードをインポートしますか？`)) return;

  let ok = 0;
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    setStatus(`インポート中... (${i + 1}～${i + batch.length} / ${records.length}件)`);
    await apiPost(prefix, '/records.json', { app: appId, records: batch });
    ok += batch.length;
  }
  setStatus(`インポート完了: ${ok}件`);
}

export async function runBatchProcessStandalone(opts, setStatus) {
  const { appId, guestId, query, action, assignee } = opts;
  if (!appId) throw new Error('アプリIDを入力してください');
  if (!action) throw new Error('アクション名を入力してください');
  const prefix = buildApiPrefix(guestId || '', false);

  const ids = await fetchRecordIds(prefix, appId, query || '', setStatus);
  if (!ids.length) throw new Error('処理対象のレコードが0件です');
  if (!kusConfirm(`${ids.length}件にアクション「${action}」を実行しますか？`)) return;

  let ok = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const body = { app: appId, records: batch.map((id: any) => { const r: any = { id, action }; if (assignee) r.assignee = assignee; return r; }) };
    await apiPut(prefix, '/records/status.json', body);
    ok += batch.length;
    setStatus(`ステータス更新中... ${ok}/${ids.length}件`);
  }
  setStatus(`ステータス一括更新完了 (${ok}件)`);
}

export async function runRecordCopyStandalone(opts, setStatus) {
  const { sourceAppId, sourceGuestId, targetAppId, targetGuestId, query } = opts;
  if (!sourceAppId || !targetAppId) throw new Error('比較元と比較先のアプリIDを指定してください');
  const srcPrefix = buildApiPrefix(sourceGuestId || '', false);
  const tgtPrefix = buildApiPrefix(targetGuestId || '', false);

  const records = await fetchAllRecords(srcPrefix, sourceAppId, query || '', setStatus);
  if (!records.length) { setStatus('コピー対象のレコードがありません'); return; }
  if (!kusConfirm(`${records.length}件を比較先(${targetAppId})へコピーしますか？`)) return;

  const systemTypes = new Set(['RECORD_NUMBER', 'CREATOR', 'CREATED_TIME', 'MODIFIER', 'UPDATED_TIME', 'STATUS', 'STATUS_ASSIGNEE', 'CALC', 'CATEGORY', '__ID__', '__REVISION__']);
  const systemFields = new Set(['$id', '$revision', '作成者', '作成日時', '更新者', '更新日時', 'レコード番号', 'ステータス', '作業者']);
  const clean = records.map((rec) => {
    const out = {};
    for (const [k, v] of Object.entries(rec) as Array<[string, any]>) {
      if (systemFields.has(k) || systemTypes.has(v.type)) continue;
      if (v.type === 'SUBTABLE') {
        const rows = Array.isArray(v.value) ? v.value : [];
        out[k] = { value: rows.map((sr) => {
          const c = {};
          const inner = sr && typeof sr === 'object' && sr.value && typeof sr.value === 'object' ? sr.value : {};
          for (const [sk, sv] of Object.entries(inner) as Array<[string, any]>) {
            if (systemFields.has(sk) || systemTypes.has(sv.type) || sv.type === 'FILE') continue;
            c[sk] = { value: sv.value };
          }
          return { value: c };
        }) };
      } else if (v.type === 'FILE') {
        continue;
      } else {
        out[k] = { value: v.value };
      }
    }
    return out;
  });

  let ok = 0;
  for (let i = 0; i < clean.length; i += 100) {
    const batch = clean.slice(i, i + 100);
    setStatus(`コピー中... ${i + 1}～${i + batch.length} / ${clean.length}件`);
    await apiPost(tgtPrefix, '/records.json', { app: targetAppId, records: batch });
    ok += batch.length;
  }
  setStatus(`レコードコピー完了: ${ok}件`);
}

/** 添付ファイル一括ダウンロード（条件で絞り、指定したファイルフィールドの中身を ZIP 化） */
export async function runAttachmentDownloadStandalone(opts, setStatus) {
  const { appId, guestId, query, fileFieldCode, folderFieldCode, zipName } = opts;
  if (!appId) throw new Error('アプリIDを入力してください');
  if (!fileFieldCode) throw new Error('ファイルフィールドコードを入力してください');
  const prefix = buildApiPrefix(guestId || '', false);

  const records = await fetchAllRecords(prefix, appId, query || '', setStatus);
  if (!records.length) throw new Error('対象レコードが0件です');

  const JSZipCtor = await loadJSZipLite();
  const zip = new JSZipCtor();
  let fileCount = 0;

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    setStatus(`添付DL中 (${i + 1}/${records.length})`);
    const files: any[] = rec?.[fileFieldCode]?.value || [];
    if (!files.length) continue;
    let folderName = folderFieldCode && rec[folderFieldCode]?.value;
    if (!folderName) folderName = `Record_${rec.$id?.value || i + 1}`;
    const folder = zip.folder(sanitizeZipSegment(folderName, `Record_${rec.$id?.value || i + 1}`));
    const used = new Set<string>();
    for (const f of files) {
      const blob = await downloadFileBlob(prefix, f.fileKey);
      if (blob) {
        folder.file(uniqueZipName(used, f.name || 'file.bin', f.fileKey, fileCount), blob);
        fileCount++;
      }
    }
  }
  if (!fileCount) {
    setStatus('ダウンロード対象の添付がありませんでした', true);
    return;
  }
  setStatus(`ZIP生成中 (${fileCount}ファイル)`);
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipName || buildExportFilename('添付ファイル', 'zip', { appLabel: buildAppFilenameLabel(appId, '') }), zipBlob);
  setStatus(`添付一括DL完了: ${fileCount}ファイル`);
}

/**
 * 軽量レコードバックアップ:
 *  - CSV（全フィールド）
 *  - 任意で添付ファイル（添付フィールド/サブテーブル内ファイル）
 *  - 任意でコメント
 *  - 任意でアプリ設定（fetchBundle）
 * を1つのZIPに格納する。フル版の plugin_config までは取らない。
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

  // CSV
  const esc = (v: any) => {
    const s = String(v == null ? '' : v);
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const extract = (rec: any, code: string) => {
    const f = rec[code];
    if (!f) return '';
    if (['USER_SELECT', 'ORGANIZATION_SELECT', 'GROUP_SELECT'].includes(f.type)) return (f.value || []).map((v: any) => v.code || v.name).join(',');
    if (['CHECK_BOX', 'MULTI_SELECT'].includes(f.type)) return (f.value || []).join(',');
    if (f.type === 'FILE') return (f.value || []).map((file: any) => file.name).join(',');
    if (f.type === 'SUBTABLE') return (f.value || []).length + '行';
    if (typeof f.value === 'object' && f.value !== null) return JSON.stringify(f.value);
    return f.value;
  };
  const lines = [propKeys.map(esc).join(',')];
  for (const rec of records) lines.push(propKeys.map((k) => esc(extract(rec, k))).join(','));
  zip.file('records.csv', '﻿' + lines.join('\n'));

  // JSON (raw)
  zip.file('records.json', JSON.stringify({ generatedAt: new Date().toISOString(), appId, recordCount: records.length, records }, null, 2));

  let fileCount = 0;
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
    const blobCache = new Map<string, Blob | null>();
    for (let i = 0; i < collected.length; i++) {
      const ent = collected[i];
      setStatus(`添付ファイル取得中 (${i + 1}/${collected.length})`);
      let blob = blobCache.get(ent.file.fileKey);
      if (blob === undefined) {
        blob = await downloadFileBlob(prefix, ent.file.fileKey);
        blobCache.set(ent.file.fileKey, blob || null);
      }
      if (!blob) continue;
      const recordId = String(ent.rec?.$id?.value || 'unknown');
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
      zip.file(parts.join('/'), blob);
      fileCount++;
    }
  } else {
    notes.push('添付ファイル未取得');
  }

  let commentCount = 0;
  if (includeComments) {
    const out: any[] = [];
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const recordId = String(rec?.$id?.value || '').trim();
      if (!recordId) continue;
      setStatus(`コメント取得中 (${i + 1}/${records.length})`);
      try {
        const comments: any[] = [];
        let offset = 0;
        const limit = 10;
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
        notes.push('コメント取得失敗で中断');
        break;
      }
    }
    zip.file('comments.json', JSON.stringify({ generatedAt: new Date().toISOString(), appId, commentCount, records: out }, null, 2));
  } else {
    notes.push('コメント未取得');
  }

  let appOk = 0;
  let appNg = 0;
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
      if (sec && sec._fetchError) appNg++;
      else appOk++;
    }
    zip.file(`app_settings/app_${appId}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), appId, scopes: appScopes, bundle: settings }, null, 2));
  } else if (!includeAppSettings) {
    notes.push('アプリ設定未取得');
  }

  zip.file('manifest.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    appId,
    recordCount: records.length,
    fileCount,
    commentCount,
    appSettings: { ok: appOk, ng: appNg, scopes: appScopes || [] },
    notes
  }, null, 2));

  setStatus(`ZIP生成中 (${records.length}件 / 添付 ${fileCount} / コメント ${commentCount})`);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipName || buildExportFilename('レコードバックアップ', 'zip', { appLabel: buildAppFilenameLabel(appId, '') }), blob);
  setStatus(`バックアップ完了: ${records.length}件 / 添付 ${fileCount} / コメント ${commentCount}`);
}

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
