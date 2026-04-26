'use strict';

/**
 * 差分行のフォーカス管理（j/k 移動・行ハイライト）。
 * handlers.ts の常駐ヘルパーとして使われていたが、状態と DOM 操作を分離して
 * テスト可能にするためモジュール化。
 */

import { state } from '../state.js';
import { getToolDocument } from '../ui/dialog.js';

export interface FocusDiffRowOptions {
  scroll?: boolean;
  focus?: boolean;
}

export function focusDiffRow(rowId: string, options: FocusDiffRowOptions = {}): boolean {
  if (!rowId) return false;
  state.diffFocusedRowId = rowId;
  const res = getToolDocument().getElementById('u_result');
  if (!res) return false;
  const tr = res.querySelector(`[data-diff-row-tr="${rowId.replace(/"/g, '\\"')}"]`);
  if (!tr) return false;
  // 行内の選択チェックボックスへフォーカスを移し、キーボード継続性を担保。
  const selectBox = tr.querySelector('input[type=checkbox][data-diff-row-id]') as HTMLInputElement | null;
  try {
    if (selectBox && options.focus !== false) selectBox.focus({ preventScroll: true });
  } catch (e) { /* ignore */ }
  if (options.scroll !== false) {
    try { tr.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* ignore */ }
  }
  // 全行再描画なしでフォーカスクラスのみ更新。
  res.querySelectorAll('.diff-row-focused').forEach((el) => { if (el !== tr) el.classList.remove('diff-row-focused'); });
  tr.classList.add('diff-row-focused');
  return true;
}

export function focusNextDiffRow(direction: number): boolean {
  const res = getToolDocument().getElementById('u_result');
  if (!res) return false;
  const trs = [...res.querySelectorAll('[data-diff-row-tr]')];
  if (!trs.length) return false;
  const ids = trs.map((el) => el.getAttribute('data-diff-row-tr') || '');
  const curIdx = state.diffFocusedRowId ? ids.indexOf(state.diffFocusedRowId) : -1;
  let nextIdx: number;
  if (curIdx === -1) {
    nextIdx = direction > 0 ? 0 : ids.length - 1;
  } else {
    nextIdx = curIdx + direction;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= ids.length) nextIdx = ids.length - 1;
  }
  return focusDiffRow(ids[nextIdx]);
}

export function parseIdSet(text: string): string[] {
  return [...new Set(String(text || '').split(/[\s,]+/).map((v) => v.trim()).filter((v) => /^\d+$/.test(v)))];
}

export function normalizeDiffFavoritePath(path: string): string {
  return String(path || '').trim();
}

export function extractAppIdFromInput(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d+$/.test(raw)) return raw;
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch (e) { /* ignore malformed URI */ }
  const queryMatch = decoded.match(/[?&]app=(\d+)(?:[&#]|$)/i);
  if (queryMatch) return queryMatch[1];
  const guestPathMatch = decoded.match(/\/k\/guest\/\d+\/(\d+)(?:[/?#]|$)/i);
  if (guestPathMatch) return guestPathMatch[1];
  const pathMatch = decoded.match(/\/k\/(\d+)(?:[/?#]|$)/i);
  if (pathMatch) return pathMatch[1];
  return '';
}

export function extractGuestIdFromInput(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch (e) { /* ignore malformed URI */ }
  const guestPathMatch = decoded.match(/\/k\/guest\/(\d+)(?:\/|[?#]|$)/i);
  return guestPathMatch ? guestPathMatch[1] : '';
}
