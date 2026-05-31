'use strict';

// 反映プリセット（接続先＋セクション選択＋オプション）のファイル入出力ロジックを
// DOM 非依存の純粋関数として切り出す。ブラウザストレージを使わない方針のため、
// プリセットをセッションを越えて持ち運ぶ唯一の手段がファイル入出力になる。
// reflect.ts の export/import と handlers.ts から共有し、単体テストの対象にしている。

export const REFLECT_PRESETS_EXPORT_KIND = 'reflect-presets';

export interface ReflectPresetEndpoint {
  appId: string;
  guestId: string;
  preview: boolean;
}

export interface ReflectPreset {
  name: string;
  createdAt: string;
  source: ReflectPresetEndpoint;
  target: ReflectPresetEndpoint;
  scopes: string[];
  applyDiffOnly: boolean;
  lookupMap: string;
}

function normalizeEndpoint(raw: any): ReflectPresetEndpoint {
  const obj = raw && typeof raw === 'object' ? raw : {};
  return {
    appId: String(obj.appId == null ? '' : obj.appId).trim(),
    guestId: String(obj.guestId == null ? '' : obj.guestId).trim(),
    preview: !!obj.preview
  };
}

function normalizeScopes(raw: any): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const key = String(item == null ? '' : item).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * 1 件の生データを反映プリセットへ正規化する。name が無いものは無効として null。
 */
export function normalizeReflectPreset(raw: any): ReflectPreset | null {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name == null ? '' : raw.name).trim();
  if (!name) return null;
  const createdAt = typeof raw.createdAt === 'string' && raw.createdAt
    ? raw.createdAt
    : new Date().toISOString();
  return {
    name,
    createdAt,
    source: normalizeEndpoint(raw.source),
    target: normalizeEndpoint(raw.target),
    scopes: normalizeScopes(raw.scopes),
    applyDiffOnly: !!raw.applyDiffOnly,
    lookupMap: String(raw.lookupMap == null ? '' : raw.lookupMap)
  };
}

export interface ReflectPresetsExport {
  kind: typeof REFLECT_PRESETS_EXPORT_KIND;
  exportedAt: string;
  count: number;
  presets: ReflectPreset[];
}

/**
 * 書き出し用ペイロードを組み立てる。無効なプリセットは取り除く。
 */
export function buildReflectPresetsExport(presets: any[] | null | undefined): ReflectPresetsExport {
  const normalized = (Array.isArray(presets) ? presets : [])
    .map(normalizeReflectPreset)
    .filter((p): p is ReflectPreset => p !== null);
  return {
    kind: REFLECT_PRESETS_EXPORT_KIND,
    exportedAt: new Date().toISOString(),
    count: normalized.length,
    presets: normalized
  };
}

export interface ImportReflectPresetsResult {
  presets: ReflectPreset[];
  error?: string;
}

/**
 * 取り込んだ JSON を検証し、正規化済みプリセット配列を返す。
 * 形式不正なら error を、配列だけ（kind 無し）でも寛容に受け入れる。
 */
export function normalizeImportedReflectPresets(parsed: any): ImportReflectPresetsResult {
  let rawList: any;
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (parsed.kind && parsed.kind !== REFLECT_PRESETS_EXPORT_KIND) {
      return { presets: [], error: `この形式は反映プリセットとして認識できません（kind="${REFLECT_PRESETS_EXPORT_KIND}" を想定）` };
    }
    rawList = Array.isArray(parsed.presets) ? parsed.presets : null;
  } else {
    rawList = null;
  }
  if (!Array.isArray(rawList)) {
    return { presets: [], error: 'プリセットJSONの形式が不正です（presets 配列が見つかりません）' };
  }
  const presets = rawList
    .map(normalizeReflectPreset)
    .filter((p): p is ReflectPreset => p !== null);
  return { presets };
}

export interface MergeReflectPresetsResult {
  presets: ReflectPreset[];
  added: number;
  replaced: number;
}

/**
 * 既存プリセットへ取り込み分をマージする。同名は取り込み側で上書きし、新しい順を保つ。
 * limit で上限件数に丸める（既定 30）。
 */
export function mergeReflectPresets(
  existing: any[] | null | undefined,
  incoming: ReflectPreset[] | null | undefined,
  limit = 30
): MergeReflectPresetsResult {
  const base = (Array.isArray(existing) ? existing : [])
    .map(normalizeReflectPreset)
    .filter((p): p is ReflectPreset => p !== null);
  const incomingList = (Array.isArray(incoming) ? incoming : [])
    .map(normalizeReflectPreset)
    .filter((p): p is ReflectPreset => p !== null);
  const incomingNames = new Set(incomingList.map((p) => p.name));
  let replaced = 0;
  const kept: ReflectPreset[] = [];
  for (const preset of base) {
    if (incomingNames.has(preset.name)) { replaced += 1; continue; }
    kept.push(preset);
  }
  const merged = [...incomingList, ...kept].slice(0, Math.max(0, limit));
  return {
    presets: merged,
    added: incomingList.length - replaced,
    replaced
  };
}
