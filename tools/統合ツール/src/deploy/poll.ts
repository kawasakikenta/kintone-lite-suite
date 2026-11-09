'use strict';

/** アプリの更新（deploy.json）の完了待ち。DOM に依存しない。 */

import { fetchAppDeployStatus } from '../api.js';
import { isRunCancelledError, sleepUnlessCancelled, throwIfCancelled } from '../runControl.js';
import type { DeployPollOptions } from './types.js';

export const DEFAULT_DEPLOY_POLL: Required<DeployPollOptions> = { firstMs: 300, initialMs: 1000, maxMs: 5000, timeoutMs: 300_000 };
/** 状態の取得が続けて失敗したら、完了を確認できないものとして待つのをやめる回数。 */
export const DEPLOY_STATUS_FAILURE_LIMIT = 3;
const BACKOFF_FACTOR = 1.5;

export type DeployWaitResult =
  | { kind: 'done'; statuses: Map<string, string> }
  | { kind: 'timeout'; statuses: Map<string, string> }
  | { kind: 'error'; statuses: Map<string, string>; reason: string };

const isFinal = (status: string | undefined) => status === 'SUCCESS' || status === 'FAIL' || status === 'CANCEL';

function resolvePoll(poll: DeployPollOptions | undefined): Required<DeployPollOptions> {
  const pick = (value: number | undefined, fallback: number) => Number.isFinite(value) && Number(value) >= 0 ? Number(value) : fallback;
  const initialMs = pick(poll?.initialMs, DEFAULT_DEPLOY_POLL.initialMs);
  // 最初の確認だけ短く待つ（反映が数百 ms で終わるアプリも多い）。initialMs を小さく指定したとき（テストなど）は、それより長くしない。
  const firstMs = Math.min(initialMs, pick(poll?.firstMs, DEFAULT_DEPLOY_POLL.firstMs));
  return { firstMs, initialMs, maxMs: Math.max(initialMs, pick(poll?.maxMs, DEFAULT_DEPLOY_POLL.maxMs)), timeoutMs: pick(poll?.timeoutMs, DEFAULT_DEPLOY_POLL.timeoutMs) };
}

/**
 * 依頼したアプリがすべて SUCCESS / FAIL / CANCEL になるまで状態を確認する。
 * 最初の確認までは firstMs だけ待ち、2 回目以降の間隔は initialMs から 1.5 倍ずつ増やして maxMs を上限にする。timeoutMs を超えたら timeout、
 * 状態の取得が続けて失敗したら error を返す。中止は例外（RunCancelledError）のまま伝える。
 */
export async function waitForDeploy(guestId: string, appIds: string[], pollOptions?: DeployPollOptions): Promise<DeployWaitResult> {
  const poll = resolvePoll(pollOptions);
  const statuses = new Map<string, string>();
  const startedAt = Date.now();
  let interval = poll.firstMs;
  let first = true;
  let failures = 0;
  let lastReason = '';
  for (;;) {
    await sleepUnlessCancelled(interval);
    throwIfCancelled();
    try {
      const rows = await fetchAppDeployStatus(guestId, appIds);
      failures = 0;
      for (const row of rows) statuses.set(row.app, row.status);
      if (appIds.every(id => isFinal(statuses.get(id)))) return { kind: 'done', statuses };
    } catch (error) {
      if (isRunCancelledError(error)) throw error;
      failures += 1;
      lastReason = error instanceof Error ? error.message : String(error);
      if (failures >= DEPLOY_STATUS_FAILURE_LIMIT) return { kind: 'error', statuses, reason: lastReason };
    }
    if (Date.now() - startedAt >= poll.timeoutMs) return { kind: 'timeout', statuses };
    interval = first ? poll.initialMs : Math.min(poll.maxMs, Math.round(interval * BACKOFF_FACTOR) || poll.maxMs);
    first = false;
  }
}
