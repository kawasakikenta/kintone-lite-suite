'use strict';

import { TOOL_ID, FEATURE_DEFS } from './constants.js';

const TOOL_POPOUT_NAME = 'kintone-unified-suite-v2';
import { ui as sharedUi, state } from './state.js';
import { stableStringify, selectedScopeKeys } from './utils.js';
import { buildRoot, copyTextToClipboard } from './ui/template.js';
import { getToolDocument, setRootElement, setUiRefs } from './ui/dialog.js';
import { setComponentUi, setComponentDeps, setStatus, switchTab, openFeatureScreen } from './ui/components.js';
import { stringifyForDiff, renderRowColumns, buildDiffWarningInfo, renderResultRows, renderDiffFilterOptions, renderDiffSelectionState, renderDiffWarningBox, syncDiffThemeButton } from './diff/export.js';
import { commonParams, currentDiffSignature, saveCurrentDialogState } from './tabs/diff.js';
import { parseLookupMapInput, runBulkFieldRename } from './tabs/field.js';
import { reflectRowModeById, reflectRowDesiredValue } from './reflect/rowMode.js';
import {
  runBackupTargetPreview,
  runRestoreTargetPreviewBackup,
  importTargetPreviewBackupFromFile,
  runDeployOnly,
  runApplyPreview,
  runApplyPatchJson,
  runRetryFailedSections,
  importPatchJsonFromFile,
  parsePatchJsonPayload,
  renderPatchJsonSummary,
  populatePatchJsonFromCurrentDiff,
  populatePatchJsonFromSelectedDiff,
  exportPatchJsonToFile,
  copyPatchJsonToClipboard
} from './reflect/apply.js';
import { getActiveReflectRow, getSelectedReflectRows } from './tabs/reflect.js';
import { resolveApplyScopes } from './reflect/helpers.js';
import { makeApplyPlanSignature, runPreviewApplyPlan, runExportDryRunPlan, runExportReviewZip, togglePlanSectionExclude } from './reflect/plan.js';
import { scheduleGuidedTourLayout } from './ui/tour.js';
import { setupEventHandlers, forceReleaseRunningGuard } from './handlers.js';
import { installPsychology } from './ui/psychology.js';
import { initExtras } from './ui/extras.js';
import { initJsonEditor, getJsonEditorInstance, startGuidedTour } from './oss_integrations.js';
import { GUIDED_TOUR_STEPS } from './constants.js';

import {
  runDesignExport,
  runDesignCopyMd,
  runDesignExportXlsx,
  runDesignDiffMd
} from './tabs/design.js';
import { runGenerateERDiagram, runExportERDiagramHtml } from './tabs/er.js';
import {
  runFetchJsConfig,
  runExportJsConfig,
  runApplyJsConfig,
  runBatchJsConfigDownload,
  renderCustomizeResult
} from './tabs/jsconfig.js';
import { runRenderProcessFlow, runSimStart, runSimExecuteAction } from './tabs/process.js';
import {
  runBatchProcess,
  runBatchFileDownload,
  runCsvExport,
  runCsvImport,
  runRecordBackup,
  runRecordCopy,
  saveTemplate,
  loadTemplate,
  deleteTemplate,
  loadViewsForSelect,
  renderTemplateOptions
} from './tabs/record.js';
import { runApiTester, clearApiTesterHistory, copyApiTesterCurl, renderApiTesterHistory, initApiTesterEnhancements } from './tabs/api-tester.js';
import {
  runAnalyzeDashboard,
  runFieldImpactAnalysis,
  exportFieldImpactCsv,
  runPermissionMatrix,
  runNotificationVisualizer,
  runLayoutPreview,
  runFieldDependencyGraph,
  fieldGraphRelayout,
  fieldGraphExportPng
} from './tabs/analyze.js';

/**
 * @param {{ initialTab?: string }} [options]
 */
export function runKintoneUnifiedSuite(options: any = {}) {
  if (!window.kintone?.api || !window.kintone?.app) {
    alert('kintone画面で実行してください');
    return;
  }
  const removeToolFromDoc = (doc) => {
    try { doc.getElementById(TOOL_ID)?.remove(); } catch (e) { /* ignore */ }
  };
  removeToolFromDoc(document);
  const prevWin = window.__KUS_TOOL_WINDOW__;
  if (prevWin && !prevWin.closed) {
    try { removeToolFromDoc(prevWin.document); } catch (e) { /* ignore */ }
    try { prevWin.close(); } catch (e) { /* ignore */ }
  }

  let root;
  const popWin = window.open('', TOOL_POPOUT_NAME, 'width=1260,height=920');
  if (!popWin) {
    alert('別タブを開けませんでした（ポップアップがブロックされている可能性があります）。このタブ内に表示します。');
    root = buildRoot(document, { popout: false });
    document.body.appendChild(root);
  } else {
    window.__KUS_TOOL_WINDOW__ = popWin;
    popWin.document.open();
    popWin.document.write(
      '<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>kintone 統合変更ツール</title></head>' +
      '<body style="margin:0;min-height:100vh;background:#94a3b8;"></body></html>'
    );
    popWin.document.close();
    root = buildRoot(popWin.document, { popout: true });
    popWin.document.body.appendChild(root);
    try { popWin.focus(); } catch (e) { /* ignore */ }
  }

  setRootElement(root);

  // 「⋯ その他」ドロップダウン body を summary 直下に配置（position:fixed）
  try {
    const moreFold = root.querySelector('#u_kusTabMore') as HTMLDetailsElement | null;
    if (moreFold && root.dataset.kusMoreDropdownBound !== '1') {
      root.dataset.kusMoreDropdownBound = '1';
      const ownerWin = (root.ownerDocument && root.ownerDocument.defaultView) || window;
      const summary = moreFold.querySelector('.kus-tab-more__summary') as HTMLElement | null;
      const body = moreFold.querySelector('.kus-tab-more__body') as HTMLElement | null;
      const positionBody = () => {
        if (!summary || !body || !moreFold.open) return;
        const r = summary.getBoundingClientRect();
        body.style.top = `${r.bottom + 4}px`;
        body.style.right = `${(ownerWin.innerWidth - r.right)}px`;
        body.style.left = 'auto';
      };
      moreFold.addEventListener('toggle', () => positionBody());
      ownerWin.addEventListener('resize', positionBody);
      ownerWin.addEventListener('scroll', positionBody, true);
    }
  } catch (e) { /* ignore */ }

  // ブラウザストレージを使わず、起動時は常に既定の折りたたみ状態にする。
  try {
    root.classList.add('header-collapsed');
    const btn = root.querySelector('#u_headerCollapseBtn') as HTMLElement | null;
    if (btn) {
      btn.textContent = '▼';
      btn.setAttribute('aria-label', 'ヘッダーを展開');
      btn.setAttribute('title', 'ヘッダーを展開');
    }
  } catch (e) { /* ignore */ }

  const $ = (id) => root.querySelector(id);

  const ui = {
    tabs: [...root.querySelectorAll('.tab')],
    subTabs: [...root.querySelectorAll('.subtab')],
    panes: [...root.querySelectorAll('.pane')],
    subPanes: [...root.querySelectorAll('.subpane')],
    dialogHandle: root.querySelector('[data-dialog-drag-handle]'),
    toolBody: root.querySelector('.body'),
    status: $('#u_status'),
    result: $('#u_result'),
    sourceApp: $('#u_sourceApp'),
    sourceAppLabel: $('#u_sourceAppLabel'),
    sourceGuest: $('#u_sourceGuest'),
    sourceGuestLabel: $('#u_sourceGuestLabel'),
    sourcePreview: $('#u_sourcePreview'),
    targetApp: $('#u_targetApp'),
    targetAppLabel: $('#u_targetAppLabel'),
    targetGuest: $('#u_targetGuest'),
    targetGuestLabel: $('#u_targetGuestLabel'),
    targetPreview: $('#u_targetPreview'),
    connectionSearchKeyword: $('#u_connectionSearchKeyword'),
    connectionSearchGuest: $('#u_connectionSearchGuest'),
    connectionSearchAssign: $('#u_connectionSearchAssign'),
    connectionSearchResult: $('#u_connectionSearchResult'),
    connectionPresetName: $('#u_connectionPresetName'),
    connectionPresetSelect: $('#u_connectionPresetSelect'),
    connectionPresetSummary: $('#u_connectionPresetSummary'),
    lookupMap: $('#u_lookupMap'),
    ignoreKeys: $('#u_ignoreKeys'),
    ignorePresetFieldOrder: $('#u_ignorePresetFieldOrder'),
    ignorePresetMeta: $('#u_ignorePresetMeta'),
    ignorePresetLabelName: $('#u_ignorePresetLabelName'),
    diffNormalizeViewOrder: $('#u_diffNormalizeViewOrder'),
    diffNormalizePermissionOrder: $('#u_diffNormalizePermissionOrder'),
    diffNormalizeGeneralArrayOrder: $('#u_diffNormalizeGeneralArrayOrder'),
    diffSearch: $('#u_diffSearch'),
    diffSearchFieldName: $('#u_diffSearchFieldName'),
    diffFilterSection: $('#u_diffFilterSection'),
    diffFilterType: $('#u_diffFilterType'),
    diffFilterSeverity: $('#u_diffFilterSeverity'),
    diffFilterTableOnly: $('#u_diffFilterTableOnly'),
    diffFilterTableKeyword: $('#u_diffFilterTableKeyword'),
    diffActiveFilters: $('#u_diffActiveFilters'),
    diffExportMode: $('#u_diffExportMode'),
    diffExportContent: $('#u_diffExportContent'),
    diffFavoritesOnlyBtn: $('#u_diffFavoritesOnlyBtn'),
    diffSelectionState: $('#u_diffSelectionState'),
    diffOnboarding: $('#u_diffOnboarding'),
    diffSelectionSetName: $('#u_diffSelectionSetName'),
    diffSelectionSetSelect: $('#u_diffSelectionSetSelect'),
    diffWarnThreshold: $('#u_diffWarnThreshold'),
    diffWarnBox: $('#u_diffWarnBox'),
    diffSuggestedIgnore: $('#u_diffSuggestedIgnore'),
    ignoreDefaultChips: $('#u_ignoreDefaultChips'),
    ignoreImpactPreview: $('#u_ignoreImpactPreview'),
    ignorePresetName: $('#u_ignorePresetName'),
    ignorePresetSelect: $('#u_ignorePresetSelect'),
    diffMultiTargets: $('#u_diffMultiTargets'),
    diffMultiTargetResult: $('#u_diffMultiTargetResult'),
    commonDataState: $('#u_commonDataState'),
    step1Indicator: $('#u_step1Indicator'),
    step2Indicator: $('#u_step2Indicator'),
    step3Indicator: $('#u_step3Indicator'),
    connectionSummaryInline: $('#u_connectionSummaryInline'),
    connectionToggleBtn: $('#u_connectionToggleBtn'),
    connectionStep1Body: $('#u_connectionStep1Body'),
    connectionPanel: $('#u_connectionPanel'),
    charDiff: $('#u_charDiff'),
    diffIncludeSame: $('#u_diffIncludeSame'),
    diffThemeBtn: $('#u_diffThemeBtn'),
    bundleState: $('#u_bundleState'),
    sourceBundleFile: $('#u_sourceBundleFile'),
    targetBundleFile: $('#u_targetBundleFile'),
    diffScopes: $('#u_diffScopes'),
    applyScopes: $('#u_applyScopes'),
    applyScopeBlock: $('#u_applyScopeBlock'),
    sectionOptionsBlock: $('#u_sectionOptionsBlock'),
    reflectMode: $('#u_reflectMode'),
    reflectHint: $('#u_reflectHint'),
    applyDiffOnly: $('#u_applyDiffOnly'),
    reflectApplyChecklist: $('#u_reflectApplyChecklist'),
    reflectChecklistStatus: $('#u_reflectChecklistStatus'),
    autoBackupPreview: $('#u_autoBackupPreview'),
    backupStatus: $('#u_backupStatus'),
    stopOnError: $('#u_stopOnError'),
    nodeMode: $('#u_nodeMode'),
    reflectSimpleMode: $('#u_reflectSimpleMode'),
    modeSectionBtn: $('#u_modeSectionBtn'),
    modeNodeBtn: $('#u_modeNodeBtn'),
    nodeFilterBlock: $('#u_nodeFilterBlock'),
    nodeSearch: $('#u_nodeSearch'),
    nodeFilterSection: $('#u_nodeFilterSection'),
    nodeFilterType: $('#u_nodeFilterType'),
    nodeFilterSeverity: $('#u_nodeFilterSeverity'),
    nodePropertyPanel: $('#u_nodePropertyPanel'),
    nodePropertyList: $('#u_nodePropertyList'),
    nodePropertyChips: $('#u_nodePropertyChips'),
    activeFilterChips: $('#u_activeFilterChips'),
    nodeWarn: $('#u_nodeWarn'),
    nodeControls: $('#u_nodeControls'),
    reflectNodeWorkbench: $('#u_reflectNodeWorkbench'),
    reflectNodeList: $('#u_reflectNodeList'),
    reflectNodeDetail: $('#u_reflectNodeDetail'),
    reflectPreviewPlayground: $('#u_reflectPreviewPlayground'),
    sectionPreviewEditor: $('#u_sectionPreviewEditor'),
    reflectAssist: $('#u_reflectAssist'),
    reflectHowto: $('#u_reflectHowto'),
    reflectOverview: $('#u_reflectOverview'),
    reflectMainTitle: $('#u_reflectMainTitle'),
    reflectOptionsCard: $('#u_reflectOptionsCard'),
    doDeploy: $('#u_doDeploy'),
    patchJsonPanel: $('#u_patchJsonPanel'),
    patchJsonSummary: $('#u_patchJsonSummary'),
    patchJsonEditor: $('#u_patchJsonEditor'),
    fieldJson: $('#u_fieldJson'),
    overwriteField: $('#u_overwriteField'),
    deployField: $('#u_deployField'),
    fieldJsonFile: $('#u_fieldJsonFile'),
    sourceFieldListContainer: $('#u_sourceFieldListContainer'),
    sourceFieldTbody: $('#u_sourceFieldTbody'),
    sourceFieldCheckAll: $('#u_sourceFieldCheckAll'),
    jsconfigJson: $('#u_jsconfigJson'),
    jsconfigFile: $('#u_jsconfigFile'),
    jsconfigResult: $('#u_jsconfigResult'),
    jsconfigPreview: $('#u_jsconfigPreview'),
    jsconfigDeployAfter: $('#u_jsconfigDeployAfter'),
    settingsExportAppIds: $('#u_settingsExportAppIds'),
    settingsExportSearchKeyword: $('#u_settingsExportSearchKeyword'),
    settingsExportSpaceId: $('#u_settingsExportSpaceId'),
    settingsExportSearchResult: $('#u_settingsExportSearchResult'),
    settingsExportGuest: $('#u_settingsExportGuest'),
    settingsExportPreview: $('#u_settingsExportPreview'),
    settingsExportIncludePluginConfig: $('#u_settingsExportIncludePluginConfig'),
    settingsExportScopes: $('#u_settingsExportScopes'),
    settingsExportResult: $('#u_settingsExportResult'),
    recordBackupView: $('#u_recordBackupView'),
    recordBackupViewSelect: $('#u_recordBackupViewSelect'),
    recordBackupZipName: $('#u_recordBackupZipName'),
    recordBackupIncludeFiles: $('#u_recordBackupIncludeFiles'),
    recordBackupIncludeComments: $('#u_recordBackupIncludeComments'),
    recordBackupResult: $('#u_recordBackupResult'),
    scopePickerModal: $('#u_scopePickerModal'),
    scopePickerTitle: $('#u_scopePickerTitle'),
    scopePickerSub: $('#u_scopePickerSub'),
    mermaidText: $('#u_mermaidText'),
    mermaidView: $('#u_mermaidView'),
    erLayout: $('#u_erLayout'),
    erFieldDensity: $('#u_erFieldDensity'),
    erMaxDepth: $('#u_erMaxDepth'),
    erExtraApps: $('#u_erExtraApps'),
    erSpaceId: $('#u_erSpaceId'),
    erIncludeSubtable: $('#u_erIncludeSubtable'),
    erIncludeReverseLookup: $('#u_erIncludeReverseLookup'),
    busyOverlay: $('#u_busyOverlay'),
    busyText: $('#u_busyText'),
    tourOverlay: $('#u_tourOverlay'),
    tourSpotlight: $('#u_tourSpotlight'),
    tourCard: $('#u_tourCard'),
    tourStepLabel: $('#u_tourStepLabel'),
    tourTitle: $('#u_tourTitle'),
    tourBody: $('#u_tourBody'),
    tourProgress: $('#u_tourProgress'),
    tourHint: $('#u_tourHint'),
    tourPrev: $('#u_tourPrev'),
    tourNext: $('#u_tourNext'),
    featureTitle: $('#u_featureTitle'),
    featureBreadcrumb: $('#u_featureBreadcrumb'),
    featureConn: $('#u_featureConn'),
    launcherMenu: $('#u_launcherMenu'),
    launcherToggleMore: $('#u_launcherToggleMore'),
    launcherSearch: $('#u_launcherSearch'),
    launcherGroupFilters: $('#u_launcherGroupFilters'),
    launcherActiveFilters: $('#u_launcherActiveFilters'),
    launcherVisibleCount: $('#u_launcherVisibleCount'),
    launcherEmptyState: $('#u_launcherEmptyState'),
    workHistoryPanel: $('#u_workHistoryPanel'),
    workHistorySummary: $('#u_workHistorySummary'),
    workHistoryList: $('#u_workHistoryList'),
    shortcutHelpModal: $('#u_shortcutHelpModal'),
    copyTextToClipboard
  };

  Object.assign(sharedUi, ui);
  setUiRefs(ui);
  setComponentUi(ui);
  setComponentDeps({
    buildDiffWarningInfo,
    renderRowColumns,
    stringifyForDiff,
    selectedScopeKeys,
    reflectRowModeById,
    reflectRowDesiredValue,
    getActiveReflectRow,
    resolveApplyScopes,
    commonParams,
    currentDiffSignature,
    parseLookupMapInput,
    makeApplyPlanSignature,
    getSelectedReflectRows,
    switchTab,
    scheduleGuidedTourLayout,
    stableStringify
  });

  setupEventHandlers({
    runDesignExport,
    runDesignCopyMd,
    runDesignExportXlsx,
    runDesignDiffMd,
    runFetchJsConfig,
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
    runApiTester,
    clearApiTesterHistory,
    copyApiTesterCurl,
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
    populatePatchJsonFromSelectedDiff,
    exportPatchJsonToFile,
    copyPatchJsonToClipboard,
    renderCustomizeResult,
    runBulkFieldRename,
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
  });

  renderApiTesterHistory();
  initApiTesterEnhancements();

  // 心理学ベースの UI 強化を起動: 揮発メモリのみ。永続化なし。
  installPsychology({
    sourceApp: ui.sourceApp as HTMLInputElement | null,
    targetApp: ui.targetApp as HTMLInputElement | null,
    envBadgeHost: root.querySelector('#u_envBadge') as HTMLElement | null,
    sessionSummaryHost: root.querySelector('#u_sessionSummary') as HTMLElement | null,
    getEnvContext: () => {
      const sourceAppId = String((ui.sourceApp as HTMLInputElement | null)?.value || '').trim();
      const targetAppId = String((ui.targetApp as HTMLInputElement | null)?.value || '').trim();
      const sourceGuestId = String((ui.sourceGuest as HTMLInputElement | null)?.value || '').trim();
      const targetGuestId = String((ui.targetGuest as HTMLInputElement | null)?.value || '').trim();
      const sourcePreview = !!(ui.sourcePreview as HTMLInputElement | null)?.checked;
      const targetPreview = !!(ui.targetPreview as HTMLInputElement | null)?.checked;
      const sameConnection = !!sourceAppId && sourceAppId === targetAppId && sourceGuestId === targetGuestId;
      return { sourceAppId, targetAppId, sourcePreview, targetPreview, sameConnection };
    }
  });

  setStatus('待機中');

  // ステータスバーのダブルクリックで「実行中」フラグを強制解除（ハング検知時の救済）
  try {
    const statusEl = ui.status as HTMLElement | null;
    if (statusEl) {
      statusEl.title = '実行中の処理がハングした場合はダブルクリックで強制解除';
      statusEl.style.cursor = 'pointer';
      statusEl.addEventListener('dblclick', () => {
        if (!forceReleaseRunningGuard('ステータスバー ダブルクリック')) {
          setStatus('実行中の処理はありません');
        }
      });
    }
  } catch (e) { /* ignore */ }

  if (options.initialTab) {
    const initialFeature = FEATURE_DEFS.find((def) => def.key === options.initialTab)
      || FEATURE_DEFS.find((def) => (def.tab || def.tabs?.[0]) === options.initialTab && (options.initialTab !== 'reflect' || def.key === 'reflect'));
    if (initialFeature) openFeatureScreen(initialFeature.key, { persist: false, focus: false });
    else switchTab(options.initialTab, { persist: false });
  }

  // --- OSS Integrations: Init JSONEditors + Enhanced Tour ---
  initOssIntegrations().catch((e) => {
    console.warn('OSS integrations init skipped:', e.message || e);
  });

  // --- UI 拡張モジュール（35/37/39/41/44/46/47/49/51/52/53/55/60/65/70/78/80/84/85/86/...） ---
  try { initExtras(); }
  catch (e) { console.warn('extras init skipped:', (e as any)?.message || e); }
}

function stringifyEditorFallbackValue(value) {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value || ({} as any), null, 2); }
  catch (e) { return String(value ?? ''); }
}

function installPlainJsonValueShim(container) {
  if (!container || typeof container.value === 'string') return;
  let fallbackText = '';
  Object.defineProperty(container, 'value', {
    get() {
      return fallbackText;
    },
    set(v) {
      fallbackText = stringifyEditorFallbackValue(v);
    },
    configurable: true
  });
}

function bindJsonEditorValue(container, editor) {
  if (!container || !editor) return;
  let fallbackText = typeof container.value === 'string' ? container.value : '';
  Object.defineProperty(container, 'value', {
    get() {
      try {
        fallbackText = editor.getText();
        return fallbackText;
      } catch (e) {
        return fallbackText;
      }
    },
    set(v) {
      fallbackText = stringifyEditorFallbackValue(v);
      try {
        if (typeof v === 'string') {
          if (!v.trim()) { editor.set({}); return; }
          editor.set(JSON.parse(v));
        } else {
          editor.set(v || ({} as any));
        }
      } catch (e) {
        try { editor.setText(fallbackText); } catch (e2) { /* ignore */ }
      }
    },
    configurable: true
  });
  if (fallbackText.trim()) container.value = fallbackText;
}

function findJsonEditorContainer(id) {
  const toolD = getToolDocument();
  return toolD.getElementById(id)
    || document.getElementById(id)
    || (window.__KUS_TOOL_WINDOW__ && !window.__KUS_TOOL_WINDOW__.closed
      ? window.__KUS_TOOL_WINDOW__.document.getElementById(id)
      : null);
}

async function initOssIntegrations() {
  // Toastify の事前読み込みは不要（トーストは自前実装でツール内に描画する）

  // Initialize JSONEditor for patchJsonEditor container
  try {
    const patchContainer = findJsonEditorContainer('u_patchJsonEditor');
    if (patchContainer && patchContainer.tagName === 'DIV') {
      installPlainJsonValueShim(patchContainer);
      const editor = await initJsonEditor('u_patchJsonEditor', {
        container: patchContainer,
        document: patchContainer.ownerDocument,
        mode: 'code',
        modes: ['code', 'tree'],
        initialValue: {},
        onChange: () => {
          try {
            const inst = getJsonEditorInstance('u_patchJsonEditor');
            if (inst) {
              const val = inst.get();
              if (val && typeof val === 'object' && typeof parsePatchJsonPayload === 'function' && typeof renderPatchJsonSummary === 'function') {
                renderPatchJsonSummary(parsePatchJsonPayload(val));
              }
            }
          } catch (e) {
            if (typeof renderPatchJsonSummary === 'function') renderPatchJsonSummary(null);
          }
        }
      });
      // Add .value compatibility shim for existing code
      if (editor && patchContainer) bindJsonEditorValue(patchContainer, editor);
    }
  } catch (e) {
    console.warn('JSONEditor (patch) init skipped:', e.message);
  }

  // Initialize JSONEditor for fieldJson container
  try {
    const fieldContainer = findJsonEditorContainer('u_fieldJson');
    if (fieldContainer && fieldContainer.tagName === 'DIV') {
      installPlainJsonValueShim(fieldContainer);
      const editor = await initJsonEditor('u_fieldJson', {
        container: fieldContainer,
        document: fieldContainer.ownerDocument,
        mode: 'code',
        modes: ['code', 'tree'],
        initialValue: {}
      });
      // Add .value compatibility shim
      if (editor && fieldContainer) bindJsonEditorValue(fieldContainer, editor);
    }
  } catch (e) {
    console.warn('JSONEditor (field) init skipped:', e.message);
  }
}
