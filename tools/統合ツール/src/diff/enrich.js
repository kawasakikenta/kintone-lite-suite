'use strict';

import {
  SECTION_DEFS,
  META_KEYS,
  DIFF_IMPACT_REF_LIMIT, FIELD_REF_EXACT_KEYS, FIELD_REF_ARRAY_KEYS, FIELD_REF_TOKEN_KEYS
} from '../constants.js';
import { state } from '../state.js';
import { normalize, deepClone, stableStringify } from '../utils.js';
import { getActualDiffRows } from './engine.js';

// utils.js と同一ロジック。IIFE バンドルで utils からの import が欠落した場合でも動作するようローカル定義する。
function relativePathFromRow(path, secKey) {
  if (!path) return '';
  if (path === secKey) return '';
  if (path.startsWith(`${secKey}.`)) return path.slice(secKey.length + 1);
  if (path.startsWith(`${secKey}[`)) return path.slice(secKey.length);
  return null;
}
function tokenizePath(path) {
  if (!path) return [];
  const out = [];
  const re = /([^[.\]]+)|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(path)) !== null) {
    if (m[1] != null) out.push(m[1]);
    else out.push(Number(m[2]));
  }
  return out;
}

function getPathLeafKey(path) {
  const m = String(path || '').match(/([^[.\]]+)(?:\[\d+\])?$/);
  return m ? m[1] : '';
}

function normalizeIgnoreToken(token) {
  return String(token || '')
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
    .replace(/^[\s\u3000]+|[\s\u3000]+$/g, '')
    .toLowerCase();
}

export function summarizeSeverity(rows) {
  const out = { high: 0, medium: 0, low: 0 };
  (rows || []).forEach((r) => {
    if (!r || r.type === 'same') return;
    const sev = r?.severity || 'low';
    if (sev === 'high') out.high += 1;
    else if (sev === 'medium') out.medium += 1;
    else out.low += 1;
  });
  return out;
}

export function normalizeLooseText(value) {
  return String(value || '').trim().toLowerCase();
}

export function tokenizeLooseText(value) {
  return normalizeLooseText(value).split(/[^a-z0-9_]+/).filter((token) => token.length >= 2);
}

export function scoreTokenOverlap(a, b) {
  const setA = new Set(tokenizeLooseText(a));
  const setB = new Set(tokenizeLooseText(b));
  if (!setA.size || !setB.size) return 0;
  let common = 0;
  setA.forEach((token) => {
    if (setB.has(token)) common += 1;
  });
  return common / Math.max(setA.size, setB.size);
}

export function normalizeFieldDefForRename(value, options = {}) {
  if (Array.isArray(value)) return value.map((item) => normalizeFieldDefForRename(item, options));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  Object.keys(value).sort().forEach((key) => {
    if (META_KEYS.has(key)) return;
    if (['code', 'id', 'appid', 'index', 'no', 'order'].includes(key)) return;
    if (options.dropPresentation && ['label', 'name'].includes(key)) return;
    out[key] = normalizeFieldDefForRename(value[key], options);
  });
  return out;
}

export function extractFieldPathInfo(path) {
  const rel = relativePathFromRow(path, 'fieldSettings');
  if (!rel) return null;
  const tokens = tokenizePath(rel);
  if (tokens[0] !== 'properties' || typeof tokens[1] !== 'string') return null;
  const rootCode = tokens[1];
  const isSubField = tokens[2] === 'fields' && typeof tokens[3] === 'string';
  const subFieldCode = isSubField ? tokens[3] : '';
  const tailTokens = tokens.slice(isSubField ? 4 : 2);
  return {
    rootCode,
    subFieldCode,
    activeCode: subFieldCode || rootCode,
    isSubField,
    tailTokens,
    leafKey: tailTokens.length ? String(tailTokens[tailTokens.length - 1]) : '',
    isFieldRoot: !isSubField && tailTokens.length === 0,
    isSubFieldRoot: isSubField && tailTokens.length === 0,
    rootPath: isSubField
      ? `fieldSettings.properties.${rootCode}.fields.${subFieldCode}`
      : `fieldSettings.properties.${rootCode}`
  };
}

export function getFieldRowPayload(row) {
  if (!row || row.sectionKey !== 'fieldSettings') return null;
  const info = extractFieldPathInfo(row.path);
  if (!info) return null;
  if (row.type === 'added') return row.right;
  if (row.type === 'removed') return row.left;
  return row.right || row.left || null;
}

export function scoreFieldRenameCandidate(removedRow, addedRow) {
  const leftDef = getFieldRowPayload(removedRow);
  const rightDef = getFieldRowPayload(addedRow);
  if (!leftDef || !rightDef) return null;
  if (String(leftDef.type || '') !== String(rightDef.type || '')) return null;

  const reasons = [];
  let score = 0;
  const exactSigLeft = stableStringify(normalizeFieldDefForRename(leftDef));
  const exactSigRight = stableStringify(normalizeFieldDefForRename(rightDef));
  const coreSigLeft = stableStringify(normalizeFieldDefForRename(leftDef, { dropPresentation: true }));
  const coreSigRight = stableStringify(normalizeFieldDefForRename(rightDef, { dropPresentation: true }));
  const leftLabel = normalizeLooseText(leftDef.label || leftDef.name || '');
  const rightLabel = normalizeLooseText(rightDef.label || rightDef.name || '');
  const leftCode = normalizeLooseText(leftDef.code || extractFieldPathInfo(removedRow.path)?.activeCode || '');
  const rightCode = normalizeLooseText(rightDef.code || extractFieldPathInfo(addedRow.path)?.activeCode || '');
  let hasStrongMatch = false;

  score += 3;
  reasons.push(`type:${leftDef.type || '-'}`);
  if (exactSigLeft === exactSigRight) {
    score += 6;
    reasons.push('same-structure');
    hasStrongMatch = true;
  } else if (coreSigLeft === coreSigRight) {
    score += 5;
    reasons.push('same-core');
    hasStrongMatch = true;
  }
  if (leftLabel && rightLabel && leftLabel === rightLabel) {
    score += 3;
    reasons.push('same-label');
    hasStrongMatch = true;
  } else if (scoreTokenOverlap(leftLabel, rightLabel) >= 0.6) {
    score += 1;
    reasons.push('label-similar');
    hasStrongMatch = true;
  }
  if (scoreTokenOverlap(leftCode, rightCode) >= 0.5) {
    score += 1;
    reasons.push('code-similar');
  }
  if (leftDef.required === rightDef.required) {
    score += 1;
    reasons.push('same-required');
  }
  if (!!leftDef.lookup === !!rightDef.lookup) {
    score += 1;
    reasons.push('same-lookup');
  }
  if (!hasStrongMatch) return null;
  if (score < 6) return null;
  return {
    score,
    matchedBy: reasons.join(', ')
  };
}

export function detectFieldRenameCandidates(rows) {
  const removedRows = (rows || []).filter((row) => row.sectionKey === 'fieldSettings' && row.type === 'removed' && extractFieldPathInfo(row.path)?.isFieldRoot);
  const addedRows = (rows || []).filter((row) => row.sectionKey === 'fieldSettings' && row.type === 'added' && extractFieldPathInfo(row.path)?.isFieldRoot);
  const candidates = [];
  removedRows.forEach((removedRow) => {
    addedRows.forEach((addedRow) => {
      const scored = scoreFieldRenameCandidate(removedRow, addedRow);
      if (!scored) return;
      candidates.push({
        removedRow,
        addedRow,
        score: scored.score,
        matchedBy: scored.matchedBy
      });
    });
  });
  candidates.sort((a, b) => b.score - a.score);

  const usedRemoved = new Set();
  const usedAdded = new Set();
  const out = new Map();
  candidates.forEach((candidate) => {
    if (usedRemoved.has(candidate.removedRow._id) || usedAdded.has(candidate.addedRow._id)) return;
    usedRemoved.add(candidate.removedRow._id);
    usedAdded.add(candidate.addedRow._id);
    const fromCode = extractFieldPathInfo(candidate.removedRow.path)?.activeCode || '';
    const toCode = extractFieldPathInfo(candidate.addedRow.path)?.activeCode || '';
    const renameInfo = {
      id: `rename:${fromCode}:${toCode}`,
      fromCode,
      toCode,
      score: candidate.score,
      matchedBy: candidate.matchedBy
    };
    out.set(candidate.removedRow._id, renameInfo);
    out.set(candidate.addedRow._id, renameInfo);
  });
  return out;
}

export function collectFieldDefinitions(properties, out = {}) {
  if (!properties || typeof properties !== 'object') return out;
  Object.entries(properties).forEach(([code, field]) => {
    if (!field || typeof field !== 'object') return;
    out[code] = field;
    if (field.type === 'SUBTABLE' && field.fields && typeof field.fields === 'object') {
      collectFieldDefinitions(field.fields, out);
    }
  });
  return out;
}

export function addFieldImpactRef(index, code, ref) {
  const fieldCode = String(code || '').trim();
  if (!fieldCode) return;
  if (!index.has(fieldCode)) index.set(fieldCode, []);
  const bucket = index.get(fieldCode);
  const sig = [ref.sectionKey, ref.kind, ref.path, ref.label].join('|');
  if (bucket.some((item) => [item.sectionKey, item.kind, item.path, item.label].join('|') === sig)) return;
  bucket.push(ref);
}

export function collectExpressionFieldRefs(text, codeSet) {
  const matches = new Set();
  const re = /[A-Za-z_][A-Za-z0-9_]*/g;
  let match;
  while ((match = re.exec(String(text || ''))) !== null) {
    if (codeSet.has(match[0])) matches.add(match[0]);
  }
  return [...matches];
}

export function collectFieldRefsFromFieldSettings(fieldSettings, codeSet, index) {
  const props = fieldSettings?.properties || fieldSettings || {};
  const walk = (fields, parentPath) => {
    Object.entries(fields || {}).forEach(([code, field]) => {
      if (!field || typeof field !== 'object') return;
      const pathBase = `${parentPath}.${code}`;
      const label = field.label || field.name || code;
      if (field.lookup && Array.isArray(field.lookup.fieldMappings)) {
        field.lookup.fieldMappings.forEach((mapping, idx) => {
          const localField = String(mapping?.field || '').trim();
          if (!localField || !codeSet.has(localField)) return;
          addFieldImpactRef(index, localField, {
            sectionKey: 'fieldSettings',
            section: SECTION_DEFS.find((item) => item.key === 'fieldSettings')?.label || 'fieldSettings',
            kind: 'ルックアップコピー',
            label,
            path: `${pathBase}.lookup.fieldMappings[${idx}].field`
          });
        });
      }
      if (field.expression) {
        collectExpressionFieldRefs(field.expression, codeSet).forEach((refCode) => {
          addFieldImpactRef(index, refCode, {
            sectionKey: 'fieldSettings',
            section: SECTION_DEFS.find((item) => item.key === 'fieldSettings')?.label || 'fieldSettings',
            kind: '計算式参照',
            label,
            path: `${pathBase}.expression`
          });
        });
      }
      if (field.type === 'SUBTABLE' && field.fields && typeof field.fields === 'object') {
        walk(field.fields, `${pathBase}.fields`);
      }
    });
  };
  walk(props, 'fieldSettings.properties');
}

export function collectLayoutFieldRefs(layoutSettings, codeSet, index) {
  const walkRows = (rows, path) => {
    (Array.isArray(rows) ? rows : []).forEach((row, rowIdx) => {
      const rowPath = `${path}[${rowIdx}]`;
      if (row?.type === 'GROUP' && Array.isArray(row.layout)) {
        walkRows(row.layout, `${rowPath}.layout`);
        return;
      }
      const items = Array.isArray(row?.fields) ? row.fields : [];
      items.forEach((item, itemIdx) => {
        if (!item || typeof item !== 'object') return;
        const itemPath = `${rowPath}.fields[${itemIdx}]`;
        const fieldCode = String(item.code || '').trim();
        if (fieldCode && codeSet.has(fieldCode)) {
          addFieldImpactRef(index, fieldCode, {
            sectionKey: 'layoutSettings',
            section: SECTION_DEFS.find((entry) => entry.key === 'layoutSettings')?.label || 'layoutSettings',
            kind: 'レイアウト配置',
            label: item.label || fieldCode,
            path: `${itemPath}.code`
          });
        }
        if (item.type === 'GROUP' && Array.isArray(item.layout)) {
          walkRows(item.layout, `${itemPath}.layout`);
        }
        if (item.type === 'SUBTABLE' && Array.isArray(item.fields)) {
          item.fields.forEach((subItem, subIdx) => {
            const subCode = String(subItem?.code || '').trim();
            if (!subCode || !codeSet.has(subCode)) return;
            addFieldImpactRef(index, subCode, {
              sectionKey: 'layoutSettings',
              section: SECTION_DEFS.find((entry) => entry.key === 'layoutSettings')?.label || 'layoutSettings',
              kind: 'テーブル配置',
              label: subItem.label || subCode,
              path: `${itemPath}.fields[${subIdx}].code`
            });
          });
        }
      });
    });
  };
  walkRows(layoutSettings?.layout || [], 'layoutSettings.layout');
}

export function scanSectionForFieldRefs(sectionKey, value, codeSet, index, path = sectionKey, parentKey = '') {
  if (Array.isArray(value)) {
    if (FIELD_REF_ARRAY_KEYS.has(parentKey)) {
      value.forEach((item, idx) => {
        const fieldCode = String(item || '').trim();
        if (!codeSet.has(fieldCode)) return;
        addFieldImpactRef(index, fieldCode, {
          sectionKey,
          section: SECTION_DEFS.find((entry) => entry.key === sectionKey)?.label || sectionKey,
          kind: '配列参照',
          label: parentKey,
          path: `${path}[${idx}]`
        });
      });
    }
    value.forEach((item, idx) => {
      scanSectionForFieldRefs(sectionKey, item, codeSet, index, `${path}[${idx}]`, parentKey);
    });
    return;
  }
  if (value && typeof value === 'object') {
    Object.keys(value).forEach((key) => {
      scanSectionForFieldRefs(sectionKey, value[key], codeSet, index, `${path}.${key}`, key);
    });
    return;
  }
  if (typeof value !== 'string') return;
  const text = value.trim();
  if (!text) return;
  if (FIELD_REF_EXACT_KEYS.has(parentKey) && codeSet.has(text)) {
    addFieldImpactRef(index, text, {
      sectionKey,
      section: SECTION_DEFS.find((entry) => entry.key === sectionKey)?.label || sectionKey,
      kind: 'フィールド参照',
      label: parentKey,
      path
    });
    return;
  }
  if (!FIELD_REF_TOKEN_KEYS.has(parentKey)) return;
  collectExpressionFieldRefs(text, codeSet).forEach((fieldCode) => {
    addFieldImpactRef(index, fieldCode, {
      sectionKey,
      section: SECTION_DEFS.find((entry) => entry.key === sectionKey)?.label || sectionKey,
      kind: parentKey === 'expression' ? '式参照' : '条件参照',
      label: parentKey,
      path
    });
  });
}

export function buildCombinedFieldImpactIndex(sourceBundle, targetBundle = null) {
  const sourceFields = collectFieldDefinitions(sourceBundle?.sections?.fieldSettings?.properties || sourceBundle?.sections?.fieldSettings || {});
  const targetFields = collectFieldDefinitions(targetBundle?.sections?.fieldSettings?.properties || targetBundle?.sections?.fieldSettings || {});
  const codeSet = new Set([...Object.keys(sourceFields), ...Object.keys(targetFields)]);
  const index = new Map();
  if (!codeSet.size) return index;
  [sourceBundle, targetBundle].forEach((bundle) => {
    if (!bundle?.sections) return;
    collectFieldRefsFromFieldSettings(bundle.sections.fieldSettings, codeSet, index);
    collectLayoutFieldRefs(bundle.sections.layoutSettings, codeSet, index);
    [
      'viewSettings',
      'reportSettings',
      'processSettings',
      'actionSettings',
      'notifications',
      'perRecordNotifications',
      'reminderNotifications'
    ].forEach((sectionKey) => {
      scanSectionForFieldRefs(sectionKey, bundle.sections[sectionKey], codeSet, index, sectionKey, '');
    });
  });
  return index;
}

export function resolveRowImpactRefs(row, impactIndex) {
  const codes = new Set();
  const fieldInfo = extractFieldPathInfo(row.path);
  if (fieldInfo?.activeCode) codes.add(fieldInfo.activeCode);
  if (row.renameCandidate?.fromCode) codes.add(row.renameCandidate.fromCode);
  if (row.renameCandidate?.toCode) codes.add(row.renameCandidate.toCode);
  if (!codes.size) return [];
  const refs = [];
  const seen = new Set();
  codes.forEach((code) => {
    (impactIndex.get(code) || []).forEach((ref) => {
      const sig = [ref.sectionKey, ref.kind, ref.path, ref.label].join('|');
      if (seen.has(sig)) return;
      seen.add(sig);
      refs.push(ref);
    });
  });
  const order = new Map(SECTION_DEFS.map((entry, idx) => [entry.key, idx]));
  refs.sort((a, b) => {
    const ao = order.has(a.sectionKey) ? order.get(a.sectionKey) : 999;
    const bo = order.has(b.sectionKey) ? order.get(b.sectionKey) : 999;
    if (ao !== bo) return ao - bo;
    return String(a.path || '').localeCompare(String(b.path || ''));
  });
  return refs;
}

export function summarizeImpactRefs(refs) {
  if (!refs.length) return '';
  const sectionCounts = new Map();
  refs.forEach((ref) => {
    const key = ref.section || ref.sectionKey || '-';
    sectionCounts.set(key, (sectionCounts.get(key) || 0) + 1);
  });
  const head = [...sectionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([section, count]) => `${section}:${count}`)
    .join(' / ');
  return head || `影響 ${refs.length}件`;
}

export function buildDiffReasonSummary(row) {
  const sectionKey = row.sectionKey || '';
  const sectionLabel = SECTION_DEFS.find((entry) => entry.key === sectionKey)?.label || sectionKey || '差分';
  const fieldInfo = extractFieldPathInfo(row.path);
  const leafKey = normalizeIgnoreToken(getPathLeafKey(row.path));
  if (row.moved) {
    if (sectionKey === 'layoutSettings') return 'レイアウト順序変更';
    if (sectionKey === 'categories') return 'カテゴリ順序変更';
    return '順序変更';
  }
  if (sectionKey === 'fieldSettings' && fieldInfo) {
    const noun = fieldInfo.isSubField ? 'サブフィールド' : 'フィールド';
    if (fieldInfo.isFieldRoot || fieldInfo.isSubFieldRoot) {
      if (row.type === 'added') return `${noun}追加`;
      if (row.type === 'removed') return `${noun}削除`;
      return `${noun}定義変更`;
    }
    if (fieldInfo.leafKey === 'label' || fieldInfo.leafKey === 'name') return `${noun}名変更`;
    if (fieldInfo.leafKey === 'type') return `${noun}型変更`;
    if (fieldInfo.leafKey === 'required') return '必須設定変更';
    if (fieldInfo.leafKey === 'expression') return '計算式変更';
    if (fieldInfo.leafKey === 'unique') return '重複禁止設定変更';
    if (String(row.path || '').includes('.lookup.')) return 'ルックアップ設定変更';
    return `${noun}設定変更`;
  }
  if (sectionKey === 'layoutSettings') return 'レイアウト変更';
  if (sectionKey === 'viewSettings') {
    if (String(row.path || '').includes('filterCond')) return 'ビュー条件変更';
    if (String(row.path || '').includes('.fields')) return 'ビュー列変更';
    if (leafKey === 'name') return 'ビュー名変更';
    return row.type === 'added' ? 'ビュー追加' : (row.type === 'removed' ? 'ビュー削除' : 'ビュー設定変更');
  }
  if (sectionKey === 'reportSettings') {
    if (String(row.path || '').includes('filterCond')) return 'グラフ条件変更';
    return row.type === 'added' ? 'グラフ追加' : (row.type === 'removed' ? 'グラフ削除' : 'グラフ設定変更');
  }
  if (sectionKey === 'processSettings') {
    if (String(row.path || '').includes('.states.')) return row.type === 'added' ? 'ステータス追加' : (row.type === 'removed' ? 'ステータス削除' : 'ステータス設定変更');
    if (String(row.path || '').includes('.actions.')) return row.type === 'added' ? '遷移アクション追加' : (row.type === 'removed' ? '遷移アクション削除' : '遷移アクション変更');
    if (leafKey === 'enable') return 'プロセス有効/無効変更';
    return 'プロセス設定変更';
  }
  if (sectionKey === 'actionSettings') return row.type === 'added' ? 'アクション追加' : (row.type === 'removed' ? 'アクション削除' : 'アクション設定変更');
  if (['appAcl', 'fieldAcl', 'recordPermissions'].includes(sectionKey)) return row.type === 'added' ? '権限追加' : (row.type === 'removed' ? '権限削除' : '権限変更');
  if (['notifications', 'perRecordNotifications', 'reminderNotifications'].includes(sectionKey)) {
    if (String(row.path || '').includes('condition')) return '通知条件変更';
    return row.type === 'added' ? '通知追加' : (row.type === 'removed' ? '通知削除' : '通知設定変更');
  }
  if (sectionKey === 'categories') return row.type === 'added' ? 'カテゴリ追加' : (row.type === 'removed' ? 'カテゴリ削除' : 'カテゴリ設定変更');
  return row.type === 'added' ? `${sectionLabel}追加` : (row.type === 'removed' ? `${sectionLabel}削除` : `${sectionLabel}変更`);
}

export function enrichDiffRows(rows, sourceBundle, targetBundle) {
  const renameMap = detectFieldRenameCandidates(rows);
  const impactIndex = buildCombinedFieldImpactIndex(sourceBundle, targetBundle);
  return (rows || []).map((row) => {
    const next = { ...row };
    const renameCandidate = renameMap.get(row._id);
    if (renameCandidate) next.renameCandidate = renameCandidate;
    const reason = buildDiffReasonSummary(next);
    if (reason) next.reasonSummary = renameCandidate ? `${reason} / コード変更候補` : reason;
    const impactRefs = resolveRowImpactRefs(next, impactIndex);
    if (impactRefs.length) {
      next.impactRefs = impactRefs.slice(0, DIFF_IMPACT_REF_LIMIT);
      next.impactCount = impactRefs.length;
      next.impactSummary = summarizeImpactRefs(impactRefs);
    } else {
      next.impactRefs = [];
      next.impactCount = 0;
      next.impactSummary = '';
    }
    return next;
  });
}
