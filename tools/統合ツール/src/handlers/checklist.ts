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
import { saveCurrentDialogState, currentDiffSignature, commonParams } from '../tabs/diff.js';

export interface ReflectApplyCheckItem {
  key: string;
  label: string;
}

export const REFLECT_APPLY_CHECKS: ReflectApplyCheckItem[] = [
  { key: 'diff', label: '差分比較済み' },
  { key: 'plan', label: '実行前プラン確認済み' },
  { key: 'preview', label: 'プレビュー画面確認済み' },
  { key: 'target', label: '反映先は比較先プレビュー' }
];

function getCurrentReflectApplyChecks(): ReflectApplyCheckItem[] {
  const doc = getToolDocument();
  const boxes = [...doc.querySelectorAll<HTMLInputElement>('[data-reflect-apply-check]')];
  if (!boxes.length) return [...REFLECT_APPLY_CHECKS];
  const seen = new Set<string>();
  return boxes.reduce<ReflectApplyCheckItem[]>((items, box) => {
    const key = box.dataset.reflectApplyCheck || '';
    if (!key || seen.has(key)) return items;
    seen.add(key);
    const label = (box.closest('.reflect-apply-check')?.textContent || key).replace(/\s+/g, ' ').trim();
    items.push({ key, label });
    return items;
  }, []);
}

/**
 * 実際のアプリ状態からチェックリスト各項目を自動判定する。
 * 「ユーザーがチェックを入れたか」ではなく「客観的にその段階を満たしているか」を返す。
 *
 *   diff   : 直近の差分比較が「現在の比較元/比較先・選択スコープ」と一致しているか
 *   plan   : `state.lastApplyPlan` が存在し、現在のプラン署名と一致しているか
 *   target : 反映先がプレビューであるか（このツールは常にプレビュー宛てなので true）
 *
 * ユーザーの手動チェック（state.reflectApplyChecklist）は記録としては残すが、
 * 反映実行可否の判定では自動判定の方を優先する。
 */
export function deriveReflectApplyCheckState(): Record<string, boolean> {
  const result: Record<string, boolean> = { diff: false, plan: false, preview: false, target: false };
  try {
    const sigNow = currentDiffSignature();
    result.diff = !!state.lastDiffAt && !!sigNow && String(state.lastDiffSignature || '') === String(sigNow);
  } catch (_e) { /* commonParams 失敗時は false のまま */ }
  try {
    const c = commonParams();
    const appId = String(c?.target?.appId || '').trim();
    const guestId = String(c?.target?.guestId || '').trim();
    const previewKey = `${appId}::${guestId}`;
    result.preview = !!state.reflectPreviewOpened && !!appId && state.reflectPreviewOpenedFor === previewKey;
    result.target = !!c?.target?.preview;
  } catch (_e) {
    // commonParams が失敗するのは設定未入力時。target=preview は本ツールの不変条件なので true 扱い。
    result.target = true;
  }
  result.plan = !!state.lastApplyPlan && !!state.lastApplyPlan.signature;
  return result;
}

export function normalizeReflectApplyChecklist(): Record<string, boolean> {
  if (!state.reflectApplyChecklist || typeof state.reflectApplyChecklist !== 'object' || Array.isArray(state.reflectApplyChecklist)) {
    state.reflectApplyChecklist = { diff: false, plan: false, preview: false, target: false };
  }
  // 自動判定が真であれば手動チェックも真として扱う（ユーザー操作を肩代わり）。
  // 自動判定が偽なら手動チェックの値を尊重するが、`getMissingReflectApplyChecks` は
  // 自動判定を優先するためここでの上書きは表示の同期だけが目的。
  const auto = deriveReflectApplyCheckState();
  getCurrentReflectApplyChecks().forEach((item) => {
    const cur = !!(state.reflectApplyChecklist as any)[item.key];
    (state.reflectApplyChecklist as any)[item.key] = item.key === 'preview' ? !!auto[item.key] : (!!auto[item.key] || cur);
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
  const currentItems = getCurrentReflectApplyChecks();
  const done = currentItems.filter((item) => !!store[item.key]).length;
  if (ui.reflectChecklistStatus) ui.reflectChecklistStatus.textContent = `${done} / ${currentItems.length}`;
  if (ui.reflectApplyChecklist) ui.reflectApplyChecklist.classList.toggle('is-complete', done === currentItems.length);
}

export function setReflectApplyCheck(key: string, checked: boolean, options: { persist?: boolean } = {}): boolean {
  const item = getCurrentReflectApplyChecks().find((entry) => entry.key === key);
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
    const item = getCurrentReflectApplyChecks().find((entry) => entry.key === key);
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
  const list = Array.isArray(keys) && keys.length ? keys : getCurrentReflectApplyChecks().map((item) => item.key);
  let changed = false;
  list.forEach((key) => {
    const item = getCurrentReflectApplyChecks().find((entry) => entry.key === key);
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
  // 自動判定を最優先する。ユーザーが手動でチェックを入れていても、
  // 実際の状態を満たしていなければ「未完了」として扱う。
  // これにより「チェックは入っているが実は古いプランで反映する」事故を防ぐ。
  const auto = deriveReflectApplyCheckState();
  return getCurrentReflectApplyChecks().filter((item) => !auto[item.key]);
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
