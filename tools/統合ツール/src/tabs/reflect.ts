'use strict';

import { SECTION_DEFS, REFLECT_PRESETS_KEY, REFLECT_QUICK_PRESETS, SYSTEM_FIELD_TYPES } from '../constants.js';
import { state, ui } from '../state.js';
import { esc, deepClone, normalize, downloadText, nowStamp, readTextFile, kusConfirm } from '../utils.js';
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
  state.reflectNodeModes = { ...(snapshot?.modes || ({} as any)) };
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

export function getActiveReflectRow(candidateIds?: string[] | null) {
  const rowId = ensureActiveReflectNodeId(candidateIds);
  return rowId ? getReflectRowById(rowId) : null;
}

export function setActiveReflectNode(rowId, options: any = {}) {
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
// Send a single diff row to the reflect queue
// ---------------------------------------------------------------------------

export function queueDiffRowForReflect(diffRowId, options: any = {}) {
  if (!diffRowId) throw new Error('対象の差分行が指定されていません');
  const diffRow = (state.lastDiffRows || []).find((r) => r && r._id === diffRowId);
  if (!diffRow) throw new Error('対応する差分行が見つかりませんでした（差分比較を再実行してください）');
  const putKeys = new Set(SECTION_DEFS.filter((d) => d.put).map((d) => d.key));
  if (!putKeys.has(diffRow.sectionKey)) {
    throw new Error(`このセクション「${SECTION_DEFS.find((d) => d.key === diffRow.sectionKey)?.label || diffRow.sectionKey || '-'}」は反映に対応していません`);
  }
  if (!state.reflectRows || !state.reflectRows.length) {
    loadReflectRowsFromLastDiff();
  }
  const match = (state.reflectRows || []).find((row) =>
    row && row.sectionKey === diffRow.sectionKey
    && String(row.path || '') === String(diffRow.path || '')
    && row.type === diffRow.type
  );
  if (!match) {
    throw new Error('反映候補に同じノードが見つかりませんでした。差分の再実行後にもう一度お試しください');
  }
  pushReflectUndo();
  state.reflectSelectedIds.add(match._id);
  state.reflectNodeModes[match._id] = options.mode === 'tgt' ? 'tgt' : 'src';
  state.reflectActiveNodeId = match._id;
  return { reflectRowId: match._id, section: diffRow.sectionKey };
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

const BULK_MODE_CONFIRM_THRESHOLD = 5;

function sectionBreakdownForRows(rows) {
  const counts = new Map();
  for (const r of rows) {
    const key = r?.sectionKey || '';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, n]) => {
      const label = SECTION_DEFS.find((d) => d.key === key)?.label || key || '(未分類)';
      return `${label}: ${n}件`;
    });
}

function confirmBulkModeChange({ mode, scopeLabel, rows, changeCount }) {
  if (changeCount < BULK_MODE_CONFIRM_THRESHOLD) return true;
  const modeLabel = mode === 'src' ? '比較元を採用' : '比較先を残す';
  const breakdown = sectionBreakdownForRows(rows).slice(0, 8).join('\n  - ');
  const msg = `【一括モード変更の確認】\n\n対象: ${scopeLabel}（${rows.length}件 / 変更予定 ${changeCount}件）\n操作: ${modeLabel}\n\n影響セクション:\n  - ${breakdown}\n\nこの操作はUndo（元に戻す）で取り消せます。実行しますか？`;
  return kusConfirm(msg);
}

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
  const changeCandidates = selected.filter((r) => state.reflectNodeModes[r._id] !== mode);
  if (!confirmBulkModeChange({
    mode,
    scopeLabel: '選択中ノード',
    rows: selected,
    changeCount: changeCandidates.length
  })) {
    setStatus('一括モード変更をキャンセルしました');
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
  setStatus(`選択中ノード(${selected.length}件)のうち、${count}件を ${mode === 'src' ? '比較元' : '比較先'} に一括変更しました（元に戻すで取消可）`);
}

export function runReflectModeVisible(mode) {
  if (!state.reflectRows.length) {
    setStatus('反映ノードが読込されていません');
    return;
  }
  const visibleIds = [...(ui.reflectNodeList?.querySelectorAll<HTMLElement>('[data-node-open]') || [])]
    .map((el) => el.dataset.nodeOpen)
    .filter((id): id is string => !!id);
  if (!visibleIds.length) {
    setStatus('表示中ノードがありません（絞り込み条件を見直してください）');
    return;
  }
  const visibleRows = visibleIds
    .map((id) => getReflectRowById(id))
    .filter(Boolean);
  const changeCandidates = visibleRows.filter((r) => state.reflectNodeModes[r._id] !== mode);
  if (!confirmBulkModeChange({
    mode,
    scopeLabel: '表示中ノード',
    rows: visibleRows,
    changeCount: changeCandidates.length
  })) {
    setStatus('一括モード変更をキャンセルしました');
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
  setStatus(`表示中ノード(${visibleIds.length}件)のうち、${count}件を ${mode === 'src' ? '比較元' : '比較先'} に変更しました（元に戻すで取消可）`);
}

// ---------------------------------------------------------------------------
// Effective reflect scope info
// ---------------------------------------------------------------------------

export function getEffectiveReflectScopeInfo() {
  const baseScopes = ui.applyScopes ? selectedScopeKeys(ui.applyScopes) : [];
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

  const sourceErr = Object.values(source.sections || ({} as any)).filter((x: any) => x && x._fetchError).length;
  const targetErr = Object.values(target.sections || ({} as any)).filter((x: any) => x && x._fetchError).length;
  setStatus(`共通データ取得完了: 比較元 ${sections.length}セクション(NG ${sourceErr}) / 比較先 ${sections.length}セクション(NG ${targetErr})`);
}

// ---------------------------------------------------------------------------
// Reflect presets (environment profile x section scope)
// ---------------------------------------------------------------------------

export function loadReflectPresets() {
  try {
    const raw = localStorage.getItem(REFLECT_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function persistReflectPresets(presets) {
  try {
    localStorage.setItem(REFLECT_PRESETS_KEY, JSON.stringify(presets || []));
  } catch (e) {
    /* localStorage full */
  }
}

export function saveReflectPreset(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('プリセット名を入力してください');
  const scopes = [...(ui.applyScopes?.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked') || [])]
    .map((el) => el.value)
    .filter(Boolean);
  const preset = {
    name: trimmed,
    createdAt: new Date().toISOString(),
    source: {
      appId: String(ui.sourceApp?.value || '').trim(),
      guestId: String(ui.sourceGuest?.value || '').trim(),
      preview: !!ui.sourcePreview?.checked
    },
    target: {
      appId: String(ui.targetApp?.value || '').trim(),
      guestId: String(ui.targetGuest?.value || '').trim(),
      preview: !!ui.targetPreview?.checked
    },
    scopes,
    applyDiffOnly: !!ui.applyDiffOnly?.checked,
    lookupMap: String(ui.lookupMap?.value || '').trim()
  };
  const presets = loadReflectPresets().filter((p) => p && p.name !== trimmed);
  presets.unshift(preset);
  persistReflectPresets(presets.slice(0, 30));
  return preset;
}

export function applyReflectPreset(name) {
  const preset = loadReflectPresets().find((p) => p && p.name === name);
  if (!preset) throw new Error(`プリセット「${name}」が見つかりません`);
  if (ui.sourceApp) ui.sourceApp.value = preset.source?.appId || '';
  if (ui.sourceGuest) ui.sourceGuest.value = preset.source?.guestId || '';
  if (ui.sourcePreview) ui.sourcePreview.checked = !!preset.source?.preview;
  if (ui.targetApp) ui.targetApp.value = preset.target?.appId || '';
  if (ui.targetGuest) ui.targetGuest.value = preset.target?.guestId || '';
  if (ui.targetPreview) ui.targetPreview.checked = !!preset.target?.preview;
  if (ui.applyDiffOnly) ui.applyDiffOnly.checked = !!preset.applyDiffOnly;
  if (ui.lookupMap) ui.lookupMap.value = preset.lookupMap || '';
  const wantedScopes = new Set(preset.scopes || []);
  ui.applyScopes?.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((el) => {
    el.checked = wantedScopes.has(el.value);
  });
  saveCurrentDialogState();
  return preset;
}

export function deleteReflectPreset(name) {
  const presets = loadReflectPresets().filter((p) => p && p.name !== name);
  persistReflectPresets(presets);
}

// ---------------------------------------------------------------------------
// Reflect selection export / import
// ---------------------------------------------------------------------------

export function exportReflectSelectionJson() {
  const rows = state.reflectRows || [];
  if (!rows.length) throw new Error('反映候補がありません。先に「差分候補を読込」を実行してください');
  const selected = rows.filter((r) => state.reflectSelectedIds.has(r._id));
  if (!selected.length) throw new Error('選択中のノードがありません');
  const payload = {
    kind: 'reflect-selection',
    exportedAt: new Date().toISOString(),
    target: {
      appId: String(ui.targetApp?.value || '').trim(),
      guestId: String(ui.targetGuest?.value || '').trim()
    },
    source: {
      appId: String(ui.sourceApp?.value || '').trim(),
      guestId: String(ui.sourceGuest?.value || '').trim()
    },
    total: rows.length,
    selectedCount: selected.length,
    items: selected.map((r) => ({
      sectionKey: r.sectionKey || '',
      path: r.path || '',
      type: r.type || '',
      mode: state.reflectNodeModes[r._id] || 'src'
    }))
  };
  const filename = `reflect_selection_${nowStamp()}.json`;
  downloadText(filename, JSON.stringify(payload, null, 2), 'application/json');
  return { filename, selectedCount: selected.length };
}

export async function importReflectSelectionFromFile(file) {
  if (!file) throw new Error('ファイルが選択されていません');
  const text = await readTextFile(file);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('選択JSONの読み込みに失敗しました（JSON形式が不正です）');
  }
  if (!parsed || parsed.kind !== 'reflect-selection' || !Array.isArray(parsed.items)) {
    throw new Error('この形式は選択JSONとして認識できません（kind="reflect-selection" を想定）');
  }
  if (!state.reflectRows || !state.reflectRows.length) {
    loadReflectRowsFromLastDiff();
  }
  const indexMap = new Map();
  for (const row of state.reflectRows || []) {
    const key = `${row.sectionKey || ''}\t${row.path || ''}\t${row.type || ''}`;
    indexMap.set(key, row);
  }
  pushReflectUndo();
  let matched = 0;
  let missed = 0;
  for (const item of parsed.items || []) {
    const key = `${item.sectionKey || ''}\t${item.path || ''}\t${item.type || ''}`;
    const row = indexMap.get(key);
    if (!row) { missed += 1; continue; }
    state.reflectSelectedIds.add(row._id);
    state.reflectNodeModes[row._id] = item.mode === 'tgt' ? 'tgt' : 'src';
    matched += 1;
  }
  return { matched, missed, total: (parsed.items || []).length };
}

// ---------------------------------------------------------------------------
// Quick selection presets (差分ノードモード向け、ワンクリックでまとめて選択)
// ---------------------------------------------------------------------------

export function getReflectQuickPresets() {
  return REFLECT_QUICK_PRESETS.map((p) => ({ ...p }));
}

function isSystemFieldRow(row) {
  if (!row || row.sectionKey !== 'fieldSettings') return false;
  const candidates = [row.right, row.left];
  for (const v of candidates) {
    if (v && typeof v === 'object' && typeof v.type === 'string' && SYSTEM_FIELD_TYPES.has(v.type)) {
      return true;
    }
  }
  return false;
}

export function applyReflectQuickPreset(presetId) {
  const preset = REFLECT_QUICK_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`クイックプリセット「${presetId}」が見つかりません`);
  if (!state.reflectRows.length) loadReflectRowsFromLastDiff();
  if (!state.reflectRows.length) throw new Error('差分候補が空のためプリセットを適用できません');
  pushReflectUndo();
  const rows = state.reflectRows;
  const includeSections = preset.sections ? new Set(preset.sections) : null;
  const excludeSections = preset.excludeSections ? new Set(preset.excludeSections) : null;
  const severities = preset.severities ? new Set(preset.severities.map((s) => String(s).toLowerCase())) : null;
  const types = preset.types ? new Set(preset.types) : null;

  const matchedIds = new Set<string>();
  let keptSelection = false;

  if (preset.keepSelection) {
    // Keep current selection as-is, only switch mode.
    keptSelection = true;
    for (const id of state.reflectSelectedIds) matchedIds.add(id);
  } else {
    for (const row of rows) {
      if (!row || !row._id) continue;
      if (includeSections && !includeSections.has(row.sectionKey)) continue;
      if (excludeSections && excludeSections.has(row.sectionKey)) continue;
      if (severities && !severities.has(String(row.severity || 'low').toLowerCase())) continue;
      if (types && !types.has(row.type)) continue;
      if (preset.excludeSystemFields && isSystemFieldRow(row)) continue;
      matchedIds.add(row._id);
    }
  }

  if (!keptSelection) {
    state.reflectSelectedIds = matchedIds;
  }
  const mode = preset.mode === 'tgt' ? 'tgt' : 'src';
  const modeTarget = preset.keepSelection ? state.reflectSelectedIds : matchedIds;
  for (const id of modeTarget) {
    state.reflectNodeModes[id] = mode;
  }

  return {
    id: preset.id,
    label: preset.label,
    mode,
    selectedCount: state.reflectSelectedIds.size,
    matchedCount: matchedIds.size,
    total: rows.length
  };
}
