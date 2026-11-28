'use strict';

/**
 * アプリ設定（プレビュー）への書き込み。revision を添えた PUT / POST を、応答が届かなかったときに黙って送り直さない。
 *
 * 応答が届かなかった（通信エラー・応答の無い 5xx・応答待ちの超過）書き込みは、kintone 側で反映されたか分からない。
 * 同じ revision のまま送り直すと、1 回目が反映されていた場合は進んだ revision と食い違って kintone が拒否し（GAIA_CO02）、
 * 実際は書き込めたのに「ほかの更新と重なった（revision 競合）」と表示してしまう。そこで次のように決める。
 *   1. kintone がエラーを返した（拒否した）なら、その書き込みは反映されていない。そのまま失敗にする。
 *   2. 応答が届かなかったら、同じ設定を読み直して revision を確かめる。
 *      - 送った revision のまま: 反映されていない。一時的な失敗なら送り直す（revision を添えるため二重には反映されない）。
 *      - revision が進んでいる・読み取れない: この書き込みか、ほかの更新か分からない。成功とも失敗とも言わず、
 *        SettingsWriteUnconfirmedError で止める（次の書き込みに使う revision を決められないため、以降の書き込みもしない）。
 *   3. 送り直した書き込みが revision 競合で拒否されたら、先に送った分が遅れて反映された可能性があるため、2 と同じく止める。
 * revision を添えない書き込みは照合できないため、1 回だけ送る（送り直さない）。
 */

import { apiGet, apiPost, apiPut, assertAllowsMutatingRestCall, computeRetryDelayMs, isRetriableMutation, isRevisionConflictError, pickRevision } from './api.js';
import { isRunCancelledError, sleepUnlessCancelled } from './runControl.js';

const DEFAULT_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 3000;
/** kintone のエラーコード（GAIA_CO02・CB_VA01 など）。通信の失敗（NETWORK・TIMEOUT など）とは形が違う。 */
const KINTONE_ERROR_CODE = /^[A-Z][A-Z0-9]*_[A-Z]{2}\d{2}$/;

/**
 * kintone がエラーの応答を返した（＝その書き込みは反映されていない）か。
 * エラーの応答には id・code（GAIA_CO02 など）・errors がある。通信エラーや、応答の本文が無い 5xx（中継装置の 502・504 など）には無い。
 */
export function isKintoneRejection(error: unknown): boolean {
  for (let current: any = error, depth = 0; current && typeof current === 'object' && depth < 5; current = current.original, depth++) {
    if (current.id || (current.errors && typeof current.errors === 'object')) return true;
    if (KINTONE_ERROR_CODE.test(String(current.code ?? ''))) return true;
  }
  return false;
}

/** 一時的な失敗（通信エラー・応答待ちの超過・5xx）か。API 層が包んだエラーは、元のエラー（HTTP の状態を持つ）も見る。 */
function isTransientWriteFailure(method: string, error: unknown): boolean {
  for (let current: any = error, depth = 0; current && depth < 5; current = current.original, depth++) {
    if (isRetriableMutation(method, current)) return true;
  }
  return false;
}

/** 書き込みが反映されたか分からない（応答が届かず、読み直しても決められない）ことを示すエラー。 */
export class SettingsWriteUnconfirmedError extends Error {
  readonly writeUnconfirmed = true;
  /** プレビュー反映の書き込みの連鎖を止める（次の書き込みに使う revision を決められない） */
  readonly stopReflection = true;
  constructor(message: string, readonly sentRevision: string, readonly currentRevision: string, readonly cause?: unknown) {
    super(message);
    this.name = 'SettingsWriteUnconfirmedError';
  }
}

/** 反映されたか分からない書き込みのエラーか（呼び出し元が包んだものも含む）。 */
export function isSettingsWriteUnconfirmed(error: unknown): boolean {
  for (let current: any = error, depth = 0; current && typeof current === 'object' && depth < 5; current = current.original, depth++) {
    if (current.writeUnconfirmed === true) return true;
  }
  return false;
}

export interface SettingsWriteOptions {
  /** 利用者向けの呼び名（「一覧」「フィールド追加」「JS/CSS設定の反映」など） */
  subject: string;
  /** 反映されたか分からないときに、何を見て確かめるか（「差分を取得し直して…」など。1 文で「〜してください」まで） */
  howToCheck: string;
  /** 試行回数の上限（既定 3）。送り直すのは、読み直して反映されていないと確かめたときだけ */
  attempts?: number;
  /** 反映先の今の revision を読む。既定は同じ API の GET（app だけを渡す） */
  readRevision?: () => Promise<string>;
}

const firstLine = (error: unknown): string => String((error as any)?.message ?? error ?? '').split('\n').map((line) => line.trim()).find(Boolean) || '不明なエラー';

/**
 * revision を添えた設定の書き込みを送る。応答が届かなかったときは、読み直して反映済みか確かめてから送り直すか決める（上の説明）。
 * 戻り値は kintone の応答（更新後の revision を含む）。
 */
export async function writeSettingsWithRevision(
  method: 'PUT' | 'POST',
  prefix: string,
  path: string,
  body: Record<string, unknown>,
  options: SettingsWriteOptions
): Promise<any> {
  // 書き込み先の検査（プレビュー以外への書き込みなど）は、送る前に止める（読み直しの対象にしない）。
  assertAllowsMutatingRestCall(prefix, path, method);
  const send = () => (method === 'POST' ? apiPost : apiPut)(prefix, path, body, 1);
  const sent = String(body?.revision ?? '');
  if (!/^\d+$/.test(sent)) return send();
  const attempts = Math.max(1, Number.isFinite(options.attempts) ? Number(options.attempts) : DEFAULT_ATTEMPTS);
  const readRevision = options.readRevision || (async () => pickRevision(await apiGet(prefix, path, { app: body.app })));
  const { subject, howToCheck } = options;
  const unconfirmed = (detail: string, current: string, cause: unknown) => new SettingsWriteUnconfirmedError(
    `${subject}の書き込みは、${detail}反映されたか分かりません。${howToCheck}${cause ? `\n（原因: ${firstLine(cause)}）` : ''}`,
    sent, current, cause
  );
  let resent = false;
  for (let attempt = 0; ; attempt++) {
    try {
      return await send();
    } catch (error) {
      // 中止は送る前に止まっている（書き込みは送っていない）。
      if (isRunCancelledError(error)) throw error;
      if (isKintoneRejection(error)) {
        // 送り直した書き込みが競合で拒否された: 先に送った分が遅れて反映されたか、ほかの更新が入ったか分からない。
        if (resent && isRevisionConflictError(error)) {
          throw unconfirmed(`応答が届かなかったため送り直したところ、その間に設定の更新番号（revision）が ${sent} から進んでいました。先に送った分が遅れて反映されたか、ほかの更新が入ったかのどちらかで、`, '', null);
        }
        throw error;
      }
      // 応答が届かなかった。反映先の revision を読み直して決める。
      let current = '';
      try {
        current = await readRevision();
      } catch (readError) {
        if (isRunCancelledError(readError)) throw unconfirmed('応答が届かず、確かめる前に中止したため、', '', error);
        throw unconfirmed(`応答が届かず、反映先の設定も読み取れなかったため（${firstLine(readError)}）、`, '', error);
      }
      if (!/^\d+$/.test(current)) throw unconfirmed('応答が届かず、反映先の設定の更新番号（revision）も確かめられなかったため、', '', error);
      if (current !== sent) {
        throw unconfirmed(`応答が届かなかったため、設定の更新番号（revision）を読み直したところ ${sent} から ${current} に進んでいました。この書き込みが反映されたか、ほかの更新が入ったかのどちらかで、`, current, error);
      }
      // 反映されていない（revision が送ったときのまま）。一時的な失敗なら、待ってから同じ revision で送り直す。
      if (attempt + 1 < attempts && isTransientWriteFailure(method, error)) {
        await sleepUnlessCancelled(computeRetryDelayMs(attempt, RETRY_BASE_DELAY_MS, RETRY_MAX_DELAY_MS));
        resent = true;
        continue;
      }
      if (error && typeof error === 'object' && typeof (error as any).message === 'string') {
        (error as any).message += `\n反映先の設定の更新番号（revision）は ${sent} のままで、この書き込みは反映されていません。`;
      }
      throw error;
    }
  }
}
