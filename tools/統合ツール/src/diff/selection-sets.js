'use strict';

import { DIFF_SELECTION_SETS_KEY } from '../constants.js';
import { state, ui } from '../state.js';
import { currentDiffSignature } from '../tabs/diff.js';
import { renderResultRows } from './export.js';

const MAX_SETS = 24;

function loadRaw() {
  try {
    const raw = JSON.parse(localStorage.getItem(DIFF_SELECTION_SETS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveRaw(list) {
  try {
    localStorage.setItem(DIFF_SELECTION_SETS_KEY, JSON.stringify(list.slice(0, MAX_SETS)));
  } catch { /* ignore */ }
}

export function listDiffSelectionSets() {
  return loadRaw();
}

export function refreshDiffSelectionSetDropdown() {
  const sel = ui.diffSelectionSetSelect;
  if (!sel) return;
  const sets = loadRaw();
  const cur = sel.value;
  const curSig = currentDiffSignature();
  sel.innerHTML = '<option value="">-- 読込 --</option>' +
    sets.map((s) => {
      const bad = s.signature && s.signature !== curSig;
      return `<option value="${escapeAttr(s.name)}">${escapeAttr(s.name)}${bad ? ' (条件不一致)' : ''}</option>`;
    }).join('');
  if (sets.some((s) => s.name === cur)) sel.value = cur;
}

function escapeAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export function saveDiffSelectionSet(name) {
  const n = String(name || '').trim();
  if (!n) throw new Error('セット名を入力してください');
  const sig = currentDiffSignature();
  const ids = [...(state.diffSelectedIds || [])];
  const list = loadRaw().filter((x) => x.name !== n);
  list.unshift({
    name: n,
    signature: sig,
    ids,
    savedAt: Date.now()
  });
  saveRaw(list);
  refreshDiffSelectionSetDropdown();
  if (ui.diffSelectionSetSelect) ui.diffSelectionSetSelect.value = n;
}

export function loadDiffSelectionSet(name) {
  const n = String(name || '').trim();
  if (!n) return false;
  const row = loadRaw().find((x) => x.name === n);
  if (!row || !Array.isArray(row.ids)) return false;
  const curSig = currentDiffSignature();
  const mismatch = row.signature && row.signature !== curSig;
  state.diffSelectedIds = new Set(row.ids.filter((id) => (state.lastDiffRows || []).some((r) => r._id === id)));
  renderResultRows(state.lastDiffRows || []);
  return { ok: true, mismatch, restored: state.diffSelectedIds.size, requested: row.ids.length };
}

export function deleteDiffSelectionSet(name) {
  const n = String(name || '').trim();
  if (!n) return;
  saveRaw(loadRaw().filter((x) => x.name !== n));
  refreshDiffSelectionSetDropdown();
}
