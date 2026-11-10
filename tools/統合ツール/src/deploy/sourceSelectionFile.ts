'use strict';

/**
 * 「反映元アプリから本番へ」の、選んだ変更と修正の保存ファイル（DOM・API 非依存）。
 * 承認を待つ間や別の担当者への受け渡しのために、段階 2・3 の選択と修正を JSON で保存し、差分を抽出し直した後に読み込める。
 * 読み込みは carryOverSession（抽出し直したときの引き継ぎ）と同じ規則で、現在の抽出結果へ当てはめる。
 * JS/CSS の本文・バックアップ本体などは含めない（選択の ID・入力欄の値・JSON での修正だけ）。
 */

import { sameValue, stableJson } from '../reflect/selectionPointer.js';
import { carryOverSession, setJsonOverride, type CarryOverSummary, type SourceSession } from './sourceSession.js';
import type { SourceEnvironment } from './sourceReport.js';
import type { SourceDeployGoal } from './sourceTypes.js';

export const SELECTION_FILE_KIND = 'kintone-source-deploy-selection';
export const SELECTION_FILE_VERSION = 1;
/** 読み込める最大のサイズ（これを超えるファイルは読まずに拒否する）。 */
export const MAX_SELECTION_FILE_BYTES = 20 * 1024 * 1024;

export interface SelectionFileApp { appId: string; guestId: string; name: string }

export interface SelectionFileSection {
  sectionKey: string;
  label: string;
  /** 選んでいた変更の ID */
  selected: string[];
  /** 保存時に差分にあって、選んでいなかった変更の ID（読み込み先で「保存後に増えた変更」と見分けるために残す） */
  notSelected: string[];
  /** 入力欄での修正（pointer と値） */
  overrides: Array<{ pointer: string; value: unknown }>;
  /** JSON での修正。baseHash は、JSON の土台にした反映先の設定（保存時）の指紋 */
  json?: { baseHash: string; value: unknown };
}

export interface SelectionFile {
  kind: typeof SELECTION_FILE_KIND;
  version: typeof SELECTION_FILE_VERSION;
  createdAt: string;
  source: SelectionFileApp & { environment: SourceEnvironment };
  target: SelectionFileApp;
  /** 反映する項目（保存時の画面のチェック） */
  scopes: string[];
  preserveTargetOnly: boolean;
  lookupMap: Record<string, string>;
  goal: SourceDeployGoal;
  sections: SelectionFileSection[];
}

// =============================================================================
// 指紋（JSON の土台が変わっていないかの確認）
// =============================================================================

/** 設定の指紋（キー順に依存しない。同じ内容なら同じ値）。暗号用ではなく、土台の変化に気づくためのもの。 */
export function settingsFingerprint(value: unknown): string {
  const text = stableJson(value);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}:${text.length}`;
}

// =============================================================================
// 保存
// =============================================================================

export interface BuildSelectionFileInput {
  session: SourceSession;
  /** 反映する項目（段階 1 のチェック） */
  scopes: readonly string[];
  goal: SourceDeployGoal;
  createdAt: string;
}

/** 選んだ変更と修正の保存内容を組み立てる。選択モデルがある項目（差分のある項目）だけを含める。 */
export function buildSelectionFile(input: BuildSelectionFileInput): SelectionFile {
  const { session } = input;
  const sections: SelectionFileSection[] = [];
  for (const [sectionKey, model] of Object.entries(session.models)) {
    const state = session.states[sectionKey];
    const chosen = session.selected[sectionKey] ?? new Set<string>();
    const selected: string[] = [];
    const notSelected: string[] = [];
    for (const change of model.changes) (chosen.has(change.id) ? selected : notSelected).push(change.id);
    const section: SelectionFileSection = {
      sectionKey, label: model.label, selected, notSelected,
      overrides: Object.entries(state?.overrides || {}).map(([pointer, value]) => ({ pointer, value }))
    };
    if (state && state.json !== undefined) section.json = { baseHash: settingsFingerprint(model.before), value: state.json };
    sections.push(section);
  }
  const source = session.identities.source, target = session.identities.target;
  return {
    kind: SELECTION_FILE_KIND,
    version: SELECTION_FILE_VERSION,
    createdAt: input.createdAt,
    source: { appId: source.appId, guestId: source.guestId || '', name: source.name, environment: session.sourceEnvironment },
    target: { appId: target.appId, guestId: target.guestId || '', name: target.name },
    scopes: [...input.scopes],
    preserveTargetOnly: session.opts.preserveTargetOnly !== false,
    lookupMap: { ...(session.opts.lookupMap || {}) },
    goal: input.goal,
    sections
  };
}

export function stringifySelectionFile(file: SelectionFile): string {
  return JSON.stringify(file, null, 2);
}

/** 保存したファイルの内訳（画面の案内に使う）。 */
export function countSelectionFile(file: SelectionFile): { selected: number; overrides: number; jsonSections: number; sections: number } {
  return {
    selected: file.sections.reduce((sum, section) => sum + section.selected.length, 0),
    overrides: file.sections.reduce((sum, section) => sum + section.overrides.length, 0),
    jsonSections: file.sections.filter((section) => section.json).length,
    sections: file.sections.length
  };
}

// =============================================================================
// 検証
// =============================================================================

export type ParsedSelectionFile = { ok: true; file: SelectionFile } | { ok: false; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');

function megabytes(bytes: number): string {
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** 読み込む前の、サイズだけの検査（大きすぎるファイルは本文を読まない）。 */
export function checkSelectionFileSize(byteSize: number): string {
  return byteSize > MAX_SELECTION_FILE_BYTES
    ? `ファイルが大きすぎるため読み込めません（${megabytes(byteSize)}。上限は ${megabytes(MAX_SELECTION_FILE_BYTES)}）。「選択と修正を保存」で保存したファイルを選んでください。`
    : '';
}

function parseApp(value: unknown, where: string): (SelectionFileApp & { environment?: unknown }) | string {
  if (!isRecord(value)) return `${where}の情報がありません`;
  if (typeof value.appId !== 'string' || !value.appId) return `${where}のアプリIDがありません`;
  if (value.guestId !== undefined && typeof value.guestId !== 'string') return `${where}のゲストスペースIDの形式が不正です`;
  if (value.name !== undefined && typeof value.name !== 'string') return `${where}のアプリ名の形式が不正です`;
  return { appId: value.appId, guestId: typeof value.guestId === 'string' ? value.guestId : '', name: typeof value.name === 'string' ? value.name : '', ...(value.environment !== undefined ? { environment: value.environment } : {}) };
}

/** 保存ファイルの本文を検証して取り出す。壊れたファイル・別種の JSON・新しすぎる版は、理由つきで拒否する。 */
export function parseSelectionFile(text: string, byteSize = text.length): ParsedSelectionFile {
  const tooLarge = checkSelectionFileSize(byteSize);
  if (tooLarge) return { ok: false, message: tooLarge };
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, message: 'JSON として読み込めませんでした。「選択と修正を保存」で保存したファイルを選んでください。' }; }
  if (!isRecord(raw)) return { ok: false, message: '選択と修正のファイルではありません（JSON の最上位がオブジェクトではありません）。' };
  if (raw.kind !== SELECTION_FILE_KIND) {
    const kind = typeof raw.kind === 'string' && raw.kind ? `（種類: ${raw.kind.slice(0, 60)}）` : '';
    return { ok: false, message: `選択と修正のファイルではありません${kind}。「選択と修正を保存」で保存したファイルを選んでください。` };
  }
  if (raw.version !== SELECTION_FILE_VERSION) {
    return { ok: false, message: `このファイルの版（${String(raw.version).slice(0, 20)}）は読み込めません。このツールが読み込めるのは版 ${SELECTION_FILE_VERSION} です。` };
  }
  const broken = (detail: string): ParsedSelectionFile => ({ ok: false, message: `ファイルの内容が壊れています（${detail}）。保存し直したファイルを選んでください。` });
  if (typeof raw.createdAt !== 'string') return broken('作成日時がありません');
  const source = parseApp(raw.source, '反映元');
  if (typeof source === 'string') return broken(source);
  const target = parseApp(raw.target, '反映先');
  if (typeof target === 'string') return broken(target);
  const environment = source.environment;
  if (environment !== 'production' && environment !== 'preview' && environment !== 'json') return broken('反映元の取得方法がありません');
  if (!isStringArray(raw.scopes)) return broken('反映する項目の形式が不正です');
  if (typeof raw.preserveTargetOnly !== 'boolean') return broken('反映先だけの設定の扱いがありません');
  const lookupMap: Record<string, string> = {};
  if (raw.lookupMap !== undefined) {
    if (!isRecord(raw.lookupMap) || Object.values(raw.lookupMap).some((value) => typeof value !== 'string')) return broken('参照先変換の形式が不正です');
    for (const [from, to] of Object.entries(raw.lookupMap)) lookupMap[from] = to as string;
  }
  if (raw.goal !== 'production' && raw.goal !== 'preview') return broken('目標がありません');
  if (!Array.isArray(raw.sections)) return broken('項目の一覧がありません');
  const sections: SelectionFileSection[] = [];
  const seen = new Set<string>();
  for (const [index, item] of raw.sections.entries()) {
    const at = `項目 ${index + 1} 件目`;
    if (!isRecord(item) || typeof item.sectionKey !== 'string' || !item.sectionKey) return broken(`${at}の項目名がありません`);
    if (seen.has(item.sectionKey)) return broken(`${at}の項目が重複しています`);
    seen.add(item.sectionKey);
    if (!isStringArray(item.selected) || !isStringArray(item.notSelected)) return broken(`${at}の選択の形式が不正です`);
    if (!Array.isArray(item.overrides) || item.overrides.some((entry) => !isRecord(entry) || typeof entry.pointer !== 'string' || !('value' in entry))) return broken(`${at}の入力欄の修正の形式が不正です`);
    const section: SelectionFileSection = {
      sectionKey: item.sectionKey, label: typeof item.label === 'string' ? item.label : item.sectionKey,
      selected: item.selected, notSelected: item.notSelected,
      overrides: (item.overrides as Array<Record<string, unknown>>).map((entry) => ({ pointer: entry.pointer as string, value: entry.value }))
    };
    if (item.json !== undefined) {
      if (!isRecord(item.json) || typeof item.json.baseHash !== 'string' || !('value' in item.json)) return broken(`${at}の JSON での修正の形式が不正です`);
      section.json = { baseHash: item.json.baseHash, value: item.json.value };
    }
    sections.push(section);
  }
  return {
    ok: true,
    file: {
      kind: SELECTION_FILE_KIND, version: SELECTION_FILE_VERSION, createdAt: raw.createdAt,
      source: { appId: source.appId, guestId: source.guestId, name: source.name, environment },
      target: { appId: target.appId, guestId: target.guestId, name: target.name },
      scopes: raw.scopes, preserveTargetOnly: raw.preserveTargetOnly, lookupMap, goal: raw.goal, sections
    }
  };
}

// =============================================================================
// 照合（別のアプリへ誤って当てはめない）
// =============================================================================

const ENVIRONMENT_LABEL: Record<SourceEnvironment, string> = { production: '本番設定', preview: 'プレビュー設定', json: '設定JSON' };

function appText(app: SelectionFileApp, environment?: SourceEnvironment): string {
  const where = environment ? `・${ENVIRONMENT_LABEL[environment]}` : '';
  return `${app.name || '（名前なし）'}（#${app.appId}${app.guestId ? `・ゲストスペース ${app.guestId}` : ''}${where}）`;
}

/**
 * 現在の抽出結果の反映元・反映先が、保存時と同じか確かめる。違いがあれば、その内容を返す（空なら同じ）。
 * 比べるのは、アプリID・ゲストスペースID・反映元の取得方法。アプリ名は変えられるため比べない。
 */
export function describeSelectionFileMismatch(file: SelectionFile, session: Pick<SourceSession, 'identities' | 'sourceEnvironment'>): string[] {
  const source = session.identities.source, target = session.identities.target;
  const differences: string[] = [];
  if (file.source.environment !== session.sourceEnvironment) differences.push(`反映元の取得方法が違います（保存時: ${ENVIRONMENT_LABEL[file.source.environment]}、現在: ${ENVIRONMENT_LABEL[session.sourceEnvironment]}）`);
  if (file.source.appId !== source.appId) differences.push(`反映元のアプリが違います（保存時: ${appText(file.source)}、現在: ${appText(source)}）`);
  else if (file.source.guestId !== (source.guestId || '')) differences.push(`反映元のゲストスペースIDが違います（保存時: ${file.source.guestId || 'なし'}、現在: ${source.guestId || 'なし'}）`);
  if (file.target.appId !== target.appId) differences.push(`反映先のアプリが違います（保存時: ${appText(file.target)}、現在: ${appText(target)}）`);
  else if (file.target.guestId !== (target.guestId || '')) differences.push(`反映先のゲストスペースIDが違います（保存時: ${file.target.guestId || 'なし'}、現在: ${target.guestId || 'なし'}）`);
  return differences;
}

/** 読み込みを止めない違い（差分の出方が変わり、当てはまらない変更が増えることがある）。 */
export function describeSelectionFileSettingNotes(file: SelectionFile, session: Pick<SourceSession, 'opts'>): string[] {
  const notes: string[] = [];
  const preserve = session.opts.preserveTargetOnly !== false;
  if (file.preserveTargetOnly !== preserve) notes.push(`反映先だけの一覧・グラフ・アクションの扱いが保存時と違います（保存時: ${file.preserveTargetOnly ? '保持' : '削除'}、現在: ${preserve ? '保持' : '削除'}）`);
  if (!sameValue(file.lookupMap, session.opts.lookupMap || {})) notes.push('参照先変換が保存時と違います');
  return notes;
}

// =============================================================================
// 当てはめ
// =============================================================================

export interface SelectionFileApplyResult extends Omit<CarryOverSummary, 'jsonLost'> {
  /** 現在の差分に当てはめた JSON での修正の項目数（反映先の設定が保存時と同じ） */
  jsonKept: number;
  /** 当てはめなかった JSON での修正の項目（反映先の設定が保存時から変わった、または現在の差分に無い） */
  jsonLost: number;
  jsonLostLabels: string[];
  /** 保存時にあって、現在の差分に無い項目の数 */
  sectionsLost: number;
}

/**
 * 保存ファイルの選択と修正を、現在の抽出結果（session）へ当てはめる。
 * - 選択・入力欄の修正は carryOverSession と同じ規則（同じ change.id・同じ pointer だけ。今回だけにある変更は既定どおり選ぶ）。
 * - JSON での修正は、JSON の土台にした反映先の設定が現在と同じと確認できる項目だけ当てはめる（それ以外は当てはめない）。
 * ファイルに含まれる項目は、現在の選択・修正をファイルの内容に置き換える（含まれない項目は変えない）。
 * 反映元・反映先の照合（describeSelectionFileMismatch）は呼び出し側で済ませておく。確認の解除・作り直しも呼び出し側で行う。
 */
export function applySelectionFile(session: SourceSession, file: SelectionFile): SelectionFileApplyResult {
  const hasOwn = (target: object, key: string) => Object.prototype.hasOwnProperty.call(target, key);
  const selected: Record<string, Set<string>> = Object.create(null);
  const models: Record<string, { changes: Array<{ id: string }> }> = Object.create(null);
  const states: Record<string, { selected: string[]; overrides: Record<string, unknown> }> = Object.create(null);
  const result: SelectionFileApplyResult = { selectionKept: 0, selectionLost: 0, overridesKept: 0, overridesLost: 0, jsonKept: 0, jsonLost: 0, jsonLostLabels: [], sectionsLost: 0 };
  for (const section of file.sections) {
    // 現在の差分に無い項目（ファイルの項目名が「__proto__」などでも、自身のプロパティだけを見る）
    if (!hasOwn(session.models, section.sectionKey) || !hasOwn(session.states, section.sectionKey)) {
      result.sectionsLost += 1;
      result.selectionLost += section.selected.length;
      result.overridesLost += section.overrides.length;
      if (section.json) { result.jsonLost += 1; result.jsonLostLabels.push(section.label || section.sectionKey); }
      continue;
    }
    selected[section.sectionKey] = new Set(section.selected);
    models[section.sectionKey] = { changes: [...section.selected, ...section.notSelected].map((id) => ({ id })) };
    const overrides: Record<string, unknown> = Object.create(null);
    for (const entry of section.overrides) overrides[entry.pointer] = entry.value;
    states[section.sectionKey] = { selected: [], overrides };
    // 現在の選択・修正は、ファイルの内容に置き換える
    const state = session.states[section.sectionKey];
    state.overrides = {};
    delete state.json;
  }
  const summary = carryOverSession(session, { selected, models, states });
  result.selectionKept += summary.selectionKept;
  result.selectionLost += summary.selectionLost;
  result.overridesKept += summary.overridesKept;
  result.overridesLost += summary.overridesLost;
  for (const section of file.sections) {
    if (!section.json || !hasOwn(session.models, section.sectionKey) || !hasOwn(session.states, section.sectionKey)) continue;
    const model = session.models[section.sectionKey];
    if (model.jsonEditable && settingsFingerprint(model.before) === section.json.baseHash) {
      setJsonOverride(session, section.sectionKey, section.json.value);
      result.jsonKept += 1;
    } else {
      result.jsonLost += 1;
      result.jsonLostLabels.push(section.label || section.sectionKey);
    }
  }
  return result;
}

/** 読み込み後の案内（当てはめた件数・当てはまらなかった件数・JSON の扱い）。 */
export function describeSelectionFileApply(file: SelectionFile, result: SelectionFileApplyResult): string {
  const kept = [result.selectionKept ? `選択 ${result.selectionKept} 件` : '', result.overridesKept ? `入力欄の修正 ${result.overridesKept} 件` : '', result.jsonKept ? `JSON での修正 ${result.jsonKept} 項目` : ''].filter(Boolean);
  const lost = [result.selectionLost ? `選択 ${result.selectionLost} 件` : '', result.overridesLost ? `入力欄の修正 ${result.overridesLost} 件` : '', result.jsonLost ? `JSON での修正 ${result.jsonLost} 項目` : ''].filter(Boolean);
  const parts = [`選択と修正を読み込みました（保存した日時: ${formatSavedAt(file.createdAt)}）。`];
  parts.push(kept.length ? `当てはめたもの: ${kept.join('・')}。` : '当てはめるものはありませんでした。');
  if (lost.length) parts.push(`当てはまらなかったもの: ${lost.join('・')}（現在の差分に無いため）。選び直してください。`);
  if (result.jsonKept) parts.push('JSON での修正は、反映先の設定が保存時と同じだったため当てはめました。');
  if (result.jsonLost) parts.push(`JSON での修正（${result.jsonLostLabels.join('、')}）は、反映先の設定が保存時から変わった（または現在の差分に無い）ため当てはめていません。JSON で直し直してください。`);
  parts.push('最終確認は、あらためて必要です。');
  return parts.join('');
}

function formatSavedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ja-JP', { hour12: false });
}

/** 保存ファイルの名前に使うラベル（反映元・反映先が分かる）。 */
export function selectionFileLabels(file: Pick<SelectionFile, 'source' | 'target'>): { appLabel: string; suffix: string } {
  const label = (app: SelectionFileApp) => `${app.name ? `${app.name}(app${app.appId})` : `app${app.appId}`}`;
  return { appLabel: `反映元-${label(file.source)}`, suffix: `反映先-${label(file.target)}` };
}
