'use strict';

import { SECTION_DEFS } from '../constants.js';
import { state, ui } from '../state.js';
import { esc, deepClone, nowStamp, downloadText, selectedScopeKeys } from '../utils.js';
import { apiGet, apiPut, apiPost, buildApiPrefix, fetchBundle } from '../api.js';
import { setStatus, setBusy, renderBundleState } from '../ui/components.js';
import { commonParams } from './diff.js';

export function getSideApiPrefix(isSource, preview) {
  const c = commonParams();
  const side = isSource ? c.source : c.target;
  return buildApiPrefix(side.guestId, !!preview);
}

export async function loadViewsForSelect(selectId, inputId) {
  const tApp = document.getElementById('u_targetApp').value.trim();
  if (!tApp) throw new Error('比較先アプリIDを設定してください。');
  const prefix = getSideApiPrefix(false, false);
  const resp = await apiGet(prefix, '/app/views.json', { app: tApp });
  const views = Object.entries(resp.views)
    .map(([name, v]) => ({ name, ...v }))
    .filter(v => v.type === 'LIST')
    .sort((a, b) => Number(a.index) - Number(b.index));

  const sel = document.getElementById(selectId);
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
      document.getElementById(inputId).value = decodeURIComponent(o.dataset.q || '');
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
  const tApp = document.getElementById('u_targetApp').value.trim();
  if (!tApp) throw new Error('比較先アプリIDを設定してください。');
  const query = document.getElementById('u_batchProcView').value;
  const action = document.getElementById('u_batchProcAction').value.trim();
  const assignee = document.getElementById('u_batchProcAssignee').value.trim() || null;
  if (!action) throw new Error('アクション名を入力してください。');

  setStatus('対象レコードを取得中...');
  const ids = await getRecordIdsByQuery(tApp, query, false);
  if (ids.length === 0) throw new Error('処理対象のレコードが0件です。');

  if (!confirm(`${ids.length}件のレコードにアクション「${action}」を実行します。よろしいですか？`)) return;

  setStatus('ステータス一括更新を開始...');
  const prefix = getSideApiPrefix(false, false);
  const batches = chunkArray(ids, 100);

  let okCount = 0;
  for (let i = 0; i < batches.length; i++) {
    const batchIds = batches[i];
    const body = {
      app: tApp,
      records: batchIds.map(id => {
        let r = { id, action };
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
  if (typeof JSZip !== 'undefined') return;
  setStatus('JSZipを動的ロード中...');
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    script.onload = () => { setStatus('JSZipのロード完了'); resolve(); };
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
  const tApp = document.getElementById('u_targetApp').value.trim();
  if (!tApp) throw new Error('比較先アプリIDを設定してください。');
  const query = document.getElementById('u_batchDlView').value;
  const fileCode = document.getElementById('u_batchDlFileCode').value.trim();
  const folderCode = document.getElementById('u_batchDlFolderCode').value.trim();
  const zipName = document.getElementById('u_batchDlZipName').value.trim() || 'download.zip';

  if (!fileCode) throw new Error('ファイルフィールドコードを入力してください。');

  setStatus('対象レコードを取得中...');
  const records = await getFullRecordsByQuery(tApp, query, false);
  if (records.length === 0) throw new Error('処理対象のレコードが0件です。');

  await loadJSZip();

  const zip = new JSZip();
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

export async function runCsvExport() {
  const tgtAppId = document.getElementById('u_targetApp')?.value?.trim();
  if (!tgtAppId) throw new Error('比較先アプリIDが指定されていません');
  const tgtGuestId = document.getElementById('u_targetGuest')?.value?.trim();
  const guestPrefix = tgtGuestId ? `/k/guest/${tgtGuestId}/v1` : '/k/v1';

  let condition = document.getElementById('u_csvExportViewSelect')?.value || '';
  if (!condition) condition = document.getElementById('u_csvExportView')?.value || '';
  const filename = document.getElementById('u_csvExportName')?.value?.trim() || 'records.csv';

  setBusy(true, 'フィールド情報取得中...');
  let fields = null;
  try {
    fields = await apiGet(guestPrefix, '/app/form/fields.json', { app: tgtAppId });
  } catch (e) {
    throw new Error('フィールド情報の取得に失敗: ' + e.message);
  }
  const propKeys = Object.keys(fields.properties);
  if (!propKeys.length) throw new Error('出力できるフィールドがありません');

  setBusy(true, 'レコード取得中...');
  let allRecords = [];
  let lastRecordId = '0';
  const limit = 500;

  let baseQuery = condition;
  let queryHasOrder = baseQuery.toLowerCase().includes('order by');
  let queryHasLimit = baseQuery.toLowerCase().includes('limit');

  if (queryHasLimit) {
    const resp = await apiGet(guestPrefix, '/records.json', { app: tgtAppId, query: baseQuery });
    allRecords = resp.records || [];
  } else {
    while (true) {
      setBusy(true, `レコード取得中... (${allRecords.length}件取得済)`);
      let loopQuery = '';
      if (baseQuery) {
        loopQuery = `${baseQuery} ${queryHasOrder ? '' : 'order by $id asc'} limit ${limit} offset ${allRecords.length}`;
      } else {
        loopQuery = `$id > ${lastRecordId} order by $id asc limit ${limit}`;
      }

      const resp = await apiGet(guestPrefix, '/records.json', { app: tgtAppId, query: loopQuery });
      const batch = resp.records || [];
      allRecords = allRecords.concat(batch);

      if (batch.length < limit) break;
      lastRecordId = batch[batch.length - 1].$id.value;
    }
  }

  if (!allRecords.length) throw new Error('出力するレコードがありません');

  setStatus(`CSV生成中... (${allRecords.length}件)`);

  const escapeCsv = (val) => {
    const s = String(val == null ? '' : val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const extractValue = (rec, code) => {
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
  };

  const lines = [];
  lines.push(propKeys.map(escapeCsv).join(','));

  for (const rec of allRecords) {
    lines.push(propKeys.map(key => escapeCsv(extractValue(rec, key))).join(','));
  }

  const csvStr = '\uFEFF' + lines.join('\n');
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
  const tgtAppId = document.getElementById('u_targetApp')?.value?.trim();
  if (!tgtAppId) throw new Error('比較先アプリIDが指定されていません');
  const guestPrefix = document.getElementById('u_targetGuest')?.value?.trim() ? `/k/guest/${document.getElementById('u_targetGuest').value.trim()}/v1` : '/k/v1';

  const fileInput = document.getElementById('u_csvImportFile');
  if (!fileInput.files || !fileInput.files.length) {
    throw new Error('CSVファイルを選択してください');
  }

  const file = fileInput.files[0];
  setBusy(true, 'CSVファイルを読み込み中...');

  const text = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(new Error('ファイルの読み取りに失敗しました'));
    reader.readAsText(file);
  });

  if (!text) throw new Error('ファイルが空です');

  setBusy(true, 'CSVをパース中...');

  const parseCsv = (csvText) => {
    const rows = [];
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
  if (!confirm(`CSVから ${records.length}件 のレコードをインポートしますか？`)) {
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
  alert(`完了: ${successCount}件のレコードを登録しました。`);
  fileInput.value = '';
  document.getElementById('u_csvImportFileName').textContent = '未選択';
}

export async function runRecordCopy() {
  const srcApp = document.getElementById('u_sourceApp')?.value?.trim();
  const tgtApp = document.getElementById('u_targetApp')?.value?.trim();
  if (!srcApp || !tgtApp) throw new Error('比較元と比較先の両方のアプリIDを指定してください');

  const srcGuestStr = document.getElementById('u_sourceGuest')?.value?.trim() || null;
  const tgtGuestStr = document.getElementById('u_targetGuest')?.value?.trim() || null;
  const srcGuest = srcGuestStr ? `/k/guest/${srcGuestStr}/v1` : '/k/v1';
  const tgtGuest = tgtGuestStr ? `/k/guest/${tgtGuestStr}/v1` : '/k/v1';
  const query = document.getElementById('u_recordCopyQuery')?.value || '';

  if (!confirm(`比較元(${srcApp}) から 比較先(${tgtApp}) へレコードをコピーします。よろしいですか？`)) return;

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
    alert('コピー対象のレコードが見つかりませんでした');
    setBusy(false);
    return;
  }

  const systemFields = ['$id', '$revision', '作成者', '作成日時', '更新者', '更新日時', 'レコード番号', 'ステータス', '作業者'];
  const systemTypes = ['RECORD_NUMBER', 'CREATOR', 'CREATED_TIME', 'MODIFIER', 'UPDATED_TIME', 'STATUS', 'STATUS_ASSIGNEE', 'CALC'];
  const cleanRecords = records.map(rec => {
    const clean = {};
    for (const [k, v] of Object.entries(rec)) {
      if (!systemFields.includes(k) && !systemTypes.includes(v.type)) {
        if (v.type === 'SUBTABLE') {
          const cleanSub = v.value.map(sRow => {
            const cleanSRow = {};
            for (const [sk, sv] of Object.entries(sRow.value)) {
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

  if (!confirm(`${records.length}件のレコードを比較先(AppID: ${tgtApp})へ登録します。実行しますか？`)) {
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
  alert(`完了: ${successCount}件のレコードを比較先へコピーしました。`);
}

const TEMPLATE_STATE_KEY = 'kintoneSuperApp_Templates';

function getTemplates() {
  try { return JSON.parse(localStorage.getItem(TEMPLATE_STATE_KEY) || '{}'); }
  catch { return {}; }
}

export function renderTemplateOptions() {
  const sel = document.getElementById('u_templateSelect');
  if (!sel) return;
  const tpls = getTemplates();
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
  const name = document.getElementById('u_templateSaveName')?.value?.trim();
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
  document.getElementById('u_templateSaveName').value = '';
  alert(`データ「${name}」を保存しました。`);
}

export function loadTemplate() {
  const name = document.getElementById('u_templateSelect')?.value;
  if (!name) return;
  const tpls = getTemplates();
  const tpl = tpls[name];
  if (!tpl || !tpl.bundle) {
    alert('指定されたデータが存在しません');
    return;
  }

  state.importedSourceBundle = tpl.bundle;
  state.importedSourceName = `[テンプレート] ${name}`;
  renderBundleState();

  alert(`テンプレート「${name}」を比較元（ファイル読込扱い）としてセットしました。\n必要に応じて差分比較を実行してください。`);
}

export function deleteTemplate() {
  const name = document.getElementById('u_templateSelect')?.value;
  if (!name) return;
  if (!confirm(`テンプレート「${name}」を削除しますか？`)) return;
  const tpls = getTemplates();
  delete tpls[name];
  localStorage.setItem(TEMPLATE_STATE_KEY, JSON.stringify(tpls));
  renderTemplateOptions();
  setStatus(`テンプレート「${name}」を削除しました`);
}
