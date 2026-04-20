'use strict';

import { DIALOG_STATE_KEY, DEFAULT_SUBTAB_STATE, TOOL_ID } from './constants.js';

export const state = {
  activeTab: 'reflect',
  activeFeatureKey: '',
  activeSubTabs: { ...DEFAULT_SUBTAB_STATE },
  launcherSortMode: 'onboarding',
  lastSourceBundle: null,
  lastTargetBundle: null,
  lastDiffRows: [],
  lastFetchIssues: [],
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
  reflectPlanPreviewKeyword: '',
  reflectPlanPreviewChangedOnly: false,
  lastPreviewBackupPayload: null,
  lastPreviewBackupFilename: '',
  diffViewTheme: 'light',
  diffCollapsedSections: new Set(),
  diffSectionVisibleCounts: {},
  diffSelectedIds: new Set(),
  diffFavoritePaths: new Set(),
  diffFavoritesOnly: false,
  diffViewedKeys: new Set(),
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
  patchJsonPanelOpen: false,
  importedPatchPayload: null,
  guidedTourActive: false,
  guidedTourIndex: 0,
  running: false
};

export function loadDialogState() {
  try { return JSON.parse(localStorage.getItem(DIALOG_STATE_KEY) || '{}'); }
  catch { return {}; }
}

export function saveDialogState(dialogState) {
  try { localStorage.setItem(DIALOG_STATE_KEY, JSON.stringify(dialogState || {})); }
  catch { /* noop */ }
}

const REFLECT_APPLY_HISTORY_KEY = `${TOOL_ID}:reflectApplyHistory`;
const REFLECT_APPLY_HISTORY_LIMIT = 30;

export function loadReflectApplyHistory() {
  try {
    const raw = sessionStorage.getItem(REFLECT_APPLY_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistReflectApplyHistory(entries) {
  try {
    const list = Array.isArray(entries) ? entries.slice(0, REFLECT_APPLY_HISTORY_LIMIT) : [];
    sessionStorage.setItem(REFLECT_APPLY_HISTORY_KEY, JSON.stringify(list));
  } catch { /* noop */ }
}

export function pushReflectApplyHistoryEntry(entry) {
  if (!entry || typeof entry !== 'object') return;
  const list = Array.isArray(state.reflectApplyHistory) ? [...state.reflectApplyHistory] : [];
  list.unshift(entry);
  const trimmed = list.slice(0, REFLECT_APPLY_HISTORY_LIMIT);
  state.reflectApplyHistory = trimmed;
  persistReflectApplyHistory(trimmed);
}

export function clearReflectApplyHistory() {
  state.reflectApplyHistory = [];
  persistReflectApplyHistory([]);
}

state.reflectApplyHistory = loadReflectApplyHistory();

export const ui = {};
