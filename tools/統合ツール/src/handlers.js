'use strict';

import { SECTION_DEFS, DEFAULT_APP_ID, FEATURE_DEFS, DIFF_ONBOARDING_DISMISSED_KEY } from './constants.js';
import { state, ui } from './state.js';
import { esc, deepClone, readTextFile, getThemeDisplayLabel, selectedScopeKeys, showToast } from './utils.js';
import { buildApiPrefix } from './api.js';
import { getActualDiffRows } from './diff/engine.js';
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
  renderLookupMapRows,
  syncLookupMapFromRows,
  setSettingsExportScopeSelection,
  syncApplyScopesFromSidebar
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
  copyDiffSummaryToClipboard,
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
  ensureDiffPreparedForReflect
} from './tabs/diff.js';
import { initReflectPreviewPlayground } from './tabs/reflect-preview-playground.js';

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
  setActiveReflectNode
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
//   runFieldDependencyMap, runFetchJsConfig, runExportJsConfig, runApplyJsConfig,
//   runRenderProcessFlow, launchKintoneSql, runGenerateERDiagram,
//   runExportERDiagramHtml, runBatchProcess, runBatchFileDownload,
//   runBatchJsConfigDownload, loadViewsForSelect, runCsvExport, runCsvImport,
//   exportDiffXlsx, runRecordCopy, saveTemplate, loadTemplate, deleteTemplate,
//   runSimStart, runSimExecuteAction, runApiTester,
//   runPreviewApplyPlan, runBackupTargetPreview, runApplyPreview, runDeployOnly,
//   runApplyPatchJson, importPatchJsonFromFile, parsePatchJsonPayload,
//   renderPatchJsonSummary, renderCustomizeResult,
//   runBulkFieldRename, runDetectUnusedFields,
//   normalizeDiffFavoritePath, renderDiffSnapshotHistory,
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
    const onDiffView = state.activeTab === 'diff' && state.activeSubTabs.diff === 'view';
    el.style.display = !dismissed && onDiffView ? 'block' : 'none';
  }

  const {
    runDesignExport,
    runDesignCopyMd,
    runDesignExportXlsx,
    runDesignDiffMd,
    runFieldDependencyMap,
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
    exportDiffXlsx,
    runRecordCopy,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    runSimStart,
    runSimExecuteAction,
    runApiTester,
    runPreviewApplyPlan,
    runBackupTargetPreview,
    runApplyPreview,
    runDeployOnly,
    runApplyPatchJson,
    importPatchJsonFromFile,
    parsePatchJsonPayload,
    renderPatchJsonSummary,
    renderCustomizeResult,
    runBulkFieldRename,
    runDetectUnusedFields,
    renderDiffSnapshotHistory,
    renderDiffFavoritesOnlyButton,
    renderTemplateOptions
  } = injected;

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
  renderDiffSelectionState();
  if (typeof renderDiffWarningBox === 'function') renderDiffWarningBox();
  if (typeof renderDiffSnapshotHistory === 'function') renderDiffSnapshotHistory();
  renderLookupMapRows();
  if (typeof renderTemplateOptions === 'function') renderTemplateOptions();
  renderBundleState();
  renderReflectSidebar();
  renderReflectMainPanel();
  renderReflectNodeList();
  initReflectPreviewPlayground(ui, setStatus);
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
      if (typeof renderDiffSnapshotHistory === 'function') renderDiffSnapshotHistory();
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
    el.addEventListener('change', saveCurrentDialogState);
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

  [ui.diffFilterSection, ui.diffFilterType, ui.diffFilterSeverity].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', () => {
      state.diffFilterSection = ui.diffFilterSection?.value || '';
      state.diffFilterType = ui.diffFilterType?.value || '';
      state.diffFilterSeverity = ui.diffFilterSeverity?.value || '';
      saveCurrentDialogState();
      if (state.lastDiffRows.length || state.lastFetchIssues.length) renderResultRows(state.lastDiffRows);
      else renderDiffSelectionState();
    });
  });

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

    if (state.activeTab !== 'diff') return;
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
      ui.diffSearch?.focus();
      ui.diffSearch?.select();
      return;
    }
    if (e.key === 'Escape' && getToolDocument().activeElement === ui.diffSearch) {
      e.preventDefault();
      ui.diffSearch.value = '';
      saveCurrentDialogState();
      renderResultRows(state.lastDiffRows);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      withGuard(async () => copyDiffSummaryToClipboard());
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

    if (e.target?.closest('#u_diffScopes') || e.target?.closest('#u_applyScopes') || e.target?.closest('#u_settingsExportScopes')) {
      saveCurrentDialogState();
      renderBundleState();
    }
    if (e.target?.closest('[data-apply-scope]')) {
      syncApplyScopesFromSidebar();
      saveCurrentDialogState();
      renderBundleState();
      renderReflectMainPanel();
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

// Legacy textarea input handling removed – JSONEditor now manages changes.
// The previous code that listened for 'input' events on the textarea has been deprecated.
// JSONEditor instance will invoke its onChange callback defined during initialization.


  // -------------------------------------------------------------------
  // Main click handler (data-act dispatch)
  // -------------------------------------------------------------------

  root.addEventListener('click', (e) => {
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
      switchSubTab(parent, subTab.dataset.subtab || '');
      syncDiffOnboardingVisibility();
      if (parent === 'diff' && ui.result) renderResultRows(state.lastDiffRows || []);
      return;
    }

    // Tab switching
    const tab = e.target.closest('.tab');
    if (tab) {
      const prevTab = state.activeTab;
      switchTab(tab.dataset.tab);
      syncDiffOnboardingVisibility();
      if (prevTab === 'diff' && state.activeTab !== 'diff' && ui.result) {
        ui.result.innerHTML = MAIN_RESULT_IDLE_HTML;
      } else if (state.activeTab === 'diff' && ui.result) {
        renderResultRows(state.lastDiffRows || []);
      }
      return;
    }

    // data-act dispatch（ランチャー feature-card 内の子要素クリックでも拾う）
    const actEl = e.target.closest('[data-act]');
    const act = actEl?.dataset.act;
    if (!act) return;

    if (act === 'openFeature') {
      const featureKey = actEl.dataset.feature || '';
      const def = FEATURE_DEFS.find((f) => f.key === featureKey);
      if (!def) return;
      root.classList.remove('screen-launcher');
      root.classList.add('screen-feature');
      root.classList.remove('feat-vis', 'feat-data', 'feat-change');
      if (featureKey === 'vis') root.classList.add('feat-vis');
      else if (featureKey === 'data') root.classList.add('feat-data');
      else root.classList.add('feat-change');
      const conn = root.querySelector('#u_connectionPanel');
      if (conn instanceof HTMLDetailsElement) conn.open = true;
      const prevTab = state.activeTab;
      switchTab(def.tabs[0]);
      if (prevTab === 'diff' && state.activeTab !== 'diff' && ui.result) {
        ui.result.innerHTML = MAIN_RESULT_IDLE_HTML;
      } else if (state.activeTab === 'diff' && ui.result) {
        renderResultRows(state.lastDiffRows || []);
      }
      if (ui.featureTitle) ui.featureTitle.textContent = def.label;
      if (ui.featureConn) ui.featureConn.textContent = def.desc;
      saveCurrentDialogState();
      setStatus(`${def.label} を開きました`);
      return;
    }
    if (act === 'backToLauncher') {
      root.classList.remove('screen-feature', 'feat-vis', 'feat-data', 'feat-change');
      root.classList.add('screen-launcher');
      saveCurrentDialogState();
      setStatus('機能を選んでください');
      return;
    }

    // ----- Dialog controls -----
    if (act === 'close') {
      closeGuidedTour({ silent: true });
      teardownDialogResizeHandling();
      root.remove();
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
      switchSubTab('diff', (state.lastDiffRows.length || state.lastFetchIssues.length) ? 'view' : 'conditions');
      if (ui.result) renderResultRows(state.lastDiffRows || []);
      setStatus('差分比較タブへ移動しました');
      return;
    }
    if (act === 'openReflectPreviewEditor') {
      const fold = root.querySelector('#u_reflectPreviewEditorFold');
      fold?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      setStatus('フィールド差分プレビューエディタへ移動しました');
      return;
    }

    // ----- Source / Target quick actions -----
    if (act === 'setSourceCurrent') {
      ui.sourceApp.value = DEFAULT_APP_ID;
      saveCurrentDialogState();
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
    if (act === 'runSettingsExportJson') return withGuard(async () => runSettingsExport('json'));
    if (act === 'runSettingsExportZip') return withGuard(async () => runSettingsExport('zip'));
    if (act === 'settingsExportSearchApps') return withGuard(runSettingsExportSearchApps);

    // ----- Diff actions -----
    if (act === 'prefetchCommonData') return withGuard(runPrefetchCommonData);
    if (act === 'runDiffAndPlan') return withGuard(runDiffAndPreviewPlan);
    if (act === 'runDiff') return withGuard(runDiff);
    if (act === 'copyDiffSummary') return withGuard(async () => copyDiffSummaryToClipboard());
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
    if (act === 'diffScopeAll') { setScopeSelection(ui.diffScopes, true); setStatus('比較セクションを全選択しました'); return; }
    if (act === 'diffScopeNone') { setScopeSelection(ui.diffScopes, false); setStatus('比較セクションを全解除しました'); return; }

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
      setStatus('反映セクションを全選択しました');
      return;
    }
    if (act === 'applyScopeNone') {
      setScopeSelection(ui.applyScopes, false);
      renderReflectSidebar();
      renderReflectMainPanel();
      setStatus('反映セクションを全解除しました');
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

    // ----- Reflect mode switching -----
    if (act === 'reflectModeSection') {
      ui.nodeMode.checked = false;
      state.reflectActiveSidebarSection = null;
      renderReflectModeUi();
      renderReflectMainPanel();
      setStatus('セクション反映モードに切り替えました');
      return;
    }
    if (act === 'reflectModeNode') {
      if (ui.reflectSimpleMode?.checked) {
        setStatus('簡易表示中はノード選択に切り替えられません。「簡易表示」をオフにしてください。');
        return;
      }
      ui.nodeMode.checked = true;
      state.reflectActiveSidebarSection = null;
      renderReflectModeUi();
      if (state.lastDiffRows && state.lastDiffRows.length > 0 && !state.reflectRows.length) {
        loadReflectRowsFromLastDiff();
      }
      setStatus('ノード反映モードに切り替えました');
      return;
    }

    // ----- Reflect node actions -----
    if (act === 'loadReflectNodes') return withGuard(async () => { loadReflectRowsFromLastDiff(); });
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
      switchSubTab('diff', 'view');
      if (ui.diffFilterSection) ui.diffFilterSection.value = row.sectionKey || '';
      state.diffFilterSection = row.sectionKey || '';
      if (ui.diffSearch) ui.diffSearch.value = row.path || '';
      renderResultRows(state.lastDiffRows);
      setStatus('差分比較タブで該当ノードを表示しました');
      return;
    }

    // ----- Reflect apply actions -----
    if (act === 'previewApplyPlan' && typeof runPreviewApplyPlan === 'function') return withGuard(runPreviewApplyPlan);
    if (act === 'backupTargetPreview' && typeof runBackupTargetPreview === 'function') return withGuard(runBackupTargetPreview);
    if (act === 'applyPreview' && typeof runApplyPreview === 'function') return withGuard(runApplyPreview);
    if (act === 'deployOnly' && typeof runDeployOnly === 'function') return withGuard(runDeployOnly);

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
    if (act === 'runDetectUnusedFields' && typeof runDetectUnusedFields === 'function') return withGuard(runDetectUnusedFields);

    // ----- Design export -----
    if (act === 'exportDesignJson' && typeof runDesignExport === 'function') return withGuard(() => runDesignExport('json'));
    if (act === 'exportDesignMd' && typeof runDesignExport === 'function') return withGuard(() => runDesignExport('md'));
    if (act === 'copyDesignMd' && typeof runDesignCopyMd === 'function') return withGuard(runDesignCopyMd);
    if (act === 'exportDesignXlsx' && typeof runDesignExportXlsx === 'function') return withGuard(runDesignExportXlsx);
    if (act === 'exportDesignDiffMd' && typeof runDesignDiffMd === 'function') return withGuard(runDesignDiffMd);
    if (act === 'generateFieldDepMap' && typeof runFieldDependencyMap === 'function') return withGuard(runFieldDependencyMap);

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
    if (act === 'runCsvExport' && typeof runCsvExport === 'function') return withGuard(runCsvExport);
    if (act === 'runCsvImport' && typeof runCsvImport === 'function') return withGuard(runCsvImport);
    if (act === 'exportDiffXlsx' && typeof exportDiffXlsx === 'function') return withGuard(exportDiffXlsx);
    if (act === 'runRecordCopy' && typeof runRecordCopy === 'function') return withGuard(runRecordCopy);

    // ----- Templates -----
    if (act === 'saveTemplate' && typeof saveTemplate === 'function') return withGuard(saveTemplate);
    if (act === 'loadTemplate' && typeof loadTemplate === 'function') return loadTemplate();
    if (act === 'deleteTemplate' && typeof deleteTemplate === 'function') return deleteTemplate();

    // ----- Simulation -----
    if (act === 'simStart' && typeof runSimStart === 'function') return withGuard(runSimStart);
    if (act === 'simExecuteAction' && typeof runSimExecuteAction === 'function') return withGuard(runSimExecuteAction);

    // ----- API tester -----
    if (act === 'runApiTester' && typeof runApiTester === 'function') return runApiTester();
  });

  refreshDiffSelectionSetDropdown();
  syncDiffOnboardingVisibility();
}
