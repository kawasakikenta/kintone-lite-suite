'use strict';

import { SYSTEM_FIELD_TYPES } from '../constants.js';
import { deepClone } from '../utils.js';
import { apiGet, apiPost, apiPut, buildApiPrefix } from '../api.js';

function filterWritable(props) {
  const out = {};
  for (const [k, def] of Object.entries(props || {})) {
    if (!def || typeof def !== 'object') continue;
    if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
    out[k] = deepClone(def);
  }
  return out;
}

function convertLookup(fieldDef, map) {
  const def = deepClone(fieldDef || {});
  if (!Object.keys(map).length) return { def, changed: false };
  let changed = false;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    const rel = node.lookup?.relatedApp;
    if (rel?.app != null) {
      const after = map[String(rel.app)];
      if (after && String(after) !== String(rel.app)) {
        node.lookup.relatedApp.app = String(after);
        changed = true;
      }
    }
    if (node.type === 'SUBTABLE' && node.fields) Object.values(node.fields).forEach(walk);
  };
  walk(def);
  return { def, changed };
}

export async function runFieldApplyStandalone(opts, setStatus) {
  const { targetAppId, targetGuestId, fieldJson, lookupMapJson, overwrite } = opts;
  if (!targetAppId) throw new Error('比較先アプリIDを入力してください');
  if (!fieldJson?.trim()) throw new Error('フィールドJSONを入力してください');

  let incoming;
  const parsed = JSON.parse(fieldJson);
  if (parsed?.properties && typeof parsed.properties === 'object') incoming = parsed.properties;
  else incoming = parsed;

  const lookupMap = {};
  if (lookupMapJson?.trim()) {
    const lm = JSON.parse(lookupMapJson);
    for (const [k, v] of Object.entries(lm || {})) {
      if (String(k).trim() && String(v).trim()) lookupMap[String(k).trim()] = String(v).trim();
    }
  }

  const prefix = buildApiPrefix(targetGuestId || '', true);
  setStatus('比較先フィールド取得中...');
  const current = await apiGet(prefix, '/app/form/fields.json', { app: targetAppId });
  const currentMap = current.properties || {};

  const adds = {};
  const updates = {};
  const logs = [];

  for (const [code, rawDef] of Object.entries(incoming || {})) {
    const writable = filterWritable({ [code]: rawDef });
    if (!writable[code]) { logs.push(`SKIP ${code} (system)`); continue; }
    const { def } = convertLookup(writable[code], lookupMap);
    if (!def.code) def.code = code;

    if (currentMap[code]) {
      if (overwrite) { updates[code] = def; logs.push(`UPDATE ${code}`); }
      else logs.push(`SKIP ${code} (exists)`);
    } else {
      adds[code] = def;
      logs.push(`ADD ${code}`);
    }
  }

  setStatus('フィールド追加/更新中...');
  if (Object.keys(adds).length) await apiPost(prefix, '/app/form/fields.json', { app: targetAppId, properties: adds });
  if (Object.keys(updates).length) await apiPut(prefix, '/app/form/fields.json', { app: targetAppId, properties: updates });

  setStatus('フィールド追加処理完了');
  return logs;
}

export async function runLoadFieldsStandalone(opts, setStatus) {
  const { appId, guestId, preview } = opts;
  if (!appId) throw new Error('アプリIDを入力してください');
  const prefix = buildApiPrefix(guestId || '', !!preview);
  setStatus('フィールド取得中...');
  const res = await apiGet(prefix, '/app/form/fields.json', { app: appId });
  setStatus('フィールド取得完了');
  return res.properties || {};
}
