'use strict';

// =============================================================================
// 同じ反映元・反映項目を、複数の反映先へ順番に反映するための「続けて反映する反映先」（DOM 非依存）。
// 反映先ごとに差分確認と最終確認を行う前提で、入力の解析と順番の管理だけを扱う。
// =============================================================================

import { parseAppReference, type AppReference } from './appReference.js';

export type RolloutQueueParseResult =
  | { ok: true; targets: AppReference[] }
  | { ok: false; error: string };

/**
 * 誤って大量に貼り付けた場合に気付けるよう、件数に上限を設ける。
 * 環境内の全アプリを対象にできるよう、大規模な環境でも収まる件数にしている。
 */
export const ROLLOUT_QUEUE_LIMIT = 1000;

const keyOf = (ref: AppReference) => `${ref.guestId || ''}:${ref.appId}`;

/** 件数の上限を超えたときの文言。 */
export function rolloutLimitMessage(count: number): string {
  return `続けて反映する反映先は ${ROLLOUT_QUEUE_LIMIT} 件までです（${count} 件）。${ROLLOUT_QUEUE_LIMIT} 件を超える場合は、いくつかに分けて実行してください。`;
}

/**
 * 「続けて反映する反映先」の入力を解析する。改行・カンマ・読点・空白で区切った
 * アプリID またはアプリのURL を受け付ける。数字だけの ID は通常スペースのアプリとして扱い、
 * ゲストスペースのアプリは URL（/k/guest/5/123/）で指定する。重複と excluded（現在の反映先）は除く。
 */
export function parseRolloutQueue(text: string, excluded: AppReference[] = []): RolloutQueueParseResult {
  const tokens = String(text || '').split(/[\s,、，]+/).map(token => token.trim()).filter(Boolean);
  const seen = new Set(excluded.map(keyOf));
  const targets: AppReference[] = [];
  for (const token of tokens) {
    const ref = parseAppReference(token);
    if (!ref) return { ok: false, error: `「${Array.from(token).length > 40 ? Array.from(token).slice(0, 39).join('') + '…' : token}」をアプリIDとして読み取れません。数字のID、またはアプリのURLを入力してください。` };
    if (seen.has(keyOf(ref))) continue;
    seen.add(keyOf(ref));
    targets.push(ref);
  }
  if (targets.length > ROLLOUT_QUEUE_LIMIT) return { ok: false, error: rolloutLimitMessage(targets.length) };
  return { ok: true, targets };
}

/** 反映先を表示用の短い文字列にする（例: #203、#204（ゲスト 5））。 */
export function formatRolloutTarget(target: AppReference): string {
  return `#${target.appId}${target.guestId ? `（ゲスト ${target.guestId}）` : ''}`;
}

/** 展開の記録に残す件数の上限。最初の反映先と、続けて反映する上限までの反映先をすべて残せる件数にする。 */
export const ROLLOUT_LOG_LIMIT = ROLLOUT_QUEUE_LIMIT + 1;

/**
 * 展開の記録へ反映結果を加える。同じ反映先（アプリID＋ゲストスペースID）の行があれば、順序はそのままに最新の結果で置き換える
 * （同じ反映先へ再実行したときに記録が重複しないようにする）。
 */
export function upsertRolloutLog<T extends AppReference>(log: readonly T[], entry: T, limit = ROLLOUT_LOG_LIMIT): T[] {
  const index = log.findIndex(item => keyOf(item) === keyOf(entry));
  const next = index >= 0 ? log.map((item, i) => (i === index ? entry : item)) : [...log, entry];
  return next.slice(-limit);
}

/** upsertRolloutLog で上限を超えて捨てられる古い行の数（記録が省略されたことを利用者へ示すために使う）。 */
export function countRolloutLogDropped<T extends AppReference>(log: readonly T[], entry: T, limit = ROLLOUT_LOG_LIMIT): number {
  const exists = log.some(item => keyOf(item) === keyOf(entry));
  return Math.max(0, log.length + (exists ? 0 : 1) - limit);
}

/** 続けて反映は参照先変換をすべての反映先へそのまま使う。変換が 1 件以上あるときの注意文（無ければ空文字）。 */
export function describeRolloutLookupNotice(lookupCount: number): string {
  return lookupCount > 0
    ? `参照先変換（${lookupCount} 件）を、すべての反映先に同じように使います。反映先ごとに変換先が違う場合は、反映先を切り替えた後に参照先変換を直してください。`
    : '';
}

/** 入力欄へ戻すための文字列（parseRolloutQueue で同じ内容に戻る形）。 */
export function serializeRolloutQueue(targets: AppReference[]): string {
  return targets.map(target => target.guestId ? `/k/guest/${target.guestId}/${target.appId}/` : target.appId).join('\n');
}

export type RolloutMergeResult =
  | { ok: true; text: string; added: number; duplicates: number; excluded: number; total: number }
  | { ok: false; error: string };

/**
 * 入力欄の内容に、アプリ一覧から選んだ反映先を重複なく加える（DOM 非依存）。
 * excluded は反映先にしないアプリ（反映元など）。入力欄に読み取れない値がある場合や、加えると上限を超える場合は
 * 何も変えずにエラーを返す。現在の反映先は入力欄に残し、実行時（parseRolloutQueue）に除く。
 */
export function mergeRolloutTargets(currentText: string, picks: readonly AppReference[], excluded: readonly AppReference[] = []): RolloutMergeResult {
  const existing = parseRolloutQueue(currentText);
  if ('error' in existing) return { ok: false, error: `入力済みの反映先を読み取れないため追加できません。${existing.error}` };
  const seen = new Set(existing.targets.map(keyOf));
  const blocked = new Set(excluded.map(keyOf));
  const targets = [...existing.targets];
  let added = 0;
  let duplicates = 0;
  let excludedCount = 0;
  const handled = new Set<string>();
  for (const pick of picks) {
    const key = keyOf(pick);
    if (handled.has(key)) continue;
    handled.add(key);
    if (blocked.has(key)) { excludedCount++; continue; }
    if (seen.has(key)) { duplicates++; continue; }
    seen.add(key);
    targets.push({ appId: pick.appId, guestId: pick.guestId || '' });
    added++;
  }
  if (targets.length > ROLLOUT_QUEUE_LIMIT) {
    return { ok: false, error: `${rolloutLimitMessage(targets.length)}入力欄は変更していません。` };
  }
  return { ok: true, text: serializeRolloutQueue(targets), added, duplicates, excluded: excludedCount, total: targets.length };
}
