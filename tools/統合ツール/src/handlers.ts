'use strict';

import { SECTION_DEFS, DEFAULT_APP_ID, TOOL_ID, TOOL_VERSION } from './constants.js';
import {
  state,
  ui,
  clearReflectApplyHistory,
  snapshotReflectApplyHistoryExport,
  pushWorkHistoryEntry,
  deleteWorkHistoryEntry,
  clearWorkHistory,
  upsertConnectionPreset,
  deleteConnectionPreset
} from './state.js';
import { esc, deepClone, readTextFile, getThemeDisplayLabel, selectedScopeKeys, showToast, kusConfirm, kusPrompt, nowStamp, downloadText } from './utils.js';
import { buildApiPrefix, apiGet } from './api.js';
import { countActualDiffRows, getActualDiffRows, summarizeRows } from './diff/engine.js';
import { getRenderedDiffRows } from './diff/filter.js';
import {
  renderResultRows,
  renderDiffFilterOptions,
  syncDiffThemeButton,
  renderDiffWarningBox,
  renderDiffSelectionState,
  MAIN_RESULT_IDLE_HTML,
  diffViewedKey,
  isDiffRowViewed
} from './diff/export.js';
import {
  getDiffRowByIdFromState,
  toggleDiffViewedById,
  markVisibleDiffRowsViewed,
  clearAllDiffViewed,
  setDiffReviewMeta
} from './diff/review.js';
import { applyDiffUiPreset, applyDiffSectionNav } from './diff/presets.js';
import { saveDiffSelectionSet, loadDiffSelectionSet, deleteDiffSelectionSet, refreshDiffSelectionSetDropdown } from './diff/selection-sets.js';
import { saveIgnorePreset, loadIgnorePreset, deleteIgnorePreset, refreshIgnorePresetDropdown } from './diff/ignore-presets.js';
import { openDiffViewerPopout } from './diff/popout.js';
import {
  setStatus,
  setBusy,
  switchTab,
  switchSubTab,
  renderIgnoreKeyChips,
  renderBundleState,
  renderReflectNodeList,
  renderReflectModeUi,
  renderReflectSidebar,
  renderReflectMainPanel,
  renderReflectAssistPanel,
  renderReflectNodeDetail,
  renderScopeChips,
  renderScopePickerSummaries,
  renderLookupMapRows,
  syncLookupMapFromRows,
  setSettingsExportScopeSelection,
  syncApplyScopesFromSidebar,
  updateConnectionStepIndicators,
  updateChangeWizardCurrentStep,
  setConnectionPanelCollapsed,
  openScopePicker,
  closeScopePicker,
  openFeatureScreen,
  showLauncherScreen,
  openReflectModal,
  closeReflectModal,
  closeAllReflectModals
} from './ui/components.js';
import {
  fitDialogToViewport,
  applyDialogSizePreset,
  applyDialogSize,
  applyDialogPosition,
  getDialogSizeBounds,
  getRoot,
  getToolDocument,
  getToolWindow,
  teardownDialogResizeHandling,
  initDialogResizeHandling,
  initDialogDragHandling
} from './ui/dialog.js';
import { openGuidedTour, closeGuidedTour, moveGuidedTour, scheduleGuidedTourLayout } from './ui/tour.js';

import {
  runDiff,
  runDiffAndPreviewPlan,
  exportBundleJson,
  exportDiffJson,
  exportDiffHtml,
  exportPatchJson,
  importBundleFromFile,
  commonParams,
  saveCurrentDialogState,
  restoreDialogState,
  addIgnoreKeyFromInput,
  applyIgnorePresetKeysToInput,
  currentDiffSignature,
  ensureDiffPreparedForReflect,
  openDiffReviewFold
} from './tabs/diff.js';
import { initReflectPreviewPlayground } from './tabs/reflect-preview-playground.js';
import { initSectionPreviewEditor } from './tabs/reflect-section-preview.js';

import {
  loadReflectRowsFromLastDiff,
  getSelectedReflectRows,
  runReflectModeAll,
  runReflectModeVisible,
  getEffectiveReflectScopeInfo,
  getDiffCountsBySection,
  runPrefetchCommonData,
  pushReflectUndo,
  undoReflectState,
  redoReflectState,
  reflectRowModeById,
  getActiveReflectRow,
  setActiveReflectNode,
  queueDiffRowForReflect,
  loadReflectPresets,
  saveReflectPreset,
  applyReflectPreset,
  deleteReflectPreset,
  exportReflectSelectionJson,
  importReflectSelectionFromFile,
  applyReflectQuickPreset
} from './tabs/reflect.js';

import {
  runPreviewProductionDiff,
  exportPreviewProdDiffJson,
  setPreviewProdDiffFilter,
  applyPreviewProdDiffSearch,
  clearPreviewProdDiffFilters,
  closePreviewProdDiff
} from './reflect/previewProdDiff.js';

import {
  runFieldApply,
  runLoadTargetFields,
  runLoadSourceFieldsList,
  runInsertSelectedSourceFields,
  runFieldValidate,
  parseFieldInput,
  parseLookupMapInput,
  parseAppIdList
} from './tabs/field.js';

import {
  runSettingsExport,
  runSettingsExportSearchApps,
  addAppIdToSettingsExport,
  addSpaceAppsToSettingsExport,
  loadSettingsExportBundleToDiff
} from './tabs/settings-export.js';

// --- These functions are not yet extracted into modules. They remain in the
//     monolithic file or will be extracted in future refactoring steps.
//     For now, they are expected to be injected or available in scope. ---
//
//   runDesignExport, runDesignCopyMd, runDesignExportXlsx, runDesignDiffMd,
//   runFetchJsConfig, runExportJsConfig, runApplyJsConfig,
//   runRenderProcessFlow, runGenerateERDiagram,
//   runExportERDiagramHtml, runBatchProcess, runBatchFileDownload,
//   runBatchJsConfigDownload, loadViewsForSelect, runCsvExport, runCsvImport,
//   exportDiffXlsx, runRecordCopy, saveTemplate, loadTemplate, deleteTemplate,
//   runSimStart, runSimExecuteAction, runApiTester,
//   runPreviewApplyPlan, runBackupTargetPreview, runApplyPreview, runDeployOnly,
//   runApplyPatchJson, importPatchJsonFromFile, parsePatchJsonPayload,
//   renderPatchJsonSummary, renderCustomizeResult,
//   runBulkFieldRename,
//   normalizeDiffFavoritePath,
//   renderDiffFavoritesOnlyButton, renderTemplateOptions

// ---------------------------------------------------------------------------
// withGuard - wraps async actions with running guard and busy indicator
// ---------------------------------------------------------------------------

/** withGuard の既定ウォッチドッグ秒数。これを超えると state.running を強制解除し、
 *  UI を「次の操作可能」状態へ戻す。長尺バックアップなどは個別に override する。 */
const WITHGUARD_DEFAULT_TIMEOUT_MS = 180_000;

/** state.running を確実に解放する内部ヘルパ。watchdog/正常完了/強制解除の3経路で呼ばれる。 */
function releaseRunningGuard(): void {
  if (state.runningWatchdogId) {
    try { clearTimeout(state.runningWatchdogId); } catch { /* noop */ }
    state.runningWatchdogId = null;
  }
  state.running = false;
  state.runningStartedAt = null;
  state.runningTaskLabel = '';
  setBusy(false);
}

/** ハングした非同期処理を手動でリセットするための公開API（UIから呼び出す）。 */
export function forceReleaseRunningGuard(reason = 'ユーザー操作'): boolean {
  if (!state.running) return false;
  const startedAt = state.runningStartedAt;
  const elapsedSec = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
  const label = state.runningTaskLabel || '処理';
  releaseRunningGuard();
  console.warn(`[統合ツール] running guard force-released: task="${label}" elapsed=${elapsedSec}s reason=${reason}`);
  setStatus(`実行中フラグを強制解除しました（${label} / 経過 ${elapsedSec}s）`, true);
  return true;
}

/**
 * 非同期処理の二重実行ガード + ビジー表示 + エラー集約 + ハング検知。
 *
 * - 既に実行中なら no-op し、経過時間と強制解除案内をステータスバーへ。
 * - 例外発生時はステータス・トーストの両方に通知し、API エラーには
 *   `apiErrorWithContext` のメタ（method/path/app）が `__apiDiag` で
 *   付与済みであれば最初の行だけを表示してユーザーに過剰情報を出さない。
 * - timeoutMs（既定 180000ms）を超えると watchdog が state.running を
 *   強制解除し、UI を次の操作可能状態へ戻す。長尺タスクは override 可。
 * - 戻り値は `fn` の戻り値の `Promise`。失敗時は `undefined` を解決して、
 *   呼び出し側が UI 更新を続行できるようにする（例外を再スローしない）。
 */
export function withGuard<T = void>(
  fn: () => Promise<T> | T,
  busyText = '',
  timeoutMs: number = WITHGUARD_DEFAULT_TIMEOUT_MS
): Promise<T | undefined> | undefined {
  if (state.running) {
    const elapsedSec = state.runningStartedAt
      ? Math.round((Date.now() - state.runningStartedAt) / 1000)
      : 0;
    const label = state.runningTaskLabel || '別の処理';
    setStatus(
      `${label} を実行中です（経過 ${elapsedSec}s）。長時間反応がない場合はステータスバーをダブルクリックで強制解除できます。`
    );
    return;
  }
  const label = busyText || '処理中...';
  state.running = true;
  state.runningStartedAt = Date.now();
  state.runningTaskLabel = label;
  setBusy(true, label);
  if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
    state.runningWatchdogId = setTimeout(() => {
      if (!state.running) return;
      const elapsedSec = state.runningStartedAt
        ? Math.round((Date.now() - state.runningStartedAt) / 1000)
        : 0;
      console.warn(`[統合ツール] withGuard watchdog fired: task="${label}" elapsed=${elapsedSec}s timeout=${timeoutMs}ms`);
      releaseRunningGuard();
      const msg = `処理が ${elapsedSec}s 経過しても完了しなかったため自動解除しました（${label}）。再実行するか、ネットワーク・権限を確認してください。`;
      setStatus(msg, true);
      showToast(msg, 'error').catch(() => {});
    }, timeoutMs);
  }
  return (async () => {
    try {
      return await fn();
    } catch (e: any) {
      console.error(e);
      const baseMessage = (e && (e.message || String(e))) || '不明なエラー';
      // apiErrorWithContext で付与された行は2行目以降に展開されているため、
      // ステータスバーには 1行目だけを出す。
      const firstLine = String(baseMessage).split('\n')[0] || baseMessage;
      const userMsg = `エラー: ${firstLine}`;
      setStatus(userMsg, true);
      showToast(userMsg, 'error').catch(() => {});
      return undefined;
    } finally {
      releaseRunningGuard();
    }
  })();
}

// ---------------------------------------------------------------------------
// setScopeSelection helper
// ---------------------------------------------------------------------------

function setScopeSelection(container, checked) {
  if (!container) return;
  [...container.querySelectorAll('input[type="checkbox"]')].forEach((c) => { c.checked = !!checked; });
  saveCurrentDialogState();
}

// 反映チェックリスト関連は handlers/checklist.ts に分割済み。再エクスポートで参照を維持。
import {
  REFLECT_APPLY_CHECKS,
  normalizeReflectApplyChecklist,
  renderReflectApplyChecklistStatus,
  setReflectApplyCheck,
  markReflectApplyChecks,
  resetReflectApplyChecks,
  getMissingReflectApplyChecks,
  ensureReflectApplyChecklistReady
} from './handlers/checklist.js';

function selectedScopeValues(container: ParentNode | null | undefined): string[] {
  if (!container) return [];
  try { return selectedScopeKeys(container); }
  catch { return []; }
}

function setScopeValues(container: ParentNode | null | undefined, values: string[] | undefined) {
  if (!container) return;
  const set = new Set((Array.isArray(values) ? values : []).map(String));
  container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = set.has(String(checkbox.value || ''));
  });
}

// 作業履歴（snapshot 構築/保存/復元/パネル描画）は handlers/workHistory.ts に分割済み。
import {
  getWorkHistoryKindLabel,
  buildWorkHistorySnapshot,
  getWorkHistorySummary,
  renderWorkHistoryPanel,
  saveWorkHistorySnapshot,
  restoreWorkHistorySnapshot,
  restoreWorkHistoryById
} from './handlers/workHistory.js';

// 差分行フォーカス・ID パーサ・URL からの appId/guestId 抽出は handlers/diffFocus.ts に分割済み。
import {
  focusDiffRow,
  focusNextDiffRow,
  parseIdSet,
  normalizeDiffFavoritePath,
  extractAppIdFromInput,
  extractGuestIdFromInput
} from './handlers/diffFocus.js';

// 接続プリセット CRUD・アプリ検索・検索結果からの割当は handlers/connectionPresets.ts に分割済み。
import {
  renderConnectionPresetSelect,
  saveConnectionPresetFromCurrent,
  applyConnectionPresetById,
  deleteSelectedConnectionPreset,
  runConnectionSearchApps,
  addConnectionSearchApp
} from './handlers/connectionPresets.js';

interface ReflectPresetEntry { name: string; [key: string]: unknown; }

function renderReflectPresetSelect(preferName?: string) {
  const sel = getToolDocument().getElementById('u_reflectPresetSelect') as HTMLSelectElement | null;
  if (!sel) return;
  const presets = loadReflectPresets() as ReflectPresetEntry[];
  const currentValue = preferName != null ? preferName : sel.value;
  sel.innerHTML = presets.length
    ? ['<option value="">-- プリセットを選択 --</option>']
      .concat(presets.map((p) => `<option value="${String(p.name).replace(/"/g, '&quot;')}">${String(p.name)}</option>`))
      .join('')
    : '<option value="">（保存済みプリセットなし）</option>';
  if (currentValue && presets.some((p) => p.name === currentValue)) {
    sel.value = currentValue;
  }
}

function getVisibleReflectNodeIds(): string[] {
  return [...(ui.reflectNodeList?.querySelectorAll<HTMLElement>('[data-node-open]') || [])]
    .map((el) => el.dataset.nodeOpen || '')
    .filter((id): id is string => !!id);
}

/**
 * 「設定画面で反映」内の内部タブ（概要 / フィールド / 他設定）を切り替える。
 */
function activateReflectInnerTab(inner) {
  const root = getRoot();
  if (!root) return;
  const key = ['overview', 'field', 'other'].includes(inner) ? inner : 'overview';
  const tabs = root.querySelectorAll('[data-reflect-inner]');
  tabs.forEach((btn) => {
    const on = btn.getAttribute('data-reflect-inner') === key;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const panes = root.querySelectorAll('[data-reflect-inner-pane]');
  panes.forEach((p) => {
    const on = p.getAttribute('data-reflect-inner-pane') === key;
    p.classList.toggle('active', on);
  });
}

// extractAppIdFromInput / extractGuestIdFromInput は handlers/diffFocus.ts に分割済み。

// ---------------------------------------------------------------------------
// Setup all event handlers
// ---------------------------------------------------------------------------

export function setupEventHandlers(injected: any = {}) {
  const root = getRoot();
  if (!root) return;
  let diffOnboardingDismissed = false;

  function syncDiffOnboardingVisibility() {
    const el = ui.diffOnboarding;
    if (!el) return;
    const rootEl = getRoot();
    const onDiffArea = rootEl?.classList.contains('tab-is-diff');
    const hasDiffState = !!state.lastDiffAt || !!state.lastDiffRows.length || !!state.lastFetchIssues.length;
    el.style.display = !diffOnboardingDismissed && onDiffArea && hasDiffState ? 'block' : 'none';
  }

  const {
    runDesignExport,
    runDesignCopyMd,
    runDesignExportXlsx,
    runDesignExportXlsxBatchZip,
    runDesignDiffMd,
    runFetchJsConfig,
    runLoadTargetJsConfig,
    runExportJsConfig,
    runApplyJsConfig,
    runRenderProcessFlow,
    runGenerateERDiagram,
    runExportERDiagramHtml,
    runBatchProcess,
    runBatchFileDownload,
    runBatchJsConfigDownload,
    loadViewsForSelect,
    runCsvExport,
    runCsvImport,
    runRecordBackup,
    runRecordCopy,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    runSimStart,
    runSimExecuteAction,
    runSimUndo,
    copyMermaidSource,
    downloadMermaidSource,
    downloadFlowSvg,
    runApiTester,
    clearApiTesterHistory,
    copyApiTesterCurl,
    beautifyApiTesterBody,
    copyApiTesterResponse,
    downloadApiTesterResponse,
    exportApiTesterHistory,
    runPreviewApplyPlan,
    runExportDryRunPlan,
    runExportReviewZip,
    togglePlanSectionExclude,
    runBackupTargetPreview,
    runRestoreTargetPreviewBackup,
    importTargetPreviewBackupFromFile,
    runApplyPreview,
    runDeployOnly,
    runApplyPatchJson,
    runRetryFailedSections,
    importPatchJsonFromFile,
    parsePatchJsonPayload,
    renderPatchJsonSummary,
    populatePatchJsonFromCurrentDiff,
    renderCustomizeResult,
    runBulkFieldRename,
    renderDiffFavoritesOnlyButton,
    renderTemplateOptions,
    runAnalyzeDashboard,
    runFieldImpactAnalysis,
    exportFieldImpactCsv,
    runPermissionMatrix,
    runNotificationVisualizer,
    runLayoutPreview,
    runFieldDependencyGraph,
    fieldGraphRelayout,
    fieldGraphExportPng
  } = injected;

  function updateDiffFavoritesOnlyButton() {
    if (!ui.diffFavoritesOnlyBtn) return;
    ui.diffFavoritesOnlyBtn.textContent = `お気に入りのみ: ${state.diffFavoritesOnly ? 'ON' : 'OFF'}`;
    ui.diffFavoritesOnlyBtn.classList.toggle('dark', !!state.diffFavoritesOnly);
  }

  function updateLauncherToggleButton() {
    if (!ui.launcherToggleMore) return;
    const expanded = root.classList.contains('launcher-show-advanced');
    const hiddenCount = ui.launcherMenu?.querySelectorAll('.feature-card[data-launcher-tier="secondary"]').length || 0;
    ui.launcherToggleMore.textContent = expanded
      ? 'よく使う作業だけ表示'
      : `その他の ${hiddenCount} 機能を表示`;
    ui.launcherToggleMore.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function renderLauncherActiveFilters(_group, searchText) {
    if (!ui.launcherActiveFilters) return;
    const chips = [];
    // 「タブ: ...」チップはタブバーと冗長なので常に省略する。
    // 検索キーワードは active filter として残す。
    if (searchText) {
      chips.push(`<span class="chip chip-active-filter">検索: ${esc(searchText)}</span>`);
    }
    ui.launcherActiveFilters.innerHTML = chips.join('');
  }

  function applyLauncherFilter() {
    const activeGroupBtn = ui.launcherGroupFilters?.querySelector<HTMLElement>('.chip.is-active[data-group]');
    const group = activeGroupBtn?.dataset?.group || 'change';
    const searchText = String(ui.launcherSearch?.value || '').trim();
    const normalizedSearch = searchText.toLowerCase();
    const panels = [...(ui.launcherMenu?.querySelectorAll<HTMLElement>('[data-launcher-panel]') || [])];
    panels.forEach((panel) => {
      const on = panel.dataset.launcherPanel === group;
      panel.classList.toggle('is-active', on);
      panel.hidden = !on;
    });
    if (ui.launcherSearch) ui.launcherSearch.disabled = group === 'history';
    const cards = [...(ui.launcherMenu?.querySelectorAll<HTMLElement>('.feature-card[data-feature]') || [])];
    const targetCards = cards.filter((card) => String(card.dataset.group || '').trim() === group);
    let visibleCount = 0;
    cards.forEach((card) => {
      const groupKey = String(card.dataset.group || '').trim();
      const label = String(card.querySelector('.feature-card-label')?.textContent || '').trim();
      const desc = String(card.querySelector('.feature-card-desc')?.textContent || '').trim();
      const cardGroup = String(card.querySelector('.feature-card-group')?.textContent || '').trim();
      const cardText = `${label} ${desc} ${cardGroup}`.toLowerCase();
      const groupMatched = groupKey === group;
      const searchMatched = !normalizedSearch || cardText.includes(normalizedSearch);
      const show = groupMatched && searchMatched;
      card.style.display = show ? '' : 'none';
      if (show) visibleCount += 1;
    });
    if (ui.launcherVisibleCount) {
      ui.launcherVisibleCount.textContent = group === 'history'
        ? '履歴・復元を表示中'
        : `表示中: ${visibleCount}/${targetCards.length}`;
    }
    if (ui.launcherEmptyState) ui.launcherEmptyState.hidden = group === 'history' || visibleCount !== 0;
    renderLauncherActiveFilters(group, searchText);
    updateChangeWizardCurrentStep();
  }

  interface FocusWizardOptions { block?: ScrollLogicalPosition; focus?: boolean }

  function focusWizardTarget(selector: string, options: FocusWizardOptions = {}) {
    if (!selector) return;
    const doc = getToolDocument();
    const targetWindow = getToolWindow();
    targetWindow.requestAnimationFrame(() => {
      const target = doc.querySelector<HTMLElement>(selector);
      target?.scrollIntoView?.({ block: options.block || 'center', inline: 'nearest' });
      if (options.focus !== false && typeof target?.focus === 'function') {
        try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
      }
    });
  }

  function openWizardStep(stepKey) {
    const step = String(stepKey || 'connection');
    const steps = {
      connection: {
        title: '接続確認',
        run() {
          showLauncherScreen({ persist: false });
          setConnectionPanelCollapsed(false);
          focusWizardTarget('#u_sourceApp');
        }
      },
      diff: {
        title: '差分比較',
        run() {
          openFeatureScreen('diff', { persist: false, focus: false });
          focusWizardTarget('#u_runDiffPrimary');
        }
      },
      plan: {
        title: 'プラン確認',
        run() {
          openFeatureScreen('reflect', { persist: false, focus: false });
          switchSubTab('reflect', 'settings', { persist: false });
          focusWizardTarget('#u_footerPlan');
        }
      },
      apply: {
        title: 'プレビュー反映',
        run() {
          openFeatureScreen('reflect', { persist: false, focus: false });
          switchSubTab('reflect', 'settings', { persist: false });
          focusWizardTarget('#u_footerApply');
        }
      },
      analyze: {
        title: '影響確認',
        run() {
          openFeatureScreen('analyze', { persist: false, focus: false });
          switchSubTab('analyze', 'dashboard', { persist: false });
          focusWizardTarget('[data-act="runAnalyzeDashboard"]');
        }
      }
    };
    const config = steps[step] || steps.connection;
    config.run();
    updateLauncherToggleButton();
    applyLauncherFilter();
    saveCurrentDialogState();
    setStatus(`ウィザード: ${config.title} に移動しました`);
  }

  function renderDiffActiveFilters() {
    if (!ui.diffActiveFilters) return;
    const chips = [];
    const section = String(ui.diffFilterSection?.selectedOptions?.[0]?.textContent || '').trim();
    const type = String(ui.diffFilterType?.selectedOptions?.[0]?.textContent || '').trim();
    const severity = String(ui.diffFilterSeverity?.selectedOptions?.[0]?.textContent || '').trim();
    const search = String(ui.diffSearch?.value || '').trim();
    const tableKeyword = String(ui.diffFilterTableKeyword?.value || '').trim();
    if (ui.diffFilterSection?.value) chips.push(`<span class="chip chip-active-filter">セクション: ${esc(section)}</span>`);
    if (ui.diffFilterType?.value) chips.push(`<span class="chip chip-active-filter">種別: ${esc(type)}</span>`);
    if (ui.diffFilterSeverity?.value) chips.push(`<span class="chip chip-active-filter">重要度: ${esc(severity)}</span>`);
    if (ui.diffFilterTableOnly?.checked) chips.push('<span class="chip chip-active-filter">テーブル内フィールドのみ</span>');
    if (tableKeyword) chips.push(`<span class="chip chip-active-filter">テーブル: ${esc(tableKeyword)}</span>`);
    if (search) chips.push(`<span class="chip chip-active-filter">検索: ${esc(search)}</span>`);
    ui.diffActiveFilters.innerHTML = chips.length
      ? `<span class="diff-active-filters__lbl">適用中:</span>${chips.join('')}`
      : '<span class="muted diff-active-filters__hint">🔍 上で絞り込み条件を選ぶと、ここに適用中のフィルタが表示されます</span>';
  }

  function isRestorableResultHtml(html) {
    const text = String(html || '');
    if (!text || text.length > 500_000) return false;
    return !/(<script\b|<iframe\b|<object\b|<embed\b|<link\b|<meta\b|\son[a-z]+\s*=|javascript:)/i.test(text);
  }

  function syncMainResultForFeature(featureKey) {
    if (!ui.result) return;
    const key = String(featureKey || state.activeFeatureKey || state.activeTab || '').trim();
    if (key === 'diff') {
      renderResultRows(state.lastDiffRows || []);
      return;
    }
    const stored = state.lastResultByTab && state.lastResultByTab[key];
    if (typeof stored === 'string' && stored.length && isRestorableResultHtml(stored)) {
      ui.result.innerHTML = stored;
      return;
    }
    ui.result.innerHTML = MAIN_RESULT_IDLE_HTML;
  }

  async function copyToClipboard(text: string, successMessage: string, errorMessage?: string) {
    const copier = ui.copyTextToClipboard;
    if (typeof copier !== 'function') {
      setStatus(errorMessage || 'コピー機能を利用できません', true);
      return false;
    }
    const ok = await copier(text);
    setStatus(ok ? successMessage : (errorMessage || 'コピーに失敗しました'), !ok);
    return ok;
  }

  function resolveSectionPreviewTarget(sectionKey) {
    const requested = String(sectionKey || '').trim();
    if (requested && requested !== 'fieldSettings') return requested;
    const active = String(state.reflectActiveSidebarSection || '').trim();
    if (active && active !== 'fieldSettings') return active;
    const selected = selectedScopeKeys(ui.applyScopes).find((key) => key && key !== 'fieldSettings');
    return selected || 'viewSettings';
  }

  function openSectionPreviewEditor(sectionKey) {
    const nextSectionKey = resolveSectionPreviewTarget(sectionKey);
    const label = SECTION_DEFS.find((def) => def.key === nextSectionKey)?.label || nextSectionKey;
    switchTab('reflect', { persist: false });
    // モーダルで開く
    try { openReflectModal('otherEditor'); } catch (_e) {}
    const focusEditor = () => {
      const editorApi = (ui.sectionPreviewEditor as any)?.__sectionPreviewApi;
      if (editorApi?.setSection) {
        editorApi.setSection(nextSectionKey, { silent: true, force: true });
        return;
      }
      const select = ui.sectionPreviewEditor?.querySelector?.('[data-spe-act="changeSection"]') as HTMLSelectElement | null;
      if (select && nextSectionKey) {
        const ToolEvent: typeof Event = (getToolWindow() as any)?.Event || Event;
        select.value = nextSectionKey;
        select.dispatchEvent(new ToolEvent('change', { bubbles: true }));
      }
    };
    const view = getToolWindow();
    if (view?.requestAnimationFrame) view.requestAnimationFrame(focusEditor);
    else focusEditor();
    setStatus(`${label} の差分エディタを開きました`);
  }

  // -------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------

  renderScopeChips();
  restoreDialogState();
  fitDialogToViewport({ persist: false });
  initDialogResizeHandling();
  initDialogDragHandling();
  syncDiffThemeButton();
  renderReflectApplyChecklistStatus();
  renderIgnoreKeyChips();
  renderDiffFilterOptions();
  if (typeof renderDiffFavoritesOnlyButton === 'function') renderDiffFavoritesOnlyButton();
  else updateDiffFavoritesOnlyButton();
  renderDiffSelectionState();
  if (typeof renderDiffWarningBox === 'function') renderDiffWarningBox();
  renderLookupMapRows();
  if (typeof renderTemplateOptions === 'function') renderTemplateOptions();
  renderBundleState();
  renderReflectSidebar();
  renderReflectMainPanel();
  renderWorkHistoryPanel();
  renderConnectionPresetSelect();
  updateLauncherToggleButton();
  applyLauncherFilter();
  renderDiffActiveFilters();
  renderReflectNodeList();
  initReflectPreviewPlayground(ui, setStatus);
  initSectionPreviewEditor(ui, setStatus);
  if (ui.settingsExportSearchResult && !ui.settingsExportSearchResult.innerHTML) {
    ui.settingsExportSearchResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#64748b">検索結果なし</div>';
  }
  if (ui.connectionSearchResult && !ui.connectionSearchResult.innerHTML) {
    ui.connectionSearchResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#64748b">検索結果なし</div>';
  }

  // -------------------------------------------------------------------
  // Scroll & resize listeners
  // -------------------------------------------------------------------

  if (ui.toolBody) {
    ui.toolBody.addEventListener('scroll', () => {
      if (state.guidedTourActive) scheduleGuidedTourLayout();
    }, { passive: true });
  }

  const tw = getToolWindow() as Window & { __KUS_RESIZE_HANDLER__?: (() => void) | null };
  if (tw.__KUS_RESIZE_HANDLER__) {
    tw.removeEventListener('resize', tw.__KUS_RESIZE_HANDLER__);
  }
  const guidedTourWindowResizeHandler = () => {
    fitDialogToViewport({ persist: false });
    if (state.guidedTourActive) scheduleGuidedTourLayout();
  };
  tw.__KUS_RESIZE_HANDLER__ = guidedTourWindowResizeHandler;
  tw.addEventListener('resize', guidedTourWindowResizeHandler);

  // -------------------------------------------------------------------
  // Individual element change listeners
  // -------------------------------------------------------------------

  ui.applyDiffOnly.addEventListener('change', () => {
    saveCurrentDialogState();
    resetReflectApplyChecks(['plan']);
    renderBundleState();
    renderReflectModeUi();
  });

  if (ui.lookupMap) {
    ui.lookupMap.addEventListener('change', () => {
      saveCurrentDialogState();
      resetReflectApplyChecks(['plan']);
    });
  }

  [ui.ignorePresetFieldOrder, ui.ignorePresetMeta, ui.ignorePresetLabelName].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', () => {
      applyIgnorePresetKeysToInput({ removeDisabled: true });
      saveCurrentDialogState();
    });
  });

  [ui.diffNormalizeViewOrder, ui.diffNormalizePermissionOrder, ui.diffNormalizeGeneralArrayOrder].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', () => {
      saveCurrentDialogState();
      setStatus('正規化プリセットを更新しました。次回の差分比較に反映されます');
    });
  });

  if (ui.diffWarnThreshold) {
    ui.diffWarnThreshold.addEventListener('change', () => {
      saveCurrentDialogState();
      if (typeof renderDiffWarningBox === 'function') renderDiffWarningBox();
    });
  }

  ui.stopOnError.addEventListener('change', saveCurrentDialogState);
  ui.nodeMode.addEventListener('change', () => {
    saveCurrentDialogState();
    renderBundleState();
    renderReflectNodeList();
  });

  let nodeSearchTimer = null;
  if (ui.nodeSearch) {
    ui.nodeSearch.addEventListener('input', () => {
      clearTimeout(nodeSearchTimer);
      nodeSearchTimer = setTimeout(() => renderReflectNodeList(), 200);
    });
  }
  if (ui.nodeFilterSection) ui.nodeFilterSection.addEventListener('change', () => renderReflectNodeList());
  if (ui.nodeFilterType) ui.nodeFilterType.addEventListener('change', () => renderReflectNodeList());
  if (ui.nodeFilterSeverity) ui.nodeFilterSeverity.addEventListener('change', () => renderReflectNodeList());
  if (ui.nodePropertyList) {
    ui.nodePropertyList.addEventListener('change', (ev) => {
      const input = (ev.target as Element)?.closest?.('[data-reflect-prop]') as HTMLInputElement | null;
      if (!input) return;
      const key = input.dataset.reflectProp;
      if (!key) return;
      if (!(state.reflectPropertyFilters instanceof Set)) state.reflectPropertyFilters = new Set();
      if (input.checked) state.reflectPropertyFilters.add(key);
      else state.reflectPropertyFilters.delete(key);
      renderReflectNodeList();
    });
  }

  [
    ui.ignoreKeys, ui.autoBackupPreview,
    ui.overwriteField, ui.deployField,
    ui.jsconfigPreview, ui.jsconfigDeployAfter,
    ui.erLayout, ui.erFieldDensity, ui.erMaxDepth, ui.erExtraApps, ui.erIncludeSubtable, ui.erIncludeReverseLookup,
    ui.diffMultiTargets,
    ui.settingsExportAppIds, ui.settingsExportSearchKeyword,
    ui.settingsExportGuest, ui.settingsExportPreview,
    ui.diffSearchFieldName
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', saveCurrentDialogState);
  });

  [ui.sourceApp, ui.sourceGuest, ui.targetApp, ui.targetGuest].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', () => {
      saveCurrentDialogState();
      resetReflectApplyChecks(['diff', 'plan']);
      updateConnectionStepIndicators();
    });
  });

  if (ui.charDiff) {
    ui.charDiff.addEventListener('change', () => {
      saveCurrentDialogState();
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
    });
  }

  if (ui.diffIncludeSame) {
    ui.diffIncludeSame.addEventListener('change', () => {
      state.diffIncludeSame = !!ui.diffIncludeSame.checked;
      saveCurrentDialogState();
      if (state.lastDiffAt && state.lastSourceBundle && state.lastTargetBundle) {
        withGuard(async () => {
          await runDiff();
          markReflectApplyChecks(['diff']);
          resetReflectApplyChecks(['plan']);
          saveWorkHistorySnapshot('diff', { label: '差分比較後', silent: true });
        }, '差分比較を更新中...');
        return;
      }
      setStatus(`差分なし表示を${state.diffIncludeSame ? 'ON' : 'OFF'}にしました。次回の差分比較から反映されます`);
    });
  }

  if (ui.diffSearch) {
    ui.diffSearch.addEventListener('input', () => {
      saveCurrentDialogState();
      renderDiffActiveFilters();
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
    });
  }

  if (ui.diffSearchFieldName) {
    ui.diffSearchFieldName.addEventListener('change', () => {
      state.diffSearchFieldName = !!ui.diffSearchFieldName.checked;
      saveCurrentDialogState();
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
    });
  }

  if (ui.diffMultiTargets) {
    ui.diffMultiTargets.addEventListener('input', saveCurrentDialogState);
  }

  [ui.diffFilterSection, ui.diffFilterType, ui.diffFilterSeverity, ui.diffFilterTableOnly].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', () => {
      state.diffFilterSection = ui.diffFilterSection?.value || '';
      state.diffFilterType = ui.diffFilterType?.value || '';
      state.diffFilterSeverity = ui.diffFilterSeverity?.value || '';
      state.diffFilterTableOnly = !!ui.diffFilterTableOnly?.checked;
      state.diffFilterTableKeyword = String(ui.diffFilterTableKeyword?.value || '').trim();
      saveCurrentDialogState();
      renderDiffActiveFilters();
      if (state.lastDiffRows.length || state.lastFetchIssues.length) renderResultRows(state.lastDiffRows);
      else renderDiffSelectionState();
    });
  });

  if (ui.diffFilterTableKeyword) {
    ui.diffFilterTableKeyword.addEventListener('input', () => {
      state.diffFilterTableOnly = !!ui.diffFilterTableOnly?.checked;
      state.diffFilterTableKeyword = String(ui.diffFilterTableKeyword.value || '').trim();
      saveCurrentDialogState();
      renderDiffActiveFilters();
      if (state.lastDiffRows.length || state.lastFetchIssues.length) renderResultRows(state.lastDiffRows);
      else renderDiffSelectionState();
    });
  }

  if (ui.diffExportMode) {
    ui.diffExportMode.addEventListener('change', () => {
      state.diffExportMode = ui.diffExportMode.value || 'all';
      saveCurrentDialogState();
      renderDiffSelectionState();
    });
  }

  if (ui.diffExportContent) {
    ui.diffExportContent.addEventListener('change', () => {
      state.diffExportContent = ui.diffExportContent.value || 'diffOnly';
      saveCurrentDialogState();
      renderDiffSelectionState();
    });
  }

  ui.doDeploy.addEventListener('change', saveCurrentDialogState);

  if (ui.reflectSimpleMode) {
    ui.reflectSimpleMode.addEventListener('change', () => {
      if (ui.reflectSimpleMode.checked) {
        ui.nodeMode.checked = false;
        state.reflectActiveSidebarSection = null;
        if (ui.patchJsonPanel) ui.patchJsonPanel.style.display = 'none';
      }
      renderReflectModeUi();
      renderReflectMainPanel();
      renderReflectNodeList();
      saveCurrentDialogState();
    });
  }

  // -------------------------------------------------------------------
  // Keyboard handler
  // -------------------------------------------------------------------

  root.addEventListener('keydown', (e) => {
    const editable = e.target && (
      (e.target as Element).tagName === 'INPUT'
      || (e.target as Element).tagName === 'TEXTAREA'
      || (e.target as Element).tagName === 'SELECT'
      || (e.target as HTMLElement).isContentEditable
    );

    if (!ui.scopePickerModal?.hidden && e.key === 'Escape') {
      e.preventDefault();
      closeScopePicker();
      return;
    }

    // ? でショートカット一覧モーダルをトグル / Esc で閉じる
    if (ui.shortcutHelpModal && !ui.shortcutHelpModal.hidden && e.key === 'Escape') {
      e.preventDefault();
      ui.shortcutHelpModal.hidden = true;
      return;
    }

    // 反映モーダルが開いていれば Esc で閉じる
    if (e.key === 'Escape') {
      const openModal = root.querySelector('.reflect-modal-overlay:not([hidden])');
      if (openModal) {
        e.preventDefault();
        closeAllReflectModals();
        return;
      }
    }
    if (!editable && e.key === '?') {
      e.preventDefault();
      if (ui.shortcutHelpModal) ui.shortcutHelpModal.hidden = !ui.shortcutHelpModal.hidden;
      return;
    }

    // Alt+← でランチャーへ戻る（機能画面のみ）
    if (e.altKey && e.key === 'ArrowLeft' && !editable) {
      const r = getToolDocument().getElementById('kintone-unified-suite-v2');
      if (r && r.classList.contains('screen-feature')) {
        e.preventDefault();
        showLauncherScreen({ persist: false });
        updateLauncherToggleButton();
        applyLauncherFilter();
        saveCurrentDialogState();
        setStatus('ホームへ戻りました（Alt+←）');
        return;
      }
    }

    if (state.guidedTourActive && !editable) {
      if (e.key === 'Escape') { e.preventDefault(); closeGuidedTour(); return; }
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); moveGuidedTour(1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveGuidedTour(-1); return; }
    }

    if ((e.target as HTMLElement).id === 'u_ignoreKeyInput' && e.key === 'Enter') {
      e.preventDefault();
      addIgnoreKeyFromInput();
      return;
    }
    if ((e.target === ui.connectionSearchKeyword || e.target === ui.connectionSearchGuest) && e.key === 'Enter') {
      e.preventDefault();
      withGuard(runConnectionSearchApps);
      return;
    }
    if ((e.target as HTMLElement)?.id === 'u_previewProdSearch' && e.key === 'Enter') {
      e.preventDefault();
      applyPreviewProdDiffSearch();
      return;
    }

    const featCard = (e.target as Element)?.closest?.('.feature-card[data-feature]') as HTMLElement | null;
    if (featCard && !editable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      featCard.click();
      return;
    }

    // ランチャーのタブナビ（変更・反映 / 可視化・出力 / データ・保守 / 履歴・復元）の roving tabindex
    const launcherTabBtn = (e.target as Element)?.closest?.('.launcher-tab-btn') as HTMLButtonElement | null;
    if (launcherTabBtn && !editable && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const tabs = Array.from(ui.launcherGroupFilters?.querySelectorAll<HTMLButtonElement>('.launcher-tab-btn') || []);
      if (tabs.length === 0) return;
      const currentIdx = tabs.indexOf(launcherTabBtn);
      let nextIdx = currentIdx;
      if (e.key === 'ArrowLeft') nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
      else if (e.key === 'ArrowRight') nextIdx = (currentIdx + 1) % tabs.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = tabs.length - 1;
      tabs[nextIdx]?.focus();
      tabs[nextIdx]?.click();
      return;
    }
    if (!editable && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) {
      e.preventDefault();
      showLauncherScreen({ persist: false });
      ui.launcherSearch?.focus();
      ui.launcherSearch?.select();
      return;
    }

    // 差分タブのセクション別ビュー: V で表示モード切替、数字キーでカテゴリ切替
    if (
      !editable &&
      !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey &&
      state.activeTab === 'diff'
    ) {
      if (e.key === 'v' || e.key === 'V') {
        const next = state.diffViewMode === 'category' ? 'table' : 'category';
        state.diffViewMode = next;
        if (state.lastDiffRows.length || state.lastFetchIssues.length) renderResultRows(state.lastDiffRows);
        try { saveCurrentDialogState(); } catch (err) { /* ignore */ }
        setStatus(next === 'category' ? 'セクション別ビューに切り替えました（V キー）' : '行一覧ビューに切り替えました（V キー）');
        e.preventDefault();
        return;
      }
      if (state.diffViewMode === 'category' && /^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        import('./diff/category-view.js').then((m) => {
          const cat = m.DIFF_CATEGORIES[idx];
          if (!cat) return;
          state.diffCategoryView = cat.key;
          if (state.lastDiffRows.length || state.lastFetchIssues.length) renderResultRows(state.lastDiffRows);
          try { saveCurrentDialogState(); } catch (err) { /* ignore */ }
          setStatus(`カテゴリ「${cat.label}」に切り替えました（${e.key} キー）`);
        });
        e.preventDefault();
        return;
      }
    }

    // 数字キー 1-9 / 0 / - で機能タブをワンキー切替（screen-feature のときのみ・装飾キーなし）
    if (
      !editable &&
      !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey &&
      root.classList.contains('screen-feature')
    ) {
      const tabByKey: Record<string, string> = {
        '1': 'diff', '2': 'reflect', '3': 'field', '4': 'er',
        '5': 'processFlow', '6': 'analyze', '7': 'apiTester'
      };
      const target = tabByKey[e.key];
      if (target) {
        e.preventDefault();
        switchTab(target);
        return;
      }
      // Esc で screen-feature からランチャーへ戻る（モーダルが開いてない場合のみ）
      if (e.key === 'Escape' && (!ui.scopePickerModal || ui.scopePickerModal.hidden)) {
        e.preventDefault();
        showLauncherScreen({ persist: false });
        return;
      }
    }

    // U2: Reflect tab keyboard shortcuts
    if (state.activeTab === 'reflect' && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const doc = getToolDocument();
      // Ctrl+Shift+Enter: 反映、Ctrl+Enter: 状態に応じた次のアクション
      if (e.shiftKey) {
        const applyBtn = doc.getElementById('u_footerApply') as HTMLButtonElement | null;
        if (applyBtn && !applyBtn.disabled) applyBtn.click();
      } else {
        const nextBtn = doc.querySelector('[data-reflect-next="1"]') as HTMLButtonElement | null;
        if (nextBtn && !nextBtn.disabled) nextBtn.click();
        else {
          const planBtn = doc.getElementById('u_footerPlan') as HTMLButtonElement | null;
          if (planBtn && !planBtn.disabled) planBtn.click();
        }
      }
      return;
    }
    if (e.key === 'Escape' && e.target === ui.launcherSearch) {
      e.preventDefault();
      if (ui.launcherSearch.value) {
        ui.launcherSearch.value = '';
        applyLauncherFilter();
      }
      return;
    }

    if (!getRoot()?.classList.contains('tab-is-diff')) return;
    const resKb = getToolDocument().getElementById('u_result');
    const tKb = e.target as HTMLInputElement | null;
    if (tKb?.matches?.('input[type=checkbox][data-diff-row-id]') && resKb?.contains(tKb) && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      const boxes = [...resKb.querySelectorAll<HTMLInputElement>('tbody input[type=checkbox][data-diff-row-id]')];
      const idx = boxes.indexOf(tKb);
      const next = e.key === 'ArrowDown' ? boxes[idx + 1] : boxes[idx - 1];
      if (idx >= 0 && next) {
        e.preventDefault();
        next.focus();
        const tr = (next.closest('[data-diff-row-tr]') as HTMLElement | null);
        if (tr) state.diffFocusedRowId = tr.getAttribute('data-diff-row-tr') || '';
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openDiffReviewFold();
      ui.diffSearch?.focus();
      ui.diffSearch?.select();
      return;
    }
    if (e.key === 'Escape' && getToolDocument().activeElement === ui.diffSearch) {
      e.preventDefault();
      ui.diffSearch.value = '';
      renderDiffActiveFilters();
      saveCurrentDialogState();
      renderResultRows(state.lastDiffRows);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !editable) {
      e.preventDefault();
      state.diffSelectedIds = new Set((state.lastDiffRows || []).map((row) => row._id));
      renderResultRows(state.lastDiffRows);
      return;
    }

    // j/k でフォーカス移動、v でレビュー済みトグル、x で選択トグル（GitHub PR 風）
    if (!editable && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const key = e.key;
      if (key === 'j' || key === 'k') {
        if (!(state.lastDiffRows && state.lastDiffRows.length)) return;
        e.preventDefault();
        const moved = focusNextDiffRow(key === 'j' ? 1 : -1);
        if (!moved) setStatus('表示中の差分がありません');
        return;
      }
      if (key === 'v' || key === 'V') {
        if (!state.diffFocusedRowId) {
          if (!focusNextDiffRow(1)) return;
        }
        e.preventDefault();
        const next = toggleDiffViewedById(state.diffFocusedRowId);
        if (next === false && !getDiffRowByIdFromState(state.diffFocusedRowId)) return;
        saveCurrentDialogState();
        renderResultRows(state.lastDiffRows);
        // 再レンダー後もフォーカスを維持
        focusDiffRow(state.diffFocusedRowId, { scroll: false });
        setStatus(next ? 'レビュー済みにマークしました (v)' : 'レビュー済みを解除しました (v)');
        return;
      }
      if (key === 'x' || key === 'X') {
        if (!state.diffFocusedRowId) {
          if (!focusNextDiffRow(1)) return;
        }
        e.preventDefault();
        const id = state.diffFocusedRowId;
        if (state.diffSelectedIds.has(id)) state.diffSelectedIds.delete(id);
        else state.diffSelectedIds.add(id);
        state.diffSelectionAnchorId = id;
        renderResultRows(state.lastDiffRows);
        focusDiffRow(id, { scroll: false });
        saveCurrentDialogState();
        return;
      }
    }
  });

  // -------------------------------------------------------------------
  // Input handler
  // -------------------------------------------------------------------

  root.addEventListener('input', (e) => {
    if (((e.target as Element)?.closest('#u_lookupMapRows') as HTMLElement | null) as HTMLElement | null) {
      syncLookupMapFromRows();
      saveCurrentDialogState();
      return;
    }
    if (e.target === ui.diffMultiTargets) {
      saveCurrentDialogState();
      return;
    }
    if (e.target === ui.launcherSearch) {
      applyLauncherFilter();
    }
    if (e.target === ui.connectionSearchKeyword || e.target === ui.connectionSearchGuest) {
      saveCurrentDialogState();
    }
  });

  // -------------------------------------------------------------------
  // Settings export search enter key
  // -------------------------------------------------------------------

  ui.settingsExportSearchKeyword.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    withGuard(runSettingsExportSearchApps);
  });

  // -------------------------------------------------------------------
  // Change handler (delegated)
  // -------------------------------------------------------------------

  root.addEventListener('change', (e) => {
    // プラン確認モーダルの「除外」チェックボックス（data-act-event="change"）。
    // <summary> 配下の click でフックすると details の開閉とぶつかるため change で拾う。
    const planExcludeEl = ((e.target as Element | null)?.closest('input[data-act="togglePlanSectionExclude"][data-act-event="change"]') as HTMLInputElement | null);
    if (planExcludeEl) {
      const key = planExcludeEl.dataset.sectionKey || '';
      if (key && typeof togglePlanSectionExclude === 'function') {
        togglePlanSectionExclude(key);
      }
      return;
    }
    if ((e.target as HTMLElement | null)?.id === 'u_csvImportFile') {
      const input = e.target as HTMLInputElement;
      const label = getToolDocument().getElementById('u_csvImportFileName');
      if (label) label.textContent = input.files?.[0]?.name || '未選択';
      return;
    }
    if (e.target === ui.sourceApp || e.target === ui.targetApp) {
      const pastedGuestId = extractGuestIdFromInput((e.target as HTMLInputElement).value);
      const extracted = extractAppIdFromInput((e.target as HTMLInputElement).value);
      if (extracted && extracted !== (e.target as HTMLInputElement).value.trim()) {
        (e.target as HTMLInputElement).value = extracted;
        setStatus(`URL からアプリIDを抽出しました: ${extracted}`);
      }
      if (pastedGuestId) {
        const guestInput = e.target === ui.sourceApp ? ui.sourceGuest : ui.targetGuest;
        if (guestInput && !guestInput.value.trim()) guestInput.value = pastedGuestId;
      }
      const sanitized = String((e.target as HTMLInputElement).value || '').trim();
      const valid = /^\d+$/.test(sanitized);
      (e.target as Element).classList.toggle('input-invalid', !valid);
      (e.target as Element).setAttribute('aria-invalid', valid ? 'false' : 'true');
      if (!valid) {
        setStatus('アプリIDは数値のみで入力してください（例: 123）', true);
      }
      saveCurrentDialogState();
      updateConnectionStepIndicators();
      renderBundleState();
      resetReflectApplyChecks(['diff', 'plan']);
      return;
    }
    if (e.target === ui.connectionSearchAssign || e.target === ui.connectionPresetSelect) {
      saveCurrentDialogState();
      return;
    }
    const reflectApplyCheckKey = (e.target as HTMLElement | null)?.dataset?.reflectApplyCheck;
    if (reflectApplyCheckKey) {
      if (setReflectApplyCheck(reflectApplyCheckKey, !!(e.target as HTMLInputElement).checked)) {
        setStatus('反映前チェックを更新しました');
      }
      return;
    }
    const diffId = (e.target as HTMLElement | null)?.dataset?.diffRowId;
    if (diffId) {
      const res = getToolDocument().getElementById('u_result');
      if (res?.contains(e.target as Node)) state.diffSelectionAnchorId = diffId;
      if ((e.target as HTMLInputElement).checked) state.diffSelectedIds.add(diffId);
      else state.diffSelectedIds.delete(diffId);
      renderResultRows(state.lastDiffRows);
      saveCurrentDialogState();
      return;
    }

    const viewedId = (e.target as HTMLElement | null)?.dataset?.diffViewedId;
    if (viewedId) {
      toggleDiffViewedById(viewedId, !!(e.target as HTMLInputElement).checked);
      saveCurrentDialogState();
      renderResultRows(state.lastDiffRows);
      return;
    }

    const id = (e.target as HTMLElement | null)?.dataset?.nodeId;
    if (id) {
      pushReflectUndo();
      state.reflectActiveNodeId = id;
      if ((e.target as HTMLInputElement).checked) state.reflectSelectedIds.add(id);
      else state.reflectSelectedIds.delete(id);
      renderReflectNodeList();
      return;
    }

    if ((e.target as Element | null)?.closest('#u_diffScopes') || (e.target as Element | null)?.closest('#u_applyScopes') || (e.target as Element | null)?.closest('#u_settingsExportScopes') || (e.target as Element | null)?.closest('#u_recordBackupAppScopes')) {
      saveCurrentDialogState();
      renderBundleState();
      renderScopePickerSummaries();
    }
    if ((e.target as Element | null)?.closest('[data-apply-scope]')) {
      syncApplyScopesFromSidebar();
      saveCurrentDialogState();
      renderBundleState();
      renderReflectMainPanel();
      renderScopePickerSummaries();
      resetReflectApplyChecks(['plan']);
      const putSections = SECTION_DEFS.filter((d) => d.put);
      const sidebarCount = getToolDocument().getElementById('u_sidebarCount');
      const checkedCount = [...getToolDocument().querySelectorAll('#u_reflectSidebarSections [data-apply-scope]:checked')].length;
      if (sidebarCount) sidebarCount.textContent = `${checkedCount} / ${putSections.length}`;
    }
  });

  root.addEventListener('mousedown', (e) => {
    const cb = ((e.target as Element)?.closest('input[type=checkbox][data-diff-row-id]') as HTMLElement | null) as HTMLInputElement | null;
    if (!cb) return;
    const res = getToolDocument().getElementById('u_result');
    if (!res || !res.contains(cb) || !e.shiftKey || !state.diffSelectionAnchorId) return;
    const boxes = [...res.querySelectorAll<HTMLInputElement>('tbody input[type=checkbox][data-diff-row-id]')];
    const ids = boxes.map((el) => el.dataset.diffRowId || '');
    const i0 = ids.indexOf(state.diffSelectionAnchorId);
    const i1 = ids.indexOf(cb.dataset.diffRowId || '');
    if (i0 < 0 || i1 < 0) return;
    e.preventDefault();
    const a = Math.min(i0, i1);
    const b = Math.max(i0, i1);
    const anchorEl = boxes.find((el) => el.dataset.diffRowId === state.diffSelectionAnchorId);
    const anchorChecked = anchorEl ? !!anchorEl.checked : true;
    for (let i = a; i <= b; i++) {
      const id = ids[i];
      if (anchorChecked) state.diffSelectedIds.add(id);
      else state.diffSelectedIds.delete(id);
    }
    renderResultRows(state.lastDiffRows || []);
    saveCurrentDialogState();
  }, true);

  // -------------------------------------------------------------------
  // File input handlers
  // -------------------------------------------------------------------

  ui.sourceBundleFile.addEventListener('change', () => {
    const f = ui.sourceBundleFile.files && ui.sourceBundleFile.files[0];
    ui.sourceBundleFile.value = '';
    if (!f) return;
    withGuard(async () => {
      await importBundleFromFile('source', f);
      setStatus(`比較元バンドル読込完了: ${f.name}`);
    });
  });

  ui.targetBundleFile.addEventListener('change', () => {
    const f = ui.targetBundleFile.files && ui.targetBundleFile.files[0];
    ui.targetBundleFile.value = '';
    if (!f) return;
    withGuard(async () => {
      await importBundleFromFile('target', f);
      setStatus(`比較先バンドル読込完了: ${f.name}`);
    });
  });

  ui.fieldJsonFile.addEventListener('change', () => {
    const f = ui.fieldJsonFile.files && ui.fieldJsonFile.files[0];
    ui.fieldJsonFile.value = '';
    if (!f) return;
    withGuard(async () => {
      const text = await readTextFile(f);
      const parsed = JSON.parse(text);
      ui.fieldJson.value = JSON.stringify(parsed, null, 2);
      setStatus(`フィールドJSON読込完了: ${f.name}`);
    });
  });

  ui.jsconfigFile.addEventListener('change', () => {
    const f = ui.jsconfigFile.files && ui.jsconfigFile.files[0];
    ui.jsconfigFile.value = '';
    if (!f) return;
    withGuard(async () => {
      const text = await readTextFile(f);
      const parsed = JSON.parse(text);
      ui.jsconfigJson.value = JSON.stringify(parsed, null, 2);
      if (typeof renderCustomizeResult === 'function') renderCustomizeResult(parsed);
      setStatus(`JS/CSS設定JSON読込完了: ${f.name}`);
    });
  });

  const patchJsonFileInput = getToolDocument().getElementById('u_patchJsonFileInput') as HTMLInputElement | null;
  if (patchJsonFileInput) {
    patchJsonFileInput.addEventListener('change', () => {
      const f = patchJsonFileInput.files && patchJsonFileInput.files[0];
      patchJsonFileInput.value = '';
      if (!f) return;
      withGuard(async () => {
        if (typeof importPatchJsonFromFile === 'function') await importPatchJsonFromFile(f);
      });
    });
  }

  const reflectSelectionFileInput = getToolDocument().getElementById('u_reflectSelectionFileInput') as HTMLInputElement | null;
  if (reflectSelectionFileInput) {
    reflectSelectionFileInput.addEventListener('change', () => {
      const f = reflectSelectionFileInput.files && reflectSelectionFileInput.files[0];
      reflectSelectionFileInput.value = '';
      if (!f) return;
      withGuard(async () => {
        try {
          const r = await importReflectSelectionFromFile(f);
          renderReflectNodeList();
          const missed = r && r.missed ? r.missed : 0;
          const matched = r && r.matched ? r.matched : 0;
          const total = r && r.total ? r.total : 0;
          const msg = `選択JSONを読込: ${matched}/${total}件を復元${missed ? ` (未一致 ${missed}件)` : ''}`;
          setStatus(msg, missed > 0 && matched === 0);
        } catch (err) {
          setStatus(err && err.message ? err.message : String(err), true);
        }
      });
    });
  }

  const targetPreviewBackupFileInput = getToolDocument().getElementById('u_targetPreviewBackupFileInput') as HTMLInputElement | null;
  if (targetPreviewBackupFileInput) {
    targetPreviewBackupFileInput.addEventListener('change', () => {
      const f = targetPreviewBackupFileInput.files && targetPreviewBackupFileInput.files[0];
      targetPreviewBackupFileInput.value = '';
      if (!f) return;
      withGuard(async () => {
        if (typeof importTargetPreviewBackupFromFile === 'function') await importTargetPreviewBackupFromFile(f);
      });
    });
  }

// Legacy textarea input handling removed – JSONEditor now manages changes.
// The previous code that listened for 'input' events on the textarea has been deprecated.
// JSONEditor instance will invoke its onChange callback defined during initialization.


  // -------------------------------------------------------------------
  // Main click handler (data-act dispatch)
  // -------------------------------------------------------------------

  root.addEventListener('click', (e) => {
    // Reflect inner tab (概要 / フィールド / 他設定)
    const innerTab = ((e.target as Element)?.closest('[data-reflect-inner]') as HTMLElement | null) as HTMLElement | null;
    if (innerTab) {
      activateReflectInnerTab(innerTab.getAttribute('data-reflect-inner') || 'overview');
      return;
    }

    // Favorite toggle
    const favBtn = ((e.target as Element)?.closest('[data-diff-fav-path]') as HTMLElement | null) as HTMLElement | null;
    if (favBtn) {
      const path = normalizeDiffFavoritePath(favBtn.dataset.diffFavPath || '');
      if (!path) return;
      if (state.diffFavoritePaths.has(path)) state.diffFavoritePaths.delete(path);
      else state.diffFavoritePaths.add(path);
      saveCurrentDialogState();
      renderResultRows(state.lastDiffRows);
      return;
    }

    // Review state toggle
    const reviewBtn = ((e.target as Element)?.closest('[data-diff-review-action]') as HTMLElement | null) as HTMLElement | null;
    if (reviewBtn) {
      const rowId = reviewBtn.dataset.diffReviewId || '';
      const action = (reviewBtn.dataset.diffReviewAction || '') as any;
      const changed = setDiffReviewMeta(rowId, action);
      if (!changed) return;
      saveCurrentDialogState();
      renderResultRows(state.lastDiffRows);
      const label = action === 'todo' ? '要対応' : (action === 'ignored' ? '無視' : (action === 'note' ? 'メモ' : 'レビュー状態'));
      setStatus(`${label}を更新しました`);
      return;
    }

    const secNavBtn = ((e.target as Element)?.closest('[data-diff-sec-nav]') as HTMLElement | null) as HTMLElement | null;
    if (secNavBtn) {
      const key = secNavBtn.getAttribute('data-diff-sec-nav') ?? '';
      applyDiffSectionNav(key);
      saveCurrentDialogState();
      const label = key ? (SECTION_DEFS.find((d) => d.key === key)?.label || key) : '全セクション';
      setStatus(key ? `セクションで絞り込み: ${label}` : 'セクション絞り込みを解除しました');
      return;
    }

    // Sidebar section click
    const sidebarItem = ((e.target as Element)?.closest('[data-sidebar-sec]') as HTMLElement | null) as HTMLElement | null;
    if (sidebarItem && !((e.target as Element)?.closest('.sec-check') as HTMLElement | null)) {
      const secKey = sidebarItem.dataset.sidebarSec || '';
      state.reflectActiveSidebarSection = (state.reflectActiveSidebarSection === secKey) ? null : secKey;
      renderReflectSidebar();
      renderReflectMainPanel();
      return;
    }

    // Overview nav
    const overviewNav = ((e.target as Element)?.closest('[data-sidebar-nav]') as HTMLElement | null) as HTMLElement | null;
    if (overviewNav) {
      const secKey = overviewNav.dataset.sidebarNav || '';
      if (secKey) {
        state.reflectActiveSidebarSection = secKey;
        renderReflectSidebar();
        renderReflectMainPanel();
      }
      return;
    }

    // Section toggle (collapse/expand)
    const secToggle = ((e.target as Element)?.closest('[data-diff-sec-toggle]') as HTMLElement | null) as HTMLElement | null;
    if (secToggle) {
      const secKey = secToggle.dataset.diffSecToggle || '';
      if (secKey) {
        if (state.diffCollapsedSections.has(secKey)) state.diffCollapsedSections.delete(secKey);
        else state.diffCollapsedSections.add(secKey);
        if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      }
      return;
    }

    // More diff rows
    const moreRowsBtn = ((e.target as Element)?.closest('[data-act="moreDiffRows"]') as HTMLElement | null) as HTMLElement | null;
    if (moreRowsBtn) {
      const secKey = moreRowsBtn.dataset.sec || '';
      if (!secKey) return;
      const current = Number(state.diffSectionVisibleCounts[secKey] || 80);
      state.diffSectionVisibleCounts[secKey] = current + 80;
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      return;
    }

    // Node mode toggle
    const modeBtn = ((e.target as Element)?.closest('[data-node-mode]') as HTMLElement | null) as HTMLElement | null;
    if (modeBtn) {
      const nodeId = modeBtn.dataset.nodeMode;
      if (nodeId) {
        pushReflectUndo();
        state.reflectActiveNodeId = nodeId;
        state.reflectNodeModes[nodeId] = reflectRowModeById(nodeId) === 'src' ? 'tgt' : 'src';
        renderReflectNodeList();
        setStatus(`ノードモード切替: ${state.reflectNodeModes[nodeId] === 'src' ? '比較元' : '比較先'}`);
      }
      return;
    }

    // Node open (select active node)
    const nodeOpen = ((e.target as Element)?.closest('[data-node-open]') as HTMLElement | null) as HTMLElement | null;
    if (nodeOpen && !((e.target as Element)?.closest('input,button,label,a') as HTMLElement | null)) {
      const nodeId = nodeOpen.dataset.nodeOpen || '';
      if (nodeId) {
        setActiveReflectNode(nodeId, { persist: false });
        renderReflectNodeList();
      }
      return;
    }

    // Node detail tab
    const nodeDetailTab = ((e.target as Element)?.closest('[data-node-detail-tab]') as HTMLElement | null) as HTMLElement | null;
    if (nodeDetailTab) {
      state.reflectDetailTab = nodeDetailTab.dataset.nodeDetailTab || 'diff';
      saveCurrentDialogState();
      renderReflectNodeDetail();
      return;
    }

    // Send a diff row to the reflect queue
    const sendToReflectBtn = ((e.target as Element)?.closest('[data-send-to-reflect]') as HTMLElement | null) as HTMLElement | null;
    if (sendToReflectBtn) {
      const diffRowId = sendToReflectBtn.dataset.sendToReflect || '';
      try {
        const result = queueDiffRowForReflect(diffRowId);
        switchTab('reflect', { persist: false });
        switchSubTab('reflect', 'diff');
        renderReflectModeUi();
        renderReflectNodeList();
        renderReflectMainPanel();
        setStatus('この差分を反映対象に追加しました（差分選択モードで確認できます）');
        return;
      } catch (err) {
        setStatus(err.message || String(err), true);
        return;
      }
    }

    // Copy button
    const copyBtn = ((e.target as Element)?.closest('[data-copy-val]') as HTMLElement | null) as HTMLElement | null;
    if (copyBtn) {
      const val = copyBtn.dataset.copyVal || '';
      try {
        navigator.clipboard.writeText(val);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'コピー済';
        setTimeout(() => { copyBtn.textContent = originalText; }, 1500);
      } catch (err) {
        setStatus(`コピー失敗: ${err.message}`, true);
      }
      return;
    }

    // Add suggested ignore key
    const addSuggestedBtn = ((e.target as Element)?.closest('[data-act="addSuggestedIgnore"]') as HTMLElement | null) as HTMLElement | null;
    if (addSuggestedBtn) {
      const key = addSuggestedBtn.dataset.key || '';
      if (!key) return;
      const current = (ui.ignoreKeys.value || '').split(',').map((k) => k.trim()).filter(Boolean);
      if (!current.includes(key)) {
        current.push(key);
        ui.ignoreKeys.value = current.join(', ');
        renderIgnoreKeyChips();
        saveCurrentDialogState();
        setStatus(`無視キー候補を追加: ${key}`);
      }
      return;
    }

    // Add settings export app
    const addSettingsAppBtn = ((e.target as Element)?.closest('[data-add-settings-app]') as HTMLElement | null) as HTMLElement | null;
    if (addSettingsAppBtn) {
      const appId = addSettingsAppBtn.dataset.addSettingsApp || '';
      const appName = addSettingsAppBtn.dataset.addSettingsName || '';
      addAppIdToSettingsExport(appId, appName);
      return;
    }

    // Source field check-all
    if ((e.target as HTMLElement).id === 'u_sourceFieldCheckAll') {
      const checked = (e.target as HTMLInputElement).checked;
      ui.sourceFieldTbody?.querySelectorAll<HTMLInputElement>('.src-field-sel').forEach(c => { c.checked = checked; });
      return;
    }

    // Sub-tab switching
    const subTab = ((e.target as Element)?.closest('.subtab') as HTMLElement | null) as HTMLElement | null;
    if (subTab) {
      const parent = subTab.dataset.subtabParent || '';
      const nextSubTab = subTab.dataset.subtab || '';
      switchSubTab(parent, nextSubTab);
      syncDiffOnboardingVisibility();
      if (parent === 'diff' && ui.result) renderResultRows(state.lastDiffRows || []);
      if (parent === 'reflect') {
        if (nextSubTab === 'patch' && typeof populatePatchJsonFromCurrentDiff === 'function') {
          try {
            populatePatchJsonFromCurrentDiff({ silent: true });
          } catch (err) { /* ignore until diff exists */ }
        }
        renderReflectModeUi();
        renderReflectMainPanel();
        renderReflectNodeList();
      }
      return;
    }

    // Tab switching
    const tab = ((e.target as Element)?.closest('.tab') as HTMLElement | null) as HTMLElement | null;
    if (tab) {
      const nextTab = tab.dataset.tab || '';
      switchTab(nextTab);
      syncDiffOnboardingVisibility();
      syncMainResultForFeature(nextTab);
      // 補助タブを選んだら ⋯ その他 ドロップダウンを自動で閉じる
      const moreFold = getToolDocument().getElementById('u_kusTabMore') as HTMLDetailsElement | null;
      if (moreFold && moreFold.contains(tab)) moreFold.open = false;
      return;
    }

    // data-act dispatch（ランチャー feature-card 内の子要素クリックでも拾う）
    const actEl = ((e.target as Element)?.closest('[data-act]') as HTMLElement | null) as HTMLElement | null;
    const act = actEl?.dataset.act;
    if (!act) return;

    if (act === 'startChangeWizard') {
      openWizardStep('connection');
      return;
    }
    if (act === 'openWizardStep') {
      openWizardStep(actEl.dataset.wizardStep || 'connection');
      return;
    }
    if (act === 'saveWorkHistory') {
      const entry = saveWorkHistorySnapshot('manual');
      if (entry) setStatus(`作業履歴を保存しました: ${entry.label}`);
      return;
    }
    if (act === 'restoreWorkHistory') {
      restoreWorkHistoryById(actEl.dataset.historyId || '');
      return;
    }
    if (act === 'deleteWorkHistory') {
      const id = actEl.dataset.historyId || '';
      if (!id) return;
      deleteWorkHistoryEntry(id);
      renderWorkHistoryPanel();
      setStatus('作業履歴を削除しました');
      return;
    }
    if (act === 'clearWorkHistory') {
      if (!(state.workHistory || []).length) { setStatus('削除する作業履歴はありません'); return; }
      if (!kusConfirm('作業履歴をすべて削除しますか？')) return;
      clearWorkHistory();
      renderWorkHistoryPanel();
      setStatus('作業履歴をクリアしました');
      return;
    }

    if (act === 'openFeature') {
      const featureKey = actEl.dataset.feature || '';
      const def = openFeatureScreen(featureKey, { persist: false });
      if (!def) return;
      syncMainResultForFeature(def.key);
      saveCurrentDialogState();
      setStatus(`${def.label} を開きました`);
      return;
    }
    if (act === 'toggleLauncherMore') {
      root.classList.toggle('launcher-show-advanced');
      updateLauncherToggleButton();
      applyLauncherFilter();
      saveCurrentDialogState();
      setStatus(root.classList.contains('launcher-show-advanced') ? '補助メニューも表示しました' : 'よく使う作業だけに絞りました');
      return;
    }
    if (act === 'clearLauncherFilter') {
      if (ui.launcherSearch) ui.launcherSearch.value = '';
      ui.launcherGroupFilters?.querySelectorAll<HTMLElement>('.chip[data-group]').forEach((btn) => {
        const active = btn.dataset.group === 'change';
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      applyLauncherFilter();
      ui.launcherSearch?.focus();
      setStatus('変更・反映タブに戻し、機能検索をクリアしました');
      return;
    }

    if (act === 'setLauncherGroup') {
      const group = String(actEl.dataset.group || 'change');
      if (group === 'history' && ui.launcherSearch) ui.launcherSearch.value = '';
      ui.launcherGroupFilters?.querySelectorAll<HTMLElement>('.chip[data-group]').forEach((btn) => {
        const active = btn.dataset.group === group;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
        // roving tabindex: アクティブのみ tab order に入れる
        btn.setAttribute('tabindex', active ? '0' : '-1');
      });
      applyLauncherFilter();
      setStatus(`ランチャータブを切り替えました: ${actEl.textContent?.trim() || ''}`);
      return;
    }
    if (act === 'setDiffViewMode') {
      const mode = actEl.dataset.mode === 'category' ? 'category' : 'table';
      if (state.diffViewMode === mode) return;
      state.diffViewMode = mode;
      if (state.lastDiffRows.length || state.lastFetchIssues.length) renderResultRows(state.lastDiffRows);
      try { saveCurrentDialogState(); } catch (e) { /* ignore */ }
      setStatus(mode === 'category' ? 'セクション別ビューに切り替えました' : '行一覧ビューに切り替えました');
      return;
    }
    if (act === 'setDiffCategoryView') {
      const next = String(actEl.dataset.cat || '');
      if (!next) return;
      state.diffCategoryView = next;
      if (state.lastDiffRows.length || state.lastFetchIssues.length) renderResultRows(state.lastDiffRows);
      try { saveCurrentDialogState(); } catch (e) { /* ignore */ }
      return;
    }
    if (act === 'copyCategoryViewMarkdown') {
      if (!state.lastDiffRows.length) { setStatus('差分結果がありません'); return; }
      import('./diff/category-view.js').then((m) => {
        const md = m.buildCategoryViewMarkdown(state.lastDiffRows, { onlyActive: true });
        copyToClipboard(md, '現在のカテゴリビューを Markdown でコピーしました', 'コピーに失敗しました');
      });
      return;
    }
    if (act === 'downloadCategoryViewMarkdown') {
      if (!state.lastDiffRows.length) { setStatus('差分結果がありません'); return; }
      import('./diff/category-view.js').then((m) => {
        const md = m.buildCategoryViewMarkdown(state.lastDiffRows, { onlyActive: false });
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        downloadText(`差分セクション別_${ts}.md`, md, 'text/markdown');
        setStatus('セクション別ビューを Markdown として保存しました');
      });
      return;
    }
    if (act === 'printCategoryView') {
      try {
        const win = window.__KUS_TOOL_WINDOW__ && !window.__KUS_TOOL_WINDOW__.closed ? window.__KUS_TOOL_WINDOW__ : window;
        win.print();
        setStatus('印刷ダイアログを開きました');
      } catch (e) {
        setStatus('印刷に失敗しました', true);
      }
      return;
    }
    if (act === 'diffSectionsExpandAll') {
      const doc = getToolDocument();
      const els = [...doc.querySelectorAll<HTMLDetailsElement>('#u_result details, #u_result .row .fold, .diff-result-main details')];
      let n = 0;
      els.forEach((el) => {
        if (el instanceof HTMLDetailsElement && !el.open) { el.open = true; n++; }
      });
      setStatus(`差分セクションを ${n} 件展開しました`);
      return;
    }
    if (act === 'diffSectionsCollapseAll') {
      const doc = getToolDocument();
      const els = [...doc.querySelectorAll<HTMLDetailsElement>('#u_result details, #u_result .row .fold, .diff-result-main details')];
      let n = 0;
      els.forEach((el) => {
        if (el instanceof HTMLDetailsElement && el.open) { el.open = false; n++; }
      });
      setStatus(`差分セクションを ${n} 件折りたたみました`);
      return;
    }
    if (act === 'copyDiffResult') {
      const text = (ui.result?.innerText || '').trim();
      if (!text) {
        setStatus('コピー対象の差分結果がありません', true);
        return;
      }
      copyToClipboard(text, '差分結果（テキスト）をコピーしました', '差分結果のコピーに失敗しました');
      return;
    }
    if (act === 'clearDiffFilters') {
      if (ui.diffFilterSection) ui.diffFilterSection.value = '';
      if (ui.diffFilterType) ui.diffFilterType.value = '';
      if (ui.diffFilterSeverity) ui.diffFilterSeverity.value = '';
      if (ui.diffFilterTableOnly) ui.diffFilterTableOnly.checked = false;
      if (ui.diffFilterTableKeyword) ui.diffFilterTableKeyword.value = '';
      if (ui.diffSearch) ui.diffSearch.value = '';
      state.diffFilterSection = '';
      state.diffFilterType = '';
      state.diffFilterSeverity = '';
      state.diffFilterTableOnly = false;
      state.diffFilterTableKeyword = '';
      if (state.lastDiffRows.length || state.lastFetchIssues.length) renderResultRows(state.lastDiffRows);
      renderDiffActiveFilters();
      saveCurrentDialogState();
      setStatus('差分フィルタをクリアしました');
      return;
    }

    if (act === 'toggleHideViewed') {
      state.diffHideViewed = !state.diffHideViewed;
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      saveCurrentDialogState();
      setStatus(state.diffHideViewed ? 'レビュー済みの差分を隠しています' : 'レビュー済みの差分も表示します');
      return;
    }
    if (act === 'markVisibleViewed') {
      if (!state.lastDiffRows.length) { setStatus('差分がありません'); return; }
      const { marked } = markVisibleDiffRowsViewed();
      if (!marked) { setStatus('レビュー済みに追加する差分はありません（表示中はすべて済）'); return; }
      renderResultRows(state.lastDiffRows);
      saveCurrentDialogState();
      setStatus(`表示中の ${marked} 件をレビュー済みにしました`);
      return;
    }
    if (act === 'clearViewed') {
      const n = clearAllDiffViewed();
      if (!n) { setStatus('レビュー済みの記録はありません'); return; }
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      saveCurrentDialogState();
      setStatus(`レビュー済み ${n} 件をすべて解除しました`);
      return;
    }

    if (act === 'backToLauncher') {
      showLauncherScreen({ persist: false });
      updateLauncherToggleButton();
      applyLauncherFilter();
      saveCurrentDialogState();
      setStatus('機能を選んでください');
      return;
    }
    if (act === 'toggleConnectionPanel') {
      const panel = ui.connectionPanel;
      if (!panel) return;
      setConnectionPanelCollapsed(!panel.classList.contains('is-collapsed'));
      return;
    }
    if (act === 'copyToolInfo') {
      const infoText = [
        `tool=${TOOL_ID}`,
        `build=${TOOL_VERSION}`,
        `feature=${state.activeFeatureKey || '-'}`,
        `tab=${state.activeTab || '-'}`
      ].join(' / ');
      copyToClipboard(infoText, 'ツール識別情報をコピーしました', 'ツール識別情報のコピーに失敗しました');
      return;
    }
    if (act === 'copyStatusMessage') {
      const message = String(ui.status?.textContent || '').trim();
      if (!message) {
        setStatus('コピーするステータスがありません', true);
        return;
      }
      copyToClipboard(message, 'ステータスメッセージをコピーしました', 'ステータスメッセージのコピーに失敗しました');
      return;
    }

    // ----- Dialog controls -----
    if (act === 'close') {
      closeGuidedTour({ silent: true });
      teardownDialogResizeHandling();
      const toolWin = getToolWindow();
      const isPopout = toolWin !== window;
      root.remove();
      if (isPopout) {
        try {
          if (window.__KUS_TOOL_WINDOW__ === toolWin) window.__KUS_TOOL_WINDOW__ = null;
        } catch (e) { /* ignore */ }
        try {
          toolWin.close();
        } catch (e) { /* ignore */ }
      }
      return;
    }
    if (act === 'startGuidedTour') { openGuidedTour(); return; }
    if (act === 'tourClose') { closeGuidedTour(); return; }
    if (act === 'tourPrev') { moveGuidedTour(-1); return; }
    if (act === 'tourNext') { moveGuidedTour(1); return; }
    if (act === 'dialogSizeDefault') {
      const next = applyDialogSizePreset('default');
      saveCurrentDialogState();
      setStatus(`ダイアログを標準サイズにしました (${next.width} x ${next.height})`);
      return;
    }
    if (act === 'dialogSizeLarge') {
      const next = applyDialogSizePreset('large');
      saveCurrentDialogState();
      setStatus(`ダイアログを大きめサイズにしました (${next.width} x ${next.height})`);
      return;
    }
    if (act === 'dialogSizeWide') {
      const bounds = getDialogSizeBounds();
      const w = Math.min(bounds.maxWidth, Math.round(bounds.maxWidth * 0.9));
      const h = Math.min(bounds.maxHeight, Math.round(bounds.maxHeight * 0.9));
      const next = applyDialogSize(w, h);
      saveCurrentDialogState();
      setStatus(`ダイアログをワイドサイズにしました (${next.width} x ${next.height})`);
      return;
    }
    if (act === 'dialogSizeMax') {
      const next = applyDialogSizePreset('max');
      saveCurrentDialogState();
      setStatus(`ダイアログを最大サイズにしました (${next.width} x ${next.height})`);
      return;
    }
    if (act === 'setDialogAlign') {
      const align = (actEl.dataset.value || 'center') as 'left' | 'center' | 'right';
      const rectRoot = getToolDocument().getElementById('kintone-unified-suite-v2');
      if (!rectRoot) return;
      const rect = rectRoot.getBoundingClientRect();
      const winWidth = (rectRoot.ownerDocument?.defaultView || window).innerWidth || rect.width;
      let left = rect.left;
      const margin = 16;
      if (align === 'left') left = margin;
      else if (align === 'right') left = Math.max(margin, winWidth - rect.width - margin);
      else left = Math.max(margin, Math.round((winWidth - rect.width) / 2));
      applyDialogPosition(left, rect.top);
      saveCurrentDialogState();
      rectRoot.classList.remove('kus-dialog-align-left', 'kus-dialog-align-center', 'kus-dialog-align-right');
      rectRoot.classList.add(`kus-dialog-align-${align}`);
      setStatus(`ダイアログを${align === 'left' ? '左' : align === 'right' ? '右' : '中央'}に配置しました`);
      return;
    }
    if (act === 'setDisplayPref') {
      const pref = String(actEl.dataset.pref || '');
      const value = String(actEl.dataset.value || '');
      const rootEl = getToolDocument().getElementById('kintone-unified-suite-v2');
      if (!rootEl || !pref) return;
      const prefix = `kus-pref-${pref}-`;
      [...rootEl.classList].forEach((cls) => {
        if (cls.startsWith(prefix)) rootEl.classList.remove(cls);
      });
      rootEl.classList.add(`${prefix}${value}`);
      const labels: Record<string, Record<string, string>> = {
        theme: { light: 'ライト', dark: 'ダーク', contrast: '高コントラスト' },
        fontSize: { sm: '小', md: '標準', lg: '大' },
        palette: { default: '標準', cb: '色覚対応' },
        focusRing: { default: '標準', strong: '強調' },
        verbosity: { brief: '簡潔', normal: '標準', detail: '詳細' }
      };
      const prefLabel = ({ theme: 'テーマ', fontSize: 'フォントサイズ', palette: 'カラーパレット', focusRing: 'フォーカスリング', verbosity: '説明文の詳細度' } as Record<string, string>)[pref] || pref;
      const valueLabel = (labels[pref] && labels[pref][value]) || value;
      setStatus(`${prefLabel}を「${valueLabel}」にしました`);
      return;
    }
    if (act === 'resetDisplayPrefs') {
      const rootEl = getToolDocument().getElementById('kintone-unified-suite-v2');
      if (!rootEl) return;
      [...rootEl.classList].forEach((cls) => {
        if (cls.startsWith('kus-pref-') || cls.startsWith('kus-dialog-align-')) rootEl.classList.remove(cls);
      });
      setStatus('表示設定を既定に戻しました');
      return;
    }
    if (act === 'breadcrumbHome') {
      showLauncherScreen({ persist: false });
      updateLauncherToggleButton();
      applyLauncherFilter();
      saveCurrentDialogState();
      setStatus('ホームへ戻りました');
      return;
    }

    // ----- Navigation -----
    if (act === 'goDiffReview') {
      switchTab('diff');
      if (state.lastDiffRows.length || state.lastFetchIssues.length) {
        openDiffReviewFold({ scroll: true });
      }
      if (ui.result) renderResultRows(state.lastDiffRows || []);
      setStatus('差分一覧へ移動しました');
      return;
    }
    if (act === 'openReflectPreviewEditor') {
      switchTab('reflect', { persist: false });
      // openReflectModal は静的インポート済
      openReflectModal('fieldEditor');
      setStatus('フィールド設定エディタを開きました');
      return;
    }
    if (act === 'openSectionPreviewEditor') {
      openSectionPreviewEditor(actEl.dataset.section || '');
      return;
    }
    if (act === 'openAnalyzeFieldImpact' || act === 'openAnalyzeFieldImpactUnused' || act === 'openAnalyzeFieldGraph') {
      const doc = getToolDocument();
      const toolWindow = getToolWindow();
      const nextSubTab = act === 'openAnalyzeFieldGraph' ? 'fieldGraph' : 'fieldImpact';
      switchTab('analyze', { persist: false });
      switchSubTab('analyze', nextSubTab, { persist: false });

      if (act === 'openAnalyzeFieldImpactUnused') {
        const filterEl = doc.getElementById('u_analyzeFieldFilter') as HTMLInputElement | null;
        if (filterEl) {
          const changed = filterEl.value !== 'unused';
          filterEl.value = 'unused';
          if (changed) filterEl.dispatchEvent(new ((toolWindow as any).Event || Event)('change', { bubbles: true }));
        }
      }

      const focusTarget = act === 'openAnalyzeFieldGraph'
        ? doc.querySelector('[data-act="runFieldDependencyGraph"]')
        : doc.querySelector('[data-act="runFieldImpactAnalysis"]');
      focusTarget?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      saveCurrentDialogState();
      if (act === 'openAnalyzeFieldGraph') {
        setStatus('分析 > 依存グラフへ移動しました');
      } else if (act === 'openAnalyzeFieldImpactUnused') {
        setStatus('分析 > 影響分析（未使用のみ）へ移動しました');
      } else {
        setStatus('分析 > 影響分析へ移動しました');
      }
      return;
    }
    if (act === 'openAnalyzeSubtab') {
      const doc = getToolDocument();
      const toolWindow = getToolWindow();
      const nextSubTab = actEl.dataset.analyzeSubtab || 'dashboard';
      switchTab('analyze', { persist: false });
      switchSubTab('analyze', nextSubTab, { persist: false });
      if (nextSubTab === 'fieldImpact' && actEl.dataset.analyzeFilter) {
        const filterEl = doc.getElementById('u_analyzeFieldFilter') as HTMLInputElement | null;
        if (filterEl) {
          filterEl.value = actEl.dataset.analyzeFilter;
          filterEl.dispatchEvent(new ((toolWindow as any).Event || Event)('change', { bubbles: true }));
        }
      }
      saveCurrentDialogState();
      setStatus(`分析 > ${actEl.textContent?.trim() || '詳細'}へ移動しました`);
      return;
    }

    // ----- Source / Target quick actions -----
    if (act === 'setBothCurrent') {
      if (!DEFAULT_APP_ID) {
        setStatus('現在アプリのIDを取得できませんでした（kintone のアプリ画面で開いてください）', true);
        return;
      }
      ui.sourceApp.value = DEFAULT_APP_ID;
      ui.targetApp.value = DEFAULT_APP_ID;
      saveCurrentDialogState();
      updateConnectionStepIndicators();
      renderBundleState();
      setStatus(`比較元・比較先アプリIDを現在アプリ(${DEFAULT_APP_ID})に設定しました`);
      return;
    }
    if (act === 'setSourceCurrent') {
      ui.sourceApp.value = DEFAULT_APP_ID;
      saveCurrentDialogState();
      updateConnectionStepIndicators();
      setStatus(`比較元アプリIDを現在アプリ(${DEFAULT_APP_ID})に設定しました`);
      return;
    }
    if (act === 'copySourceToTarget') {
      ui.targetApp.value = ui.sourceApp.value.trim();
      ui.targetGuest.value = ui.sourceGuest.value.trim();
      ui.targetPreview.checked = !!ui.sourcePreview.checked;
      saveCurrentDialogState();
      renderBundleState();
      setStatus('比較元設定を比較先へコピーしました');
      return;
    }
    if (act === 'swapSourceTarget') {
      const src = { app: ui.sourceApp.value, guest: ui.sourceGuest.value, preview: ui.sourcePreview.checked };
      ui.sourceApp.value = ui.targetApp.value;
      ui.sourceGuest.value = ui.targetGuest.value;
      ui.sourcePreview.checked = ui.targetPreview.checked;
      ui.targetApp.value = src.app;
      ui.targetGuest.value = src.guest;
      ui.targetPreview.checked = src.preview;
      saveCurrentDialogState();
      renderBundleState();
      setStatus('比較元/比較先設定を入れ替えました');
      return;
    }
    // ----- Settings export quick add -----
    if (act === 'settingsExportUseCurrent') {
      const cur = String(kintone.app.getId() || '').trim();
      if (!cur) { setStatus('現在のアプリIDを取得できませんでした', true); return; }
      const set = new Set(parseAppIdList(ui.settingsExportAppIds.value.trim()));
      set.add(cur);
      ui.settingsExportAppIds.value = [...set].join(', ');
      saveCurrentDialogState();
      setStatus(`現在のApp(${cur})を追加しました`);
      return;
    }
    if (act === 'settingsExportUseSource') {
      const srcId = ui.sourceApp.value.trim();
      if (!srcId) { setStatus('比較元アプリIDが空です', true); return; }
      const set = new Set(parseAppIdList(ui.settingsExportAppIds.value));
      set.add(srcId);
      ui.settingsExportAppIds.value = [...set].join(', ');
      ui.settingsExportGuest.value = ui.sourceGuest.value.trim();
      ui.settingsExportPreview.checked = !!ui.sourcePreview.checked;
      saveCurrentDialogState();
      setStatus(`比較元アプリ(${srcId})を追加しました`);
      return;
    }
    if (act === 'settingsExportUseTarget') {
      const tgtId = ui.targetApp.value.trim();
      if (!tgtId) { setStatus('比較先アプリIDが空です', true); return; }
      const set = new Set(parseAppIdList(ui.settingsExportAppIds.value));
      set.add(tgtId);
      ui.settingsExportAppIds.value = [...set].join(', ');
      ui.settingsExportGuest.value = ui.targetGuest.value.trim();
      ui.settingsExportPreview.checked = !!ui.targetPreview.checked;
      saveCurrentDialogState();
      setStatus(`比較先アプリ(${tgtId})を追加しました`);
      return;
    }
    if (act === 'settingsExportScopeAll') { setSettingsExportScopeSelection(true); setStatus('設定取得セクションを全選択しました'); return; }
    if (act === 'settingsExportScopeNone') { setSettingsExportScopeSelection(false); setStatus('設定取得セクションを全解除しました'); return; }
    if (act === 'recordBackupScopeAll' || act === 'recordBackupScopeNone') {
      const checked = act === 'recordBackupScopeAll';
      const container = getToolDocument().getElementById('u_recordBackupAppScopes');
      if (container) {
        [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].forEach((checkbox) => {
          checkbox.checked = checked;
        });
      }
      saveCurrentDialogState();
      setStatus(`レコードバックアップに同梱する設定を${checked ? '全選択' : '全解除'}しました`);
      return;
    }
    if (act === 'runSettingsExportJson') return withGuard(async () => runSettingsExport('json'));
    if (act === 'runSettingsExportZip') return withGuard(async () => runSettingsExport('zip'));
    if (act === 'settingsExportLoadToDiff') {
      const appId = actEl.dataset.appId || '';
      const side = (actEl.dataset.side === 'target' ? 'target' : 'source') as 'source' | 'target';
      if (!appId) { setStatus('対象アプリIDが取得できませんでした', true); return; }
      const ok = loadSettingsExportBundleToDiff(appId, side);
      if (!ok) { setStatus(`App ${appId} の取得済みバンドルが見つかりません（先に「JSONで一括取得」を実行してください）`, true); return; }
      // 差分タブへ移動して取り込み済みバンドルを表示（importBundleFromFile と同じ後処理）
      switchTab('diff');
      renderResultRows([]);
      renderBundleState();
      renderReflectSidebar();
      renderReflectMainPanel();
      const sideLabel = side === 'source' ? '比較元' : '比較先';
      setStatus(`App ${appId} の取得済みJSONを${sideLabel}に読込みました（差分タブで「差分比較」を実行してください）`);
      return;
    }
    if (act === 'settingsExportSearchApps') return withGuard(runSettingsExportSearchApps);
    if (act === 'settingsExportAddSpace') return withGuard(addSpaceAppsToSettingsExport);
    if (act === 'connectionSearchApps') return withGuard(runConnectionSearchApps);
    if (act === 'addConnectionSearchApp') {
      const appId = actEl.dataset.appId || '';
      const appName = actEl.dataset.appName || '';
      addConnectionSearchApp(appId, appName);
      return;
    }
    if (act === 'saveConnectionPreset') {
      saveConnectionPresetFromCurrent();
      return;
    }
    if (act === 'applyConnectionPreset') {
      applyConnectionPresetById(ui.connectionPresetSelect?.value || '');
      return;
    }
    if (act === 'deleteConnectionPreset') {
      deleteSelectedConnectionPreset();
      return;
    }

    // ----- Diff actions -----
    if (act === 'prefetchCommonData') return withGuard(runPrefetchCommonData);
    if (act === 'runDiffAndPlan') {
      return withGuard(async () => {
        await runDiffAndPreviewPlan();
        markReflectApplyChecks(['diff', 'plan']);
        saveWorkHistorySnapshot('plan', { label: '差分比較・プラン確認後', silent: true });
      });
    }
    if (act === 'runDiff') {
      return withGuard(async () => {
        await runDiff();
        markReflectApplyChecks(['diff']);
        resetReflectApplyChecks(['plan']);
        saveWorkHistorySnapshot('diff', { label: '差分比較後', silent: true });
      });
    }
    if (act === 'runDiffLoadReflectNodes') {
      return withGuard(async () => {
        switchTab('reflect', { persist: false });
        switchSubTab('reflect', 'diff', { persist: false });
        await runDiff();
        markReflectApplyChecks(['diff']);
        resetReflectApplyChecks(['plan']);
        loadReflectRowsFromLastDiff();
        renderReflectModeUi();
        renderReflectMainPanel();
        saveWorkHistorySnapshot('diff', { label: '差分候補作成後', silent: true });
        setStatus(`差分比較と候補作成が完了しました (${(state.reflectRows || []).length}件)`);
      });
    }
    if (act === 'exportDiffJson') return withGuard(exportDiffJson);
    if (act === 'exportDiffHtml') return withGuard(exportDiffHtml);
    if (act === 'exportPatchJson') return withGuard(exportPatchJson);
    if (act === 'exportBundleJson') return withGuard(exportBundleJson);

    // ----- Diff theme / collapse -----
    if (act === 'toggleDiffTheme') {
      state.diffViewTheme = state.diffViewTheme === 'dark' ? 'light' : 'dark';
      syncDiffThemeButton();
      saveCurrentDialogState();
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      setStatus(`比較ビューを${getThemeDisplayLabel(state.diffViewTheme)}テーマに切り替えました`);
      return;
    }
    if (act === 'collapseDiffSections') {
      state.diffCollapsedSections = new Set((state.lastDiffRows || []).map((r) => r.sectionKey || r.section || '未分類'));
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      setStatus('比較ビューのセクションを全て折り畳みました');
      return;
    }
    if (act === 'expandDiffSections') {
      state.diffCollapsedSections = new Set();
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      setStatus('比較ビューのセクションを全て展開しました');
      return;
    }

    // ----- Diff scope selection -----
    if (act === 'openDiffScopePicker') { openScopePicker('diff'); return; }
    if (act === 'openReflectScopePicker') { renderReflectSidebar(); renderReflectPresetSelect(); openScopePicker('reflect'); return; }
    if (act === 'openSettingsExportScopePicker') { openScopePicker('settingsExport'); return; }
    if (act === 'closeScopePicker') { closeScopePicker(); return; }

    // ----- Shortcut help modal -----
    if (act === 'openShortcutHelp') {
      if (ui.shortcutHelpModal) ui.shortcutHelpModal.hidden = false;
      return;
    }
    if (act === 'closeShortcutHelp') {
      if (ui.shortcutHelpModal) ui.shortcutHelpModal.hidden = true;
      return;
    }
    if (act === 'diffScopeAll') {
      setScopeSelection(ui.diffScopes, true);
      renderScopePickerSummaries();
      setStatus('比較セクションを全選択しました');
      return;
    }
    if (act === 'diffScopeNone') {
      setScopeSelection(ui.diffScopes, false);
      renderScopePickerSummaries();
      setStatus('比較セクションを全解除しました');
      return;
    }

    // ----- Diff selection -----
    if (act === 'selectVisibleDiffs') {
      state.diffSelectedIds = new Set(getRenderedDiffRows().map((row) => row._id));
      renderResultRows(state.lastDiffRows);
      setStatus(`表示中の差分を選択しました (${state.diffSelectedIds.size}件)`);
      return;
    }
    if (act === 'selectAllDiffs') {
      state.diffSelectedIds = new Set((state.lastDiffRows || []).map((row) => row._id));
      renderResultRows(state.lastDiffRows);
      setStatus(`全差分を選択しました (${state.diffSelectedIds.size}件)`);
      return;
    }
    if (act === 'clearDiffSelection') {
      state.diffSelectedIds = new Set();
      renderResultRows(state.lastDiffRows);
      setStatus('差分選択を解除しました');
      return;
    }
    if (act === 'openDiffPopout') {
      const w = openDiffViewerPopout();
      if (!w) setStatus('別ウィンドウを開けませんでした（ポップアップがブロックされている可能性があります）', true);
      else setStatus('差分を別ウィンドウで開きました');
      return;
    }
    if (act === 'diffUiPreset') {
      const pid = actEl.dataset.preset || '';
      applyDiffUiPreset(pid);
      saveCurrentDialogState();
      setStatus('差分表示プリセットを適用しました');
      return;
    }
    if (act === 'saveDiffSelectionSet') {
      try {
        saveDiffSelectionSet(ui.diffSelectionSetName?.value);
        setStatus('選択セットを保存しました');
      } catch (err) {
        setStatus(err.message || String(err), true);
      }
      return;
    }
    if (act === 'loadDiffSelectionSet') {
      const name = ui.diffSelectionSetSelect?.value || '';
      const r = loadDiffSelectionSet(name);
      if (!r) {
        setStatus('読み込めるセットを選択してください', true);
        return;
      }
      saveCurrentDialogState();
      setStatus(r.mismatch
        ? `選択を復元しました（比較条件が異なる可能性あり: ${r.restored}/${r.requested}件）`
        : `選択を復元しました (${r.restored}件)`);
      return;
    }
    if (act === 'deleteDiffSelectionSet') {
      const name = ui.diffSelectionSetSelect?.value || '';
      if (!name) {
        setStatus('削除するセットを選んでください', true);
        return;
      }
      deleteDiffSelectionSet(name);
      setStatus(`選択セットを削除しました: ${name}`);
      return;
    }
    if (act === 'dismissDiffOnboarding') {
      diffOnboardingDismissed = true;
      syncDiffOnboardingVisibility();
      return;
    }
    if (act === 'toggleDiffFavoritesOnly') {
      state.diffFavoritesOnly = !state.diffFavoritesOnly;
      updateDiffFavoritesOnlyButton();
      saveCurrentDialogState();
      if (state.lastDiffRows.length || state.lastFetchIssues.length) renderResultRows(state.lastDiffRows);
      else renderDiffSelectionState();
      setStatus(`お気に入りフィルタを${state.diffFavoritesOnly ? 'ON' : 'OFF'}にしました`);
      return;
    }
    if (act === 'diffMultiUseCurrentTarget') {
      if (!ui.diffMultiTargets) return;
      const cur = ui.targetApp.value.trim();
      if (!cur) {
        setStatus('比較先アプリIDを入力してから追加してください', true);
        return;
      }
      const ids = new Set(String(ui.diffMultiTargets.value || '').split(/[\s,]+/).map((v) => v.trim()).filter(Boolean));
      ids.add(cur);
      ui.diffMultiTargets.value = [...ids].join('\n');
      saveCurrentDialogState();
      setStatus(`比較先アプリID ${cur} を一括比較リストへ追加しました`);
      return;
    }
    if (act === 'runMultiTargetDiff') {
      return withGuard(async () => {
        const area = ui.diffMultiTargets;
        const out = ui.diffMultiTargetResult;
        if (!area || !out) throw new Error('複数比較先UIが見つかりません');
        const targets = [...new Set(String(area.value || '').split(/[\s,]+/).map((v) => v.trim()).filter(Boolean))];
        if (!targets.length) throw new Error('比較先アプリIDを1件以上入力してください');
        const sourceId = ui.sourceApp.value.trim();
        if (!state.importedSourceBundle && !sourceId) throw new Error('比較元アプリIDを入力してください');
        const originalTarget = {
          appId: ui.targetApp.value,
          guest: ui.targetGuest.value,
          preview: !!ui.targetPreview.checked
        };
        const rows = [];
        for (let i = 0; i < targets.length; i += 1) {
          const targetAppId = targets[i];
          ui.targetApp.value = targetAppId;
          saveCurrentDialogState();
          setStatus(`複数比較先を比較中 (${i + 1}/${targets.length}) App:${targetAppId}`);
          await runDiff();
          const summary = summarizeRows(state.lastDiffRows || []);
          rows.push({
            targetAppId,
            diffCount: countActualDiffRows(state.lastDiffRows || []),
            sameCount: summary.same,
            issueCount: (state.lastFetchIssues || []).length
          });
        }
        ui.targetApp.value = originalTarget.appId;
        ui.targetGuest.value = originalTarget.guest;
        ui.targetPreview.checked = originalTarget.preview;
        saveCurrentDialogState();
        out.innerHTML = `<table class="diff-table"><thead><tr><th style="width:120px">比較先App</th><th style="width:90px">差分</th><th style="width:90px">同一</th><th style="width:120px">取得失敗</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.targetAppId)}</td><td>${r.diffCount}</td><td>${r.sameCount}</td><td>${r.issueCount}</td></tr>`).join('')}</tbody></table>`;
        setStatus(`複数比較先の比較が完了しました (${rows.length}件)`);
      });
    }

    // ----- Bundle import/clear -----
    if (act === 'importSourceBundle') return ui.sourceBundleFile.click();
    if (act === 'importTargetBundle') return ui.targetBundleFile.click();
    if (act === 'clearBundle') {
      state.importedSourceBundle = null;
      state.importedTargetBundle = null;
      state.importedSourceName = '';
      state.importedTargetName = '';
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
      renderDiffFilterOptions();
      renderReflectNodeList();
      renderBundleState();
      setStatus('バンドル読込を解除しました');
      return;
    }

    // ----- Ignore key actions -----
    if (act === 'addPresetKey') {
      const key = actEl.dataset.key;
      if (!key) return;
      const current = (ui.ignoreKeys.value || '').split(',').map((k) => k.trim()).filter(Boolean);
      if (!current.includes(key)) {
        current.push(key);
        ui.ignoreKeys.value = current.join(', ');
        renderIgnoreKeyChips();
        saveCurrentDialogState();
      }
      return;
    }
    if (act === 'addIgnoreKey') { addIgnoreKeyFromInput(); return; }
    if (act === 'removeIgnoreKey') {
      const key = actEl.dataset.key;
      if (!key) return;
      const current = (ui.ignoreKeys.value || '').split(',').map((k) => k.trim()).filter(Boolean).filter((k) => k !== key);
      ui.ignoreKeys.value = current.join(', ');
      renderIgnoreKeyChips();
      saveCurrentDialogState();
      return;
    }
    if (act === 'ignoreRowKey' || act === 'ignoreRowPath') {
      const isPath = act === 'ignoreRowPath';
      const raw = isPath ? (actEl.dataset.path || '') : (actEl.dataset.key || '');
      const value = String(raw || '').trim();
      if (!value) {
        setStatus(isPath ? '無視するパスを取得できませんでした' : '無視するキー名を取得できませんでした', true);
        return;
      }
      const current = (ui.ignoreKeys.value || '').split(',').map((k) => k.trim()).filter(Boolean);
      if (current.includes(value)) {
        setStatus(`既に無視リストに含まれています: ${value}`);
        return;
      }
      current.push(value);
      ui.ignoreKeys.value = current.join(', ');
      renderIgnoreKeyChips();
      renderResultRows(state.lastDiffRows || []);
      saveCurrentDialogState();
      setStatus(isPath
        ? `無視パスを追加しました: ${value} （次回の差分比較から反映）`
        : `無視キーを追加しました: ${value} （次回の差分比較から反映）`);
      return;
    }
    if (act === 'saveIgnorePreset') {
      try {
        const entry = saveIgnorePreset(ui.ignorePresetName?.value || '');
        if (ui.ignorePresetName) ui.ignorePresetName.value = '';
        setStatus(`無視キーセットを保存しました: ${entry.name} (${entry.keys.length}件)`);
      } catch (err: any) {
        setStatus(err?.message || String(err), true);
      }
      return;
    }
    if (act === 'loadIgnorePreset' || act === 'mergeIgnorePreset') {
      const name = ui.ignorePresetSelect?.value || '';
      if (!name) { setStatus('読み込むセットを選んでください', true); return; }
      const entry = loadIgnorePreset(name, { merge: act === 'mergeIgnorePreset' });
      if (!entry) { setStatus('セットを読み込めませんでした', true); return; }
      renderIgnoreKeyChips();
      saveCurrentDialogState();
      setStatus(act === 'mergeIgnorePreset'
        ? `無視キーセットを追加（マージ）しました: ${entry.name}`
        : `無視キーセットを読込みました: ${entry.name}（${entry.keys.length}件で置き換え）`);
      return;
    }
    if (act === 'deleteIgnorePreset') {
      const name = ui.ignorePresetSelect?.value || '';
      if (!name) { setStatus('削除するセットを選んでください', true); return; }
      const ok = deleteIgnorePreset(name);
      if (!ok) { setStatus('セットを削除できませんでした', true); return; }
      setStatus(`無視キーセットを削除しました: ${name}`);
      return;
    }

    // ----- Lookup map -----
    if (act === 'addLookupMapRow') {
      const container = getToolDocument().getElementById('u_lookupMapRows');
      if (!container) return;
      if (container.querySelector('.muted')) container.innerHTML = '';
      const i = container.querySelectorAll('[data-lookup-row]').length;
      const row = getToolDocument().createElement('div');
      row.className = 'btns';
      row.style.marginTop = '4px';
      row.dataset.lookupRow = String(i);
      row.innerHTML =
        `<span style="align-self:center;font-size:11px;color:#64748b;white-space:nowrap">変換元</span>` +
        `<input type="text" class="lookup-from" value="" placeholder="AppID" style="flex:1;min-width:0">` +
        `<span style="align-self:center;padding:0 4px;color:#64748b">→</span>` +
        `<span style="align-self:center;font-size:11px;color:#64748b;white-space:nowrap">変換先</span>` +
        `<input type="text" class="lookup-to" value="" placeholder="AppID" style="flex:1;min-width:0">` +
        `<button type="button" class="btn sub" data-act="removeLookupMapRow" data-row="${i}" style="padding:4px 8px">×</button>`;
      container.appendChild(row);
      (row.querySelector('.lookup-from') as HTMLInputElement | null)?.focus();
      return;
    }
    if (act === 'removeLookupMapRow') {
      const row = ((e.target as Element)?.closest('[data-lookup-row]') as HTMLElement | null) as HTMLElement | null;
      if (row) {
        row.remove();
        syncLookupMapFromRows();
        renderLookupMapRows();
        saveCurrentDialogState();
      }
      return;
    }

    // ----- Reflect scope selection -----
    if (act === 'applyScopeAll') {
      setScopeSelection(ui.applyScopes, true);
      renderReflectSidebar();
      renderReflectMainPanel();
      setStatus('反映するセクションを全選択しました');
      return;
    }
    if (act === 'applyScopeNone') {
      setScopeSelection(ui.applyScopes, false);
      renderReflectSidebar();
      renderReflectMainPanel();
      setStatus('反映するセクションを全解除しました');
      return;
    }
    if (act === 'applyScopeDiffOnly') {
      const diffCounts = getDiffCountsBySection();
      ui.applyScopes?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((c) => {
        const dc = diffCounts[c.value];
        c.checked = !!(dc && dc.total > 0);
      });
      saveCurrentDialogState();
      renderReflectSidebar();
      renderReflectMainPanel();
      setStatus('差分のあるセクションのみ選択しました');
      return;
    }
    if (act === 'applyScopePreset') {
      const preset = actEl.dataset.scopePreset || '';
      const presetMap: Record<string, string[]> = {
        safe: ['layoutSettings', 'viewSettings', 'reportSettings', 'customizeSettings', 'categories', 'notifications', 'perRecordNotifications', 'reminderNotifications'],
        visual: ['layoutSettings', 'viewSettings', 'reportSettings'],
        permissions: ['appAcl', 'fieldAcl', 'recordPermissions'],
        customize: ['customizeSettings'],
        noAcl: SECTION_DEFS.filter((def) => def.put && !['appAcl', 'fieldAcl', 'recordPermissions'].includes(def.key)).map((def) => def.key)
      };
      const labels: Record<string, string> = {
        safe: '安全寄りセット',
        visual: '画面系セット',
        permissions: '権限系セット',
        customize: 'JS/CSSセット',
        noAcl: '権限除外セット'
      };
      const selected = new Set(presetMap[preset] || []);
      if (!selected.size) return;
      ui.applyScopes?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((c) => {
        c.checked = selected.has(c.value);
      });
      saveCurrentDialogState();
      renderReflectSidebar();
      renderReflectMainPanel();
      setStatus(`${labels[preset] || 'プリセット'}を選択しました`);
      return;
    }
    if (act === 'applyScopeHighRisk') {
      const highRiskSections = new Set(
        (getActualDiffRows(state.lastDiffRows || []) as any[])
          .filter((row: any) => String(row.severity || '').toLowerCase() === 'high')
          .map((row: any) => row.sectionKey)
          .filter(Boolean)
      );
      [...(ui.applyScopes as Element).querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].forEach((c) => {
        c.checked = highRiskSections.has(c.value);
      });
      saveCurrentDialogState();
      renderReflectSidebar();
      renderReflectMainPanel();
      setStatus(highRiskSections.size
        ? `高重要度の差分があるセクションを選択しました (${highRiskSections.size}件)`
        : '高重要度の差分セクションはありません');
      return;
    }
    if (act === 'reflectSidebarOverview') {
      state.reflectActiveSidebarSection = null;
      renderReflectSidebar();
      renderReflectMainPanel();
      setStatus('いまの反映内容を表示しました');
      return;
    }

    // ----- Reflect mode switching -----
    if (act === 'reflectModeSection') {
      state.reflectActiveSidebarSection = null;
      switchSubTab('reflect', 'settings');
      activateReflectInnerTab('overview');
      renderReflectModeUi();
      renderReflectMainPanel();
      setStatus('設定画面で反映モードに切り替えました');
      return;
    }
    if (act === 'reflectModeNode') {
      if (ui.reflectSimpleMode?.checked) {
        setStatus('簡易表示中はノード選択に切り替えられません。「簡易表示」をオフにしてください。');
        return;
      }
      state.reflectActiveSidebarSection = null;
      switchSubTab('reflect', 'diff');
      renderReflectModeUi();
      if (state.lastDiffRows && state.lastDiffRows.length > 0 && !state.reflectRows.length) {
        loadReflectRowsFromLastDiff();
      }
      setStatus('差分から調整モードに切り替えました');
      return;
    }
    if (act === 'reflectModeJson') {
      state.reflectActiveSidebarSection = null;
      switchSubTab('reflect', 'json');
      renderReflectModeUi();
      renderReflectMainPanel();
      setStatus('JSON詳細ルートに切り替えました');
      return;
    }

    // ----- Reflect preset actions -----
    if (act === 'saveReflectPreset') {
      const name = (kusPrompt('プリセット名を入力してください（例: 開発→検証 権限以外）', '') || '').trim();
      if (!name) return;
      try {
        saveReflectPreset(name);
        renderReflectPresetSelect(name);
        setStatus(`プリセット「${name}」を保存しました`);
      } catch (err) {
        setStatus(err.message || String(err), true);
      }
      return;
    }
    if (act === 'applyReflectPreset') {
      const sel = getToolDocument().getElementById('u_reflectPresetSelect') as HTMLSelectElement | null;
      const name = sel ? sel.value : '';
      if (!name) {
        setStatus('読み込むプリセットを選んでください');
        return;
      }
      try {
        applyReflectPreset(name);
        renderReflectSidebar();
        renderReflectMainPanel();
        renderReflectAssistPanel();
        setStatus(`プリセット「${name}」を読み込みました`);
      } catch (err) {
        setStatus(err.message || String(err), true);
      }
      return;
    }
    if (act === 'deleteReflectPreset') {
      const sel = getToolDocument().getElementById('u_reflectPresetSelect') as HTMLSelectElement | null;
      const name = sel ? sel.value : '';
      if (!name) {
        setStatus('削除するプリセットを選んでください');
        return;
      }
      if (!kusConfirm(`プリセット「${name}」を削除しますか？`)) return;
      deleteReflectPreset(name);
      renderReflectPresetSelect('');
      setStatus(`プリセット「${name}」を削除しました`);
      return;
    }

    // ----- Reflect node actions -----
    if (act === 'loadReflectNodes') return withGuard(async () => { loadReflectRowsFromLastDiff(); });
    if (act === 'selectVisibleReflectNodes') {
      const visibleIds = getVisibleReflectNodeIds();
      if (!visibleIds.length) {
        setStatus('表示中のノードがありません');
        return;
      }
      pushReflectUndo();
      visibleIds.forEach((id) => state.reflectSelectedIds.add(id));
      renderReflectNodeList();
      setStatus(`表示中ノードを選択しました (${visibleIds.length}件)`);
      return;
    }
    if (act === 'clearVisibleReflectNodes') {
      const visibleIds = getVisibleReflectNodeIds();
      if (!visibleIds.length) {
        setStatus('表示中のノードがありません');
        return;
      }
      pushReflectUndo();
      let cleared = 0;
      visibleIds.forEach((id) => {
        if (state.reflectSelectedIds.delete(id)) cleared += 1;
      });
      renderReflectNodeList();
      setStatus(`表示中ノードの選択を解除しました (${cleared}件)`);
      return;
    }
    if (act === 'selectHighSeverityReflectNodes') {
      const highIds = (state.reflectRows || [])
        .filter((row) => String(row.severity || 'low').toLowerCase() === 'high')
        .map((row) => row._id)
        .filter(Boolean);
      if (!highIds.length) {
        setStatus('高重要度のノードはありません');
        return;
      }
      pushReflectUndo();
      highIds.forEach((id) => state.reflectSelectedIds.add(id));
      renderReflectNodeList();
      setStatus(`高重要度ノードを選択しました (${highIds.length}件)`);
      return;
    }
    if (act === 'selectReflectNodesAll') {
      pushReflectUndo();
      state.reflectSelectedIds = new Set((state.reflectRows || []).map((r) => r._id));
      renderReflectNodeList();
      setStatus('反映ノードを全選択しました');
      return;
    }
    // ヘッダー折りたたみ／展開
    if (act === 'toggleHeaderCollapse') {
      const doc = getToolDocument();
      const root = doc.getElementById('kintone-unified-suite-v2');
      if (!root) return;
      const collapsed = root.classList.toggle('header-collapsed');
      const btn = doc.getElementById('u_headerCollapseBtn');
      if (btn) {
        btn.textContent = collapsed ? '▼' : '▲';
        btn.setAttribute('aria-label', collapsed ? 'ヘッダーを展開' : 'ヘッダーを折りたたむ');
        btn.setAttribute('title', collapsed ? 'ヘッダーを展開' : 'ヘッダーを折りたたむ');
      }
      return;
    }
    // 差分タブ：ヒーローバーの「⚙ 詳細条件」で「比較条件の調整」フォールドを開閉
    if (act === 'toggleDiffAdvanced') {
      const doc = getToolDocument();
      const adv = doc.getElementById('u_diffAdvancedFold') as HTMLDetailsElement | null;
      if (adv) {
        adv.open = !adv.open;
        if (adv.open) adv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setStatus(adv.open ? '比較条件の調整を開きました' : '比較条件の調整を折り畳みました');
      }
      return;
    }
    // S2: セクション分布バーから差分一覧へ絞り込みジャンプ
    if (act === 'filterDiffBySectionFromDist') {
      const secKey = String(actEl.dataset.section || '');
      switchTab('diff');
      openDiffReviewFold({ scroll: true });
      if (ui.diffFilterSection) ui.diffFilterSection.value = secKey;
      state.diffFilterSection = secKey;
      renderDiffActiveFilters();
      renderResultRows(state.lastDiffRows);
      const lbl = SECTION_DEFS.find((d) => d.key === secKey)?.label || secKey;
      setStatus(`差分一覧を「${lbl}」で絞り込みました`);
      return;
    }
    // U4: ノードモードの一括選択ツールバー
    if (act === 'reflectBulkSelect') {
      const kind = String(actEl.dataset.bulk || '');
      const allRows = state.reflectRows || [];
      const visibleIds = new Set(getVisibleReflectNodeIds());
      pushReflectUndo();
      if (kind === 'all') {
        visibleIds.forEach((id) => state.reflectSelectedIds.add(id));
        setStatus(`表示中の全候補を選択しました (${visibleIds.size}件)`);
      } else if (kind === 'high') {
        // 表示中の他重要度はいったん解除し、高のみへ絞る（「高のみ」というラベル準拠）
        visibleIds.forEach((id) => state.reflectSelectedIds.delete(id));
        const ids = allRows
          .filter((r) => visibleIds.has(r._id) && String(r.severity || 'low').toLowerCase() === 'high')
          .map((r) => r._id);
        ids.forEach((id) => state.reflectSelectedIds.add(id));
        setStatus(`高重要度のみ選択しました (${ids.length}件)`);
      } else if (kind === 'medium') {
        // 表示中の他重要度を解除して「中以下」のみへ絞る
        visibleIds.forEach((id) => state.reflectSelectedIds.delete(id));
        const ids = allRows
          .filter((r) => visibleIds.has(r._id) && ['medium', 'low'].includes(String(r.severity || 'low').toLowerCase()))
          .map((r) => r._id);
        ids.forEach((id) => state.reflectSelectedIds.add(id));
        setStatus(`中以下のみ選択しました (${ids.length}件)`);
      } else if (kind === 'renames') {
        // 改名候補のみへ絞る（既存選択は解除）
        visibleIds.forEach((id) => state.reflectSelectedIds.delete(id));
        const ids = allRows.filter((r) => !!r.renameCandidate && visibleIds.has(r._id)).map((r) => r._id);
        ids.forEach((id) => state.reflectSelectedIds.add(id));
        setStatus(`改名候補のみ選択しました (${ids.length}件)`);
      } else if (kind === 'invert') {
        visibleIds.forEach((id) => {
          if (state.reflectSelectedIds.has(id)) state.reflectSelectedIds.delete(id);
          else state.reflectSelectedIds.add(id);
        });
        setStatus(`表示中の選択を反転しました`);
      } else if (kind === 'clear') {
        state.reflectSelectedIds = new Set();
        setStatus('全選択解除しました');
      }
      renderReflectNodeList();
      return;
    }
    if (act === 'clearReflectNodes') {
      pushReflectUndo();
      state.reflectSelectedIds = new Set();
      renderReflectNodeList();
      setStatus('反映ノードを全解除しました');
      return;
    }
    if (act === 'reflectUndo') {
      if (!undoReflectState()) { setStatus('Undoできる操作がありません'); return; }
      renderReflectNodeList();
      setStatus('ノード操作をUndoしました');
      return;
    }
    if (act === 'reflectRedo') {
      if (!redoReflectState()) { setStatus('Redoできる操作がありません'); return; }
      renderReflectNodeList();
      setStatus('ノード操作をRedoしました');
      return;
    }
    if (act === 'exportReflectSelection') {
      try {
        const r = exportReflectSelectionJson();
        setStatus(`選択をJSONに保存しました: ${r.filename} (${r.selectedCount}件)`);
      } catch (err) {
        setStatus(err && err.message ? err.message : String(err), true);
      }
      return;
    }
    if (act === 'importReflectSelection') {
      const doc = getToolDocument();
      const input = doc && doc.getElementById('u_reflectSelectionFileInput') as HTMLInputElement | null;
      if (input) { input.value = ''; input.click(); }
      return;
    }
    if (act === 'reflectModeAllSrc') return runReflectModeAll('src');
    if (act === 'reflectModeAllTgt') return runReflectModeAll('tgt');
    if (act === 'reflectModeVisibleSrc') return runReflectModeVisible('src');
    if (act === 'reflectModeVisibleTgt') return runReflectModeVisible('tgt');
    if (act === 'clearReflectNodeFilters') {
      if (ui.nodeSearch) ui.nodeSearch.value = '';
      if (ui.nodeFilterSection) ui.nodeFilterSection.value = '';
      if (ui.nodeFilterType) ui.nodeFilterType.value = '';
      if (ui.nodeFilterSeverity) ui.nodeFilterSeverity.value = '';
      state.reflectPropertyFilters = new Set();
      renderReflectNodeList();
      setStatus('ノード絞り込み条件を解除しました');
      return;
    }
    if (act === 'toggleReflectPropertyPanel') {
      state.reflectPropertyPanelOpen = !state.reflectPropertyPanelOpen;
      renderReflectNodeList();
      setStatus(`プロパティ選択を${state.reflectPropertyPanelOpen ? '表示' : '非表示'}にしました`);
      return;
    }
    if (act === 'selectAllReflectProperties') {
      const keys = [...(state.reflectRows || [])]
        .map((row) => {
          const path = String(row.path || '');
          const m = path.match(/(?:^|\.)(?:properties|fields)\.([^.[\]]+)/);
          if (m?.[1]) return m[1];
          const head = path.split('.')[0] || '';
          return head.includes('[') ? head.split('[')[0] : head;
        })
        .filter(Boolean);
      state.reflectPropertyFilters = new Set(keys);
      renderReflectNodeList();
      setStatus(`プロパティを全選択しました（${state.reflectPropertyFilters.size}件）`);
      return;
    }
    if (act === 'clearReflectProperties') {
      state.reflectPropertyFilters = new Set();
      renderReflectNodeList();
      setStatus('プロパティ選択を全解除しました');
      return;
    }
    if (act === 'removeReflectPropertyFilter') {
      const key = actEl.dataset.prop;
      if (!key) return;
      if (!(state.reflectPropertyFilters instanceof Set)) state.reflectPropertyFilters = new Set();
      state.reflectPropertyFilters.delete(key);
      renderReflectNodeList();
      setStatus(`プロパティ選択を解除しました: ${key}`);
      return;
    }
    if (act === 'removeActiveFilter') {
      const kind = actEl.dataset.filterKind || '';
      if (kind === 'keyword') {
        if (ui.nodeSearch) ui.nodeSearch.value = '';
        setStatus('キーワード絞り込みを解除しました');
      } else if (kind === 'section') {
        if (ui.nodeFilterSection) ui.nodeFilterSection.value = '';
        setStatus('セクション絞り込みを解除しました');
      } else if (kind === 'type') {
        if (ui.nodeFilterType) ui.nodeFilterType.value = '';
        setStatus('種別絞り込みを解除しました');
      } else if (kind === 'severity') {
        if (ui.nodeFilterSeverity) ui.nodeFilterSeverity.value = '';
        setStatus('重要度絞り込みを解除しました');
      } else {
        return;
      }
      renderReflectNodeList();
      return;
    }
    if (act === 'toggleActiveReflectNodeSelection') {
      const row = getActiveReflectRow();
      if (!row) { setStatus('操作対象のノードがありません'); return; }
      pushReflectUndo();
      if (state.reflectSelectedIds.has(row._id)) state.reflectSelectedIds.delete(row._id);
      else state.reflectSelectedIds.add(row._id);
      renderReflectNodeList();
      setStatus(`ノード選択を${state.reflectSelectedIds.has(row._id) ? '追加' : '解除'}しました`);
      return;
    }
    if (act === 'toggleActiveReflectNodeMode') {
      const row = getActiveReflectRow();
      if (!row) { setStatus('操作対象のノードがありません'); return; }
      pushReflectUndo();
      state.reflectNodeModes[row._id] = reflectRowModeById(row._id) === 'src' ? 'tgt' : 'src';
      renderReflectNodeList();
      setStatus(`ノードモード切替: ${state.reflectNodeModes[row._id] === 'src' ? '比較元' : '比較先'}`);
      return;
    }
    if (act === 'focusActiveReflectNodeDiff') {
      const row = getActiveReflectRow();
      if (!row) { setStatus('表示対象のノードがありません'); return; }
      switchTab('diff');
      openDiffReviewFold({ scroll: true });
      if (ui.diffFilterSection) ui.diffFilterSection.value = row.sectionKey || '';
      state.diffFilterSection = row.sectionKey || '';
      if (ui.diffSearch) ui.diffSearch.value = row.path || '';
      renderDiffActiveFilters();
      renderResultRows(state.lastDiffRows);
      setStatus('ヘッダーの差分一覧で該当ノードを表示しました');
      return;
    }

    // ----- Reflect modal open/close (新シンプル化UI) -----
    if (act === 'openReflectNodeModal') {
      // ノードモードへ切替してから差分候補を準備
      const nodeChk = ui.nodeMode as HTMLInputElement | undefined;
      if (nodeChk) nodeChk.checked = true;
      saveCurrentDialogState();
      renderReflectModeUi();
      if (state.lastDiffRows && state.lastDiffRows.length && !state.reflectRows.length) {
        try { loadReflectRowsFromLastDiff(); } catch (_e) {}
      }
      renderReflectNodeList();
      // openReflectModal は静的インポート済
      openReflectModal('node');
      return;
    }
    if (act === 'openReflectJsonModal') {
      // openReflectModal は静的インポート済
      openReflectModal('json');
      try { if (typeof populatePatchJsonFromCurrentDiff === 'function') populatePatchJsonFromCurrentDiff({ silent: true }); } catch (_e) {}
      return;
    }
    if (act === 'openReflectHistoryModal') {
      // openReflectModal は静的インポート済
      openReflectModal('history');
      return;
    }
    if (act === 'openReflectReportModal') {
      // openReflectModal は静的インポート済
      openReflectModal('report');
      return;
    }
    if (act === 'openReflectSupportModal') {
      // openReflectModal は静的インポート済
      openReflectModal('support');
      return;
    }
    if (act === 'closeReflectModal') {
      const name = actEl.dataset.modal || '';
      closeReflectModal(name);
      return;
    }

    // ----- Reflect apply actions -----
    if (act === 'previewApplyPlan' && typeof runPreviewApplyPlan === 'function') {
      return withGuard(async () => {
        await runPreviewApplyPlan();
        markReflectApplyChecks(['plan']);
        saveWorkHistorySnapshot('plan', { label: 'プラン確認後', silent: true });
        // プラン作成後、確認モーダルを開く
        try {
          // openReflectModal は静的インポート済
          openReflectModal('plan');
        } catch (_e) {}
      });
    }
    if (act === 'markReflectTargetConfirmed') {
      markReflectApplyChecks(['target']);
      setStatus('反映先が比較先プレビューであることを確認済みにしました');
      return;
    }
    if (act === 'openTargetPreviewApp') {
      const rawUrl = actEl.dataset.previewUrl || '';
      if (!rawUrl) {
        setStatus('比較先アプリIDを入力するとプレビュー確認を開けます', true);
        return;
      }
      const targetWindow = getToolWindow() || window;
      const href = new URL(rawUrl, targetWindow.location.origin).toString();
      targetWindow.open(href, '_blank', 'noopener');
      state.reflectPreviewOpened = true;
      try {
        const c = commonParams();
        state.reflectPreviewOpenedFor = `${String(c.target?.appId || '').trim()}::${String(c.target?.guestId || '').trim()}`;
      } catch (_e) {
        state.reflectPreviewOpenedFor = '';
      }
      markReflectApplyChecks(['preview', 'target']);
      renderReflectAssistPanel();
      setStatus('比較先アプリを開きました。プレビュー内容を確認してから反映してください');
      return;
    }
    if (act === 'exportDryRunPlan' && typeof runExportDryRunPlan === 'function') return withGuard(runExportDryRunPlan);
    if (act === 'exportReviewZip' && typeof runExportReviewZip === 'function') return withGuard(runExportReviewZip);
    // togglePlanSectionExclude はチェックボックスの change イベント側で処理するため、
    // ここで click 経由のフォールバックは不要（重複発火を避ける）。
    if (act === 'togglePlanSectionExclude') return;
    if (act === 'backupTargetPreview' && typeof runBackupTargetPreview === 'function') return withGuard(runBackupTargetPreview);
    if (act === 'importTargetPreviewBackupFile') {
      const input = getToolDocument().getElementById('u_targetPreviewBackupFileInput') as HTMLInputElement | null;
      if (input) { input.value = ''; input.click(); }
      return;
    }
    if (act === 'restoreTargetPreviewBackup' && typeof runRestoreTargetPreviewBackup === 'function') return withGuard(runRestoreTargetPreviewBackup);
    if (act === 'applyPreview' && typeof runApplyPreview === 'function') {
      if (!ensureReflectApplyChecklistReady()) return;
      saveWorkHistorySnapshot('apply', { label: '反映直前', silent: true });
      return withGuard(runApplyPreview);
    }
    if (act === 'deployOnly' && typeof runDeployOnly === 'function') return withGuard(runDeployOnly);
    if (act === 'runPreviewProdDiff') return withGuard(runPreviewProductionDiff);
    if (act === 'exportPreviewProdDiffJson') { exportPreviewProdDiffJson(); return; }
    if (act === 'setPreviewProdDiffFilter') {
      setPreviewProdDiffFilter(actEl.dataset.filterKind || '', actEl.dataset.filterValue || '');
      return;
    }
    if (act === 'applyPreviewProdDiffSearch') {
      applyPreviewProdDiffSearch();
      return;
    }
    if (act === 'clearPreviewProdDiffFilters') {
      clearPreviewProdDiffFilters();
      return;
    }
    if (act === 'closePreviewProdDiff') { closePreviewProdDiff(); return; }
    if (act === 'postApplyRecompare' && typeof runDiff === 'function') {
      withGuard(async () => {
        setStatus('反映後の再比較を実行中...');
        await runDiff();
        renderReflectAssistPanel();
        setStatus('反映後の再比較を完了しました');
      });
      return;
    }
    if (act === 'dismissPostApplyCard') {
      state.lastApplyCompletedAt = null;
      renderReflectAssistPanel();
      return;
    }

    // ----- Apply report / history / quick presets -----
    if (act === 'retryFailedSections' && typeof runRetryFailedSections === 'function') {
      return withGuard(runRetryFailedSections);
    }
    if (act === 'copyApplyReport') {
      const report = state.lastApplyReport;
      if (!report) { setStatus('コピー対象のレポートがありません', true); return; }
      const lines = [
        `反映レポート (${new Date(report.completedAt).toLocaleString()})`,
        `モード: ${report.mode} / 比較先アプリ: ${report.appId || '-'}`,
        `成功 ${report.okCount} / 失敗 ${report.ngCount} / スキップ ${report.skipCount}`,
        '',
        ...(report.sections || []).map((s) => {
          const st = s.status === 'ok' ? 'OK' : s.status === 'ng' ? 'NG' : 'SKIP';
          return `[${st}] ${s.label || s.sectionKey}${s.message ? ' : ' + s.message : ''}`;
        })
      ];
      copyToClipboard(lines.join('\n'), '反映レポートをコピーしました');
      return;
    }
    if (act === 'dismissApplyReport') {
      state.lastApplyReport = null;
      renderReflectAssistPanel();
      setStatus('反映レポートを閉じました');
      return;
    }
    if (act === 'reflectPlanPreviewExpandAll' || act === 'reflectPlanPreviewCollapseAll') {
      const root = getToolDocument().getElementById('u_reflectPlanPreview');
      if (!root) return;
      const open = act === 'reflectPlanPreviewExpandAll';
      root.querySelectorAll<HTMLDetailsElement>('details.reflect-preview-card').forEach((d) => { d.open = open; });
      setStatus(open ? 'プラン プレビューを全て展開しました' : 'プラン プレビューを全て畳みました');
      return;
    }
    if (act === 'clearApplyHistory') {
      if (!kusConfirm('このセッション中の反映履歴を全て削除しますか？')) return;
      if (typeof clearReflectApplyHistory === 'function') clearReflectApplyHistory();
      renderReflectAssistPanel();
      setStatus('反映履歴をクリアしました');
      return;
    }
    if (act === 'exportApplyHistory') {
      const snapshot = snapshotReflectApplyHistoryExport();
      if (!snapshot.count) { setStatus('書き出し対象の反映履歴がありません', true); return; }
      const filename = `reflect_apply_history_${nowStamp()}.json`;
      downloadText(filename, JSON.stringify(snapshot, null, 2), 'application/json');
      setStatus(`反映履歴を書き出しました: ${filename}（${snapshot.count}件）`);
      return;
    }
    if (act === 'applyReflectQuickPreset') {
      const presetId = actEl.dataset.preset;
      if (!presetId) return;
      try {
        const result = applyReflectQuickPreset(presetId);
        renderReflectNodeList();
        setStatus(`クイックプリセット「${result.label}」を適用しました（選択 ${result.selectedCount}件 / 反映元: ${result.mode === 'src' ? '比較元' : '比較先'}）`);
      } catch (err) {
        setStatus(err && err.message ? err.message : String(err), true);
      }
      return;
    }

    // ----- Patch JSON panel -----
    if (act === 'togglePatchJsonPanel') {
      if (ui.reflectSimpleMode?.checked) {
        setStatus('簡易表示中はJSON差分反映を使えません。「簡易表示」をオフにしてください。');
        return;
      }
      state.patchJsonPanelOpen = !state.patchJsonPanelOpen;
      const panel = getToolDocument().getElementById('u_patchJsonPanel');
      if (panel) panel.style.display = state.patchJsonPanelOpen ? 'block' : 'none';
      return;
    }
    if (act === 'patchJsonLoadFile') {
      const input = getToolDocument().getElementById('u_patchJsonFileInput') as HTMLInputElement | null;
      if (input) { input.value = ''; input.click(); }
      return;
    }
    if (act === 'patchJsonUseCurrentDiff') {
      if (typeof populatePatchJsonFromCurrentDiff !== 'function') {
        setStatus('差分比較結果からのパッチJSON生成は未対応です', true);
        return;
      }
      try {
        populatePatchJsonFromCurrentDiff({ force: true });
      } catch (err) {
        setStatus(err.message || String(err), true);
      }
      return;
    }
    if (act === 'patchJsonUseSelectedDiff') {
      const populateSelected = (injected as any).populatePatchJsonFromSelectedDiff;
      if (typeof populateSelected !== 'function') {
        setStatus('選択行からのパッチJSON生成は未対応です', true);
        return;
      }
      try {
        populateSelected({ force: true });
      } catch (err) {
        setStatus(err.message || String(err), true);
        showToast(err.message || String(err), 'warn').catch(() => {});
      }
      return;
    }
    if (act === 'patchJsonExport') {
      const exportFn = (injected as any).exportPatchJsonToFile;
      if (typeof exportFn !== 'function') {
        setStatus('パッチJSONのエクスポートは未対応です', true);
        return;
      }
      try {
        exportFn();
      } catch (err) {
        setStatus(err.message || String(err), true);
      }
      return;
    }
    if (act === 'patchJsonCopy') {
      const copyFn = (injected as any).copyPatchJsonToClipboard;
      if (typeof copyFn !== 'function') {
        setStatus('クリップボードコピーは未対応です', true);
        return;
      }
      withGuard(async () => copyFn());
      return;
    }
    if (act === 'patchJsonClear') {
      state.importedPatchPayload = null;
      const editor = getToolDocument().getElementById('u_patchJsonEditor') as HTMLInputElement | HTMLTextAreaElement | null;
      if (editor) editor.value = '';
      if (typeof renderPatchJsonSummary === 'function') renderPatchJsonSummary(null);
      setStatus('パッチJSONをクリアしました');
      return;
    }
    if (act === 'applyPatchJson' && typeof runApplyPatchJson === 'function') return withGuard(runApplyPatchJson);

    // ----- Field tab -----
    if (act === 'applyField') return withGuard(runFieldApply);
    if (act === 'loadTargetFields') return withGuard(runLoadTargetFields);
    if (act === 'validateFieldJson') return runFieldValidate();
    if (act === 'formatFieldJson') {
      try {
        const text = ui.fieldJson.value.trim();
        if (!text) throw new Error('フォーマットするJSONがありません');
        const parsed = JSON.parse(text);
        ui.fieldJson.value = JSON.stringify(parsed, null, 2);
        setStatus('フィールドJSONをフォーマットしました');
      } catch (e) {
        setStatus(`フォーマットエラー: ${e.message || String(e)}`, true);
      }
      return;
    }
    if (act === 'importFieldJson') return ui.fieldJsonFile.click();
    if (act === 'exportFieldJson') {
      return withGuard(async () => {
        const { nowStamp, downloadText } = await import('./utils.js');
        if (!ui.fieldJson.value.trim()) throw new Error('フィールドJSONが空です');
        const parsed = JSON.parse(ui.fieldJson.value);
        downloadText(`fields_${nowStamp()}.json`, JSON.stringify(parsed, null, 2), 'application/json');
        setStatus('フィールドJSONを保存しました');
      });
    }
    if (act === 'loadSourceFieldsList') return withGuard(runLoadSourceFieldsList);
    if (act === 'insertSelectedSourceFields') return runInsertSelectedSourceFields();
    if (act === 'closeSourceFieldsList') { ui.sourceFieldListContainer.style.display = 'none'; return; }
    if (act === 'runBulkFieldRename' && typeof runBulkFieldRename === 'function') return withGuard(runBulkFieldRename);

    // ----- Design export -----
    if (act === 'exportDesignJson' && typeof runDesignExport === 'function') return withGuard(() => runDesignExport('json'));
    if (act === 'exportDesignMd' && typeof runDesignExport === 'function') return withGuard(() => runDesignExport('md'));
    if (act === 'copyDesignMd' && typeof runDesignCopyMd === 'function') return withGuard(runDesignCopyMd);
    if (act === 'exportDesignXlsx' && typeof runDesignExportXlsx === 'function') return withGuard(runDesignExportXlsx);
    if (act === 'exportDesignXlsxBatchZip' && typeof runDesignExportXlsxBatchZip === 'function') return withGuard(runDesignExportXlsxBatchZip);
    if (act === 'exportDesignDiffMd' && typeof runDesignDiffMd === 'function') return withGuard(runDesignDiffMd);

    // ----- JS/CSS config -----
    if (act === 'fetchJsConfig' && typeof runFetchJsConfig === 'function') return withGuard(runFetchJsConfig);
    if (act === 'loadTargetJsConfig' && typeof runLoadTargetJsConfig === 'function') return withGuard(runLoadTargetJsConfig);
    if (act === 'exportJsConfigJson' && typeof runExportJsConfig === 'function') return withGuard(runExportJsConfig);
    if (act === 'importJsConfigJson') return ui.jsconfigFile.click();
    if (act === 'applyJsConfig' && typeof runApplyJsConfig === 'function') return withGuard(runApplyJsConfig);

    // ----- Other tabs -----
    if (act === 'renderProcessFlow' && typeof runRenderProcessFlow === 'function') return withGuard(runRenderProcessFlow);
    if (act === 'generateERDiagram' && typeof runGenerateERDiagram === 'function') return withGuard(runGenerateERDiagram);
    if (act === 'exportERDiagramHtml' && typeof runExportERDiagramHtml === 'function') return withGuard(runExportERDiagramHtml);
    if (act === 'applyErPreset') {
      const preset = String(actEl.dataset.erPreset || '');
      if (preset) {
        import('./tabs/er.js').then((m) => m.applyErPreset(preset)).catch(() => { /* noop */ });
      }
      return;
    }
    if (act === 'runBatchProcess' && typeof runBatchProcess === 'function') return withGuard(runBatchProcess);
    if (act === 'runBatchFileDownload' && typeof runBatchFileDownload === 'function') return withGuard(runBatchFileDownload);
    if (act === 'runBatchJsConfigDownload' && typeof runBatchJsConfigDownload === 'function') return withGuard(runBatchJsConfigDownload);
    if (act === 'loadViewsForProc' && typeof loadViewsForSelect === 'function') return withGuard(async () => loadViewsForSelect('u_batchProcViewSelect', 'u_batchProcView'));
    if (act === 'loadViewsForDl' && typeof loadViewsForSelect === 'function') return withGuard(async () => loadViewsForSelect('u_batchDlViewSelect', 'u_batchDlView'));
    if (act === 'loadViewsForCsv' && typeof loadViewsForSelect === 'function') return withGuard(async () => loadViewsForSelect('u_csvExportViewSelect', 'u_csvExportView'));
    if (act === 'loadViewsForBackup' && typeof loadViewsForSelect === 'function') return withGuard(async () => loadViewsForSelect('u_recordBackupViewSelect', 'u_recordBackupView'));
    if (act === 'selectCsvImportFile') {
      const input = getToolDocument().getElementById('u_csvImportFile') as HTMLInputElement | null;
      input?.click();
      return;
    }
    if (act === 'runCsvExport' && typeof runCsvExport === 'function') return withGuard(runCsvExport);
    if (act === 'runCsvImport' && typeof runCsvImport === 'function') return withGuard(runCsvImport);
    if (act === 'runRecordBackup' && typeof runRecordBackup === 'function') return withGuard(runRecordBackup);
    if (act === 'runRecordCopy' && typeof runRecordCopy === 'function') return withGuard(runRecordCopy);

    // ----- Templates -----
    if (act === 'saveTemplate' && typeof saveTemplate === 'function') return withGuard(saveTemplate);
    if (act === 'loadTemplate' && typeof loadTemplate === 'function') return loadTemplate();
    if (act === 'deleteTemplate' && typeof deleteTemplate === 'function') return deleteTemplate();

    // ----- Analyze Tab -----
    if (act === 'runAnalyzeDashboard' && typeof runAnalyzeDashboard === 'function') return withGuard(runAnalyzeDashboard);
    if (act === 'runFieldImpactAnalysis' && typeof runFieldImpactAnalysis === 'function') return withGuard(runFieldImpactAnalysis);
    if (act === 'exportFieldImpactCsv' && typeof exportFieldImpactCsv === 'function') return exportFieldImpactCsv();
    if (act === 'runPermissionMatrix' && typeof runPermissionMatrix === 'function') return withGuard(runPermissionMatrix);
    if (act === 'runNotificationVisualizer' && typeof runNotificationVisualizer === 'function') return withGuard(runNotificationVisualizer);
    if (act === 'runLayoutPreview' && typeof runLayoutPreview === 'function') return withGuard(runLayoutPreview);
    if (act === 'runFieldDependencyGraph' && typeof runFieldDependencyGraph === 'function') return withGuard(runFieldDependencyGraph);
    if (act === 'fieldGraphRelayout' && typeof fieldGraphRelayout === 'function') return fieldGraphRelayout();
    if (act === 'fieldGraphExportPng' && typeof fieldGraphExportPng === 'function') return fieldGraphExportPng();

    // ----- Simulation -----
    if (act === 'simStart' && typeof runSimStart === 'function') return withGuard(runSimStart);
    if (act === 'simExecuteAction' && typeof runSimExecuteAction === 'function') return withGuard(runSimExecuteAction);
    if (act === 'simUndo' && typeof runSimUndo === 'function') return runSimUndo();

    // ----- Process flow utilities -----
    if (act === 'copyMermaidSource' && typeof copyMermaidSource === 'function') return copyMermaidSource();
    if (act === 'downloadMermaidSource' && typeof downloadMermaidSource === 'function') return downloadMermaidSource();
    if (act === 'downloadFlowSvg' && typeof downloadFlowSvg === 'function') return downloadFlowSvg();

    // ----- API tester -----
    if (act === 'clearApiTesterHistory' && typeof clearApiTesterHistory === 'function') {
      clearApiTesterHistory();
      setStatus('APIテスターの履歴をクリアしました');
      return;
    }
    if (act === 'copyApiTesterCurl' && typeof copyApiTesterCurl === 'function') return copyApiTesterCurl();
    if (act === 'runApiTester' && typeof runApiTester === 'function') return runApiTester();
    if (act === 'beautifyApiTesterBody' && typeof beautifyApiTesterBody === 'function') return beautifyApiTesterBody();
    if (act === 'copyApiTesterResponse' && typeof copyApiTesterResponse === 'function') return copyApiTesterResponse();
    if (act === 'downloadApiTesterResponse' && typeof downloadApiTesterResponse === 'function') return downloadApiTesterResponse();
    if (act === 'exportApiTesterHistory' && typeof exportApiTesterHistory === 'function') return exportApiTesterHistory();
  });

  refreshDiffSelectionSetDropdown();
  syncDiffOnboardingVisibility();
}
