'use strict';

import { SYSTEM_FIELD_TYPES } from '../constants.js';
import { ui } from '../state.js';
import { esc, deepClone, kusConfirm } from '../utils.js';
import { apiGet, apiPut, apiPost, buildApiPrefix } from '../api.js';
import { setStatus, setBusy } from '../ui/components.js';
import { commonParams } from './diff.js';
import { getToolDocument } from '../ui/dialog.js';

export function parseFieldInput(text) {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== 'object') throw new Error('JSONはオブジェクト形式で入力してください');
  if (obj.properties && typeof obj.properties === 'object') return obj.properties;
  return obj;
}

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

export function convertLookupAppIds(fieldDef, map) {
  const def = deepClone(fieldDef || ({} as any));
  const lookupMap = map || ({} as any);
  if (!Object.keys(lookupMap).length) return { def, changed: false };
  let changed = false;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    const relatedApp = node.lookup && node.lookup.relatedApp;
    if (relatedApp && relatedApp.app != null) {
      const before = String(relatedApp.app);
      const after = lookupMap[before];
      if (after && String(after) !== before) {
        node.lookup.relatedApp.app = String(after);
        changed = true;
      }
    }
    if (node.type === 'SUBTABLE' && node.fields && typeof node.fields === 'object') {
      Object.values(node.fields).forEach(walk);
    }
  };
  walk(def);
  return { def, changed };
}

export function renderAppIdConfirmSection(appIdRefs) {
  if (!appIdRefs || !appIdRefs.length) return '<div style="color:#64748b;font-size:12px;margin-bottom:8px">関連アプリIDなし</div>';
  const rows = appIdRefs.map((r) =>
    `<tr><td style="padding:3px 8px;font-size:11px">${esc(r.fieldCode)}</td>` +
    `<td style="padding:3px 8px;font-size:11px">${esc(r.type)}</td>` +
    `<td style="padding:3px 8px;font-size:11px;font-weight:700">${esc(r.refAppId)}</td>` +
    `<td style="padding:3px 8px;font-size:11px;color:${r.convertedAppId ? '#2563eb' : '#94a3b8'}">${r.convertedAppId ? `→ ${esc(r.convertedAppId)}` : '-'}</td>` +
    `<td style="padding:3px 8px;font-size:11px">${esc(r.section)}</td></tr>`
  ).join('');
  return `<div style="margin-bottom:10px">
    <div style="font-weight:600;font-size:12px;margin-bottom:4px;color:#dc2626">関連アプリID一覧 (${appIdRefs.length}件)</div>
    <div style="max-height:160px;overflow:auto;border:1px solid #e2e8f0;border-radius:6px">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:#f1f5f9">
          <th style="padding:4px 8px;text-align:left">フィールド</th>
          <th style="padding:4px 8px;text-align:left">種別</th>
          <th style="padding:4px 8px;text-align:left">参照先アプリID</th>
          <th style="padding:4px 8px;text-align:left">変換後</th>
          <th style="padding:4px 8px;text-align:left">セクション</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

export function splitUpsertMap(currentMap, incomingMap, options) {
  const overwrite = !!(options && options.overwrite);
  const renameOnConflict = !!(options && options.renameOnConflict);
  const codeField = (options && options.codeField) || 'code';
  const add: Record<string, any> = {};
  const update: Record<string, any> = {};
  const logs: string[] = [];
  const used = new Set(Object.keys(currentMap || ({} as any)));

  for (const [rawKey, rawDef] of Object.entries(incomingMap || ({} as any) as Array<[string, any]>)) {
    const key = String(rawKey);
    const def = deepClone(rawDef || ({} as any));
    if (!def[codeField]) def[codeField] = key;

    if (!used.has(key)) {
      add[key] = def;
      used.add(key);
      logs.push(`ADD ${key}`);
      continue;
    }

    if (overwrite) {
      update[key] = def;
      logs.push(`UPDATE ${key}`);
      continue;
    }

    if (renameOnConflict) {
      let n = 2;
      let next = `${key}_${n}`;
      while (used.has(next)) {
        n += 1;
        next = `${key}_${n}`;
      }
      def[codeField] = next;
      add[next] = def;
      used.add(next);
      logs.push(`RENAME ${key} -> ${next}`);
    } else {
      logs.push(`SKIP ${key} (already exists)`);
    }
  }
  return { add, update, logs };
}

export function filterWritableFieldProps(props: any, skipSystem: boolean) {
  if (!skipSystem) return deepClone(props || ({} as any));
  const out: Record<string, any> = {};
  for (const [k, def] of Object.entries(props || {}) as Array<[string, any]>) {
    if (!def || typeof def !== 'object') continue;
    if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
    out[k] = deepClone(def);
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

export function runFieldValidate(): void {
  const fieldJson = ui.fieldJson;
  const resultEl = ui.result;
  if (!fieldJson) {
    setStatus('フィールドJSONエディタが初期化されていません', true);
    return;
  }
  const text = fieldJson.value?.trim();
  if (!text) {
    setStatus('検証するJSONがありません', true);
    return;
  }
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (e: any) {
    if (resultEl) resultEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap;color:#991b1b;background:#fee2e2;border:1px solid #fecaca">JSON パースエラー: ${esc(e?.message || String(e))}</pre>`;
    setStatus('JSON が不正です', true);
    return;
  }
  let props: any;
  try {
    props = parseFieldInput(text);
  } catch (e: any) {
    if (resultEl) resultEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap;color:#991b1b;background:#fee2e2;border:1px solid #fecaca">入力エラー: ${esc(e?.message || String(e))}</pre>`;
    setStatus('JSON の形式が不正です', true);
    return;
  }
  const issues = collectFieldValidationIssues(props);
  const summary = summarizeFieldProps(props);
  const typeRows = Object.entries(summary.byType)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `<tr><td style="padding:2px 8px;font-family:monospace;font-size:11px;">${esc(type)}</td><td style="padding:2px 8px;text-align:right;font-variant-numeric:tabular-nums;">${n}</td></tr>`)
    .join('');
  const summaryHtml = `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px;">
    <span style="background:#e0f2fe;color:#075985;border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:600;">合計 ${summary.total}</span>
    <span style="background:#dcfce7;color:#15803d;border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:600;">書込可 ${summary.writable}</span>
    <span style="background:#f1f5f9;color:#475569;border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:600;">システム ${summary.system}</span>
    ${summary.subtable ? `<span style="background:#fef3c7;color:#92400e;border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:600;">サブテーブル ${summary.subtable}</span>` : ''}
    ${summary.lookup ? `<span style="background:#fce7f3;color:#9d174d;border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:600;">ルックアップ ${summary.lookup}</span>` : ''}
    ${summary.calc ? `<span style="background:#ede9fe;color:#6d28d9;border-radius:9999px;padding:2px 8px;font-size:11px;font-weight:600;">計算 ${summary.calc}</span>` : ''}
  </div>`;
  if (issues.length) {
    if (resultEl) resultEl.innerHTML = `<div style="margin:0;padding:10px;font-size:12px;background:#fff8f1;border:1px solid #fed7aa;border-radius:6px;">
      ${summaryHtml}
      <div style="color:#9a3412;font-weight:600;margin-bottom:6px;">⚠ 検出された問題: ${issues.length} 件</div>
      <pre style="margin:0;padding:8px;background:#fff;border-radius:4px;font-size:11px;white-space:pre-wrap;color:#7c2d12;">${esc(issues.join('\n'))}</pre>
    </div>`;
    setStatus(`検証完了: ${issues.length} 件の問題を検出しました`, true);
    return;
  }
  if (resultEl) resultEl.innerHTML = `<div style="margin:0;padding:10px;font-size:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;">
    ${summaryHtml}
    <div style="color:#15803d;font-weight:600;margin-top:4px;">✓ 検証OK: 問題は見つかりませんでした</div>
    <details style="margin-top:8px;"><summary style="cursor:pointer;font-size:11px;color:#475569;">タイプ別内訳</summary>
      <table style="margin-top:6px;border-collapse:collapse;font-size:11px;background:#fff;"><thead><tr><th style="padding:2px 8px;text-align:left;border-bottom:1px solid #e2e8f0;">type</th><th style="padding:2px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">件数</th></tr></thead><tbody>${typeRows}</tbody></table>
    </details>
  </div>`;
  const labelParts = [`合計 ${summary.total}`, `書込可 ${summary.writable}`];
  if (summary.subtable) labelParts.push(`サブテーブル ${summary.subtable}`);
  if (summary.lookup) labelParts.push(`ルックアップ ${summary.lookup}`);
  setStatus(`検証OK: ${labelParts.join(' / ')}`);
}

const FORMULA_WORDS = new Set([
  'IF', 'AND', 'OR', 'NOT', 'SUM', 'ROUND', 'ROUNDDOWN', 'ROUNDUP', 'DATE_FORMAT',
  'DATE', 'TIME', 'DATETIME_FORMAT', 'CONTAINS', 'NUMBER', 'VALUE', 'TRUE', 'FALSE'
]);

function collectFormulaRefs(expression: string): string[] {
  const refs = new Set<string>();
  String(expression || '').replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (token) => {
    if (!FORMULA_WORDS.has(token.toUpperCase())) refs.add(token);
    return token;
  });
  return [...refs];
}

function collectFieldApplyWarnings(incomingProps: any, currentProps: any, lookupMap: Record<string, string>): string[] {
  const warnings: string[] = [];
  const currentCodes = new Set(Object.keys(currentProps || {}));
  const incomingCodes = new Set(Object.keys(incomingProps || {}));
  const allCodes = new Set([...currentCodes, ...incomingCodes]);
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
        if (missing.length) warnings.push(`${label}: 計算式の参照候補が見つかりません: ${missing.join(', ')}`);
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

export async function upsertFields(prefix, app, incomingProps, options) {
  const writableIncoming = filterWritableFieldProps(incomingProps, options && options.skipSystem);
  const lookupMap = (options && options.lookupMap) || ({} as any);
  const convertedIncoming = {};
  for (const [code, def] of Object.entries(writableIncoming || ({} as any) as Array<[string, any]>)) {
    const converted = convertLookupAppIds(def, lookupMap);
    convertedIncoming[code] = converted.def;
  }
  const current = await apiGet(prefix, '/app/form/fields.json', { app });
  const warnings = collectFieldApplyWarnings(convertedIncoming, current.properties || {}, lookupMap);
  if (warnings.length && !kusConfirm(`フィールド反映前の確認:\n\n${warnings.join('\n')}\n\n続行しますか？`)) {
    throw new Error('フィールド反映前の確認で中断しました');
  }
  const split = splitUpsertMap(current.properties || ({} as any), convertedIncoming || ({} as any), {
    overwrite: options && options.overwrite,
    renameOnConflict: options && options.renameOnConflict,
    codeField: 'code'
  });

  if (Object.keys(split.add).length) await apiPost(prefix, '/app/form/fields.json', { app, properties: split.add });
  if (Object.keys(split.update).length) await apiPut(prefix, '/app/form/fields.json', { app, properties: split.update });
  return split.logs;
}

export async function runFieldApply() {
  const fieldJson = ui.fieldJson;
  const lookupMapEl = ui.lookupMap;
  const overwriteEl = ui.overwriteField;
  const resultEl = ui.result;
  if (!fieldJson || !lookupMapEl || !overwriteEl || !resultEl) {
    throw new Error('フィールド追加タブのUIが初期化されていません');
  }
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  const input = fieldJson.value.trim();
  if (!input) throw new Error('フィールドJSONを入力してください');

  const incoming = parseFieldInput(input);
  const validationIssues = collectFieldValidationIssues(incoming);
  if (validationIssues.length) {
    resultEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap;color:#991b1b;background:#fee2e2;border:1px solid #fecaca">${esc(validationIssues.join('\n'))}</pre>`;
    throw new Error(`フィールドJSONの事前検証で ${validationIssues.length} 件の問題を検出しました`);
  }
  const lookupMap = parseLookupMapInput(lookupMapEl.value);
  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;

  setStatus('フィールド追加/更新中...');
  const logs = await upsertFields(prefix, app, incoming, {
    overwrite: overwriteEl.checked,
    renameOnConflict: !overwriteEl.checked,
    lookupMap
  });
  logs.push('OK フィールド反映');

  resultEl.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`;
  setStatus('フィールド追加処理完了');
}

export async function runLoadTargetFields() {
  const fieldJson = ui.fieldJson;
  if (!fieldJson) throw new Error('フィールドJSONエディタが初期化されていません');
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  const prefix = buildApiPrefix(c.target.guestId, true);
  setStatus('比較先フィールド取得中...');
  const res = await apiGet(prefix, '/app/form/fields.json', { app: c.target.appId });
  fieldJson.value = JSON.stringify({ properties: res.properties || ({} as any) }, null, 2);
  setStatus('比較先フィールドを読み込みました');
}

export async function runLoadSourceFieldsList() {
  const c = commonParams();
  if (!c.source.appId) throw new Error('比較元アプリIDを入力してください');
  const prefix = buildApiPrefix(c.source.guestId, c.source.preview);
  setStatus('比較元フィールド一覧を取得中...');

  try {
    const res = await apiGet(prefix, '/app/form/fields.json', { app: c.source.appId });
    const props = res.properties || ({} as any);
    const writable = filterWritableFieldProps(props, true);
    const fields: any[] = Object.values(writable).sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)));

    if (!fields.length) {
      setStatus('表示できるフィールドがありません（システムフィールドのみ等）');
      return;
    }

    const rows = fields.map((f: any) => {
      const titleAttr = typeof f.label === 'string' ? esc(f.label) : '';
      const displayLabel = f.label ? `<span style="font-size:10px;color:#64748b;margin-left:4px">${esc(f.label)}</span>` : '';
      return `
        <tr>
          <td style="text-align:center"><input type="checkbox" class="src-field-sel" value="${esc(f.code)}" data-json="${esc(JSON.stringify(f))}"></td>
          <td title="${titleAttr}"><strong>${esc(f.code)}</strong>${displayLabel}</td>
          <td style="font-size:10px">${esc(f.type)}</td>
        </tr>
      `;
    });

    if (ui.sourceFieldTbody) ui.sourceFieldTbody.innerHTML = rows.join('');
    if (ui.sourceFieldListContainer) ui.sourceFieldListContainer.style.display = 'block';
    if (ui.sourceFieldCheckAll) ui.sourceFieldCheckAll.checked = false;
    setStatus(`比較元フィールド ${fields.length} 件を取得しました`);
  } catch (e) {
    if (ui.sourceFieldListContainer) ui.sourceFieldListContainer.style.display = 'none';
    throw e;
  }
}

export function runInsertSelectedSourceFields() {
  const fieldJson = ui.fieldJson;
  if (!fieldJson) {
    setStatus('フィールドJSONエディタが初期化されていません', true);
    return;
  }
  const checks = [...(ui.sourceFieldTbody?.querySelectorAll<HTMLInputElement>('.src-field-sel:checked') || [])];
  if (!checks.length) {
    setStatus('追加するフィールドを選択してください');
    return;
  }

  let currentObj: { properties: Record<string, any> } = { properties: {} };
  try {
    const text = fieldJson.value.trim();
    if (text) {
      const parsed = JSON.parse(text);
      currentObj = parsed && parsed.properties ? parsed : { properties: parsed || {} };
    }
  } catch (e) {
    if (!kusConfirm('現在のJSONテキストが不正です。上書きして良いですか？')) return;
  }

  let mergedCount = 0;
  for (const c of checks) {
    try {
      const def = JSON.parse(c.dataset.json || '{}');
      if (def && def.code) {
        currentObj.properties[def.code] = def;
        mergedCount++;
      }
    } catch (e) { /* skip malformed */ }
  }

  fieldJson.value = JSON.stringify(currentObj, null, 2);
  if (ui.sourceFieldListContainer) ui.sourceFieldListContainer.style.display = 'none';
  setStatus(`${mergedCount} 件のフィールド定義を挿入しました`);
}

export async function runBulkFieldRename() {
  const tgtAppId = (getToolDocument().getElementById('u_targetApp') as HTMLInputElement | null)?.value?.trim();
  if (!tgtAppId) throw new Error('比較先アプリIDが指定されていません');
  const guestPrefix = (getToolDocument().getElementById('u_targetGuest') as HTMLInputElement | null)?.value?.trim() ? `/k/guest/${(getToolDocument().getElementById('u_targetGuest') as HTMLInputElement).value.trim()}/v1` : '/k/v1';

  const prefixStr = (getToolDocument().getElementById('u_fieldPrefix') as HTMLInputElement | null)?.value?.trim();
  if (!prefixStr) throw new Error('プレフィックスを入力してください');
  const isRemove = (getToolDocument().getElementById('u_fieldPrefixRemove') as HTMLInputElement | null)?.checked;

  setBusy(true, '比較先のフィールド情報を取得中...');
  const fieldsResp = await apiGet(guestPrefix, '/app/form/fields.json', { app: tgtAppId });
  const props = fieldsResp.properties;

  let modifiedCount = 0;
  const newProps = {};
  for (const [code, field] of Object.entries(props) as Array<[string, any]>) {
    if (['RECORD_NUMBER', 'CREATOR', 'CREATED_TIME', 'MODIFIER', 'UPDATED_TIME', 'STATUS', 'STATUS_ASSIGNEE', 'CATEGORY'].includes(field.type)) continue;

    let newCode = code;
    if (isRemove && code.startsWith(prefixStr)) {
      newCode = code.slice(prefixStr.length);
    } else if (!isRemove && !code.startsWith(prefixStr)) {
      newCode = prefixStr + code;
    }

    if (newCode !== code) {
      const cloned = deepClone(field);
      cloned.code = newCode;
      newProps[newCode] = cloned;
      modifiedCount++;
    }
  }

  if (ui.fieldJson) ui.fieldJson.value = JSON.stringify(newProps, null, 2);
  const resEl: any = getToolDocument().getElementById('u_bulkFieldResult');
  if (resEl) {
    resEl.style.display = 'block';
    resEl.innerHTML = `<strong>完了:</strong> ${modifiedCount} 個のフィールドコードを変更し、上のテキストエリアにセットしました。`;
  }
  setBusy(false);
}
