'use strict';

import { SECTION_DEFS, IGNORE_PRESET_KEYS, DEFAULT_SUBTAB_STATE, DIALOG_DEFAULT_WIDTH, DIALOG_DEFAULT_HEIGHT } from '../constants.js';
import { state, ui, saveDialogState, loadDialogState } from '../state.js';
import { esc, stableStringify, deepClone, nowStamp, downloadText, readTextFile, selectedScopeKeys } from '../utils.js';
import { buildApiPrefix, fetchBundle, ensureBundleShape } from '../api.js';
import {
  computeDiffRows,
  getActualDiffRows,
  countActualDiffRows,
  summarizeRows,
  getDiffNormalizationPresetState
} from '../diff/engine.js';
import { enrichDiffRows, summarizeSeverity } from '../diff/enrich.js';
import { buildIgnoreKeySuggestions } from '../diff/filter.js';
import {
  resolveDiffExportRows,
  resolveDiffExportContentMode,
  shouldIncludeComparedContent,
  resolveDiffExportComparedScopes,
  buildDiffExportComparedBundles,
  getDiffExportContentLabel,
  groupDiffRowsBySection,
  buildDiffWarningInfo,
  buildDiffHtml,
  buildPatchPayload
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
  setStatus,
  switchTab,
  switchSubTab
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
import {
  getPreviewCompareStatusPrefix,
  syncPreviewComparePanel,
  findMatchingPresetId,
  getPreviewPresetById
} from './preview-compare.js';
import { isReflectNodeModeEffective } from '../reflect/nodeModeUi.js';
import { getDiffTypeDisplayLabel, getSeverityDisplayLabel, getIssueSideLabel, getPreviewStateLabel } from '../utils.js';

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

export function applyIgnorePresetKeysToInput(options = {}) {
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
  const input = getToolDocument().getElementById('u_ignoreKeyInput');
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
  return ensureBundleShape(obj);
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

async function resolveBundle(side, params, scopes, onProgress, options) {
  const imported = side === 'source' ? state.importedSourceBundle : state.importedTargetBundle;
  if (imported && !(options?.skipImported)) return imported;
  return fetchBundle({ ...params, sections: scopes, onProgress });
}

// ---------------------------------------------------------------------------
// runDiff
// ---------------------------------------------------------------------------

export async function runDiff() {
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
  state.lastDiffAt = new Date().toISOString();
  state.lastDiffSignature = currentDiffSignature();
  state.lastApplyPlan = null;
  state.diffSectionVisibleCounts = {};
  state.diffSelectedIds = new Set();
  state.diffExcludeSections = null;

  state.diffIgnoreSuggestions = buildIgnoreKeySuggestions(rows, ui.ignoreKeys.value);
  renderDiffFilterOptions();
  switchSubTab('diff', 'view');
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
  setStatus(`差分比較完了: 差分 ${countActualDiffRows(rows)}件 / 同一 ${s.same}件 / 取得失敗 ${state.lastFetchIssues.length}件${warning.exceeded ? ` / 警告 ${warning.total}>=${warning.threshold}` : ''} (追加:${s.added} / 削除:${s.removed} / 変更:${s.changed} / 移動:${s.moved} / 高:${sev.high} / 中:${sev.medium} / 低:${sev.low})`);
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
  setStatus('差分比較→反映プラン確認 完了');
}

// ---------------------------------------------------------------------------
// Diff summary/export functions
// ---------------------------------------------------------------------------

export async function copyDiffSummaryToClipboard() {
  if (!state.lastDiffRows.length && !state.lastFetchIssues.length) throw new Error('先に差分比較を実行してください');
  const exportInfo = resolveDiffExportRows();
  const rows = exportInfo.rows || [];
  const groups = groupDiffRowsBySection(rows);
  const lines = [];
  lines.push('kintone差分サマリー');
  lines.push(`出力対象: ${exportInfo.label}`);
  try {
    const c = commonParams();
    const pid = findMatchingPresetId(ui);
    const pl = pid ? getPreviewPresetById(pid)?.label : '';
    lines.push(`プレビュー比較: ${pl || 'カスタム'} (比較元GET=${getPreviewStateLabel(c.source.preview)} / 比較先GET=${getPreviewStateLabel(c.target.preview)})`);
  } catch (e) {
    lines.push('プレビュー比較: (取得できませんでした)');
  }
  lines.push(`比較元アプリ: ${state.lastSourceBundle?.appId || '-'}`);
  lines.push(`比較先アプリ: ${state.lastTargetBundle?.appId || '-'}`);
  lines.push(`生成日時: ${new Date().toISOString()}`);
  lines.push(`取得失敗: ${state.lastFetchIssues.length}`);
  lines.push('');
  groups.forEach((group) => {
    lines.push(`[${group.label}] ${group.rows.length}件`);
    group.rows.forEach((row) => {
      const typeLabel = getDiffTypeDisplayLabel(row.type, { moved: !!row.moved });
      const meta = [
        row.reasonSummary || '',
        row.renameCandidate ? `名称変更候補 ${row.renameCandidate.fromCode || '-'}→${row.renameCandidate.toCode || '-'}` : '',
        row.impactCount ? `影響 ${row.impactCount}件` : ''
      ].filter(Boolean).join(' / ');
      lines.push(` - ${typeLabel} / ${getSeverityDisplayLabel(row.severity || 'low')} / ${row.path || '-'}${meta ? ` / ${meta}` : ''}`);
    });
    lines.push('');
  });
  if (state.lastFetchIssues.length) {
    lines.push('[API取得失敗]');
    state.lastFetchIssues.forEach((issue) => {
      lines.push(` - ${issue.section || issue.sectionKey || '-'} / ${getIssueSideLabel(issue.side)} / ${String(issue.message || '-').replace(/\n+/g, ' | ')}`);
    });
    lines.push('');
  }
  await navigator.clipboard.writeText(lines.join('\n'));
  setStatus(`差分サマリーをコピーしました (${rows.length}件 / ${exportInfo.label})`);
}

export async function exportBundleJson() {
  if (!state.lastSourceBundle || !state.lastTargetBundle) throw new Error('先に差分比較を実行してください');
  const payload = {
    generatedAt: new Date().toISOString(),
    source: state.lastSourceBundle,
    target: state.lastTargetBundle
  };
  downloadText(`bundle_${nowStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
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
  const payload = {
    generatedAt: new Date().toISOString(),
    exportMode: exportInfo.mode,
    exportLabel: exportInfo.label,
    exportContentMode,
    exportContentLabel: getDiffExportContentLabel(exportContentMode),
    normalization: getDiffNormalizationPresetState(),
    warning: buildDiffWarningInfo(exportInfo.rows, state.lastFetchIssues),
    source: state.lastSourceBundle,
    target: state.lastTargetBundle,
    diffCount: exportInfo.rows.length,
    fetchIssues: state.lastFetchIssues,
    rows: exportInfo.rows,
    comparedScopes: compareInfo?.scopes || [],
    sourceComparedBundle: compareInfo?.sourceBundle || null,
    targetComparedBundle: compareInfo?.targetBundle || null
  };
  downloadText(`diff_${nowStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  setStatus(`差分JSONを保存しました (${exportInfo.label} / ${getDiffExportContentLabel(exportContentMode)})`);
}

export async function exportDiffHtml() {
  if (!state.lastSourceBundle || !state.lastTargetBundle) throw new Error('先に差分比較を実行してください');
  const exportInfo = resolveDiffExportRows();
  const scopes = selectedScopeKeys(ui.diffScopes);
  const exportContentMode = resolveDiffExportContentMode();
  const compareInfo = shouldIncludeComparedContent(exportContentMode)
    ? buildDiffExportComparedBundles(
      state.lastSourceBundle,
      state.lastTargetBundle,
      resolveDiffExportComparedScopes(exportInfo, scopes)
    )
    : null;
  if (!exportInfo.rows.length && !state.lastFetchIssues.length && !compareInfo?.scopes?.length) {
    throw new Error('出力できる比較結果がありません');
  }
  const html = buildDiffHtml(state.lastSourceBundle, state.lastTargetBundle, exportInfo.rows || [], scopes, ui.ignoreKeys.value, {
    fetchIssues: state.lastFetchIssues,
    exportMode: exportInfo.mode,
    exportLabel: exportInfo.label,
    exportContentMode,
    exportContentLabel: getDiffExportContentLabel(exportContentMode),
    compareScopes: compareInfo?.scopes || [],
    compareSourceBundle: compareInfo?.sourceBundle || null,
    compareTargetBundle: compareInfo?.targetBundle || null,
    normalizationState: getDiffNormalizationPresetState(),
    warning: buildDiffWarningInfo(exportInfo.rows, state.lastFetchIssues)
  });
  downloadText(`diff_${nowStamp()}.html`, html, 'text/html');
  setStatus(`差分HTMLを保存しました (${exportInfo.label} / ${getDiffExportContentLabel(exportContentMode)})`);
}

export async function exportPatchJson() {
  if (!state.lastDiffRows.length) throw new Error('先に差分比較を実行してください');
  const exportInfo = resolveDiffExportRows();
  if (!countActualDiffRows(exportInfo.rows)) throw new Error('出力できる差分がありません');
  const payload = buildPatchPayload(exportInfo.rows, state.lastSourceBundle, state.lastTargetBundle);
  downloadText(`patch_${nowStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
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
    activeSubTabs: { ...state.activeSubTabs },
    dialogWidth: Math.round(dialogRect.width || DIALOG_DEFAULT_WIDTH),
    dialogHeight: Math.round(dialogRect.height || DIALOG_DEFAULT_HEIGHT),
    dialogLeft: dialogPos.left,
    dialogTop: dialogPos.top,
    sourceAppId: ui.sourceApp.value.trim(),
    sourceGuestId: ui.sourceGuest.value.trim(),
    sourcePreview: ui.sourcePreview.checked,
    targetAppId: ui.targetApp.value.trim(),
    targetGuestId: ui.targetGuest.value.trim(),
    targetPreview: ui.targetPreview.checked,
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
    diffIncludeSame: !!ui.diffIncludeSame?.checked,
    diffFilterSeverity: ui.diffFilterSeverity?.value || '',
    diffExportMode: ui.diffExportMode?.value || state.diffExportMode || 'all',
    diffExportContent: ui.diffExportContent?.value || state.diffExportContent || 'diffOnly',
    diffWarnThreshold: ui.diffWarnThreshold?.value?.trim?.() || '',
    charDiff: ui.charDiff.checked,
    diffTheme: state.diffViewTheme,
    diffScopes: selectedScopeKeys(ui.diffScopes),
    applyScopes: selectedScopeKeys(ui.applyScopes),
    applyDiffOnly: ui.applyDiffOnly.checked,
    autoBackupPreview: ui.autoBackupPreview.checked,
    stopOnError: ui.stopOnError.checked,
    nodeMode: ui.nodeMode.checked,
    reflectSimpleMode: !!ui.reflectSimpleMode?.checked,
    reflectDetailTab: state.reflectDetailTab,
    doDeploy: ui.doDeploy.checked,
    overwriteField: ui.overwriteField.checked,
    deployField: ui.deployField.checked,
    erLayout: ui.erLayout?.value || 'dagre',
    erFieldDensity: ui.erFieldDensity?.value || 'standard',
    erMaxDepth: ui.erMaxDepth?.value?.trim?.() || '0',
    erExtraApps: ui.erExtraApps?.value?.trim?.() || '',
    erIncludeSubtable: !!ui.erIncludeSubtable?.checked,
    settingsExportAppIds: ui.settingsExportAppIds.value.trim(),
    settingsExportSearchKeyword: ui.settingsExportSearchKeyword.value.trim(),
    settingsExportGuest: ui.settingsExportGuest.value.trim(),
    settingsExportPreview: ui.settingsExportPreview.checked,
    settingsExportScopes: selectedScopeKeys(ui.settingsExportScopes)
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
  if (saved.targetPreview != null) ui.targetPreview.checked = !!saved.targetPreview;
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
  if (saved.diffExportMode != null && ui.diffExportMode) ui.diffExportMode.value = String(saved.diffExportMode || 'all');
  state.diffExportMode = ui.diffExportMode?.value || String(saved.diffExportMode || 'all');
  if (saved.diffExportContent != null && ui.diffExportContent) ui.diffExportContent.value = String(saved.diffExportContent || 'diffOnly');
  state.diffExportContent = ui.diffExportContent?.value || String(saved.diffExportContent || 'diffOnly');
  if (saved.diffWarnThreshold != null && ui.diffWarnThreshold) ui.diffWarnThreshold.value = String(saved.diffWarnThreshold || '');
  if (saved.charDiff != null) ui.charDiff.checked = !!saved.charDiff;
  if (saved.diffIncludeSame != null && ui.diffIncludeSame) { ui.diffIncludeSame.checked = !!saved.diffIncludeSame; state.diffIncludeSame = !!saved.diffIncludeSame; }
  if (saved.diffTheme === 'dark' || saved.diffTheme === 'light') state.diffViewTheme = saved.diffTheme;
  if (saved.applyDiffOnly != null) ui.applyDiffOnly.checked = !!saved.applyDiffOnly;
  if (saved.autoBackupPreview != null) ui.autoBackupPreview.checked = !!saved.autoBackupPreview;
  if (saved.stopOnError != null) ui.stopOnError.checked = !!saved.stopOnError;
  if (saved.nodeMode != null) ui.nodeMode.checked = !!saved.nodeMode;
  if (saved.reflectSimpleMode != null && ui.reflectSimpleMode) ui.reflectSimpleMode.checked = !!saved.reflectSimpleMode;
  if (ui.reflectSimpleMode?.checked) ui.nodeMode.checked = false;
  if (saved.reflectDetailTab != null) state.reflectDetailTab = String(saved.reflectDetailTab || 'diff');
  if (saved.doDeploy != null) ui.doDeploy.checked = !!saved.doDeploy;
  if (saved.overwriteField != null) ui.overwriteField.checked = !!saved.overwriteField;
  if (saved.deployField != null) ui.deployField.checked = !!saved.deployField;
  if (saved.erLayout != null && ui.erLayout) ui.erLayout.value = String(saved.erLayout || 'dagre');
  if (saved.erFieldDensity != null && ui.erFieldDensity) ui.erFieldDensity.value = String(saved.erFieldDensity || 'standard');
  if (saved.erMaxDepth != null && ui.erMaxDepth) ui.erMaxDepth.value = String(saved.erMaxDepth || '0');
  if (saved.erExtraApps != null && ui.erExtraApps) ui.erExtraApps.value = String(saved.erExtraApps || '');
  if (saved.erIncludeSubtable != null && ui.erIncludeSubtable) ui.erIncludeSubtable.checked = !!saved.erIncludeSubtable;
  if (saved.settingsExportAppIds != null) ui.settingsExportAppIds.value = String(saved.settingsExportAppIds);
  if (saved.settingsExportSearchKeyword != null) ui.settingsExportSearchKeyword.value = String(saved.settingsExportSearchKeyword);
  if (saved.settingsExportGuest != null) ui.settingsExportGuest.value = String(saved.settingsExportGuest);
  if (saved.settingsExportPreview != null) ui.settingsExportPreview.checked = !!saved.settingsExportPreview;

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
  Object.entries(DEFAULT_SUBTAB_STATE).forEach(([parentKey, defaultKey]) => {
    const nextKey = (saved.activeSubTabs && typeof saved.activeSubTabs === 'object')
      ? String(saved.activeSubTabs[parentKey] || defaultKey)
      : defaultKey;
    switchSubTab(parentKey, nextKey, { persist: false });
  });
  if (saved.activeTab && ui.tabs.some((t) => t.dataset.tab === saved.activeTab)) {
    switchTab(saved.activeTab, { persist: false });
  }
  applyIgnorePresetKeysToInput();
  renderIgnoreKeyChips();
  renderLookupMapRows();
  const rootAfterRestore = getRoot();
  if (rootAfterRestore) syncPreviewComparePanel(rootAfterRestore, ui);
  if (state.activeTab === 'diff') {
    renderResultRows(state.lastDiffRows || []);
  }
}
