'use strict';

import { SECTION_DEFS, DEFAULT_APP_ID, DIFF_ONBOARDING_DISMISSED_KEY, TOOL_ID, TOOL_VERSION } from './constants.js';
import { state, ui } from './state.js';
import { esc, deepClone, readTextFile, getThemeDisplayLabel, selectedScopeKeys, showToast } from './utils.js';
import { buildApiPrefix, apiGet } from './api.js';
import { countActualDiffRows, summarizeRows } from './diff/engine.js';
import { getRenderedDiffRows } from './diff/filter.js';
import {
  renderResultRows,
  renderDiffFilterOptions,
  syncDiffThemeButton,
  renderDiffWarningBox,
  renderDiffSelectionState,
  MAIN_RESULT_IDLE_HTML
} from './diff/export.js';
import { applyDiffUiPreset, applyDiffSectionNav } from './diff/presets.js';
import { saveDiffSelectionSet, loadDiffSelectionSet, deleteDiffSelectionSet, refreshDiffSelectionSetDropdown } from './diff/selection-sets.js';
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
  setConnectionPanelCollapsed,
  openScopePicker,
  closeScopePicker,
  openFeatureScreen,
  showLauncherScreen
} from './ui/components.js';
import {
  fitDialogToViewport,
  applyDialogSizePreset,
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
  importReflectSelectionFromFile
} from './tabs/reflect.js';

import {
  runFieldApply,
  runLoadTargetFields,
  runLoadSourceFieldsList,
  runInsertSelectedSourceFields,
  parseFieldInput,
  parseLookupMapInput,
  parseAppIdList
} from './tabs/field.js';

import {
  runSettingsExport,
  runSettingsExportSearchApps,
  addAppIdToSettingsExport
} from './tabs/settings-export.js';

// --- These functions are not yet extracted into modules. They remain in the
//     monolithic file or will be extracted in future refactoring steps.
//     For now, they are expected to be injected or available in scope. ---
//
//   runDesignExport, runDesignCopyMd, runDesignExportXlsx, runDesignDiffMd,
//   runFetchJsConfig, runExportJsConfig, runApplyJsConfig,
//   runRenderProcessFlow, launchKintoneSql, runGenerateERDiagram,
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

export function withGuard(fn, busyText) {
  if (state.running) {
    setStatus('別の処理を実行中です。完了までお待ちください。');
    return;
  }
  state.running = true;
  setBusy(true, busyText || '処理中...');
  return (async () => {
    try {
      await fn();
    } catch (e) {
      console.error(e);
      const msg = `エラー: ${e.message || String(e)}`;
      setStatus(msg, true);
      showToast(msg, 'error').catch(() => {});
    } finally {
      state.running = false;
      setBusy(false);
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

// ---------------------------------------------------------------------------
// normalizeDiffFavoritePath (local copy - may be extracted later)
// ---------------------------------------------------------------------------

function normalizeDiffFavoritePath(path) {
  return String(path || '').trim();
}

function parseIdSet(text) {
  return [...new Set(String(text || '').split(/[\s,]+/).map((v) => v.trim()).filter((v) => /^\d+$/.test(v)))];
}

function renderConnectionSearchResults(apps) {
  if (!ui.connectionSearchResult) return;
  const rows = Array.isArray(apps) ? apps : [];
  if (!rows.length) {
    ui.connectionSearchResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#64748b">検索結果なし</div>';
    return;
  }
  ui.connectionSearchResult.innerHTML = `<table>
    <thead><tr><th style="width:90px">アプリID</th><th>アプリ名</th><th style="width:84px">操作</th></tr></thead>
    <tbody>${rows.map((app) => `<tr>
      <td>${esc(app.appId)}</td>
      <td title="${esc(app.name)}">${esc(app.name)}</td>
      <td style="text-align:right"><button type="button" class="btn sub" style="padding:4px 8px;font-size:10px" data-act="addConnectionSearchApp" data-app-id="${esc(app.appId)}" data-app-name="${esc(app.name)}">追加</button></td>
    </tr>`).join('')}</tbody>
  </table>`;
}

async function runConnectionSearchApps() {
  const keyword = ui.connectionSearchKeyword?.value.trim() || '';
  const guestId = ui.sourceGuest?.value.trim() || ui.targetGuest?.value.trim() || '';
  const prefix = buildApiPrefix(guestId, false);
  const params = { limit: 100 };
  if (keyword) params.name = keyword;
  setStatus('アプリ検索中...');
  const res = await apiGet(prefix, '/apps.json', params);
  const apps = (res.apps || [])
    .map((a) => ({ appId: String(a.appId || '').trim(), name: String(a.name || '') }))
    .filter((a) => /^\d+$/.test(a.appId))
    .sort((a, b) => Number(a.appId) - Number(b.appId));
  renderConnectionSearchResults(apps);
  setStatus(`アプリ検索完了: ${apps.length}件`);
}

function addConnectionSearchApp(appId, appName) {
  const id = String(appId || '').trim();
  if (!/^\d+$/.test(id)) {
    setStatus('追加対象のアプリIDが不正です', true);
    return;
  }
  const assign = ui.connectionSearchAssign?.value || 'source';
  if (assign === 'source') {
    ui.sourceApp.value = id;
    setStatus(`比較元に App ${id}${appName ? ` (${appName})` : ''} を設定しました`);
  } else if (assign === 'target') {
    ui.targetApp.value = id;
    setStatus(`比較先に App ${id}${appName ? ` (${appName})` : ''} を設定しました`);
  } else if (assign === 'diffMulti') {
    if (!ui.diffMultiTargets) {
      setStatus('複数比較先リストが見つかりません', true);
      return;
    }
    const ids = new Set(parseIdSet(ui.diffMultiTargets.value));
    ids.add(id);
    ui.diffMultiTargets.value = [...ids].join('\n');
    setStatus(`複数比較先へ App ${id}${appName ? ` (${appName})` : ''} を追加しました`);
  } else if (assign === 'settingsExport') {
    addAppIdToSettingsExport(id, appName);
    return;
  }
  saveCurrentDialogState();
  updateConnectionStepIndicators();
}

function renderReflectPresetSelect(preferName) {
  const sel = getToolDocument().getElementById('u_reflectPresetSelect');
  if (!sel) return;
  const presets = loadReflectPresets();
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

function getVisibleReflectNodeIds() {
  return [...(ui.reflectNodeList?.querySelectorAll('[data-node-open]') || [])]
    .map((el) => el.dataset.nodeOpen)
    .filter(Boolean);
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

function extractAppIdFromInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d+$/.test(raw)) return raw;
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch (e) { /* ignore malformed URI */ }
  const queryMatch = decoded.match(/[?&]app=(\d+)(?:[&#]|$)/i);
  if (queryMatch) return queryMatch[1];
  const pathMatch = decoded.match(/\/k\/(\d+)(?:[/?#]|$)/i);
  if (pathMatch) return pathMatch[1];
  return '';
}

// ---------------------------------------------------------------------------
// Setup all event handlers
// ---------------------------------------------------------------------------

export function setupEventHandlers(injected = {}) {
  const root = getRoot();
  if (!root) return;

  function syncDiffOnboardingVisibility() {
    const el = ui.diffOnboarding;
    if (!el) return;
    const dismissed = !!localStorage.getItem(DIFF_ONBOARDING_DISMISSED_KEY);
    const rootEl = getRoot();
    const onDiffArea = rootEl?.classList.contains('tab-is-diff');
    const hasDiffState = !!state.lastDiffAt || !!state.lastDiffRows.length || !!state.lastFetchIssues.length;
    el.style.display = !dismissed && onDiffArea && hasDiffState ? 'block' : 'none';
  }

  const {
    runDesignExport,
    runDesignCopyMd,
    runDesignExportXlsx,
    runDesignDiffMd,
    runFetchJsConfig,
    runExportJsConfig,
    runApplyJsConfig,
    runRenderProcessFlow,
    launchKintoneSql,
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
    runApiTester,
    clearApiTesterHistory,
    runPreviewApplyPlan,
    runExportDryRunPlan,
    runBackupTargetPreview,
    runRestoreTargetPreviewBackup,
    runApplyPreview,
    runDeployOnly,
    runApplyPatchJson,
    importPatchJsonFromFile,
    parsePatchJsonPayload,
    renderPatchJsonSummary,
    populatePatchJsonFromCurrentDiff,
    renderCustomizeResult,
    runBulkFieldRename,
    renderDiffFavoritesOnlyButton,
    renderTemplateOptions,
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

  function renderLauncherActiveFilters(group, searchText) {
    if (!ui.launcherActiveFilters) return;
    const chips = [];
    if (group && group !== 'all') {
      const groupLabel = ui.launcherGroupFilters?.querySelector(`.chip[data-group="${group}"]`)?.textContent?.trim() || group;
      chips.push(`<span class="chip chip-active-filter">グループ: ${esc(groupLabel)}</span>`);
    }
    if (searchText) {
      chips.push(`<span class="chip chip-active-filter">検索: ${esc(searchText)}</span>`);
    }
    ui.launcherActiveFilters.innerHTML = chips.length ? chips.join('') : '<span class="muted">現在フィルタは未適用です</span>';
  }

  function applyLauncherFilter() {
    const activeGroupBtn = ui.launcherGroupFilters?.querySelector('.chip.is-active[data-group]');
    const group = activeGroupBtn?.dataset?.group || 'all';
    const searchText = String(ui.launcherSearch?.value || '').trim();
    const normalizedSearch = searchText.toLowerCase();
    const cards = [...(ui.launcherMenu?.querySelectorAll('.feature-card[data-feature]') || [])];
    let visibleCount = 0;
    cards.forEach((card) => {
      const cardGroup = String(card.querySelector('.feature-card-group')?.textContent || '').trim();
      const label = String(card.querySelector('.feature-card-label')?.textContent || '').trim();
      const desc = String(card.querySelector('.feature-card-desc')?.textContent || '').trim();
      const cardText = `${label} ${desc} ${cardGroup}`.toLowerCase();
      const groupMatched = group === 'all'
        || (group === 'change' && cardGroup === '変更・反映')
        || (group === 'vis' && cardGroup === '可視化・出力')
        || (group === 'data' && cardGroup === 'データ・保守');
      const searchMatched = !normalizedSearch || cardText.includes(normalizedSearch);
      const show = groupMatched && searchMatched;
      card.style.display = show ? '' : 'none';
      if (show) visibleCount += 1;
    });
    if (ui.launcherVisibleCount) ui.launcherVisibleCount.textContent = `表示中: ${visibleCount}/${cards.length}`;
    if (ui.launcherEmptyState) ui.launcherEmptyState.hidden = visibleCount !== 0;
    renderLauncherActiveFilters(group, searchText);
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
    ui.diffActiveFilters.innerHTML = chips.length ? chips.join('') : '<span class="muted">差分フィルタは未適用です</span>';
  }

  function syncMainResultForFeature(featureKey) {
    if (!ui.result) return;
    const key = String(featureKey || state.activeFeatureKey || state.activeTab || '').trim();
    if (key === 'diff') {
      renderResultRows(state.lastDiffRows || []);
      return;
    }
    ui.result.innerHTML = MAIN_RESULT_IDLE_HTML;
  }

  async function copyToClipboard(text, successMessage, errorMessage) {
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
    switchSubTab('reflect', 'settings');
    activateReflectInnerTab('other');
    const focusEditor = () => {
      const pane = root.querySelector('[data-subpane-parent="reflect"][data-subpane="settings"]');
      pane?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      const editorApi = ui.sectionPreviewEditor?.__sectionPreviewApi;
      if (editorApi?.setSection) {
        editorApi.setSection(nextSectionKey, { silent: true, force: true });
        return;
      }
      const select = ui.sectionPreviewEditor?.querySelector?.('[data-spe-act="changeSection"]');
      if (select && nextSectionKey) {
        const ToolEvent = getToolWindow()?.Event || Event;
        select.value = nextSectionKey;
        select.dispatchEvent(new ToolEvent('change', { bubbles: true }));
      }
    };
    const view = getToolWindow();
    if (view?.requestAnimationFrame) view.requestAnimationFrame(focusEditor);
    else focusEditor();
    setStatus(`${label} の差分エディタへ移動しました`);
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
  updateLauncherToggleButton();
  applyLauncherFilter();
  renderDiffActiveFilters();
  renderReflectNodeList();
  initReflectPreviewPlayground(ui, setStatus);
  initSectionPreviewEditor(ui, setStatus);
  if (ui.settingsExportSearchResult && !ui.settingsExportSearchResult.innerHTML) {
    ui.settingsExportSearchResult.innerHTML = '<div style="padding:10px;font-size:12px;color:#64748b">検索結果なし</div>';
  }

  // -------------------------------------------------------------------
  // Scroll & resize listeners
  // -------------------------------------------------------------------

  if (ui.toolBody) {
    ui.toolBody.addEventListener('scroll', () => {
      if (state.guidedTourActive) scheduleGuidedTourLayout();
    }, { passive: true });
  }

  let guidedTourWindowResizeHandler = null;
  if (!guidedTourWindowResizeHandler) {
    guidedTourWindowResizeHandler = () => {
      fitDialogToViewport({ persist: false });
      if (state.guidedTourActive) scheduleGuidedTourLayout();
    };
    getToolWindow().addEventListener('resize', guidedTourWindowResizeHandler);
  }

  // -------------------------------------------------------------------
  // Individual element change listeners
  // -------------------------------------------------------------------

  ui.applyDiffOnly.addEventListener('change', () => {
    saveCurrentDialogState();
    renderBundleState();
    renderReflectModeUi();
  });

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
      const input = ev.target.closest?.('[data-reflect-prop]');
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
        withGuard(async () => runDiff(), '差分比較を更新中...');
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
      e.target.tagName === 'INPUT'
      || e.target.tagName === 'TEXTAREA'
      || e.target.tagName === 'SELECT'
      || e.target.isContentEditable
    );

    if (!ui.scopePickerModal?.hidden && e.key === 'Escape') {
      e.preventDefault();
      closeScopePicker();
      return;
    }

    if (state.guidedTourActive && !editable) {
      if (e.key === 'Escape') { e.preventDefault(); closeGuidedTour(); return; }
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); moveGuidedTour(1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveGuidedTour(-1); return; }
    }

    if (e.target.id === 'u_ignoreKeyInput' && e.key === 'Enter') {
      e.preventDefault();
      addIgnoreKeyFromInput();
      return;
    }

    const featCard = e.target.closest?.('.feature-card[data-feature]');
    if (featCard && !editable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      featCard.click();
      return;
    }
    if (!editable && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'))) {
      e.preventDefault();
      showLauncherScreen({ persist: false });
      ui.launcherSearch?.focus();
      ui.launcherSearch?.select();
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
    const tKb = e.target;
    if (tKb?.matches?.('input[type=checkbox][data-diff-row-id]') && resKb?.contains(tKb) && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      const boxes = [...resKb.querySelectorAll('tbody input[type=checkbox][data-diff-row-id]')];
      const idx = boxes.indexOf(tKb);
      const next = e.key === 'ArrowDown' ? boxes[idx + 1] : boxes[idx - 1];
      if (idx >= 0 && next) { e.preventDefault(); next.focus(); }
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
    }
  });

  // -------------------------------------------------------------------
  // Input handler
  // -------------------------------------------------------------------

  root.addEventListener('input', (e) => {
    if (e.target.closest('#u_lookupMapRows')) {
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
    if (e.target === ui.sourceApp || e.target === ui.targetApp) {
      const extracted = extractAppIdFromInput(e.target.value);
      if (extracted && extracted !== e.target.value.trim()) {
        e.target.value = extracted;
        setStatus(`URL からアプリIDを抽出しました: ${extracted}`);
      }
      const sanitized = String(e.target.value || '').trim();
      const valid = /^\d+$/.test(sanitized);
      e.target.classList.toggle('input-invalid', !valid);
      e.target.setAttribute('aria-invalid', valid ? 'false' : 'true');
      if (!valid) {
        setStatus('アプリIDは数値のみで入力してください（例: 123）', true);
      }
      saveCurrentDialogState();
      updateConnectionStepIndicators();
      renderBundleState();
      return;
    }
    const diffId = e.target?.dataset?.diffRowId;
    if (diffId) {
      const res = getToolDocument().getElementById('u_result');
      if (res?.contains(e.target)) state.diffSelectionAnchorId = diffId;
      if (e.target.checked) state.diffSelectedIds.add(diffId);
      else state.diffSelectedIds.delete(diffId);
      renderResultRows(state.lastDiffRows);
      saveCurrentDialogState();
      return;
    }

    const id = e.target?.dataset?.nodeId;
    if (id) {
      pushReflectUndo();
      state.reflectActiveNodeId = id;
      if (e.target.checked) state.reflectSelectedIds.add(id);
      else state.reflectSelectedIds.delete(id);
      renderReflectNodeList();
      return;
    }

    if (e.target?.closest('#u_diffScopes') || e.target?.closest('#u_applyScopes') || e.target?.closest('#u_settingsExportScopes') || e.target?.closest('#u_recordBackupAppScopes')) {
      saveCurrentDialogState();
      renderBundleState();
      renderScopePickerSummaries();
    }
    if (e.target?.closest('[data-apply-scope]')) {
      syncApplyScopesFromSidebar();
      saveCurrentDialogState();
      renderBundleState();
      renderReflectMainPanel();
      renderScopePickerSummaries();
      const putSections = SECTION_DEFS.filter((d) => d.put);
      const sidebarCount = getToolDocument().getElementById('u_sidebarCount');
      const checkedCount = [...getToolDocument().querySelectorAll('#u_reflectSidebarSections [data-apply-scope]:checked')].length;
      if (sidebarCount) sidebarCount.textContent = `${checkedCount} / ${putSections.length}`;
    }
  });

  root.addEventListener('mousedown', (e) => {
    const cb = e.target.closest('input[type=checkbox][data-diff-row-id]');
    if (!cb) return;
    const res = getToolDocument().getElementById('u_result');
    if (!res || !res.contains(cb) || !e.shiftKey || !state.diffSelectionAnchorId) return;
    const boxes = [...res.querySelectorAll('tbody input[type=checkbox][data-diff-row-id]')];
    const ids = boxes.map((el) => el.dataset.diffRowId);
    const i0 = ids.indexOf(state.diffSelectionAnchorId);
    const i1 = ids.indexOf(cb.dataset.diffRowId);
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

  const patchJsonFileInput = getToolDocument().getElementById('u_patchJsonFileInput');
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

  const reflectSelectionFileInput = getToolDocument().getElementById('u_reflectSelectionFileInput');
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

// Legacy textarea input handling removed – JSONEditor now manages changes.
// The previous code that listened for 'input' events on the textarea has been deprecated.
// JSONEditor instance will invoke its onChange callback defined during initialization.


  // -------------------------------------------------------------------
  // Main click handler (data-act dispatch)
  // -------------------------------------------------------------------

  root.addEventListener('click', (e) => {
    // Reflect inner tab (概要 / フィールド / 他設定)
    const innerTab = e.target.closest('[data-reflect-inner]');
    if (innerTab) {
      activateReflectInnerTab(innerTab.getAttribute('data-reflect-inner') || 'overview');
      return;
    }

    // Favorite toggle
    const favBtn = e.target.closest('[data-diff-fav-path]');
    if (favBtn) {
      const path = normalizeDiffFavoritePath(favBtn.dataset.diffFavPath || '');
      if (!path) return;
      if (state.diffFavoritePaths.has(path)) state.diffFavoritePaths.delete(path);
      else state.diffFavoritePaths.add(path);
      saveCurrentDialogState();
      renderResultRows(state.lastDiffRows);
      return;
    }

    const secNavBtn = e.target.closest('[data-diff-sec-nav]');
    if (secNavBtn) {
      const key = secNavBtn.getAttribute('data-diff-sec-nav') ?? '';
      applyDiffSectionNav(key);
      saveCurrentDialogState();
      const label = key ? (SECTION_DEFS.find((d) => d.key === key)?.label || key) : '全セクション';
      setStatus(key ? `セクションで絞り込み: ${label}` : 'セクション絞り込みを解除しました');
      return;
    }

    // Sidebar section click
    const sidebarItem = e.target.closest('[data-sidebar-sec]');
    if (sidebarItem && !e.target.closest('.sec-check')) {
      const secKey = sidebarItem.dataset.sidebarSec || '';
      state.reflectActiveSidebarSection = (state.reflectActiveSidebarSection === secKey) ? null : secKey;
      renderReflectSidebar();
      renderReflectMainPanel();
      if (ui.scopePickerModal?.dataset?.scopePickerKind === 'reflect') closeScopePicker();
      return;
    }

    // Overview nav
    const overviewNav = e.target.closest('[data-sidebar-nav]');
    if (overviewNav) {
      const secKey = overviewNav.dataset.sidebarNav || '';
      if (secKey) {
        state.reflectActiveSidebarSection = secKey;
        renderReflectSidebar();
        renderReflectMainPanel();
        if (ui.scopePickerModal?.dataset?.scopePickerKind === 'reflect') closeScopePicker();
      }
      return;
    }

    // Section toggle (collapse/expand)
    const secToggle = e.target.closest('[data-diff-sec-toggle]');
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
    const moreRowsBtn = e.target.closest('[data-act="moreDiffRows"]');
    if (moreRowsBtn) {
      const secKey = moreRowsBtn.dataset.sec || '';
      if (!secKey) return;
      const current = Number(state.diffSectionVisibleCounts[secKey] || 80);
      state.diffSectionVisibleCounts[secKey] = current + 80;
      if (state.lastDiffRows.length) renderResultRows(state.lastDiffRows);
      return;
    }

    // Node mode toggle
    const modeBtn = e.target.closest('[data-node-mode]');
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
    const nodeOpen = e.target.closest('[data-node-open]');
    if (nodeOpen && !e.target.closest('input,button,label,a')) {
      const nodeId = nodeOpen.dataset.nodeOpen || '';
      if (nodeId) {
        setActiveReflectNode(nodeId, { persist: false });
        renderReflectNodeList();
      }
      return;
    }

    // Node detail tab
    const nodeDetailTab = e.target.closest('[data-node-detail-tab]');
    if (nodeDetailTab) {
      state.reflectDetailTab = nodeDetailTab.dataset.nodeDetailTab || 'diff';
      saveCurrentDialogState();
      renderReflectNodeDetail();
      return;
    }

    // Send a diff row to the reflect queue
    const sendToReflectBtn = e.target.closest('[data-send-to-reflect]');
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
    const copyBtn = e.target.closest('[data-copy-val]');
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
    const addSuggestedBtn = e.target.closest('[data-act="addSuggestedIgnore"]');
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
    const addSettingsAppBtn = e.target.closest('[data-add-settings-app]');
    if (addSettingsAppBtn) {
      const appId = addSettingsAppBtn.dataset.addSettingsApp || '';
      const appName = addSettingsAppBtn.dataset.addSettingsName || '';
      addAppIdToSettingsExport(appId, appName);
      return;
    }

    // Source field check-all
    if (e.target.id === 'u_sourceFieldCheckAll') {
      const checked = e.target.checked;
      [...ui.sourceFieldTbody.querySelectorAll('.src-field-sel')].forEach(c => c.checked = checked);
      return;
    }

    // Sub-tab switching
    const subTab = e.target.closest('.subtab');
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
    const tab = e.target.closest('.tab');
    if (tab) {
      const nextTab = tab.dataset.tab || '';
      switchTab(nextTab);
      syncDiffOnboardingVisibility();
      syncMainResultForFeature(nextTab);
      return;
    }

    // data-act dispatch（ランチャー feature-card 内の子要素クリックでも拾う）
    const actEl = e.target.closest('[data-act]');
    const act = actEl?.dataset.act;
    if (!act) return;

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
      [...(ui.launcherGroupFilters?.querySelectorAll('.chip[data-group]') || [])].forEach((btn) => {
        const active = btn.dataset.group === 'all';
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      applyLauncherFilter();
      ui.launcherSearch?.focus();
      setStatus('機能検索とグループ絞り込みを解除しました');
      return;
    }

    if (act === 'setLauncherGroup') {
      const group = String(actEl.dataset.group || 'all');
      [...(ui.launcherGroupFilters?.querySelectorAll('.chip[data-group]') || [])].forEach((btn) => {
        const active = btn.dataset.group === group;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      applyLauncherFilter();
      setStatus(group === 'all' ? '全機能を表示中です' : `機能を絞り込みました: ${actEl.textContent.trim()}`);
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
    if (act === 'startGuidedTour') { openGuidedTour(0); return; }
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
    if (act === 'dialogSizeMax') {
      const next = applyDialogSizePreset('max');
      saveCurrentDialogState();
      setStatus(`ダイアログを最大サイズにしました (${next.width} x ${next.height})`);
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
      switchSubTab('reflect', 'settings');
      activateReflectInnerTab('field');
      const fold = root.querySelector('#u_reflectPreviewEditorFold');
      fold?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      setStatus('フィールド設定画面へ移動しました');
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
        const filterEl = doc.getElementById('u_analyzeFieldFilter');
        if (filterEl) {
          const changed = filterEl.value !== 'unused';
          filterEl.value = 'unused';
          if (changed) filterEl.dispatchEvent(new toolWindow.Event('change', { bubbles: true }));
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

    // ----- Source / Target quick actions -----
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
        [...container.querySelectorAll('input[type="checkbox"]')].forEach((checkbox) => {
          checkbox.checked = checked;
        });
      }
      saveCurrentDialogState();
      setStatus(`レコードバックアップに同梱する設定を${checked ? '全選択' : '全解除'}しました`);
      return;
    }
    if (act === 'runSettingsExportJson') return withGuard(async () => runSettingsExport('json'));
    if (act === 'runSettingsExportZip') return withGuard(async () => runSettingsExport('zip'));
    if (act === 'settingsExportSearchApps') return withGuard(runSettingsExportSearchApps);
    if (act === 'connectionSearchApps') return withGuard(runConnectionSearchApps);
    if (act === 'addConnectionSearchApp') {
      const appId = actEl.dataset.appId || '';
      const appName = actEl.dataset.appName || '';
      addConnectionSearchApp(appId, appName);
      return;
    }

    // ----- Diff actions -----
    if (act === 'prefetchCommonData') return withGuard(runPrefetchCommonData);
    if (act === 'runDiffAndPlan') return withGuard(runDiffAndPreviewPlan);
    if (act === 'runDiff') return withGuard(runDiff);
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
      try { localStorage.setItem(DIFF_ONBOARDING_DISMISSED_KEY, '1'); } catch (err) { /* ignore */ }
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
      row.querySelector('.lookup-from').focus();
      return;
    }
    if (act === 'removeLookupMapRow') {
      const row = e.target.closest('[data-lookup-row]');
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
      [...ui.applyScopes.querySelectorAll('input[type="checkbox"]')].forEach((c) => {
        const dc = diffCounts[c.value];
        c.checked = !!(dc && dc.total > 0);
      });
      saveCurrentDialogState();
      renderReflectSidebar();
      renderReflectMainPanel();
      setStatus('差分のあるセクションのみ選択しました');
      return;
    }
    if (act === 'applyScopeHighRisk') {
      const highRiskSections = new Set(
        getActualDiffRows(state.lastDiffRows || [])
          .filter((row) => String(row.severity || '').toLowerCase() === 'high')
          .map((row) => row.sectionKey)
          .filter(Boolean)
      );
      [...ui.applyScopes.querySelectorAll('input[type="checkbox"]')].forEach((c) => {
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

    // ----- Reflect preset actions -----
    if (act === 'saveReflectPreset') {
      const name = (window.prompt('プリセット名を入力してください（例: 開発→検証 権限以外）', '') || '').trim();
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
      const sel = getToolDocument().getElementById('u_reflectPresetSelect');
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
      const sel = getToolDocument().getElementById('u_reflectPresetSelect');
      const name = sel ? sel.value : '';
      if (!name) {
        setStatus('削除するプリセットを選んでください');
        return;
      }
      if (!window.confirm(`プリセット「${name}」を削除しますか？`)) return;
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
      const input = doc && doc.getElementById('u_reflectSelectionFileInput');
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

    // ----- Reflect apply actions -----
    if (act === 'previewApplyPlan' && typeof runPreviewApplyPlan === 'function') return withGuard(runPreviewApplyPlan);
    if (act === 'exportDryRunPlan' && typeof runExportDryRunPlan === 'function') return withGuard(runExportDryRunPlan);
    if (act === 'backupTargetPreview' && typeof runBackupTargetPreview === 'function') return withGuard(runBackupTargetPreview);
    if (act === 'restoreTargetPreviewBackup' && typeof runRestoreTargetPreviewBackup === 'function') return withGuard(runRestoreTargetPreviewBackup);
    if (act === 'applyPreview' && typeof runApplyPreview === 'function') return withGuard(runApplyPreview);
    if (act === 'deployOnly' && typeof runDeployOnly === 'function') return withGuard(runDeployOnly);
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
      const input = getToolDocument().getElementById('u_patchJsonFileInput');
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
    if (act === 'patchJsonClear') {
      state.importedPatchPayload = null;
      const editor = getToolDocument().getElementById('u_patchJsonEditor');
      if (editor) editor.value = '';
      if (typeof renderPatchJsonSummary === 'function') renderPatchJsonSummary(null);
      setStatus('パッチJSONをクリアしました');
      return;
    }
    if (act === 'applyPatchJson' && typeof runApplyPatchJson === 'function') return withGuard(runApplyPatchJson);

    // ----- Field tab -----
    if (act === 'applyField') return withGuard(runFieldApply);
    if (act === 'loadTargetFields') return withGuard(runLoadTargetFields);
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
    if (act === 'exportDesignDiffMd' && typeof runDesignDiffMd === 'function') return withGuard(runDesignDiffMd);

    // ----- JS/CSS config -----
    if (act === 'fetchJsConfig' && typeof runFetchJsConfig === 'function') return withGuard(runFetchJsConfig);
    if (act === 'exportJsConfigJson' && typeof runExportJsConfig === 'function') return withGuard(runExportJsConfig);
    if (act === 'importJsConfigJson') return ui.jsconfigFile.click();
    if (act === 'applyJsConfig' && typeof runApplyJsConfig === 'function') return withGuard(runApplyJsConfig);

    // ----- Other tabs -----
    if (act === 'renderProcessFlow' && typeof runRenderProcessFlow === 'function') return withGuard(runRenderProcessFlow);
    if (act === 'launchKintoneSql' && typeof launchKintoneSql === 'function') return withGuard(launchKintoneSql);
    if (act === 'generateERDiagram' && typeof runGenerateERDiagram === 'function') return withGuard(runGenerateERDiagram);
    if (act === 'exportERDiagramHtml' && typeof runExportERDiagramHtml === 'function') return withGuard(runExportERDiagramHtml);
    if (act === 'runBatchProcess' && typeof runBatchProcess === 'function') return withGuard(runBatchProcess);
    if (act === 'runBatchFileDownload' && typeof runBatchFileDownload === 'function') return withGuard(runBatchFileDownload);
    if (act === 'runBatchJsConfigDownload' && typeof runBatchJsConfigDownload === 'function') return withGuard(runBatchJsConfigDownload);
    if (act === 'loadViewsForProc' && typeof loadViewsForSelect === 'function') return withGuard(async () => loadViewsForSelect('u_batchProcViewSelect', 'u_batchProcView'));
    if (act === 'loadViewsForDl' && typeof loadViewsForSelect === 'function') return withGuard(async () => loadViewsForSelect('u_batchDlViewSelect', 'u_batchDlView'));
    if (act === 'loadViewsForCsv' && typeof loadViewsForSelect === 'function') return withGuard(async () => loadViewsForSelect('u_csvExportViewSelect', 'u_csvExportView'));
    if (act === 'loadViewsForBackup' && typeof loadViewsForSelect === 'function') return withGuard(async () => loadViewsForSelect('u_recordBackupViewSelect', 'u_recordBackupView'));
    if (act === 'runCsvExport' && typeof runCsvExport === 'function') return withGuard(runCsvExport);
    if (act === 'runCsvImport' && typeof runCsvImport === 'function') return withGuard(runCsvImport);
    if (act === 'runRecordBackup' && typeof runRecordBackup === 'function') return withGuard(runRecordBackup);
    if (act === 'runRecordCopy' && typeof runRecordCopy === 'function') return withGuard(runRecordCopy);

    // ----- Templates -----
    if (act === 'saveTemplate' && typeof saveTemplate === 'function') return withGuard(saveTemplate);
    if (act === 'loadTemplate' && typeof loadTemplate === 'function') return loadTemplate();
    if (act === 'deleteTemplate' && typeof deleteTemplate === 'function') return deleteTemplate();

    // ----- Analyze Tab -----
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

    // ----- API tester -----
    if (act === 'clearApiTesterHistory' && typeof clearApiTesterHistory === 'function') {
      clearApiTesterHistory();
      setStatus('APIテスターの履歴をクリアしました');
      return;
    }
    if (act === 'runApiTester' && typeof runApiTester === 'function') return runApiTester();
  });

  refreshDiffSelectionSetDropdown();
  syncDiffOnboardingVisibility();
}
