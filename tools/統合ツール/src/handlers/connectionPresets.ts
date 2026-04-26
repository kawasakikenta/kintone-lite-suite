'use strict';

/**
 * 接続プリセット (アプリID/ゲストID/プレビュー設定) の CRUD と
 * アプリ検索 (kintone /apps.json), 検索結果からの各タブへの割当を担う。
 *
 * 元は handlers.ts に分散していたが、UI/状態/API/再描画の連携が密で読みづらい
 * ため独立モジュール化した。
 */

import { state, ui, upsertConnectionPreset, deleteConnectionPreset } from '../state.js';
import { esc, kusConfirm } from '../utils.js';
import { buildApiPrefix, apiGet } from '../api.js';
import { setStatus, renderBundleState, updateConnectionStepIndicators } from '../ui/components.js';
import { saveCurrentDialogState } from '../tabs/diff.js';
import { addAppIdToSettingsExport } from '../tabs/settings-export.js';
import { resetReflectApplyChecks } from './checklist.js';
import { parseIdSet, extractAppIdFromInput, extractGuestIdFromInput } from './diffFocus.js';

export function formatConnectionPresetLabel(preset: any): string {
  if (!preset) return '';
  const src = preset.sourceAppId || '-';
  const tgt = preset.targetAppId || '-';
  const guestParts = [
    preset.sourceGuestId ? `元G:${preset.sourceGuestId}` : '',
    preset.targetGuestId ? `先G:${preset.targetGuestId}` : ''
  ].filter(Boolean);
  return `${preset.name || '接続プリセット'} (${src} -> ${tgt}${guestParts.length ? ` / ${guestParts.join(' ')}` : ''})`;
}

export function renderConnectionPresetSelect(preferId?: string): void {
  const sel = ui.connectionPresetSelect;
  if (!sel) return;
  const presets = Array.isArray(state.connectionPresets) ? state.connectionPresets : [];
  const current = preferId != null ? String(preferId) : String(sel.value || '');
  sel.innerHTML = presets.length
    ? ['<option value="">-- プリセットを選択 --</option>']
      .concat(presets.map((preset) => `<option value="${esc(preset.id || '')}">${esc(formatConnectionPresetLabel(preset))}</option>`))
      .join('')
    : '<option value="">（保存済みプリセットなし）</option>';
  if (current && presets.some((preset) => preset.id === current)) sel.value = current;
  if (ui.connectionPresetSummary) {
    ui.connectionPresetSummary.textContent = presets.length ? `${presets.length}件保存` : '保存なし';
  }
}

export function getSelectedConnectionPreset(): any {
  const id = String(ui.connectionPresetSelect?.value || '').trim();
  if (!id) return null;
  return (Array.isArray(state.connectionPresets) ? state.connectionPresets : []).find((preset) => preset.id === id) || null;
}

export function buildCurrentConnectionPreset(): any {
  const sourceAppId = String(ui.sourceApp?.value || '').trim();
  const targetAppId = String(ui.targetApp?.value || '').trim();
  if (!sourceAppId && !targetAppId) return null;
  const customName = String(ui.connectionPresetName?.value || '').trim();
  const name = customName || `接続 ${sourceAppId || '-'} -> ${targetAppId || '-'}`;
  return {
    id: `conn-${Date.now()}`,
    name,
    sourceAppId,
    sourceGuestId: String(ui.sourceGuest?.value || '').trim(),
    sourcePreview: !!ui.sourcePreview?.checked,
    targetAppId,
    targetGuestId: String(ui.targetGuest?.value || '').trim(),
    targetPreview: !!ui.targetPreview?.checked
  };
}

export function saveConnectionPresetFromCurrent(): void {
  const preset = buildCurrentConnectionPreset();
  if (!preset) {
    setStatus('保存するアプリIDがありません', true);
    return;
  }
  const saved = upsertConnectionPreset(preset);
  if (!saved) {
    setStatus('接続プリセットを保存できませんでした', true);
    return;
  }
  if (ui.connectionPresetName) ui.connectionPresetName.value = '';
  renderConnectionPresetSelect(saved.id);
  setStatus(`接続プリセット「${saved.name}」を保存しました`);
}

export function applyConnectionPresetById(id: string): void {
  const presetId = String(id || '').trim();
  const preset = (Array.isArray(state.connectionPresets) ? state.connectionPresets : [])
    .find((item) => item.id === presetId);
  if (!preset) {
    setStatus('読み込む接続プリセットを選択してください', true);
    return;
  }
  if (ui.sourceApp) ui.sourceApp.value = preset.sourceAppId || '';
  if (ui.sourceGuest) ui.sourceGuest.value = preset.sourceGuestId || '';
  if (ui.sourcePreview) ui.sourcePreview.checked = !!preset.sourcePreview;
  if (ui.targetApp) ui.targetApp.value = preset.targetAppId || '';
  if (ui.targetGuest) ui.targetGuest.value = preset.targetGuestId || '';
  if (ui.targetPreview) ui.targetPreview.checked = preset.targetPreview == null ? true : !!preset.targetPreview;
  resetReflectApplyChecks(['diff', 'plan']);
  saveCurrentDialogState();
  renderBundleState();
  updateConnectionStepIndicators();
  setStatus(`接続プリセット「${preset.name}」を読み込みました`);
}

export function deleteSelectedConnectionPreset(): void {
  const preset = getSelectedConnectionPreset();
  if (!preset) {
    setStatus('削除する接続プリセットを選択してください', true);
    return;
  }
  if (!kusConfirm(`接続プリセット「${preset.name}」を削除しますか？`)) return;
  deleteConnectionPreset(preset.id);
  renderConnectionPresetSelect();
  setStatus('接続プリセットを削除しました');
}

export function renderConnectionSearchResults(apps: any[]): void {
  if (!ui.connectionSearchResult) return;
  const rows = Array.isArray(apps) ? apps : [];
  if (!rows.length) {
    ui.connectionSearchResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#64748b">検索結果なし</div>';
    return;
  }
  ui.connectionSearchResult.innerHTML = `<div class="connection-search-result-head">${rows.length}件の候補</div><table>
    <thead><tr><th style="width:90px">アプリID</th><th>アプリ名</th><th style="width:84px">操作</th></tr></thead>
    <tbody>${rows.map((app: any) => `<tr>
      <td>${esc(app.appId)}</td>
      <td title="${esc(app.name)}">${esc(app.name)}</td>
      <td style="text-align:right"><button type="button" class="btn sub" style="padding:4px 8px;font-size:10px" data-act="addConnectionSearchApp" data-app-id="${esc(app.appId)}" data-app-name="${esc(app.name)}">追加</button></td>
    </tr>`).join('')}</tbody>
  </table>`;
}

export async function runConnectionSearchApps(): Promise<void> {
  const keyword = ui.connectionSearchKeyword?.value.trim() || '';
  const urlGuestId = extractGuestIdFromInput(keyword);
  if (urlGuestId && ui.connectionSearchGuest && !ui.connectionSearchGuest.value.trim()) {
    ui.connectionSearchGuest.value = urlGuestId;
  }
  const guestId = ui.connectionSearchGuest?.value.trim() || urlGuestId || ui.sourceGuest?.value.trim() || ui.targetGuest?.value.trim() || '';
  const prefix = buildApiPrefix(guestId, false);
  const directAppId = extractAppIdFromInput(keyword);
  if (directAppId) {
    setStatus('アプリIDを確認中...');
    let appName = '';
    try {
      const appInfo = await apiGet(prefix, '/app.json', { id: directAppId });
      appName = String(appInfo?.name || '').trim();
    } catch (err) {
      appName = 'ID指定（名称未取得）';
    }
    renderConnectionSearchResults([{ appId: directAppId, name: appName || 'ID指定' }]);
    saveCurrentDialogState();
    setStatus(`アプリID ${directAppId}${guestId ? ` / ゲスト ${guestId}` : ''} を候補に表示しました`);
    return;
  }
  const params: Record<string, any> = { limit: 100 };
  if (keyword) params.name = keyword;
  setStatus('アプリ検索中...');
  const res = await apiGet(prefix, '/apps.json', params);
  const apps = (res.apps || [])
    .map((a: any) => ({ appId: String(a.appId || '').trim(), name: String(a.name || '') }))
    .filter((a: { appId: string }) => /^\d+$/.test(a.appId))
    .sort((a: { appId: string }, b: { appId: string }) => Number(a.appId) - Number(b.appId));
  renderConnectionSearchResults(apps);
  setStatus(`アプリ検索完了: ${apps.length}件`);
}

export function addConnectionSearchApp(appId: string, appName: string): void {
  const id = String(appId || '').trim();
  if (!/^\d+$/.test(id)) {
    setStatus('追加対象のアプリIDが不正です', true);
    return;
  }
  const assign = ui.connectionSearchAssign?.value || 'source';
  const searchGuestId = ui.connectionSearchGuest?.value.trim() || '';
  if (assign === 'source' && ui.sourceApp) {
    ui.sourceApp.value = id;
    if (searchGuestId && ui.sourceGuest && !ui.sourceGuest.value.trim()) ui.sourceGuest.value = searchGuestId;
    setStatus(`比較元に App ${id}${appName ? ` (${appName})` : ''} を設定しました`);
  } else if (assign === 'target' && ui.targetApp) {
    ui.targetApp.value = id;
    if (searchGuestId && ui.targetGuest && !ui.targetGuest.value.trim()) ui.targetGuest.value = searchGuestId;
    setStatus(`比較先に App ${id}${appName ? ` (${appName})` : ''} を設定しました`);
  } else if (assign === 'diffMulti') {
    if (!ui.diffMultiTargets) {
      setStatus('複数比較先リストが見つかりません', true);
      return;
    }
    const ids = new Set(parseIdSet(ui.diffMultiTargets.value));
    ids.add(id);
    ui.diffMultiTargets.value = [...ids].join('\n');
    if (searchGuestId && ui.targetGuest && !ui.targetGuest.value.trim()) ui.targetGuest.value = searchGuestId;
    setStatus(`複数比較先へ App ${id}${appName ? ` (${appName})` : ''} を追加しました`);
  } else if (assign === 'settingsExport') {
    if (searchGuestId && ui.settingsExportGuest && !ui.settingsExportGuest.value.trim()) ui.settingsExportGuest.value = searchGuestId;
    addAppIdToSettingsExport(id, appName);
    return;
  }
  saveCurrentDialogState();
  updateConnectionStepIndicators();
}
