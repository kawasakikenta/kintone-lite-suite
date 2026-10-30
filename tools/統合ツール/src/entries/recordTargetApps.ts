'use strict';

/**
 * アプリIDを「カンマ区切りの 1 入力欄」で受け取るツール（レコード管理・データ品質チェック・ER図の起点）が、
 * 「環境内の全アプリ」の候補を流し込んだり、確認画面に対象を載せたりするときの純粋な補助関数。
 */

import { parseRecordAppIds } from '../tabs/record-standalone.js';
import { connectionSummary, summarizeList } from './liteWorkflow.js';

/** 候補のアプリIDを、入力欄へ入れるカンマ区切りの文字列にする（重複は除き、並びは保つ）。 */
export function joinAppIds(apps: Array<{ appId: string }>): string {
  return [...new Set(apps.map((app) => String(app.appId || '').trim()).filter(Boolean))].join(', ');
}

/**
 * アプリごとに確認ダイアログを出す本番の書き込み（ステータス更新・レコードコピー）で、一度に指定できるアプリ数。
 * 全アプリを指定すると確認ダイアログが数千回続き、その間は「中止」も押せないため上限を設ける。
 */
export const PER_APP_CONFIRM_APP_LIMIT = 50;

/** アプリごとに確認する操作の対象が上限を超えていれば、その理由を返す（超えていなければ空文字）。 */
export function perAppConfirmLimitProblem(appIdsText: string, operation: string): string {
  let count = 0;
  try { count = parseRecordAppIds(appIdsText).length; } catch { return ''; }
  return count > PER_APP_CONFIRM_APP_LIMIT
    ? `${operation}はアプリごとに確認ダイアログを表示するため、一度に指定できるのは ${PER_APP_CONFIRM_APP_LIMIT} アプリまでです（指定 ${count} アプリ）。対象アプリを分けて実行してください。`
    : '';
}

/**
 * 確認画面の「対象アプリ」。1 アプリなら従来どおり 1 行、複数なら件数と、先頭 20 件までの一覧にする
 * （全アプリを対象にしても確認画面が数千行にならない）。
 */
export function recordTargetSummary(appIdsText: string, guestId: string, environment = '本番'): [string, string] {
  const text = String(appIdsText || '').trim();
  const guest = String(guestId || '').trim();
  try {
    const ids = parseRecordAppIds(text);
    if (ids.length > 1) {
      return ['対象アプリ', `${ids.length}アプリ\n${summarizeList(ids.map((id) => connectionSummary(id, guest, environment)))}`];
    }
  } catch { /* 入力の誤りは各操作の入力チェックが示すので、ここでは入力欄の内容をそのまま見せる */ }
  return ['対象アプリ', connectionSummary(text, guest, environment)];
}
