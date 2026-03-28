'use strict';

import { TOOL_ID } from './constants.js';
import { state, ui as sharedUi } from './state.js';
import { stableStringify, selectedScopeKeys } from './utils.js';
import { buildRoot, copyTextToClipboard } from './ui/template.js';
import { setRootElement, setUiRefs, initDialogResizeHandling, initDialogDragHandling, fitDialogToViewport, saveCurrentDialogState } from './ui/dialog.js';
import { setComponentUi, setComponentDeps, setStatus, switchTab, renderScopeChips, renderIgnoreKeyChips, renderBundleState, renderReflectSidebar, renderReflectMainPanel, renderReflectNodeList, renderLookupMapRows } from './ui/components.js';
import { stringifyForDiff, renderRowColumns, buildDiffWarningInfo, renderResultRows, renderDiffFilterOptions, renderDiffSelectionState, renderDiffWarningBox, syncDiffThemeButton } from './diff/export.js';
import { commonParams, currentDiffSignature, restoreDialogState } from './tabs/diff.js';
import { parseLookupMapInput } from './tabs/field.js';
import { reflectRowModeById, reflectRowDesiredValue } from './reflect/rowMode.js';
import { runBackupTargetPreview, runDeployOnly, runApplyPreview } from './reflect/apply.js';
import { getActiveReflectRow, getSelectedReflectRows } from './tabs/reflect.js';
import { resolveApplyScopes } from './reflect/helpers.js';
import { makeApplyPlanSignature, runPreviewApplyPlan } from './reflect/plan.js';
import { scheduleGuidedTourLayout } from './ui/tour.js';
import { setupEventHandlers } from './handlers.js';

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
import { runApiTester } from './tabs/api-tester.js';

if (!window.kintone?.api || !window.kintone?.app) {
  alert('kintone画面で実行してください');
} else {
  const old = document.getElementById(TOOL_ID);
  if (old) old.remove();

  const root = buildRoot();
  document.body.appendChild(root);
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
    diffSearch: $('#u_diffSearch'),
    diffSearchFieldName: $('#u_diffSearchFieldName'),
    diffFilterSection: $('#u_diffFilterSection'),
    diffFilterType: $('#u_diffFilterType'),
    diffFilterSeverity: $('#u_diffFilterSeverity'),
    diffExportMode: $('#u_diffExportMode'),
    diffExportContent: $('#u_diffExportContent'),
    diffFavoritesOnlyBtn: $('#u_diffFavoritesOnlyBtn'),
    diffSelectionState: $('#u_diffSelectionState'),
    diffWarnThreshold: $('#u_diffWarnThreshold'),
    diffWarnBox: $('#u_diffWarnBox'),
    diffSuggestedIgnore: $('#u_diffSuggestedIgnore'),
    diffSnapshotList: $('#u_diffSnapshotList'),
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
    modeSectionBtn: $('#u_modeSectionBtn'),
    modeNodeBtn: $('#u_modeNodeBtn'),
    nodeFilterBlock: $('#u_nodeFilterBlock'),
    nodeSearch: $('#u_nodeSearch'),
    nodeFilterSection: $('#u_nodeFilterSection'),
    nodeFilterType: $('#u_nodeFilterType'),
    nodeFilterSeverity: $('#u_nodeFilterSeverity'),
    nodeWarn: $('#u_nodeWarn'),
    nodeControls: $('#u_nodeControls'),
    reflectNodeWorkbench: $('#u_reflectNodeWorkbench'),
    reflectNodeList: $('#u_reflectNodeList'),
    reflectNodeDetail: $('#u_reflectNodeDetail'),
    reflectAssist: $('#u_reflectAssist'),
    reflectOverview: $('#u_reflectOverview'),
    reflectMainTitle: $('#u_reflectMainTitle'),
    reflectOptionsCard: $('#u_reflectOptionsCard'),
    doDeploy: $('#u_doDeploy'),
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
    runPreviewApplyPlan,
    runBackupTargetPreview,
    runApplyPreview,
    runDeployOnly,
    renderCustomizeResult,
    renderTemplateOptions
  });

  setStatus('待機中');
}
