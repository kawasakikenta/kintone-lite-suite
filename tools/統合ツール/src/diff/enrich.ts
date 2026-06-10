'use strict';

import {
  SECTION_DEFS,
  META_KEYS,
  DIFF_IMPACT_REF_LIMIT, FIELD_REF_EXACT_KEYS, FIELD_REF_ARRAY_KEYS, FIELD_REF_TOKEN_KEYS
} from '../constants.js';
import { state } from '../state.js';
import { stableStringify } from '../utils.js';

// utils.js と同一ロジック。IIFE バンドルで utils からの import が欠落した場合でも動作するようローカル定義する。
function relativePathFromRow(path, secKey) {
  if (!path) return '';
  if (path === secKey) return '';
  if (path.startsWith(`${secKey}.`)) return path.slice(secKey.length + 1);
  if (path.startsWith(`${secKey}[`)) return path.slice(secKey.length);
  return null;
}
function tokenizePath(path): Array<string | number> {
  if (!path) return [];
  const out: Array<string | number> = [];
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

export function normalizeFieldDefForRename(value, options: any = {}) {
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
  const rootCode = tokens[1] as string;
  const isSubField = tokens[2] === 'fields' && typeof tokens[3] === 'string';
  const subFieldCode = (isSubField ? tokens[3] : '') as string;
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
  const leftDef: any = getFieldRowPayload(removedRow);
  const rightDef: any = getFieldRowPayload(addedRow);
  if (!leftDef || !rightDef) return null;
  if (String(leftDef.type || '') !== String(rightDef.type || '')) return null;

  const reasons: string[] = [];
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
  const codeOverlap = scoreTokenOverlap(leftCode, rightCode);
  if (codeOverlap >= 0.5) {
    score += 1;
    reasons.push('code-similar');
  }
  // ラベルが取れない / 一致しない場合でも、コードトークン重なりが十分高ければ rename 候補として扱う
  // （例: company_name → company は scoreTokenOverlap = 0.5、companyName → company は ≒1.0）
  if (!hasStrongMatch && codeOverlap >= 0.7) {
    score += 2;
    reasons.push('code-strong');
    hasStrongMatch = true;
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
  type RenameCandidate = { removedRow: any; addedRow: any; score: number; matchedBy: string };
  const candidates: RenameCandidate[] = [];
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

  const usedRemoved = new Set<string>();
  const usedAdded = new Set<string>();
  const out = new Map<string, any>();
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

export function collectFieldDefinitions(properties: any, out: any = {}) {
  if (!properties || typeof properties !== 'object') return out;
  Object.entries(properties).forEach(([code, field]: [string, any]) => {
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

export function collectFieldRefsFromFieldSettings(fieldSettings: any, codeSet: Set<string>, index: Map<string, any[]>) {
  const props = fieldSettings?.properties || fieldSettings || ({} as any);
  const walk = (fields: any, parentPath: string) => {
    Object.entries(fields || ({} as any)).forEach(([code, field]: [string, any]) => {
      if (!field || typeof field !== 'object') return;
      const pathBase = `${parentPath}.${code}`;
      const label = field.label || field.name || code;
      if (field.lookup && Array.isArray(field.lookup.fieldMappings)) {
        field.lookup.fieldMappings.forEach((mapping: any, idx: number) => {
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

export function collectLayoutFieldRefs(layoutSettings: any, codeSet: Set<string>, index: Map<string, any[]>) {
  const walkRows = (rows: any, path: string) => {
    (Array.isArray(rows) ? rows : []).forEach((row: any, rowIdx: number) => {
      const rowPath = `${path}[${rowIdx}]`;
      if (row?.type === 'GROUP' && Array.isArray(row.layout)) {
        walkRows(row.layout, `${rowPath}.layout`);
        return;
      }
      const items = Array.isArray(row?.fields) ? row.fields : [];
      items.forEach((item: any, itemIdx: number) => {
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
          item.fields.forEach((subItem: any, subIdx: number) => {
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

export function buildCombinedFieldImpactIndex(sourceBundle: any, targetBundle: any = null) {
  const sourceFields = collectFieldDefinitions(sourceBundle?.sections?.fieldSettings?.properties || sourceBundle?.sections?.fieldSettings || ({} as any));
  const targetFields = collectFieldDefinitions(targetBundle?.sections?.fieldSettings?.properties || targetBundle?.sections?.fieldSettings || ({} as any));
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
      'reminderNotifications',
      // 権限系：fieldAcl.rights[].code / recordPermissions の FIELD_ENTITY・filterCond が
      // フィールドコードを参照する（フィールド削除・改名の影響範囲に含める）
      'fieldAcl',
      'recordPermissions'
    ].forEach((sectionKey) => {
      scanSectionForFieldRefs(sectionKey, bundle.sections[sectionKey], codeSet, index, sectionKey, '');
    });
  });
  return index;
}

// ---------------------------------------------------------------------------
// Process status impact index
// ---------------------------------------------------------------------------
// ステータス（processSettings.states のキー）を参照している遷移アクションを
// 逆引きする。ステータス削除・改名行に「影響: 遷移 N件」を出すための索引。
// ---------------------------------------------------------------------------
export function buildStatusImpactIndex(sourceBundle: any, targetBundle: any = null): Map<string, any[]> {
  const index = new Map<string, any[]>();
  const sectionLabel = SECTION_DEFS.find((entry) => entry.key === 'processSettings')?.label || 'processSettings';
  const add = (stateName: string, ref: any) => {
    const name = String(stateName || '').trim();
    if (!name) return;
    if (!index.has(name)) index.set(name, []);
    const bucket = index.get(name)!;
    const sig = [ref.sectionKey, ref.kind, ref.path, ref.label].join('|');
    if (bucket.some((item) => [item.sectionKey, item.kind, item.path, item.label].join('|') === sig)) return;
    bucket.push(ref);
  };
  [sourceBundle, targetBundle].forEach((bundle) => {
    const proc = bundle?.sections?.processSettings;
    if (!proc || typeof proc !== 'object') return;
    const actions = Array.isArray(proc.actions) ? proc.actions : [];
    actions.forEach((act: any, idx: number) => {
      if (!act || typeof act !== 'object') return;
      const label = String(act.name || `遷移 #${idx}`);
      if (typeof act.from === 'string' && act.from) {
        add(act.from, {
          sectionKey: 'processSettings',
          section: sectionLabel,
          kind: '遷移元参照',
          label,
          path: `processSettings.actions[${idx}].from`
        });
      }
      if (typeof act.to === 'string' && act.to) {
        add(act.to, {
          sectionKey: 'processSettings',
          section: sectionLabel,
          kind: '遷移先参照',
          label,
          path: `processSettings.actions[${idx}].to`
        });
      }
    });
  });
  return index;
}

function extractStateNameFromRow(row: any): string {
  if (String(row?.sectionKey || '') !== 'processSettings') return '';
  const tokens = tokenizePath(String(row?.path || ''));
  if (tokens[1] === 'states' && typeof tokens[2] === 'string') return tokens[2];
  return '';
}

export function resolveRowImpactRefs(row, impactIndex, statusImpactIndex: Map<string, any[]> | null = null) {
  const codes = new Set();
  const fieldInfo = extractFieldPathInfo(row.path);
  if (fieldInfo?.activeCode) codes.add(fieldInfo.activeCode);
  if (row.renameCandidate?.fromCode) codes.add(row.renameCandidate.fromCode);
  if (row.renameCandidate?.toCode) codes.add(row.renameCandidate.toCode);

  // ステータス行：参照している遷移アクションを影響範囲として解決する
  const stateNames = new Set<string>();
  if (statusImpactIndex && statusImpactIndex.size) {
    const stateName = extractStateNameFromRow(row);
    if (stateName) stateNames.add(stateName);
    if (row.renameCandidate?.entityKind === 'state') {
      if (row.renameCandidate.fromCode) stateNames.add(String(row.renameCandidate.fromCode));
      if (row.renameCandidate.toCode) stateNames.add(String(row.renameCandidate.toCode));
    }
  }

  if (!codes.size && !stateNames.size) return [];
  const refs: any[] = [];
  const seen = new Set();
  codes.forEach((code) => {
    (impactIndex.get(code) || []).forEach((ref: any) => {
      const sig = [ref.sectionKey, ref.kind, ref.path, ref.label].join('|');
      if (seen.has(sig)) return;
      seen.add(sig);
      refs.push(ref);
    });
  });
  stateNames.forEach((name) => {
    (statusImpactIndex?.get(name) || []).forEach((ref: any) => {
      const sig = [ref.sectionKey, ref.kind, ref.path, ref.label].join('|');
      if (seen.has(sig)) return;
      seen.add(sig);
      refs.push(ref);
    });
  });
  const order = new Map(SECTION_DEFS.map((entry, idx) => [entry.key, idx]));
  refs.sort((a, b) => {
    const ao = order.has(a.sectionKey) ? (order.get(a.sectionKey) ?? 999) : 999;
    const bo = order.has(b.sectionKey) ? (order.get(b.sectionKey) ?? 999) : 999;
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

// ---------------------------------------------------------------------------
// Non-field entity rename detection
// ---------------------------------------------------------------------------
// ビュー/グラフ/ステータス/遷移/カテゴリ/通知/権限エントリー/プラグイン等の
// 「改名」で発生する added + removed の偽陽性ペアを統合する。
// extractEntityContext で entityKind/entityCode を解決済み前提。
// ---------------------------------------------------------------------------
const RENAMABLE_ENTITY_KINDS = new Set([
  'view', 'report', 'state', 'category',
  'action', 'appAction',
  'aclEntry', 'recordAclEntry', 'fieldAclEntry',
  'notification', 'perRecordNotification', 'reminderNotification',
  'plugin', 'jsCss', 'layoutRow'
]);

function isEntityRootRow(row): boolean {
  if (!row || row.sectionKey === 'fieldSettings') return false;
  if (row._displayOnly) return false;
  if (!row.entityKind || !RENAMABLE_ENTITY_KINDS.has(row.entityKind)) return false;
  const tokens = tokenizePath(String(row.path || ''));
  const sectionKey = String(row.sectionKey || '');
  if ((sectionKey === 'viewSettings' || sectionKey === 'reportSettings' || sectionKey === 'categories') && tokens.length === 3) return true;
  if (sectionKey === 'processSettings' && tokens[1] === 'states' && tokens.length === 3) return true;
  if ((sectionKey === 'processSettings' || sectionKey === 'actionSettings') && tokens[1] === 'actions' && tokens.length === 3) return true;
  if ((sectionKey === 'appAcl' || sectionKey === 'recordPermissions' || sectionKey === 'fieldAcl') && tokens[1] === 'rights' && tokens.length === 3) return true;
  if (['notifications', 'perRecordNotifications', 'reminderNotifications'].includes(sectionKey) && tokens[1] === 'notifications' && tokens.length === 3) return true;
  if (sectionKey === 'pluginSettings' && tokens[1] === 'plugins' && tokens.length === 3) return true;
  if (sectionKey === 'layoutSettings' && tokens[1] === 'layout' && tokens.length === 3) return true;
  if (sectionKey === 'customizeSettings' && tokens.length === 4) return true;
  return false;
}

function entityPayload(row) {
  return row?.right || row?.left || null;
}

function normalizeEntityBodyForRename(value, sectionKey, dropPresentation = false) {
  const dropKeys = new Set<string>(['id', 'index', 'no', 'order', 'revision', 'createdAt', 'creator', 'modifiedAt', 'modifier']);
  if (dropPresentation) {
    if (sectionKey === 'viewSettings' || sectionKey === 'reportSettings') dropKeys.add('name');
    if (sectionKey === 'processSettings' || sectionKey === 'actionSettings') dropKeys.add('name');
    if (sectionKey === 'pluginSettings') dropKeys.add('name');
    if (['notifications', 'perRecordNotifications', 'reminderNotifications'].includes(sectionKey)) {
      dropKeys.add('name'); dropKeys.add('title');
    }
  }
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out = {};
      Object.keys(v).sort().forEach((k) => {
        if (dropKeys.has(k)) return;
        out[k] = walk(v[k]);
      });
      return out;
    }
    return v;
  };
  return walk(value);
}

function scoreEntityRenameCandidate(removedRow, addedRow) {
  if (removedRow.sectionKey !== addedRow.sectionKey) return null;
  if (removedRow.entityKind !== addedRow.entityKind) return null;
  const left = entityPayload(removedRow);
  const right = entityPayload(addedRow);
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return null;
  // Type 整合（type プロパティを持つもの: view/layoutRow/customize.type 等）
  const lType = (left as any).type;
  const rType = (right as any).type;
  if (lType != null && rType != null && String(lType) !== String(rType)) return null;

  const sectionKey = removedRow.sectionKey;
  const exactSigLeft = stableStringify(normalizeEntityBodyForRename(left, sectionKey));
  const exactSigRight = stableStringify(normalizeEntityBodyForRename(right, sectionKey));
  const coreSigLeft = stableStringify(normalizeEntityBodyForRename(left, sectionKey, true));
  const coreSigRight = stableStringify(normalizeEntityBodyForRename(right, sectionKey, true));

  const reasons: string[] = [];
  let score = 0;
  let strong = false;
  if (lType && rType) {
    score += 1;
    reasons.push(`type:${lType}`);
  }
  if (exactSigLeft === exactSigRight) {
    score += 6;
    reasons.push('same-body');
    strong = true;
  } else if (coreSigLeft === coreSigRight) {
    score += 5;
    reasons.push('same-core');
    strong = true;
  }
  const leftLabel = normalizeLooseText(String(removedRow.entityLabel || ''));
  const rightLabel = normalizeLooseText(String(addedRow.entityLabel || ''));
  if (leftLabel && rightLabel) {
    if (leftLabel === rightLabel) {
      score += 2;
      reasons.push('same-label');
    } else if (scoreTokenOverlap(leftLabel, rightLabel) >= 0.6) {
      score += 1;
      reasons.push('label-similar');
    }
  }
  if (!strong) return null;
  if (score < 6) return null;
  return { score, matchedBy: reasons.join(', ') };
}

export function detectEntityRenameCandidates(rows) {
  const eligible = (rows || []).filter(isEntityRootRow);
  const removedRows = eligible.filter((r) => r.type === 'removed');
  const addedRows = eligible.filter((r) => r.type === 'added');
  if (!removedRows.length || !addedRows.length) return new Map();
  type Cand = { removedRow: any; addedRow: any; score: number; matchedBy: string };
  const candidates: Cand[] = [];
  removedRows.forEach((rr) => {
    addedRows.forEach((ar) => {
      const scored = scoreEntityRenameCandidate(rr, ar);
      if (!scored) return;
      candidates.push({ removedRow: rr, addedRow: ar, score: scored.score, matchedBy: scored.matchedBy });
    });
  });
  candidates.sort((a, b) => b.score - a.score);
  const usedRemoved = new Set<string>();
  const usedAdded = new Set<string>();
  const out = new Map<string, any>();
  candidates.forEach((cand) => {
    if (usedRemoved.has(cand.removedRow._id) || usedAdded.has(cand.addedRow._id)) return;
    usedRemoved.add(cand.removedRow._id);
    usedAdded.add(cand.addedRow._id);
    const fromCode = String(cand.removedRow.entityCode || cand.removedRow.entityLabel || '');
    const toCode = String(cand.addedRow.entityCode || cand.addedRow.entityLabel || '');
    const renameInfo = {
      id: `entity-rename:${cand.removedRow.sectionKey}:${fromCode}:${toCode}`,
      fromCode,
      toCode,
      score: cand.score,
      matchedBy: cand.matchedBy,
      entityKind: cand.removedRow.entityKind,
      sectionKey: cand.removedRow.sectionKey
    };
    out.set(cand.removedRow._id, renameInfo);
    out.set(cand.addedRow._id, renameInfo);
  });
  return out;
}

// ---------------------------------------------------------------------------
// Non-field entity context resolver
// ---------------------------------------------------------------------------
// セクション別に「行が属するエンティティ（ビュー、ステータス、アクション、ACL
// エントリー、通知、…）」を特定し、人間に読みやすいラベル/種別と、葉キーに
// 対応する日本語プロパティ名を解決する。フィールド行 (fieldSettings) は
// 既存の extractFieldPathInfo で十分なため、この関数では扱わない。
// ---------------------------------------------------------------------------

const SECTION_PROP_LABELS: Record<string, Record<string, string>> = {
  viewSettings: {
    name: 'ビュー名', type: 'ビュー種別', filterCond: '絞り込み条件', sort: 'ソート',
    fields: '表示フィールド', pager: 'ページャー', paginationStyle: 'ページャー表示',
    builtinType: '組み込みビュー種別', html: 'カスタムHTML', index: '表示順',
    customView: 'カスタマイズビュー', date: '日付フィールド', title: 'タイトルフィールド',
    description: '説明', id: 'ビューID'
  },
  reportSettings: {
    name: 'グラフ名', chartType: 'グラフ種別', chartMode: 'グラフモード',
    groups: 'グループ化', aggregations: '集計', filterCond: '絞り込み条件',
    sorts: 'ソート', periodicReport: '定期実行', index: '表示順', id: 'グラフID'
  },
  processSettings: {
    enable: 'プロセス管理 有効/無効', name: '名称', index: '表示順',
    assignee: '作業者', from: '遷移元', to: '遷移先', condition: '実行条件',
    actions: '遷移アクション', states: 'ステータス', filterCond: '実行条件',
    revisions: 'リビジョン'
  },
  actionSettings: {
    name: 'アクション名', link: 'リンク先', params: 'パラメータ',
    targetApp: '転送先アプリ', index: '表示順', mappings: '項目マッピング',
    targetAppId: '転送先アプリID', filterCond: '実行条件', id: 'アクションID'
  },
  appAcl: {
    appEditable: 'アプリ管理権限', recordViewable: 'レコード閲覧',
    recordAddable: 'レコード追加', recordEditable: 'レコード編集',
    recordDeletable: 'レコード削除', recordImportable: 'レコード読み込み',
    recordExportable: 'レコード書き出し', entity: 'エンティティ',
    includeSubs: '配下を含む', code: 'エンティティコード', type: 'エンティティ種別'
  },
  fieldAcl: {
    accessibility: 'アクセス権', code: 'フィールドコード', entity: 'エンティティ',
    includeSubs: '配下を含む', viewable: '閲覧', editable: '編集'
  },
  recordPermissions: {
    filterCond: '対象レコード条件', viewable: '閲覧', editable: '編集',
    deletable: '削除', includeSubs: '配下を含む', entity: 'エンティティ',
    code: 'エンティティコード', type: 'エンティティ種別'
  },
  notifications: {
    recipients: '宛先', includeSubs: '配下を含む', appAdmin: 'アプリ管理者',
    onUserAccess: 'アクセス権変更通知', notifyToCommenter: 'コメント通知',
    code: 'エンティティコード', type: 'エンティティ種別', entity: 'エンティティ'
  },
  perRecordNotifications: {
    name: '通知名', filterCond: '通知対象条件', title: 'タイトル', body: '本文',
    recipients: '宛先', includeSubs: '配下を含む', code: 'エンティティコード',
    type: 'エンティティ種別', entity: 'エンティティ'
  },
  reminderNotifications: {
    name: '通知名', timing: 'タイミング', filterCond: '通知対象条件',
    title: 'タイトル', body: '本文', recipients: '宛先',
    daysLater: '日数後', hoursLater: '時間後', baseDate: '基準日'
  },
  categories: {
    enable: 'カテゴリ管理 有効/無効', name: 'カテゴリ名', index: '表示順',
    code: 'カテゴリコード'
  },
  customizeSettings: {
    type: '種別', url: 'URL', file: 'ファイル', fileKey: 'ファイルキー',
    js: 'JavaScript', css: 'CSS', desktop: 'デスクトップ', mobile: 'モバイル',
    scope: 'スコープ', resources: 'リソース',
    _body: 'JS/CSS本文', name: 'ファイル名'
  },
  pluginSettings: {
    plugins: 'プラグイン一覧', id: 'プラグインID', name: 'プラグイン名',
    enabled: '有効/無効', version: 'バージョン', config: 'プラグイン設定',
    code: 'プラグインコード'
  },
  layoutSettings: {
    type: '種別', code: 'フィールドコード', fields: 'フィールド',
    elementId: '要素ID', label: 'ラベル', value: '初期値',
    layout: 'レイアウト', size: 'サイズ', width: '横幅', height: '高さ'
  },
  appSettings: {
    name: 'アプリ名', description: '説明', icon: 'アイコン', theme: 'テーマ',
    titleField: 'タイトルフィールド', enableThumbnails: 'サムネイル表示',
    enableBulkDeletion: '一括削除', enableComments: 'コメント',
    enableDuplicateRecord: 'レコード複製', enableInlineRecordEditing: 'インライン編集',
    numberPrecision: '数値精度', firstMonthOfFiscalYear: '会計年度開始月',
    revision: 'リビジョン'
  },
  appInfo: {
    name: 'アプリ名', code: 'アプリコード', description: '説明',
    threadId: 'スレッドID', spaceId: 'スペースID', createdAt: '作成日時',
    modifiedAt: '更新日時'
  },
  formSettings: {
    name: 'フォーム名', layout: 'レイアウト', revision: 'リビジョン'
  }
};

const ENTITY_KIND_LABELS: Record<string, string> = {
  view: 'ビュー',
  report: 'グラフ',
  state: 'ステータス',
  action: '遷移アクション',
  appAction: 'アクション',
  aclEntry: '権限エントリー',
  fieldAclEntry: 'フィールド権限',
  recordAclEntry: 'レコード権限',
  notification: '通知',
  perRecordNotification: 'レコード条件通知',
  reminderNotification: 'リマインダー通知',
  category: 'カテゴリ',
  plugin: 'プラグイン',
  jsCss: 'JS/CSS',
  layoutRow: 'レイアウト行'
};


function getSectionPropLabel(sectionKey: string, leaf: string): string {
  const map = SECTION_PROP_LABELS[sectionKey];
  if (!map) return '';
  return map[leaf] || '';
}

function describeAclEntity(entity: any): string {
  if (!entity || typeof entity !== 'object') return '';
  const code = String(entity.code || '').trim();
  const type = String(entity.type || '').trim();
  if (!code) return type ? `(${type})` : '';
  return type ? `${code} (${type})` : code;
}

export interface DiffEntityContext {
  entityKind: string;
  entityLabel: string;
  entityCode: string;
  propLabel: string;
}

export function extractEntityContext(row: any): DiffEntityContext {
  const sectionKey = String(row?.sectionKey || '');
  const path = String(row?.path || '');
  const tokens = tokenizePath(path);
  const leaf = getPathLeafKey(path);
  const propLabel = getSectionPropLabel(sectionKey, leaf);
  const empty: DiffEntityContext = { entityKind: '', entityLabel: '', entityCode: '', propLabel };
  if (sectionKey === 'fieldSettings') return empty;

  const payload = row?.right || row?.left || null;

  switch (sectionKey) {
    case 'viewSettings': {
      // viewSettings.views.{viewName}.(...)  または viewSettings.views.{viewName}
      if (tokens[1] === 'views' && typeof tokens[2] === 'string') {
        return { entityKind: 'view', entityLabel: tokens[2], entityCode: tokens[2], propLabel };
      }
      return empty;
    }
    case 'reportSettings': {
      if (tokens[1] === 'reports' && typeof tokens[2] === 'string') {
        return { entityKind: 'report', entityLabel: tokens[2], entityCode: tokens[2], propLabel };
      }
      return empty;
    }
    case 'processSettings': {
      if (tokens[1] === 'states' && typeof tokens[2] === 'string') {
        return { entityKind: 'state', entityLabel: tokens[2], entityCode: tokens[2], propLabel };
      }
      if (tokens[1] === 'actions' && typeof tokens[2] === 'number') {
        const name = (row?.arrayKey === 'name' && row?.arrayKeyValue != null)
          ? String(row.arrayKeyValue)
          : String((payload && typeof payload === 'object' && (payload as any).name) || '');
        const label = name || `遷移 #${tokens[2]}`;
        return { entityKind: 'action', entityLabel: label, entityCode: name, propLabel };
      }
      return empty;
    }
    case 'actionSettings': {
      if (tokens[1] === 'actions' && typeof tokens[2] === 'number') {
        const name = (row?.arrayKey === 'name' && row?.arrayKeyValue != null)
          ? String(row.arrayKeyValue)
          : String((payload && typeof payload === 'object' && (payload as any).name) || '');
        const label = name || `アクション #${tokens[2]}`;
        return { entityKind: 'appAction', entityLabel: label, entityCode: name, propLabel };
      }
      return empty;
    }
    case 'appAcl':
    case 'recordPermissions': {
      if (tokens[1] === 'rights' && typeof tokens[2] === 'number') {
        let entityRef: any = (row?.arrayKey === 'entity' && row?.arrayKeyValue && typeof row.arrayKeyValue === 'object') ? row.arrayKeyValue : null;
        if (!entityRef) entityRef = (payload && typeof payload === 'object') ? (payload as any).entity : null;
        const label = describeAclEntity(entityRef) || `エントリー #${tokens[2]}`;
        const code = String(entityRef?.code || '');
        const kind = sectionKey === 'appAcl' ? 'aclEntry' : 'recordAclEntry';
        return { entityKind: kind, entityLabel: label, entityCode: code, propLabel };
      }
      return empty;
    }
    case 'fieldAcl': {
      if (tokens[1] === 'rights' && typeof tokens[2] === 'number') {
        const fc = (row?.arrayKey === 'code' && row?.arrayKeyValue != null)
          ? String(row.arrayKeyValue)
          : String((payload && typeof payload === 'object' && (payload as any).code) || '');
        // entities 配下の行：対象エンティティ（ユーザー/組織/グループ）をラベルに使う
        if (tokens[3] === 'entities') {
          let ent: any = (row?.arrayKey === 'entity' && row?.arrayKeyValue && typeof row.arrayKeyValue === 'object') ? row.arrayKeyValue : null;
          if (!ent && payload && typeof payload === 'object' && (payload as any).entity) ent = (payload as any).entity;
          const entLabel = describeAclEntity(ent);
          if (entLabel) {
            const label = fc ? `${fc} › ${entLabel}` : entLabel;
            return { entityKind: 'fieldAclEntry', entityLabel: label, entityCode: fc || String(ent?.code || ''), propLabel };
          }
        }
        const label = fc || `エントリー #${tokens[2]}`;
        return { entityKind: 'fieldAclEntry', entityLabel: label, entityCode: fc, propLabel };
      }
      return empty;
    }
    case 'notifications':
    case 'perRecordNotifications':
    case 'reminderNotifications': {
      if (tokens[1] === 'notifications' && typeof tokens[2] === 'number') {
        const obj = (payload && typeof payload === 'object') ? payload as any : {};
        let label = String(obj.name || obj.title || '').trim();
        if (!label && obj.entity && typeof obj.entity === 'object') {
          // 一般通知：宛先エンティティが識別子
          label = describeAclEntity(obj.entity);
        }
        if (!label) {
          const recipients = obj.recipients;
          if (Array.isArray(recipients) && recipients.length) {
            const first = recipients[0];
            const code = first?.entity?.code || first?.code || '';
            label = code ? `${code}${recipients.length > 1 ? ' 他' : ''}` : '';
          }
        }
        if (!label && row?.arrayKey === 'name' && row?.arrayKeyValue != null) {
          label = String(row.arrayKeyValue);
        }
        if (!label && row?.arrayKey === 'entity' && row?.arrayKeyValue && typeof row.arrayKeyValue === 'object') {
          label = describeAclEntity(row.arrayKeyValue);
        }
        if (!label && row?.arrayKey === 'title' && row?.arrayKeyValue != null) {
          label = String(row.arrayKeyValue);
        }
        if (!label) label = `通知 #${tokens[2]}`;
        const kind = sectionKey === 'perRecordNotifications'
          ? 'perRecordNotification'
          : (sectionKey === 'reminderNotifications' ? 'reminderNotification' : 'notification');
        return { entityKind: kind, entityLabel: label, entityCode: String(obj.name || ''), propLabel };
      }
      return empty;
    }
    case 'categories': {
      if (tokens[1] === 'categories' && typeof tokens[2] === 'string') {
        return { entityKind: 'category', entityLabel: tokens[2], entityCode: tokens[2], propLabel };
      }
      return empty;
    }
    case 'pluginSettings': {
      if (tokens[1] === 'plugins' && typeof tokens[2] === 'number') {
        const id = (row?.arrayKey === 'id' && row?.arrayKeyValue != null)
          ? String(row.arrayKeyValue)
          : String((payload && typeof payload === 'object' && (payload as any).id) || '');
        const name = String((payload && typeof payload === 'object' && (payload as any).name) || '');
        const label = name ? (id ? `${name} (${id})` : name) : (id || `プラグイン #${tokens[2]}`);
        return { entityKind: 'plugin', entityLabel: label, entityCode: id, propLabel };
      }
      return empty;
    }
    case 'customizeSettings': {
      // customizeSettings.{desktop|mobile}.{js|css}[N].(...)
      if ((tokens[1] === 'desktop' || tokens[1] === 'mobile')
        && (tokens[2] === 'js' || tokens[2] === 'css')
        && typeof tokens[3] === 'number'
      ) {
        const platform = tokens[1] === 'desktop' ? 'デスクトップ' : 'モバイル';
        const kind = String(tokens[2]).toUpperCase();
        const obj = (payload && typeof payload === 'object') ? payload as any : {};
        const fileKey = obj?.file?.fileKey || obj?.fileKey || '';
        const url = obj?.url || '';
        const ref = url
          ? url
          : (fileKey ? `ファイル(${String(fileKey).slice(0, 8)}…)` : `#${tokens[3]}`);
        return {
          entityKind: 'jsCss',
          entityLabel: `${platform}/${kind}: ${ref}`,
          entityCode: String(fileKey || url || ''),
          propLabel
        };
      }
      return empty;
    }
    case 'layoutSettings': {
      if (tokens[1] === 'layout' && typeof tokens[2] === 'number') {
        const obj = (payload && typeof payload === 'object') ? payload as any : {};
        const t = String(obj.type || '').toUpperCase();
        let label = `行 #${tokens[2]}`;
        if (t === 'GROUP' && obj.code) label = `グループ「${obj.code}」`;
        else if (t === 'SUBTABLE' && obj.code) label = `テーブル「${obj.code}」`;
        else if (t === 'ROW') label = `行 #${tokens[2]}`;
        return { entityKind: 'layoutRow', entityLabel: label, entityCode: String(obj.code || ''), propLabel };
      }
      return empty;
    }
    default:
      return empty;
  }
}

export function buildDiffReasonSummary(row) {
  const sectionKey = row.sectionKey || '';
  const sectionLabel = SECTION_DEFS.find((entry) => entry.key === sectionKey)?.label || sectionKey || '差分';
  const fieldInfo = extractFieldPathInfo(row.path);
  const leafKey = normalizeIgnoreToken(getPathLeafKey(row.path));
  if (row.moved) {
    const from = Number(row.movedFrom);
    const to = Number(row.movedTo);
    const posNote = Number.isFinite(from) && Number.isFinite(to)
      ? `（${from + 1}番目 → ${to + 1}番目）`
      : '';
    if (sectionKey === 'layoutSettings') return `レイアウト順序変更${posNote}`;
    if (sectionKey === 'categories') return `カテゴリ順序変更${posNote}`;
    return `順序変更${posNote}`;
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

  // 非フィールド: エンティティ文脈を活用したサマリ
  const entity = (row && (row.entityLabel || row.entityKind))
    ? { entityKind: String(row.entityKind || ''), entityLabel: String(row.entityLabel || ''), propLabel: String(row.entityPropLabel || '') }
    : extractEntityContext(row);
  const kindLabel = entity.entityKind ? (ENTITY_KIND_LABELS[entity.entityKind] || '') : '';
  const propLabel = entity.propLabel || '';

  // エンティティ自体の追加/削除（path 末端がエンティティ）
  const isEntityRoot = !!entity.entityKind && (!propLabel)
    && (() => {
      const tokens = tokenizePath(String(row.path || ''));
      // entity の所在位置に応じて末端深さを判定
      if (sectionKey === 'viewSettings' || sectionKey === 'reportSettings' || sectionKey === 'categories') {
        return tokens.length === 3; // section.<bucket>.<name>
      }
      if (sectionKey === 'processSettings' && tokens[1] === 'states') return tokens.length === 3;
      if ((sectionKey === 'processSettings' || sectionKey === 'actionSettings') && tokens[1] === 'actions') return tokens.length === 3;
      if ((sectionKey === 'appAcl' || sectionKey === 'recordPermissions' || sectionKey === 'fieldAcl') && tokens[1] === 'rights') return tokens.length === 3;
      if (['notifications', 'perRecordNotifications', 'reminderNotifications'].includes(sectionKey) && tokens[1] === 'notifications') return tokens.length === 3;
      if (sectionKey === 'pluginSettings' && tokens[1] === 'plugins') return tokens.length === 3;
      if (sectionKey === 'layoutSettings' && tokens[1] === 'layout') return tokens.length === 3;
      if (sectionKey === 'customizeSettings') return tokens.length === 4;
      return false;
    })();

  if (entity.entityKind && isEntityRoot) {
    if (row.type === 'added') return `${kindLabel}追加：${entity.entityLabel}`;
    if (row.type === 'removed') return `${kindLabel}削除：${entity.entityLabel}`;
    return `${kindLabel}変更：${entity.entityLabel}`;
  }
  if (entity.entityKind) {
    const detail = propLabel || (leafKey || '');
    const head = `${kindLabel}「${entity.entityLabel}」`;
    if (row.type === 'added') return detail ? `${head} / ${detail} 追加` : `${head} 追加`;
    if (row.type === 'removed') return detail ? `${head} / ${detail} 削除` : `${head} 削除`;
    return detail ? `${head} / ${detail} 変更` : `${head} 変更`;
  }

  // フォールバック: 旧来のセクション単位サマリ（appSettings/appInfo/formSettings 等）
  if (sectionKey === 'appSettings') {
    const sp = getSectionPropLabel('appSettings', leafKey);
    return sp ? `アプリ設定変更：${sp}` : 'アプリ設定変更';
  }
  if (sectionKey === 'appInfo') {
    const sp = getSectionPropLabel('appInfo', leafKey);
    return sp ? `アプリ情報変更：${sp}` : 'アプリ情報変更';
  }
  if (sectionKey === 'formSettings') return 'フォーム設定変更';
  return row.type === 'added' ? `${sectionLabel}追加` : (row.type === 'removed' ? `${sectionLabel}削除` : `${sectionLabel}変更`);
}

export function enrichDiffRows(rows, sourceBundle, targetBundle) {
  // 先にエンティティ文脈を一度走らせてから rename 検出する
  // （非フィールドの rename 検出は entityKind/entityLabel/entityCode 必須）
  const seeded = (rows || []).map((row) => {
    if (!row || row.sectionKey === 'fieldSettings') return row;
    const ctx = extractEntityContext(row);
    if (!ctx.entityKind) return row;
    return {
      ...row,
      entityKind: ctx.entityKind,
      entityLabel: ctx.entityLabel,
      entityCode: ctx.entityCode,
      entityPropLabel: ctx.propLabel
    };
  });
  const renameMap = detectFieldRenameCandidates(seeded);
  const entityRenameMap = detectEntityRenameCandidates(seeded);
  const impactIndex = buildCombinedFieldImpactIndex(sourceBundle, targetBundle);
  const statusImpactIndex = buildStatusImpactIndex(sourceBundle, targetBundle);
  return seeded.map((row) => {
    const next = { ...row };
    const renameCandidate = renameMap.get(row._id) || entityRenameMap.get(row._id);
    if (renameCandidate) next.renameCandidate = renameCandidate;
    // rename 確定時は重要度を下げる（偽陽性ノイズの抑制）
    if (renameCandidate && (next.severity === 'high' || next.severity === 'medium')) {
      next.severity = 'low';
    }
    const reason = buildDiffReasonSummary(next);
    if (reason) {
      const suffixes: string[] = [];
      if (renameCandidate) suffixes.push(renameCandidate.entityKind ? '改名候補' : 'コード変更候補');
      if (next.notationOnly) suffixes.push('表記のみ（実質同値）');
      if (next.emptyOnly) suffixes.push('空値の差のみ');
      next.reasonSummary = suffixes.length ? `${reason} / ${suffixes.join(' / ')}` : reason;
    }
    const impactRefs = resolveRowImpactRefs(next, impactIndex, statusImpactIndex);
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
