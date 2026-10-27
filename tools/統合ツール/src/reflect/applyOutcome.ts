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
  /** 利用者の「中止」で途中で止まった項目（status は ng のまま。失敗ではなく「途中で停止」と表示し、失敗に数えない）。 */
  stopped?: boolean;
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
  {
    pattern: /GAIA_AP01|アプリ.*(見つかりません|存在しません)|指定したアプリ/,
    hint: '反映先アプリID・ゲストスペースIDが正しいか確認してください。'
  },
  {
    pattern: /ルックアップ|lookup|relatedApp|関連レコード/i,
    hint: '参照先アプリが反映先環境に存在しない可能性があります。「Lookup AppID マッピング」で参照先を変換してください。'
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
  const text = String(message || '');
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
  const lines = String(message || '').split('\n').filter((line) => !/^\s*\[API\]\s/.test(line));
  return lines.join('\n').trim().replace('（revision 競合）', '（ほかの更新と重なったため。revision 競合）');
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
  /** 失敗した項目（中止で途中停止した項目は含めない） */
  ng: number;
  /** 中止で途中停止した項目 */
  stopped: number;
  pending: number;
  skip: number;
} {
  const out = { ok: 0, ng: 0, stopped: 0, pending: 0, skip: 0 };
  for (const s of sections || []) {
    if (s.status === 'ok') out.ok += 1;
    else if (s.status === 'ng') out[s.stopped ? 'stopped' : 'ng'] += 1;
    else if (s.status === 'pending') out.pending += 1;
    else out.skip += 1;
  }
  return out;
}
