'use strict';

import { SECTION_DEFS } from '../constants.js';
import { state, ui } from '../state.js';
import { esc, deepClone, normalize } from '../utils.js';
import { apiGet, fetchBundle, buildApiPrefix } from '../api.js';
import {
  getActualDiffRows,
  countActualDiffRows,
  getDiffNormalizationPresetState
} from '../diff/engine.js';
import { summarizeSeverity } from '../diff/enrich.js';
import { selectedScopeKeys } from '../utils.js';
import {
  setStatus,
  renderReflectNodeList,
  renderReflectMainPanel,
  renderReflectNodeDetail,
  renderBundleState,
  renderReflectModeUi,
  renderReflectAssistPanel,
  renderReflectSidebar
} from '../ui/components.js';
import { renderResultRows, renderDiffFilterOptions } from '../diff/export.js';
import { commonParams, saveCurrentDialogState, currentDiffSignature } from './diff.js';
import { getPreviewCompareStatusPrefix } from './preview-compare.js';
import { isReflectNodeModeEffective } from '../reflect/nodeModeUi.js';

// ---------------------------------------------------------------------------
// Reflect state snapshot / undo / redo
// ---------------------------------------------------------------------------

export function snapshotReflectState() {
  return {
    selectedIds: [...state.reflectSelectedIds],
    modes: { ...state.reflectNodeModes }
  };
}

export function restoreReflectState(snapshot) {
  state.reflectSelectedIds = new Set(snapshot?.selectedIds || []);
  state.reflectNodeModes = { ...(snapshot?.modes || {}) };
}

export function pushReflectUndo() {
  state.reflectUndoStack.push(snapshotReflectState());
  if (state.reflectUndoStack.length > 50) state.reflectUndoStack.shift();
  state.reflectRedoStack = [];
}

export function undoReflectState() {
  if (!state.reflectUndoStack.length) return false;
  state.reflectRedoStack.push(snapshotReflectState());
  restoreReflectState(state.reflectUndoStack.pop());
  return true;
}

export function redoReflectState() {
  if (!state.reflectRedoStack.length) return false;
  state.reflectUndoStack.push(snapshotReflectState());
  restoreReflectState(state.reflectRedoStack.pop());
  return true;
}

// ---------------------------------------------------------------------------
// Reflect row mode helpers（実体は reflect/rowMode.js）
// ---------------------------------------------------------------------------

export { reflectRowModeById, reflectRowDesiredValue } from '../reflect/rowMode.js';

export function getReflectRowById(rowId) {
  return (state.reflectRows || []).find((row) => row && row._id === rowId) || null;
}

export function ensureActiveReflectNodeId(candidateIds) {
  const rows = state.reflectRows || [];
  if (!rows.length) {
    state.reflectActiveNodeId = '';
    return '';
  }
  const candidateSet = Array.isArray(candidateIds) && candidateIds.length ? new Set(candidateIds) : null;
  const current = getReflectRowById(state.reflectActiveNodeId);
  if (current && (!candidateSet || candidateSet.has(current._id))) return current._id;

  const selectedRow = rows.find((row) => state.reflectSelectedIds.has(row._id) && (!candidateSet || candidateSet.has(row._id)));
  if (selectedRow) {
    state.reflectActiveNodeId = selectedRow._id;
    return selectedRow._id;
  }
  const fallbackRow = rows.find((row) => !candidateSet || candidateSet.has(row._id)) || rows[0];
  state.reflectActiveNodeId = fallbackRow?._id || '';
  return state.reflectActiveNodeId;
}

export function getActiveReflectRow(candidateIds) {
  const rowId = ensureActiveReflectNodeId(candidateIds);
  return rowId ? getReflectRowById(rowId) : null;
}

export function setActiveReflectNode(rowId, options = {}) {
  if (!rowId || !getReflectRowById(rowId)) return;
  state.reflectActiveNodeId = rowId;
  if (options.persist !== false) saveCurrentDialogState();
}

// ---------------------------------------------------------------------------
// Load reflect rows from last diff
// ---------------------------------------------------------------------------

export function loadReflectRowsFromLastDiff() {
  if (!state.lastDiffRows.length) throw new Error('先に差分比較を実行してください');
  const putKeys = new Set(SECTION_DEFS.filter((d) => d.put).map((d) => d.key));
  const rows = getActualDiffRows(state.lastDiffRows)
    .filter((r) => putKeys.has(r.sectionKey))
    .map((r, idx) => ({ ...r, _id: `n${idx}` }));
  state.reflectRows = rows;
  state.reflectSelectedIds = new Set(rows.map((r) => r._id));
  state.reflectNodeModes = {};
  rows.forEach((r) => { state.reflectNodeModes[r._id] = 'src'; });
  state.reflectUndoStack = [];
  state.reflectRedoStack = [];
  state.reflectPropertyFilters = new Set();
  state.reflectActiveNodeId = rows[0]?._id || '';
  if (ui.nodeFilterSection) {
    const sections = [...new Set(rows.map((r) => r.sectionKey).filter(Boolean))];
    ui.nodeFilterSection.innerHTML = '<option value="">全セクション</option>' +
      sections.map((k) => {
        const label = SECTION_DEFS.find((d) => d.key === k)?.label || k;
        return `<option value="${esc(k)}">${esc(label)}</option>`;
      }).join('');
  }
  renderReflectNodeList();
  renderReflectMainPanel();
  setStatus(`差分ノードを読込: ${rows.length}件`);
}

// ---------------------------------------------------------------------------
// Get selected reflect rows
// ---------------------------------------------------------------------------

export function getSelectedReflectRows() {
  const selected = state.reflectSelectedIds || new Set();
  return (state.reflectRows || []).filter((r) => selected.has(r._id));
}

// ---------------------------------------------------------------------------
// Reflect mode all
// ---------------------------------------------------------------------------

export function runReflectModeAll(mode) {
  if (!state.reflectRows.length) {
    setStatus('反映ノードが読込されていません');
    return;
  }
  const selected = getSelectedReflectRows();
  if (!selected.length) {
    setStatus('ノードが選択されていません');
    return;
  }
  pushReflectUndo();
  let count = 0;
  for (const r of selected) {
    if (state.reflectNodeModes[r._id] !== mode) {
      state.reflectNodeModes[r._id] = mode;
      count++;
    }
  }
  renderReflectNodeList();
  setStatus(`選択中ノード(${selected.length}件)のうち、${count}件を ${mode === 'src' ? '比較元' : '比較先'} に一括変更しました`);
}

export function runReflectModeVisible(mode) {
  if (!state.reflectRows.length) {
    setStatus('反映ノードが読込されていません');
    return;
  }
  const visibleIds = [...(ui.reflectNodeList?.querySelectorAll('[data-node-open]') || [])]
    .map((el) => el.dataset.nodeOpen)
    .filter(Boolean);
  if (!visibleIds.length) {
    setStatus('表示中ノードがありません（絞り込み条件を見直してください）');
    return;
  }
  pushReflectUndo();
  let count = 0;
  visibleIds.forEach((id) => {
    if (state.reflectNodeModes[id] !== mode) {
      state.reflectNodeModes[id] = mode;
      count += 1;
    }
  });
  renderReflectNodeList();
  setStatus(`表示中ノード(${visibleIds.length}件)のうち、${count}件を ${mode === 'src' ? '比較元' : '比較先'} に変更しました`);
}

// ---------------------------------------------------------------------------
// Effective reflect scope info
// ---------------------------------------------------------------------------

export function getEffectiveReflectScopeInfo() {
  const baseScopes = selectedScopeKeys(ui.applyScopes);
  if (isReflectNodeModeEffective()) {
    return { baseScopes, effectiveScopes: [...baseScopes], warning: '' };
  }
  try {
    const { resolveApplyScopes } = require('./diff.js');
    return {
      baseScopes,
      effectiveScopes: resolveApplyScopes(baseScopes),
      warning: ''
    };
  } catch (e) {
    return {
      baseScopes,
      effectiveScopes: [...baseScopes],
      warning: e.message || String(e)
    };
  }
}

// ---------------------------------------------------------------------------
// Diff counts by section
// ---------------------------------------------------------------------------

export function getDiffCountsBySection() {
  const counts = {};
  for (const row of getActualDiffRows(state.lastDiffRows || [])) {
    const key = row.sectionKey || '';
    if (!key) continue;
    if (!counts[key]) counts[key] = { total: 0, added: 0, removed: 0, changed: 0 };
    counts[key].total++;
    if (row.type === 'added') counts[key].added++;
    else if (row.type === 'removed') counts[key].removed++;
    else if (row.type === 'changed') counts[key].changed++;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Prefetch common data
// ---------------------------------------------------------------------------

export async function runPrefetchCommonData() {
  const c = commonParams();
  if (!c.source.appId) throw new Error('比較元アプリIDを入力してください');
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  const sections = SECTION_DEFS.map((d) => d.key);
  const modeTag = getPreviewCompareStatusPrefix(ui);

  setStatus(`${modeTag} 共通データ取得: 比較元...`);
  const source = await fetchBundle({
    ...c.source,
    sections,
    onProgress: (p, l) => setStatus(`${modeTag} 共通データ取得 比較元 ${Math.round(p * 100)}% (${l})`)
  });
  setStatus(`${modeTag} 共通データ取得: 比較先...`);
  const target = await fetchBundle({
    ...c.target,
    sections,
    onProgress: (p, l) => setStatus(`${modeTag} 共通データ取得 比較先 ${Math.round(p * 100)}% (${l})`)
  });

  state.lastSourceBundle = source;
  state.lastTargetBundle = target;
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
  state.reflectPropertyFilters = new Set();
  state.reflectActiveNodeId = '';
  renderResultRows([]);
  renderDiffFilterOptions();
  renderReflectNodeList();
  renderBundleState();
  renderReflectSidebar();
  renderReflectMainPanel();

  const sourceErr = Object.values(source.sections || {}).filter((x) => x && x._fetchError).length;
  const targetErr = Object.values(target.sections || {}).filter((x) => x && x._fetchError).length;
  setStatus(`共通データ取得完了: 比較元 ${sections.length}セクション(NG ${sourceErr}) / 比較先 ${sections.length}セクション(NG ${targetErr})`);
}
