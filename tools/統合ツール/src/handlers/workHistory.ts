'use strict';

/**
 * 作業履歴（接続情報・差分フィルタ・反映選択などの一括スナップショット）の
 * 構築・保存・復元・パネル描画を担う。元は handlers.ts にインライン定義されて
 * いたが、UI 状態と localStorage 永続化の橋渡しが多く、独立モジュールに切り出
 * すことで setupEventHandlers の見通しを改善する。
 */

import { state, ui, pushWorkHistoryEntry } from '../state.js';
import { esc, kusConfirm, kusPrompt } from '../utils.js';
import {
  setStatus,
  switchSubTab,
  renderScopePickerSummaries,
  renderScopeChips,
  renderIgnoreKeyChips,
  renderLookupMapRows,
  renderBundleState,
  renderReflectSidebar,
  renderReflectMainPanel,
  renderReflectNodeList,
  updateConnectionStepIndicators,
  openFeatureScreen
} from '../ui/components.js';
import {
  renderResultRows,
  renderDiffFilterOptions,
  syncDiffThemeButton
} from '../diff/export.js';
import { saveCurrentDialogState } from '../tabs/diff.js';
import { renderReflectApplyChecklistStatus } from './checklist.js';

function selectedScopeValues(container: ParentNode | null | undefined): string[] {
  if (!container) return [];
  return [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')].map((x) => x.value);
}

function setScopeValues(container: ParentNode | null | undefined, values: string[] | undefined): void {
  if (!container) return;
  const set = new Set((Array.isArray(values) ? values : []).map(String));
  container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = set.has(String(checkbox.value || ''));
  });
}

function sanitizeDiffReviewMetaForHistory(): Record<string, { status: string; note: string }> {
  return Object.fromEntries(
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
  );
}

export function getWorkHistoryKindLabel(kind: string): string {
  const map: Record<string, string> = {
    manual: '手動保存',
    diff: '差分比較後',
    plan: 'プラン確認後',
    apply: '反映直前',
    restore: '復元前'
  };
  return map[kind] || '作業保存';
}

export function buildWorkHistorySnapshot(): Record<string, any> {
  return {
    sourceAppId: ui.sourceApp?.value?.trim?.() || '',
    sourceGuestId: ui.sourceGuest?.value?.trim?.() || '',
    sourcePreview: !!ui.sourcePreview?.checked,
    targetAppId: ui.targetApp?.value?.trim?.() || '',
    targetGuestId: ui.targetGuest?.value?.trim?.() || '',
    targetPreview: !!ui.targetPreview?.checked,
    lookupMap: ui.lookupMap?.value?.trim?.() || '',
    ignoreKeys: ui.ignoreKeys?.value?.trim?.() || '',
    ignorePresetFieldOrder: !!ui.ignorePresetFieldOrder?.checked,
    ignorePresetMeta: !!ui.ignorePresetMeta?.checked,
    ignorePresetLabelName: !!ui.ignorePresetLabelName?.checked,
    diffNormalizeViewOrder: !!ui.diffNormalizeViewOrder?.checked,
    diffNormalizePermissionOrder: !!ui.diffNormalizePermissionOrder?.checked,
    diffNormalizeGeneralArrayOrder: !!ui.diffNormalizeGeneralArrayOrder?.checked,
    diffSearch: ui.diffSearch?.value?.trim?.() || '',
    diffSearchFieldName: !!ui.diffSearchFieldName?.checked,
    diffFilterSection: ui.diffFilterSection?.value || state.diffFilterSection || '',
    diffFilterType: ui.diffFilterType?.value || state.diffFilterType || '',
    diffFilterSeverity: ui.diffFilterSeverity?.value || state.diffFilterSeverity || '',
    diffFilterTableOnly: !!ui.diffFilterTableOnly?.checked,
    diffFilterTableKeyword: ui.diffFilterTableKeyword?.value?.trim?.() || '',
    diffIncludeSame: !!ui.diffIncludeSame?.checked,
    diffWarnThreshold: ui.diffWarnThreshold?.value?.trim?.() || '',
    diffExportMode: ui.diffExportMode?.value || state.diffExportMode || 'all',
    diffExportContent: ui.diffExportContent?.value || state.diffExportContent || 'diffOnly',
    charDiff: !!ui.charDiff?.checked,
    diffTheme: state.diffViewTheme,
    diffScopes: selectedScopeValues(ui.diffScopes),
    applyScopes: selectedScopeValues(ui.applyScopes),
    applyDiffOnly: !!ui.applyDiffOnly?.checked,
    autoBackupPreview: !!ui.autoBackupPreview?.checked,
    stopOnError: !!ui.stopOnError?.checked,
    reflectApplyChecklist: {
      diff: !!state.reflectApplyChecklist?.diff,
      plan: !!state.reflectApplyChecklist?.plan,
      target: !!state.reflectApplyChecklist?.target
    },
    reflectDetailTab: state.reflectDetailTab,
    reflectSelectedIds: [...(state.reflectSelectedIds || new Set())].slice(0, 2000),
    reflectNodeModes: { ...(state.reflectNodeModes || ({} as any)) },
    reflectPropertyFilters: [...(state.reflectPropertyFilters || new Set())].slice(0, 500),
    diffViewedKeys: [...(state.diffViewedKeys || new Set())].slice(0, 2000),
    diffReviewMeta: sanitizeDiffReviewMetaForHistory(),
    diffFavoritePaths: [...(state.diffFavoritePaths || new Set())].slice(0, 500),
    diffFavoritesOnly: !!state.diffFavoritesOnly,
    diffHideViewed: !!state.diffHideViewed,
    activeFeatureKey: state.activeFeatureKey || '',
    activeTab: state.activeTab || '',
    activeSubTabs: { ...(state.activeSubTabs || ({} as any)) },
    launcherSortMode: ui.featureSortMode?.value || state.launcherSortMode || 'onboarding'
  };
}

export function getWorkHistorySummary(snapshot: any): string {
  const src = snapshot?.sourceAppId || '-';
  const tgt = snapshot?.targetAppId || '-';
  const diffScopes = Array.isArray(snapshot?.diffScopes) ? snapshot.diffScopes.length : 0;
  const applyScopes = Array.isArray(snapshot?.applyScopes) ? snapshot.applyScopes.length : 0;
  const checks = snapshot?.reflectApplyChecklist || ({} as any);
  const checked = ['diff', 'plan', 'target'].filter((key) => !!checks[key]).length;
  return `比較元 ${src} / 比較先 ${tgt} / 差分 ${diffScopes}項目 / 反映 ${applyScopes}項目 / チェック ${checked}/3`;
}

export function renderWorkHistoryPanel(): void {
  if (!ui.workHistoryList) return;
  const history = Array.isArray(state.workHistory) ? state.workHistory : [];
  if (ui.workHistorySummary) ui.workHistorySummary.textContent = history.length ? `${history.length}件保存` : '履歴なし';
  if (!history.length) {
    ui.workHistoryList.innerHTML = '<div class="work-history-empty">まだ保存された作業はありません</div>';
    return;
  }
  ui.workHistoryList.innerHTML = history.map((entry: any) => {
    const stamp = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-';
    const title = entry.label || getWorkHistoryKindLabel(entry.kind);
    const summary = entry.summary || getWorkHistorySummary(entry.snapshot || ({} as any));
    return `<div class="work-history-item" data-work-history-id="${esc(entry.id || '')}">
      <div class="work-history-item-main">
        <div class="work-history-item-title">${esc(title)}</div>
        <div class="work-history-item-meta">${esc(stamp)} / ${esc(summary)}</div>
      </div>
      <div class="work-history-item-actions">
        <button type="button" class="btn ok" data-act="restoreWorkHistory" data-history-id="${esc(entry.id || '')}">復元</button>
        <button type="button" class="btn sub" data-act="deleteWorkHistory" data-history-id="${esc(entry.id || '')}">削除</button>
      </div>
    </div>`;
  }).join('');
}

export interface SaveWorkHistoryOptions {
  label?: string;
  silent?: boolean;
  persist?: boolean;
}

export function saveWorkHistorySnapshot(kind: string = 'manual', options: SaveWorkHistoryOptions = {}): any {
  const snapshot = buildWorkHistorySnapshot();
  const defaultLabel = options.label || `${getWorkHistoryKindLabel(kind)}: ${snapshot.sourceAppId || '-'} → ${snapshot.targetAppId || '-'}`;
  let label = defaultLabel;
  if (!options.silent) {
    const next = kusPrompt('保存する作業名を入力してください', defaultLabel);
    if (next === null) return null;
    label = String(next || defaultLabel).trim() || defaultLabel;
  }
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    label,
    createdAt: new Date().toISOString(),
    summary: getWorkHistorySummary(snapshot),
    snapshot
  };
  pushWorkHistoryEntry(entry);
  renderWorkHistoryPanel();
  if (options.persist !== false) saveCurrentDialogState();
  return entry;
}

export function restoreWorkHistorySnapshot(snapshot: any): boolean {
  if (!snapshot || typeof snapshot !== 'object') return false;
  if (ui.sourceApp && snapshot.sourceAppId != null) ui.sourceApp.value = String(snapshot.sourceAppId);
  if (ui.sourceGuest && snapshot.sourceGuestId != null) ui.sourceGuest.value = String(snapshot.sourceGuestId);
  if (ui.sourcePreview && snapshot.sourcePreview != null) ui.sourcePreview.checked = !!snapshot.sourcePreview;
  if (ui.targetApp && snapshot.targetAppId != null) ui.targetApp.value = String(snapshot.targetAppId);
  if (ui.targetGuest && snapshot.targetGuestId != null) ui.targetGuest.value = String(snapshot.targetGuestId);
  if (ui.targetPreview && snapshot.targetPreview != null) ui.targetPreview.checked = !!snapshot.targetPreview;
  if (ui.lookupMap && snapshot.lookupMap != null) ui.lookupMap.value = String(snapshot.lookupMap);
  if (ui.ignoreKeys && snapshot.ignoreKeys != null) ui.ignoreKeys.value = String(snapshot.ignoreKeys);
  if (ui.ignorePresetFieldOrder && snapshot.ignorePresetFieldOrder != null) ui.ignorePresetFieldOrder.checked = !!snapshot.ignorePresetFieldOrder;
  if (ui.ignorePresetMeta && snapshot.ignorePresetMeta != null) ui.ignorePresetMeta.checked = !!snapshot.ignorePresetMeta;
  if (ui.ignorePresetLabelName && snapshot.ignorePresetLabelName != null) ui.ignorePresetLabelName.checked = !!snapshot.ignorePresetLabelName;
  if (ui.diffNormalizeViewOrder && snapshot.diffNormalizeViewOrder != null) ui.diffNormalizeViewOrder.checked = !!snapshot.diffNormalizeViewOrder;
  if (ui.diffNormalizePermissionOrder && snapshot.diffNormalizePermissionOrder != null) ui.diffNormalizePermissionOrder.checked = !!snapshot.diffNormalizePermissionOrder;
  if (ui.diffNormalizeGeneralArrayOrder && snapshot.diffNormalizeGeneralArrayOrder != null) ui.diffNormalizeGeneralArrayOrder.checked = !!snapshot.diffNormalizeGeneralArrayOrder;
  if (ui.diffSearch && snapshot.diffSearch != null) ui.diffSearch.value = String(snapshot.diffSearch);
  if (ui.diffSearchFieldName && snapshot.diffSearchFieldName != null) {
    ui.diffSearchFieldName.checked = !!snapshot.diffSearchFieldName;
    state.diffSearchFieldName = !!snapshot.diffSearchFieldName;
  }
  if (ui.diffFilterSection && snapshot.diffFilterSection != null) ui.diffFilterSection.value = String(snapshot.diffFilterSection || '');
  if (ui.diffFilterType && snapshot.diffFilterType != null) ui.diffFilterType.value = String(snapshot.diffFilterType || '');
  if (ui.diffFilterSeverity && snapshot.diffFilterSeverity != null) ui.diffFilterSeverity.value = String(snapshot.diffFilterSeverity || '');
  if (ui.diffFilterTableOnly && snapshot.diffFilterTableOnly != null) ui.diffFilterTableOnly.checked = !!snapshot.diffFilterTableOnly;
  if (ui.diffFilterTableKeyword && snapshot.diffFilterTableKeyword != null) ui.diffFilterTableKeyword.value = String(snapshot.diffFilterTableKeyword || '');
  state.diffFilterSection = ui.diffFilterSection?.value || String(snapshot.diffFilterSection || '');
  state.diffFilterType = ui.diffFilterType?.value || String(snapshot.diffFilterType || '');
  state.diffFilterSeverity = ui.diffFilterSeverity?.value || String(snapshot.diffFilterSeverity || '');
  state.diffFilterTableOnly = !!ui.diffFilterTableOnly?.checked;
  state.diffFilterTableKeyword = String(ui.diffFilterTableKeyword?.value || '').trim();
  if (ui.diffIncludeSame && snapshot.diffIncludeSame != null) {
    ui.diffIncludeSame.checked = !!snapshot.diffIncludeSame;
    state.diffIncludeSame = !!snapshot.diffIncludeSame;
  }
  if (ui.diffWarnThreshold && snapshot.diffWarnThreshold != null) ui.diffWarnThreshold.value = String(snapshot.diffWarnThreshold || '');
  if (ui.diffExportMode && snapshot.diffExportMode != null) ui.diffExportMode.value = String(snapshot.diffExportMode || 'all');
  if (ui.diffExportContent && snapshot.diffExportContent != null) ui.diffExportContent.value = String(snapshot.diffExportContent || 'diffOnly');
  state.diffExportMode = ui.diffExportMode?.value || String(snapshot.diffExportMode || 'all');
  state.diffExportContent = ui.diffExportContent?.value || String(snapshot.diffExportContent || 'diffOnly');
  if (ui.charDiff && snapshot.charDiff != null) ui.charDiff.checked = !!snapshot.charDiff;
  if (snapshot.diffTheme === 'dark' || snapshot.diffTheme === 'light') state.diffViewTheme = snapshot.diffTheme;
  setScopeValues(ui.diffScopes, snapshot.diffScopes);
  setScopeValues(ui.applyScopes, snapshot.applyScopes);
  if (ui.applyDiffOnly && snapshot.applyDiffOnly != null) ui.applyDiffOnly.checked = !!snapshot.applyDiffOnly;
  if (ui.autoBackupPreview && snapshot.autoBackupPreview != null) ui.autoBackupPreview.checked = !!snapshot.autoBackupPreview;
  if (ui.stopOnError && snapshot.stopOnError != null) ui.stopOnError.checked = !!snapshot.stopOnError;
  state.reflectApplyChecklist = {
    diff: !!snapshot.reflectApplyChecklist?.diff,
    plan: !!snapshot.reflectApplyChecklist?.plan,
    target: !!snapshot.reflectApplyChecklist?.target
  };
  state.reflectDetailTab = String(snapshot.reflectDetailTab || 'diff');
  state.reflectSelectedIds = new Set(Array.isArray(snapshot.reflectSelectedIds) ? snapshot.reflectSelectedIds : []);
  state.reflectNodeModes = snapshot.reflectNodeModes && typeof snapshot.reflectNodeModes === 'object' ? { ...snapshot.reflectNodeModes } : {};
  state.reflectPropertyFilters = new Set(Array.isArray(snapshot.reflectPropertyFilters) ? snapshot.reflectPropertyFilters : []);
  state.diffViewedKeys = new Set(Array.isArray(snapshot.diffViewedKeys) ? snapshot.diffViewedKeys : []);
  state.diffReviewMeta = snapshot.diffReviewMeta && typeof snapshot.diffReviewMeta === 'object' ? { ...snapshot.diffReviewMeta } : {};
  state.diffFavoritePaths = new Set(Array.isArray(snapshot.diffFavoritePaths) ? snapshot.diffFavoritePaths : []);
  state.diffFavoritesOnly = !!snapshot.diffFavoritesOnly;
  state.diffHideViewed = !!snapshot.diffHideViewed;
  state.launcherSortMode = String(snapshot.launcherSortMode) === 'usage' ? 'usage' : 'onboarding';
  if (ui.featureSortMode) ui.featureSortMode.value = state.launcherSortMode;
  if (snapshot.activeSubTabs && typeof snapshot.activeSubTabs === 'object') {
    Object.entries(snapshot.activeSubTabs).forEach(([parent, sub]) => {
      if (parent && sub) switchSubTab(parent, String(sub), { persist: false });
    });
  }
  const featureKey = String(snapshot.activeFeatureKey || '');
  if (featureKey) {
    openFeatureScreen(featureKey, { persist: false, focus: false });
  }
  updateConnectionStepIndicators();
  renderScopePickerSummaries();
  renderScopeChips();
  renderIgnoreKeyChips();
  renderLookupMapRows();
  renderBundleState();
  syncDiffThemeButton();
  renderDiffFilterOptions();
  renderReflectApplyChecklistStatus();
  renderReflectSidebar();
  renderReflectMainPanel();
  renderReflectNodeList();
  if (state.lastDiffRows.length || state.lastFetchIssues.length) renderResultRows(state.lastDiffRows || []);
  saveCurrentDialogState();
  return true;
}

export function restoreWorkHistoryById(id: string): void {
  const entry = (state.workHistory || []).find((item: any) => item?.id === id);
  if (!entry) {
    setStatus('復元する作業履歴が見つかりません', true);
    return;
  }
  if (!kusConfirm(`作業履歴「${entry.label || getWorkHistoryKindLabel(entry.kind)}」を復元しますか？現在の入力内容は上書きされます。`)) return;
  saveWorkHistorySnapshot('restore', { label: '復元前の自動保存', silent: true });
  if (!restoreWorkHistorySnapshot(entry.snapshot)) {
    setStatus('作業履歴を復元できませんでした', true);
    return;
  }
  renderWorkHistoryPanel();
  setStatus(`作業履歴を復元しました: ${entry.label || getWorkHistoryKindLabel(entry.kind)}`);
}
