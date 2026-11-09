'use strict';

/**
 * 計画（plan.values = { before, after }）を、設定値 1 つずつの変更（SelectableChange）に分解する。
 * 粒度の規則は reflect/selectionTypes.ts の先頭コメントを参照。DOM 非依存の純粋関数。
 */

import type { ReflectSectionPlan } from './standalonePlan.js';
import type { SectionSelectionModel, SelectableChange, SelectableEditable, SelectableEditor } from './selectionTypes.js';
import { describeValue, describeWholeElement, fieldDisplayName, keyLabel, selectOptionsFor, type TextContext } from './selectionLabels.js';
import { cloneJson, escapePointerToken, getAt, isPlainObject, own, parsePointer, pointerOf, sameValue } from './selectionPointer.js';

/** 名前（フィールドコード・一覧名・選択肢など）をキーにした入れ物。要素が片方にしか無いときは要素ごと 1 つの変更にする。 */
export const NAME_CONTAINERS: ReadonlySet<string> = new Set(['properties', 'fields', 'views', 'reports', 'actions', 'states', 'categories', 'options', 'children']);
/** 要素が表示順（index）を持つ入れ物。index は利用者が選ばず、選んだ結果から振り直す。 */
export const ORDERED_CONTAINERS: ReadonlySet<string> = new Set(['views', 'reports', 'actions', 'states', 'categories', 'options', 'children']);
/** 中の値どうしが組で意味を持つため、1 つの値として扱うキー。 */
const ATOMIC_KEYS: ReadonlySet<string> = new Set(['lookup', 'referenceTable', 'titleField', 'assignee', 'periodicReport', 'destApp']);
/** 追加する要素の主な値として入力欄に出さないキー */
const NOT_EDITABLE_KEYS: ReadonlySet<string> = new Set(['code', 'type', 'index', 'id', 'name']);

export const ORDER_SUFFIX = '#order';

type Kind = 'key' | 'name';

interface Walker {
  sectionKey: string;
  before: any;
  after: any;
  ctx: TextContext;
  out: SelectableChange[];
}

const NOTES: Record<string, string> = {
  layoutSettings: 'レイアウトは全体で選びます（配置は部分的に選べません）。',
  customizeSettings: 'JS/CSS は適用範囲と、PC・モバイルの JS・CSS の一覧ごとに選びます（一覧の中のファイルは個別には選べません）。',
  appAcl: 'アクセス権は一覧全体で選びます（行ごとには選べません）。',
  fieldAcl: 'アクセス権は一覧全体で選びます（行ごとには選べません）。',
  recordPermissions: 'アクセス権は一覧全体で選びます（行ごとには選べません）。',
  notifications: '通知は一覧全体で選びます（1 件ごとには選べません）。',
  perRecordNotifications: '通知は一覧全体で選びます（1 件ごとには選べません）。',
  reminderNotifications: '通知は一覧全体で選びます（1 件ごとには選べません）。',
  pluginSettings: 'プラグインは 1 つずつ選びます。反映先に無いプラグインだけを追加し、プラグイン固有の設定はコピーしません。'
};

function groupLength(sectionKey: string, tokens: readonly string[]): number {
  switch (sectionKey) {
    case 'fieldSettings':
      if (tokens[0] !== 'properties' || tokens.length < 2) return 1;
      return tokens[2] === 'fields' && tokens.length >= 4 ? 4 : 2;
    case 'viewSettings': case 'reportSettings': case 'actionSettings': return tokens.length >= 2 ? 2 : 1;
    case 'processSettings': return tokens[0] === 'states' && tokens.length >= 2 ? 2 : 1;
    case 'categories': {
      if (tokens[0] !== 'categories' || tokens.length < 2) return 1;
      let length = 2;
      while (tokens[length] === 'children' && tokens.length >= length + 2) length += 2;
      return length;
    }
    case 'customizeSettings': return (tokens[0] === 'desktop' || tokens[0] === 'mobile') && tokens.length >= 2 ? 2 : 1;
    default: return 1;
  }
}

function groupLabelOf(w: Walker, tokens: readonly string[]): string {
  const { sectionKey } = w;
  const hint = (path: string[]) => {
    const fromAfter = getAt(w.after, [...path, 'label']), fromBefore = getAt(w.before, [...path, 'label']);
    return typeof fromAfter === 'string' && fromAfter ? fromAfter : typeof fromBefore === 'string' ? fromBefore : undefined;
  };
  if (sectionKey === 'fieldSettings' && tokens[0] === 'properties' && tokens.length >= 2) {
    const table = fieldDisplayName(tokens[1], w.ctx.fieldLabels, hint(tokens.slice(0, 2) as string[]));
    if (tokens.length >= 4 && tokens[2] === 'fields') return `${table} › ${fieldDisplayName(tokens[3], w.ctx.fieldLabels, hint(tokens.slice(0, 4) as string[]))}`;
    return table;
  }
  if (['viewSettings', 'reportSettings', 'actionSettings'].includes(sectionKey) && tokens.length >= 2) return tokens[1];
  if (sectionKey === 'processSettings' && tokens[0] === 'states' && tokens.length >= 2) return tokens[1];
  if (sectionKey === 'categories' && tokens[0] === 'categories' && tokens.length >= 2) return tokens.filter((_token, index) => index % 2 === 1).join(' › ');
  if (sectionKey === 'customizeSettings' && (tokens[0] === 'desktop' || tokens[0] === 'mobile') && tokens.length >= 2) return `${tokens[0] === 'desktop' ? 'PC' : 'モバイル'} の ${tokens[1].toUpperCase()}`;
  return keyLabel(sectionKey, tokens[0] ?? '');
}

function locate(w: Walker, tokens: readonly string[], kinds: readonly Kind[]): { groupTokens: string[]; groupLabel: string; labelPath: string[] } {
  const length = Math.min(groupLength(w.sectionKey, tokens), tokens.length);
  const groupLabel = groupLabelOf(w, tokens.slice(0, length));
  const rest = tokens.slice(length).map((token, index) => kinds[length + index] === 'name' ? token : keyLabel(w.sectionKey, token));
  return { groupTokens: tokens.slice(0, length) as string[], groupLabel, labelPath: [groupLabel, ...rest] };
}

function editorFor(sectionKey: string, key: string, value: unknown): SelectableEditor | undefined {
  if (typeof value === 'boolean') return { type: 'boolean' };
  if (typeof value !== 'string') return undefined;
  const options = selectOptionsFor(sectionKey, key, value);
  return options ? { type: 'select', options } : { type: 'text' };
}

function editablesOf(w: Walker, pointer: string, tokens: readonly string[], kinds: readonly Kind[], afterValue: unknown, whole: boolean, labelPath: string[]): SelectableEditable[] {
  if (afterValue === undefined) return [];
  const editables: SelectableEditable[] = [];
  if (whole) {
    if (!isPlainObject(afterValue)) return [];
    const inOptions = tokens.includes('options');
    for (const [key, value] of Object.entries(afterValue)) {
      if (NOT_EDITABLE_KEYS.has(key) || (inOptions && key === 'label')) continue;
      const editor = editorFor(w.sectionKey, key, value);
      if (editor) editables.push({ pointer: `${pointer}/${escapePointerToken(key)}`, label: keyLabel(w.sectionKey, key), value, editor });
    }
    return editables;
  }
  const last = tokens[tokens.length - 1];
  if (kinds[kinds.length - 1] !== 'key' || ATOMIC_KEYS.has(last)) return [];
  const editor = editorFor(w.sectionKey, last, afterValue);
  if (editor) editables.push({ pointer, label: labelPath[labelPath.length - 1], value: afterValue, editor });
  return editables;
}

function emit(w: Walker, tokens: readonly string[], kinds: readonly Kind[], before: unknown, after: unknown, whole: boolean): void {
  const pointer = pointerOf(tokens);
  const { groupTokens, groupLabel, labelPath } = locate(w, tokens, kinds);
  const key = tokens[tokens.length - 1];
  const text = (value: unknown) => whole ? describeWholeElement(w.sectionKey, tokens, value, w.ctx) : describeValue(key, value, w.ctx);
  w.out.push({
    id: `${w.sectionKey}:${pointer}`, sectionKey: w.sectionKey, pointer, labelPath,
    groupId: `${w.sectionKey}:${pointerOf(groupTokens)}`, groupLabel,
    kind: before === undefined ? '追加' : after === undefined ? '削除' : '変更',
    before: cloneJson(before), after: cloneJson(after), beforeText: text(before), afterText: text(after), whole,
    editables: editablesOf(w, pointer, tokens, kinds, after, whole, labelPath)
  });
}

const indexOf = (value: any): number => { const number = Number(isPlainObject(value) ? value.index : NaN); return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER; };

/** 入れ物の要素名を表示順（index、同じなら元の並び）に並べる。 */
export function orderedNames(container: Record<string, any>): string[] {
  return Object.keys(container).map((name, position) => ({ name, position })).sort((a, b) => indexOf(container[a.name]) - indexOf(container[b.name]) || a.position - b.position).map(item => item.name);
}

function emitOrderChange(w: Walker, tokens: readonly string[], before: Record<string, any>, after: Record<string, any>): void {
  const common = (names: string[], other: Record<string, any>) => names.filter(name => own(other, name));
  const beforeOrder = common(orderedNames(before), after), afterOrder = common(orderedNames(after), before);
  if (afterOrder.length < 2 || sameValue(beforeOrder, afterOrder)) return;
  const kinds = tokens.map((): Kind => 'key');
  const { groupTokens, groupLabel, labelPath } = locate(w, tokens, kinds);
  const pointer = `${pointerOf(tokens)}${ORDER_SUFFIX}`;
  const joined = (names: string[]) => describeValue('', names.join(' → '), w.ctx);
  w.out.push({
    id: `${w.sectionKey}:${pointer}`, sectionKey: w.sectionKey, pointer, labelPath: [...labelPath, '並び順'],
    groupId: `${w.sectionKey}:${pointerOf(groupTokens)}`, groupLabel, kind: '変更',
    before: beforeOrder, after: afterOrder, beforeText: joined(beforeOrder), afterText: joined(afterOrder), whole: false, editables: []
  });
}

/**
 * プラグインの一覧（ID の配列）は、反映先に無い ID ごとの追加（whole）にする。反映先のプラグインを外す変更は出さない。
 * 変更の場所は `/plugins/{ID}`（配列の添字ではなく ID）。送る設定への反映は selectionCompose.ts が行う。
 */
function emitPluginAdditions(w: Walker, tokens: readonly string[], kinds: readonly Kind[], before: unknown[], after: unknown[]): void {
  const existing = new Set(before.filter((id): id is string => typeof id === 'string'));
  const seen = new Set<string>();
  for (const id of after) {
    if (typeof id !== 'string' || !id || existing.has(id) || seen.has(id)) continue;
    seen.add(id);
    emit(w, [...tokens, id], [...kinds, 'name'], undefined, id, true);
  }
}

function walkObject(w: Walker, before: Record<string, any>, after: Record<string, any>, tokens: string[], kinds: Kind[], containerKey: string | undefined, elementOf: string | undefined): void {
  const namesLevel = containerKey !== undefined;
  const keys = [...Object.keys(after), ...Object.keys(before).filter(key => !own(after, key))];
  for (const key of keys) {
    const bv = own(before, key) ? before[key] : undefined, av = own(after, key) ? after[key] : undefined;
    if (sameValue(bv, av)) continue;
    const childTokens = [...tokens, key];
    if (namesLevel) {
      const childKinds: Kind[] = [...kinds, 'name'];
      if (bv === undefined || av === undefined) emit(w, childTokens, childKinds, bv, av, true);
      else if (isPlainObject(bv) && isPlainObject(av)) walkObject(w, bv, av, childTokens, childKinds, undefined, containerKey);
      else emit(w, childTokens, childKinds, bv, av, false);
      continue;
    }
    const childKinds: Kind[] = [...kinds, 'key'];
    // 表示順は選ばない（選んだ結果から振り直す）。フィールドの種類・コードの違いは変更として出さない（既存の blockers で止まる）。
    if (key === 'index' && elementOf && ORDERED_CONTAINERS.has(elementOf)) continue;
    if (w.sectionKey === 'pluginSettings' && key === 'plugins' && (bv === undefined || Array.isArray(bv)) && Array.isArray(av)) {
      emitPluginAdditions(w, childTokens, childKinds, bv ?? [], av);
      continue;
    }
    if (w.sectionKey === 'fieldSettings' && (key === 'type' || key === 'code') && (elementOf === 'properties' || elementOf === 'fields')) continue;
    if (NAME_CONTAINERS.has(key) && isPlainObject(bv) && isPlainObject(av)) {
      if (ORDERED_CONTAINERS.has(key)) emitOrderChange(w, childTokens, bv, av);
      walkObject(w, bv, av, childTokens, childKinds, key, undefined);
    } else if (!ATOMIC_KEYS.has(key) && isPlainObject(bv) && isPlainObject(av)) walkObject(w, bv, av, childTokens, childKinds, undefined, undefined);
    else emit(w, childTokens, childKinds, bv, av, false);
  }
}

/** 選択肢の追加と、その選択肢を初期値にする変更のように、片方だけでは kintone が受け付けない組を requires に付ける。 */
function attachRequires(w: Walker): void {
  const byPointer = new Map(w.out.map(change => [change.pointer, change]));
  const require = (change: SelectableChange, other: SelectableChange | undefined) => {
    if (!other || other.id === change.id) return;
    change.requires = [...new Set([...(change.requires || []), other.id])];
  };
  for (const change of w.out) {
    const tokens = parsePointer(change.pointer);
    const last = tokens[tokens.length - 1];
    if (w.sectionKey === 'fieldSettings' && last === 'defaultValue' && tokens[0] === 'properties' && change.after !== undefined) {
      const fieldTokens = tokens.slice(0, -1);
      const values = Array.isArray(change.after) ? change.after : [change.after];
      const beforeOptions = getAt(w.before, [...fieldTokens, 'options']), afterOptions = getAt(w.after, [...fieldTokens, 'options']);
      if (!isPlainObject(afterOptions)) continue;
      for (const value of values) {
        if (typeof value !== 'string' || !own(afterOptions, value) || (isPlainObject(beforeOptions) && own(beforeOptions, value))) continue;
        require(change, byPointer.get(pointerOf([...fieldTokens, 'options', value])) ?? byPointer.get(pointerOf([...fieldTokens, 'options'])));
      }
    }
    if (w.sectionKey === 'processSettings' && change.pointer === '/actions' && Array.isArray(change.after)) {
      const beforeStates = getAt(w.before, ['states']), afterStates = getAt(w.after, ['states']);
      if (!isPlainObject(afterStates)) continue;
      for (const action of change.after) for (const name of [action?.from, action?.to]) {
        if (typeof name !== 'string' || !own(afterStates, name) || (isPlainObject(beforeStates) && own(beforeStates, name))) continue;
        require(change, byPointer.get(pointerOf(['states', name])));
      }
    }
  }
}

/** 計画（values を持つ）を、設定値 1 つずつの変更に分解する。values が無い・書き込めない項目は null。 */
export function buildSectionSelectionModel(plan: ReflectSectionPlan, fieldLabels: Record<string, string> = {}): SectionSelectionModel | null {
  if (!plan || (plan.status !== 'change' && plan.status !== 'same') || !plan.values) return null;
  const { before, after } = plan.values;
  if (!isPlainObject(before) || !isPlainObject(after)) return null;
  const w: Walker = {
    sectionKey: plan.sectionKey, before, after, out: [],
    ctx: { sectionKey: plan.sectionKey, fieldLabels, fileNames: plan.values.fileNames }
  };
  walkObject(w, before, after, [], [], undefined, undefined);
  attachRequires(w);
  return {
    sectionKey: plan.sectionKey, label: plan.label, before: cloneJson(before), after: cloneJson(after), changes: w.out,
    jsonEditable: plan.sectionKey !== 'customizeSettings' && plan.sectionKey !== 'pluginSettings',
    ...(NOTES[plan.sectionKey] ? { note: NOTES[plan.sectionKey] } : {})
  };
}
