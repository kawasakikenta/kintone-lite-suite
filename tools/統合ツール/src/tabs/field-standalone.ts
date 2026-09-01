'use strict';

import { SYSTEM_FIELD_TYPES } from '../constants.js';
import { deepClone, kusConfirm } from '../utils.js';
import { apiGet, apiPost, apiPut, buildApiPrefix, decorateRevisionConflict, pickRevision } from '../api.js';

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
  if (!Object.keys(map).length) return { def, changed: false };
  let changed = false;
  const walk = (node: any) => {
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

/**
 * テキストエリアの JSON を properties マップへ正規化する。
 * `{ "properties": {...} }` と `{ code: def, ... }` の両形式を受け付け、
 * JSON.parse の生メッセージではなく利用者向けの説明を返す。
 */
export function parseFieldJsonInput(text: unknown): Record<string, any> {
  const raw = String(text ?? '').trim();
  if (!raw) throw new Error('フィールドJSONを入力してください');
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e: any) {
    throw new Error(`フィールドJSONを解析できません（「整形」ボタンで位置を確認してください）: ${e?.message || String(e)}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('フィールドJSONは { "properties": { ... } } 形式のオブジェクトで入力してください');
  }
  const props = parsed.properties && typeof parsed.properties === 'object' ? parsed.properties : parsed;
  if (!Object.keys(props).length) throw new Error('フィールドJSONに反映対象のフィールドがありません');
  return props;
}

export function parseLookupMapInput(text: unknown): Record<string, string> {
  const raw = String(text ?? '').trim();
  const out: Record<string, string> = {};
  if (!raw) return out;
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e: any) {
    throw new Error(`Lookup AppID 変換 JSON を解析できません: ${e?.message || String(e)}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Lookup AppID 変換 JSON は {"旧AppID":"新AppID"} 形式で入力してください');
  }
  for (const [k, v] of Object.entries(parsed) as Array<[string, any]>) {
    const from = String(k).trim();
    const to = String(v ?? '').trim();
    if (from && to) out[from] = to;
  }
  return out;
}

export interface FieldApplyPlan {
  adds: Record<string, any>;
  updates: Record<string, any>;
  skippedSystem: string[];
  skippedExisting: string[];
  lookupConverted: string[];
  logs: string[];
}

/**
 * 反映前の計画。API には触れないので、確認ダイアログと単体テストで同じ結果を使える。
 */
export function planFieldApply(
  incoming: Record<string, any>,
  currentProps: Record<string, any>,
  lookupMap: Record<string, string>,
  overwrite: boolean
): FieldApplyPlan {
  const plan: FieldApplyPlan = { adds: {}, updates: {}, skippedSystem: [], skippedExisting: [], lookupConverted: [], logs: [] };
  const currentMap = currentProps || {};
  for (const [code, rawDef] of Object.entries(incoming || {}) as Array<[string, any]>) {
    const writable = filterWritable({ [code]: rawDef });
    if (!writable[code]) {
      plan.skippedSystem.push(code);
      plan.logs.push(`SKIP ${code} (system)`);
      continue;
    }
    const { def, changed } = convertLookup(writable[code], lookupMap);
    if (changed) plan.lookupConverted.push(code);
    if (!def.code) def.code = code;

    if (currentMap[code]) {
      if (overwrite) {
        plan.updates[code] = def;
        plan.logs.push(`UPDATE ${code}${changed ? ' (lookup変換)' : ''}`);
      } else {
        plan.skippedExisting.push(code);
        plan.logs.push(`SKIP ${code} (exists)`);
      }
    } else {
      plan.adds[code] = def;
      plan.logs.push(`ADD ${code}${changed ? ' (lookup変換)' : ''}`);
    }
  }
  return plan;
}

export function buildFieldApplyConfirmText(targetAppId: string, targetGuestId: string, plan: FieldApplyPlan): string {
  const addCount = Object.keys(plan.adds).length;
  const updateCount = Object.keys(plan.updates).length;
  const skipCount = plan.skippedSystem.length + plan.skippedExisting.length;
  return [
    `比較先 App ${targetAppId}${targetGuestId ? `（ゲスト ${targetGuestId}）` : ''} のプレビュー環境へフィールドを反映します。`,
    `追加 ${addCount}件 / 更新 ${updateCount}件 / スキップ ${skipCount}件${plan.lookupConverted.length ? ` / Lookup変換 ${plan.lookupConverted.length}件` : ''}`,
    updateCount ? '更新対象は既存の定義を比較元の内容で置き換えます。' : '',
    '本番には反映されません（管理画面から手動デプロイ）。実行しますか？'
  ].filter(Boolean).join('\n');
}

/**
 * フィールド定義 JSON を比較先プレビューへ追加・更新する。
 * - GET で得た revision を POST/PUT に添え、競合時は上書きせず利用者へ通知する
 * - 反映前に対象アプリと件数を最終確認する（opts.skipConfirm で省略可）
 */
export async function runFieldApplyStandalone(opts, setStatus) {
  const { targetAppId, targetGuestId, fieldJson, lookupMapJson, overwrite } = opts;
  if (!targetAppId) throw new Error('比較先アプリIDを入力してください');
  const incoming = parseFieldJsonInput(fieldJson);
  const lookupMap = parseLookupMapInput(lookupMapJson);

  const prefix = buildApiPrefix(targetGuestId || '', true);
  setStatus('比較先フィールド取得中...');
  const current = await apiGet(prefix, '/app/form/fields.json', { app: targetAppId });
  const plan = planFieldApply(incoming, current.properties || ({} as any), lookupMap, !!overwrite);
  const logs = [...plan.logs];
  const addCount = Object.keys(plan.adds).length;
  const updateCount = Object.keys(plan.updates).length;

  if (!addCount && !updateCount) {
    setStatus(`追加・更新対象がありません（スキップ ${plan.skippedSystem.length + plan.skippedExisting.length}件）`, true);
    logs.push('反映対象なし');
    return logs;
  }
  if (!opts.skipConfirm && !kusConfirm(buildFieldApplyConfirmText(String(targetAppId), String(targetGuestId || ''), plan))) {
    setStatus('フィールド反映をキャンセルしました');
    logs.push('キャンセル');
    return logs;
  }

  let revision = pickRevision(current);
  const withRevision = (body: Record<string, unknown>) => (revision ? { ...body, revision } : body);
  if (addCount) {
    setStatus(`フィールド追加中... (${addCount}件)`);
    try {
      const res = await apiPost(prefix, '/app/form/fields.json', withRevision({ app: targetAppId, properties: plan.adds }));
      revision = pickRevision(res) || revision;
      logs.push(`OK フィールド追加 ${addCount}件${revision ? ` (revision ${revision})` : ''}`);
    } catch (e) {
      logs.push(`NG フィールド追加 ${addCount}件`);
      throw decorateRevisionConflict(e, 'フィールド追加');
    }
  }
  if (updateCount) {
    setStatus(`フィールド更新中... (${updateCount}件)`);
    try {
      const res = await apiPut(prefix, '/app/form/fields.json', withRevision({ app: targetAppId, properties: plan.updates }));
      revision = pickRevision(res) || revision;
      logs.push(`OK フィールド更新 ${updateCount}件${revision ? ` (revision ${revision})` : ''}`);
    } catch (e) {
      logs.push(`NG フィールド更新 ${updateCount}件${addCount ? '（追加 ' + addCount + '件は反映済み）' : ''}`);
      throw decorateRevisionConflict(e, 'フィールド更新');
    }
  }

  setStatus(`フィールド反映完了: 追加 ${addCount} / 更新 ${updateCount} / スキップ ${plan.skippedSystem.length + plan.skippedExisting.length}`);
  return logs;
}

export async function runLoadFieldsStandalone(opts, setStatus) {
  const { appId, guestId, preview } = opts;
  if (!appId) throw new Error('アプリIDを入力してください');
  const prefix = buildApiPrefix(guestId || '', !!preview);
  setStatus('フィールド取得中...');
  const res = await apiGet(prefix, '/app/form/fields.json', { app: appId });
  setStatus('フィールド取得完了');
  return res.properties || ({} as any);
}

const RENAME_EXCLUDED_TYPES = new Set([
  'RECORD_NUMBER', 'CREATOR', 'CREATED_TIME', 'MODIFIER', 'UPDATED_TIME',
  'STATUS', 'STATUS_ASSIGNEE', 'CATEGORY'
]);

/**
 * フィールドコードにプレフィックスを一括付与/除去した properties を返す（純粋関数）。
 * サブテーブル内の子フィールドも同じ規則で書き換える。
 */
export function planBulkRename(props: Record<string, any>, prefixText: string, removeMode: boolean) {
  const trimmed = String(prefixText || '').trim();
  const rename = (code: string): string => {
    if (removeMode) return code.startsWith(trimmed) ? code.slice(trimmed.length) : code;
    return code.startsWith(trimmed) ? code : trimmed + code;
  };
  let modifiedCount = 0;
  const newProps: Record<string, any> = {};
  const renamePairs: Array<{ from: string; to: string }> = [];
  const collisions: string[] = [];
  for (const [code, field] of Object.entries(props || {}) as Array<[string, any]>) {
    if (!field || RENAME_EXCLUDED_TYPES.has(field.type)) continue;
    const newCode = rename(code);
    const cloned = deepClone(field);
    let touched = false;
    if (newCode !== code) {
      if (!newCode) { collisions.push(`${code} → (空)`); continue; }
      cloned.code = newCode;
      touched = true;
      renamePairs.push({ from: code, to: newCode });
    }
    if (cloned.type === 'SUBTABLE' && cloned.fields && typeof cloned.fields === 'object') {
      const children: Record<string, any> = {};
      for (const [childCode, childDef] of Object.entries(cloned.fields) as Array<[string, any]>) {
        const newChild = rename(childCode);
        const childClone = deepClone(childDef);
        if (newChild !== childCode && newChild) {
          childClone.code = newChild;
          touched = true;
          renamePairs.push({ from: `${code}.${childCode}`, to: `${newCode}.${newChild}` });
        }
        children[newChild || childCode] = childClone;
      }
      cloned.fields = children;
    }
    if (!touched) continue;
    if (newProps[newCode]) collisions.push(`${code} → ${newCode}`);
    newProps[newCode] = cloned;
    modifiedCount++;
  }
  return { properties: newProps, modifiedCount, renamePairs, collisions };
}

/**
 * 比較先プレビューのフィールドコードに対し、プレフィックスを一括付与/除去した
 * 新しい properties JSON を返す（書き換え結果はテキストエリアに反映する想定。
 * 反映自体は別途 runFieldApplyStandalone で実行）。
 */
export async function runBulkRenameFieldStandalone(opts, setStatus) {
  const { targetAppId, targetGuestId, prefix, removeMode } = opts;
  if (!targetAppId) throw new Error('比較先アプリIDを入力してください');
  if (!prefix || !String(prefix).trim()) throw new Error('プレフィックス文字列を入力してください');
  const apiPrefix = buildApiPrefix(targetGuestId || '', true);
  setStatus('比較先フィールドを取得中...');
  const fieldsResp = await apiGet(apiPrefix, '/app/form/fields.json', { app: targetAppId });
  const result = planBulkRename(fieldsResp.properties || ({} as any), String(prefix), !!removeMode);
  if (result.collisions.length) {
    throw new Error(`リネーム後のフィールドコードが重複または空になります: ${result.collisions.join(', ')}`);
  }
  setStatus(`プレフィックス${removeMode ? '除去' : '付与'}完了: ${result.modifiedCount}件`);
  return { properties: result.properties, modifiedCount: result.modifiedCount, renamePairs: result.renamePairs };
}
