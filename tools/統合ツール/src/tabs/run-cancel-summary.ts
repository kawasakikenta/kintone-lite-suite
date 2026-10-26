'use strict';

import { isRunCancelledError } from '../runControl.js';

/**
 * 利用者が「中止」した後、ループが何件処理して何件を実行しなかったかを伝えるエラー。
 * 1 行目が要点（パネルのステータスに出る）、2 行目以降が内訳（パネルのログに出る）。
 *
 * isRunCancelledError() が true になる型にはしない。パネル側は中止そのものの例外を固定文言に置き換えるため、
 * 件数つきの本文が利用者に届かなくなる。入れ子のループが中止を見分けるには isCancelStop() を使う。
 */
export class CancelReportError extends Error {
  readonly cancelReport = true;
  readonly done: number;
  readonly total: number;
  constructor(done: number, total: number, details: string[] = []) {
    super([formatCancelledHeadline(done, total), ...details.filter(Boolean)].join('\n'));
    this.name = 'CancelReportError';
    this.done = done;
    this.total = total;
  }
}

/** 中止の要点 1 行。未実行の件数は「処理済みでない件数」で、中断された 1 件も含む。 */
export function formatCancelledHeadline(done: number, total: number): string {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeDone = Math.min(safeTotal, Math.max(0, Math.floor(done)));
  return `中止しました（${safeDone}/${safeTotal} 件を処理、残り ${safeTotal - safeDone} 件は未実行）`;
}

export function createCancelReport(done: number, total: number, details: string[] = []): CancelReportError {
  return new CancelReportError(done, total, details);
}

export function isCancelReportError(error: unknown): error is CancelReportError {
  return !!error && typeof error === 'object' && (error as any).cancelReport === true;
}

/** 利用者の中止による停止か（API 層の中止例外、または内側のループが件数つきで報告した中止）。 */
export function isCancelStop(error: unknown): boolean {
  return isRunCancelledError(error) || isCancelReportError(error);
}

/** 内側の中止報告を、外側のループの内訳行にするための文字列（"label: 1 行目" + 続く内訳）。 */
export function describeInnerCancel(label: string, error: unknown): string[] {
  if (!isCancelReportError(error)) return [`${label}: 実行中に中止しました（途中まで実行した内容は取り消していません）`];
  const [first, ...rest] = String(error.message).split('\n');
  return [`${label}: ${first}`, ...rest.map((line) => `  ${line}`)];
}
