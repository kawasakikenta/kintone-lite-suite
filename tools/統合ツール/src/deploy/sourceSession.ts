'use strict';

/**
 * 「反映元アプリから本番へ」の差分の選択・修正の状態（DOM 非依存）。
 * 差分の抽出結果（PreviewReflectResult）から項目ごとの選択モデルを作り、選択・入力欄の修正・JSON の修正を
 * 状態に反映して、選択のたびに送る設定と計画を作り直す。エンジン（selection.ts / reflect-standalone.ts）は deps で差し替えられる。
 */

import { buildSectionSelectionModel, defaultSelectionState } from '../reflect/selection.js';
import { composeReflectSelectionStandalone, type PreviewReflectResult, type ReflectIdentities, type ReflectOptions } from '../tabs/reflect-standalone.js';
import type { ComposedReflectSelection, SectionSelectionModel, SectionSelectionState, SelectableChange } from '../reflect/selectionTypes.js';
import { buildRequirementIndex, dependentsToDeselect, requiredToSelect, type RequirementIndex } from './sourceDisplay.js';
import type { SourceEnvironment } from './sourceReport.js';

export interface SourceSessionDeps {
  buildModel: typeof buildSectionSelectionModel;
  defaultState: typeof defaultSelectionState;
  compose: typeof composeReflectSelectionStandalone;
}

export const REAL_SOURCE_SESSION_DEPS: SourceSessionDeps = {
  buildModel: buildSectionSelectionModel,
  defaultState: defaultSelectionState,
  compose: composeReflectSelectionStandalone
};

export interface SourceSession {
  /** 抽出のたびに増える番号（確認の鮮度判定に使う） */
  id: number;
  /** 差分の抽出に使った入力の署名（buildSourceSetupSignature） */
  signature: string;
  /** 抽出に使った項目（順序つき）。画面で外した項目も、ここには残る */
  scopes: string[];
  /** 抽出に使ったオプション（scopes は抽出時のもの） */
  opts: ReflectOptions;
  identities: ReflectIdentities;
  sourceEnvironment: SourceEnvironment;
  preview: PreviewReflectResult;
  fieldLabels: Record<string, string>;
  models: Record<string, SectionSelectionModel>;
  /** 選択モデルを作れなかった項目の理由 */
  modelErrors: Record<string, string>;
  states: Record<string, SectionSelectionState>;
  /** 選択中の変更 ID（states[].selected の実体。作り直しの直前に states へ書き戻す） */
  selected: Record<string, Set<string>>;
  index: RequirementIndex;
  composed: ComposedReflectSelection | null;
  composeError: string;
  extractedAt: number;
}

let sessionSeq = 0;

export interface CreateSessionInput {
  signature: string;
  opts: ReflectOptions;
  identities: ReflectIdentities;
  sourceEnvironment: SourceEnvironment;
  preview: PreviewReflectResult;
}

export function createSourceSession(input: CreateSessionInput, deps: SourceSessionDeps = REAL_SOURCE_SESSION_DEPS): SourceSession {
  const { preview } = input;
  const fieldLabels = preview.fieldLabels || {};
  const models: Record<string, SectionSelectionModel> = {};
  const modelErrors: Record<string, string> = {};
  const states: Record<string, SectionSelectionState> = {};
  const selected: Record<string, Set<string>> = {};
  for (const entry of preview.entries) {
    if (entry.status !== 'change') continue;
    try {
      const model = deps.buildModel(entry, fieldLabels);
      if (!model) continue;
      models[entry.sectionKey] = model;
      states[entry.sectionKey] = deps.defaultState(model);
      selected[entry.sectionKey] = new Set(states[entry.sectionKey].selected);
    } catch (error: any) {
      modelErrors[entry.sectionKey] = String(error?.message || error || '不明なエラー');
    }
  }
  return {
    id: ++sessionSeq,
    signature: input.signature,
    scopes: [...input.opts.scopes],
    opts: input.opts,
    identities: input.identities,
    sourceEnvironment: input.sourceEnvironment,
    preview,
    fieldLabels,
    models,
    modelErrors,
    states,
    selected,
    index: buildRequirementIndex(Object.values(models)),
    composed: null,
    composeError: '',
    extractedAt: Date.now()
  };
}

/** 選んだ変更と修正から、送る設定と計画を作り直す。activeScopes は反映する項目（抽出時の項目の部分集合）。 */
export function recomposeSession(session: SourceSession, activeScopes: readonly string[], deps: SourceSessionDeps = REAL_SOURCE_SESSION_DEPS): void {
  const active = new Set(activeScopes);
  const states: Record<string, SectionSelectionState> = {};
  for (const [key, model] of Object.entries(session.models)) {
    if (!active.has(key)) continue;
    const state = session.states[key];
    // 選択の実体（Set）を、モデルの順の配列として状態へ書き戻す
    state.selected = model.changes.filter((change) => session.selected[key].has(change.id)).map((change) => change.id);
    states[key] = state;
  }
  try {
    session.composed = deps.compose({ ...session.preview, entries: session.preview.entries.filter((entry) => active.has(entry.sectionKey)) }, states);
    session.composeError = '';
  } catch (error: any) {
    session.composed = null;
    session.composeError = String(error?.message || error || '不明なエラー');
  }
}

export function isChangeSelected(session: SourceSession, change: Pick<SelectableChange, 'id' | 'sectionKey'>): boolean {
  return !!session.selected[change.sectionKey]?.has(change.id);
}

export function selectedCount(session: SourceSession, sectionKey: string): number {
  return session.selected[sectionKey]?.size ?? 0;
}

export interface SelectionResult {
  /** 実際に状態が変わった変更の ID（連動した分を含む） */
  changed: string[];
  /** 選ぶために一緒に選んだ変更（requires） */
  required: string[];
  /** 外したために一緒に外した変更（requires を持つ変更） */
  cascaded: string[];
}

/** 変更を選ぶ／外す。選ぶときは requires を一緒に選び、外すときはそれを必要とする変更も外す。 */
export function applySelection(session: SourceSession, ids: readonly string[], on: boolean): SelectionResult {
  const result: SelectionResult = { changed: [], required: [], cascaded: [] };
  const bySection = (id: string) => session.index.byId.get(id)?.sectionKey || '';
  const flat = new Set<string>();
  for (const set of Object.values(session.selected)) for (const id of set) flat.add(id);
  const mutate = (id: string, value: boolean): boolean => {
    const set = session.selected[bySection(id)];
    if (!set) return false;
    if (value === set.has(id)) return false;
    if (value) { set.add(id); flat.add(id); } else { set.delete(id); flat.delete(id); }
    result.changed.push(id);
    return true;
  };
  const targets = ids.filter((id) => session.index.byId.has(id));
  if (on) {
    result.required = requiredToSelect(targets, session.index, flat);
    for (const id of [...targets, ...result.required]) mutate(id, true);
  } else {
    const cascade = dependentsToDeselect(targets, session.index, flat);
    for (const id of [...targets, ...cascade]) mutate(id, false);
    result.cascaded = cascade;
  }
  return result;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** 入力欄の修正を保存する。既定の値に戻したときは修正を消す。 */
export function setOverride(session: SourceSession, sectionKey: string, pointer: string, value: unknown, defaultValue: unknown): void {
  const state = session.states[sectionKey];
  if (!state) return;
  if (same(value, defaultValue)) delete state.overrides[pointer]; else state.overrides[pointer] = value;
}

export function clearOverrides(session: SourceSession, sectionKey: string): void {
  const state = session.states[sectionKey];
  if (state) state.overrides = {};
}

export function hasOverride(session: SourceSession, sectionKey: string, pointer: string): boolean {
  return !!session.states[sectionKey] && Object.prototype.hasOwnProperty.call(session.states[sectionKey].overrides, pointer);
}

/** JSON での修正を設定（undefined で取り消す）。あれば選択・入力欄より優先される。 */
export function setJsonOverride(session: SourceSession, sectionKey: string, json: unknown): void {
  const state = session.states[sectionKey];
  if (!state) return;
  if (json === undefined) delete state.json; else state.json = json;
}

export function hasJsonOverride(session: SourceSession, sectionKey: string): boolean {
  return session.states[sectionKey]?.json !== undefined;
}
