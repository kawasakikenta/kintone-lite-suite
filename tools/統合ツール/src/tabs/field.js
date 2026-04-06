'use strict';

import { SECTION_DEFS, SYSTEM_FIELD_TYPES } from '../constants.js';
import { state, ui } from '../state.js';
import { esc, deepClone, downloadText, readTextFile, selectedScopeKeys } from '../utils.js';
import { apiGet, apiPut, apiPost, buildApiPrefix, fetchBundle, ensureBundleShape } from '../api.js';
import { setStatus, setBusy } from '../ui/components.js';
import { commonParams } from './diff.js';
import { getToolDocument } from '../ui/dialog.js';
import { buildCombinedFieldImpactIndex } from '../diff/enrich.js';

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
  for (const [k, v] of Object.entries(parsed)) {
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
  const out = [];
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
  const def = deepClone(fieldDef || {});
  const lookupMap = map || {};
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
  const add = {};
  const update = {};
  const logs = [];
  const used = new Set(Object.keys(currentMap || {}));

  for (const [rawKey, rawDef] of Object.entries(incomingMap || {})) {
    const key = String(rawKey);
    const def = deepClone(rawDef || {});
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

export function filterWritableFieldProps(props, skipSystem) {
  if (!skipSystem) return deepClone(props || {});
  const out = {};
  for (const [k, def] of Object.entries(props || {})) {
    if (!def || typeof def !== 'object') continue;
    if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
    out[k] = deepClone(def);
  }
  return out;
}

export async function upsertFields(prefix, app, incomingProps, options) {
  const writableIncoming = filterWritableFieldProps(incomingProps, options && options.skipSystem);
  const lookupMap = (options && options.lookupMap) || {};
  const convertedIncoming = {};
  for (const [code, def] of Object.entries(writableIncoming || {})) {
    const converted = convertLookupAppIds(def, lookupMap);
    convertedIncoming[code] = converted.def;
  }
  const current = await apiGet(prefix, '/app/form/fields.json', { app });
  const split = splitUpsertMap(current.properties || {}, convertedIncoming || {}, {
    overwrite: options && options.overwrite,
    renameOnConflict: options && options.renameOnConflict,
    codeField: 'code'
  });

  if (Object.keys(split.add).length) await apiPost(prefix, '/app/form/fields.json', { app, properties: split.add });
  if (Object.keys(split.update).length) await apiPut(prefix, '/app/form/fields.json', { app, properties: split.update });
  return split.logs;
}

export async function runFieldApply() {
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  const input = ui.fieldJson.value.trim();
  if (!input) throw new Error('フィールドJSONを入力してください');

  const incoming = parseFieldInput(input);
  const lookupMap = parseLookupMapInput(ui.lookupMap.value);
  const prefix = buildApiPrefix(c.target.guestId, true);
  const app = c.target.appId;

  setStatus('フィールド追加/更新中...');
  const logs = await upsertFields(prefix, app, incoming, {
    overwrite: ui.overwriteField.checked,
    renameOnConflict: !ui.overwriteField.checked,
    lookupMap
  });
  logs.push('OK フィールド反映');

  ui.result.innerHTML = `<pre style="margin:0;padding:10px;font-size:12px;white-space:pre-wrap">${esc(logs.join('\n'))}</pre>`;
  setStatus('フィールド追加処理完了');
}

export async function runLoadTargetFields() {
  const c = commonParams();
  if (!c.target.appId) throw new Error('比較先アプリIDを入力してください');
  const prefix = buildApiPrefix(c.target.guestId, true);
  setStatus('比較先フィールド取得中...');
  const res = await apiGet(prefix, '/app/form/fields.json', { app: c.target.appId });
  ui.fieldJson.value = JSON.stringify({ properties: res.properties || {} }, null, 2);
  setStatus('比較先フィールドを読み込みました');
}

export async function runLoadSourceFieldsList() {
  const c = commonParams();
  if (!c.source.appId) throw new Error('比較元アプリIDを入力してください');
  const prefix = buildApiPrefix(c.source.guestId, c.source.preview);
  setStatus('比較元フィールド一覧を取得中...');

  try {
    const res = await apiGet(prefix, '/app/form/fields.json', { app: c.source.appId });
    const props = res.properties || {};
    const writable = filterWritableFieldProps(props, true);
    const fields = Object.values(writable).sort((a, b) => String(a.code).localeCompare(String(b.code)));

    if (!fields.length) {
      setStatus('表示できるフィールドがありません（システムフィールドのみ等）');
      return;
    }

    const rows = fields.map(f => {
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

    ui.sourceFieldTbody.innerHTML = rows.join('');
    ui.sourceFieldListContainer.style.display = 'block';
    ui.sourceFieldCheckAll.checked = false;
    setStatus(`比較元フィールド ${fields.length} 件を取得しました`);
  } catch (e) {
    ui.sourceFieldListContainer.style.display = 'none';
    throw e;
  }
}

export function runInsertSelectedSourceFields() {
  const checks = [...ui.sourceFieldTbody.querySelectorAll('.src-field-sel:checked')];
  if (!checks.length) {
    setStatus('追加するフィールドを選択してください');
    return;
  }

  let currentObj = { properties: {} };
  try {
    const text = ui.fieldJson.value.trim();
    if (text) {
      currentObj = JSON.parse(text);
      if (!currentObj.properties) currentObj = { properties: currentObj };
    }
  } catch (e) {
    if (!window.confirm('現在のJSONテキストが不正です。上書きして良いですか？')) return;
  }

  let mergedCount = 0;
  for (const c of checks) {
    try {
      const def = JSON.parse(c.dataset.json);
      currentObj.properties[def.code] = def;
      mergedCount++;
    } catch (e) { }
  }

  ui.fieldJson.value = JSON.stringify(currentObj, null, 2);
  ui.sourceFieldListContainer.style.display = 'none';
  setStatus(`${mergedCount} 件のフィールド定義を挿入しました`);
}

export async function runBulkFieldRename() {
  const tgtAppId = getToolDocument().getElementById('u_targetApp')?.value?.trim();
  if (!tgtAppId) throw new Error('比較先アプリIDが指定されていません');
  const guestPrefix = getToolDocument().getElementById('u_targetGuest')?.value?.trim() ? `/k/guest/${getToolDocument().getElementById('u_targetGuest').value.trim()}/v1` : '/k/v1';

  const prefixStr = getToolDocument().getElementById('u_fieldPrefix')?.value?.trim();
  if (!prefixStr) throw new Error('プレフィックスを入力してください');
  const isRemove = getToolDocument().getElementById('u_fieldPrefixRemove')?.checked;

  setBusy(true, '比較先のフィールド情報を取得中...');
  const fieldsResp = await apiGet(guestPrefix, '/app/form/fields.json', { app: tgtAppId });
  const props = fieldsResp.properties;

  let modifiedCount = 0;
  const newProps = {};
  for (const [code, field] of Object.entries(props)) {
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

  ui.fieldJson.value = JSON.stringify(newProps, null, 2);
  const resEl = getToolDocument().getElementById('u_bulkFieldResult');
  resEl.style.display = 'block';
  resEl.innerHTML = `<strong>完了:</strong> ${modifiedCount} 個のフィールドコードを変更し、上のテキストエリアにセットしました。`;
  setBusy(false);
}

export async function runDetectUnusedFields() {
  const tgtAppId = getToolDocument().getElementById('u_targetApp')?.value?.trim();
  if (!tgtAppId) throw new Error('比較先アプリIDが指定されていません');
  const guestId = getToolDocument().getElementById('u_targetGuest')?.value?.trim() || null;

  setBusy(true, '比較先アプリの全設定を取得中...');
  const bundle = await fetchBundle({
    appId: tgtAppId,
    guestId,
    preview: true,
    sections: SECTION_DEFS.map(s => s.key),
    onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`)
  });
  ensureBundleShape(bundle);

  const index = buildCombinedFieldImpactIndex(bundle);
  const usedCodes = new Set(Object.keys(index.refs || {}));

  const fieldsResp = bundle.sections.fieldSettings;
  const props = fieldsResp ? fieldsResp.properties : {};

  const unused = [];
  for (const [code, field] of Object.entries(props)) {
    if (['RECORD_NUMBER', 'CREATOR', 'CREATED_TIME', 'MODIFIER', 'UPDATED_TIME', 'STATUS', 'STATUS_ASSIGNEE', 'CATEGORY'].includes(field.type)) continue;
    if (!usedCodes.has(code)) {
      unused.push(code);
    }
  }

  const resEl = getToolDocument().getElementById('u_bulkFieldResult');
  resEl.style.display = 'block';
  if (unused.length === 0) {
    resEl.innerHTML = '<span style="color:#15803d">全てのフィールドがビューや計算式、プロセスなどで使用されています（または影響判定範囲外です）。</span>';
  } else {
    resEl.innerHTML = `
      <strong style="color:#b45309">影響のない（未使用の可能性が高い）フィールド ${unused.length}件:</strong>
      <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
        ${unused.map(c => `<span class="chip" style="font-family:monospace">${esc(c)}</span>`).join('')}
      </div>
      <div class="muted" style="margin-top:6px">※JavaScriptカスタマイズや外部API連携での使用は検知できません。</div>
    `;
  }
  setBusy(false);
}
