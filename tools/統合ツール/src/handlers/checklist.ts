'use strict';

/**
 * 反映前チェックリスト（差分比較済み / プラン確認済み / 反映先=プレビュー）の
 * 状態管理と DOM 反映ロジック。
 *
 * 元は handlers.ts に同居していたが、自己完結度が高く `setupEventHandlers` 外で
 * テスト・再利用しやすいため独立モジュールに切り出した。
 */

import { state, ui } from '../state.js';
import { setStatus, renderReflectAssistPanel } from '../ui/components.js';
import { getToolDocument } from '../ui/dialog.js';
import { saveCurrentDialogState } from '../tabs/diff.js';

export interface ReflectApplyCheckItem {
  key: string;
  label: string;
}

export const REFLECT_APPLY_CHECKS: ReflectApplyCheckItem[] = [
  { key: 'diff', label: '差分比較済み' },
  { key: 'plan', label: '実行前プラン確認済み' },
  { key: 'target', label: '反映先は比較先プレビュー' }
];

export function normalizeReflectApplyChecklist(): Record<string, boolean> {
  if (!state.reflectApplyChecklist || typeof state.reflectApplyChecklist !== 'object' || Array.isArray(state.reflectApplyChecklist)) {
    state.reflectApplyChecklist = { diff: false, plan: false, target: false };
  }
  REFLECT_APPLY_CHECKS.forEach((item) => {
    (state.reflectApplyChecklist as any)[item.key] = !!(state.reflectApplyChecklist as any)[item.key];
  });
  return state.reflectApplyChecklist as any;
}

export function renderReflectApplyChecklistStatus(): void {
  const store = normalizeReflectApplyChecklist();
  const doc = getToolDocument();
  const boxes = [...doc.querySelectorAll<HTMLInputElement>('[data-reflect-apply-check]')];
  boxes.forEach((box) => {
    const key = box.dataset.reflectApplyCheck || '';
    const checked = !!store[key];
    box.checked = checked;
    (box.closest('.reflect-apply-check') as HTMLElement | null)?.classList.toggle('is-checked', checked);
  });
  const done = REFLECT_APPLY_CHECKS.filter((item) => !!store[item.key]).length;
  if (ui.reflectChecklistStatus) ui.reflectChecklistStatus.textContent = `${done} / ${REFLECT_APPLY_CHECKS.length}`;
  if (ui.reflectApplyChecklist) ui.reflectApplyChecklist.classList.toggle('is-complete', done === REFLECT_APPLY_CHECKS.length);
}

export function setReflectApplyCheck(key: string, checked: boolean, options: { persist?: boolean } = {}): boolean {
  const item = REFLECT_APPLY_CHECKS.find((entry) => entry.key === key);
  if (!item) return false;
  normalizeReflectApplyChecklist()[item.key] = !!checked;
  renderReflectApplyChecklistStatus();
  renderReflectAssistPanel();
  if (options.persist !== false) saveCurrentDialogState();
  return true;
}

export function markReflectApplyChecks(keys: string | string[]): void {
  const list = Array.isArray(keys) ? keys : [keys];
  let changed = false;
  list.forEach((key) => {
    const item = REFLECT_APPLY_CHECKS.find((entry) => entry.key === key);
    if (!item) return;
    normalizeReflectApplyChecklist()[item.key] = true;
    changed = true;
  });
  if (!changed) return;
  renderReflectApplyChecklistStatus();
  renderReflectAssistPanel();
  saveCurrentDialogState();
}

export function resetReflectApplyChecks(keys?: string | string[]): void {
  const list = Array.isArray(keys) && keys.length ? keys : REFLECT_APPLY_CHECKS.map((item) => item.key);
  let changed = false;
  list.forEach((key) => {
    const item = REFLECT_APPLY_CHECKS.find((entry) => entry.key === key);
    if (!item) return;
    if (normalizeReflectApplyChecklist()[item.key]) changed = true;
    normalizeReflectApplyChecklist()[item.key] = false;
  });
  if (!changed) return;
  renderReflectApplyChecklistStatus();
  renderReflectAssistPanel();
  saveCurrentDialogState();
}

export function getMissingReflectApplyChecks(): ReflectApplyCheckItem[] {
  const store = normalizeReflectApplyChecklist();
  return REFLECT_APPLY_CHECKS.filter((item) => !store[item.key]);
}

export function ensureReflectApplyChecklistReady(): boolean {
  const missing = getMissingReflectApplyChecks();
  if (!missing.length) return true;
  renderReflectApplyChecklistStatus();
  const firstKey = missing[0]?.key || '';
  const first = (firstKey ? getToolDocument().querySelector(`[data-reflect-apply-check="${firstKey}"]`) : null) as HTMLElement | null;
  first?.focus?.();
  ui.reflectApplyChecklist?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  setStatus(`反映前チェックが未完了です: ${missing.map((item) => item.label).join(' / ')}`, true);
  return false;
}
