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
  workHistory: [],
  workHistoryOpen: true,
  connectionPresets: [],
  reflectPlanPreviewKeyword: '',
  reflectPlanPreviewChangedOnly: false,
  reflectApplyChecklist: { diff: false, plan: false, target: false },
  lastPreviewBackupPayload: null,
  lastPreviewBackupFilename: '',
  diffViewTheme: 'light',
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
const WORK_HISTORY_KEY = `${TOOL_ID}:workHistory`;
const WORK_HISTORY_LIMIT = 20;
const CONNECTION_PRESETS_KEY = `${TOOL_ID}:connectionPresets`;
const CONNECTION_PRESETS_LIMIT = 30;

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

export function loadWorkHistory() {
  try {
    const raw = localStorage.getItem(WORK_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistWorkHistory(entries) {
  try {
    const list = Array.isArray(entries) ? entries.slice(0, WORK_HISTORY_LIMIT) : [];
    localStorage.setItem(WORK_HISTORY_KEY, JSON.stringify(list));
  } catch { /* noop */ }
}

export function pushWorkHistoryEntry(entry) {
  if (!entry || typeof entry !== 'object') return;
  const list = Array.isArray(state.workHistory) ? [...state.workHistory] : [];
  list.unshift(entry);
  const trimmed = list.slice(0, WORK_HISTORY_LIMIT);
  state.workHistory = trimmed;
  persistWorkHistory(trimmed);
}

export function deleteWorkHistoryEntry(id) {
  const next = (Array.isArray(state.workHistory) ? state.workHistory : []).filter((entry) => entry?.id !== id);
  state.workHistory = next;
  persistWorkHistory(next);
}

export function clearWorkHistory() {
  state.workHistory = [];
  persistWorkHistory([]);
}

function normalizeConnectionPreset(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const sourceAppId = String(entry.sourceAppId || '').trim();
  const targetAppId = String(entry.targetAppId || '').trim();
  if (!sourceAppId && !targetAppId) return null;
  const id = String(entry.id || '').trim() || `conn-${Date.now()}`;
  const name = String(entry.name || '').trim() || `${sourceAppId || '-'} -> ${targetAppId || '-'}`;
  return {
    id,
    name,
    sourceAppId,
    sourceGuestId: String(entry.sourceGuestId || '').trim(),
    sourcePreview: !!entry.sourcePreview,
    targetAppId,
    targetGuestId: String(entry.targetGuestId || '').trim(),
    targetPreview: entry.targetPreview == null ? true : !!entry.targetPreview,
    savedAt: Number(entry.savedAt || Date.now()) || Date.now()
  };
}

export function loadConnectionPresets() {
  try {
    const raw = localStorage.getItem(CONNECTION_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeConnectionPreset)
      .filter(Boolean)
      .slice(0, CONNECTION_PRESETS_LIMIT);
  } catch {
    return [];
  }
}

export function persistConnectionPresets(entries) {
  try {
    const list = Array.isArray(entries)
      ? entries.map(normalizeConnectionPreset).filter(Boolean).slice(0, CONNECTION_PRESETS_LIMIT)
      : [];
    localStorage.setItem(CONNECTION_PRESETS_KEY, JSON.stringify(list));
  } catch { /* noop */ }
}

export function upsertConnectionPreset(entry) {
  const normalized = normalizeConnectionPreset({ ...entry, savedAt: Date.now() });
  if (!normalized) return null;
  const current = Array.isArray(state.connectionPresets) ? state.connectionPresets : [];
  const existingIndex = current.findIndex((item) => item.id === normalized.id || item.name === normalized.name);
  const next = [
    normalized,
    ...current.filter((_item, idx) => idx !== existingIndex)
  ].slice(0, CONNECTION_PRESETS_LIMIT);
  state.connectionPresets = next;
  persistConnectionPresets(next);
  return normalized;
}

export function deleteConnectionPreset(id) {
  const presetId = String(id || '').trim();
  if (!presetId) return false;
  const next = (Array.isArray(state.connectionPresets) ? state.connectionPresets : [])
    .filter((entry) => entry?.id !== presetId);
  const changed = next.length !== (state.connectionPresets || []).length;
  state.connectionPresets = next;
  persistConnectionPresets(next);
  return changed;
}

state.reflectApplyHistory = loadReflectApplyHistory();
state.workHistory = loadWorkHistory();
state.connectionPresets = loadConnectionPresets();

export const ui = {};
