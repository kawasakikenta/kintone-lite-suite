'use strict';

/**
 * 項目をまたぐ選択の連動（requires）。
 * 計算式（expression）や、一覧・グラフ・アクション・レコード権限・通知などの条件（filterCond）・並び順（sort）は、
 * 反映先に無く反映元にだけあるフィールドを参照することがある。そのフィールドの追加（フィールド設定の変更）を選ばないと、
 * kintone は書き込みを拒否する。参照する変更を選ぶときに、その追加も一緒に選ぶよう requires に付ける。
 *
 * 参照とみなすのは、どちらかのアプリに実在するフィールドコードと一致した語だけ（kintone-query.ts）。DOM 非依存の純粋関数。
 */

import { extractExpressionFieldCodes, extractQueryFieldCodes } from '../kintone-query.js';
import type { SectionSelectionModel, SelectableChange } from './selectionTypes.js';
import { isPlainObject, parsePointer } from './selectionPointer.js';

/** 条件（クエリ）として読む設定のキー。フィールド設定の中のキー（ルックアップの絞り込みなど）は反映先のフィールドを指さないため対象外。 */
const QUERY_KEYS: ReadonlySet<string> = new Set(['filterCond', 'sort']);

/** 反映先に追加されるフィールドのコード → その追加の変更 ID。テーブルごと追加するときは、テーブル内のフィールドも同じ変更に対応する。 */
function addedFieldChanges(model: SectionSelectionModel | undefined): Map<string, string> {
  const added = new Map<string, string>();
  if (!model) return added;
  for (const change of model.changes) {
    if (!change.whole || change.kind !== '追加') continue;
    const tokens = parsePointer(change.pointer);
    const isField = tokens[0] === 'properties' && (tokens.length === 2 || (tokens.length === 4 && tokens[2] === 'fields'));
    if (!isField) continue;
    added.set(tokens[tokens.length - 1], change.id);
    if (isPlainObject(change.after) && change.after.type === 'SUBTABLE' && isPlainObject(change.after.fields)) {
      for (const child of Object.keys(change.after.fields)) added.set(child, change.id);
    }
  }
  return added;
}

/** 変更の値（leaf でも、まとまりごとの追加・配列でも）に含まれる、計算式・条件が参照するフィールドコード。 */
function referencedCodes(change: SelectableChange, known: ReadonlySet<string>): string[] {
  const found = new Set<string>();
  const inFieldSettings = change.sectionKey === 'fieldSettings';
  const visit = (value: unknown, key: string) => {
    if (typeof value === 'string') {
      if (key === 'expression') for (const code of extractExpressionFieldCodes(value, known)) found.add(code);
      else if (!inFieldSettings && QUERY_KEYS.has(key)) for (const code of extractQueryFieldCodes(value, known)) found.add(code);
      return;
    }
    if (Array.isArray(value)) { for (const item of value) visit(item, key); return; }
    if (!isPlainObject(value)) return;
    for (const [childKey, child] of Object.entries(value)) {
      // ルックアップ・関連レコード一覧の中は、関連付けた別アプリのフィールド（このアプリの参照ではない）
      if (inFieldSettings && (childKey === 'lookup' || childKey === 'referenceTable')) continue;
      visit(child, childKey);
    }
  };
  const tokens = parsePointer(change.pointer);
  visit(change.after, tokens[tokens.length - 1] ?? '');
  return [...found];
}

/**
 * 計算式・条件が参照する、反映先に追加されるフィールドがあるとき、その追加の変更を requires に付ける（既にある requires は残す）。
 * models は項目の順を問わない。追加されるフィールドは fieldSettings の変更から求める。
 */
export function attachFieldAdditionRequires(models: Record<string, SectionSelectionModel | undefined>, knownFieldCodes: ReadonlySet<string> | readonly string[]): void {
  const known = knownFieldCodes instanceof Set ? knownFieldCodes : new Set(knownFieldCodes);
  if (!known.size) return;
  const added = addedFieldChanges(models.fieldSettings);
  if (!added.size) return;
  for (const model of Object.values(models)) {
    if (!model) continue;
    for (const change of model.changes) {
      if (change.after === undefined) continue;
      for (const code of referencedCodes(change, known)) {
        const required = added.get(code);
        if (!required || required === change.id) continue;
        change.requires = [...new Set([...(change.requires || []), required])];
      }
    }
  }
}
