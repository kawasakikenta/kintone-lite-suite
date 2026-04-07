'use strict';

import { TOOL_ID } from './constants.js';

const TOOL_POPOUT_NAME = 'kintone-unified-suite-v2';
import { ui as sharedUi } from './state.js';
import { stableStringify, selectedScopeKeys } from './utils.js';
import { buildRoot, copyTextToClipboard } from './ui/template.js';
import { setRootElement, setUiRefs } from './ui/dialog.js';
import { setComponentUi, setComponentDeps, setStatus, switchTab } from './ui/components.js';
import { stringifyForDiff, renderRowColumns, buildDiffWarningInfo, renderResultRows, renderDiffFilterOptions, renderDiffSelectionState, renderDiffWarningBox, syncDiffThemeButton } from './diff/export.js';
import { commonParams, currentDiffSignature } from './tabs/diff.js';
import { parseLookupMapInput } from './tabs/field.js';
import { reflectRowModeById, reflectRowDesiredValue } from './reflect/rowMode.js';
import {
  runBackupTargetPreview,
  runDeployOnly,
  runApplyPreview,
  runApplyPatchJson,
  importPatchJsonFromFile,
  parsePatchJsonPayload,
  renderPatchJsonSummary,
  populatePatchJsonFromCurrentDiff
} from './reflect/apply.js';
import { getActiveReflectRow, getSelectedReflectRows } from './tabs/reflect.js';
import { resolveApplyScopes } from './reflect/helpers.js';
import { makeApplyPlanSignature, runPreviewApplyPlan } from './reflect/plan.js';
import { scheduleGuidedTourLayout } from './ui/tour.js';
import { setupEventHandlers } from './handlers.js';
import { initJsonEditor, getJsonEditorInstance, startGuidedTour } from './oss_integrations.js';
import { loadExternalLibrary, showToast } from './utils.js';
import { GUIDED_TOUR_STEPS } from './constants.js';

import {
  runDesignExport,
  runDesignCopyMd,
  runDesignExportXlsx,
  runDesignDiffMd
} from './tabs/design.js';
import { runFieldDependencyMap, runGenerateERDiagram, runExportERDiagramHtml } from './tabs/er.js';
import {
  runFetchJsConfig,
  runExportJsConfig,
  runApplyJsConfig,
  runBatchJsConfigDownload,
  renderCustomizeResult
} from './tabs/jsconfig.js';
import { runRenderProcessFlow, runSimStart, runSimExecuteAction } from './tabs/process.js';
import { launchKintoneSql } from './tabs/sql.js';
import {
  runBatchProcess,
  runBatchFileDownload,
  runCsvExport,
  runCsvImport,
  runRecordCopy,
  saveTemplate,
  loadTemplate,
  deleteTemplate,
  loadViewsForSelect,
  renderTemplateOptions
} from './tabs/record.js';
import { runApiTester, clearApiTesterHistory, renderApiTesterHistory, initApiTesterEnhancements } from './tabs/api-tester.js';

/**
 * @param {{ initialTab?: string }} [options]
 */
export function runKintoneUnifiedSuite(options = {}) {
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
    sourceGuest: $('#u_sourceGuest'),
    sourcePreview: $('#u_sourcePreview'),
    targetApp: $('#u_targetApp'),
    targetGuest: $('#u_targetGuest'),
    targetPreview: $('#u_targetPreview'),
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
    diffMultiTargets: $('#u_diffMultiTargets'),
    diffMultiTargetResult: $('#u_diffMultiTargetResult'),
    commonDataState: $('#u_commonDataState'),
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
    settingsExportSearchResult: $('#u_settingsExportSearchResult'),
    settingsExportGuest: $('#u_settingsExportGuest'),
    settingsExportPreview: $('#u_settingsExportPreview'),
    settingsExportScopes: $('#u_settingsExportScopes'),
    settingsExportResult: $('#u_settingsExportResult'),
    mermaidText: $('#u_mermaidText'),
    mermaidView: $('#u_mermaidView'),
    erLayout: $('#u_erLayout'),
    erFieldDensity: $('#u_erFieldDensity'),
    erMaxDepth: $('#u_erMaxDepth'),
    erExtraApps: $('#u_erExtraApps'),
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
    featureConn: $('#u_featureConn'),
    launcherMenu: $('#u_launcherMenu'),
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
    runRecordCopy,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    runSimStart,
    runSimExecuteAction,
    runApiTester,
    clearApiTesterHistory,
    runPreviewApplyPlan,
    runBackupTargetPreview,
    runApplyPreview,
    runDeployOnly,
    runApplyPatchJson,
    importPatchJsonFromFile,
    parsePatchJsonPayload,
    renderPatchJsonSummary,
    populatePatchJsonFromCurrentDiff,
    renderCustomizeResult,
    renderTemplateOptions
  });

  renderApiTesterHistory();
  initApiTesterEnhancements();

  setStatus('待機中');

  if (options.initialTab) {
    switchTab(options.initialTab);
  }

  // --- OSS Integrations: Init JSONEditors + Enhanced Tour ---
  initOssIntegrations();
}

async function initOssIntegrations() {
  try {
    // Load Toastify early for notification usage
    await loadExternalLibrary('toastify');
  } catch (e) {
    console.warn('Toastify load skipped:', e.message);
  }

  // Initialize JSONEditor for patchJsonEditor container
  try {
    const patchContainer = document.getElementById('u_patchJsonEditor')
      || (window.__KUS_TOOL_WINDOW__ && !window.__KUS_TOOL_WINDOW__.closed ? window.__KUS_TOOL_WINDOW__.document.getElementById('u_patchJsonEditor') : null);
    if (patchContainer && patchContainer.tagName === 'DIV') {
      const editor = await initJsonEditor('u_patchJsonEditor', {
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
      if (editor && patchContainer) {
        Object.defineProperty(patchContainer, 'value', {
          get() {
            try { return editor.getText(); } catch (e) { return ''; }
          },
          set(v) {
            try {
              if (typeof v === 'string') {
                if (!v.trim()) { editor.set({}); return; }
                editor.set(JSON.parse(v));
              } else {
                editor.set(v || {});
              }
            } catch (e) {
              try { editor.setText(String(v)); } catch (e2) { /* */ }
            }
          },
          configurable: true
        });
      }
    }
  } catch (e) {
    console.warn('JSONEditor (patch) init skipped:', e.message);
  }

  // Initialize JSONEditor for fieldJson container
  try {
    const fieldContainer = document.getElementById('u_fieldJson')
      || (window.__KUS_TOOL_WINDOW__ && !window.__KUS_TOOL_WINDOW__.closed ? window.__KUS_TOOL_WINDOW__.document.getElementById('u_fieldJson') : null);
    if (fieldContainer && fieldContainer.tagName === 'DIV') {
      const editor = await initJsonEditor('u_fieldJson', {
        mode: 'code',
        modes: ['code', 'tree'],
        initialValue: {}
      });
      // Add .value compatibility shim
      if (editor && fieldContainer) {
        Object.defineProperty(fieldContainer, 'value', {
          get() {
            try { return editor.getText(); } catch (e) { return ''; }
          },
          set(v) {
            try {
              if (typeof v === 'string') {
                if (!v.trim()) { editor.set({}); return; }
                editor.set(JSON.parse(v));
              } else {
                editor.set(v || {});
              }
            } catch (e) {
              try { editor.setText(String(v)); } catch (e2) { /* */ }
            }
          },
          configurable: true
        });
      }
    }
  } catch (e) {
    console.warn('JSONEditor (field) init skipped:', e.message);
  }
}
