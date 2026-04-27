'use strict';

import { SECTION_DEFS, EXTERNAL_LIBRARIES } from '../constants.js';
import { state, ui } from '../state.js';
import { esc, nowStamp, downloadBlob, showToast, selectedScopeKeys, kusConfirm } from '../utils.js';
import { confirmDestructive, bumpSessionMetric } from '../ui/psychology.js';
import { apiGet, apiPut, apiPost, buildApiPrefix, fetchBundle } from '../api.js';
import { setStatus, setBusy, renderBundleState } from '../ui/components.js';
import { commonParams } from './diff.js';
import { getToolDocument } from '../ui/dialog.js';

export function getSideApiPrefix(isSource, preview) {
  const c = commonParams();
  const side = isSource ? c.source : c.target;
  return buildApiPrefix(side.guestId, !!preview);
}

export async function loadViewsForSelect(selectId: string, inputId: string) {
  const tApp = (getToolDocument().getElementById('u_targetApp') as HTMLInputElement).value.trim();
  if (!tApp) throw new Error('比較先アプリIDを設定してください。');
  const prefix = getSideApiPrefix(false, false);
  const resp = await apiGet(prefix, '/app/views.json', { app: tApp });
  const views = (Object.entries(resp.views) as Array<[string, any]>)
    .map(([name, v]) => ({ name, ...(v as any) }))
    .filter((v: any) => v.type === 'LIST')
    .sort((a: any, b: any) => Number(a.index) - Number(b.index));

  const sel = getToolDocument().getElementById(selectId) as HTMLSelectElement | null;
  if (!sel) return;
  sel.innerHTML = '<option value="">-- 一覧を選択 --</option>';
  for (const v of views) {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.dataset.q = encodeURIComponent(v.filterCond || '');
    opt.textContent = v.name;
    sel.appendChild(opt);
  }
  sel.style.display = 'block';
  sel.onchange = () => {
    const o = sel.options[sel.selectedIndex];
    if (o && o.value) {
      (getToolDocument().getElementById(inputId) as HTMLInputElement).value = decodeURIComponent(o.dataset.q || '');
    }
  };
  setStatus('比較先アプリの一覧リストを取得しました');
}

export async function getRecordIdsByQuery(app, query, isSource) {
  const prefix = getSideApiPrefix(isSource, false);
  const ids = [];
  let offset = 0;
  while (true) {
    let q = query ? `${query} ` : '';
    q += `order by $id asc limit 500 offset ${offset}`;
    const resp = await apiGet(prefix, '/records.json', { app, query: q, fields: ['$id'] });
    const records = resp.records || [];
    if (records.length === 0) break;
    records.forEach(r => ids.push(Number(r.$id.value)));
    if (records.length < 500) break;
    offset += 500;
  }
  return ids;
}

export async function getFullRecordsByQuery(app, query, isSource) {
  const prefix = getSideApiPrefix(isSource, false);
  let allRecords = [];
  let offset = 0;
  while (true) {
    let q = query ? `${query} ` : '';
    q += `limit 500 offset ${offset}`;
    const resp = await apiGet(prefix, '/records.json', { app, query: q });
    const records = resp.records || [];
    if (records.length === 0) break;
    allRecords = allRecords.concat(records);
    if (records.length < 500) break;
    offset += 500;
  }
  return allRecords;
}

const chunkArray = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export async function runBatchProcess() {
  const tApp = (getToolDocument().getElementById('u_targetApp') as HTMLInputElement).value.trim();
  if (!tApp) throw new Error('比較先アプリIDを設定してください。');
  const query = (getToolDocument().getElementById('u_batchProcView') as HTMLInputElement).value;
  const action = (getToolDocument().getElementById('u_batchProcAction') as HTMLInputElement).value.trim();
  const assignee = (getToolDocument().getElementById('u_batchProcAssignee') as HTMLInputElement).value.trim() || null;
  if (!action) throw new Error('アクション名を入力してください。');

  setStatus('対象レコードを取得中...');
  const ids = await getRecordIdsByQuery(tApp, query, false);
  if (ids.length === 0) throw new Error('処理対象のレコードが0件です。');

  if (!(await confirmDestructive({
    title: `ステータス一括更新の最終確認`,
    body: `比較先アプリ ${tApp} の ${ids.length} 件のレコードに対し、アクション「${action}」を実行します。\n\nこの処理は元に戻せません。`,
    keyword: tApp,
    okLabel: 'ステータスを更新',
    riskTone: 'danger'
  }))) return;
  bumpSessionMetric('recordDelete', 0);

  setStatus('ステータス一括更新を開始...');
  const prefix = getSideApiPrefix(false, false);
  const batches = chunkArray(ids, 100);

  let okCount = 0;
  for (let i = 0; i < batches.length; i++) {
    const batchIds = batches[i];
    const body = {
      app: tApp,
      records: batchIds.map((id: any) => {
        const r: any = { id, action };
        if (assignee) r.assignee = assignee;
        return r;
      })
    };
    await apiPut(prefix, '/records/status.json', body);
    okCount += batchIds.length;
    setStatus(`進捗: ${okCount}/${ids.length}件 完了...`);
    await new Promise(r => setTimeout(r, 150));
  }
  setStatus(`ステータス一括更新が完了しました（全${okCount}件）`, false);
}

export async function loadJSZip() {
  if (typeof globalThis.JSZip !== 'undefined') return globalThis.JSZip;
  setStatus('JSZipを動的ロード中...');
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = EXTERNAL_LIBRARIES.jszip.cdnUrl;
    script.onload = () => {
      if (typeof globalThis.JSZip === 'undefined') {
        reject(new Error('JSZipのロード後もグローバル変数が見つかりません'));
        return;
      }
      setStatus('JSZipのロード完了');
      resolve(globalThis.JSZip);
    };
    script.onerror = () => { reject(new Error('JSZipの読み込みに失敗しました')); };
    document.head.appendChild(script);
  });
}

async function downloadTargetFile(fileKey) {
  const prefix = getSideApiPrefix(false, false);
  const url = prefix + '/file.json?fileKey=' + encodeURIComponent(fileKey);
  const headers = { 'X-Requested-With': 'XMLHttpRequest' };

  const resp = await fetch(url, { method: 'GET', headers });
  if (resp.status === 403) return null;
  return await resp.blob();
}

export async function runBatchFileDownload() {
  const tApp = (getToolDocument().getElementById('u_targetApp') as HTMLInputElement).value.trim();
  if (!tApp) throw new Error('比較先アプリIDを設定してください。');
  const query = (getToolDocument().getElementById('u_batchDlView') as HTMLInputElement).value;
  const fileCode = (getToolDocument().getElementById('u_batchDlFileCode') as HTMLInputElement).value.trim();
  const folderCode = (getToolDocument().getElementById('u_batchDlFolderCode') as HTMLInputElement).value.trim();
  const zipName = (getToolDocument().getElementById('u_batchDlZipName') as HTMLInputElement).value.trim() || 'download.zip';

  if (!fileCode) throw new Error('ファイルフィールドコードを入力してください。');

  setStatus('対象レコードを取得中...');
  const records = await getFullRecordsByQuery(tApp, query, false);
  if (records.length === 0) throw new Error('処理対象のレコードが0件です。');

  const JSZipCtor = await loadJSZip();
  const zip = new JSZipCtor();
  let fileCount = 0;

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    setStatus(`ファイルダウンロード中 (レコード ${i + 1}/${records.length})...`);

    const fileList = rec[fileCode]?.value || [];
    if (fileList.length > 0) {
      let folderName = folderCode && rec[folderCode] ? rec[folderCode].value : '';
      if (!folderName) folderName = `Record_${rec.$id.value}`;

      const recordFolder = zip.folder(folderName);
      for (const f of fileList) {
        const blob = await downloadTargetFile(f.fileKey);
        if (blob) {
          recordFolder.file(f.name, blob);
          fileCount++;
        }
      }
    }
  }

  if (fileCount === 0) {
    setStatus('ダウンロード対象が見つかりませんでした。', true);
    return;
  }

  setStatus(`ZIP圧縮中 (計${fileCount}ファイル)...`);
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  const u = URL.createObjectURL(zipBlob);
  a.href = u;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(u); }, 100);
  setStatus(`添付ファイル一括DL完了 (${fileCount}ファイル)`);
}

export async function getAllAppsInSpace(isSource) {
  const prefix = getSideApiPrefix(isSource, false);
  let allApps = [];
  let offset = 0;
  while (true) {
    const resp = await apiGet(prefix, '/apps.json', { limit: 100, offset });
    const apps = resp.apps || [];
    allApps = allApps.concat(apps);
    if (apps.length < 100) break;
    offset += 100;
    await new Promise(r => setTimeout(r, 200));
  }
  return allApps;
}

export async function downloadBlobWithRetry(fileKey, isSource, guestSpaceId) {
  let prefix = getSideApiPrefix(isSource, false);
  if (guestSpaceId) {
    prefix = `/k/guest/${guestSpaceId}/v1`;
  }
  const url = prefix + '/file.json?fileKey=' + encodeURIComponent(fileKey);
  const headers = { 'X-Requested-With': 'XMLHttpRequest' };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(url, { method: 'GET', headers });
      if (resp.status === 403) return null;
      if (!resp.ok) throw new Error('Download failed: ' + resp.status);
      return await resp.blob();
    } catch (e) {
      console.warn('File download failed, retrying...', e);
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
}

async function fetchFieldDefinitionsForExport(prefix, appId) {
  const fields = await apiGet(prefix, '/app/form/fields.json', { app: appId });
  const properties = fields?.properties || ({} as any);
  const propKeys = Object.keys(properties);
  if (!propKeys.length) throw new Error('出力できるフィールドがありません');
  return { fields, properties, propKeys };
}

async function fetchAllRecordsForExport(prefix, appId, condition) {
  let allRecords = [];
  let lastRecordId = '0';
  const limit = 500;
  const baseQuery = String(condition || '').trim();
  const queryHasOrder = baseQuery.toLowerCase().includes('order by');
  const queryHasLimit = baseQuery.toLowerCase().includes('limit');

  if (queryHasLimit) {
    const resp = await apiGet(prefix, '/records.json', { app: appId, query: baseQuery });
    return resp.records || [];
  }

  while (true) {
    setBusy(true, `レコード取得中... (${allRecords.length}件取得済)`);
    let loopQuery = '';
    if (baseQuery) {
      loopQuery = `${baseQuery} ${queryHasOrder ? '' : 'order by $id asc'} limit ${limit} offset ${allRecords.length}`;
    } else {
      loopQuery = `$id > ${lastRecordId} order by $id asc limit ${limit}`;
    }

    const resp = await apiGet(prefix, '/records.json', { app: appId, query: loopQuery });
    const batch = resp.records || [];
    allRecords = allRecords.concat(batch);
    if (batch.length < limit) break;
    lastRecordId = batch[batch.length - 1].$id.value;
  }

  return allRecords;
}

function escapeCsvCell(val) {
  const s = String(val == null ? '' : val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function extractCsvFieldValue(rec, code) {
  const field = rec[code];
  if (!field) return '';
  if (field.type === 'USER_SELECT' || field.type === 'ORGANIZATION_SELECT' || field.type === 'GROUP_SELECT') {
    return (field.value || []).map(v => v.code || v.name).join(',');
  }
  if (field.type === 'CHECK_BOX' || field.type === 'MULTI_SELECT') {
    return (field.value || []).join(',');
  }
  if (field.type === 'FILE') {
    return (field.value || []).map(file => file.name).join(',');
  }
  if (field.type === 'SUBTABLE') {
    return (field.value || []).length + '行';
  }
  if (typeof field.value === 'object' && field.value !== null) {
    return JSON.stringify(field.value);
  }
  return field.value;
}

function buildRecordsCsvString(records, propKeys) {
  const lines = [];
  lines.push(propKeys.map(escapeCsvCell).join(','));
  for (const rec of records) {
    lines.push(propKeys.map(key => escapeCsvCell(extractCsvFieldValue(rec, key))).join(','));
  }
  return '\uFEFF' + lines.join('\n');
}

function sanitizeZipPathSegment(value, fallback = 'item') {
  const cleaned = String(value == null ? '' : value)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\u0000-\u001f]/g, '')
    .trim();
  return cleaned || fallback;
}

function getRecordNumberValue(record: any): string {
  const match: any = Object.values(record || ({} as any)).find((field: any) => field?.type === 'RECORD_NUMBER');
  return String(match?.value || record?.$id?.value || '');
}

function collectRecordFileEntries(record: any) {
  const entries: any[] = [];
  const recordId = String(record?.$id?.value || '').trim();
  const recordNumber = getRecordNumberValue(record);
  Object.entries(record || ({} as any)).forEach(([fieldCode, field]: [string, any]) => {
    if (!field || typeof field !== 'object') return;
    if (field.type === 'FILE') {
      (field.value || []).forEach((file: any, fileIndex: number) => {
        entries.push({
          recordId,
          recordNumber,
          fieldCode,
          fileIndex,
          fileKey: String(file?.fileKey || ''),
          name: String(file?.name || ''),
          size: file?.size != null ? Number(file.size) : null,
          contentType: String(file?.contentType || '')
        });
      });
      return;
    }
    if (field.type !== 'SUBTABLE') return;
    (field.value || []).forEach((row: any, rowIndex: number) => {
      Object.entries(row?.value || ({} as any)).forEach(([childFieldCode, childField]: [string, any]) => {
        if (childField?.type !== 'FILE') return;
        (childField.value || []).forEach((file: any, fileIndex: number) => {
          entries.push({
            recordId,
            recordNumber,
            fieldCode,
            childFieldCode,
            rowIndex,
            fileIndex,
            fileKey: String(file?.fileKey || ''),
            name: String(file?.name || ''),
            size: file?.size != null ? Number(file.size) : null,
            contentType: String(file?.contentType || '')
          });
        });
      });
    });
  });
  return entries.filter((entry) => entry.fileKey);
}

function buildAttachmentZipPath(entry) {
  const parts = [
    'attachments',
    `record_${sanitizeZipPathSegment(entry.recordId || entry.recordNumber || 'unknown')}`
  ];
  if (entry.childFieldCode) {
    parts.push(sanitizeZipPathSegment(entry.fieldCode || 'subtable'));
    parts.push(`row_${Number(entry.rowIndex) + 1}`);
    parts.push(sanitizeZipPathSegment(entry.childFieldCode));
  } else {
    parts.push(sanitizeZipPathSegment(entry.fieldCode || 'files'));
  }
  const filePrefix = sanitizeZipPathSegment((entry.fileKey || '').slice(0, 12) || String(entry.fileIndex + 1));
  parts.push(`${filePrefix}_${sanitizeZipPathSegment(entry.name || 'file.bin', 'file.bin')}`);
  return parts.join('/');
}

async function fetchRecordComments(prefix, appId, recordId) {
  const comments = [];
  const limit = 10;
  let offset = 0;
  while (true) {
    const resp = await apiGet(prefix, '/record/comments.json', {
      app: appId,
      record: recordId,
      order: 'asc',
      offset,
      limit
    });
    const batch = resp.comments || [];
    comments.push(...batch);
    if (batch.length < limit) break;
    offset += batch.length;
  }
  return comments;
}

function renderRecordBackupSummary(summary) {
  const notes = Array.isArray(summary?.notes) ? summary.notes : [];
  const appScopeLabels = Array.isArray(summary?.appScopeLabels) ? summary.appScopeLabels : [];
  const appSettingsLabel = summary?.includeAppSettings
    ? `${String(summary?.appOkCount || 0)}/${String(summary?.appTotalCount || 0)}セクション OK${appScopeLabels.length ? ` / ${appScopeLabels.join(', ')}` : ''}`
    : '未取得';
  const pluginConfigLabel = summary?.includeAppSettings
    ? (summary?.includePluginConfig ? String(summary?.pluginConfigLabel || '-') : '未取得')
    : '未取得';
  return `
    <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">
      ZIP: ${esc(summary?.zipName || '-')} / レコード: ${esc(String(summary?.recordCount || 0))}
    </div>
    <table>
      <tbody>
        <tr><th style="width:140px">CSV</th><td>${esc(summary?.csvName || '-')}</td></tr>
        <tr><th>添付ファイル</th><td>${esc(String(summary?.fileCount || 0))}件 ${summary?.includeFiles ? '' : '(未取得)'}</td></tr>
        <tr><th>コメント</th><td>${esc(String(summary?.commentCount || 0))}件 / コメントあり ${esc(String(summary?.commentRecordCount || 0))}レコード ${summary?.includeComments ? '' : '(未取得)'}</td></tr>
        <tr><th>アプリ設定JSON</th><td>${esc(appSettingsLabel)}</td></tr>
        <tr><th>プラグイン設定</th><td>${esc(pluginConfigLabel)}</td></tr>
        <tr><th>注意</th><td>${esc(notes.length ? notes.join(' / ') : 'なし')}</td></tr>
      </tbody>
    </table>
  `;
}

function formatPluginConfigSummary(backup) {
  if (!backup || !backup.requested) return '-';
  if (backup._fetchError) return '一覧取得NG';
  if (!backup.totalPlugins) return '0件';
  return `OK ${backup.okCount} / NG ${backup.ngCount}`;
}

async function fetchPluginConfigBackupForRecord({ appId, guestId, existingPluginList, onProgress }: { appId: any; guestId: any; existingPluginList?: any[] | null; onProgress?: (idx: number, total: number, plugin: any) => void }) {
  const prefix = buildApiPrefix(guestId, false);
  const result: any = {
    requested: true,
    endpoint: '/app/plugin/config.json',
    source: 'api-lab',
    experimental: true,
    totalPlugins: 0,
    okCount: 0,
    ngCount: 0,
    plugins: []
  };

  let plugins: any[] | null = Array.isArray(existingPluginList) ? existingPluginList : null;
  if (!plugins) {
    try {
      const res = await apiGet(prefix, '/app/plugins.json', { app: appId });
      plugins = Array.isArray(res?.plugins) ? res.plugins : [];
    } catch (error: any) {
      result._fetchError = error?.message || String(error);
      return result;
    }
  }

  result.totalPlugins = plugins.length;
  if (!plugins.length) return result;

  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i] || ({} as any);
    const pluginId = String(plugin.id || '').trim();
    if (!pluginId) continue;
    if (typeof onProgress === 'function') onProgress(i, plugins.length, plugin);
    try {
      const res = await apiGet(prefix, '/app/plugin/config.json', { app: appId, id: pluginId });
      result.plugins.push({
        ...plugin,
        id: pluginId,
        config: res?.config || ({} as any),
        revision: res?.revision != null ? String(res.revision) : ''
      });
      result.okCount += 1;
    } catch (error) {
      result.plugins.push({
        ...plugin,
        id: pluginId,
        _fetchError: error.message || String(error)
      });
      result.ngCount += 1;
    }
  }

  return result;
}

function collectRecordBackupAppScopeKeys() {
  const container = getToolDocument().getElementById('u_recordBackupAppScopes');
  if (!container) return [];
  return [...new Set(selectedScopeKeys(container).filter(Boolean))];
}

export async function runCsvExport() {
  const tgtAppId = (getToolDocument().getElementById('u_targetApp') as HTMLInputElement | null)?.value?.trim();
  if (!tgtAppId) throw new Error('比較先アプリIDが指定されていません');
  const tgtGuestId = (getToolDocument().getElementById('u_targetGuest') as HTMLInputElement | null)?.value?.trim();
  const guestPrefix = tgtGuestId ? `/k/guest/${tgtGuestId}/v1` : '/k/v1';

  const condition = (getToolDocument().getElementById('u_csvExportView') as HTMLInputElement | null)?.value || '';
  const filename = (getToolDocument().getElementById('u_csvExportName') as HTMLInputElement | null)?.value?.trim() || 'records.csv';

  setBusy(true, 'フィールド情報取得中...');
  let propKeys = [];
  try {
    ({ propKeys } = await fetchFieldDefinitionsForExport(guestPrefix, tgtAppId));
  } catch (e) {
    throw new Error('フィールド情報の取得に失敗: ' + e.message);
  }

  setBusy(true, 'レコード取得中...');
  const allRecords = await fetchAllRecordsForExport(guestPrefix, tgtAppId, condition);
  if (!allRecords.length) throw new Error('出力するレコードがありません');

  setStatus(`CSV生成中... (${allRecords.length}件)`);
  const csvStr = buildRecordsCsvString(allRecords, propKeys);
  const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

  setBusy(false);
  setStatus(`CSVを出力しました (${allRecords.length}件)`);
}

export async function runCsvImport() {
  const tgtAppId = (getToolDocument().getElementById('u_targetApp') as HTMLInputElement | null)?.value?.trim();
  if (!tgtAppId) throw new Error('比較先アプリIDが指定されていません');
  const guestPrefix = (getToolDocument().getElementById('u_targetGuest') as HTMLInputElement | null)?.value?.trim() ? `/k/guest/${(getToolDocument().getElementById('u_targetGuest') as HTMLInputElement).value.trim()}/v1` : '/k/v1';

  const fileInput = getToolDocument().getElementById('u_csvImportFile') as HTMLInputElement | null;
  if (!fileInput || !fileInput.files || !fileInput.files.length) {
    throw new Error('CSVファイルを選択してください');
  }

  const file = fileInput.files[0];
  setBusy(true, 'CSVファイルを読み込み中...');

  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(String((e.target as FileReader).result || ''));
    reader.onerror = e => reject(new Error('ファイルの読み取りに失敗しました'));
    reader.readAsText(file);
  });

  if (!text) throw new Error('ファイルが空です');

  setBusy(true, 'CSVをパース中...');

  const parseCsv = (csvText: string): string[][] => {
    const rows: string[][] = [];
    let current = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];
      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') { cell += '"'; i++; }
          else { inQuotes = false; }
        } else {
          cell += char;
        }
      } else {
        if (char === '"') { inQuotes = true; }
        else if (char === ',') { current.push(cell); cell = ''; }
        else if (char === '\n' || char === '\r') {
          if (char === '\r' && nextChar === '\n') i++;
          current.push(cell);
          rows.push(current);
          current = [];
          cell = '';
        } else {
          cell += char;
        }
      }
    }
    if (cell !== '' || current.length > 0) {
      current.push(cell);
      rows.push(current);
    }
    return rows;
  };

  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('ヘッダ行とデータ行が必要です');

  const header = rows[0].map(h => h.trim());
  if (header.includes('$id')) throw new Error('CSV内にシステムフィールド（$idなど）が含まれています。インポート時は除外してください。');

  const records = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length === 1 && rows[i][0] === '') continue;
    const rec = {};
    for (let j = 0; j < header.length; j++) {
      if (!header[j]) continue;
      const val = rows[i][j] !== undefined ? rows[i][j] : '';
      rec[header[j]] = { value: val };
    }
    records.push(rec);
  }

  if (!records.length) throw new Error('登録するデータが見つかりませんでした');
  if (!(await confirmDestructive({
    title: 'CSVインポートの最終確認',
    body: `比較先アプリ ${tgtAppId} に CSV から ${records.length} 件のレコードを登録します。\nこの処理は元に戻せません。`,
    keyword: tgtAppId,
    okLabel: 'CSVをインポート',
    riskTone: 'danger'
  }))) {
    setBusy(false);
    return;
  }

  setBusy(true, `インポート開始... (対象 ${records.length}件)`);

  const batchSize = 100;
  let successCount = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    setBusy(true, `インポート実行中... (${i + 1} ～ ${i + batch.length} / ${records.length} 件目)`);
    try {
      await apiPost(guestPrefix, '/records.json', { app: tgtAppId, records: batch });
      successCount += batch.length;
    } catch (e) {
      throw new Error(`レコード登録エラー（${i + 1}件目付近）: ${e.message}`);
    }
  }

  setBusy(false);
  showToast(`完了: ${successCount}件のレコードを登録しました。`, 'success');
  fileInput.value = '';
  getToolDocument().getElementById('u_csvImportFileName').textContent = '未選択';
}

export async function runRecordBackup() {
  const tgtAppId = (getToolDocument().getElementById('u_targetApp') as HTMLInputElement | null)?.value?.trim();
  if (!tgtAppId) throw new Error('比較先アプリIDが指定されていません');

  const tgtGuestId = (getToolDocument().getElementById('u_targetGuest') as HTMLInputElement | null)?.value?.trim();
  const guestPrefix = tgtGuestId ? `/k/guest/${tgtGuestId}/v1` : '/k/v1';
  const condition = (getToolDocument().getElementById('u_recordBackupView') as HTMLInputElement | null)?.value || '';
  const zipName = (getToolDocument().getElementById('u_recordBackupZipName') as HTMLInputElement | null)?.value?.trim() || `record_backup_${tgtAppId}_${nowStamp()}.zip`;
  const includeFiles = !!(getToolDocument().getElementById('u_recordBackupIncludeFiles') as HTMLInputElement | null)?.checked;
  const includeComments = !!(getToolDocument().getElementById('u_recordBackupIncludeComments') as HTMLInputElement | null)?.checked;
  const includeAppSettings = !!(getToolDocument().getElementById('u_recordBackupIncludeAppSettings') as HTMLInputElement | null)?.checked;
  const includePluginConfig = includeAppSettings && !!(getToolDocument().getElementById('u_recordBackupIncludePluginConfig') as HTMLInputElement | null)?.checked;
  const appScopes = includeAppSettings ? collectRecordBackupAppScopeKeys() : [];
  if (includeAppSettings && !appScopes.length) throw new Error('同梱するアプリ設定セクションを1つ以上選択してください');

  setBusy(true, 'バックアップ対象のフィールドを取得中...');
  const { propKeys } = await fetchFieldDefinitionsForExport(guestPrefix, tgtAppId);

  setBusy(true, 'バックアップ対象レコードを取得中...');
  const records = await fetchAllRecordsForExport(guestPrefix, tgtAppId, condition);
  if (!records.length) throw new Error('バックアップ対象のレコードがありません');

  const JSZipCtor = await loadJSZip();
  const zip = new JSZipCtor();
  const generatedAt = new Date().toISOString();
  const csvName = 'records.csv';
  const notes = [];
  const csvStr = buildRecordsCsvString(records, propKeys);
  zip.file(csvName, csvStr);

  let fileCount = 0;
  const attachmentEntries = records.flatMap((record) => collectRecordFileEntries(record));
  const attachmentManifest = {
    generatedAt,
    appId: tgtAppId,
    recordCount: records.length,
    totalEntries: attachmentEntries.length,
    downloadedCount: 0,
    skippedCount: 0,
    files: []
  };

  if (includeFiles) {
    const blobCache = new Map();
    for (let i = 0; i < attachmentEntries.length; i++) {
      const entry = attachmentEntries[i];
      setStatus(`添付ファイル取得中... (${i + 1}/${attachmentEntries.length})`);
      let blob = blobCache.get(entry.fileKey);
      if (blob === undefined) {
        blob = await downloadBlobWithRetry(entry.fileKey, false, tgtGuestId);
        blobCache.set(entry.fileKey, blob || null);
      }
      if (blob) {
        zip.file(buildAttachmentZipPath(entry), blob);
        attachmentManifest.downloadedCount += 1;
        fileCount += 1;
      } else {
        attachmentManifest.skippedCount += 1;
      }
      attachmentManifest.files.push({
        ...entry,
        zipPath: buildAttachmentZipPath(entry),
        downloaded: !!blob
      });
    }
    if (!attachmentEntries.length) notes.push('添付ファイルなし');
    else if (attachmentManifest.skippedCount) notes.push(`添付 ${attachmentManifest.skippedCount}件取得失敗`);
    zip.file('attachments_manifest.json', JSON.stringify(attachmentManifest, null, 2));
  } else {
    notes.push('添付ファイル未取得');
  }

  let commentCount = 0;
  let commentRecordCount = 0;
  const commentsPayload = {
    generatedAt,
    appId: tgtAppId,
    guestId: tgtGuestId || '',
    recordCount: records.length,
    records: [],
    commentCount: 0,
    _fetchError: ''
  };

  if (includeComments) {
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const recordId = String(record?.$id?.value || '').trim();
      if (!recordId) continue;
      setStatus(`コメント取得中... (${i + 1}/${records.length})`);
      try {
        const comments = await fetchRecordComments(guestPrefix, tgtAppId, recordId);
        if (comments.length) {
          commentsPayload.records.push({
            recordId,
            recordNumber: getRecordNumberValue(record),
            comments
          });
          commentRecordCount += 1;
          commentCount += comments.length;
        }
      } catch (error) {
        commentsPayload._fetchError = error.message || String(error);
        notes.push('コメント取得に失敗したため一部スキップ');
        break;
      }
    }
    commentsPayload.commentCount = commentCount;
    zip.file('comments/comments.json', JSON.stringify(commentsPayload, null, 2));
    if (!commentCount && !commentsPayload._fetchError) notes.push('コメントなし');
  } else {
    notes.push('コメント未取得');
  }

  let appOkCount = 0;
  let appNgCount = 0;
  let appScopeLabels = [];
  let pluginConfigLabel = '未取得';
  if (includeAppSettings) {
    appScopeLabels = appScopes.map((key) => SECTION_DEFS.find((section) => section.key === key)?.label || key);
    setStatus(`アプリ設定取得中... (0/${appScopes.length})`);
    const settingsBundle = await fetchBundle({
      appId: tgtAppId,
      guestId: tgtGuestId || '',
      preview: false,
      sections: appScopes,
      onProgress: (p, label) => setStatus(`アプリ設定取得中 ${Math.round(p * 100)}% (${label})`)
    });

    for (const key of appScopes) {
      const sec = settingsBundle.sections[key];
      if (sec && sec._fetchError) appNgCount += 1;
      else appOkCount += 1;
    }

    const appSettingsPayload = {
      generatedAt,
      appId: tgtAppId,
      guestId: tgtGuestId || '',
      preview: false,
      scopes: appScopes,
      scopeLabels: appScopeLabels,
      bundle: settingsBundle
    };
    zip.file(`app_settings/app_${tgtAppId}.json`, JSON.stringify(appSettingsPayload, null, 2));

    let pluginConfigBackup = null;
    if (includePluginConfig) {
      pluginConfigBackup = await fetchPluginConfigBackupForRecord({
        appId: tgtAppId,
        guestId: tgtGuestId || '',
        existingPluginList: settingsBundle?.sections?.pluginSettings?.plugins,
        onProgress: (pluginIndex: number, pluginTotal: number, plugin: any) => {
          const pluginName = String(plugin?.name || plugin?.id || '');
          setStatus(`プラグイン設定取得中 ${pluginIndex + 1}/${pluginTotal}${pluginName ? ` (${pluginName})` : ''}`);
        }
      });
      pluginConfigLabel = formatPluginConfigSummary(pluginConfigBackup);
      zip.file('app_settings/plugin_config.json', JSON.stringify(pluginConfigBackup, null, 2));
      if (pluginConfigBackup?._fetchError) notes.push('プラグイン一覧取得失敗');
      else if (pluginConfigBackup?.ngCount) notes.push('プラグイン設定一部取得失敗');
    }

    zip.file('app_settings/manifest.json', JSON.stringify({
      generatedAt,
      appId: tgtAppId,
      guestId: tgtGuestId || '',
      preview: false,
      scopes: appScopes,
      scopeLabels: appScopeLabels,
      okCount: appOkCount,
      ngCount: appNgCount,
      pluginConfig: {
        included: includePluginConfig,
        label: pluginConfigLabel,
        totalPlugins: pluginConfigBackup?.totalPlugins || 0,
        okCount: pluginConfigBackup?.okCount || 0,
        ngCount: pluginConfigBackup?.ngCount || 0,
        fetchError: pluginConfigBackup?._fetchError || ''
      }
    }, null, 2));

    if (appNgCount) notes.push('アプリ設定一部取得失敗');
  }

  const manifest = {
    generatedAt,
    appId: tgtAppId,
    guestId: tgtGuestId || '',
    query: condition,
    csv: {
      name: csvName,
      recordCount: records.length
    },
    attachments: {
      included: includeFiles,
      totalEntries: attachmentEntries.length,
      downloadedCount: attachmentManifest.downloadedCount,
      skippedCount: attachmentManifest.skippedCount
    },
    comments: {
      included: includeComments,
      commentCount,
      recordCount: commentRecordCount,
      fetchError: commentsPayload._fetchError || ''
    },
    appSettings: {
      included: includeAppSettings,
      scopes: appScopes,
      scopeLabels: appScopeLabels,
      okCount: appOkCount,
      ngCount: appNgCount,
      pluginConfig: {
        included: includePluginConfig,
        label: pluginConfigLabel
      }
    }
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  setStatus('バックアップZIPを生成中...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipName, zipBlob);

  if (ui.recordBackupResult) {
    ui.recordBackupResult.innerHTML = renderRecordBackupSummary({
      zipName,
      recordCount: records.length,
      csvName,
      includeFiles,
      fileCount,
      includeComments,
      commentCount,
      commentRecordCount,
      includeAppSettings,
      appOkCount,
      appTotalCount: appScopes.length,
      appScopeLabels,
      includePluginConfig,
      pluginConfigLabel,
      notes
    });
  }

  setStatus(`データバックアップZIPを保存しました（${records.length}件 / 添付${fileCount}件 / コメント${commentCount}件${includeAppSettings ? ` / 設定${appOkCount}/${appScopes.length}セクション` : ''}）`);
}

export async function runRecordCopy() {
  const srcApp = (getToolDocument().getElementById('u_sourceApp') as HTMLInputElement | null)?.value?.trim();
  const tgtApp = (getToolDocument().getElementById('u_targetApp') as HTMLInputElement | null)?.value?.trim();
  if (!srcApp || !tgtApp) throw new Error('比較元と比較先の両方のアプリIDを指定してください');

  const srcGuestStr = (getToolDocument().getElementById('u_sourceGuest') as HTMLInputElement | null)?.value?.trim() || null;
  const tgtGuestStr = (getToolDocument().getElementById('u_targetGuest') as HTMLInputElement | null)?.value?.trim() || null;
  const srcGuest = srcGuestStr ? `/k/guest/${srcGuestStr}/v1` : '/k/v1';
  const tgtGuest = tgtGuestStr ? `/k/guest/${tgtGuestStr}/v1` : '/k/v1';
  const query = (getToolDocument().getElementById('u_recordCopyQuery') as HTMLInputElement | null)?.value || '';

  if (!(await confirmDestructive({
    title: 'レコードコピーの最終確認',
    body: `比較元 ${srcApp} → 比較先 ${tgtApp} へレコードをコピーします。\nこの処理は元に戻せません。`,
    keyword: tgtApp,
    okLabel: 'レコードをコピー',
    riskTone: 'danger'
  }))) return;

  setBusy(true, '比較元のレコードを取得中...');
  let totalFetched = 0;
  const records = [];
  while (true) {
    const q = `${query} limit 500 offset ${totalFetched}`;
    const res = await apiGet(srcGuest, '/records.json', { app: srcApp, query: q });
    if (!res.records || res.records.length === 0) break;
    records.push(...res.records);
    totalFetched += res.records.length;
    if (res.records.length < 500) break;
    setStatus(`取得中... (${totalFetched}件)`);
  }

  if (!records.length) {
    showToast('コピー対象のレコードが見つかりませんでした', 'warn');
    setBusy(false);
    return;
  }

  const systemFields = ['$id', '$revision', '作成者', '作成日時', '更新者', '更新日時', 'レコード番号', 'ステータス', '作業者'];
  const systemTypes = ['RECORD_NUMBER', 'CREATOR', 'CREATED_TIME', 'MODIFIER', 'UPDATED_TIME', 'STATUS', 'STATUS_ASSIGNEE', 'CALC'];
  const cleanRecords = records.map(rec => {
    const clean = {};
    for (const [k, v] of Object.entries(rec) as Array<[string, any]>) {
      if (!systemFields.includes(k) && !systemTypes.includes(v.type)) {
        if (v.type === 'SUBTABLE') {
          const cleanSub = v.value.map(sRow => {
            const cleanSRow = {};
            for (const [sk, sv] of Object.entries(sRow.value) as Array<[string, any]>) {
              cleanSRow[sk] = { value: sv.value };
            }
            return { value: cleanSRow };
          });
          clean[k] = { value: cleanSub };
        } else {
          clean[k] = { value: v.value };
        }
      }
    }
    return clean;
  });

  if (!(await confirmDestructive({
    title: 'レコード登録の最終確認',
    body: `${records.length} 件のレコードを比較先 (AppID: ${tgtApp}) へ登録します。\nこの処理は元に戻せません。`,
    keyword: tgtApp,
    okLabel: 'レコードを登録',
    riskTone: 'danger'
  }))) {
    setBusy(false);
    return;
  }

  setBusy(true, `インポート開始... (対象 ${records.length}件)`);
  const batchSize = 100;
  let successCount = 0;
  for (let i = 0; i < cleanRecords.length; i += batchSize) {
    const batch = cleanRecords.slice(i, i + batchSize);
    setBusy(true, `登録実行中... (${i + 1} ～ ${i + batch.length} / ${cleanRecords.length} 件目)`);
    try {
      await apiPost(tgtGuest, '/records.json', { app: tgtApp, records: batch });
      successCount += batch.length;
    } catch (e) {
      throw new Error(`レコード登録エラー（${i + 1}件目付近）: ${e.message}`);
    }
  }

  setBusy(false);
  showToast(`完了: ${successCount}件のレコードを比較先へコピーしました。`, 'success');
}

const TEMPLATE_STATE_KEY = 'kintoneSuperApp_Templates';

function getTemplates() {
  try { return JSON.parse(localStorage.getItem(TEMPLATE_STATE_KEY) || '{}'); }
  catch { return {}; }
}

export function renderTemplateOptions() {
  const sel = getToolDocument().getElementById('u_templateSelect') as HTMLSelectElement | null;
  if (!sel) return;
  const tpls: Record<string, any> = getTemplates();
  const current = sel.value;
  const keys = Object.keys(tpls).sort((a, b) => tpls[b].savedAt - tpls[a].savedAt);
  if (!keys.length) {
    sel.innerHTML = '<option value="">-- 保存済なし --</option>';
    return;
  }
  sel.innerHTML = keys.map(k => `<option value="${esc(k)}">${esc(k)} (${new Date(tpls[k].savedAt).toLocaleDateString()})</option>`).join('');
  if (tpls[current]) sel.value = current;
}

export async function saveTemplate() {
  const name = (getToolDocument().getElementById('u_templateSaveName') as HTMLInputElement | null)?.value?.trim();
  if (!name) throw new Error('保存するデータ名を入力してください');

  const c = commonParams();
  if (!c.source.appId) throw new Error('テンプレートとして保存する比較元のアプリIDを指定してください');

  const scopes = SECTION_DEFS.map(s => s.key);
  const bundle = await fetchBundle({ ...c.source, sections: scopes, onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`) });

  const tpls = getTemplates();
  tpls[name] = { savedAt: Date.now(), bundle: bundle };
  try {
    localStorage.setItem(TEMPLATE_STATE_KEY, JSON.stringify(tpls));
  } catch (e) {
    throw new Error('保存に失敗しました。LocalStorageの容量制限(5MB等)に達した可能性があります。不要な履歴を削除してください。');
  }

  renderTemplateOptions();
  (getToolDocument().getElementById('u_templateSaveName') as HTMLInputElement).value = '';
  showToast(`データ「${name}」を保存しました。`, 'success');
}

export function loadTemplate() {
  const name = (getToolDocument().getElementById('u_templateSelect') as HTMLInputElement | null)?.value;
  if (!name) return;
  const tpls = getTemplates();
  const tpl = tpls[name];
  if (!tpl || !tpl.bundle) {
    showToast('指定されたデータが存在しません', 'error');
    return;
  }

  state.importedSourceBundle = tpl.bundle;
  state.importedSourceName = `[テンプレート] ${name}`;
  renderBundleState();

  showToast(`テンプレート「${name}」を比較元としてセットしました。差分比較を実行してください。`, 'success');
}

export function deleteTemplate() {
  const name = (getToolDocument().getElementById('u_templateSelect') as HTMLInputElement | null)?.value;
  if (!name) return;
  if (!kusConfirm(`テンプレート「${name}」を削除しますか？`)) return;
  const tpls = getTemplates();
  delete tpls[name];
  localStorage.setItem(TEMPLATE_STATE_KEY, JSON.stringify(tpls));
  renderTemplateOptions();
  setStatus(`テンプレート「${name}」を削除しました`);
}
