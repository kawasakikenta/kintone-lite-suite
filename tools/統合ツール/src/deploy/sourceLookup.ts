'use strict';

/**
 * 「反映元アプリから本番へ」の、参照先変換の候補の表示（DOM 非依存）。
 * 候補の求め方と入力欄への追加は reflect/lookupCandidates.ts（プレビュー反映と共通）。ここには文言と、差分の抽出結果から画面・記録へ出す内容の選び方を置く。
 * 参照先変換を入れずに反映すると、反映先の参照先が反映元（開発用アプリ）のアプリに書き換わり、本番まで反映されるため、段階 2 と最終確認で警告する。
 */

import { describeLookupCandidate, hasLookupCandidates, type LookupMapCandidates } from '../reflect/lookupCandidates.js';

export const LOOKUP_CANDIDATES_TITLE = '参照先変換の候補があります';
export const LOOKUP_CANDIDATES_TEXT = '反映元と反映先で、ルックアップ・関連レコード一覧・アクションの参照先アプリが違います。参照先変換に入れずに反映すると、反映先の参照先が反映元のアプリに書き換わります。';
export const LOOKUP_APPLY_LABEL = '候補を参照先変換に追加して差分を取り直す';
/** 最終確認で、候補を入れないまま本番まで進むときの追記。 */
export const LOOKUP_CANDIDATES_CONFIRM_TEXT = '候補を入れないまま反映すると、本番の参照先が反映元のアプリに書き換わります。入れる場合は「差分の選択」へ戻り、候補を参照先変換に追加して差分を取り直してください。';

export type LookupNameOf = (side: 'from' | 'to', id: string) => string;

/** 食い違い（同じ旧IDに反映先の参照先が複数ある）の 1 行。自動では入れない。 */
export function describeLookupConflict(conflict: LookupMapCandidates['conflicts'][number], nameOf: LookupNameOf = () => ''): string {
  const label = (id: string, side: 'from' | 'to') => { const name = nameOf(side, id); return name ? `${id}（${name}）` : id; };
  const heads = conflict.targets.map((target) => label(target.to, 'to')).join(' または ');
  const details = conflict.targets.map((target) => `${target.to}: ${target.sources.join('、')}${target.total > target.sources.length ? ` ほか ${target.total - target.sources.length} 件` : ''}`).join(' / ');
  return `${label(conflict.from, 'from')} → ${heads}：反映先の参照先が一致していません（${details}）。自動では入れません。参照先変換に自分で入力してください。`;
}

/** 候補の 1 行（名前は分かる範囲で添える）。 */
export function describeSourceLookupCandidate(candidate: LookupMapCandidates['candidates'][number], nameOf: LookupNameOf = () => ''): string {
  return describeLookupCandidate(candidate, { from: nameOf('from', candidate.from), to: nameOf('to', candidate.to) });
}

/** 画面・記録に出す候補。フィールド設定かアクション設定を反映する項目に含めているときだけ（それ以外では参照先を書き換えない）。 */
export function lookupCandidatesFor(candidates: LookupMapCandidates | undefined, scopes: readonly string[]): LookupMapCandidates | undefined {
  return hasLookupCandidates(candidates) && scopes.some((key) => key === 'fieldSettings' || key === 'actionSettings') ? candidates : undefined;
}
