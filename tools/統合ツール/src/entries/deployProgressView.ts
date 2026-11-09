'use strict';

/**
 * 本番反映（lite）の画面で共有する小さな DOM 部品と、アプリごとの実行状況の一覧。
 * deploy-lite-ui.ts（プレビューの変更を公開）と deploy-source-ui.ts（反映元アプリから本番へ）が使う。
 */

import {
  DEPLOY_RESULT_FULL_LIMIT,
  countOutcomes,
  deployAppKey,
  describeDeployMessage,
  describeDeployStatus,
  describeRunProgress,
  formatDeployApp,
  isProblemStatus,
  type DeployOutcomeCounts
} from '../deploy/display.js';
import type { DeployAppOutcome, DeployAppStatus, DeployAppUpdate, DeployMode } from '../deploy/types.js';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function setButtonText(button: HTMLButtonElement, text: string) {
  const span = button.querySelector('span');
  if (span) span.textContent = text; else button.textContent = text;
}

export function firstLines(message: string | undefined, max = 6): string {
  return String(message || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, max).join('\n');
}

export function formatStamp(at: number | Date): string {
  const date = at instanceof Date ? at : new Date(at);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}/${p(date.getMonth() + 1)}/${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

// =============================================================================
// 実行中・実行後の一覧（数千件でも固まらない）
// =============================================================================

export interface ProgressRow {
  appId: string;
  guestId: string;
  name: string;
  status: DeployAppStatus;
  message?: string;
  outcome?: DeployAppOutcome;
}

export interface ProgressView {
  update(update: DeployAppUpdate): void;
  setOutcomes(apps: readonly DeployAppOutcome[]): void;
  rows(): ProgressRow[];
  counts(): DeployOutcomeCounts;
  flush(): void;
  dispose(): void;
}

/**
 * アプリごとの状態の一覧。通知は一定間隔にまとめて描画する。
 * 件数が多いとき（DEPLOY_RESULT_FULL_LIMIT 超）は、全行を描かず、要約（件数）＋問題のある行＋処理中の行だけを出す。
 */
export function createProgressView(host: HTMLElement, mode: DeployMode, initial: readonly ProgressRow[]): ProgressView {
  host.replaceChildren();
  const rows = new Map<string, ProgressRow>();
  for (const row of initial) rows.set(deployAppKey(row), { ...row });
  const summary = el('div', 'kus-dp-progress__summary');
  summary.setAttribute('role', 'status');
  summary.setAttribute('aria-live', 'polite');
  summary.setAttribute('aria-atomic', 'true');
  const omitted = el('div', 'kus-dp-progress__omitted');
  const list = el('ul', 'kus-dp-result-list');
  host.append(summary, omitted, list);
  let timer = 0;
  let disposed = false;

  function buildItem(row: ProgressRow): HTMLLIElement {
    const display = describeDeployStatus(row.status, mode);
    const item = el('li', `kus-dp-result-item kus-dp-result-item--${display.tone}`);
    item.dataset.deployApp = row.appId;
    item.dataset.deployGuest = row.guestId;
    item.dataset.deployStatus = row.status;
    const head = el('div', 'kus-dp-result-item__head');
    const state = el('span', `kus-dp-result-state kus-dp-result-state--${display.tone}`);
    const icon = el('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = display.icon;
    state.append(icon, document.createTextNode(display.text));
    head.append(state, el('strong', '', formatDeployApp(row)));
    item.appendChild(head);
    const message = describeDeployMessage(row.message).split('\n').slice(0, 8).join('\n');
    if (message) item.appendChild(el('div', 'kus-dp-result-item__message', message));
    const outcome = row.outcome;
    if (outcome && outcome.status === 'success') {
      const revisions = `本番のrevision: ${outcome.productionRevisionBefore || '－'} → ${outcome.productionRevisionAfter || '－'}（プレビュー ${outcome.previewRevision || '－'}）`;
      const verified = outcome.verified === true ? '反映後の確認: 本番とプレビューが一致' : outcome.verified === false ? '反映後の確認: 本番とプレビューのrevisionが一致しません。アプリの設定画面で確認してください' : '反映後の確認: できませんでした';
      item.appendChild(el('div', `kus-dp-result-item__meta${outcome.verified === false ? ' kus-dp-result-item__meta--warn' : ''}`, `${revisions} / ${verified}`));
    }
    return item;
  }

  function render() {
    if (disposed) return;
    timer = 0;
    const all = [...rows.values()];
    const counts = countOutcomes(all);
    summary.textContent = describeRunProgress(counts);
    let visible = all;
    if (all.length > DEPLOY_RESULT_FULL_LIMIT) {
      const problems = all.filter((row) => isProblemStatus(row.status));
      const active = all.filter((row) => row.status === 'checking' || row.status === 'deploying');
      visible = [...problems.slice(0, DEPLOY_RESULT_FULL_LIMIT), ...active.slice(0, 20)];
    }
    const hidden = all.length - visible.length;
    omitted.textContent = hidden > 0
      ? `ほか ${hidden} アプリは一覧に表示していません（内訳は上の件数。全件は「結果JSONを保存」で確認できます）。`
      : '';
    omitted.hidden = hidden <= 0;
    list.replaceChildren(...visible.map(buildItem));
  }

  function schedule() {
    if (timer || disposed) return;
    timer = window.setTimeout(render, 80);
  }

  render();
  return {
    update(update) {
      const row = rows.get(deployAppKey(update));
      if (!row) return;
      row.status = update.status;
      if (update.message !== undefined) row.message = update.message;
      schedule();
    },
    setOutcomes(apps) {
      for (const outcome of apps) {
        const key = deployAppKey(outcome);
        const row = rows.get(key) || { appId: outcome.appId, guestId: outcome.guestId, name: outcome.name, status: outcome.status };
        row.name = outcome.name || row.name;
        row.status = outcome.status;
        row.message = outcome.message;
        row.outcome = outcome;
        rows.set(key, row);
      }
      if (timer) { window.clearTimeout(timer); timer = 0; }
      render();
    },
    rows: () => [...rows.values()].map((row) => ({ ...row })),
    counts: () => countOutcomes([...rows.values()]),
    flush() {
      if (timer) window.clearTimeout(timer);
      render();
    },
    dispose() {
      disposed = true;
      if (timer) window.clearTimeout(timer);
    }
  };
}
