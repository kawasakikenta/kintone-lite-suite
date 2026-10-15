'use strict';

import { SYSTEM_FIELD_TYPES } from '../constants.js';
import { deepClone, kusConfirm } from '../utils.js';
import { apiGet, apiPost, apiPut, buildApiPrefix, decorateRevisionConflict, pickRevision } from '../api.js';

/** アプリID・ゲストIDは数値のみ。URL パスに組み込まれるため、空でも数値でもない値は呼び出し前に止める。 */
function assertNumericIds(appId: unknown, guestId: unknown, appLabel: string) {
  if (!/^\d+$/.test(String(appId ?? '').trim())) throw new Error(`${appLabel}アプリIDは数値で入力してください`);
  if (String(guestId ?? '').trim() && !/^\d+$/.test(String(guestId).trim())) throw new Error(`${appLabel}ゲストIDは数値で入力してください`);
}

const hasOwn = (obj: unknown, key: string) => Object.prototype.hasOwnProperty.call(obj ?? {}, key);

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
    const lookupRel = node.lookup?.relatedApp;
    if (lookupRel?.app != null) {
      const after = hasOwn(map, String(lookupRel.app)) ? map[String(lookupRel.app)] : undefined;
      if (after && String(after) !== String(lookupRel.app)) {
        node.lookup.relatedApp.app = String(after);
        delete node.lookup.relatedApp.code;
        changed = true;
      }
    }
    const refRel = node.referenceTable?.relatedApp;
    if (refRel?.app != null) {
      const after = hasOwn(map, String(refRel.app)) ? map[String(refRel.app)] : undefined;
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

function withPartialNotice(error: any, notice: string): any {
  const wrapped = new Error(`${notice}\n${error?.message != null ? String(error.message) : String(error)}`) as any;
  for (const key of ['revisionConflict', 'original', 'code', 'id', '__apiDiag', 'stack']) {
    if (error && error[key] !== undefined) wrapped[key] = error[key];
  }
  return wrapped;
}

/**
 * 反映前の入力検査。実行時に失敗する入力（数値でないID・type の無い定義・不正な変換 JSON など）を
 * 確認画面へ進む前に利用者へ示すための純粋関数。問題が無ければ空文字を返す。
 */
export function findFieldApplyProblem(input: { targetAppId: string; targetGuestId: string; fieldJson: string; lookupMapJson: string }): string {
  const appId = String(input.targetAppId ?? '').trim();
  if (!appId) return '比較先アプリIDを指定してください。';
  try {
    assertNumericIds(appId, input.targetGuestId, '比較先');
    parseFieldJsonInput(input.fieldJson);
    parseLookupMapInput(input.lookupMapJson);
  } catch (e: any) {
    return String(e?.message || e);
  }
  return '';
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

    if (hasOwn(currentMap, code) && currentMap[code]) {
      if (overwrite) {
        plan.updates[code] = def;
        plan.logs.push(`UPDATE ${code}${changed ? ' (参照先AppID変換)' : ''}`);
      } else {
        plan.skippedExisting.push(code);
        plan.logs.push(`SKIP ${code} (exists)`);
      }
    } else {
      plan.adds[code] = def;
      plan.logs.push(`ADD ${code}${changed ? ' (参照先AppID変換)' : ''}`);
    }
  }
  return plan;
}

function listCodes(map: Record<string, any>, limit = 10): string {
  const keys = Object.keys(map);
  const shown = keys.slice(0, limit).map((key) => (map[key]?.code && map[key].code !== key ? `${key} → ${map[key].code}` : key));
  return shown.join('、') + (keys.length > limit ? ` ほか${keys.length - limit}件` : '');
}

/**
 * 反映すると同じフィールドコードが複数できる組み合わせを、書き込み前に洗い出す。
 * 追加（POST）は更新（PUT）より先に実行されるので、追加するコードは「現在の」フィールドと、
 * 更新後のコード（コード変更を含む）は追加分を含めた最終状態と照合する。
 * API 側で拒否されても、追加だけが反映された状態で止まってしまうため。
 */
export function findFieldCodeConflicts(plan: FieldApplyPlan, currentProps: Record<string, any>): string[] {
  const current = currentProps || {};
  const conflicts: string[] = [];
  for (const [key, def] of Object.entries(plan.adds)) {
    const code = String(def?.code || key);
    if (hasOwn(current, code)) conflicts.push(`${key}${code !== key ? ` → ${code}` : ''}`);
  }
  const finalCount = new Map<string, number>();
  const count = (code: string) => finalCount.set(code, (finalCount.get(code) || 0) + 1);
  for (const key of Object.keys(current)) count(hasOwn(plan.updates, key) ? String(plan.updates[key]?.code || key) : key);
  for (const [key, def] of Object.entries(plan.adds)) count(String(def?.code || key));
  for (const [key, def] of Object.entries(plan.updates)) {
    const code = String(def?.code || key);
    if (code !== key && (finalCount.get(code) || 0) > 1) conflicts.push(`${key} → ${code}`);
  }
  return conflicts;
}

export function buildFieldApplyConfirmText(targetAppId: string, targetGuestId: string, plan: FieldApplyPlan): string {
  const addCount = Object.keys(plan.adds).length;
  const updateCount = Object.keys(plan.updates).length;
  const skipCount = plan.skippedSystem.length + plan.skippedExisting.length;
  return [
    `比較先 App ${targetAppId}${targetGuestId ? `（ゲスト ${targetGuestId}）` : ''} のプレビュー環境へフィールドを反映します。`,
    `追加 ${addCount}件 / 更新 ${updateCount}件 / スキップ ${skipCount}件${plan.lookupConverted.length ? ` / 参照先AppID変換 ${plan.lookupConverted.length}件` : ''}`,
    addCount ? `追加: ${listCodes(plan.adds)}` : '',
    updateCount ? `更新: ${listCodes(plan.updates)}` : '',
    '削除 0件（このツールはフィールドを削除しません）',
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
  assertNumericIds(targetAppId, targetGuestId, '比較先');
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
  const conflicts = findFieldCodeConflicts(plan, current.properties || ({} as any));
  if (conflicts.length) {
    throw new Error(`反映後のフィールドコードが既存のフィールドと重複するため、何も反映せずに中止しました: ${conflicts.join('、')}`);
  }
  let revision = pickRevision(current);
  if (!/^\d+$/.test(revision)) {
    throw new Error('比較先フィールド設定の revision を確認できないため反映を中止しました。最新の設定を取得し直してください');
  }
  if (!opts.skipConfirm && !kusConfirm(buildFieldApplyConfirmText(String(targetAppId), String(targetGuestId || ''), plan))) {
    setStatus('フィールド反映をキャンセルしました');
    logs.push('キャンセル');
    return logs;
  }

  const withRevision = (body: Record<string, unknown>) => (revision ? { ...body, revision } : body);
  if (addCount) {
    setStatus(`フィールド追加中... (${addCount}件)`);
    try {
      const res = await apiPost(prefix, '/app/form/fields.json', withRevision({ app: targetAppId, properties: plan.adds }));
      const nextRevision = pickRevision(res);
      if (!/^\d+$/.test(nextRevision)) {
        throw new Error('フィールド追加は完了しましたが、更新後の revision を確認できないため以降の反映を中止しました。差分を取得し直して状態を確認してください');
      }
      revision = nextRevision;
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
      const nextRevision = pickRevision(res);
      if (!/^\d+$/.test(nextRevision)) {
        throw new Error('フィールド更新は完了しましたが、更新後の revision を確認できません。差分を取得し直して状態を確認してください');
      }
      revision = nextRevision;
      logs.push(`OK フィールド更新 ${updateCount}件${revision ? ` (revision ${revision})` : ''}`);
    } catch (e) {
      logs.push(`NG フィールド更新 ${updateCount}件${addCount ? '（追加 ' + addCount + '件は反映済み）' : ''}`);
      const failure = decorateRevisionConflict(e, 'フィールド更新');
      // 例外ではログが渡らないため、追加が反映済みであることをエラー文面に含める（部分成功を隠さない）
      throw addCount ? withPartialNotice(failure, `フィールド追加 ${addCount}件は反映済みですが、フィールド更新 ${updateCount}件は反映されませんでした。`) : failure;
    }
  }

  setStatus(`フィールド反映完了: 追加 ${addCount} / 更新 ${updateCount} / スキップ ${plan.skippedSystem.length + plan.skippedExisting.length}`);
  return logs;
}

export async function runLoadFieldsStandalone(opts, setStatus) {
  const { appId, guestId, preview } = opts;
  if (!appId) throw new Error('アプリIDを入力してください');
  assertNumericIds(appId, guestId, '');
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
 * 返す JSON は反映時に「既存フィールドのコード変更」(PUT) として扱われるよう、キーは変更前のコード、
 * `code` に変更後のコードを入れる。サブテーブル内の子フィールドも同じ規則で書き換える。
 * フィールドコードはアプリ内で一意なので、変更後のコードがサブテーブルの子や対象外フィールドを
 * 含めて重複する場合は collisions に載せる。
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
  const entries = Object.entries(props || {}) as Array<[string, any]>;
  // 変更後のコード（子フィールド・対象外フィールドを含む）の出現数。空になる変更は変更前のコードのまま数える。
  const finalCodes = new Map<string, number>();
  const countCode = (code: string) => finalCodes.set(code, (finalCodes.get(code) || 0) + 1);
  for (const [code, field] of entries) {
    if (!field) continue;
    countCode(RENAME_EXCLUDED_TYPES.has(field.type) ? code : rename(code) || code);
    if (!RENAME_EXCLUDED_TYPES.has(field.type) && field.type === 'SUBTABLE' && field.fields && typeof field.fields === 'object') {
      for (const childCode of Object.keys(field.fields)) countCode(rename(childCode) || childCode);
    }
  }
  const checkDuplicate = (from: string, to: string, toCode: string) => {
    if ((finalCodes.get(toCode) || 0) > 1) collisions.push(`${from} → ${to}`);
  };
  for (const [code, field] of entries) {
    if (!field || RENAME_EXCLUDED_TYPES.has(field.type)) continue;
    const newCode = rename(code);
    const cloned = deepClone(field);
    let touched = false;
    if (newCode !== code) {
      if (!newCode) { collisions.push(`${code} → (空)`); continue; }
      checkDuplicate(code, newCode, newCode);
      cloned.code = newCode;
      touched = true;
      renamePairs.push({ from: code, to: newCode });
    }
    if (cloned.type === 'SUBTABLE' && cloned.fields && typeof cloned.fields === 'object') {
      const children: Record<string, any> = {};
      for (const [childCode, childDef] of Object.entries(cloned.fields) as Array<[string, any]>) {
        const newChild = rename(childCode);
        const childClone = deepClone(childDef);
        if (newChild !== childCode) {
          if (!newChild) {
            collisions.push(`${code}.${childCode} → (空)`);
          } else {
            checkDuplicate(`${code}.${childCode}`, `${newCode}.${newChild}`, newChild);
            childClone.code = newChild;
            touched = true;
            renamePairs.push({ from: `${code}.${childCode}`, to: `${newCode}.${newChild}` });
          }
        }
        children[childCode] = childClone;
      }
      cloned.fields = children;
    }
    if (!touched) continue;
    newProps[code] = cloned;
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
  assertNumericIds(targetAppId, targetGuestId, '比較先');
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
