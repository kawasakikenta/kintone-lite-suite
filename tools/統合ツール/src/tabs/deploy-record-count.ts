'use strict';

/**
 * 本番反映の「削除されるフィールド」の影響の大きさを示すための、アプリのレコード数の取得（読み取りだけ）。
 * レコード API の GET（`totalCount=true`・`limit 1`）だけを使い、レコードは書き込まない。
 * 取得に失敗してもスローしない（レコード数は確認できなかったと示して、本番反映の確認は止めない）。中止だけは伝える。
 */

import { apiGet, buildApiPrefix } from '../api.js';
import { isRunCancelledError } from '../runControl.js';

export type RecordCountOutcome = { ok: true; count: number } | { ok: false; message: string };

/** 本番アプリの、閲覧できるレコードの総数を返す（レコードを閲覧できない・取得に失敗したときは理由）。 */
export async function fetchRecordCountStandalone(app: { appId: string; guestId?: string }): Promise<RecordCountOutcome> {
  try {
    const response = await apiGet(buildApiPrefix(app.guestId || '', false), '/records.json', { app: app.appId, query: 'limit 1', fields: ['$id'], totalCount: true });
    const total = Number(response?.totalCount);
    if (response?.totalCount === undefined || response?.totalCount === null || !Number.isFinite(total) || total < 0) {
      return { ok: false, message: '応答にレコード数がありませんでした' };
    }
    return { ok: true, count: total };
  } catch (error) {
    if (isRunCancelledError(error)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message: message.split('\n')[0].trim() || '原因不明' };
  }
}
