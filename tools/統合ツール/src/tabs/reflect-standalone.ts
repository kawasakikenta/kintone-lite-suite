'use strict';

import { SECTION_DEFS, SYSTEM_FIELD_TYPES } from '../constants.js';
import { deepClone } from '../utils.js';
import { apiGet, apiPost, apiPut, buildApiPrefix, fetchBundle } from '../api.js';

function filterWritable(props: any) {
  const out: Record<string, any> = {};
  for (const [k, def] of Object.entries(props || {}) as Array<[string, any]>) {
    if (!def || typeof def !== 'object') continue;
    if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
    out[k] = deepClone(def);
  }
  return out;
}

function convertLookup(fieldDef: any, map: Record<string, any>) {
  const def: any = deepClone(fieldDef || ({} as any));
  if (!Object.keys(map).length) return def;
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    const rel = node.lookup?.relatedApp;
    if (rel?.app != null) {
      const after = map[String(rel.app)];
      if (after && String(after) !== String(rel.app)) node.lookup.relatedApp.app = String(after);
    }
    if (node.type === 'SUBTABLE' && node.fields) Object.values(node.fields).forEach(walk);
  };
  walk(def);
  return def;
}

async function applyFieldSection(prefix, app, sourceProps, logs, lookupMap, stopOnError) {
  const current = await apiGet(prefix, '/app/form/fields.json', { app });
  const currentMap = current.properties || ({} as any);
  const srcWritable = filterWritable(sourceProps);

  const adds = {};
  const updates = {};
  for (const [code, def] of Object.entries(srcWritable) as Array<[string, any]>) {
    const converted = convertLookup(def, lookupMap);
    if (currentMap[code]) {
      updates[code] = converted;
    } else {
      adds[code] = converted;
    }
  }

  if (Object.keys(adds).length) {
    try {
      await apiPost(prefix, '/app/form/fields.json', { app, properties: adds });
      logs.push(`  OK フィールド追加: ${Object.keys(adds).length}件`);
    } catch (e) {
      logs.push(`  NG フィールド追加: ${e.message}`);
      if (stopOnError) throw e;
    }
  }
  if (Object.keys(updates).length) {
    try {
      await apiPut(prefix, '/app/form/fields.json', { app, properties: updates });
      logs.push(`  OK フィールド更新: ${Object.keys(updates).length}件`);
    } catch (e) {
      logs.push(`  NG フィールド更新: ${e.message}`);
      if (stopOnError) throw e;
    }
  }
}

async function applyViewsSection(prefix, app, sourceViews, logs, stopOnError) {
  try {
    await apiPut(prefix, '/app/views.json', { app, views: sourceViews.views || sourceViews });
    logs.push('  OK ビュー設定');
  } catch (e) {
    logs.push(`  NG ビュー設定: ${e.message}`);
    if (stopOnError) throw e;
  }
}

/**
 * @param {{
 *   sourceAppId: string,
 *   sourceGuestId?: string,
 *   sourcePreview?: boolean,
 *   targetAppId: string,
 *   targetGuestId?: string,
 *   scopes: string[],
 *   lookupMap?: Record<string,string>,
 *   stopOnError?: boolean,
 *   doBackup?: boolean
 * }} opts
 * @param {(msg: string, err?: boolean) => void} setStatus
 * @param {(logs: string[]) => void} onProgress
 */
export async function runApplyPreviewStandalone(opts, setStatus, onProgress) {
  const { sourceAppId, sourceGuestId, sourcePreview, targetAppId, targetGuestId } = opts;
  if (!sourceAppId) throw new Error('比較元アプリIDを入力してください');
  if (!targetAppId) throw new Error('比較先アプリIDを入力してください');

  const scopes = (opts.scopes || []).filter(Boolean);
  if (!scopes.length) throw new Error('反映するセクションを選択してください');

  const lookupMap = opts.lookupMap || ({} as any);
  const stopOnError = !!opts.stopOnError;
  const logs = [];

  setStatus('比較元設定を取得中...');
  const sourceBundle = await fetchBundle({
    appId: sourceAppId,
    guestId: sourceGuestId || '',
    preview: !!sourcePreview,
    sections: scopes,
    onProgress: (p, l) => setStatus(`比較元取得中 ${Math.round(p * 100)}% (${l})`)
  });

  if (opts.doBackup) {
    setStatus('比較先プレビューのバックアップ取得中...');
    const backup = await fetchBundle({
      appId: targetAppId,
      guestId: targetGuestId || '',
      preview: true,
      sections: scopes,
      onProgress: (p, l) => setStatus(`バックアップ取得 ${Math.round(p * 100)}% (${l})`)
    });
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), scopes, bundle: backup }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_app${targetAppId}_${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    logs.push('バックアップ保存完了');
  }

  const prefix = buildApiPrefix(targetGuestId || '', true);
  const app = targetAppId;

  logs.push(`比較元: ${sourceAppId} → 比較先(プレビュー): ${targetAppId}`);
  logs.push(`セクション: ${scopes.length}件`);
  logs.push('');

  let hadError = false;

  for (let i = 0; i < scopes.length; i++) {
    const secKey = scopes[i];
    const def = SECTION_DEFS.find((d) => d.key === secKey);
    if (!def || !def.put) { logs.push(`SKIP ${def?.label || secKey}`); continue; }

    const sourceSec = deepClone(sourceBundle.sections?.[secKey]);
    if (!sourceSec || sourceSec._fetchError) {
      logs.push(`SKIP ${def.label}: source未取得`);
      onProgress(logs);
      continue;
    }

    setStatus(`反映中 ${i + 1}/${scopes.length}: ${def.label}`);
    try {
      if (secKey === 'fieldSettings') {
        await applyFieldSection(prefix, app, sourceSec.properties || sourceSec, logs, lookupMap, stopOnError);
        logs.push(`OK ${def.label}`);
      } else if (secKey === 'viewSettings') {
        await applyViewsSection(prefix, app, sourceSec, logs, stopOnError);
      } else {
        const body = { app, ...def.putBuilder(sourceSec) };
        await apiPut(prefix, def.endpoint, body);
        logs.push(`OK ${def.label}`);
      }
    } catch (e) {
      hadError = true;
      logs.push(`NG ${def.label}: ${e.message || String(e)}`);
      if (stopOnError) { logs.push('中断'); break; }
    }
    onProgress(logs);
  }

  const ok = logs.filter(l => l.startsWith('OK ')).length;
  const ng = logs.filter(l => l.startsWith('NG ')).length;
  logs.push('');
  logs.push(`=== 完了: OK ${ok} / NG ${ng} ===`);
  onProgress(logs);
  setStatus(hadError ? '反映完了（一部エラーあり）' : '反映完了');
  return logs;
}
