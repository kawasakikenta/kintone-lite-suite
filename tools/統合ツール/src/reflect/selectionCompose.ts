'use strict';

/**
 * 選んだ変更と修正から、送る設定（after'）と計画を作り直す（純粋関数）。取り決めは reflect/selectionTypes.ts を参照。
 */

import type { ReflectSectionPlan } from './standalonePlan.js';
import type { ComposedSection, SectionSelectionModel, SectionSelectionState } from './selectionTypes.js';
import { NAME_CONTAINERS, ORDERED_CONTAINERS, ORDER_SUFFIX, orderedNames } from './selectionModel.js';
import { buildPlanFromComposedAfter, checkComposedAgainstPlan } from './selectionPlan.js';
import { cloneJson, deleteAt, getAt, isPlainObject, own, parsePointer, pointerOf, pointerWithin, sameValue, setAt, setOwn } from './selectionPointer.js';

/** 既定の選択（すべての変更を選び、修正なし）。 */
export function defaultSelectionState(model: SectionSelectionModel): SectionSelectionState {
  return { selected: model.changes.map(change => change.id), overrides: {} };
}

interface RenumberContext {
  model: SectionSelectionModel;
  /** 選んだ変更の pointer（並び順の変更は `${入れ物}#order`） */
  selectedPointers: string[];
  jsonMode: boolean;
}

/**
 * 名前付きの入れ物の表示順（index）を 0 から振り直す。選んだ結果の並びは、既定の反映後の順、そこに無いものは反映先の順。
 * 何も選んでいない入れ物は触らない（何も選ばなければ反映先のまま）。並び順の変更を選んでいないときは、反映先にあるものの順を保つ。
 * JSON で直した場合は、JSON の index の順を保ち、名前が増減した入れ物と index が重複・欠落した入れ物だけ振り直す。
 */
function renumberOrdered(root: any, ctx: RenumberContext): void {
  const processContainer = (tokens: string[], container: Record<string, any>) => {
    const elements = Object.values(container);
    if (!elements.length || !elements.every(isPlainObject)) return;
    const pointer = pointerOf(tokens);
    const beforeContainer = getAt(ctx.model.before, tokens), defaultContainer = getAt(ctx.model.after, tokens);
    let sequence: string[];
    if (ctx.jsonMode) {
      const indexes = elements.map(element => element.index);
      const duplicated = new Set(indexes.map(String)).size !== indexes.length || indexes.some(index => index === undefined || index === null || index === '' || !Number.isFinite(Number(index)));
      const sameNames = isPlainObject(beforeContainer) && sameValue(Object.keys(container).sort(), Object.keys(beforeContainer).sort());
      if (sameNames && !duplicated) return;
      sequence = orderedNames(container);
    } else {
      const touched = ctx.selectedPointers.some(selected => selected.startsWith(`${pointer}/`) || selected === `${pointer}${ORDER_SUFFIX}`);
      if (!touched) return;
      const orderChange = ctx.model.changes.some(change => change.pointer === `${pointer}${ORDER_SUFFIX}`);
      const orderSelected = ctx.selectedPointers.includes(`${pointer}${ORDER_SUFFIX}`);
      const beforeNames = isPlainObject(beforeContainer) ? orderedNames(beforeContainer) : [], defaultNames = isPlainObject(defaultContainer) ? orderedNames(defaultContainer) : [];
      const [first, second] = !orderChange || orderSelected ? [defaultNames, beforeNames] : [beforeNames, defaultNames];
      const names = Object.keys(container);
      const seen = new Set<string>();
      sequence = [];
      for (const name of [...first, ...second, ...names]) if (own(container, name) && !seen.has(name)) { seen.add(name); sequence.push(name); }
    }
    sequence.forEach((name, position) => setOwn(container[name], 'index', String(position)));
  };
  const visit = (value: any, tokens: string[], namesLevel: boolean) => {
    if (!isPlainObject(value)) return;
    if (namesLevel) {
      for (const [name, element] of Object.entries(value)) visit(element, [...tokens, name], false);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (!NAME_CONTAINERS.has(key) || !isPlainObject(child)) continue;
      const childTokens = [...tokens, key];
      if (ORDERED_CONTAINERS.has(key)) processContainer(childTokens, child);
      visit(child, childTokens, true);
    }
  };
  visit(root, [], false);
}

/** 選んだ変更と修正から、送る設定と計画を作り直す（純粋関数）。plan は抽出時の既定の計画。 */
export function composeSectionSelection(model: SectionSelectionModel, state: SectionSelectionState, plan: ReflectSectionPlan, fieldLabels: Record<string, string> = {}): ComposedSection {
  const errors: string[] = [];
  const changeById = new Map(model.changes.map(change => [change.id, change]));
  const selectedIds = new Set((state.selected || []).filter(id => changeById.has(id)));
  const selected = model.changes.filter(change => selectedIds.has(change.id));
  let after: any;
  let editedCount = 0;
  let selectedCount = selected.length;
  const jsonMode = state.json !== undefined;
  if (jsonMode) {
    if (!model.jsonEditable) { errors.push(`${model.label}は JSON では直せません。入力欄と選択で直してください。`); after = cloneJson(model.before); }
    else if (!isPlainObject(state.json)) { errors.push('JSON はオブジェクトである必要があります（反映後の設定全体を JSON で指定してください）。'); after = cloneJson(model.before); }
    else after = cloneJson(state.json);
    const applied = model.changes.filter(change => !change.pointer.endsWith(ORDER_SUFFIX) && sameValue(getAt(after, parsePointer(change.pointer)), change.after));
    selectedCount = applied.length;
    const diverged = model.changes.filter(change => !change.pointer.endsWith(ORDER_SUFFIX) && !sameValue(getAt(after, parsePointer(change.pointer)), change.after) && !sameValue(getAt(after, parsePointer(change.pointer)), change.before));
    editedCount = Math.max(1, diverged.length);
  } else {
    after = cloneJson(model.before);
    for (const change of selected) {
      if (change.pointer.endsWith(ORDER_SUFFIX)) continue;
      const tokens = parsePointer(change.pointer);
      if (change.after === undefined) deleteAt(after, tokens); else setAt(after, tokens, cloneJson(change.after));
    }
    // 入力欄での修正。選んだ変更の範囲の pointer だけ受け付け、範囲外は無視する。
    for (const [pointer, value] of Object.entries(state.overrides || {})) {
      if (value === undefined || typeof pointer !== 'string' || !pointer.startsWith('/')) continue;
      if (!selected.some(change => !change.pointer.endsWith(ORDER_SUFFIX) && pointerWithin(pointer, change.pointer))) continue;
      const tokens = parsePointer(pointer);
      const current = getAt(after, tokens);
      const next = typeof current === 'number' && typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : value;
      if (sameValue(current, next)) continue;
      setAt(after, tokens, cloneJson(next));
      editedCount += 1;
    }
    // 片方だけでは kintone が受け付けない組（例: 選択肢の追加と、その選択肢を初期値にする変更）は、一緒に選ぶ必要がある。
    for (const change of selected) for (const id of change.requires || []) {
      const required = changeById.get(id);
      if (required && !selectedIds.has(id)) errors.push(`「${change.labelPath.join(' › ')}」を反映するには、「${required.labelPath.join(' › ')}」も一緒に選んでください。`);
    }
  }
  renumberOrdered(after, { model, selectedPointers: selected.map(change => change.pointer), jsonMode });
  for (const issue of checkComposedAgainstPlan(plan, after, fieldLabels)) if (!errors.includes(issue)) errors.push(issue);
  const composedPlan = buildPlanFromComposedAfter(plan, after, fieldLabels);
  return { sectionKey: model.sectionKey, label: model.label, after, plan: composedPlan, selectedCount, totalCount: model.changes.length, editedCount, errors };
}
