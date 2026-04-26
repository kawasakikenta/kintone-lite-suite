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
  const params: Record<string, any> = { limit: 100 };
  if (keyword) params.name = keyword;
  setStatus('アプリ検索中...');
  const res = await apiGet(prefix, '/apps.json', params);
  const apps = (res.apps || [])
    .map((a: any) => ({ appId: String(a.appId || ''), name: String(a.name || '') }))
    .filter((a: { appId: string }) => /^\d+$/.test(a.appId))
    .sort((a: { appId: string }, b: { appId: string }) => Number(a.appId) - Number(b.appId));
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
    <td>${esc(r.pluginConfigLabel || '-')}</td>
    <td>${esc(r.note || '-')}</td>
  </tr>`).join('');
  return `
    <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">対象セクション: ${esc(labels || '-')}</div>
    <table>
      <thead><tr><th>アプリID</th><th>取得OK</th><th>取得NG</th><th>プラグイン設定</th><th>メモ</th></tr></thead>
      <tbody>${body || '<tr><td colspan="5">結果なし</td></tr>'}</tbody>
    </table>
  `;
}

function formatPluginConfigSummary(backup) {
  if (!backup || !backup.requested) return '-';
  if (backup._fetchError) return '一覧取得NG';
  if (!backup.totalPlugins) return '0件';
  return `OK ${backup.okCount} / NG ${backup.ngCount}`;
}

async function fetchPluginConfigBackup({ appId, guestId, preview, existingPluginList, onProgress }: { appId: any; guestId: any; preview: boolean; existingPluginList?: any[] | null; onProgress?: (idx: number, total: number, plugin: any) => void }) {
  const prefix = buildApiPrefix(guestId, preview);
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
  const includePluginConfig = !!ui.settingsExportIncludePluginConfig?.checked;
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

    let pluginConfigBackup = null;
    if (includePluginConfig) {
      pluginConfigBackup = await fetchPluginConfigBackup({
        appId,
        guestId,
        preview,
        existingPluginList: bundle?.sections?.pluginSettings?.plugins,
        onProgress: (pluginIndex: number, pluginTotal: number, plugin: any) => {
          const pluginName = String(plugin?.name || plugin?.id || '');
          setStatus(`プラグイン設定取得中 ${i + 1}/${appIds.length}: アプリ ${appId} ${pluginIndex + 1}/${pluginTotal}${pluginName ? ` (${pluginName})` : ''}`);
        }
      });
      bundle.pluginConfigBackup = pluginConfigBackup;
    }

    const noteParts = [];
    noteParts.push(ngCount ? '一部セクション取得失敗あり' : 'OK');
    if (includePluginConfig) {
      if (pluginConfigBackup?._fetchError) noteParts.push('プラグイン一覧取得失敗');
      else if (pluginConfigBackup?.ngCount) noteParts.push('プラグイン設定一部取得失敗');
      else noteParts.push(`プラグイン設定 ${pluginConfigBackup?.okCount || 0}件`);
    }

    rows.push({
      appId,
      okCount,
      ngCount,
      pluginConfigLabel: formatPluginConfigSummary(pluginConfigBackup),
      note: noteParts.join(' / ')
    });
  }

  ui.settingsExportResult.innerHTML = renderSettingsExportSummary(rows, scopes);

  const scopeLabels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k);
  const payload = {
    generatedAt: new Date().toISOString(),
    guestId: guestId || '',
    preview,
    includePluginConfig,
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
          includePluginConfig: payload.includePluginConfig,
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
    setStatus(`設定バックアップZIPを保存しました（${bundles.length} apps）`);
    return;
  }

  downloadText(`settings_export_${bundles.length}apps_${nowStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  setStatus(`設定バックアップJSONを保存しました（${bundles.length}アプリ）`);
}
