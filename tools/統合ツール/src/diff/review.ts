'use strict';

// 差分レビュー（Viewed / Note / Status）の純粋ロジック。
// `handlers.js` から切り出し、テスト容易性と再利用性を上げるためのモジュール。

import { state } from '../state.js';
import { kusPrompt } from '../utils.js';
import { diffViewedKey } from './export.js';
import { getRenderedDiffRows } from './filter.js';
import type { DiffRow } from './types.js';

export type DiffReviewAction = 'todo' | 'ignored' | 'note' | 'clear';

export interface DiffReviewMeta {
  status: '' | 'todo' | 'ignored';
  note: string;
}

export function getDiffRowByIdFromState(rowId: string): DiffRow | null {
  if (!rowId) return null;
  return (state.lastDiffRows || []).find((r: any) => r && r._id === rowId) || null;
}

export function toggleDiffViewedById(rowId: string, forced?: boolean): boolean {
  const row = getDiffRowByIdFromState(rowId);
  if (!row) return false;
  const key = diffViewedKey(row);
  if (!key) return false;
  const currentlyViewed = state.diffViewedKeys.has(key);
  const next = typeof forced === 'boolean' ? forced : !currentlyViewed;
  if (next) state.diffViewedKeys.add(key);
  else state.diffViewedKeys.delete(key);
  return next;
}

export function markVisibleDiffRowsViewed(): { marked: number; total: number } {
  const rendered = getRenderedDiffRows();
  let marked = 0;
  for (const row of rendered) {
    if (!row || row.type === 'same') continue;
    const key = diffViewedKey(row);
    if (!key || state.diffViewedKeys.has(key)) continue;
    state.diffViewedKeys.add(key);
    marked += 1;
  }
  return { marked, total: rendered.length };
}

export function clearAllDiffViewed(): number {
  const n = state.diffViewedKeys.size;
  state.diffViewedKeys = new Set();
  return n;
}

export function normalizeDiffReviewMetaStore(): Record<string, DiffReviewMeta> {
  if (!state.diffReviewMeta || typeof state.diffReviewMeta !== 'object' || Array.isArray(state.diffReviewMeta)) {
    state.diffReviewMeta = {};
  }
  return state.diffReviewMeta as Record<string, DiffReviewMeta>;
}

export function setDiffReviewMeta(rowId: string, action: DiffReviewAction): boolean {
  const row = getDiffRowByIdFromState(rowId);
  if (!row) return false;
  const key = diffViewedKey(row);
  if (!key) return false;
  const store = normalizeDiffReviewMetaStore();
  const existing = store[key];
  const cur: DiffReviewMeta = existing && typeof existing === 'object'
    ? { status: existing.status, note: existing.note }
    : { status: '', note: '' };
  if (action === 'todo') {
    cur.status = cur.status === 'todo' ? '' : 'todo';
  } else if (action === 'ignored') {
    cur.status = cur.status === 'ignored' ? '' : 'ignored';
  } else if (action === 'note') {
    const next = kusPrompt('この差分に残すメモを入力してください', String(cur.note || ''));
    if (next === null) return false;
    cur.note = String(next || '').trim().slice(0, 500);
  } else if (action === 'clear') {
    delete store[key];
    return true;
  } else {
    return false;
  }
  cur.status = cur.status === 'todo' || cur.status === 'ignored' ? cur.status : '';
  cur.note = String(cur.note || '').trim();
  if (!cur.status && !cur.note) delete store[key];
  else store[key] = { status: cur.status, note: cur.note };
  return true;
}
