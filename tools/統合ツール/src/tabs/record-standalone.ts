'use strict';

import { EXTERNAL_LIBRARIES } from '../constants.js';
import { esc } from '../utils.js';
import { apiGet, apiPost, apiPut, buildApiPrefix } from '../api.js';

async function fetchAllRecords(prefix, app, query, setStatus) {
  let all = [];
  let offset = 0;
  while (true) {
    setStatus(`レコード取得中... (${all.length}件取得済)`);
    const q = query
      ? `${query} order by $id asc limit 500 offset ${offset}`
      : `$id > 0 order by $id asc limit 500 offset ${offset}`;
    const resp = await apiGet(prefix, '/records.json', { app, query: q });
    const batch = resp.records || [];
    all = all.concat(batch);
    if (batch.length < 500) break;
    offset += 500;
  }
  return all;
}

async function fetchRecordIds(prefix, app, query, setStatus) {
  const ids = [];
  let offset = 0;
  while (true) {
    setStatus(`対象レコード取得中... (${ids.length}件)`);
    let q = query ? `${query} ` : '';
    q += `order by $id asc limit 500 offset ${offset}`;
    const resp = await apiGet(prefix, '/records.json', { app, query: q, fields: ['$id'] });
    const batch = resp.records || [];
    if (!batch.length) break;
    batch.forEach((r) => ids.push(Number(r.$id.value)));
    if (batch.length < 500) break;
    offset += 500;
  }
  return ids;
}

export async function runCsvExportStandalone(opts, setStatus) {
  const { appId, guestId, query, filename } = opts;
  if (!appId) throw new Error('アプリIDを入力してください');
  const prefix = buildApiPrefix(guestId || '', false);

  setStatus('フィールド情報取得中...');
  const fields = await apiGet(prefix, '/app/form/fields.json', { app: appId });
  const propKeys = Object.keys(fields.properties || ({} as any));
  if (!propKeys.length) throw new Error('出力できるフィールドがありません');

  const records = await fetchAllRecords(prefix, appId, query || '', setStatus);
  if (!records.length) throw new Error('出力するレコードがありません');

  setStatus(`CSV生成中... (${records.length}件)`);
  const esc = (val) => {
    const s = String(val == null ? '' : val);
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const extractValue = (rec, code) => {
    const f = rec[code];
    if (!f) return '';
    if (['USER_SELECT', 'ORGANIZATION_SELECT', 'GROUP_SELECT'].includes(f.type)) return (f.value || []).map(v => v.code || v.name).join(',');
    if (['CHECK_BOX', 'MULTI_SELECT'].includes(f.type)) return (f.value || []).join(',');
    if (f.type === 'FILE') return (f.value || []).map(file => file.name).join(',');
    if (f.type === 'SUBTABLE') return (f.value || []).length + '行';
    if (typeof f.value === 'object' && f.value !== null) return JSON.stringify(f.value);
    return f.value;
  };

  const lines = [propKeys.map(esc).join(',')];
  for (const rec of records) lines.push(propKeys.map(k => esc(extractValue(rec, k))).join(','));
  const csvStr = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || 'records.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  setStatus(`CSV出力完了 (${records.length}件)`);
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

  const records: any[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length === 1 && rows[i][0] === '') continue;
    const rec: Record<string, any> = {};
    for (let j = 0; j < header.length; j++) {
      if (!header[j] || header[j] === '$id') continue;
      rec[header[j]] = { value: rows[i][j] !== undefined ? rows[i][j] : '' };
    }
    records.push(rec);
  }
  if (!records.length) throw new Error('登録するデータがありません');
  if (!confirm(`CSVから ${records.length}件 のレコードをインポートしますか？`)) return;

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
  if (!confirm(`${ids.length}件にアクション「${action}」を実行しますか？`)) return;

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
  if (!confirm(`${records.length}件を比較先(${targetAppId})へコピーしますか？`)) return;

  const systemTypes = new Set(['RECORD_NUMBER', 'CREATOR', 'CREATED_TIME', 'MODIFIER', 'UPDATED_TIME', 'STATUS', 'STATUS_ASSIGNEE', 'CALC']);
  const systemFields = new Set(['$id', '$revision', '作成者', '作成日時', '更新者', '更新日時', 'レコード番号', 'ステータス', '作業者']);
  const clean = records.map((rec) => {
    const out = {};
    for (const [k, v] of Object.entries(rec) as Array<[string, any]>) {
      if (systemFields.has(k) || systemTypes.has(v.type)) continue;
      if (v.type === 'SUBTABLE') {
        out[k] = { value: v.value.map((sr) => { const c = {}; for (const [sk, sv] of Object.entries(sr.value) as Array<[string, any]>) c[sk] = { value: sv.value }; return { value: c }; }) };
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
