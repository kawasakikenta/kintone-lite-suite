'use strict';

/**
 * 本番反映パネルが、閉じて開き直したときに引き継ぐ入力と直前の結果の置き場所（メモリだけ。ブラウザの永続ストレージは使わない）。
 *
 * ツールを開き直すとスクリプトが読み込み直され、モジュール内の変数は新しくなる。そのため、同じページが表示されている間は
 * 残る `document.documentElement` に載せて受け渡す。ページを読み込み直すと消える（永続化はしない）。
 */

const HOLDER_KEY = '__kusDeployLiteMemory';

export interface SharedMemory<T> {
  state: T;
  /** 同じページで前に開いたときの内容を引き継いだか（初めて開いたときは false） */
  restored: boolean;
}

/**
 * name ごとの状態を返す。同じページで前に作られていればそれを引き継ぎ（新しい版で増えた項目は initial で補う）、
 * 無ければ initial を置く。返した state を書き換えると、次に開いたときに引き継がれる。
 */
export function sharedMemory<T extends object>(name: string, initial: T): SharedMemory<T> {
  const holder = document.documentElement as unknown as Record<string, Record<string, unknown> | undefined>;
  const store = holder[HOLDER_KEY] || (holder[HOLDER_KEY] = {});
  const existing = store[name] as T | undefined;
  if (existing && typeof existing === 'object') {
    for (const key of Object.keys(initial) as Array<keyof T>) if (!(key in existing)) existing[key] = initial[key];
    return { state: existing, restored: true };
  }
  store[name] = initial;
  return { state: initial, restored: false };
}
