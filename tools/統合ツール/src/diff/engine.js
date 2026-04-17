'use strict';

import { SECTION_DEFS, META_KEYS, DIFF_NORMALIZATION_PRESETS, DEFAULT_IGNORE_KEYS } from '../constants.js';
import { state, ui } from '../state.js';
import { normalize, deepClone, stableStringify } from '../utils.js';

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

export function detectRowSeverity(row) {
  const sec = row?.sectionKey || '';
  const path = String(row?.path || '').toLowerCase();
  if (row?.type === 'removed') return 'high';
  if (HIGH_IMPACT_SECTIONS.has(sec)) return 'high';
  if (path.includes('lookup') || path.includes('relatedapp') || path.includes('condition')) return 'high';
  if (MEDIUM_IMPACT_SECTIONS.has(sec)) return 'medium';
  return 'low';
}

export function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
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

export function parseIgnoreRules(text) {
  const keySet = new Set(DEFAULT_IGNORE_KEYS);
  const pathSet = new Set();
  String(text || '')
    .split(/[\n\r,、，;；\s\u3000]+/)
    .map(normalizeIgnoreToken)
    .filter(Boolean)
    .forEach((token) => {
      if (token.includes('.') || token.includes('[')) pathSet.add(token.replace(/\s+/g, ''));
      else keySet.add(token);
    });
  return { keySet, pathSet };
}

export function isIgnoredKey(ignoreRules, key) {
  const normalized = normalizeIgnoreToken(key);
  return !!normalized && ignoreRules.keySet.has(normalized);
}

export function isIgnoredPath(ignoreRules, path) {
  const normalizedPath = normalizeIgnoreToken(path).replace(/\s+/g, '');
  if (!normalizedPath) return false;
  if (ignoreRules.pathSet.has(normalizedPath)) return true;
  const leaf = getPathLeafKey(normalizedPath);
  return !!leaf && ignoreRules.keySet.has(leaf);
}

export function pushDiffRow(out, row, ignoreRules) {
  if (!row) return false;
  if (isIgnoredPath(ignoreRules, row.path)) return false;
  if (row.type === 'same') {
    const sameCount = Number(out?.__sameCount || 0);
    if (sameCount >= SAME_ROW_LIMIT) return false;
    if (out) out.__sameCount = sameCount + 1;
    out.push(row);
    return true;
  }
  const diffCount = Number(out?.__diffCount || 0);
  if (diffCount >= ARRAY_DIFF_LIMIT) return false;
  if (out) out.__diffCount = diffCount + 1;
  out.push(row);
  return true;
}

export function getCollectedDiffCount(rows) {
  if (!Array.isArray(rows)) return 0;
  const count = Number(rows.__diffCount);
  if (Number.isFinite(count)) return count;
  return rows.filter((row) => row?.type !== 'same').length;
}

export function canCollectSameRows(rows) {
  if (!Array.isArray(rows)) return false;
  if (!rows.__includeSame) return false;
  const count = Number(rows.__sameCount);
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
    const sig = `${typeof val}:${String(val)}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
  }
  return true;
}

export function detectArrayObjectKey(a, b, ignoreRules) {
  if (!a.length || !b.length) return null;
  if (!a.every(isPlainObject) || !b.every(isPlainObject)) return null;
  const firstA = a.find(isPlainObject) || {};
  const firstB = b.find(isPlainObject) || {};
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
  const ordered = [];
  const seen = new Set();
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

  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return true;
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
  return true;
}

export function collectArrayDiffs(a, b, path, out, ignoreRules) {
  if (collectArrayDiffsByObjectKey(a, b, path, out, ignoreRules)) return;
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
    pushDiffRow(out, { type: 'changed', path, left: a, right: b }, ignoreRules);
    return;
  }

  if (a == null || b == null) {
    pushDiffRow(out, { type: 'changed', path, left: a, right: b }, ignoreRules);
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
      if (!Object.prototype.hasOwnProperty.call(b, k)) pushDiffRow(out, { type: 'removed', path: p, left: a[k], right: undefined }, ignoreRules);
      else if (!Object.prototype.hasOwnProperty.call(a, k)) pushDiffRow(out, { type: 'added', path: p, left: undefined, right: b[k] }, ignoreRules);
      else collectDeepDiffs(a[k], b[k], p, out, ignoreRules);
      if (getCollectedDiffCount(out) >= ARRAY_DIFF_LIMIT) return;
    }
    return;
  }

  pushDiffRow(out, { type: 'changed', path, left: a, right: b }, ignoreRules);
}

export function computeDiffRows(sourceBundle, targetBundle, sections, ignoreKeysText, options = {}) {
  const ignoreRules = parseIgnoreRules(ignoreKeysText);
  const presetState = options.normalizationPresetState || {};
  const includeSame = !!options.includeSame;
  const rows = [];
  rows.__diffCount = 0;
  rows.__sameCount = 0;
  rows.__includeSame = includeSame;
  const fetchIssues = [];
  for (const sec of sections) {
    const label = (SECTION_DEFS.find((x) => x.key === sec) || {}).label || sec;
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

    const sourceForDiff = normalizeSectionForCompare(sec, s, presetState);
    const targetForDiff = normalizeSectionForCompare(sec, t, presetState);
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
  }
  for (const row of rows) {
    if (!row.severity) row.severity = detectRowSeverity(row);
  }
  return {
    rows: rows.map((row, idx) => ({ ...row, _id: `d${idx}` })),
    fetchIssues
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
  const active = [];
  Object.keys(DIFF_NORMALIZATION_PRESETS).forEach((key) => {
    if (!stateMap[key]) return;
    const preset = DIFF_NORMALIZATION_PRESETS[key];
    if (!preset?.sections?.has(sectionKey)) return;
    active.push(preset);
  });
  if (!active.length) return null;
  const ignoreKeys = new Set();
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

export function getActiveDiffNormalizationLabels(presetState) {
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

export function expandSubtableRowsForDisplay(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows || [];
  const out = [];
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
