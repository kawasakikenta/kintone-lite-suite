'use strict';

/**
 * 「環境内の全アプリ」でゲストスペースも探したときの、状態表示と候補一覧の見出しの文言を作る純粋な補助関数。
 * 取得失敗・確かめられなかったスペースID・上限による打ち切りは隠さず示す。
 */

import { GUEST_SPACE_PROBE_LIMIT, type EnvironmentAppsProgress, type EnvironmentAppsResult } from '../api.js';

/** ID の並びを「5・8・12 ほか 3 件」のように短くする。 */
function listIds(ids: readonly string[], limit = 5): string {
  const head = ids.slice(0, limit).join('・');
  return ids.length > limit ? `${head} ほか ${ids.length - limit} 件` : head;
}

/** 取得中の状態表示。 */
export function describeEnvironmentAppsProgress(progress: EnvironmentAppsProgress): string {
  if (progress.phase === 'apps') return `環境内の全アプリを取得中…（${progress.fetched}件）`;
  if (progress.phase === 'guest-spaces') {
    return `ゲストスペースを探しています…（スペースID ${progress.checkedUpTo} まで確認、${progress.found}か所が見つかりました）`;
  }
  return `ゲストスペースのアプリを取得中…（${progress.index}/${progress.total}か所目: ゲストスペース ${progress.guestId}、${progress.fetched}件）`;
}

export interface EnvironmentAppsSummary {
  message: string;
  tone: 'ok' | 'warn' | 'info';
  /** 候補一覧の見出し「環境内のアプリ N件」に続ける文 */
  headSuffix: string;
  /** 候補一覧の上に出す、ゲストスペースを確かめた範囲の説明 */
  scope: string;
}

/**
 * 取得結果の状態表示・見出し・確認範囲の説明を作る。
 * typedGuestId は利用者がゲストID欄に入れていた値（見つからなければその旨を示す）。
 */
export function summarizeEnvironmentApps(
  result: EnvironmentAppsResult,
  opts: { typedGuestId?: string; canApplyAll?: boolean } = {}
): EnvironmentAppsSummary {
  const total = result.apps.length;
  const guestApps = result.apps.filter((entry) => entry.guestId).length;
  const spaces = result.guestSpaces.length;
  const { search } = result;
  const problems: string[] = [];
  const failed = result.guestSpaces.filter((space) => space.error);
  if (failed.length) {
    const others = failed.length > 1 ? ` ほか ${failed.length - 1}か所` : '';
    problems.push(`ゲストスペースのアプリ一覧の取得に失敗 ${failed.length}か所（ゲストスペース ${failed[0].guestId}: ${failed[0].error}${others}）`);
  }
  if (search.unconfirmed.length) {
    problems.push(`確かめられなかったスペースID ${search.unconfirmed.length}件（${listIds(search.unconfirmed)}。通信エラーなど）`);
  }
  if (search.limited) {
    problems.push(`確かめる件数の上限（${GUEST_SPACE_PROBE_LIMIT}件）に達したため、スペースID ${search.checkedUpTo} より後は確かめていません`);
  }
  const typed = String(opts.typedGuestId || '').trim();
  if (typed && !result.guestSpaces.some((space) => space.guestId === typed) && !search.unconfirmed.includes(typed)) {
    problems.push(`ゲストスペース ${typed} は見つかりませんでした（閲覧できないか、ゲストスペースではありません）`);
  }
  const lead = total
    ? `環境内のアプリ ${total}件を表示しました（通常スペース・スペース外 ${total - guestApps}件、ゲストスペース ${spaces}か所 ${guestApps}件）`
    : '閲覧できるアプリがありません（通常スペース・スペース外とゲストスペース）';
  const next = !problems.length && total && opts.canApplyAll ? '「すべて…」でまとめて設定できます' : '';
  const scope = spaces
    ? `ゲストスペースは、スペースID 1〜${search.checkedUpTo} を順に確かめて ${spaces}か所見つかりました（閲覧できるものだけ）。ほかのゲストスペースは、ゲストIDを入れて取得すると加わります。`
    : `スペースID 1〜${search.checkedUpTo} を順に確かめましたが、閲覧できるゲストスペースは見つかりませんでした。ゲストIDを入れて取得すると、そのゲストスペースを確かめます。`;
  return {
    message: [lead, ...problems, next].filter(Boolean).join('。'),
    tone: problems.length ? 'warn' : total ? 'ok' : 'info',
    headSuffix: spaces ? `（うちゲストスペース ${spaces}か所の ${guestApps}件）` : '',
    scope
  };
}
