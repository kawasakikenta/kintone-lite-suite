'use strict';

import { SYSTEM_FIELD_TYPES } from '../constants.js';

export function parseLookupMapInput(text) {
  const raw = String(text || '').trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Lookup AppID変換はJSONオブジェクトで入力してください');
  }
  const map = {};
  for (const [k, v] of Object.entries(parsed) as Array<[string, any]>) {
    const from = String(k).trim();
    const to = String(v).trim();
    if (!from || !to) continue;
    map[from] = to;
  }
  return map;
}

export function parseAppIdList(text) {
  const tokens = String(text || '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set();
  for (const tk of tokens) {
    if (!/^\d+$/.test(tk)) continue;
    if (seen.has(tk)) continue;
    seen.add(tk);
    out.push(tk);
  }
  return out;
}

export function collectFieldValidationIssues(props: any): string[] {
  const issues: string[] = [];
  const seenCodes = new Set<string>();
  const visit = (fieldMap: any, path: string) => {
    for (const [key, def] of Object.entries(fieldMap || {}) as Array<[string, any]>) {
      const code = String(def?.code || key || '').trim();
      const label = String(def?.label || '').trim();
      const type = String(def?.type || '').trim();
      const fieldPath = path ? `${path}.${key}` : key;
      if (!code) issues.push(`${fieldPath}: code が空です`);
      if (code && seenCodes.has(code)) issues.push(`${fieldPath}: code "${code}" が重複しています`);
      if (code) seenCodes.add(code);
      if (code && String(key) !== code) issues.push(`${fieldPath}: JSONキー "${key}" と code "${code}" が一致していません`);
      if (!type) issues.push(`${fieldPath}: type がありません`);
      if (!label && type !== 'SPACER' && type !== 'HR' && type !== 'LABEL') issues.push(`${fieldPath}: label がありません`);
      if (def?.lookup && !def.lookup.relatedApp?.app) issues.push(`${fieldPath}: lookup.relatedApp.app がありません`);
      if (def?.referenceTable && !def.referenceTable.relatedApp?.app) issues.push(`${fieldPath}: referenceTable.relatedApp.app がありません`);
      if (type === 'SUBTABLE' && (!def.fields || typeof def.fields !== 'object')) issues.push(`${fieldPath}: SUBTABLE に fields がありません`);
      if (type === 'SUBTABLE') visit(def.fields, fieldPath);
    }
  };
  visit(props, '');
  return issues;
}

export function summarizeFieldProps(props: any): { total: number; system: number; writable: number; subtable: number; lookup: number; calc: number; byType: Record<string, number>; } {
  const byType: Record<string, number> = {};
  let total = 0;
  let system = 0;
  let writable = 0;
  let subtable = 0;
  let lookup = 0;
  let calc = 0;
  for (const [, def] of Object.entries(props || {}) as Array<[string, any]>) {
    if (!def || typeof def !== 'object') continue;
    total += 1;
    const type = String(def.type || '').trim();
    byType[type] = (byType[type] || 0) + 1;
    if (SYSTEM_FIELD_TYPES.has(type)) system += 1; else writable += 1;
    if (type === 'SUBTABLE') subtable += 1;
    if (def.lookup) lookup += 1;
    if (type === 'CALC' || def.expression) calc += 1;
  }
  return { total, system, writable, subtable, lookup, calc, byType };
}

/** 関数呼び出し以外で計算式に現れる語（真偽値など）。フィールドコードとは見なさない。 */
const FORMULA_WORDS = new Set([
  'IF', 'AND', 'OR', 'NOT', 'SUM', 'ROUND', 'ROUNDDOWN', 'ROUNDUP', 'DATE_FORMAT',
  'DATE', 'TIME', 'DATETIME_FORMAT', 'CONTAINS', 'NUMBER', 'VALUE', 'TRUE', 'FALSE'
]);

/** 計算式の語。文字列リテラル（"…"）と、フィールドコード（日本語を含む）の候補を順に取り出す。 */
const FORMULA_TOKEN = /"(?:[^"\\]|\\.)*"|[\p{L}_][\p{L}\p{N}_]*/gu;

/**
 * 計算式が参照するフィールドコード。文字列リテラル・関数（直後が「(」）・数値は除く。
 * 日本語のフィールドコードも拾う。
 */
export function collectFormulaRefs(expression: string): string[] {
  const refs = new Set<string>();
  const text = String(expression || '');
  for (const match of text.matchAll(FORMULA_TOKEN)) {
    const token = match[0];
    if (token.startsWith('"')) continue;
    if (text.slice((match.index ?? 0) + token.length).trimStart().startsWith('(')) continue;
    if (FORMULA_WORDS.has(token.toUpperCase())) continue;
    refs.add(token);
  }
  return [...refs];
}

/** 計算式の中のフィールドコードを、codeMap（旧コード → 新コード）に従って書き換える。文字列リテラルと関数名は変えない。 */
export function rewriteFormulaRefs(expression: string, codeMap: ReadonlyMap<string, string>): string {
  const text = String(expression ?? '');
  return text.replace(FORMULA_TOKEN, (token, offset: number) => {
    if (token.startsWith('"')) return token;
    if (text.slice(offset + token.length).trimStart().startsWith('(')) return token;
    return codeMap.get(token) ?? token;
  });
}

export function collectFieldApplyWarnings(incomingProps: any, currentProps: any, lookupMap: Record<string, string> = {}): string[] {
  const warnings: string[] = [];
  const currentCodes = new Set(Object.keys(currentProps || {}));
  const incomingCodes = new Set(Object.keys(incomingProps || {}));
  const allCodes = new Set([...currentCodes, ...incomingCodes]);
  const addSubtableChildCodes = (propsMap: any) => {
    for (const [key, def] of Object.entries(propsMap || {}) as Array<[string, any]>) {
      if (def?.code) allCodes.add(String(def.code));
      if (def?.type === 'SUBTABLE' && def?.fields && typeof def.fields === 'object') {
        for (const [ck, cdef] of Object.entries(def.fields) as Array<[string, any]>) {
          allCodes.add(ck);
          if (cdef?.code) allCodes.add(String(cdef.code));
        }
      } else {
        void key;
      }
    }
  };
  addSubtableChildCodes(currentProps);
  addSubtableChildCodes(incomingProps);
  const conflicts = [...incomingCodes].filter((code) => currentCodes.has(code));
  if (conflicts.length) {
    warnings.push(`既存フィールドと同じ code が ${conflicts.length} 件あります: ${conflicts.slice(0, 12).join(', ')}${conflicts.length > 12 ? ' ...' : ''}`);
  }

  const converted: string[] = [];
  const unconvertedRefs: string[] = [];
  const walk = (fieldMap: any, parent = '') => {
    for (const [key, def] of Object.entries(fieldMap || {}) as Array<[string, any]>) {
      const label = parent ? `${parent}.${key}` : key;
      const relatedApp = def?.lookup?.relatedApp?.app ?? def?.referenceTable?.relatedApp?.app;
      if (relatedApp != null) {
        const before = String(relatedApp);
        if (lookupMap[before]) converted.push(`${label}: ${before} -> ${lookupMap[before]}`);
        else unconvertedRefs.push(`${label}: ${before}`);
      }
      if (def?.expression) {
        const missing = collectFormulaRefs(def.expression).filter((code) => !allCodes.has(code));
        if (missing.length) warnings.push(`${label}: 計算式が参照する ${missing.join(', ')} は、この JSON にありません（反映先に同じコードのフィールドがあれば問題ありません。実行前の確認で反映先と照合します）`);
      }
      if (def?.type === 'SUBTABLE') walk(def.fields, label);
    }
  };
  walk(incomingProps);

  if (converted.length) warnings.push(`参照先アプリID変換: ${converted.slice(0, 8).join(' / ')}${converted.length > 8 ? ' ...' : ''}`);
  if (unconvertedRefs.length) warnings.push(`変換されない参照先アプリIDがあります: ${unconvertedRefs.slice(0, 8).join(' / ')}${unconvertedRefs.length > 8 ? ' ...' : ''}`);
  if ([...incomingCodes].some((code) => !currentCodes.has(code))) {
    warnings.push('新規追加フィールドはフォームレイアウトには自動配置されません。必要に応じてkintoneのフォーム設定で配置してください。');
  }
  return warnings;
}
