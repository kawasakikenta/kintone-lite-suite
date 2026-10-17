'use strict';

import { SYSTEM_FIELD_TYPES } from '../constants.js';
import { deepClone, kusConfirm } from '../utils.js';
import { apiGet, apiPost, apiPut, buildApiPrefix, decorateRevisionConflict, pickRevision } from '../api.js';

function filterWritable(props: any) {
  const out: Record<string, any> = {};
  for (const [k, def] of Object.entries(props || {}) as Array<[string, any]>) {
    if (!def || typeof def !== 'object') continue;
    if (SYSTEM_FIELD_TYPES.has(def.type)) continue;
    const cloned = deepClone(def);
    if (cloned.type === 'SUBTABLE' && cloned.fields && typeof cloned.fields === 'object') {
      const writableChildren: Record<string, any> = {};
      for (const [ck, cdef] of Object.entries(cloned.fields) as Array<[string, any]>) {
        if (!cdef || typeof cdef !== 'object') continue;
        if (SYSTEM_FIELD_TYPES.has(cdef.type)) continue;
        writableChildren[ck] = cdef;
      }
      cloned.fields = writableChildren;
    }
    out[k] = cloned;
  }
  return out;
}

function convertLookup(fieldDef: any, map: Record<string, any>) {
  const def: any = deepClone(fieldDef || ({} as any));
  if (!Object.keys(map).length) return { def, changed: false };
  let changed = false;
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    const lookupRel = node.lookup?.relatedApp;
    if (lookupRel?.app != null) {
      const after = map[String(lookupRel.app)];
      if (after && String(after) !== String(lookupRel.app)) {
        node.lookup.relatedApp.app = String(after);
        delete node.lookup.relatedApp.code;
        changed = true;
      }
    }
    const refRel = node.referenceTable?.relatedApp;
    if (refRel?.app != null) {
      const after = map[String(refRel.app)];
      if (after && String(after) !== String(refRel.app)) {
        node.referenceTable.relatedApp.app = String(after);
        delete node.referenceTable.relatedApp.code;
        changed = true;
      }
    }
    if (node.type === 'SUBTABLE' && node.fields) Object.values(node.fields).forEach(walk);
  };
  walk(def);
  return { def, changed };
}

function validateNumericId(value: unknown, label: string, required = false): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    if (required) throw new Error(`${label}を入力してください`);
    return '';
  }
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${label}は数値で入力してください: ${trimmed}`);
  }
  return trimmed;
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
  for (const [code, definition] of Object.entries(props) as Array<[string, any]>) {
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
      throw new Error(`フィールドコード「${code}」の定義がオブジェクトではありません`);
    }
    if (!String(definition.type || '').trim()) {
      throw new Error(`フィールドコード「${code}」の定義に type がありません`);
    }
  }
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
  const existingSubtableOwnerByChildCode = new Map<string, string>();
  for (const [tblCode, tblDef] of Object.entries(currentMap) as Array<[string, any]>) {
    if (tblDef?.type === 'SUBTABLE' && tblDef.fields && typeof tblDef.fields === 'object') {
      for (const [childKey, childDef] of Object.entries(tblDef.fields) as Array<[string, any]>) {
        existingSubtableOwnerByChildCode.set(childKey, tblCode);
        if (childDef?.code) existingSubtableOwnerByChildCode.set(String(childDef.code), tblCode);
      }
    }
  }

  const seenIncomingOwnerByCode = new Map<string, string>();
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

    const targetCode = String(def.code || code).trim();
    const prevIncomingOwner = seenIncomingOwnerByCode.get(targetCode) || seenIncomingOwnerByCode.get(code);
    if (prevIncomingOwner) {
      throw new Error(`フィールドコード「${targetCode}」が入力JSON内の「${prevIncomingOwner}」と重複しています`);
    }
    seenIncomingOwnerByCode.set(code, code);
    seenIncomingOwnerByCode.set(targetCode, code);

    const subOwnerForKey = existingSubtableOwnerByChildCode.get(code);
    if (subOwnerForKey) {
      throw new Error(`フィールドコード「${code}」は既存のサブテーブル「${subOwnerForKey}」内の子フィールドと重複しています`);
    }
    const subOwnerForTarget = existingSubtableOwnerByChildCode.get(targetCode);
    if (subOwnerForTarget) {
      throw new Error(`フィールドコード「${targetCode}」は既存のサブテーブル「${subOwnerForTarget}」内の子フィールドと重複しています`);
    }

    if (def.type === 'SUBTABLE' && def.fields && typeof def.fields === 'object') {
      for (const [childKey, childDef] of Object.entries(def.fields) as Array<[string, any]>) {
        if (!childDef || typeof childDef !== 'object') continue;
        if (!childDef.code) childDef.code = childKey;
        const childTarget = String(childDef.code || childKey).trim();
        for (const cCode of new Set([childKey, childTarget])) {
          const prevOwner = seenIncomingOwnerByCode.get(cCode);
          if (prevOwner) {
            throw new Error(`サブテーブル「${code}」の子フィールドコード「${cCode}」が入力JSON内の「${prevOwner}」と重複しています`);
          }
          if (currentMap[cCode] && cCode !== code && cCode !== targetCode) {
            throw new Error(`サブテーブル「${code}」の子フィールドコード「${cCode}」が既存のトップレベルフィールドと重複しています`);
          }
          const otherSub = existingSubtableOwnerByChildCode.get(cCode);
          if (otherSub && otherSub !== code && otherSub !== targetCode) {
            throw new Error(`サブテーブル「${code}」の子フィールドコード「${cCode}」が別サブテーブル「${otherSub}」内の子フィールドと重複しています`);
          }
        }
        seenIncomingOwnerByCode.set(childKey, `${code}.${childKey}`);
        seenIncomingOwnerByCode.set(childTarget, `${code}.${childTarget}`);
      }
    }

    if (currentMap[code]) {
      if (overwrite) {
        const curType = String(currentMap[code]?.type || '').trim();
        const nextType = String(def.type || '').trim();
        if (curType && nextType && curType !== nextType) {
          throw new Error(`フィールド「${code}」の type が一致しません（既存: ${curType} / 入力: ${nextType}）。既存フィールドの型変更はできません`);
        }
        if (targetCode !== code && currentMap[targetCode]) {
          throw new Error(`フィールド「${code}」の変更先コード「${targetCode}」は既存フィールドと重複しています`);
        }
        if (def.type === 'SUBTABLE' && def.fields && currentMap[code]?.fields) {
          for (const [childKey, childDef] of Object.entries(def.fields) as Array<[string, any]>) {
            const existingChild = currentMap[code].fields[childKey];
            const curChildType = String(existingChild?.type || '').trim();
            const nextChildType = String(childDef?.type || '').trim();
            if (curChildType && nextChildType && curChildType !== nextChildType) {
              throw new Error(`サブテーブル「${code}」内の子フィールド「${childKey}」の type が一致しません（既存: ${curChildType} / 入力: ${nextChildType}）`);
            }
          }
        }
        plan.updates[code] = def;
        plan.logs.push(`UPDATE ${code}${changed ? ' (参照先AppID変換)' : ''}`);
      } else {
        plan.skippedExisting.push(code);
        plan.logs.push(`SKIP ${code} (exists)`);
      }
    } else {
      if (targetCode !== code && currentMap[targetCode]) {
        throw new Error(`フィールド「${code}」の code「${targetCode}」は既存フィールドと重複しています`);
      }
      plan.adds[code] = def;
      plan.logs.push(`ADD ${code}${changed ? ' (参照先AppID変換)' : ''}`);
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
    `追加 ${addCount}件 / 更新 ${updateCount}件 / スキップ ${skipCount}件${plan.lookupConverted.length ? ` / 参照先AppID変換 ${plan.lookupConverted.length}件` : ''}`,
    updateCount ? '更新対象は既存の定義を比較元の内容で置き換えます。' : '',
    '本番には反映されません（管理画面から手動デプロイ）。実行しますか？'
  ].filter(Boolean).join('\n');
}

function attachLogsToError(err: unknown, logs: string[]): Error {
  const baseMessage = err instanceof Error ? err.message : String(err || 'エラーが発生しました');
  const combined = logs.length ? `${baseMessage}\n${logs.join('\n')}` : baseMessage;
  const wrapped = new Error(combined);
  if (err && typeof err === 'object') {
    Object.assign(wrapped, err);
    wrapped.message = combined;
  }
  return wrapped;
}

/**
 * フィールド定義 JSON を比較先プレビューへ追加・更新する。
 * - GET で得た revision を POST/PUT に添え、競合時は上書きせず利用者へ通知する
 * - 反映前に対象アプリと件数を最終確認する（opts.skipConfirm で省略可）
 */
export async function runFieldApplyStandalone(opts, setStatus) {
  const { targetAppId, targetGuestId, fieldJson, lookupMapJson, overwrite } = opts;
  const tgtApp = validateNumericId(targetAppId, '比較先アプリID', true);
  const tgtGuest = validateNumericId(targetGuestId, '比較先ゲストID', false);
  const incoming = parseFieldJsonInput(fieldJson);
  const lookupMap = parseLookupMapInput(lookupMapJson);

  const prefix = buildApiPrefix(tgtGuest, true);
  setStatus('比較先フィールド取得中...');
  const current = await apiGet(prefix, '/app/form/fields.json', { app: tgtApp });
  const plan = planFieldApply(incoming, current.properties || ({} as any), lookupMap, !!overwrite);
  const logs = [...plan.logs];
  const addCount = Object.keys(plan.adds).length;
  const updateCount = Object.keys(plan.updates).length;

  if (!addCount && !updateCount) {
    setStatus(`追加・更新対象がありません（スキップ ${plan.skippedSystem.length + plan.skippedExisting.length}件）`, true);
    logs.push('反映対象なし');
    return logs;
  }
  let revision = pickRevision(current);
  if (!/^\d+$/.test(revision)) {
    throw new Error('比較先フィールド設定の revision を確認できないため反映を中止しました。最新の設定を取得し直してください');
  }
  if (!opts.skipConfirm && !kusConfirm(buildFieldApplyConfirmText(tgtApp, tgtGuest, plan))) {
    setStatus('フィールド反映をキャンセルしました');
    logs.push('キャンセル');
    return logs;
  }

  const withRevision = (body: Record<string, unknown>) => (revision ? { ...body, revision } : body);
  if (addCount) {
    setStatus(`フィールド追加中... (${addCount}件)`);
    try {
      const res = await apiPost(prefix, '/app/form/fields.json', withRevision({ app: tgtApp, properties: plan.adds }));
      const nextRevision = pickRevision(res);
      if (!/^\d+$/.test(nextRevision)) {
        logs.push(`OK フィールド追加 ${addCount}件 (revision 不明)`);
        throw new Error('フィールド追加は完了しましたが、更新後の revision を確認できないため以降の反映を中止しました。差分を取得し直して状態を確認してください');
      }
      revision = nextRevision;
      logs.push(`OK フィールド追加 ${addCount}件${revision ? ` (revision ${revision})` : ''}`);
    } catch (e) {
      if (!logs.some((l) => l.startsWith('OK フィールド追加'))) {
        logs.push(`NG フィールド追加 ${addCount}件`);
      }
      throw attachLogsToError(decorateRevisionConflict(e, 'フィールド追加'), logs);
    }
  }
  if (updateCount) {
    setStatus(`フィールド更新中... (${updateCount}件)`);
    try {
      const res = await apiPut(prefix, '/app/form/fields.json', withRevision({ app: tgtApp, properties: plan.updates }));
      const nextRevision = pickRevision(res);
      if (!/^\d+$/.test(nextRevision)) {
        logs.push(`OK フィールド更新 ${updateCount}件 (revision 不明)`);
        throw new Error('フィールド更新は完了しましたが、更新後の revision を確認できません。差分を取得し直して状態を確認してください');
      }
      revision = nextRevision;
      logs.push(`OK フィールド更新 ${updateCount}件${revision ? ` (revision ${revision})` : ''}`);
    } catch (e) {
      if (!logs.some((l) => l.startsWith('OK フィールド更新'))) {
        logs.push(`NG フィールド更新 ${updateCount}件${addCount ? '（追加 ' + addCount + '件は反映済み）' : ''}`);
      }
      throw attachLogsToError(decorateRevisionConflict(e, 'フィールド更新'), logs);
    }
  }

  setStatus(`フィールド反映完了: 追加 ${addCount} / 更新 ${updateCount} / スキップ ${plan.skippedSystem.length + plan.skippedExisting.length}`);
  return logs;
}

export async function runLoadFieldsStandalone(opts, setStatus) {
  const { appId, guestId, preview } = opts;
  const id = validateNumericId(appId, 'アプリID', true);
  const guest = validateNumericId(guestId, 'ゲストID', false);
  const prefix = buildApiPrefix(guest, !!preview);
  setStatus('フィールド取得中...');
  const res = await apiGet(prefix, '/app/form/fields.json', { app: id });
  setStatus('フィールド取得完了');
  return res.properties || ({} as any);
}

const RENAME_EXCLUDED_TYPES = new Set([
  'RECORD_NUMBER', 'CREATOR', 'CREATED_TIME', 'MODIFIER', 'UPDATED_TIME',
  'STATUS', 'STATUS_ASSIGNEE', 'CATEGORY'
]);

export type BulkRenameMode = 'put-rename' | 'new-keys';

/**
 * フィールドコードにプレフィックスを一括付与/除去した properties を返す（純粋関数）。
 * サブテーブル内の子フィールドも同じ規則で書き換える。
 * - renameMode === 'put-rename': 既存フィールドのコード変更用（プロパティキーは旧コードのまま、内部 code を新コードへ）
 * - renameMode === 'new-keys'（既定）: 新規フィールド追加用（プロパティキーも内部 code も新コードへ）
 */
export function planBulkRename(
  props: Record<string, any>,
  prefixText: string,
  removeMode: boolean,
  options?: { renameMode?: BulkRenameMode } | BulkRenameMode
) {
  const renameMode: BulkRenameMode = typeof options === 'string'
    ? options
    : (options?.renameMode || 'new-keys');
  const trimmed = String(prefixText || '').trim();
  const rename = (code: string): string => {
    if (removeMode) return code.startsWith(trimmed) ? code.slice(trimmed.length) : code;
    return code.startsWith(trimmed) ? code : trimmed + code;
  };
  let modifiedCount = 0;
  const newProps: Record<string, any> = {};
  const renamePairs: Array<{ from: string; to: string }> = [];
  const collisions: string[] = [];
  const retainedCodes = new Set<string>();
  for (const [code, field] of Object.entries(props || {}) as Array<[string, any]>) {
    if (!field || RENAME_EXCLUDED_TYPES.has(field.type)) continue;
    retainedCodes.add(code);
    if (field.type === 'SUBTABLE' && field.fields && typeof field.fields === 'object') {
      for (const [childCode, childDef] of Object.entries(field.fields) as Array<[string, any]>) {
        if (!childDef || RENAME_EXCLUDED_TYPES.has(childDef.type)) continue;
        retainedCodes.add(childCode);
      }
    }
  }
  const producedCodes = new Set<string>();

  for (const [code, field] of Object.entries(props || {}) as Array<[string, any]>) {
    if (!field || RENAME_EXCLUDED_TYPES.has(field.type)) continue;
    const newCode = rename(code);
    const cloned = deepClone(field);
    let touched = false;
    if (newCode !== code) {
      if (!newCode) { collisions.push(`${code} → (空)`); continue; }
      retainedCodes.delete(code);
      if (retainedCodes.has(newCode) || producedCodes.has(newCode)) {
        collisions.push(`${code} → ${newCode}`);
      }
      producedCodes.add(newCode);
      cloned.code = newCode;
      touched = true;
      renamePairs.push({ from: code, to: newCode });
    }
    if (cloned.type === 'SUBTABLE' && cloned.fields && typeof cloned.fields === 'object') {
      const children: Record<string, any> = {};
      for (const [childCode, childDef] of Object.entries(cloned.fields) as Array<[string, any]>) {
        if (!childDef || RENAME_EXCLUDED_TYPES.has(childDef.type)) continue;
        const newChild = rename(childCode);
        const childClone = deepClone(childDef);
        if (newChild !== childCode) {
          if (!newChild) {
            collisions.push(`${code}.${childCode} → (空)`);
            continue;
          }
          retainedCodes.delete(childCode);
          if (retainedCodes.has(newChild) || producedCodes.has(newChild) || newChild === newCode) {
            collisions.push(`${code}.${childCode} → ${newChild}`);
          }
          producedCodes.add(newChild);
          childClone.code = newChild;
          touched = true;
          renamePairs.push({ from: `${code}.${childCode}`, to: `${newCode}.${newChild}` });
        }
        const childPropKey = renameMode === 'put-rename' ? childCode : (newChild || childCode);
        children[childPropKey] = childClone;
      }
      cloned.fields = children;
    }
    if (!touched) continue;
    const propKey = renameMode === 'put-rename' ? code : newCode;
    if (newProps[propKey] && propKey !== code) collisions.push(`${code} → ${newCode}`);
    newProps[propKey] = cloned;
    modifiedCount++;
  }
  return { properties: newProps, modifiedCount, renamePairs, collisions, renameMode };
}

/**
 * 比較先プレビューのフィールドコードに対し、プレフィックスを一括付与/除去した
 * 新しい properties JSON を返す（書き換え結果はテキストエリアに反映する想定。
 * 反映自体は別途 runFieldApplyStandalone で実行）。
 */
export async function runBulkRenameFieldStandalone(opts, setStatus) {
  const { targetAppId, targetGuestId, prefix, removeMode, renameMode } = opts;
  const tgtApp = validateNumericId(targetAppId, '比較先アプリID', true);
  const tgtGuest = validateNumericId(targetGuestId, '比較先ゲストID', false);
  if (!prefix || !String(prefix).trim()) throw new Error('プレフィックス文字列を入力してください');
  const apiPrefix = buildApiPrefix(tgtGuest, true);
  setStatus('比較先フィールドを取得中...');
  const fieldsResp = await apiGet(apiPrefix, '/app/form/fields.json', { app: tgtApp });
  const result = planBulkRename(fieldsResp.properties || ({} as any), String(prefix), !!removeMode, { renameMode });
  if (result.collisions.length) {
    throw new Error(`リネーム後のフィールドコードが重複または空になります: ${result.collisions.join(', ')}`);
  }
  setStatus(`プレフィックス${removeMode ? '除去' : '付与'}完了: ${result.modifiedCount}件`);
  return { properties: result.properties, modifiedCount: result.modifiedCount, renamePairs: result.renamePairs, renameMode: result.renameMode };
}
