'use strict';

import { SECTION_DEFS } from '../constants.js';
import { state, ui } from '../state.js';
import { esc, extractAppNameFromBundle, downloadText, downloadBlob, buildExportFilename, buildAppFilenameLabel, appLabelFromBundle } from '../utils.js';
import { apiGet, fetchBundle, buildApiPrefix, fetchAppsInSpace } from '../api.js';
import { selectedScopeKeys } from '../utils.js';
import { setStatus } from '../ui/components.js';
import { commonParams, saveCurrentDialogState } from './diff.js';
import { parseAppIdList } from './field.js';
import { loadJSZip } from './record.js';
import { getAppTargetTable } from '../ui/appTargetTable.js';

/**
 * 設定一括取得の対象（appId + アプリごとのゲストスペース）を解決する。
 * 表（appTargetTable）が初期化されていればそれを優先し、無ければ旧来の
 * テキストエリア + 共通ゲストID から組み立てる。
 */
function resolveSettingsExportTargets(): Array<{ appId: string; guestId: string }> {
  const table = getAppTargetTable('settingsExport');
  if (table) {
    const targets = table.getTargets();
    if (targets.length) return targets;
  }
  const guestId = ui.settingsExportGuest.value.trim();
  return parseAppIdList(ui.settingsExportAppIds.value).map((appId) => ({ appId, guestId }));
}

// ---------------------------------------------------------------------------
// Add app ID to settings export
// ---------------------------------------------------------------------------

export function addAppIdToSettingsExport(appId, appName) {
  const id = String(appId || '').trim();
  if (!/^\d+$/.test(id)) return;
  const table = getAppTargetTable('settingsExport');
  if (table) {
    table.addRow(id, ui.settingsExportGuest.value.trim());
  } else {
    const set = new Set(parseAppIdList(ui.settingsExportAppIds.value));
    set.add(id);
    ui.settingsExportAppIds.value = [...set].join(', ');
  }
  saveCurrentDialogState();
  setStatus(`アプリ ${id}${appName ? ` (${appName})` : ''} を追加しました`);
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
// Add all apps in a space to the settings export list
// ---------------------------------------------------------------------------

export async function addSpaceAppsToSettingsExport() {
  const spaceId = String(ui.settingsExportSpaceId?.value || '').trim();
  if (!/^\d+$/.test(spaceId)) {
    throw new Error('スペースIDを数値で入力してください');
  }
  const guestId = ui.settingsExportGuest.value.trim();
  setStatus(`スペース ${spaceId} のアプリ一覧を取得中...`);
  const apps = await fetchAppsInSpace(spaceId, guestId);
  if (!apps.length) {
    setStatus(`スペース ${spaceId} に取得対象アプリがありませんでした`, true);
    return;
  }
  const table = getAppTargetTable('settingsExport');
  if (table) {
    const before = table.getTargets().length;
    apps.forEach((a) => table.addRow(a.appId, guestId));
    const after = table.getTargets().length;
    saveCurrentDialogState();
    setStatus(`スペース ${spaceId} のアプリ ${apps.length}件を読み込みました（新規追加 ${after - before}件 / 合計 ${after}件）`);
    return;
  }
  const set = new Set(parseAppIdList(ui.settingsExportAppIds.value));
  const before = set.size;
  apps.forEach((a) => set.add(a.appId));
  const ordered = [...set].sort((a, b) => Number(a) - Number(b));
  ui.settingsExportAppIds.value = ordered.join(', ');
  saveCurrentDialogState();
  const added = set.size - before;
  setStatus(`スペース ${spaceId} のアプリ ${apps.length}件を読み込みました（新規追加 ${added}件 / 合計 ${set.size}件）`);
}

// ---------------------------------------------------------------------------
// Render settings export summary
// ---------------------------------------------------------------------------

export function renderSettingsExportSummary(rows, scopes) {
  const labels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k).join(', ');
  const stashed = Array.isArray(state.lastSettingsExportBundles) ? state.lastSettingsExportBundles : [];
  const stashedById = new Map(stashed.map((b: any) => [String(b?.appId || ''), b]));
  const totalApps = rows.length;
  const totalOk = rows.reduce((acc, r) => acc + Number(r.okCount || 0), 0);
  const totalNg = rows.reduce((acc, r) => acc + Number(r.ngCount || 0), 0);
  const allSuccess = totalNg === 0;
  const body = rows.map((r) => {
    const idStr = String(r.appId);
    const canLoad = stashedById.has(idStr);
    const bundle = stashedById.get(idStr);
    const appName = bundle ? extractAppNameFromBundle(bundle) : '';
    const guestStr = r.guestId ? `guest:${r.guestId}` : '通常スペース';
    const idCell = `<div style="display:flex;flex-direction:column;line-height:1.3;"><span>${esc(idStr)}</span>${appName ? `<span style="font-size:10px;color:#64748b;">${esc(appName)}</span>` : ''}<span style="font-size:10px;color:#94a3b8;">${esc(guestStr)}</span></div>`;
    const loadCell = canLoad
      ? `<div class="settings-export-load-actions">
          <button type="button" class="btn sub" data-act="settingsExportLoadToDiff" data-side="source" data-app-id="${esc(idStr)}" title="このアプリの取得済みJSONを「比較元」としてセットし差分タブへ移動">比較元へ</button>
          <button type="button" class="btn sub" data-act="settingsExportLoadToDiff" data-side="target" data-app-id="${esc(idStr)}" title="このアプリの取得済みJSONを「比較先」としてセットし差分タブへ移動">比較先へ</button>
          <button type="button" class="btn sub" data-act="settingsExportLoadToDesign" data-app-id="${esc(idStr)}" title="このアプリの取得済みJSONを設計書タブへ読み込み、API取得なしで設計書を生成できるようにします">設計書へ</button>
        </div>`
      : '<span class="muted" style="font-size:10px">取得失敗</span>';
    const rowBg = r.ngCount ? 'background:#fff8f1;' : '';
    return `<tr style="${rowBg}">
      <td>${idCell}</td>
      <td>${esc(String(r.okCount))}</td>
      <td>${esc(String(r.ngCount))}</td>
      <td>${esc(r.pluginConfigLabel || '-')}</td>
      <td>${esc(r.note || '-')}</td>
      <td>${loadCell}</td>
    </tr>`;
  }).join('');
  const totalsHtml = `<div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:${allSuccess ? '#f0fdf4' : '#fff8f1'};display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
    <span style="font-weight:700;color:${allSuccess ? '#15803d' : '#9a3412'};">${allSuccess ? '✓ 全件成功' : '⚠ 一部失敗あり'}</span>
    <span>アプリ数 <strong>${totalApps}</strong></span>
    <span style="color:#16a34a">セクションOK合計 <strong>${totalOk}</strong></span>
    <span style="color:${totalNg ? '#dc2626' : '#64748b'}">セクションNG合計 <strong>${totalNg}</strong></span>
  </div>`;
  return `
    ${totalsHtml}
    <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">対象セクション: ${esc(labels || '-')}</div>
    <table>
      <thead><tr><th>アプリID / 名称</th><th>取得OK</th><th>取得NG</th><th>プラグイン設定</th><th>メモ</th><th style="width:160px">差分タブへ</th></tr></thead>
      <tbody>${body || '<tr><td colspan="6">結果なし</td></tr>'}</tbody>
    </table>
  `;
}

/**
 * 設定一括取得で取得済みのバンドルを差分タブの比較元 or 比較先にセットする。
 * 既存の importBundleFromFile と同等の状態遷移を踏むことで再取得不要にする。
 */
export function loadSettingsExportBundleToDiff(appId: string | number, side: 'source' | 'target'): boolean {
  const stash = Array.isArray(state.lastSettingsExportBundles) ? state.lastSettingsExportBundles : [];
  const bundle = stash.find((b: any) => String(b?.appId || '') === String(appId));
  if (!bundle) return false;
  const cloned = JSON.parse(JSON.stringify(bundle));
  if (side === 'source') {
    state.importedSourceBundle = cloned;
    state.importedSourceName = `settings-export:app${appId}`;
    state.lastSourceBundle = cloned;
  } else {
    state.importedTargetBundle = cloned;
    state.importedTargetName = `settings-export:app${appId}`;
    state.lastTargetBundle = cloned;
  }
  state.lastDiffAt = null;
  state.lastDiffRows = [];
  state.lastFetchIssues = [];
  state.lastDiffSignature = '';
  state.lastApplyPlan = null;
  state.diffSelectedIds = new Set();
  state.diffIgnoreSuggestions = [];
  state.reflectRows = [];
  state.reflectSelectedIds = new Set();
  state.reflectNodeModes = {};
  state.reflectUndoStack = [];
  state.reflectRedoStack = [];
  state.reflectActiveNodeId = '';
  return true;
}

function formatPluginConfigSummary(backup) {
  if (!backup || !backup.requested) return '-';
  if (backup._fetchError) return '一覧取得NG';
  if (!backup.totalPlugins) return '0件';
  return `OK ${backup.okCount} / NG ${backup.ngCount}`;
}

async function fetchPluginConfigBackup({ appId, guestId, preview, existingPluginList, onProgress }: { appId: any; guestId: any; preview: boolean; existingPluginList?: any[] | null; onProgress?: (idx: number, total: number, plugin: any) => void }) {
  const prefix = buildApiPrefix(guestId, false);
  const result: any = {
    requested: true,
    endpoint: '/app/plugin/config.json',
    source: 'api-lab',
    experimental: true,
    previewRequested: !!preview,
    previewUsed: false,
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
  const targets = resolveSettingsExportTargets();
  if (!targets.length) throw new Error('対象アプリIDを1件以上入力してください');
  const scopes = selectedScopeKeys(ui.settingsExportScopes);
  if (!scopes.length) throw new Error('取得対象セクションを選択してください');

  const preview = !!ui.settingsExportPreview.checked;
  const includePluginConfig = !!ui.settingsExportIncludePluginConfig?.checked;
  saveCurrentDialogState();

  const bundles = [];
  const rows = [];
  for (let i = 0; i < targets.length; i++) {
    const { appId, guestId } = targets[i];
    const guestNote = guestId ? ` (guest:${guestId})` : '';
    setStatus(`設定取得中 ${i + 1}/${targets.length}: アプリ ${appId}${guestNote}`);
    const bundle = await fetchBundle({
      appId,
      guestId,
      preview,
      sections: scopes,
      onProgress: (p, l) => setStatus(`設定取得中 ${i + 1}/${targets.length}: アプリ ${appId}${guestNote} ${Math.round(p * 100)}% (${l})`)
    });
    if (guestId && !(bundle as any).guestId) (bundle as any).guestId = guestId;
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
          setStatus(`プラグイン設定取得中 ${i + 1}/${targets.length}: アプリ ${appId}${guestNote} ${pluginIndex + 1}/${pluginTotal}${pluginName ? ` (${pluginName})` : ''}`);
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
      guestId,
      okCount,
      ngCount,
      pluginConfigLabel: formatPluginConfigSummary(pluginConfigBackup),
      note: noteParts.join(' / ')
    });
  }

  // バンドルを保持して差分タブから「比較元/比較先として読込」できるようにする
  state.lastSettingsExportBundles = bundles;
  ui.settingsExportResult.innerHTML = renderSettingsExportSummary(rows, scopes);

  const guestIds = [...new Set(targets.map((t) => t.guestId).filter(Boolean))];
  const scopeLabels = scopes.map((k) => SECTION_DEFS.find((s) => s.key === k)?.label || k);
  const payload = {
    generatedAt: new Date().toISOString(),
    guestIds,
    targets,
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
          guestIds,
          targets,
          preview: payload.preview,
          includePluginConfig: payload.includePluginConfig,
          scopes: payload.scopes,
          appCount: bundles.length
        }, null, 2));
    for (let i = 0; i < bundles.length; i++) {
      const bundle = bundles[i];
      const guestId = targets[i].guestId;
      const suffix = `${guestId ? `_ゲスト${guestId}` : ''}${preview ? '_プレビュー' : '_本番'}`;
      const name = `${buildAppFilenameLabel(bundle.appId, extractAppNameFromBundle(bundle))}${suffix}.json`;
      zip.file(name, JSON.stringify(bundle, null, 2));
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const expLabel = bundles.length === 1 ? appLabelFromBundle(bundles[0]) : `${bundles.length}件`;
    downloadBlob(buildExportFilename('設定一括取得', 'zip', { appLabel: expLabel }), zipBlob);
    setStatus(`設定バックアップZIPを保存しました（${bundles.length} apps）`);
    return;
  }

  const expLabel = bundles.length === 1 ? appLabelFromBundle(bundles[0]) : `${bundles.length}件`;
  downloadText(buildExportFilename('設定一括取得', 'json', { appLabel: expLabel }), JSON.stringify(payload, null, 2), 'application/json');
  setStatus(`設定バックアップJSONを保存しました（${bundles.length}アプリ）`);
}
