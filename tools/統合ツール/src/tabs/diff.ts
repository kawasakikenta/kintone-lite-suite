'use strict';

import { SECTION_DEFS, IGNORE_PRESET_KEYS, DEFAULT_SUBTAB_STATE, DIALOG_DEFAULT_WIDTH, DIALOG_DEFAULT_HEIGHT } from '../constants.js';
import { state, ui, saveDialogState, loadDialogState } from '../state.js';
import { bumpSessionMetric } from '../ui/psychology.js';
import { getAppTargetTable } from '../ui/appTargetTable.js';
import {
  esc,
  stableStringify,
  deepClone,
  downloadText,
  readTextFile,
  selectedScopeKeys,
  buildExportFilename,
  buildAppFilenameLabel,
  extractAppNameFromBundle
} from '../utils.js';
import { buildApiPrefix, fetchBundle, pickBundleSections } from '../api.js';
import { pickSettingsBundle } from '../settingsBundleImport.js';
import {
  computeDiffRows,
  getActualDiffRows,
  countActualDiffRows,
  summarizeRows,
  getDiffNormalizationPresetState
} from '../diff/engine.js';
import { enrichDiffRows, summarizeSeverity } from '../diff/enrich.js';
import {
  buildIgnoreKeySuggestions,
  resolveDiffExportRows,
  resolveDiffExportContentMode,
  shouldIncludeComparedContent,
  resolveDiffExportComparedScopes,
  buildDiffExportComparedBundles,
  getDiffExportContentLabel
} from '../diff/filter.js';
import {
  buildDiffWarningInfo,
  buildDiffHtml,
  buildPatchPayload,
  buildDiffExportPayload
} from '../diff/export.js';
import {
  renderResultRows,
  renderDiffFilterOptions,
  syncDiffThemeButton,
  MAIN_RESULT_IDLE_HTML
} from '../diff/export.js';
import {
  renderBundleState,
  renderIgnoreKeyChips,
  renderLookupMapRows,
  renderReflectNodeList,
  renderReflectSidebar,
  renderReflectMainPanel,
  renderScopePickerSummaries,
  setStatus,
  switchTab,
  switchSubTab,
  showLauncherScreen
} from '../ui/components.js';
import {
  getCurrentDialogPosition,
  applyDialogPosition,
  applyDialogSize,
  fitDialogToViewport,
  getDefaultDialogPosition,
  applyDialogSizePreset,
  getRoot,
  getToolDocument
} from '../ui/dialog.js';
import { getPreviewCompareStatusPrefix } from './preview-compare.js';
import { isReflectNodeModeEffective } from '../reflect/nodeModeUi.js';

// ---------------------------------------------------------------------------
// Ignore preset helpers
// ---------------------------------------------------------------------------

export function getIgnorePresetState() {
  return {
    fieldOrder: !!ui.ignorePresetFieldOrder?.checked,
    meta: !!ui.ignorePresetMeta?.checked,
    labelName: !!ui.ignorePresetLabelName?.checked
  };
}

export function applyIgnorePresetKeysToInput(options: any = {}) {
  const current = new Set((ui.ignoreKeys.value || '').split(',').map((k) => k.trim()).filter(Boolean));
  const preset = getIgnorePresetState();
  const removeDisabled = !!options.removeDisabled;
  Object.entries(IGNORE_PRESET_KEYS).forEach(([name, keys]) => {
    const enabled = !!preset[name];
    keys.forEach((key) => {
      if (enabled) current.add(key);
      else if (removeDisabled) current.delete(key);
    });
  });
  ui.ignoreKeys.value = [...current].join(', ');
  renderIgnoreKeyChips();
}

export function addIgnoreKeyFromInput() {
  const input = getToolDocument().getElementById('u_ignoreKeyInput') as HTMLInputElement | null;
  if (!input) return;
  const key = input.value.trim();
  if (!key) return;
  const current = (ui.ignoreKeys.value || '').split(',').map((k) => k.trim()).filter(Boolean);
  if (!current.includes(key)) {
    current.push(key);
    ui.ignoreKeys.value = current.join(', ');
    renderIgnoreKeyChips();
    saveCurrentDialogState();
  }
  input.value = '';
  input.focus();
}

// ---------------------------------------------------------------------------
// Common params
// ---------------------------------------------------------------------------

export function commonParams() {
  return {
    source: {
      appId: ui.sourceApp.value.trim(),
      guestId: ui.sourceGuest.value.trim(),
      preview: ui.sourcePreview.checked
    },
    target: {
      appId: ui.targetApp.value.trim(),
      guestId: ui.targetGuest.value.trim(),
      preview: ui.targetPreview.checked
    }
  };
}

// ---------------------------------------------------------------------------
// Bundle helpers
// ---------------------------------------------------------------------------

export function parseBundleLikeObject(raw, side) {
  let obj = raw;
  if (obj && typeof obj === 'object' && obj.source && obj.target) {
    obj = side === 'source' ? obj.source : obj.target;
  }
  const appId = side === 'source' ? ui?.sourceApp?.value?.trim?.() : ui?.targetApp?.value?.trim?.();
  return pickSettingsBundle(obj, { side, appId });
}

export function currentDiffSignature() {
  const c = commonParams();
  return stableStringify({
    source: c.source,
    target: c.target,
    scopes: selectedScopeKeys(ui.diffScopes),
    ignoreKeys: ui.ignoreKeys.value.trim(),
    includeSame: !!ui.diffIncludeSame?.checked,
    normalization: getDiffNormalizationPresetState(),
    importedSource: !!state.importedSourceBundle,
    importedTarget: !!state.importedTargetBundle
  });
}

export function openDiffReviewFold(options: any = {}) {
  const fold = getToolDocument().getElementById('u_diffReviewFold') as HTMLDetailsElement | null;
  if (!fold) return null;
  fold.open = true;
  if (options.scroll) {
    fold.scrollIntoView({ behavior: options.behavior || 'smooth', block: 'start' });
  }
  return fold;
}

export async function ensureDiffPreparedForReflect() {
  const sig = currentDiffSignature();
  if (state.lastDiffAt && state.lastDiffSignature === sig) return;
  setStatus('差分が未作成または条件変更のため、自動で差分比較を実行します...');
  await runDiff();
}

export async function importBundleFromFile(side, file) {
  const text = await readTextFile(file);
  const raw = JSON.parse(text);
  const bundle = parseBundleLikeObject(raw, side);
  if (side === 'source') {
    state.importedSourceBundle = bundle;
    state.importedSourceName = file.name || '';
    state.lastSourceBundle = bundle;
  } else {
    state.importedTargetBundle = bundle;
    state.importedTargetName = file.name || '';
    state.lastTargetBundle = bundle;
  }
  state.lastDiffAt = null;
  state.lastDiffRows = [];
  state.lastFetchIssues = [];
  state.lastDiffTruncation = null;
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
  renderResultRows([]);
  renderBundleState();
  renderReflectSidebar();
  renderReflectMainPanel();
}

// ---------------------------------------------------------------------------
// resolveBundle (fetch or use imported)
// ---------------------------------------------------------------------------

async function resolveBundle(side: 'source' | 'target', params: any, scopes: string[], onProgress?: (p: number, l: string) => void, options: { skipImported?: boolean } = {}) {
  const imported = side === 'source' ? state.importedSourceBundle : state.importedTargetBundle;
  if (imported && !(options?.skipImported)) return pickBundleSections(imported, scopes);
  return fetchBundle({ ...params, sections: scopes, onProgress });
}

// ---------------------------------------------------------------------------
// runDiff
// ---------------------------------------------------------------------------

export async function runDiff() {
  bumpSessionMetric('diffRun');
  const c = commonParams();
  const scopes = selectedScopeKeys(ui.diffScopes);
  if (!scopes.length) throw new Error('比較セクションを選択してください');
  if (!state.importedSourceBundle && !c.source.appId) throw new Error('比較元アプリIDを入力してください');
  if (!state.importedTargetBundle && !c.target.appId) throw new Error('比較先アプリIDを入力してください');
  saveCurrentDialogState();

  const modeTag = getPreviewCompareStatusPrefix(ui);
  setStatus(`${modeTag} 比較元を取得中...`);
  const source = await resolveBundle('source', c.source, scopes, (p, l) => setStatus(`${modeTag} 比較元を取得中 ${Math.round(p * 100)}% (${l})`));
  setStatus(`${modeTag} 比較先を取得中...`);
  const target = await resolveBundle('target', c.target, scopes, (p, l) => setStatus(`${modeTag} 比較先を取得中 ${Math.round(p * 100)}% (${l})`));

  setStatus('差分計算中...');
  const diffResult = computeDiffRows(source, target, scopes, ui.ignoreKeys.value, {
    normalizationPresetState: getDiffNormalizationPresetState(),
    includeSame: !!ui.diffIncludeSame?.checked
  });
  const rows = enrichDiffRows(diffResult.rows, source, target);
  state.lastSourceBundle = source;
  state.lastTargetBundle = target;
  state.lastDiffRows = rows;
  state.lastFetchIssues = diffResult.fetchIssues || [];
  state.lastDiffTruncation = diffResult.truncation?.truncated ? diffResult.truncation : null;
  state.lastDiffAt = new Date().toISOString();
  state.lastDiffSignature = currentDiffSignature();
  state.lastApplyPlan = null;
  state.diffSectionVisibleCounts = {};
  state.diffSelectedIds = new Set();
  state.diffExcludeSections = null;

  state.diffIgnoreSuggestions = buildIgnoreKeySuggestions(rows, ui.ignoreKeys.value);
  renderDiffFilterOptions();
  openDiffReviewFold();
  renderResultRows(rows);
  const { loadReflectRowsFromLastDiff } = await import('./reflect.js');
  if (isReflectNodeModeEffective() || state.reflectRows.length) {
    try {
      loadReflectRowsFromLastDiff();
    } catch (e) {
      console.warn(e);
    }
  }
  const s = summarizeRows(rows);
  const sev = summarizeSeverity(rows);
  const warning = buildDiffWarningInfo(rows, state.lastFetchIssues);
  renderBundleState();
  renderReflectSidebar();
  renderReflectMainPanel();
  const truncationNote = state.lastDiffTruncation
    ? ` / ⚠ 差分上限${state.lastDiffTruncation.diffLimit}件到達（結果は不完全）`
    : '';
  setStatus(`差分比較完了: 差分 ${countActualDiffRows(rows)}件 / 同一 ${s.same}件 / 取得失敗 ${state.lastFetchIssues.length}件${truncationNote}${warning.exceeded ? ` / 警告 ${warning.total}>=${warning.threshold}` : ''} (追加:${s.added} / 削除:${s.removed} / 変更:${s.changed} / 移動:${s.moved} / 高:${sev.high} / 中:${sev.medium} / 低:${sev.low})`);
}

// ---------------------------------------------------------------------------
// runDiffAndPreviewPlan
// ---------------------------------------------------------------------------

export async function runDiffAndPreviewPlan() {
  await runDiff();
  switchTab('reflect');
  if (ui.result) ui.result.innerHTML = MAIN_RESULT_IDLE_HTML;
  const { runPreviewApplyPlan } = await import('../reflect/plan.js');
  await runPreviewApplyPlan();
  setStatus('差分比較→実行前プラン確認 が完了しました');
}

// ---------------------------------------------------------------------------
// Diff summary/export functions
// ---------------------------------------------------------------------------

export async function exportBundleJson() {
  if (!state.lastSourceBundle || !state.lastTargetBundle) throw new Error('先に差分比較を実行してください');
  const sourceLabel = buildAppFilenameLabel(state.lastSourceBundle?.appId, extractAppNameFromBundle(state.lastSourceBundle));
  const targetLabel = buildAppFilenameLabel(state.lastTargetBundle?.appId, extractAppNameFromBundle(state.lastTargetBundle));
  const payload = {
    generatedAt: new Date().toISOString(),
    source: state.lastSourceBundle,
    target: state.lastTargetBundle
  };
  downloadText(
    buildExportFilename('比較バンドル', 'json', { appLabel: `${sourceLabel}_vs_${targetLabel}` }),
    JSON.stringify(payload, null, 2),
    'application/json'
  );
  setStatus('バンドルJSONを保存しました');
}

export async function exportDiffJson() {
  if (!state.lastSourceBundle || !state.lastTargetBundle) throw new Error('先に差分比較を実行してください');
  const exportInfo = resolveDiffExportRows();
  const exportContentMode = resolveDiffExportContentMode();
  const compareInfo = shouldIncludeComparedContent(exportContentMode)
    ? buildDiffExportComparedBundles(
      state.lastSourceBundle,
      state.lastTargetBundle,
      resolveDiffExportComparedScopes(exportInfo, selectedScopeKeys(ui.diffScopes))
    )
    : null;
  if (!exportInfo.rows.length && !state.lastFetchIssues.length && !compareInfo?.scopes?.length) {
    throw new Error('出力できる比較結果がありません');
  }
  const payload = buildDiffExportPayload({
    sourceBundle: state.lastSourceBundle,
    targetBundle: state.lastTargetBundle,
    rows: exportInfo.rows,
    fetchIssues: state.lastFetchIssues,
    ignoreKeys: ui.ignoreKeys.value,
    exportMode: exportInfo.mode,
    exportLabel: exportInfo.label,
    exportContentMode,
    exportContentLabel: getDiffExportContentLabel(exportContentMode),
    normalizationState: getDiffNormalizationPresetState(),
    warning: buildDiffWarningInfo(exportInfo.rows, state.lastFetchIssues),
    compareScopes: compareInfo?.scopes || [],
    compareSourceBundle: compareInfo?.sourceBundle || null,
    compareTargetBundle: compareInfo?.targetBundle || null
  });
  const sourceLabel = buildAppFilenameLabel(state.lastSourceBundle?.appId, extractAppNameFromBundle(state.lastSourceBundle));
  const targetLabel = buildAppFilenameLabel(state.lastTargetBundle?.appId, extractAppNameFromBundle(state.lastTargetBundle));
  downloadText(
    buildExportFilename('差分', 'json', { appLabel: `${sourceLabel}_vs_${targetLabel}` }),
    JSON.stringify(payload, null, 2),
    'application/json'
  );
  setStatus(`差分JSONを保存しました (${exportInfo.label} / ${getDiffExportContentLabel(exportContentMode)})`);
}

export async function exportDiffHtml() {
  if (!state.lastSourceBundle || !state.lastTargetBundle) throw new Error('先に差分比較を実行してください');
  const scopes = selectedScopeKeys(ui.diffScopes);

  // Always recompute with includeSame: true so that same items appear in HTML
  const diffResult = computeDiffRows(state.lastSourceBundle, state.lastTargetBundle, scopes, ui.ignoreKeys.value, {
    normalizationPresetState: getDiffNormalizationPresetState(),
    includeSame: true
  });
  const rows = enrichDiffRows(diffResult.rows, state.lastSourceBundle, state.lastTargetBundle);

  const exportContentMode = resolveDiffExportContentMode();
  const exportInfo = { mode: 'all', label: '全差分（同一含む）', rows };
  const compareInfo = shouldIncludeComparedContent(exportContentMode)
    ? buildDiffExportComparedBundles(
      state.lastSourceBundle,
      state.lastTargetBundle,
      resolveDiffExportComparedScopes(exportInfo, scopes)
    )
    : null;
  if (!rows.length && !state.lastFetchIssues.length && !compareInfo?.scopes?.length) {
    throw new Error('出力できる比較結果がありません');
  }
  const html = buildDiffHtml(state.lastSourceBundle, state.lastTargetBundle, rows, scopes, ui.ignoreKeys.value, {
    fetchIssues: state.lastFetchIssues,
    exportMode: exportInfo.mode,
    exportLabel: exportInfo.label,
    exportContentMode,
    exportContentLabel: getDiffExportContentLabel(exportContentMode),
    compareScopes: compareInfo?.scopes || [],
    compareSourceBundle: compareInfo?.sourceBundle || null,
    compareTargetBundle: compareInfo?.targetBundle || null,
    normalizationState: getDiffNormalizationPresetState(),
    warning: buildDiffWarningInfo(rows, state.lastFetchIssues)
  });
  const sourceLabel = buildAppFilenameLabel(state.lastSourceBundle?.appId, extractAppNameFromBundle(state.lastSourceBundle));
  const targetLabel = buildAppFilenameLabel(state.lastTargetBundle?.appId, extractAppNameFromBundle(state.lastTargetBundle));
  downloadText(buildExportFilename('差分', 'html', { appLabel: `${sourceLabel}_vs_${targetLabel}` }), html, 'text/html');
  setStatus(`差分HTMLを保存しました (${exportInfo.label} / ${getDiffExportContentLabel(exportContentMode)})`);
}

export async function exportPatchJson() {
  if (!state.lastDiffRows.length) throw new Error('先に差分比較を実行してください');
  const exportInfo = resolveDiffExportRows();
  if (!countActualDiffRows(exportInfo.rows)) throw new Error('出力できる差分がありません');
  const payload = buildPatchPayload(exportInfo.rows, state.lastSourceBundle, state.lastTargetBundle);
  const sourceLabel = buildAppFilenameLabel(state.lastSourceBundle?.appId, extractAppNameFromBundle(state.lastSourceBundle));
  const targetLabel = buildAppFilenameLabel(state.lastTargetBundle?.appId, extractAppNameFromBundle(state.lastTargetBundle));
  downloadText(
    buildExportFilename('差分パッチ', 'json', { appLabel: `${sourceLabel}_vs_${targetLabel}` }),
    JSON.stringify(payload, null, 2),
    'application/json'
  );
  setStatus(`パッチJSONを保存しました (${exportInfo.label})`);
}

// ---------------------------------------------------------------------------
// Save / Restore dialog state
// ---------------------------------------------------------------------------

export function saveCurrentDialogState() {
  const root = getRoot();
  if (!root) return;
  const dialogRect = root.getBoundingClientRect();
  const dialogPos = getCurrentDialogPosition(dialogRect.width || DIALOG_DEFAULT_WIDTH, dialogRect.height || DIALOG_DEFAULT_HEIGHT);
  saveDialogState({
    activeTab: state.activeTab,
    activeFeatureKey: state.activeFeatureKey || '',
    activeSubTabs: { ...state.activeSubTabs },
    screenMode: getRoot()?.classList.contains('screen-feature') ? 'feature' : 'launcher',
    launcherSortMode: ui.featureSortMode?.value || state.launcherSortMode || 'onboarding',
    dialogWidth: Math.round(dialogRect.width || DIALOG_DEFAULT_WIDTH),
    dialogHeight: Math.round(dialogRect.height || DIALOG_DEFAULT_HEIGHT),
    dialogLeft: dialogPos.left,
    dialogTop: dialogPos.top,
    sourceAppId: ui.sourceApp.value.trim(),
    sourceGuestId: ui.sourceGuest.value.trim(),
    sourcePreview: ui.sourcePreview.checked,
    targetAppId: ui.targetApp.value.trim(),
    targetGuestId: ui.targetGuest.value.trim(),
    targetConnections: [...getToolDocument().querySelectorAll('[data-conn-target-row]')].map((row: any) => ({
      appId: String((row.querySelector('[data-conn-target-app], #u_targetApp') as HTMLInputElement | null)?.value || '').trim(),
      guestId: String((row.querySelector('[data-conn-target-guest], #u_targetGuest') as HTMLInputElement | null)?.value || '').trim()
    })).filter((r) => r.appId || r.guestId),
    targetPreview: ui.targetPreview.checked,
    connectionSearchKeyword: ui.connectionSearchKeyword?.value?.trim?.() || '',
    connectionSearchGuest: ui.connectionSearchGuest?.value?.trim?.() || '',
    connectionSearchAssign: ui.connectionSearchAssign?.value || 'source',
    lookupMap: ui.lookupMap.value.trim(),
    ignoreKeys: ui.ignoreKeys.value.trim(),
    ignorePresetFieldOrder: !!ui.ignorePresetFieldOrder?.checked,
    ignorePresetMeta: !!ui.ignorePresetMeta?.checked,
    ignorePresetLabelName: !!ui.ignorePresetLabelName?.checked,
    diffNormalizeViewOrder: !!ui.diffNormalizeViewOrder?.checked,
    diffNormalizePermissionOrder: !!ui.diffNormalizePermissionOrder?.checked,
    diffSearch: ui.diffSearch.value.trim(),
    diffSearchFieldName: !!ui.diffSearchFieldName?.checked,
    diffFilterSection: ui.diffFilterSection?.value || state.diffFilterSection || '',
    diffFilterType: ui.diffFilterType?.value || '',
    diffFilterTableOnly: !!ui.diffFilterTableOnly?.checked,
    diffFilterTableKeyword: ui.diffFilterTableKeyword?.value?.trim?.() || '',
    diffIncludeSame: !!ui.diffIncludeSame?.checked,
    diffFilterSeverity: ui.diffFilterSeverity?.value || '',
    diffExportMode: ui.diffExportMode?.value || state.diffExportMode || 'all',
    diffExportContent: ui.diffExportContent?.value || state.diffExportContent || 'diffOnly',
    diffWarnThreshold: ui.diffWarnThreshold?.value?.trim?.() || '',
    charDiff: ui.charDiff.checked,
    diffTheme: state.diffViewTheme,
    diffViewMode: state.diffViewMode || 'table',
    diffCategoryView: state.diffCategoryView || '',
    diffScopes: selectedScopeKeys(ui.diffScopes),
    applyScopes: selectedScopeKeys(ui.applyScopes),
    applyDiffOnly: ui.applyDiffOnly.checked,
    autoBackupPreview: ui.autoBackupPreview.checked,
    stopOnError: ui.stopOnError.checked,
    nodeMode: state.activeSubTabs.reflect === 'diff',
    reflectSimpleMode: !!ui.reflectSimpleMode?.checked,
    reflectDetailTab: state.reflectDetailTab,
    reflectApplyChecklist: {
      diff: !!state.reflectApplyChecklist?.diff,
      plan: !!state.reflectApplyChecklist?.plan,
      preview: !!state.reflectApplyChecklist?.preview,
      target: !!state.reflectApplyChecklist?.target
    },
    doDeploy: ui.doDeploy.checked,
    overwriteField: ui.overwriteField.checked,
    deployField: ui.deployField.checked,
    erLayout: ui.erLayout?.value || 'dagre',
    erFieldDensity: ui.erFieldDensity?.value || 'standard',
    erMaxDepth: ui.erMaxDepth?.value?.trim?.() || '0',
    erExtraApps: ui.erExtraApps?.value?.trim?.() || '',
    erIncludeSubtable: !!ui.erIncludeSubtable?.checked,
    erIncludeReverseLookup: !!ui.erIncludeReverseLookup?.checked,
    settingsExportAppIds: ui.settingsExportAppIds.value.trim(),
    settingsExportSearchKeyword: ui.settingsExportSearchKeyword.value.trim(),
    settingsExportGuest: ui.settingsExportGuest.value.trim(),
    settingsExportPreview: ui.settingsExportPreview.checked,
    settingsExportIncludePluginConfig: !!ui.settingsExportIncludePluginConfig?.checked,
    settingsExportScopes: selectedScopeKeys(ui.settingsExportScopes),
    recordBackupView: ui.recordBackupView?.value?.trim?.() || '',
    recordBackupZipName: ui.recordBackupZipName?.value?.trim?.() || 'record_backup.zip',
    recordBackupIncludeFiles: !!ui.recordBackupIncludeFiles?.checked,
    recordBackupIncludeComments: !!ui.recordBackupIncludeComments?.checked,
    diffHideViewed: !!state.diffHideViewed,
    diffViewedKeys: [...(state.diffViewedKeys || new Set())].slice(0, 2000),
    diffReviewMeta: Object.fromEntries(
      (Object.entries(state.diffReviewMeta || ({} as any)) as Array<[string, any]>)
        .filter(([key, value]) => key && value && typeof value === 'object')
        .slice(0, 2000)
        .map(([key, value]: [string, any]): [string, { status: string; note: string }] => [
          key,
          {
            status: value.status === 'todo' || value.status === 'ignored' ? value.status : '',
            note: String(value.note || '').trim().slice(0, 500)
          }
        ])
        .filter(([, value]) => value.status || value.note)
    )
  });
}

export function restoreDialogState() {
  const saved = loadDialogState();
  Object.entries(DEFAULT_SUBTAB_STATE).forEach(([parentKey, subKey]) => {
    switchSubTab(parentKey, subKey, { persist: false });
  });
  if (!saved || typeof saved !== 'object') {
    const initialPos = getDefaultDialogPosition(DIALOG_DEFAULT_WIDTH, DIALOG_DEFAULT_HEIGHT);
    applyDialogPosition(initialPos.left, initialPos.top, { persist: false });
    return;
  }
  let restoredSize;
  if (saved.dialogWidth != null || saved.dialogHeight != null) {
    restoredSize = applyDialogSize(saved.dialogWidth, saved.dialogHeight, { persist: false });
  } else {
    restoredSize = fitDialogToViewport({ persist: false });
  }
  if (saved.dialogLeft != null || saved.dialogTop != null) {
    applyDialogPosition(saved.dialogLeft, saved.dialogTop, { persist: false });
  } else {
    const defaultPos = getDefaultDialogPosition(restoredSize?.width, restoredSize?.height);
    applyDialogPosition(defaultPos.left, defaultPos.top, { persist: false });
  }
  if (saved.sourceAppId != null) ui.sourceApp.value = String(saved.sourceAppId);
  if (saved.sourceGuestId != null) ui.sourceGuest.value = String(saved.sourceGuestId);
  if (saved.sourcePreview != null) ui.sourcePreview.checked = !!saved.sourcePreview;
  if (saved.targetAppId != null) ui.targetApp.value = String(saved.targetAppId);
  if (saved.targetGuestId != null) ui.targetGuest.value = String(saved.targetGuestId);
  if (Array.isArray(saved.targetConnections)) {
    const rows = [...getToolDocument().querySelectorAll('[data-conn-target-row]')] as HTMLTableRowElement[];
    rows.slice(1).forEach((row) => row.remove());
    const first = getToolDocument().querySelector('[data-conn-target-row]') as HTMLTableRowElement | null;
    const applyRow = (row: HTMLTableRowElement | null, item: any) => {
      if (!row) return;
      const app = row.querySelector('[data-conn-target-app], #u_targetApp') as HTMLInputElement | null;
      const guest = row.querySelector('[data-conn-target-guest], #u_targetGuest') as HTMLInputElement | null;
      if (app) app.value = String(item?.appId || '');
      if (guest) guest.value = String(item?.guestId || '');
    };
    if (saved.targetConnections.length) applyRow(first, saved.targetConnections[0]);
    saved.targetConnections.slice(1).forEach((item: any, idx: number) => {
      if (!first?.parentElement) return;
      const row = first.cloneNode(true) as HTMLTableRowElement;
      row.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      applyRow(row, item);
      const role = row.querySelector('.connection-table__role') as HTMLElement | null;
      if (role) role.textContent = `比較先 ${idx + 2}`;
      const actions = row.querySelector('.connection-table__actions') as HTMLElement | null;
      if (actions && !actions.querySelector('[data-act="removeConnectionRow"]')) {
        const btn = getToolDocument().createElement('button');
        btn.type = 'button';
        btn.className = 'btn sub danger';
        btn.dataset.act = 'removeConnectionRow';
        btn.title = 'この比較先行を削除';
        btn.textContent = '削除';
        actions.appendChild(btn);
      }
      first.parentElement.appendChild(row);
    });
  }
  if (saved.targetPreview != null) ui.targetPreview.checked = !!saved.targetPreview;
  if (saved.connectionSearchKeyword != null && ui.connectionSearchKeyword) ui.connectionSearchKeyword.value = String(saved.connectionSearchKeyword);
  if (saved.connectionSearchGuest != null && ui.connectionSearchGuest) ui.connectionSearchGuest.value = String(saved.connectionSearchGuest);
  if (saved.connectionSearchAssign != null && ui.connectionSearchAssign) ui.connectionSearchAssign.value = String(saved.connectionSearchAssign || 'source');
  if (saved.lookupMap != null) ui.lookupMap.value = String(saved.lookupMap);
  if (saved.ignoreKeys != null) ui.ignoreKeys.value = String(saved.ignoreKeys);
  if (saved.ignorePresetFieldOrder != null && ui.ignorePresetFieldOrder) ui.ignorePresetFieldOrder.checked = !!saved.ignorePresetFieldOrder;
  if (saved.ignorePresetMeta != null && ui.ignorePresetMeta) ui.ignorePresetMeta.checked = !!saved.ignorePresetMeta;
  if (saved.ignorePresetLabelName != null && ui.ignorePresetLabelName) ui.ignorePresetLabelName.checked = !!saved.ignorePresetLabelName;
  if (saved.diffNormalizeViewOrder != null && ui.diffNormalizeViewOrder) ui.diffNormalizeViewOrder.checked = !!saved.diffNormalizeViewOrder;
  if (saved.diffNormalizePermissionOrder != null && ui.diffNormalizePermissionOrder) ui.diffNormalizePermissionOrder.checked = !!saved.diffNormalizePermissionOrder;
  if (saved.diffSearch != null) ui.diffSearch.value = String(saved.diffSearch);
  if (saved.diffSearchFieldName != null && ui.diffSearchFieldName) {
    ui.diffSearchFieldName.checked = !!saved.diffSearchFieldName;
    state.diffSearchFieldName = !!saved.diffSearchFieldName;
  }
  if (saved.diffFilterSection != null) state.diffFilterSection = String(saved.diffFilterSection);
  if (saved.diffFilterType != null && ui.diffFilterType) ui.diffFilterType.value = String(saved.diffFilterType || '');
  if (saved.diffFilterSeverity != null && ui.diffFilterSeverity) ui.diffFilterSeverity.value = String(saved.diffFilterSeverity || '');
  if (saved.diffFilterTableOnly != null && ui.diffFilterTableOnly) ui.diffFilterTableOnly.checked = !!saved.diffFilterTableOnly;
  if (saved.diffFilterTableKeyword != null && ui.diffFilterTableKeyword) ui.diffFilterTableKeyword.value = String(saved.diffFilterTableKeyword || '');
  state.diffFilterTableOnly = !!ui.diffFilterTableOnly?.checked;
  state.diffFilterTableKeyword = String(ui.diffFilterTableKeyword?.value || '').trim();
  if (saved.diffExportMode != null && ui.diffExportMode) ui.diffExportMode.value = String(saved.diffExportMode || 'all');
  state.diffExportMode = ui.diffExportMode?.value || String(saved.diffExportMode || 'all');
  if (saved.diffExportContent != null && ui.diffExportContent) ui.diffExportContent.value = String(saved.diffExportContent || 'diffOnly');
  state.diffExportContent = ui.diffExportContent?.value || String(saved.diffExportContent || 'diffOnly');
  if (saved.diffWarnThreshold != null && ui.diffWarnThreshold) ui.diffWarnThreshold.value = String(saved.diffWarnThreshold || '');
  if (saved.charDiff != null) ui.charDiff.checked = !!saved.charDiff;
  if (saved.diffIncludeSame != null && ui.diffIncludeSame) { ui.diffIncludeSame.checked = !!saved.diffIncludeSame; state.diffIncludeSame = !!saved.diffIncludeSame; }
  if (saved.diffTheme === 'dark' || saved.diffTheme === 'light') state.diffViewTheme = saved.diffTheme;
  if (saved.diffViewMode === 'category' || saved.diffViewMode === 'table') state.diffViewMode = saved.diffViewMode;
  if (typeof saved.diffCategoryView === 'string') state.diffCategoryView = saved.diffCategoryView;
  if (saved.applyDiffOnly != null) ui.applyDiffOnly.checked = !!saved.applyDiffOnly;
  if (saved.autoBackupPreview != null) ui.autoBackupPreview.checked = !!saved.autoBackupPreview;
  if (saved.stopOnError != null) ui.stopOnError.checked = !!saved.stopOnError;
  if (saved.nodeMode != null) ui.nodeMode.checked = !!saved.nodeMode;
  if (saved.reflectSimpleMode != null && ui.reflectSimpleMode) ui.reflectSimpleMode.checked = !!saved.reflectSimpleMode;
  if (ui.reflectSimpleMode?.checked) ui.nodeMode.checked = false;
  if (saved.reflectDetailTab != null) state.reflectDetailTab = String(saved.reflectDetailTab || 'diff');
  if (saved.reflectApplyChecklist && typeof saved.reflectApplyChecklist === 'object') {
    state.reflectApplyChecklist = {
      diff: !!saved.reflectApplyChecklist.diff,
      plan: !!saved.reflectApplyChecklist.plan,
      preview: !!saved.reflectApplyChecklist.preview,
      target: !!saved.reflectApplyChecklist.target
    };
    state.reflectPreviewOpened = !!saved.reflectApplyChecklist.preview;
  }
  if (saved.doDeploy != null) ui.doDeploy.checked = !!saved.doDeploy;
  if (saved.overwriteField != null) ui.overwriteField.checked = !!saved.overwriteField;
  if (saved.deployField != null) ui.deployField.checked = !!saved.deployField;
  if (saved.erLayout != null && ui.erLayout) ui.erLayout.value = String(saved.erLayout || 'dagre');
  if (saved.erFieldDensity != null && ui.erFieldDensity) ui.erFieldDensity.value = String(saved.erFieldDensity || 'standard');
  if (saved.erMaxDepth != null && ui.erMaxDepth) ui.erMaxDepth.value = String(saved.erMaxDepth || '0');
  if (saved.erExtraApps != null && ui.erExtraApps) ui.erExtraApps.value = String(saved.erExtraApps || '');
  if (saved.erIncludeSubtable != null && ui.erIncludeSubtable) ui.erIncludeSubtable.checked = !!saved.erIncludeSubtable;
  if (saved.erIncludeReverseLookup != null && ui.erIncludeReverseLookup) ui.erIncludeReverseLookup.checked = !!saved.erIncludeReverseLookup;
  if (saved.settingsExportAppIds != null) ui.settingsExportAppIds.value = String(saved.settingsExportAppIds);
  if (saved.settingsExportSearchKeyword != null) ui.settingsExportSearchKeyword.value = String(saved.settingsExportSearchKeyword);
  if (saved.settingsExportGuest != null) ui.settingsExportGuest.value = String(saved.settingsExportGuest);
  if (saved.settingsExportPreview != null) ui.settingsExportPreview.checked = !!saved.settingsExportPreview;
  if (saved.settingsExportIncludePluginConfig != null && ui.settingsExportIncludePluginConfig) ui.settingsExportIncludePluginConfig.checked = !!saved.settingsExportIncludePluginConfig;
  // 復元したアプリID一覧（mirror）を表入力へ反映する
  if (saved.settingsExportAppIds != null) {
    try { getAppTargetTable('settingsExport')?.syncFromMirror(); } catch (e) { /* ignore */ }
  }
  if (saved.recordBackupView != null && ui.recordBackupView) ui.recordBackupView.value = String(saved.recordBackupView || '');
  if (saved.recordBackupZipName != null && ui.recordBackupZipName) ui.recordBackupZipName.value = String(saved.recordBackupZipName || 'record_backup.zip');
  if (saved.recordBackupIncludeFiles != null && ui.recordBackupIncludeFiles) ui.recordBackupIncludeFiles.checked = !!saved.recordBackupIncludeFiles;
  if (saved.recordBackupIncludeComments != null && ui.recordBackupIncludeComments) ui.recordBackupIncludeComments.checked = !!saved.recordBackupIncludeComments;
  if (saved.diffHideViewed != null) state.diffHideViewed = !!saved.diffHideViewed;
  if (Array.isArray(saved.diffViewedKeys)) {
    // 旧形式 (TAB区切り3つ: section\tpath\ttype) は「全スコープ共通」として `\t` 接頭辞で保持。
    // 新形式 (TAB区切り4つ: scope\tsection\tpath\ttype) はそのまま採用。
    state.diffViewedKeys = new Set(
      saved.diffViewedKeys
        .filter((k) => typeof k === 'string' && k.length)
        .map((k) => (k.split('\t').length === 3 ? `\t${k}` : k))
    );
  }
  if (saved.diffReviewMeta && typeof saved.diffReviewMeta === 'object') {
    state.diffReviewMeta = {};
    Object.entries(saved.diffReviewMeta).slice(0, 2000).forEach(([key, value]: [string, any]) => {
      if (!key || !value || typeof value !== 'object') return;
      const status = value.status === 'todo' || value.status === 'ignored' ? value.status : '';
      const note = String(value.note || '').trim().slice(0, 500);
      if (!status && !note) return;
      const normalizedKey = key.split('\t').length === 3 ? `\t${key}` : key;
      state.diffReviewMeta[normalizedKey] = { status, note };
    });
  }
  if (saved.launcherSortMode != null) {
    state.launcherSortMode = String(saved.launcherSortMode) === 'usage' ? 'usage' : 'onboarding';
    if (ui.featureSortMode) ui.featureSortMode.value = state.launcherSortMode;
  }

  const markChecks = (container, selected) => {
    if (!Array.isArray(selected)) return;
    const set = new Set(selected);
    [...container.querySelectorAll('input[type="checkbox"]')].forEach((c) => {
      c.checked = set.has(c.value);
    });
  };
  markChecks(ui.diffScopes, saved.diffScopes);
  markChecks(ui.applyScopes, saved.applyScopes);
  markChecks(ui.settingsExportScopes, saved.settingsExportScopes);
  renderScopePickerSummaries();
  const REFLECT_SUBTAB_MIGRATION = {
    section: 'settings',
    editor: 'settings',
    sectionPreview: 'settings',
    patch: 'json',
    node: 'diff'
  };
  Object.entries(DEFAULT_SUBTAB_STATE).forEach(([parentKey, defaultKey]) => {
    let nextKey = (saved.activeSubTabs && typeof saved.activeSubTabs === 'object')
      ? String(saved.activeSubTabs[parentKey] || defaultKey)
      : defaultKey;
    if (parentKey === 'reflect' && REFLECT_SUBTAB_MIGRATION[nextKey]) {
      nextKey = REFLECT_SUBTAB_MIGRATION[nextKey];
    }
    switchSubTab(parentKey, nextKey, { persist: false });
  });
  let nextActive = saved.activeTab;
  if (nextActive === 'common') nextActive = 'reflect';
  if (nextActive && ui.tabs.some((t) => t.dataset.tab === nextActive)) {
    switchTab(nextActive, { persist: false });
  }
  // Re-open時は前回の機能画面を復元せず、常にトップ（ランチャー）へ戻す。
  showLauncherScreen({ persist: false });
  applyIgnorePresetKeysToInput();
  renderIgnoreKeyChips();
  renderLookupMapRows();
  const rootEl = getRoot();
  if (rootEl?.classList.contains('tab-is-diff')) {
    renderResultRows(state.lastDiffRows || []);
  }
}
