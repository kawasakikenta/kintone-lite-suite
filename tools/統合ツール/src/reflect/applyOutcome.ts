'use strict';

// =============================================================================
// プレビュー反映（lite / standalone）実行結果の整理と、エラー対処ヒントの組み立て。
// DOM・API に依存しない純粋関数のみを置く（vitest で直接テストする）。
// =============================================================================

import { withoutApiContextLines } from '../utils.js';

export type ApplySectionStatus = 'ok' | 'ng' | 'skip' | 'pending';

export interface ApplySectionOutcome {
  sectionKey: string;
  label: string;
  status: ApplySectionStatus;
  message?: string;
  /** 利用者の「中止」で途中で止まった項目（status は ng のまま。失敗ではなく「途中で停止」と表示し、失敗に数えない）。 */
  stopped?: boolean;
  /** 失敗した項目で、その前に書き込みが済んだ操作がある（項目の途中で止まった。反映先プレビューに一部が残る）。 */
  partiallyWritten?: boolean;
  /**
   * 書き込みの応答が届かず、反映されたか分からない項目（status は ng のまま。失敗ではなく「反映されたか不明」と表示し、失敗に数えない）。
   * 反映されていた可能性があるため、反映先プレビューは変わったものとして扱う。
   */
  unconfirmed?: boolean;
}

interface ErrorHintRule {
  pattern: RegExp;
  hint: string;
}

const ERROR_HINT_RULES: ErrorHintRule[] = [
  {
    pattern: /CB_NO02|権限がありません|Forbidden|アクセスが拒否/i,
    hint: '反映先アプリのアプリ管理権限があるユーザーで実行しているか確認してください。'
  },
  // ルックアップ・関連レコード一覧の設定のエラー（kintone の入力エラーの場所「フィールド「X」のルックアップ設定・参照するアプリID」を含む）は、
  // 文に「アプリが見つかりません」があっても参照先のアプリの話なので、反映先アプリIDの確認より先に判定する。
  {
    pattern: /ルックアップ|lookup|relatedApp|関連レコード/i,
    hint: '参照先アプリが反映先環境に存在しない可能性があります。「参照先変換」で参照先のアプリIDを変換してください。'
  },
  {
    pattern: /GAIA_AP01|アプリ.*(見つかりません|存在しません)|指定したアプリ/,
    hint: '反映先アプリID・ゲストスペースIDが正しいか確認してください。'
  },
  {
    pattern: /フィールド.*(見つかりません|存在しません)|GAIA_IL26/,
    hint: '反映先に存在しないフィールドを参照しています。先に「フィールド設定」を反映してから、このセクションを再実行してください。'
  },
  {
    pattern: /プロセス管理|GAIA_RE/,
    hint: 'プロセス管理の有効/無効や、作業者に指定したユーザー・組織が反映先環境に存在するか確認してください。'
  },
  {
    pattern: /Failed to fetch|NetworkError|ネットワーク|タイムアウト|timeout/i,
    hint: '通信エラーの可能性があります。時間をおいて「失敗・未実行だけ選択」から再実行してください。'
  }
];

/**
 * 反映実行時のエラーメッセージから、ユーザーが次に取れる対処方法のヒントを返す。
 * 該当パターンがなければ空文字を返す（ログにはエラーのみ表示）。
 */
export function buildReflectErrorHint(message: string): string {
  // 送った内容（[API] … payload=… の行）は判定に使わない。フィールド設定の payload には "lookup" などが入り、エラーと関係なくヒントが決まってしまう。
  const text = withoutApiContextLines(message);
  if (!text) return '';
  for (const rule of ERROR_HINT_RULES) {
    if (rule.pattern.test(text)) return rule.hint;
  }
  return '';
}

/**
 * エラー行をログへ追加し、対処ヒントがあれば併記する。
 * 直前に同じヒントを出していたら重複して出さない（fieldSettings のサブ手順と本体など）。
 */
export function pushReflectErrorLog(logs: string[], line: string, errorMessage: string): void {
  logs.push(line);
  const hint = buildReflectErrorHint(errorMessage);
  if (!hint) return;
  const hintLine = `   ヒント: ${hint}`;
  if (logs.slice(-3).includes(hintLine)) return;
  logs.push(hintLine);
}

/**
 * 項目の失敗メッセージを、画面に出す形にする。
 * 内部の通信情報（`[API] PUT …` の行）は実行ログにだけ残し、利用者向けの文を先に示す。
 * 専門用語の「revision 競合」は、かみ砕いた説明を先に添える。
 */
export function describeReflectFailure(message: string | undefined): string {
  return withoutApiContextLines(message).replace('（revision 競合）', '（ほかの更新と重なったため。revision 競合）');
}

/**
 * 再実行が必要なセクション（失敗 + 中断で未実行）のキーを実行順のまま返す。
 */
export function collectRetrySectionKeys(sections: ApplySectionOutcome[]): string[] {
  return (sections || [])
    .filter((s) => s.status === 'ng' || s.status === 'pending')
    .map((s) => s.sectionKey);
}

/**
 * 実行結果のセクション一覧から OK / NG / 未実行件数を集計する。
 */
export function summarizeApplyOutcome(sections: ApplySectionOutcome[]): {
  ok: number;
  /** 失敗した項目（中止で途中停止した項目・反映されたか分からない項目は含めない） */
  ng: number;
  /** 中止で途中停止した項目 */
  stopped: number;
  /** 書き込みの応答が届かず、反映されたか分からない項目 */
  unconfirmed: number;
  pending: number;
  skip: number;
} {
  const out = { ok: 0, ng: 0, stopped: 0, unconfirmed: 0, pending: 0, skip: 0 };
  for (const s of sections || []) {
    if (s.status === 'ok') out.ok += 1;
    else if (s.status === 'ng') out[s.stopped ? 'stopped' : s.unconfirmed ? 'unconfirmed' : 'ng'] += 1;
    else if (s.status === 'pending') out.pending += 1;
    else out.skip += 1;
  }
  return out;
}

/** 項目の結果の呼び名（成功・失敗・途中で停止・反映されたか不明・変更なし・未実行）。記録や一覧の文に使う。 */
export function applySectionStatusText(section: Pick<ApplySectionOutcome, 'status' | 'stopped' | 'unconfirmed'> | undefined): string {
  if (!section || section.status === 'pending') return '未実行';
  if (section.status === 'ok') return '成功';
  if (section.status === 'skip') return '変更なし';
  if (section.stopped) return '途中で停止';
  return section.unconfirmed ? '反映されたか不明' : '失敗';
}

/**
 * 反映先プレビューへの書き込みの状況。none: 1 件も書き込めていない（プレビューは変わっていない）/ partial: 一部だけ書き込まれた /
 * all: 書き込みが終わった / unknown: 確かに書き込めた項目は無いが、反映されたか分からない書き込みがある（プレビューが変わったか分からない）。
 */
export type PreviewWriteState = 'none' | 'partial' | 'all' | 'unknown';

/**
 * 項目ごとの結果から、反映先プレビューへの書き込みの状況を求める。
 * 書き込めたのは、成功した項目と、失敗・中止で止まる前に書き込みが済んだ操作がある項目。失敗・未実行が残っていれば partial か none。
 * 反映されたか分からない項目があり、ほかに書き込めた項目が無ければ unknown。
 */
export function previewWriteState(sections: readonly ApplySectionOutcome[]): PreviewWriteState {
  const list = sections || [];
  const written = list.some((section) => section.status === 'ok' || (section.status === 'ng' && (section.stopped === true || section.partiallyWritten === true)));
  if (!written) return list.some((section) => section.status === 'ng' && section.unconfirmed === true) ? 'unknown' : 'none';
  return list.some((section) => section.status === 'ng' || section.status === 'pending') ? 'partial' : 'all';
}
