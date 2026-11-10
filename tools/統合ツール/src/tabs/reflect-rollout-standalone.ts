'use strict';

// =============================================================================
// 「続けて反映する反映先」の一括事前確認（lite 版のエンジン側）。
// 反映元を 1 回だけ取得し、反映先ごとに差分を取得して要約の行にする。読み取りだけで、反映先のプレビューにも書き込まない。
// 要約の組み立て・並行実行・中止の扱いは reflect/rolloutPrecheck.ts（DOM 非依存）。
// =============================================================================

import { downloadCustomizeFile, type CustomizeFileDownloader } from '../reflect/customizeFiles.js';
import type { AppReference } from '../reflect/appReference.js';
import { reconcileOwnPendingChanges, type ReflectLastRunInfo } from '../reflect/targetPending.js';
import { rolloutFailureRow, rolloutNotRunRow, runRolloutPrecheck, summarizeRolloutPreview, type RolloutPrecheckRow } from '../reflect/rolloutPrecheck.js';
import { isCancelRequested, isRunCancelledError } from '../runControl.js';
import { prepareReflectSourceStandalone, previewReflectStandalone, resolveReflectTargetStandalone, type ReflectOptions } from './reflect-standalone.js';

/** ファイル本体の取得結果を直近のものだけ保持する（反映元の JS/CSS を反映先ごとに取得し直さない。反映先のファイルで全件を抱え込まない）。 */
export function createRecentFileDownloader(download: CustomizeFileDownloader = downloadCustomizeFile, limit = 24): CustomizeFileDownloader {
  const cache = new Map<string, Promise<Blob>>();
  return (guestId, fileKey) => {
    const key = `${guestId}|${fileKey}`;
    const hit = cache.get(key);
    if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
    const request = download(guestId, fileKey);
    cache.set(key, request);
    // 失敗は保持しない（再試行できるように）。
    request.catch(() => { if (cache.get(key) === request) cache.delete(key); });
    while (cache.size > limit) cache.delete(cache.keys().next().value as string);
    return request;
  };
}

export interface PrecheckRolloutParams {
  /** 反映元・項目・保持・参照先変換（反映先のIDは使わない） */
  options: Omit<ReflectOptions, 'targetAppId' | 'targetGuestId'>;
  targets: readonly AppReference[];
  /** 直前にこの画面が書き込んだ反映先の情報。反映先の未公開の変更が自分の反映分かの判定に使う */
  lastWrite?: ReflectLastRunInfo | null;
  concurrency?: number;
  onProgress?: (done: number, total: number, row: RolloutPrecheckRow) => void;
}

/**
 * 全反映先の差分を先に取得して要約する（書き込みなし）。結果は targets と同じ順序。
 * 反映先ごとの取得失敗は「取得失敗」の行にして続ける。利用者の「中止」で、以降の反映先は「未実行（中止）」になる。
 * 反映元を取得できないときは、反映先を確認できないため例外を投げる（反映先の取得失敗として並べない）。
 */
export async function precheckRolloutTargetsStandalone(params: PrecheckRolloutParams): Promise<RolloutPrecheckRow[]> {
  const { options, targets } = params;
  if (!targets.length) return [];
  const download = createRecentFileDownloader();
  let source;
  try {
    source = await prepareReflectSourceStandalone({ ...options, targetAppId: '' }, () => {}, download);
  } catch (error) {
    if (!isRunCancelledError(error)) throw error;
    const now = Date.now();
    return targets.map(target => rolloutNotRunRow(target, now));
  }
  const check = async (target: AppReference): Promise<RolloutPrecheckRow> => {
    let name = '';
    try {
      name = (await resolveReflectTargetStandalone({ targetAppId: target.appId, targetGuestId: target.guestId })).name;
      const preview = await previewReflectStandalone({ ...options, targetAppId: target.appId, targetGuestId: target.guestId }, () => {}, { source });
      preview.targetPending = reconcileOwnPendingChanges(preview.targetPending, params.lastWrite, { appId: target.appId, guestId: target.guestId || '' });
      return summarizeRolloutPreview({ ...target, name }, preview, options.scopes, Date.now());
    } catch (error) {
      if (isRunCancelledError(error)) throw error;
      return rolloutFailureRow({ ...target, name }, error, Date.now());
    }
  };
  return runRolloutPrecheck(targets, check, { concurrency: params.concurrency, onProgress: params.onProgress, isCancelled: isCancelRequested });
}
