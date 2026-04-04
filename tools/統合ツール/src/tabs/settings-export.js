'use strict';

import { SECTION_DEFS } from '../constants.js';
import { state, ui } from '../state.js';
import { esc, nowStamp, downloadText, downloadBlob } from '../utils.js';
import { apiGet, fetchBundle, buildApiPrefix } from '../api.js';
import { selectedScopeKeys } from '../utils.js';
import { setStatus } from '../ui/components.js';
import { commonParams, saveCurrentDialogState } from './diff.js';
import { parseAppIdList } from './field.js';
import { loadJSZip } from './record.js';

// ---------------------------------------------------------------------------
// Add app ID to settings export
// ---------------------------------------------------------------------------

export function addAppIdToSettingsExport(appId, appName) {
  if (!/^\d+$/.test(String(appId || '').trim())) return;
  const set = new Set(parseAppIdList(ui.settingsExportAppIds.value));
  set.add(String(appId).trim());
  ui.settingsExportAppIds.value = [...set].join(', ');
  saveCurrentDialogState();
  setStatus(`アプリ ${appId}${appName ? ` (${appName})` : ''} を追加しました`);
}

// ---------------------------------------------------------------------------
// Render search results
// ---------------------------------------------------------------------------

export function renderSettingsExportSearchResults(apps) {
  const list = Array.isArray(apps) ? apps : [];
  if (!list.length) {
    ui.settingsExportSearchResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#64748b">検索結果なし</div>';
    return;
  }
  const rows = list.map((app) => `<tr>
    <td>${esc(String(app.appId || ''))}</td>
    <td title="${esc(String(app.name || ''))}">${esc(String(app.name || ''))}</td>
    <td style="text-align:right"><button class="btn sub" style="padding:4px 8px;font-size:10px" data-add-settings-app="${esc(String(app.appId || ''))}" data-add-settings-name="${esc(String(app.name || ''))}">追加</button></td>
  </tr>`).join('');
  ui.settingsExportSearchResult.innerHTML = `<table>
    <thead><tr><th style="width:90px">アプリID</th><th>アプリ名</th><th style="width:70px"></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ---------------------------------------------------------------------------
// Search apps
// ---------------------------------------------------------------------------

export async function runSettingsExportSearchApps() {
  const keyword = ui.settingsExportSearchKeyword.value.trim();
  const guestId = ui.settingsExportGuest.value.trim();
  const prefix = buildApiPrefix(guestId, false);
  const params = { limit: 100 };
  if (keyword) params.name = keyword;
  setStatus('アプリ検索中...');
  const res = await apiGet(prefix, '/apps.json', params);
  const apps = (res.apps || [])
    .map((a) => ({ appId: String(a.appId || ''), name: String(a.name || '') }))
    .filter((a) => /^\d+$/.test(a.appId))
    .sort((a, b) => Number(a.appId) - Number(b.appId));
  renderSettingsExportSearchResults(apps);
  setStatus(`アプリ検索完了: ${apps.length}件`);
}

// ---------------------------------------------------------------------------
// Render settings export summary
// ---------------------------------------------------------------------------

export function renderSettingsExportSummary(rows, scopes) {
  const labels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k).join(', ');
  const body = rows.map((r) => `<tr>
    <td>${esc(r.appId)}</td>
    <td>${esc(String(r.okCount))}</td>
    <td>${esc(String(r.ngCount))}</td>
    <td>${esc(r.note || '-')}</td>
  </tr>`).join('');
  return `
    <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">対象セクション: ${esc(labels || '-')}</div>
    <table>
      <thead><tr><th>アプリID</th><th>取得OK</th><th>取得NG</th><th>メモ</th></tr></thead>
      <tbody>${body || '<tr><td colspan="4">結果なし</td></tr>'}</tbody>
    </table>
  `;
}

// ---------------------------------------------------------------------------
// Run settings export
// ---------------------------------------------------------------------------

export async function runSettingsExport(mode) {
  const appIds = parseAppIdList(ui.settingsExportAppIds.value);
  if (!appIds.length) throw new Error('対象アプリIDを1件以上入力してください');
  const scopes = selectedScopeKeys(ui.settingsExportScopes);
  if (!scopes.length) throw new Error('取得対象セクションを選択してください');

  const guestId = ui.settingsExportGuest.value.trim();
  const preview = !!ui.settingsExportPreview.checked;
  saveCurrentDialogState();

  const bundles = [];
  const rows = [];
  for (let i = 0; i < appIds.length; i++) {
    const appId = appIds[i];
    setStatus(`設定取得中 ${i + 1}/${appIds.length}: アプリ ${appId}`);
    const bundle = await fetchBundle({
      appId,
      guestId,
      preview,
      sections: scopes,
      onProgress: (p, l) => setStatus(`設定取得中 ${i + 1}/${appIds.length}: アプリ ${appId} ${Math.round(p * 100)}% (${l})`)
    });
    bundles.push(bundle);

    let okCount = 0;
    let ngCount = 0;
    for (const key of scopes) {
      const sec = bundle.sections[key];
      if (sec && sec._fetchError) ngCount += 1;
      else okCount += 1;
    }
    rows.push({ appId, okCount, ngCount, note: ngCount ? '一部セクション取得失敗あり' : 'OK' });
  }

  ui.settingsExportResult.innerHTML = renderSettingsExportSummary(rows, scopes);

  const scopeLabels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k);
  const payload = {
    generatedAt: new Date().toISOString(),
    guestId: guestId || '',
    preview,
    scopes,
    scopeLabels,
    apps: bundles
  };

  if (mode === 'zip') {
    const JSZipCtor = await loadJSZip();
    const zip = new JSZipCtor();
    zip.file('manifest.json', JSON.stringify({
      generatedAt: payload.generatedAt,
      guestId: payload.guestId,
      preview: payload.preview,
      scopes: payload.scopes,
      appCount: bundles.length
    }, null, 2));
    for (const bundle of bundles) {
      const suffix = `${guestId ? `_guest_${guestId}` : ''}${preview ? '_preview' : '_live'}`;
      const name = `app_${bundle.appId}${suffix}.json`;
      zip.file(name, JSON.stringify(bundle, null, 2));
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(`settings_export_${bundles.length}apps_${nowStamp()}.zip`, zipBlob);
    setStatus(`設定一括取得ZIPを保存しました（${bundles.length} apps）`);
    return;
  }

  downloadText(`settings_export_${bundles.length}apps_${nowStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  setStatus(`設定一括取得JSONを保存しました（${bundles.length}アプリ）`);
}
