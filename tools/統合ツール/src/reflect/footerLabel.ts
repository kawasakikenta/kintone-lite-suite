'use strict';

// 反映フッターの主ボタン文言を組み立てる純粋関数。
// 「何件をプレビューへ書き込むのか」をボタン自体に表示して、実行直前の安心感を高める。
// DOM へ依存しないので単体テストの対象にしている。

export interface ApplyButtonLabelOptions {
  isNode: boolean;
  selectedNodeCount: number;
  scopeCount: number;
  canApply: boolean;
}

export function buildApplyButtonLabel(opts: ApplyButtonLabelOptions): string {
  const base = 'プレビューへ反映';
  // 反映不可（差分未最新・未選択など）のときは件数を出さず素のラベルに戻す
  if (!opts || !opts.canApply) return base;
  if (opts.isNode) {
    return opts.selectedNodeCount > 0 ? `${base}（${opts.selectedNodeCount}件）` : base;
  }
  return opts.scopeCount > 0 ? `${base}（${opts.scopeCount}セクション）` : base;
}
