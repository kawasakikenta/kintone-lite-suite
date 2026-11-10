'use strict';

/**
 * 「反映元アプリから本番へ」の「反映後の内容を確認する」（DOM・API 非依存）。
 * 実行したときに選んだ変更と修正を「期待する内容」として控えておき（buildVerifyExpectations）、
 * 反映後に読み取った反映先の設定と比べて（compareVerifyExpectations）、選んだ変更が意図した値で入っているかを判定する。
 * 選ばなかった変更が反映先に残っているのは正常なので、比べるのは選んだ変更の場所だけ。
 */

import { ORDER_SUFFIX, orderedNames } from '../reflect/selectionModel.js';
import { cloneJson, getAt, isPlainObject, own, parsePointer, sameValue } from '../reflect/selectionPointer.js';
import type { ComposedSection, SelectableKind } from '../reflect/selectionTypes.js';
import { describePath } from './sourceDisplay.js';
import { previewWriteState } from '../reflect/applyOutcome.js';
import type { SourceSession } from './sourceSession.js';
import type { SourceDeployGoal, SourceDeployResult } from './sourceTypes.js';

export type VerifySide = 'production' | 'preview';

/** value: 場所の値が期待どおりか / member: プラグイン ID が一覧にあるか / order: 並び順 */
export type VerifyCheck = 'value' | 'member' | 'order';

export interface VerifyExpectation {
  id: string;
  sectionKey: string;
  /** 項目名（フィールド設定など） */
  sectionLabel: string;
  /** 利用者向けの場所（例: 「フィールド設定 / 顧客名（name） / 必須」） */
  place: string;
  pointer: string;
  kind: SelectableKind;
  check: VerifyCheck;
  /** 期待する値。value: その場所の値（undefined は削除）/ member: プラグイン ID / order: 期待する名前の並び */
  expected: unknown;
  expectedText: string;
  /** 利用者が入力欄・JSON で直した値か（反映元の値のままではない） */
  edited: boolean;
}

// =============================================================================
// 期待する内容の組み立て
// =============================================================================

/** 値を 1 行の文字列にする（画面・記録の「期待した値」「現在の値」。長い値は先頭だけ）。 */
export function formatVerifyValue(value: unknown, max = 120): string {
  const text = value === undefined ? '（なし）' : value === null ? '（空）'
    : typeof value === 'boolean' ? (value ? 'はい' : 'いいえ')
    : typeof value === 'string' ? (value === '' ? '（空）' : value)
    : JSON.stringify(value) ?? '（なし）';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export interface BuildVerifyInput {
  session: Pick<SourceSession, 'models' | 'selected' | 'states'>;
  /** 実行する項目（送る設定 after を持つ） */
  sections: readonly Pick<ComposedSection, 'sectionKey' | 'label' | 'after'>[];
}

/**
 * 実行する項目ごとに、選んだ変更の場所と、反映後にそこにあるはずの値を控える。
 * - 通常: 選んだ変更。値は送る設定の同じ場所（入力欄で直した値を含む）。
 * - JSON で直した項目: 反映先の現在の値と違う変更の場所（compose の数え方と同じ）。値は JSON の同じ場所。
 */
export function buildVerifyExpectations(input: BuildVerifyInput): VerifyExpectation[] {
  const out: VerifyExpectation[] = [];
  for (const section of input.sections) {
    const model = own(input.session.models, section.sectionKey) ? input.session.models[section.sectionKey] : undefined;
    if (!model) continue;
    const jsonMode = input.session.states[section.sectionKey]?.json !== undefined;
    const chosen = input.session.selected[section.sectionKey] ?? new Set<string>();
    for (const change of model.changes) {
      const isOrder = change.pointer.endsWith(ORDER_SUFFIX);
      const tokens = parsePointer(isOrder ? change.pointer.slice(0, -ORDER_SUFFIX.length) : change.pointer);
      const value = getAt(section.after, tokens);
      if (jsonMode ? isOrder || sameValue(value, change.before) : !chosen.has(change.id)) continue;
      const place = `${model.label} / ${describePath(change)}`;
      const base = { id: change.id, sectionKey: section.sectionKey, sectionLabel: model.label, place, pointer: change.pointer, kind: change.kind };
      if (isOrder) {
        const names = isPlainObject(value) ? orderedNames(value) : [];
        out.push({ ...base, check: 'order', expected: names, expectedText: names.join(' → '), edited: false });
      } else if (section.sectionKey === 'pluginSettings' && tokens.length === 2 && tokens[0] === 'plugins') {
        out.push({ ...base, check: 'member', expected: change.after, expectedText: formatVerifyValue(change.after), edited: false });
      } else {
        out.push({ ...base, check: 'value', expected: cloneJson(value), expectedText: formatVerifyValue(value), edited: !sameValue(value, change.after) });
      }
    }
  }
  return out;
}

// =============================================================================
// 判定
// =============================================================================

/** JS/CSS の fileKey は取得したアプリの外では使えない（反映先へアップロードし直す）ため、ファイル名だけで比べる。 */
function comparable(sectionKey: string, value: unknown): unknown {
  if (sectionKey !== 'customizeSettings') return value;
  const visit = (node: any): any => {
    if (Array.isArray(node)) return node.map(visit);
    if (!isPlainObject(node)) return node;
    if (node.type === 'FILE' && isPlainObject(node.file)) return { type: 'FILE', file: { name: node.file.name } };
    return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, visit(child)]));
  };
  return visit(value);
}

const isScalar = (value: unknown): value is string | number | boolean | null => value === null || ['string', 'number', 'boolean'].includes(typeof value);

/**
 * current が expected を満たすか。オブジェクトは expected のキーだけを調べ（kintone が足す既定値などの余分なキーは許す）、
 * 配列は要素ごとに同じ位置で比べる。数値と文字列は、同じ表記なら同じ値とみなす（kintone は数値を文字列で返すことがある）。
 */
export function satisfiesExpected(expected: unknown, current: unknown): boolean {
  if (expected === undefined || expected === null) return current === undefined || current === null;
  if (Array.isArray(expected)) return Array.isArray(current) && current.length === expected.length && expected.every((item, index) => satisfiesExpected(item, current[index]));
  if (isPlainObject(expected)) return isPlainObject(current) && Object.keys(expected).every((key) => satisfiesExpected(expected[key], own(current, key) ? current[key] : undefined));
  if (isScalar(expected) && isScalar(current) && typeof expected !== typeof current) {
    return (typeof expected === 'boolean' || typeof current === 'boolean') ? false : String(expected) === String(current);
  }
  return expected === current;
}

/** 反映後に読み取った 1 項目の設定（ok: false は取得失敗・読み取れなかった理由）。 */
export type VerifyRead = { ok: true; value: unknown } | { ok: false; message: string };

export interface VerifyMismatch {
  sectionKey: string;
  sectionLabel: string;
  place: string;
  kind: SelectableKind;
  expectedText: string;
  currentText: string;
}

export interface VerifyUnknown {
  sectionKey: string;
  sectionLabel: string;
  /** 確認できなかった変更の数 */
  count: number;
  reason: string;
}

export interface SourceVerifyResult {
  /** 確認した日時（ISO 8601） */
  checkedAt: string;
  /** 読み取った設定（本番まで反映したなら本番、プレビューまでならプレビュー） */
  side: VerifySide;
  /** 確認の対象にした変更（選んだ変更）の数 */
  total: number;
  /** 意図した値で反映されていた数 */
  reflected: number;
  /** 反映されていなかった変更 */
  mismatches: VerifyMismatch[];
  /** 確認できなかった変更（項目単位。取得失敗など） */
  unknown: VerifyUnknown[];
  unknownCount: number;
  /** 修正した値（入力欄・JSON）の数と、そのうち意図した値になっていた数 */
  editedTotal: number;
  editedReflected: number;
  /** 比べ方の注意（JS/CSS はファイル名だけを比べる、など） */
  notes: string[];
}

export type VerifyState = 'all' | 'mismatch' | 'unknown';

/** all: 選んだ変更はすべて反映されている / mismatch: 反映されていない変更がある / unknown: 反映されていない変更は見つからないが、確認できない変更がある（または確認する変更が無い） */
export function verifyState(result: Pick<SourceVerifyResult, 'mismatches' | 'unknownCount' | 'total'>): VerifyState {
  if (result.mismatches.length) return 'mismatch';
  return result.unknownCount > 0 || result.total === 0 ? 'unknown' : 'all';
}

const firstLine = (text: string) => String(text || '').split('\n')[0].trim();

/** 控えた期待する内容と、反映後に読み取った設定を比べる。読み取れなかった項目は「確認できません」にする。 */
export function compareVerifyExpectations(
  expectations: readonly VerifyExpectation[],
  read: Readonly<Record<string, VerifyRead | undefined>>,
  meta: { checkedAt: string; side: VerifySide }
): SourceVerifyResult {
  const result: SourceVerifyResult = { checkedAt: meta.checkedAt, side: meta.side, total: expectations.length, reflected: 0, mismatches: [], unknown: [], unknownCount: 0, editedTotal: 0, editedReflected: 0, notes: [] };
  const unknownBySection = new Map<string, VerifyUnknown>();
  for (const item of expectations) {
    if (item.edited) result.editedTotal += 1;
    const section = own(read, item.sectionKey) ? read[item.sectionKey] : undefined;
    if (!section || section.ok === false) {
      const reason = section && section.ok === false ? firstLine(section.message) || '設定を取得できませんでした' : '設定を読み取れませんでした';
      const entry = unknownBySection.get(item.sectionKey) ?? { sectionKey: item.sectionKey, sectionLabel: item.sectionLabel, count: 0, reason };
      entry.count += 1;
      unknownBySection.set(item.sectionKey, entry);
      result.unknownCount += 1;
      continue;
    }
    const current = comparable(item.sectionKey, section.value);
    const tokens = parsePointer(item.check === 'order' ? item.pointer.slice(0, -ORDER_SUFFIX.length) : item.pointer);
    const found = getAt(current, tokens);
    let currentText: string;
    let reflected: boolean;
    if (item.check === 'member') {
      const list = isPlainObject(current) && Array.isArray(current.plugins) ? current.plugins : [];
      reflected = list.includes(item.expected);
      currentText = reflected ? formatVerifyValue(item.expected) : '（一覧にありません）';
    } else if (item.check === 'order') {
      const expectedNames = item.expected as string[];
      const container = isPlainObject(found) ? found : {};
      // 反映先にあるものどうしの並びだけを比べる（片方にしか無いものは並びに関係しない）
      const currentOrder = orderedNames(container).filter((name) => expectedNames.includes(name));
      const expectedOrder = expectedNames.filter((name) => own(container, name));
      reflected = sameValue(currentOrder, expectedOrder);
      currentText = currentOrder.join(' → ') || '（なし）';
    } else {
      reflected = satisfiesExpected(comparable(item.sectionKey, item.expected), found);
      currentText = formatVerifyValue(found);
    }
    if (reflected) {
      result.reflected += 1;
      if (item.edited) result.editedReflected += 1;
    } else {
      result.mismatches.push({ sectionKey: item.sectionKey, sectionLabel: item.sectionLabel, place: item.place, kind: item.kind, expectedText: item.expectedText, currentText });
    }
  }
  result.unknown = [...unknownBySection.values()];
  if (expectations.some((item) => item.sectionKey === 'customizeSettings')) result.notes.push('JS/CSS はファイル名で確認しています（ファイルの中身は比べていません）。');
  return result;
}

// =============================================================================
// 画面・記録の文言
// =============================================================================

export interface VerifyMessage { text: string; tone: 'ok' | 'warn' | 'err' }

/**
 * 確認結果の 1 文（画面・記録・結果 JSON で共通）。
 * 「反映されています」と言えるのは、確認した変更がすべて意図した値だったときだけ。確認できなかった変更があれば言わない。
 */
export function describeVerifyResult(result: Pick<SourceVerifyResult, 'mismatches' | 'unknownCount' | 'total' | 'reflected' | 'editedTotal' | 'editedReflected' | 'side'>): VerifyMessage {
  const where = result.side === 'production' ? '本番' : '反映先のプレビュー';
  const state = verifyState(result);
  if (state === 'all') {
    return { text: `選んだ ${result.total} 件はすべて反映されています（${where}の設定を確認しました${result.editedTotal ? `。修正した値 ${result.editedTotal} 件も、その値になっています` : ''}）。`, tone: 'ok' };
  }
  if (state === 'mismatch') {
    const unknown = result.unknownCount ? `確認できなかった変更 ${result.unknownCount} 件。` : '';
    return { text: `反映されていない変更 ${result.mismatches.length} 件（選んだ ${result.total} 件中。${where}の設定を確認しました）。${unknown}`, tone: 'err' };
  }
  if (result.total === 0) return { text: '確認できる変更がありませんでした。選んだ変更を確認できません。', tone: 'warn' };
  return { text: `確認できません。選んだ ${result.total} 件のうち ${result.unknownCount} 件の内容を確認できませんでした（確認できた ${result.reflected} 件は反映されています）。「反映されています」とは言えないため、アプリの設定画面で確認してください。`, tone: 'warn' };
}

/** 確認できる結果か（本番まで反映が成功した、または完了を確認できない。プレビューまでなら、すべての項目を書き込めた）。確認する側を返す（できなければ null）。 */
export function verifySideFor(result: Pick<SourceDeployResult, 'goal' | 'apply' | 'deploy'>, goal: SourceDeployGoal = result.goal): VerifySide | null {
  if (result.apply.cancelled) return null;
  if (goal === 'production') {
    const status = result.deploy?.apps[0]?.status;
    return status === 'success' || status === 'unknown' ? 'production' : null;
  }
  return previewWriteState(result.apply.sections) === 'all' ? 'preview' : null;
}
