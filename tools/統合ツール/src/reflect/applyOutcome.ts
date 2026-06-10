'use strict';

// =============================================================================
// プレビュー反映（lite / standalone）実行結果の整理と、エラー対処ヒントの組み立て。
// DOM・API に依存しない純粋関数のみを置く（vitest で直接テストする）。
// =============================================================================

export type ApplySectionStatus = 'ok' | 'ng' | 'skip' | 'pending';

export interface ApplySectionOutcome {
  sectionKey: string;
  label: string;
  status: ApplySectionStatus;
  message?: string;
}

interface ErrorHintRule {
  pattern: RegExp;
  hint: string;
}

const ERROR_HINT_RULES: ErrorHintRule[] = [
  {
    pattern: /CB_NO02|権限がありません|Forbidden|アクセスが拒否/i,
    hint: '比較先アプリのアプリ管理権限があるユーザーで実行しているか確認してください。'
  },
  {
    pattern: /GAIA_AP01|アプリ.*(見つかりません|存在しません)|指定したアプリ/,
    hint: '比較先アプリID・ゲストスペースIDが正しいか確認してください。'
  },
  {
    pattern: /ルックアップ|lookup|relatedApp|関連レコード/i,
    hint: '参照先アプリが比較先環境に存在しない可能性があります。「Lookup AppID マッピング」で参照先を変換してください。'
  },
  {
    pattern: /フィールド.*(見つかりません|存在しません)|GAIA_IL26/,
    hint: '比較先に存在しないフィールドを参照しています。先に「フィールド設定」を反映してから、このセクションを再実行してください。'
  },
  {
    pattern: /プロセス管理|GAIA_RE/,
    hint: 'プロセス管理の有効/無効や、作業者に指定したユーザー・組織が比較先環境に存在するか確認してください。'
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
  const text = String(message || '');
  if (!text) return '';
  for (const rule of ERROR_HINT_RULES) {
    if (rule.pattern.test(text)) return rule.hint;
  }
  return '';
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
  ng: number;
  pending: number;
  skip: number;
} {
  const out = { ok: 0, ng: 0, pending: 0, skip: 0 };
  for (const s of sections || []) {
    if (s.status === 'ok') out.ok += 1;
    else if (s.status === 'ng') out.ng += 1;
    else if (s.status === 'pending') out.pending += 1;
    else out.skip += 1;
  }
  return out;
}
