'use strict';

import { DIALOG_STATE_KEY, DEFAULT_SUBTAB_STATE } from './constants.js';

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
  lastPreviewBackupPayload: null,
  lastPreviewBackupFilename: '',
  diffViewTheme: 'light',
  diffCollapsedSections: new Set(),
  diffSectionVisibleCounts: {},
  diffSelectedIds: new Set(),
  diffFavoritePaths: new Set(),
  diffFavoritesOnly: false,
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

export const ui = {};
