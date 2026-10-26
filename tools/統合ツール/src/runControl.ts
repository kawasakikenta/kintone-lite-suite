'use strict';

/**
 * 実行中の処理を利用者が「中止」できるようにするための共通基盤。
 *
 * - パネルが処理を始めるときに beginRun() で実行トークンを作り、終わるときに endRun() で破棄する
 * - 「中止」ボタンは requestCancel() を呼ぶ。API 層は各リクエストの前に throwIfCancelled() で確認し、
 *   読み取り（GET / fetch）は進行中でも activeAbortSignal() で打ち切る
 * - 書き込み（POST / PUT / DELETE）は進行中のリクエストを打ち切らず、次のリクエストの前で止める
 *   （サーバー側で確定したかどうかが分からなくなるのを避ける）
 * - ブラウザストレージは使わず、ページ内のメモリだけで状態を持つ
 */

export const RUN_CANCELLED_MESSAGE = '利用者の操作で中止しました';

export class RunCancelledError extends Error {
  readonly cancelled = true;
  constructor(message: string = RUN_CANCELLED_MESSAGE) {
    super(message);
    this.name = 'RunCancelledError';
  }
}

export interface RunToken {
  readonly id: number;
  readonly controller: AbortController;
  cancelled: boolean;
  cancelledAt: number;
}

let nextId = 1;
let active: RunToken | null = null;

/** 処理の開始を登録し、中止の対象になるトークンを返す。直前の処理が残っていれば置き換える。 */
export function beginRun(): RunToken {
  const token: RunToken = { id: nextId++, controller: new AbortController(), cancelled: false, cancelledAt: 0 };
  active = token;
  return token;
}

/** 処理の終了を登録する。別の処理に置き換わっていれば何もしない。 */
export function endRun(token: RunToken | null | undefined): void {
  if (token && active === token) active = null;
}

/** 現在の処理（または指定トークン）に中止を要求する。要求を受け付けたら true。 */
export function requestCancel(token?: RunToken | null): boolean {
  const target = token || active;
  if (!target || target.cancelled) return false;
  target.cancelled = true;
  target.cancelledAt = Date.now();
  try { target.controller.abort(new RunCancelledError()); } catch { /* noop */ }
  return true;
}

/** 現在の処理に中止が要求されているか。処理が無ければ false。 */
export function isCancelRequested(): boolean {
  return !!active && active.cancelled;
}

/** 現在の処理のトークン（テストと UI の表示用）。 */
export function activeRun(): RunToken | null {
  return active;
}

/** 中止が要求されていれば RunCancelledError を投げる。API 層が各リクエストの前に呼ぶ。 */
export function throwIfCancelled(): void {
  if (active && active.cancelled) throw new RunCancelledError();
}

/** 進行中の読み取りを打ち切るための AbortSignal。処理が無ければ undefined。 */
export function activeAbortSignal(): AbortSignal | undefined {
  return active ? active.controller.signal : undefined;
}

/** 中止による例外か（API 層でコンテキストを付けて包んだものも含む）。 */
export function isRunCancelledError(error: unknown): boolean {
  let current: any = error;
  for (let depth = 0; current && depth < 4; depth++) {
    if (current instanceof RunCancelledError || current.cancelled === true || current.name === 'RunCancelledError') return true;
    if (current.name === 'AbortError' && isCancelRequested()) return true;
    current = current.original;
  }
  return false;
}

/** 中止が要求されたらすぐに解決する待機。再試行の待ち時間に使う。 */
export function sleepUnlessCancelled(ms: number): Promise<void> {
  const signal = activeAbortSignal();
  return new Promise<void>((resolve) => {
    if (signal?.aborted) { resolve(); return; }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    function onAbort() { clearTimeout(timer); resolve(); }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Promise を「中止」と「タイムアウト」と競わせる。読み取り専用のリクエストに使う。
 * 元の Promise は打ち切れないため、結果は捨てる（kintone.api は AbortSignal を受け取らない）。
 */
export function raceWithCancel<T>(promise: Promise<T>, opts: { timeoutMs?: number; timeoutMessage?: string } = {}): Promise<T> {
  const signal = activeAbortSignal();
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 0;
  if (!signal && !timeoutMs) return promise;
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    // タイマーが同期的に実行されるテスト用モックでも未初期化参照にならないよう、先に宣言しておく。
    let timer: ReturnType<typeof setTimeout> | 0 = 0;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      fn();
    };
    function onAbort() { finish(() => reject(new RunCancelledError())); }
    timer = timeoutMs ? setTimeout(() => finish(() => {
      const error: any = new Error(opts.timeoutMessage || `応答待ちが ${Math.round(timeoutMs / 1000)} 秒を超えました（timeout）`);
      error.code = 'TIMEOUT';
      reject(error);
    }), timeoutMs) : 0;
    if (signal?.aborted) { onAbort(); return; }
    signal?.addEventListener('abort', onAbort, { once: true });
    promise.then((value) => finish(() => resolve(value)), (error) => finish(() => reject(error)));
  });
}

/**
 * fetch に渡す AbortSignal を作る。現在の処理の中止と、指定したタイムアウトのどちらでも打ち切る。
 * 呼び出し側は完了後に release() を呼んでタイマーと購読を外す。
 */
export function createRequestSignal(timeoutMs: number): { signal: AbortSignal; release: () => void; timedOut: () => boolean } {
  const controller = new AbortController();
  const runSignal = activeAbortSignal();
  let timedOut = false;
  const onAbort = () => { try { controller.abort(new RunCancelledError()); } catch { /* noop */ } };
  if (runSignal?.aborted) onAbort();
  else runSignal?.addEventListener('abort', onAbort, { once: true });
  const timer = Number(timeoutMs) > 0 ? setTimeout(() => {
    timedOut = true;
    const error: any = new Error(`応答待ちが ${Math.round(Number(timeoutMs) / 1000)} 秒を超えました（timeout）`);
    error.code = 'TIMEOUT';
    try { controller.abort(error); } catch { /* noop */ }
  }, Number(timeoutMs)) : 0;
  return {
    signal: controller.signal,
    release: () => { if (timer) clearTimeout(timer); runSignal?.removeEventListener('abort', onAbort); },
    timedOut: () => timedOut
  };
}

/** テスト用: 状態を初期化する。 */
export function __resetRunControlForTests(): void {
  active = null;
}
