'use strict';

import { DIFF_NORMALIZATION_PRESETS, SECTION_DEFS } from '../constants.js';

export const DIFF_COMPARISON_PROFILE_KIND = 'kintone-diff-comparison-profile' as const;
export const DIFF_COMPARISON_PROFILE_VERSION = 1 as const;

export const DIFF_COMPARISON_PROFILE_LIMITS = Object.freeze({
  jsonLength: 128_000,
  nameLength: 100,
  savedAtLength: 64,
  scopeItems: 64,
  ignoreKeysLength: 20_000,
  ignoreKeyItems: 256,
  ignoreKeyLength: 256,
  normalizationItems: 64
} as const);

export const DIFF_COMPARISON_PROFILE_DENSITIES = ['compact', 'standard', 'comfortable'] as const;
export const DIFF_COMPARISON_PROFILE_LAYOUTS = ['split', 'stacked'] as const;

export type DiffComparisonProfileDensity = typeof DIFF_COMPARISON_PROFILE_DENSITIES[number];
export type DiffComparisonProfileLayout = typeof DIFF_COMPARISON_PROFILE_LAYOUTS[number];

export interface DiffComparisonProfileDisplay {
  charDiff: boolean;
  showResultList: boolean;
  density: DiffComparisonProfileDensity;
  layout: DiffComparisonProfileLayout;
}

export interface DiffComparisonProfile {
  kind: typeof DIFF_COMPARISON_PROFILE_KIND;
  version: typeof DIFF_COMPARISON_PROFILE_VERSION;
  name: string;
  savedAt: string;
  scopes: string[];
  ignoreKeys: string;
  includeSame: boolean;
  normalizationPresetState: Record<string, boolean>;
  display: DiffComparisonProfileDisplay;
}

export interface BuildDiffComparisonProfileInput {
  name?: unknown;
  savedAt?: unknown;
  scopes?: unknown;
  ignoreKeys?: unknown;
  includeSame?: unknown;
  normalizationPresetState?: unknown;
  display?: unknown;
}

export class DiffComparisonProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiffComparisonProfileError';
  }
}

const VALID_SCOPES = new Set(SECTION_DEFS.map((definition) => definition.key));
const VALID_NORMALIZATION_PRESETS = new Set(Object.keys(DIFF_NORMALIZATION_PRESETS));
const VALID_DENSITIES = new Set<string>(DIFF_COMPARISON_PROFILE_DENSITIES);
const VALID_LAYOUTS = new Set<string>(DIFF_COMPARISON_PROFILE_LAYOUTS);
const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const DEFAULT_DISPLAY: Readonly<DiffComparisonProfileDisplay> = Object.freeze({
  charDiff: true,
  showResultList: true,
  density: 'standard',
  layout: 'split'
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Access only own data properties so getters and inherited polluted values are ignored. */
function ownValue(record: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ? descriptor.value
    : undefined;
}

function requiredName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new DiffComparisonProfileError('比較条件プロファイル名を入力してください');
  }
  const name = value.trim();
  if (!name) throw new DiffComparisonProfileError('比較条件プロファイル名を入力してください');
  if (name.length > DIFF_COMPARISON_PROFILE_LIMITS.nameLength) {
    throw new DiffComparisonProfileError(`比較条件プロファイル名は${DIFF_COMPARISON_PROFILE_LIMITS.nameLength}文字以内で入力してください`);
  }
  return name;
}

function normalizeSavedAt(value: unknown): string {
  const raw = typeof value === 'number' && Number.isFinite(value)
    ? String(value)
    : typeof value === 'string'
      ? value.trim()
      : '';
  if (!raw) return new Date().toISOString();
  if (raw.length > DIFF_COMPARISON_PROFILE_LIMITS.savedAtLength) {
    throw new DiffComparisonProfileError('保存日時が長すぎます');
  }
  const timestamp = typeof value === 'number' ? value : Date.parse(raw);
  if (!Number.isFinite(timestamp)) {
    throw new DiffComparisonProfileError('保存日時の形式が正しくありません');
  }
  try {
    return new Date(timestamp).toISOString();
  } catch {
    throw new DiffComparisonProfileError('保存日時の形式が正しくありません');
  }
}

function normalizeScopes(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\s,、，;；]+/)
      : [];
  if (source.length > DIFF_COMPARISON_PROFILE_LIMITS.scopeItems) {
    throw new DiffComparisonProfileError(`比較対象セクションは${DIFF_COMPARISON_PROFILE_LIMITS.scopeItems}件以内で指定してください`);
  }
  const scopes: string[] = [];
  const seen = new Set<string>();
  for (const item of source) {
    if (typeof item !== 'string') continue;
    const scope = item.trim();
    if (!scope || !VALID_SCOPES.has(scope) || seen.has(scope)) continue;
    seen.add(scope);
    scopes.push(scope);
  }
  if (!scopes.length) {
    throw new DiffComparisonProfileError('比較対象セクションを1つ以上指定してください');
  }
  return scopes;
}

function normalizeIgnoreKeys(value: unknown): string {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\n\r,、，;；]+/)
      : [];
  if (source.length > DIFF_COMPARISON_PROFILE_LIMITS.ignoreKeyItems) {
    throw new DiffComparisonProfileError(`無視キーは${DIFF_COMPARISON_PROFILE_LIMITS.ignoreKeyItems}件以内で指定してください`);
  }
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const item of source) {
    if (typeof item !== 'string') continue;
    const key = item.trim();
    if (!key || PROTOTYPE_POLLUTION_KEYS.has(key.toLowerCase())) continue;
    if (key.length > DIFF_COMPARISON_PROFILE_LIMITS.ignoreKeyLength) {
      throw new DiffComparisonProfileError(`無視キー1件は${DIFF_COMPARISON_PROFILE_LIMITS.ignoreKeyLength}文字以内で指定してください`);
    }
    // path: は大小文字も含めた完全一致ルール。通常キーだけ従来どおり大小文字を無視して重複排除する。
    const identity = key.toLowerCase().startsWith('path:') ? key : key.toLowerCase();
    if (seen.has(identity)) continue;
    seen.add(identity);
    keys.push(key);
  }
  const normalized = keys.join(', ');
  if (normalized.length > DIFF_COMPARISON_PROFILE_LIMITS.ignoreKeysLength) {
    throw new DiffComparisonProfileError(`無視キー全体は${DIFF_COMPARISON_PROFILE_LIMITS.ignoreKeysLength}文字以内で指定してください`);
  }
  return normalized;
}

function normalizePresetState(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  const keys = Object.keys(value);
  if (keys.length > DIFF_COMPARISON_PROFILE_LIMITS.normalizationItems) {
    throw new DiffComparisonProfileError(`正規化設定は${DIFF_COMPARISON_PROFILE_LIMITS.normalizationItems}件以内で指定してください`);
  }
  const state: Record<string, boolean> = {};
  for (const key of keys) {
    if (PROTOTYPE_POLLUTION_KEYS.has(key.toLowerCase()) || !VALID_NORMALIZATION_PRESETS.has(key)) continue;
    const enabled = ownValue(value, key);
    if (typeof enabled === 'boolean') state[key] = enabled;
  }
  return state;
}

function normalizeDisplay(value: unknown): DiffComparisonProfileDisplay {
  if (!isRecord(value)) return { ...DEFAULT_DISPLAY };
  const rawDensity = ownValue(value, 'density');
  const density = typeof rawDensity === 'string' && VALID_DENSITIES.has(rawDensity)
    ? rawDensity as DiffComparisonProfileDensity
    : DEFAULT_DISPLAY.density;
  const rawCharDiff = ownValue(value, 'charDiff');
  const rawShowResultList = ownValue(value, 'showResultList');
  const rawLayout = ownValue(value, 'layout');
  const layout = typeof rawLayout === 'string' && VALID_LAYOUTS.has(rawLayout)
    ? rawLayout as DiffComparisonProfileLayout
    : DEFAULT_DISPLAY.layout;
  return {
    charDiff: typeof rawCharDiff === 'boolean' ? rawCharDiff : DEFAULT_DISPLAY.charDiff,
    showResultList: typeof rawShowResultList === 'boolean' ? rawShowResultList : DEFAULT_DISPLAY.showResultList,
    density,
    layout
  };
}

function parseInput(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string') {
    if (!isRecord(raw)) throw new DiffComparisonProfileError('比較条件プロファイルはオブジェクトで指定してください');
    return raw;
  }
  if (raw.length > DIFF_COMPARISON_PROFILE_LIMITS.jsonLength) {
    throw new DiffComparisonProfileError('比較条件プロファイルのJSONが大きすぎます');
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) throw new Error('not-object');
    return parsed;
  } catch {
    throw new DiffComparisonProfileError('比較条件プロファイルのJSON形式が正しくありません');
  }
}

/**
 * 比較条件だけをホワイトリスト方式で組み立てる。
 * アプリID、guestId、設定本文、比較値などの入力プロパティは出力しない。
 */
export function buildDiffComparisonProfile(input: BuildDiffComparisonProfileInput | unknown): DiffComparisonProfile {
  if (!isRecord(input)) {
    throw new DiffComparisonProfileError('比較条件プロファイルはオブジェクトで指定してください');
  }
  return {
    kind: DIFF_COMPARISON_PROFILE_KIND,
    version: DIFF_COMPARISON_PROFILE_VERSION,
    name: requiredName(ownValue(input, 'name')),
    savedAt: normalizeSavedAt(ownValue(input, 'savedAt')),
    scopes: normalizeScopes(ownValue(input, 'scopes')),
    ignoreKeys: normalizeIgnoreKeys(ownValue(input, 'ignoreKeys')),
    includeSame: ownValue(input, 'includeSame') === true,
    normalizationPresetState: normalizePresetState(ownValue(input, 'normalizationPresetState')),
    display: normalizeDisplay(ownValue(input, 'display'))
  };
}

/** Current profiles and legacy unmarked minimal objects are both accepted. */
export function parseDiffComparisonProfile(raw: unknown): DiffComparisonProfile {
  const input = parseInput(raw);
  const kind = ownValue(input, 'kind');
  if (kind !== undefined && kind !== DIFF_COMPARISON_PROFILE_KIND) {
    throw new DiffComparisonProfileError('比較条件プロファイルの種類が正しくありません');
  }
  const version = ownValue(input, 'version');
  if (version !== undefined && Number(version) !== DIFF_COMPARISON_PROFILE_VERSION) {
    throw new DiffComparisonProfileError(`対応していない比較条件プロファイルのバージョンです: ${String(version)}`);
  }
  return buildDiffComparisonProfile(input);
}

export function serializeDiffComparisonProfile(raw: unknown, space: number = 2): string {
  const profile = parseDiffComparisonProfile(raw);
  const indentation = Number.isFinite(space) ? Math.max(0, Math.min(10, Math.trunc(space))) : 2;
  return JSON.stringify(profile, null, indentation);
}
