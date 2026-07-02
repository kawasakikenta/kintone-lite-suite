'use strict';

import { SECTION_DEFS, META_KEYS, DIFF_NORMALIZATION_PRESETS, DEFAULT_IGNORE_KEYS, DiffNormalizationPreset } from '../constants.js';
import { state, ui } from '../state.js';
import { deepClone, stableStringify } from '../utils.js';
import type { DiffRow, DiffFetchIssue } from './types.js';

const HIGH_IMPACT_SECTIONS = new Set([
  'fieldSettings',
  'processSettings',
  'actionSettings',
  'appAcl',
  'fieldAcl',
  'recordPermissions'
]);
const MEDIUM_IMPACT_SECTIONS = new Set([
  'layoutSettings',
  'viewSettings',
  'reportSettings',
  'customizeSettings',
  'notifications',
  'perRecordNotifications',
  'reminderNotifications',
  'categories'
]);

const ARRAY_DIFF_LIMIT = 1000;
const SAME_ROW_LIMIT = 3000;
const ARRAY_LCS_MAX_CELLS = 60000;
const ARRAY_KEY_CANDIDATES = [
  'code',
  'id',
  'name',
  'entity',
  'field',
  'status',
  'state',
  'app',
  'from',
  'to',
  'key'
];

// 装飾・順序・寸法・説明など、挙動に影響しない変更は low に降格する。
const LOW_PRIORITY_LEAF_KEYS: ReadonlySet<string> = new Set([
  'width', 'x', 'y', 'index', 'no', 'order',
  'paginationStyle', 'pager', 'description',
  'minWidth', 'maxWidth', 'thumbnailSize'
]);

// レコード操作系の許可フラグ（true ⇄ false の変化を判定する）
const ACL_GRANT_FLAG_KEYS: ReadonlySet<string> = new Set([
  'recordViewable', 'recordAddable', 'recordEditable', 'recordDeletable',
  'recordImportable', 'recordExportable', 'appEditable',
  'viewable', 'editable', 'deletable'
]);

const FIELD_ACL_LEVEL_ORDER: ReadonlyArray<string> = ['NONE', 'READ', 'READ_WRITE'];

function fieldAclLevelIndex(value): number {
  if (value == null) return -1;
  return FIELD_ACL_LEVEL_ORDER.indexOf(String(value).toUpperCase());
}

export function detectRowSeverity(row) {
  const sec = row?.sectionKey || '';
  const rawPath = String(row?.path || '');
  const pathLower = rawPath.toLowerCase();
  const leafMatch = rawPath.match(/([^[.\]]+)(?:\[\d+\])?$/);
  const leaf = leafMatch ? leafMatch[1] : '';

  // 純粋な順序変更（moved）は low
  if (row?.moved && row?.type === 'changed') return 'low';

  // 実質同値（"100"⇄100 等の表記ゆれ / 空文字⇄null 等の空値ゆれ）は low
  if (row?.notationOnly || row?.emptyOnly) return 'low';

  // 装飾・順序・寸法・説明だけの変更は low（HIGH_IMPACT セクションでも降格）
  if (LOW_PRIORITY_LEAF_KEYS.has(leaf) && row?.type === 'changed') return 'low';

  // ACL の許可フラグ：true→false は権限弱化（high）、false→true は権限拡大（medium）
  if ((sec === 'appAcl' || sec === 'recordPermissions') && ACL_GRANT_FLAG_KEYS.has(leaf) && row?.type === 'changed') {
    if (row?.left === true && row?.right === false) return 'high';
    if (row?.left === false && row?.right === true) return 'medium';
  }
  // fieldAcl の accessibility（NONE < READ < READ_WRITE）：低下=high、上昇=medium
  if (sec === 'fieldAcl' && leaf === 'accessibility' && row?.type === 'changed') {
    const lIdx = fieldAclLevelIndex(row?.left);
    const rIdx = fieldAclLevelIndex(row?.right);
    if (lIdx >= 0 && rIdx >= 0) {
      if (rIdx < lIdx) return 'high';
      if (rIdx > lIdx) return 'medium';
    }
  }

  // プロセス管理の有効/無効：OFF は運用停止（high）、ON は運用開始（medium）
  if (sec === 'processSettings' && leaf === 'enable' && row?.type === 'changed') {
    if (row?.left === true && row?.right === false) return 'high';
    if (row?.left === false && row?.right === true) return 'medium';
  }

  // プラグイン：削除/無効化は機能停止（high）、追加/有効化は挙動追加（medium）
  if (sec === 'pluginSettings') {
    if (/^pluginSettings\.plugins\[\d+\]$/.test(rawPath)) {
      if (row?.type === 'removed') return 'high';
      if (row?.type === 'added') return 'medium';
    }
    if (leaf === 'enabled' && row?.type === 'changed') {
      if (row?.left === true && row?.right === false) return 'high';
      if (row?.left === false && row?.right === true) return 'medium';
    }
    // プラグインバージョン更新は medium（脆弱性修正・破壊的変更を含む可能性）
    if (leaf === 'version' && row?.type === 'changed') return 'medium';
  }

  // JS/CSS ファイル・URL の削除は挙動消失の可能性（high）
  if (sec === 'customizeSettings' && row?.type === 'removed'
    && /^customizeSettings\.(?:desktop|mobile)\.(?:js|css)\[\d+\]$/.test(rawPath)) {
    return 'high';
  }

  // セクション全体が removed の行は依然として high（重大インシデント）
  if (row?.type === 'removed' && rawPath === sec) return 'high';

  // 旧来のセクション単位ロジック（refinements 後）
  if (row?.type === 'removed') {
    if (HIGH_IMPACT_SECTIONS.has(sec)) return 'high';
    if (MEDIUM_IMPACT_SECTIONS.has(sec)) return 'medium';
    return 'low';
  }
  if (HIGH_IMPACT_SECTIONS.has(sec)) return 'high';
  if (pathLower.includes('lookup') || pathLower.includes('relatedapp') || pathLower.includes('condition')) return 'high';
  if (MEDIUM_IMPACT_SECTIONS.has(sec)) return 'medium';
  return 'low';
}

export function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

// ---------------------------------------------------------------------------
// 値ゆれ分類（表記のみ / 空値のみ）
// ---------------------------------------------------------------------------
// kintone API とエクスポート済み JSON の比較では "100" と 100、"true" と true、
// 空文字と null のような「値としては同じで型・表記だけが違う」差分が頻出する。
// 差分行としては残しつつフラグを付け、重要度を low に降格することで
// レビューすべき本質的な差分と区別できるようにする。
// ---------------------------------------------------------------------------
export function isEmptyLikeValue(v) {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (isPlainObject(v)) return Object.keys(v).length === 0;
  return false;
}

export function isNotationOnlyChange(a, b) {
  const isPrim = (v) => v != null && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean');
  if (!isPrim(a) || !isPrim(b)) return false;
  if (a === b) return false;
  const sa = String(a).trim();
  const sb = String(b).trim();
  if (sa === sb) return true;
  // 数値として等価（"100" ⇄ 100、"1.0" ⇄ 1）
  if (sa !== '' && sb !== '' && !Number.isNaN(Number(sa)) && !Number.isNaN(Number(sb)) && Number(sa) === Number(sb)) return true;
  // 真偽値として等価（"true" ⇄ true）
  const la = sa.toLowerCase();
  const lb = sb.toLowerCase();
  if ((la === 'true' || la === 'false') && la === lb) return true;
  return false;
}

export function classifyChangedValuePair(a, b) {
  if (isEmptyLikeValue(a) && isEmptyLikeValue(b)) return { emptyOnly: true };
  if (isNotationOnlyChange(a, b)) return { notationOnly: true };
  return null;
}

export function getPathLeafKey(path) {
  const m = String(path || '').match(/([^[.\]]+)(?:\[\d+\])?$/);
  return m ? m[1] : '';
}

export function normalizeIgnoreToken(token) {
  return String(token || '')
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
    .replace(/^[\s\u3000]+|[\s\u3000]+$/g, '')
    .toLowerCase();
}

function tokenLooksLikePath(token) {
  return token.includes('.') || token.includes('[');
}

function tokenHasWildcard(token) {
  return token.includes('*');
}

function compileWildcardRegex(token) {
  // `*` だけメタ文字として扱い、それ以外は通常のリテラル比較。
  const escaped = token.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

export function parseIgnoreRules(text) {
  const keySet = new Set(DEFAULT_IGNORE_KEYS);
  const pathSet = new Set<string>();
  const keyPatterns: RegExp[] = [];
  const pathPatterns: RegExp[] = [];
  String(text || '')
    .split(/[\n\r,、，;；\s\u3000]+/)
    .map(normalizeIgnoreToken)
    .filter(Boolean)
    .forEach((token) => {
      const isPath = tokenLooksLikePath(token);
      const cleaned = isPath ? token.replace(/\s+/g, '') : token;
      if (tokenHasWildcard(cleaned)) {
        try {
          const re = compileWildcardRegex(cleaned);
          if (isPath) pathPatterns.push(re);
          else keyPatterns.push(re);
        } catch { /* 不正なパターンは無視 */ }
        return;
      }
      if (isPath) pathSet.add(cleaned);
      else keySet.add(cleaned);
    });
  return { keySet, pathSet, keyPatterns, pathPatterns };
}

function matchAnyPattern(patterns, value) {
  if (!Array.isArray(patterns) || !patterns.length || !value) return false;
  for (const re of patterns) {
    if (re.test(value)) return true;
  }
  return false;
}

export function isIgnoredKey(ignoreRules, key) {
  const normalized = normalizeIgnoreToken(key);
  if (!normalized) return false;
  if (ignoreRules.keySet.has(normalized)) return true;
  return matchAnyPattern(ignoreRules.keyPatterns, normalized);
}

export function isIgnoredPath(ignoreRules, path) {
  const normalizedPath = normalizeIgnoreToken(path).replace(/\s+/g, '');
  if (!normalizedPath) return false;
  if (ignoreRules.pathSet.has(normalizedPath)) return true;
  if (matchAnyPattern(ignoreRules.pathPatterns, normalizedPath)) return true;
  const leaf = getPathLeafKey(normalizedPath);
  if (!leaf) return false;
  if (ignoreRules.keySet.has(leaf)) return true;
  return matchAnyPattern(ignoreRules.keyPatterns, leaf);
}

function markDroppedDiffRow(out, row, kind: 'diff' | 'same') {
  if (!out) return;
  if (kind === 'same') out.__sameDropped = Number(out.__sameDropped || 0) + 1;
  else out.__diffDropped = Number(out.__diffDropped || 0) + 1;
  const sectionKey = String(row?.sectionKey || String(row?.path || '').split('.')[0].split('[')[0] || '');
  if (!sectionKey) return;
  const bySection = out.__droppedBySection || (out.__droppedBySection = {});
  const entry = bySection[sectionKey] || (bySection[sectionKey] = { diff: 0, same: 0 });
  entry[kind] += 1;
}

export function pushDiffRow(out, row, ignoreRules) {
  if (!row) return false;
  if (isIgnoredPath(ignoreRules, row.path)) return false;
  if (row.type === 'same') {
    const sameCount = Number(out?.__sameCount || 0);
    if (sameCount >= SAME_ROW_LIMIT) {
      markDroppedDiffRow(out, row, 'same');
      return false;
    }
    if (out) out.__sameCount = sameCount + 1;
    out.push(row);
    return true;
  }
  const diffCount = Number(out?.__diffCount || 0);
  if (diffCount >= ARRAY_DIFF_LIMIT) {
    markDroppedDiffRow(out, row, 'diff');
    return false;
  }
  if (out) out.__diffCount = diffCount + 1;
  out.push(row);
  return true;
}

export function getCollectedDiffCount(rows) {
  if (!Array.isArray(rows)) return 0;
  const count = Number((rows as any).__diffCount);
  if (Number.isFinite(count)) return count;
  return rows.filter((row) => row?.type !== 'same').length;
}

export function canCollectSameRows(rows) {
  if (!Array.isArray(rows)) return false;
  if (!(rows as any).__includeSame) return false;
  const count = Number((rows as any).__sameCount);
  if (Number.isFinite(count)) return count < SAME_ROW_LIMIT;
  return rows.filter((row) => row?.type === 'same').length < SAME_ROW_LIMIT;
}

export function normalizeForCompare(v, ignoreRules) {
  if (Array.isArray(v)) return v.map((x) => normalizeForCompare(x, ignoreRules));
  if (v && typeof v === 'object') {
    const o = {};
    Object.keys(v).sort().forEach((k) => {
      if (META_KEYS.has(k) || isIgnoredKey(ignoreRules, k)) return;
      o[k] = normalizeForCompare(v[k], ignoreRules);
    });
    return o;
  }
  return v;
}

export function makeArrayItemSignature(v, ignoreRules) {
  return JSON.stringify(normalizeForCompare(v, ignoreRules));
}

export function hasUniquePrimitiveKey(arr, key) {
  const seen = new Set();
  for (const obj of arr) {
    if (!isPlainObject(obj) || !Object.prototype.hasOwnProperty.call(obj, key)) return false;
    const val = obj[key];
    if (val == null || typeof val === 'object') return false;
    // boolean は識別子として無意味（2件配列で偶然ユニークになり誤マッチを生む）
    if (typeof val === 'boolean') return false;
    const sig = `${typeof val}:${String(val)}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
  }
  return true;
}

export function detectArrayObjectKey(a, b, ignoreRules) {
  if (!a.length || !b.length) return null;
  if (!a.every(isPlainObject) || !b.every(isPlainObject)) return null;
  const firstA = a.find(isPlainObject) || ({} as any);
  const firstB = b.find(isPlainObject) || ({} as any);
  const fallback = Object.keys(firstA).filter((k) => Object.prototype.hasOwnProperty.call(firstB, k));
  const candidates = [...ARRAY_KEY_CANDIDATES, ...fallback.filter((k) => !ARRAY_KEY_CANDIDATES.includes(k))];
  for (const key of candidates) {
    if (isIgnoredKey(ignoreRules, key)) continue;
    if (hasUniquePrimitiveKey(a, key) && hasUniquePrimitiveKey(b, key)) return key;
  }
  return null;
}

export function buildArrayKeyMap(arr, key) {
  const map = new Map();
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = item?.[key];
    const sig = `${typeof val}:${String(val)}`;
    map.set(sig, { idx: i, item });
  }
  return map;
}

export function collectArrayDiffsByObjectKey(a, b, path, out, ignoreRules) {
  const key = detectArrayObjectKey(a, b, ignoreRules);
  if (!key) return false;

  const mapA = buildArrayKeyMap(a, key);
  const mapB = buildArrayKeyMap(b, key);
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const item of a) {
    const sig = `${typeof item[key]}:${String(item[key])}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    ordered.push(sig);
  }
  for (const item of b) {
    const sig = `${typeof item[key]}:${String(item[key])}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    ordered.push(sig);
  }

  for (const sig of ordered) {
    if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
    const left = mapA.get(sig);
    const right = mapB.get(sig);
    if (!left && right) {
      pushDiffRow(out, {
        type: 'added',
        path: `${path}[${right.idx}]`,
        left: undefined,
        right: right.item,
        arrayKey: key,
        arrayKeyValue: right.item?.[key]
      }, ignoreRules);
      continue;
    }
    if (left && !right) {
      pushDiffRow(out, {
        type: 'removed',
        path: `${path}[${left.idx}]`,
        left: left.item,
        right: undefined,
        arrayKey: key,
        arrayKeyValue: left.item?.[key]
      }, ignoreRules);
      continue;
    }
    if (!left || !right) continue;

    const leftSig = makeArrayItemSignature(left.item, ignoreRules);
    const rightSig = makeArrayItemSignature(right.item, ignoreRules);
    if (leftSig === rightSig) {
      if (left.idx !== right.idx) {
        pushDiffRow(out, {
          type: 'changed',
          path: `${path}[${right.idx}]`,
          left: left.item,
          right: right.item,
          moved: true,
          movedFrom: left.idx,
          movedTo: right.idx,
          arrayKey: key,
          arrayKeyValue: right.item?.[key]
        }, ignoreRules);
      } else if (canCollectSameRows(out)) {
        pushDiffRow(out, {
          type: 'same',
          path: `${path}[${right.idx}]`,
          left: left.item,
          right: right.item,
          severity: 'low',
          arrayKey: key,
          arrayKeyValue: right.item?.[key]
        }, ignoreRules);
      }
      continue;
    }
    const start = out.length;
    collectDeepDiffs(left.item, right.item, `${path}[${right.idx}]`, out, ignoreRules);
    const keyVal = right.item?.[key] != null ? right.item[key] : left.item?.[key];
    for (let oi = start; oi < out.length; oi++) {
      if (!out[oi].arrayKey) out[oi].arrayKey = key;
      if (out[oi].arrayKeyValue === undefined) out[oi].arrayKeyValue = keyVal;
    }
    if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Composite-key array matching (non-field sections)
// ---------------------------------------------------------------------------
// 権限エントリー・通知ルール・遷移アクションは「単一のユニークな primitive
// キー」を持たないため detectArrayObjectKey でマッチできず、LCS に落ちて
// 並び替えが added/removed の嵐になっていた。ドメイン上の識別子
// （entity.type:code、通知タイトル、アクション name|from|to）で安定マッチ
// させ、エンティティ単位の changed / moved 行として出力する。
// ---------------------------------------------------------------------------

function entityIdentitySig(entity): string | null {
  if (!entity || typeof entity !== 'object') return null;
  const type = entity.type != null ? String(entity.type) : '';
  const code = entity.code != null ? String(entity.code) : (entity.login != null ? String(entity.login) : '');
  if (!type && !code) return null;
  return `${type}:${code}`;
}

interface CompositeArrayRule {
  pattern: RegExp;
  arrayKey: string;
  makeSig: (item: any) => string | null;
  keyValue: (item: any) => any;
  /** false を返すと objectKey 等の後続マッチャーに委ねる */
  applies?: (a: any[], b: any[]) => boolean;
}

const COMPOSITE_ARRAY_RULES: ReadonlyArray<CompositeArrayRule> = [
  // アプリ権限：エンティティが識別子
  {
    pattern: /^appAcl\.rights$/,
    arrayKey: 'entity',
    makeSig: (item) => entityIdentitySig(item?.entity),
    keyValue: (item) => item?.entity
  },
  // フィールド権限・レコード権限のエンティティ配列
  {
    pattern: /^(?:fieldAcl|recordPermissions)\.rights\[\d+\]\.entities$/,
    arrayKey: 'entity',
    makeSig: (item) => entityIdentitySig(item?.entity),
    keyValue: (item) => item?.entity
  },
  // 一般通知：宛先エンティティが識別子
  {
    pattern: /^notifications\.notifications$/,
    arrayKey: 'entity',
    makeSig: (item) => entityIdentitySig(item?.entity),
    keyValue: (item) => item?.entity
  },
  // レコード条件通知・リマインダー通知：タイトル（無題はマッチ対象外）
  {
    pattern: /^(?:perRecordNotifications|reminderNotifications)\.notifications$/,
    arrayKey: 'title',
    makeSig: (item) => {
      const t = item?.title != null ? String(item.title).trim() : '';
      return t || null;
    },
    keyValue: (item) => item?.title
  },
  // プロセス遷移・アプリアクション：name が重複していても from/to で識別。
  // name がユニークな場合は objectKey マッチ（name 単独）の方が from/to の
  // 変更を changed としてペアリングできるため、そちらに委ねる。
  {
    pattern: /^(?:processSettings|actionSettings)\.actions$/,
    arrayKey: 'name',
    makeSig: (item) => {
      const name = item?.name != null ? String(item.name).trim() : '';
      if (!name) return null;
      return `${name}|${item?.from != null ? String(item.from) : ''}|${item?.to != null ? String(item.to) : ''}`;
    },
    keyValue: (item) => item?.name,
    applies: (a, b) => !(hasUniquePrimitiveKey(a, 'name') && hasUniquePrimitiveKey(b, 'name'))
  }
];

function findCompositeArrayRule(path): CompositeArrayRule | null {
  const p = String(path || '');
  for (const rule of COMPOSITE_ARRAY_RULES) {
    if (rule.pattern.test(p)) return rule;
  }
  return null;
}

export function collectArrayDiffsByCompositeKey(a, b, path, out, ignoreRules) {
  const rule = findCompositeArrayRule(path);
  if (!rule) return false;
  if (!a.length && !b.length) return false;
  if (!a.every(isPlainObject) || !b.every(isPlainObject)) return false;
  if (rule.applies && !rule.applies(a, b)) return false;

  const buildMap = (arr) => {
    const map = new Map<string, { idx: number; item: any }>();
    for (let i = 0; i < arr.length; i++) {
      const sig = rule.makeSig(arr[i]);
      if (sig == null) return null; // 識別子なし → このルールでは扱えない
      if (map.has(sig)) return null; // 片側内で重複 → 安全にフォールバック
      map.set(sig, { idx: i, item: arr[i] });
    }
    return map;
  };
  const mapA = buildMap(a);
  const mapB = buildMap(b);
  if (!mapA || !mapB) return false;

  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const sig of mapA.keys()) { if (!seen.has(sig)) { seen.add(sig); ordered.push(sig); } }
  for (const sig of mapB.keys()) { if (!seen.has(sig)) { seen.add(sig); ordered.push(sig); } }

  for (const sig of ordered) {
    if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
    const left = mapA.get(sig);
    const right = mapB.get(sig);
    if (!left && right) {
      pushDiffRow(out, {
        type: 'added',
        path: `${path}[${right.idx}]`,
        left: undefined,
        right: right.item,
        arrayKey: rule.arrayKey,
        arrayKeyValue: rule.keyValue(right.item)
      }, ignoreRules);
      continue;
    }
    if (left && !right) {
      pushDiffRow(out, {
        type: 'removed',
        path: `${path}[${left.idx}]`,
        left: left.item,
        right: undefined,
        arrayKey: rule.arrayKey,
        arrayKeyValue: rule.keyValue(left.item)
      }, ignoreRules);
      continue;
    }
    if (!left || !right) continue;

    const leftSig = makeArrayItemSignature(left.item, ignoreRules);
    const rightSig = makeArrayItemSignature(right.item, ignoreRules);
    if (leftSig === rightSig) {
      if (left.idx !== right.idx) {
        pushDiffRow(out, {
          type: 'changed',
          path: `${path}[${right.idx}]`,
          left: left.item,
          right: right.item,
          moved: true,
          movedFrom: left.idx,
          movedTo: right.idx,
          arrayKey: rule.arrayKey,
          arrayKeyValue: rule.keyValue(right.item)
        }, ignoreRules);
      } else if (canCollectSameRows(out)) {
        pushDiffRow(out, {
          type: 'same',
          path: `${path}[${right.idx}]`,
          left: left.item,
          right: right.item,
          severity: 'low',
          arrayKey: rule.arrayKey,
          arrayKeyValue: rule.keyValue(right.item)
        }, ignoreRules);
      }
      continue;
    }
    const start = out.length;
    collectDeepDiffs(left.item, right.item, `${path}[${right.idx}]`, out, ignoreRules);
    const keyVal = rule.keyValue(right.item) !== undefined ? rule.keyValue(right.item) : rule.keyValue(left.item);
    for (let oi = start; oi < out.length; oi++) {
      if (!out[oi].arrayKey) out[oi].arrayKey = rule.arrayKey;
      if (out[oi].arrayKeyValue === undefined) out[oi].arrayKeyValue = keyVal;
    }
    if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Pure-reorder detection
// ---------------------------------------------------------------------------
// 配列の中身（シグネチャの多重集合）が一致していて並びだけが違う場合は、
// added/removed の嵐ではなく moved 行（low）として出力する。レイアウト行や
// キーを持たない配列の並び替えノイズを一掃する。
// ---------------------------------------------------------------------------
export function collectArrayDiffsByPureReorder(a, b, path, out, ignoreRules) {
  if (a.length !== b.length || a.length < 2) return false;
  const sigA = a.map((x) => makeArrayItemSignature(x, ignoreRules));
  const sigB = b.map((x) => makeArrayItemSignature(x, ignoreRules));
  if ([...sigA].sort().join('\u0000') !== [...sigB].sort().join('\u0000')) return false;

  const used = new Array(a.length).fill(false);
  for (let j = 0; j < b.length; j++) {
    if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
    let from = -1;
    for (let i = 0; i < a.length; i++) {
      if (!used[i] && sigA[i] === sigB[j]) { from = i; break; }
    }
    if (from < 0) continue; // 多重集合一致済みのため理論上到達しない
    used[from] = true;
    if (from === j) {
      if (canCollectSameRows(out)) {
        pushDiffRow(out, { type: 'same', path: `${path}[${j}]`, left: a[from], right: b[j], severity: 'low' }, ignoreRules);
      }
      continue;
    }
    pushDiffRow(out, {
      type: 'changed',
      path: `${path}[${j}]`,
      left: a[from],
      right: b[j],
      moved: true,
      movedFrom: from,
      movedTo: j
    }, ignoreRules);
  }
  return true;
}

function escapeRegExpLiteral(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// LCS 差分後の moved ペアリング
// ---------------------------------------------------------------------------
// 純並び替え検出（多重集合一致）に届かない「移動と追加/削除が混在する配列」
// では、移動した要素が added + removed の 2 行に割れてしまう。同一シグネチャ
// の added/removed ペアを moved（low）1 行に統合してノイズを減らす。
// ---------------------------------------------------------------------------
export function mergeAddRemovePairsAsMoved(out, startIdx, path, ignoreRules) {
  const childRe = new RegExp(`^${escapeRegExpLiteral(path)}\\[(\\d+)\\]$`);
  const removedBySig = new Map<string, number[]>();
  for (let i = startIdx; i < out.length; i++) {
    const row = out[i];
    if (!row || row.type !== 'removed') continue;
    if (!childRe.test(String(row.path || ''))) continue;
    const sig = makeArrayItemSignature(row.left, ignoreRules);
    if (!removedBySig.has(sig)) removedBySig.set(sig, []);
    removedBySig.get(sig)!.push(i);
  }
  if (!removedBySig.size) return;
  const consumed = new Set<number>();
  let merged = 0;
  for (let i = startIdx; i < out.length; i++) {
    const row = out[i];
    if (!row || row.type !== 'added') continue;
    const toMatch = childRe.exec(String(row.path || ''));
    if (!toMatch) continue;
    const sig = makeArrayItemSignature(row.right, ignoreRules);
    const bucket = removedBySig.get(sig);
    if (!bucket || !bucket.length) continue;
    const removedIdx = bucket.shift()!;
    const removedRow = out[removedIdx];
    const fromMatch = childRe.exec(String(removedRow.path || ''));
    out[i] = {
      ...row,
      type: 'changed',
      left: removedRow.left,
      moved: true,
      movedFrom: fromMatch ? Number(fromMatch[1]) : undefined,
      movedTo: Number(toMatch[1])
    };
    consumed.add(removedIdx);
    merged += 1;
  }
  if (!merged) return;
  for (let i = out.length - 1; i >= startIdx; i--) {
    if (consumed.has(i)) out.splice(i, 1);
  }
  const diffCount = Number((out as any).__diffCount);
  if (Number.isFinite(diffCount)) (out as any).__diffCount = Math.max(0, diffCount - merged);
}

export function collectArrayDiffsByLcs(a, b, path, out, ignoreRules) {
  const n = a.length;
  const m = b.length;
  if (!n && !m) return true;
  if (!n) {
    for (let j = 0; j < m; j++) {
      if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
      pushDiffRow(out, { type: 'added', path: `${path}[${j}]`, left: undefined, right: b[j] }, ignoreRules);
    }
    return true;
  }
  if (!m) {
    for (let i = 0; i < n; i++) {
      if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
      pushDiffRow(out, { type: 'removed', path: `${path}[${i}]`, left: a[i], right: undefined }, ignoreRules);
    }
    return true;
  }

  if (n * m > ARRAY_LCS_MAX_CELLS) return false;
  const sigA = a.map((x) => makeArrayItemSignature(x, ignoreRules));
  const sigB = b.map((x) => makeArrayItemSignature(x, ignoreRules));

  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = sigA[i] === sigB[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const mergeStart = out.length;
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) break;
    if (i < n && j < m && sigA[i] === sigB[j]) {
      if (canCollectSameRows(out)) {
        pushDiffRow(out, {
          type: 'same',
          path: `${path}[${j}]`,
          left: a[i],
          right: b[j],
          severity: 'low'
        }, ignoreRules);
      }
      i += 1;
      j += 1;
      continue;
    }
    if (i < n && j < m) {
      const sameType = Object.prototype.toString.call(a[i]) === Object.prototype.toString.call(b[j]);
      if (sameType && dp[i + 1][j + 1] >= dp[i + 1][j] && dp[i + 1][j + 1] >= dp[i][j + 1]) {
        collectDeepDiffs(a[i], b[j], `${path}[${j}]`, out, ignoreRules);
        i += 1;
        j += 1;
        continue;
      }
    }
    const down = i < n ? dp[i + 1][j] : -1;
    const right = j < m ? dp[i][j + 1] : -1;
    if (j < m && (i >= n || right >= down)) {
      pushDiffRow(out, { type: 'added', path: `${path}[${j}]`, left: undefined, right: b[j] }, ignoreRules);
      j += 1;
    } else if (i < n) {
      pushDiffRow(out, { type: 'removed', path: `${path}[${i}]`, left: a[i], right: undefined }, ignoreRules);
      i += 1;
    } else {
      break;
    }
  }
  mergeAddRemovePairsAsMoved(out, mergeStart, path, ignoreRules);
  return true;
}

export function collectArrayDiffs(a, b, path, out, ignoreRules) {
  // 1) 権限/通知/遷移などドメイン識別子（entity, title, name|from|to）での安定マッチ
  //    （objectKey のフォールバック候補が accessibility 等の「値」を識別子に
  //      誤採用してミスペアリングするのを防ぐため、ルールがある場合は先に試す）
  if (collectArrayDiffsByCompositeKey(a, b, path, out, ignoreRules)) return;
  // 2) 単一 primitive キー（code/name 等）での安定マッチ
  if (collectArrayDiffsByObjectKey(a, b, path, out, ignoreRules)) return;
  // 3) 中身が同じで並びだけ違う配列は moved 行に集約
  if (collectArrayDiffsByPureReorder(a, b, path, out, ignoreRules)) return;
  if (collectArrayDiffsByLcs(a, b, path, out, ignoreRules)) return;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return;
    const p = `${path}[${i}]`;
    if (i >= a.length) pushDiffRow(out, { type: 'added', path: p, left: undefined, right: b[i] }, ignoreRules);
    else if (i >= b.length) pushDiffRow(out, { type: 'removed', path: p, left: a[i], right: undefined }, ignoreRules);
    else collectDeepDiffs(a[i], b[i], p, out, ignoreRules);
  }
}

export function collectDeepDiffs(a, b, path, out, ignoreRules) {
  if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return;
  if (isIgnoredPath(ignoreRules, path)) return;

  if (a === b) {
    if (canCollectSameRows(out)) {
      pushDiffRow(out, { type: 'same', path, left: a, right: b, severity: 'low' }, ignoreRules);
    }
    return;
  }
  const ta = Object.prototype.toString.call(a);
  const tb = Object.prototype.toString.call(b);
  if (ta !== tb) {
    pushDiffRow(out, { type: 'changed', path, left: a, right: b, ...(classifyChangedValuePair(a, b) || {}) }, ignoreRules);
    return;
  }

  if (a == null || b == null) {
    pushDiffRow(out, { type: 'changed', path, left: a, right: b, ...(classifyChangedValuePair(a, b) || {}) }, ignoreRules);
    return;
  }

  if (Array.isArray(a)) {
    if (makeArrayItemSignature(a, ignoreRules) === makeArrayItemSignature(b, ignoreRules)) {
      if (canCollectSameRows(out)) {
        pushDiffRow(out, { type: 'same', path, left: a, right: b, severity: 'low' }, ignoreRules);
      }
      return;
    }
    collectArrayDiffs(a, b, path, out, ignoreRules);
    return;
  }

  if (typeof a === 'object') {
    if (makeArrayItemSignature(a, ignoreRules) === makeArrayItemSignature(b, ignoreRules)) {
      if (canCollectSameRows(out)) {
        pushDiffRow(out, { type: 'same', path, left: a, right: b, severity: 'low' }, ignoreRules);
      }
      return;
    }
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    for (const k of keys) {
      if (META_KEYS.has(k) || isIgnoredKey(ignoreRules, k)) continue;
      const p = path ? `${path}.${k}` : k;
      if (!Object.prototype.hasOwnProperty.call(b, k)) pushDiffRow(out, { type: 'removed', path: p, left: a[k], right: undefined, ...(isEmptyLikeValue(a[k]) ? { emptyOnly: true } : {}) }, ignoreRules);
      else if (!Object.prototype.hasOwnProperty.call(a, k)) pushDiffRow(out, { type: 'added', path: p, left: undefined, right: b[k], ...(isEmptyLikeValue(b[k]) ? { emptyOnly: true } : {}) }, ignoreRules);
      else collectDeepDiffs(a[k], b[k], p, out, ignoreRules);
      if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return;
    }
    return;
  }

  pushDiffRow(out, { type: 'changed', path, left: a, right: b, ...(classifyChangedValuePair(a, b) || {}) }, ignoreRules);
}

// ---------------------------------------------------------------------------
// customizeSettings preprocessing
// ---------------------------------------------------------------------------
// JS/CSS の各 FILE/URL アイテムに安定キー (`name`) を注入し、配列キー検出
// （ARRAY_KEY_CANDIDATES）でマッチさせる。本文取得済み（_bodyText 付与済）の
// FILE はファイル本体を比較対象とするため fileKey を _body に置き換える。
// 同内容を再アップロードしただけの fileKey 変更は差分に出なくなり、
// 本文が違う場合は engine の line-diff が自然に効く。
// ---------------------------------------------------------------------------
// 左右ペア対応：両側とも本文取得済の場合のみ _body 比較に切り替える。
// 片側だけ本文取得失敗 → fileKey 比較に揃える（非対称ノイズを防ぐ）。
export function preprocessCustomizePairForDiff(src, tgt) {
  const sClone = src && typeof src === 'object' ? deepClone(src) : src;
  const tClone = tgt && typeof tgt === 'object' ? deepClone(tgt) : tgt;

  const injectName = (bundle) => {
    if (!bundle || typeof bundle !== 'object') return;
    for (const platform of ['desktop', 'mobile']) {
      for (const kind of ['js', 'css']) {
        const arr = bundle?.[platform]?.[kind];
        if (!Array.isArray(arr)) continue;
        for (const item of arr) {
          if (!item || typeof item !== 'object' || item.name) continue;
          if (item.type === 'FILE') {
            item.name = String(item?.file?.name || item?.file?.fileKey || '(ファイル未設定)');
          } else if (item.type === 'URL') {
            item.name = String(item.url || '(URL未設定)');
          }
        }
      }
    }
  };
  injectName(sClone);
  injectName(tClone);

  const swapBodyOrCleanup = (item, counterpart) => {
    if (!item || typeof item !== 'object') return;
    const sBody = item._bodyText;
    const cBody = counterpart?._bodyText;
    if (item.type === 'FILE' && item.file && typeof item.file === 'object' && sBody != null && cBody != null) {
      const newFile = { ...item.file };
      newFile._body = String(sBody);
      delete newFile.fileKey;
      item.file = newFile;
    }
    if ('_bodyText' in item) delete item._bodyText;
    if ('_bodyHash' in item) delete item._bodyHash;
  };

  for (const platform of ['desktop', 'mobile']) {
    for (const kind of ['js', 'css']) {
      const sArr = sClone?.[platform]?.[kind];
      const tArr = tClone?.[platform]?.[kind];
      const sList: any[] = Array.isArray(sArr) ? sArr : [];
      const tList: any[] = Array.isArray(tArr) ? tArr : [];
      const tByName = new Map<string, any>();
      tList.forEach((it) => { if (it && typeof it === 'object' && it.name) tByName.set(String(it.name), it); });
      const sByName = new Map<string, any>();
      sList.forEach((it) => { if (it && typeof it === 'object' && it.name) sByName.set(String(it.name), it); });
      sList.forEach((it) => swapBodyOrCleanup(it, tByName.get(String(it?.name || ''))));
      tList.forEach((it) => swapBodyOrCleanup(it, sByName.get(String(it?.name || ''))));
    }
  }
  return { source: sClone, target: tClone };
}

// ---------------------------------------------------------------------------
// pluginSettings preprocessing
// ---------------------------------------------------------------------------
// 各プラグインに対して fetchPluginConfigs で取得した _config を本体に組み込み、
// プラグイン単位の config 差分が自然に出るようにする。
// ---------------------------------------------------------------------------
export function preprocessPluginSettingsForDiff(value) {
  if (!value || typeof value !== 'object') return value;
  const cloned = deepClone(value);
  if (!Array.isArray(cloned.plugins)) return cloned;
  cloned.plugins.forEach((p) => {
    if (!p || typeof p !== 'object') return;
    if (p._config !== undefined) {
      // _config を恒常フィールド config として比較対象にする
      p.config = p._config;
      delete p._config;
    }
  });
  return cloned;
}

// ---------------------------------------------------------------------------
// Process management state-rename detection (cross-cascade noise reduction)
// ---------------------------------------------------------------------------
// プロセス管理のステータス名（states のキー）が改名されると、
//   - states.{旧名} removed / states.{新名} added
//   - 全 actions[].from / actions[].to の {旧名→新名} 変更
// が一斉に出てしまう。改名候補を検出したら、比較元側の states キーと
// actions の from/to 参照を仮想的に新名へリネームしてから diff することで、
// 改名そのものの 1 行だけを残す（参照のカスケードを吸収）。
// ---------------------------------------------------------------------------
function stripStateBodyForRenameMatch(value) {
  const drop = new Set(['name', 'index']);
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).sort().forEach((k) => {
        if (drop.has(k)) return;
        o[k] = walk(v[k]);
      });
      return o;
    }
    return v;
  };
  return walk(value);
}

export function detectProcessStateRenames(sourceProcess, targetProcess): Map<string, string> {
  const out = new Map<string, string>();
  if (!sourceProcess || !targetProcess) return out;
  const srcStates = (sourceProcess.states && typeof sourceProcess.states === 'object') ? sourceProcess.states : {};
  const tgtStates = (targetProcess.states && typeof targetProcess.states === 'object') ? targetProcess.states : {};
  const onlyInSrc = Object.keys(srcStates).filter((k) => !Object.prototype.hasOwnProperty.call(tgtStates, k));
  const onlyInTgt = Object.keys(tgtStates).filter((k) => !Object.prototype.hasOwnProperty.call(srcStates, k));
  if (!onlyInSrc.length || !onlyInTgt.length) return out;

  type Cand = { from: string; to: string; score: number };
  const candidates: Cand[] = [];
  onlyInSrc.forEach((from) => {
    onlyInTgt.forEach((to) => {
      const lhs = srcStates[from];
      const rhs = tgtStates[to];
      const sigL = stableStringify(stripStateBodyForRenameMatch(lhs));
      const sigR = stableStringify(stripStateBodyForRenameMatch(rhs));
      let score = 0;
      if (sigL === sigR) score += 5;
      const aL = lhs?.assignee;
      const aR = rhs?.assignee;
      if (aL && aR && aL.type === aR.type) score += 1;
      if (Array.isArray(aL?.entities) && Array.isArray(aR?.entities)
        && stableStringify(aL.entities) === stableStringify(aR.entities)) score += 1;
      if (score < 5) return;
      candidates.push({ from, to, score });
    });
  });
  candidates.sort((a, b) => b.score - a.score);
  const usedFrom = new Set<string>();
  const usedTo = new Set<string>();
  candidates.forEach((c) => {
    if (usedFrom.has(c.from) || usedTo.has(c.to)) return;
    usedFrom.add(c.from);
    usedTo.add(c.to);
    out.set(c.from, c.to);
  });
  return out;
}

export function applyProcessStateRenamesToSource(sourceProcess, renameMap: Map<string, string>) {
  if (!sourceProcess || !renameMap || !renameMap.size) return sourceProcess;
  const cloned = deepClone(sourceProcess);
  if (cloned.states && typeof cloned.states === 'object' && !Array.isArray(cloned.states)) {
    const newStates = {};
    Object.keys(cloned.states).forEach((k) => {
      const newKey = renameMap.get(k) || k;
      const obj = cloned.states[k];
      if (obj && typeof obj === 'object' && obj.name === k && renameMap.has(k)) {
        obj.name = newKey;
      }
      newStates[newKey] = obj;
    });
    cloned.states = newStates;
  }
  if (Array.isArray(cloned.actions)) {
    cloned.actions.forEach((act) => {
      if (!act || typeof act !== 'object') return;
      if (typeof act.from === 'string' && renameMap.has(act.from)) act.from = renameMap.get(act.from);
      if (typeof act.to === 'string' && renameMap.has(act.to)) act.to = renameMap.get(act.to);
    });
  }
  return cloned;
}

export function computeDiffRows(sourceBundle, targetBundle, sections, ignoreKeysText, options: any = {}) {
  const ignoreRules = parseIgnoreRules(ignoreKeysText);
  const presetState = options.normalizationPresetState || ({} as any);
  const includeSame = !!options.includeSame;
  const rows: DiffRow[] = [];
  (rows as any).__diffCount = 0;
  (rows as any).__sameCount = 0;
  (rows as any).__diffDropped = 0;
  (rows as any).__sameDropped = 0;
  (rows as any).__includeSame = includeSame;
  const fetchIssues: DiffFetchIssue[] = [];
  // 上限到達後は各コレクタが行の列挙自体を打ち切る（pushDiffRow を経由しない）ため、
  // セクション処理の前後で上限到達を観測して打ち切り発生セクションを記録する。
  const limitHitSectionKeys: string[] = [];
  for (const sec of sections) {
    const label = (SECTION_DEFS.find((x) => x.key === sec) || ({} as any)).label || sec;
    const limitHitBefore = getCollectedDiffCount(rows) >= ARRAY_DIFF_LIMIT;
    const s = sourceBundle.sections[sec];
    const t = targetBundle.sections[sec];

    if ((s && s._fetchError) || (t && t._fetchError)) {
      const sourceError = s?._fetchError ? String(s._fetchError) : '';
      const targetError = t?._fetchError ? String(t._fetchError) : '';
      const side = sourceError && targetError ? 'both' : (sourceError ? 'source' : 'target');
      fetchIssues.push({
        _id: `fetch:${sec}:${side}`,
        sectionKey: sec,
        section: label,
        side,
        sourceError,
        targetError,
        message: side === 'both' ? `比較元: ${sourceError}\n比較先: ${targetError}` : (sourceError || targetError)
      });
      continue;
    }

    if (!s && t) {
      pushDiffRow(rows, { sectionKey: sec, section: label, type: 'added', path: sec, left: undefined, right: t }, ignoreRules);
      continue;
    }
    if (s && !t) {
      pushDiffRow(rows, { sectionKey: sec, section: label, type: 'removed', path: sec, left: s, right: undefined }, ignoreRules);
      continue;
    }
    if (!s && !t) continue;

    // セクション固有の前処理
    let sourceForSection = s;
    let targetForSection = t;
    let stateRenames: Map<string, string> | null = null;
    if (sec === 'processSettings') {
      // プロセス管理：ステータス改名による参照カスケードを吸収（比較元側を仮想リネーム）
      stateRenames = detectProcessStateRenames(s, t);
      if (stateRenames && stateRenames.size) {
        sourceForSection = applyProcessStateRenamesToSource(s, stateRenames);
      }
    } else if (sec === 'customizeSettings') {
      // JS/CSS：安定マッチのための name 注入と、両側で本文取得済なら _body 比較へ切替
      const pair = preprocessCustomizePairForDiff(s, t);
      sourceForSection = pair.source;
      targetForSection = pair.target;
    } else if (sec === 'pluginSettings') {
      // プラグイン設定：取得済 _config を比較対象に取り込む
      sourceForSection = preprocessPluginSettingsForDiff(s);
      targetForSection = preprocessPluginSettingsForDiff(t);
    }
    const sourceForDiff = normalizeSectionForCompare(sec, sourceForSection, presetState);
    const targetForDiff = normalizeSectionForCompare(sec, targetForSection, presetState);
    if (stableStringify(sourceForDiff) === stableStringify(targetForDiff)) {
      if (includeSame) {
        pushDiffRow(rows, { sectionKey: sec, section: label, type: 'same', path: sec, left: sourceForDiff, right: targetForDiff, severity: 'low' }, ignoreRules);
      }
      continue;
    }
    const start = rows.length;
    collectDeepDiffs(sourceForDiff, targetForDiff, sec, rows, ignoreRules);
    for (let i = start; i < rows.length; i++) {
      if (!rows[i].section) rows[i].section = label;
      if (!rows[i].sectionKey) rows[i].sectionKey = sec;
      if (!rows[i].severity) rows[i].severity = detectRowSeverity(rows[i]);
    }
    // ステータス改名の通知行（_displayOnly：反映系ロジックからは除外）
    if (sec === 'processSettings' && stateRenames && stateRenames.size) {
      stateRenames.forEach((to, from) => {
        pushDiffRow(rows, {
          sectionKey: sec,
          section: label,
          type: 'changed',
          path: `${sec}.states.__rename__`,
          left: { name: from },
          right: { name: to },
          severity: 'low',
          _displayOnly: true,
          _stateRenameNotice: true,
          renameCandidate: {
            id: `state-rename:${from}:${to}`,
            fromCode: from,
            toCode: to,
            entityKind: 'state',
            sectionKey: sec,
            score: 99,
            matchedBy: 'process-state-cascade-suppressed'
          },
          reasonSummary: `ステータス改名：${from} → ${to}（参照を自動補正）`
        }, ignoreRules);
      });
    }
    if (getCollectedDiffCount(rows) >= ARRAY_DIFF_LIMIT || limitHitBefore) {
      limitHitSectionKeys.push(sec);
    }
  }
  for (const row of rows) {
    if (!row.severity) row.severity = detectRowSeverity(row);
  }
  return {
    rows: rows.map((row, idx) => ({ ...row, _id: `d${idx}` })),
    fetchIssues,
    truncation: buildDiffTruncationInfo(rows, limitHitSectionKeys)
  };
}

// 上限打ち切り（ARRAY_DIFF_LIMIT / SAME_ROW_LIMIT）の集計。
// droppedDiff/droppedSame は pushDiffRow まで到達して棄却された「判明分」のみで、
// コレクタが列挙自体を打ち切った分は含まれない（＝実際の欠落はこれ以上）。
// 打ち切りが起きた比較結果は不完全であり、UI で必ず警告表示する。
export function buildDiffTruncationInfo(rows, limitHitSectionKeys: string[] = []) {
  const droppedDiff = Number((rows as any)?.__diffDropped || 0);
  const droppedSame = Number((rows as any)?.__sameDropped || 0);
  const bySection = (rows as any)?.__droppedBySection || {};
  const sectionKeys = [...new Set([...Object.keys(bySection), ...limitHitSectionKeys])];
  const sections = sectionKeys.map((sectionKey) => ({
    sectionKey,
    section: (SECTION_DEFS.find((x) => x.key === sectionKey) || ({} as any)).label || sectionKey,
    droppedDiff: Number(bySection[sectionKey]?.diff || 0),
    droppedSame: Number(bySection[sectionKey]?.same || 0)
  }));
  return {
    truncated: droppedDiff > 0 || droppedSame > 0 || limitHitSectionKeys.length > 0,
    diffLimit: ARRAY_DIFF_LIMIT,
    sameLimit: SAME_ROW_LIMIT,
    droppedDiff,
    droppedSame,
    sections
  };
}

export function summarizeRows(rows) {
  const s = { total: rows.length, added: 0, removed: 0, changed: 0, moved: 0, same: 0 };
  for (const r of rows) {
    if (r.type === 'same') s.same += 1;
    else if (r.type === 'added') s.added += 1;
    else if (r.type === 'removed') s.removed += 1;
    else {
      s.changed += 1;
      if (r.moved) s.moved += 1;
    }
  }
  return s;
}

export function getActualDiffRows(rows) {
  return (rows || []).filter((row) => row && row.type !== 'same' && !row._displayOnly);
}

export function countActualDiffRows(rows) {
  return getActualDiffRows(rows).length;
}

export function summarizeFetchIssues(issues) {
  const out = { total: (issues || []).length, source: 0, target: 0, both: 0 };
  for (const issue of issues || []) {
    if (issue.side === 'source') out.source += 1;
    else if (issue.side === 'target') out.target += 1;
    else out.both += 1;
  }
  return out;
}

export function getDiffNormalizationPresetState() {
  return {
    viewOrder: !!ui.diffNormalizeViewOrder?.checked,
    permissionOrder: !!ui.diffNormalizePermissionOrder?.checked,
    generalArrayOrder: !!ui.diffNormalizeGeneralArrayOrder?.checked
  };
}

export function getActiveDiffNormalizationConfig(sectionKey, presetState) {
  const stateMap = presetState || getDiffNormalizationPresetState();
  const active: DiffNormalizationPreset[] = [];
  Object.keys(DIFF_NORMALIZATION_PRESETS).forEach((key) => {
    if (!stateMap[key]) return;
    const preset = DIFF_NORMALIZATION_PRESETS[key];
    if (!preset?.sections?.has(sectionKey)) return;
    active.push(preset);
  });
  if (!active.length) return null;
  const ignoreKeys = new Set<string>();
  let unorderedArrays = false;
  active.forEach((preset) => {
    preset.ignoreKeys?.forEach((key) => ignoreKeys.add(normalizeIgnoreToken(key)));
    if (preset.unorderedArrays) unorderedArrays = true;
  });
  return { ignoreKeys, unorderedArrays };
}

export function normalizeArrayForSectionCompare(arr, config) {
  const list = arr.map((item) => normalizeSectionValueForCompare(item, config));
  if (!config?.unorderedArrays) return list;
  return list.slice().sort((a, b) => {
    const sa = JSON.stringify(a);
    const sb = JSON.stringify(b);
    if (sa === sb) return 0;
    return sa < sb ? -1 : 1;
  });
}

export function normalizeSectionValueForCompare(value, config) {
  if (Array.isArray(value)) return normalizeArrayForSectionCompare(value, config);
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).sort().forEach((key) => {
      if (META_KEYS.has(key)) return;
      if (config?.ignoreKeys?.has(normalizeIgnoreToken(key))) return;
      out[key] = normalizeSectionValueForCompare(value[key], config);
    });
    return out;
  }
  return value;
}

export function normalizeSectionForCompare(sectionKey, value, presetState) {
  const config = getActiveDiffNormalizationConfig(sectionKey, presetState);
  if (!config) return value;
  return normalizeSectionValueForCompare(value, config);
}

export function getActiveDiffNormalizationLabels(presetState?: any) {
  const stateMap = presetState || getDiffNormalizationPresetState();
  return Object.keys(DIFF_NORMALIZATION_PRESETS)
    .filter((key) => !!stateMap[key])
    .map((key) => DIFF_NORMALIZATION_PRESETS[key].label);
}

// ---------------------------------------------------------------------------
// Subtable row expansion (display-only)
// テーブル（SUBTABLE）がまるごと追加/削除された場合、エンジンは親1行だけを
// 出力する。差分一覧の見通しを良くするため、表示前に「テーブル内フィールド」
// 単位の行に展開する。展開された行には _displayOnly フラグを付与し、
// 反映・適用系の処理（getActualDiffRows 等）からは除外する運用とする。
// ---------------------------------------------------------------------------
const SUBTABLE_ROOT_PATH_RE = /^fieldSettings\.properties\.([^.[\]]+)$/;

// ---------------------------------------------------------------------------
// Section-wide entity expansion (display-only)
// ---------------------------------------------------------------------------
// 非フィールドのセクション（views / process / acl / notifications / plugins /
// customize / categories / layout）が「丸ごと added/removed」となった場合、
// 既存の SUBTABLE 展開と同じ方針で、エンティティ単位の表示行を生成する。
// 親行は元のまま残し、子行に `_displayOnly:true` を付ける。
// ---------------------------------------------------------------------------
function tokenizeForExpansion(path: string | null | undefined): Array<string | number> {
  if (!path) return [];
  const out: Array<string | number> = [];
  const re = /([^[.\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m[1] != null) out.push(m[1]);
    else out.push(Number(m[2]));
  }
  return out;
}

function aclEntityLabel(entity) {
  if (!entity || typeof entity !== 'object') return '';
  const code = String(entity.code || '').trim();
  const type = String(entity.type || '').trim();
  if (!code) return type ? `(${type})` : '';
  return type ? `${code} (${type})` : code;
}

interface EntityChildSpec {
  path: string;
  payload: any;
  entityKind: string;
  entityLabel: string;
  entityCode?: string;
  reasonNoun: string;
}

function enumerateNamedMap(obj: any, basePath: string, kind: string, kindLabel: string): EntityChildSpec[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  return Object.keys(obj).map((name) => ({
    path: `${basePath}.${name}`,
    payload: obj[name],
    entityKind: kind,
    entityLabel: name,
    entityCode: name,
    reasonNoun: kindLabel
  }));
}

function enumerateArray(arr, basePath, kind, kindLabel, options: { keyField?: string | null; fallbackLabel?: (item: any, idx: number) => string } = {}): EntityChildSpec[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item, idx) => {
    let label = '';
    let code = '';
    const keyField = options.keyField;
    if (item && typeof item === 'object') {
      if (kind === 'aclEntry' || kind === 'recordAclEntry') {
        label = aclEntityLabel(item.entity);
        code = String(item.entity?.code || '');
      } else if (kind === 'fieldAclEntry') {
        label = String(item.code || '');
        code = label;
      } else if (kind === 'plugin') {
        const id = String(item.id || '');
        const name = String(item.name || '');
        label = name ? (id ? `${name} (${id})` : name) : id;
        code = id;
      } else if (kind === 'jsCss') {
        const fileKey = item.file?.fileKey || item.fileKey || '';
        const url = item.url || '';
        label = url || (fileKey ? `ファイル(${String(fileKey).slice(0, 8)}…)` : '');
        code = String(fileKey || url || '');
      } else if (kind === 'layoutRow') {
        const t = String(item.type || '').toUpperCase();
        if (t === 'GROUP' && item.code) label = `グループ「${item.code}」`;
        else if (t === 'SUBTABLE' && item.code) label = `テーブル「${item.code}」`;
        else label = `行 #${idx} (${t || 'ROW'})`;
        code = String(item.code || '');
      } else if (kind === 'notification' || kind === 'perRecordNotification' || kind === 'reminderNotification') {
        label = String(item.name || item.title || '').trim();
        if (!label && Array.isArray(item.recipients) && item.recipients.length) {
          const first = item.recipients[0];
          const rc = first?.entity?.code || first?.code || '';
          label = rc ? `${rc}${item.recipients.length > 1 ? ' 他' : ''}` : '';
        }
        code = String(item.name || '');
      } else if (keyField) {
        label = String(item[keyField] || '');
        code = label;
      }
    }
    if (!label) {
      label = options.fallbackLabel ? options.fallbackLabel(item, idx) : `${kindLabel} #${idx}`;
    }
    return {
      path: `${basePath}[${idx}]`,
      payload: item,
      entityKind: kind,
      entityLabel: label,
      entityCode: code,
      reasonNoun: kindLabel
    };
  });
}

function computeSectionWideEntityChildren(sectionKey: string, payload: any): EntityChildSpec[] {
  if (!payload || typeof payload !== 'object') return [];
  switch (sectionKey) {
    case 'viewSettings':
      return enumerateNamedMap(payload.views, `${sectionKey}.views`, 'view', 'ビュー');
    case 'reportSettings':
      return enumerateNamedMap(payload.reports, `${sectionKey}.reports`, 'report', 'グラフ');
    case 'processSettings': {
      const out: EntityChildSpec[] = [];
      out.push(...enumerateNamedMap(payload.states, `${sectionKey}.states`, 'state', 'ステータス'));
      out.push(...enumerateArray(payload.actions, `${sectionKey}.actions`, 'action', '遷移アクション', { keyField: 'name' }));
      return out;
    }
    case 'actionSettings':
      return enumerateArray(payload.actions, `${sectionKey}.actions`, 'appAction', 'アクション', { keyField: 'name' });
    case 'appAcl':
      return enumerateArray(payload.rights, `${sectionKey}.rights`, 'aclEntry', '権限エントリー');
    case 'recordPermissions':
      return enumerateArray(payload.rights, `${sectionKey}.rights`, 'recordAclEntry', 'レコード権限エントリー');
    case 'fieldAcl':
      return enumerateArray(payload.rights, `${sectionKey}.rights`, 'fieldAclEntry', 'フィールド権限');
    case 'notifications':
      return enumerateArray(payload.notifications, `${sectionKey}.notifications`, 'notification', '通知');
    case 'perRecordNotifications':
      return enumerateArray(payload.notifications, `${sectionKey}.notifications`, 'perRecordNotification', 'レコード条件通知');
    case 'reminderNotifications':
      return enumerateArray(payload.notifications, `${sectionKey}.notifications`, 'reminderNotification', 'リマインダー通知');
    case 'categories':
      return enumerateNamedMap(payload.categories, `${sectionKey}.categories`, 'category', 'カテゴリ');
    case 'pluginSettings':
      return enumerateArray(payload.plugins, `${sectionKey}.plugins`, 'plugin', 'プラグイン', { keyField: 'id' });
    case 'customizeSettings': {
      const out: EntityChildSpec[] = [];
      ['desktop', 'mobile'].forEach((platform) => {
        ['js', 'css'].forEach((kind) => {
          const arr = payload?.[platform]?.[kind];
          if (Array.isArray(arr)) {
            const platLabel = platform === 'desktop' ? 'デスクトップ' : 'モバイル';
            const kindLabel = kind.toUpperCase();
            out.push(...enumerateArray(arr, `${sectionKey}.${platform}.${kind}`, 'jsCss', `${platLabel}/${kindLabel}`).map((spec) => ({
              ...spec,
              entityLabel: `${platLabel}/${kindLabel}: ${spec.entityLabel}`
            })));
          }
        });
      });
      return out;
    }
    case 'layoutSettings':
      return enumerateArray(payload.layout, `${sectionKey}.layout`, 'layoutRow', 'レイアウト行');
    default:
      return [];
  }
}

const ENTITY_EXPAND_LIMIT = 200;

export function expandEntityRowsForDisplay(rows: DiffRow[] | null | undefined): DiffRow[] {
  if (!Array.isArray(rows) || !rows.length) return rows || [];
  const out: DiffRow[] = [];
  rows.forEach((row, idx) => {
    out.push(row);
    if (!row || row._displayOnly) return;
    if (row.sectionKey === 'fieldSettings') return;
    const isAdded = row.type === 'added';
    const isRemoved = row.type === 'removed';
    if (!isAdded && !isRemoved) return;

    const sectionKey = String(row.sectionKey || '');
    if (!sectionKey) return;

    const path = String(row.path || '');
    const tokens = tokenizeForExpansion(path);
    const isSectionWide = path === sectionKey;
    if (!isSectionWide) return; // 個別エンティティ（path = section.bucket.name）は既に粒度が十分

    const payload = isAdded ? row.right : row.left;
    let children = computeSectionWideEntityChildren(sectionKey, payload);
    if (!children.length) return;
    if (children.length > ENTITY_EXPAND_LIMIT) children = children.slice(0, ENTITY_EXPAND_LIMIT);

    const parentId = row._id || `d${idx}`;
    let childIdx = 0;
    children.forEach((spec) => {
      out.push({
        ...row,
        _id: `${parentId}::echild::${childIdx++}`,
        _parentRowId: parentId,
        _expandedFromEntity: true,
        _displayOnly: true,
        path: spec.path,
        left: isRemoved ? spec.payload : undefined,
        right: isAdded ? spec.payload : undefined,
        type: row.type,
        moved: false,
        entityKind: spec.entityKind,
        entityLabel: spec.entityLabel,
        entityCode: spec.entityCode || '',
        entityPropLabel: '',
        reasonSummary: isAdded
          ? `${spec.reasonNoun}追加：${spec.entityLabel}`
          : `${spec.reasonNoun}削除：${spec.entityLabel}`,
        renameCandidate: null,
        impactCount: 0,
        impactRefs: [],
        impactSummary: ''
      });
    });
  });
  return out;
}

export function expandSubtableRowsForDisplay(rows: DiffRow[] | null | undefined): DiffRow[] {
  if (!Array.isArray(rows) || !rows.length) return rows || [];
  const out: DiffRow[] = [];
  rows.forEach((row, idx) => {
    out.push(row);
    if (!row || row._displayOnly) return;
    if (row.sectionKey !== 'fieldSettings') return;
    const isAdded = row.type === 'added';
    const isRemoved = row.type === 'removed';
    if (!isAdded && !isRemoved) return;
    const pathMatch = SUBTABLE_ROOT_PATH_RE.exec(String(row.path || ''));
    if (!pathMatch) return;
    const payload = isAdded ? row.right : row.left;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
    if (payload.type !== 'SUBTABLE') return;
    const inner = payload.fields;
    if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return;
    const tableLabel = String(payload.label || payload.name || pathMatch[1]);
    const parentId = row._id || `d${idx}`;
    let childIdx = 0;
    Object.keys(inner).forEach((code) => {
      const field = inner[code];
      if (!field || typeof field !== 'object' || Array.isArray(field)) return;
      const childPath = `${row.path}.fields.${code}`;
      const childLabel = String(field.label || field.name || field.code || code);
      const reason = isAdded
        ? `テーブル「${tableLabel}」内のフィールド追加 (${childLabel})`
        : `テーブル「${tableLabel}」内のフィールド削除 (${childLabel})`;
      out.push({
        ...row,
        _id: `${parentId}::tchild::${code}::${childIdx++}`,
        _parentRowId: parentId,
        _expandedFromTable: true,
        _displayOnly: true,
        path: childPath,
        left: isRemoved ? field : undefined,
        right: isAdded ? field : undefined,
        type: row.type,
        moved: false,
        reasonSummary: reason,
        severity: row.severity || 'medium',
        renameCandidate: null,
        impactCount: 0,
        impactRefs: [],
        impactSummary: ''
      });
    });
  });
  return out;
}
