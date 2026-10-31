'use strict';

import { DEFAULT_SUBTAB_STATE, TOOL_ID } from './constants.js';
import type { KusUiRegistry } from './types/uiRefs.js';

export interface ConnectionPreset {
  id: string;
  name: string;
  sourceAppId: string;
  sourceGuestId: string;
  sourcePreview: boolean;
  targetAppId: string;
  targetGuestId: string;
  targetPreview: boolean;
  savedAt: number;
}

export interface ReflectApplyChecklist {
  diff: boolean;
  plan: boolean;
  preview: boolean;
  target: boolean;
}

export interface AppState {
  activeTab: string;
  activeFeatureKey: string;
  activeSubTabs: Record<string, string>;
  launcherSortMode: string;
  lastSourceBundle: any;
  lastTargetBundle: any;
  lastDiffRows: any[];
  lastFetchIssues: any[];
  lastPartialIssues: any[];
  lastDiffTruncation: any;
  lastDiffAt: string | number | null;
  lastDiffSignature: string;
  lastApplyPlan: any;
  lastApplyCompletedAt: string | number | null;
  lastApplyCompletedMode: string;
  lastApplyCompletedHadError: boolean;
  lastApplyCompletedAppId: string;
  lastApplyReport: any;
  reflectApplyHistory: any[];
  reflectApplyHistoryOpen: boolean;
  workHistory: any[];
  workHistoryOpen: boolean;
  connectionPresets: ConnectionPreset[];
  reflectPlanPreviewKeyword: string;
  reflectPlanPreviewChangedOnly: boolean;
  reflectApplyChecklist: ReflectApplyChecklist;
  reflectPreviewOpened: boolean;
  reflectPreviewOpenedFor: string;
  lastPreviewBackupPayload: any;
  lastPreviewBackupFilename: string;
  diffViewTheme: 'light' | 'dark';
  /** 差分結果の表示モード ('table' = 既存の行一覧 / 'category' = セクション別ビュー) */
  diffViewMode: 'table' | 'category';
  /** 'category' モード時に開いているカテゴリ (DIFF_CATEGORIES.key) */
  diffCategoryView: string;
  diffCollapsedSections: Set<string>;
  diffSectionVisibleCounts: Record<string, number>;
  diffSelectedIds: Set<string>;
  diffFavoritePaths: Set<string>;
  diffFavoritesOnly: boolean;
  diffViewedKeys: Set<string>;
  diffReviewMeta: Record<string, any>;
  diffHideViewed: boolean;
  diffFocusedRowId: string;
  diffExcludeSections: string[] | null;
  diffSelectionAnchorId: string;
  diffIncludeSame: boolean;
  diffFilterSection: string;
  diffFilterType: string;
  diffFilterSeverity: string;
  diffFilterTableOnly: boolean;
  diffFilterTableKeyword: string;
  diffSearchFieldName: boolean;
  diffExportMode: string;
  diffExportContent: string;
  diffIgnoreSuggestions: any[];
  reflectRows: any[];
  reflectSelectedIds: Set<string>;
  reflectNodeModes: Record<string, string>;
  reflectUndoStack: any[];
  reflectRedoStack: any[];
  reflectPropertyFilters: Set<string>;
  reflectPropertyPanelOpen: boolean;
  reflectActiveSidebarSection: string | null;
  reflectActiveNodeId: string;
  reflectDetailTab: string;
  importedSourceBundle: any;
  importedTargetBundle: any;
  importedSourceName: string;
  importedTargetName: string;
  /** 設定一括取得タブで取得したバンドル群を一時保持。差分タブへ「比較元/比較先として読込」する動線で参照する */
  lastSettingsExportBundles: any[];
  patchJsonPanelOpen: boolean;
  importedPatchPayload: any;
  // プレビュー vs 本番 差分結果（reflect/previewProdDiff.ts）
  reflectPreviewProdDiff: {
    lastResult: any;
    appId: string;
    guestId: string;
    runAt: string | number | null;
    filters: { section: string; type: string; severity: string; keyword: string };
  } | null;
  guidedTourActive: boolean;
  guidedTourIndex: number;
  running: boolean;
  runningStartedAt: number | null;
  runningTaskLabel: string;
  runningWatchdogId: any;
  lastResultByTab: Record<string, any>;
  // 追加項目: 各タブから動的に書き込まれるフィールド (loose)
  [key: string]: any;
}

export const state: AppState = {
  activeTab: 'reflect',
  activeFeatureKey: '',
  activeSubTabs: { ...DEFAULT_SUBTAB_STATE },
  launcherSortMode: 'onboarding',
  lastSourceBundle: null,
  lastTargetBundle: null,
  lastDiffRows: [],
  lastFetchIssues: [],
  lastPartialIssues: [],
  lastDiffTruncation: null,
  lastDiffAt: null,
  lastDiffSignature: '',
  lastApplyPlan: null,
  lastApplyCompletedAt: null,
  lastApplyCompletedMode: '',
  lastApplyCompletedHadError: false,
  lastApplyCompletedAppId: '',
  lastApplyReport: null,
  reflectApplyHistory: [],
  reflectApplyHistoryOpen: false,
  workHistory: [],
  workHistoryOpen: true,
  connectionPresets: [],
  reflectPlanPreviewKeyword: '',
  reflectPlanPreviewChangedOnly: false,
  reflectApplyChecklist: { diff: false, plan: false, preview: false, target: false },
  reflectPreviewOpened: false,
  reflectPreviewOpenedFor: '',
  lastPreviewBackupPayload: null,
  lastPreviewBackupFilename: '',
  diffViewTheme: 'light',
  diffViewMode: 'table',
  diffCategoryView: '',
  diffCollapsedSections: new Set(),
  diffSectionVisibleCounts: {},
  diffSelectedIds: new Set(),
  diffFavoritePaths: new Set(),
  diffFavoritesOnly: false,
  diffViewedKeys: new Set(),
  diffReviewMeta: {},
  diffHideViewed: false,
  diffFocusedRowId: '',
  diffExcludeSections: null,
  diffSelectionAnchorId: '',
  diffIncludeSame: true,
  diffFilterSection: '',
  diffFilterType: '',
  diffFilterSeverity: '',
  diffFilterTableOnly: false,
  diffFilterTableKeyword: '',
  diffSearchFieldName: false,
  diffExportMode: 'all',
  diffExportContent: 'diffOnly',
  diffIgnoreSuggestions: [],
  reflectRows: [],
  reflectSelectedIds: new Set(),
  reflectNodeModes: {},
  reflectUndoStack: [],
  reflectRedoStack: [],
  reflectPropertyFilters: new Set(),
  reflectPropertyPanelOpen: false,
  reflectActiveSidebarSection: null,
  reflectActiveNodeId: '',
  reflectDetailTab: 'diff',
  importedSourceBundle: null,
  importedTargetBundle: null,
  importedSourceName: '',
  importedTargetName: '',
  lastSettingsExportBundles: [],
  patchJsonPanelOpen: false,
  importedPatchPayload: null,
  reflectPreviewProdDiff: null,
  guidedTourActive: false,
  guidedTourIndex: 0,
  running: false,
  runningStartedAt: null,
  runningTaskLabel: '',
  runningWatchdogId: null,
  lastResultByTab: {}
};

export function loadDialogState(): Record<string, any> {
  return {};
}

export function saveDialogState(dialogState: Record<string, any> | null | undefined): void {
  void dialogState;
}

const REFLECT_APPLY_HISTORY_KEY = `${TOOL_ID}:reflectApplyHistory`;
const WORK_HISTORY_KEY = `${TOOL_ID}:workHistory`;
const CONNECTION_PRESETS_KEY = `${TOOL_ID}:connectionPresets`;

export function loadReflectApplyHistory(): any[] {
  return [];
}

export function loadWorkHistory(): any[] {
  return [];
}

export function loadConnectionPresets(): ConnectionPreset[] {
  return [];
}

state.reflectApplyHistory = loadReflectApplyHistory();
state.workHistory = loadWorkHistory();
state.connectionPresets = loadConnectionPresets();

// 起動前の空オブジェクトを KusUiRegistry として宣言する。
// boot.ts での Object.assign で全ての要素が埋まるため、利用側は non-null として扱える。
export const ui: KusUiRegistry = {} as KusUiRegistry;
