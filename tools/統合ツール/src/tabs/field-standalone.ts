'use strict';

import { SYSTEM_FIELD_TYPES } from '../constants.js';
import { deepClone, kusConfirm, summarizeList } from '../utils.js';
import { apiGet, apiPost, apiPut, buildApiPrefix, decorateRevisionConflict, isRevisionConflictError, pickRevision } from '../api.js';
import { isCancelRequested, isRunCancelledError } from '../runControl.js';
import { createCancelReport, isCancelReportError, isCancelStop } from './run-cancel-summary.js';

/** アプリID・ゲストIDは数値のみ。URL パスに組み込まれるため、空でも数値でもない値は呼び出し前に止める。 */
function assertNumericIds(appId: unknown, guestId: unknown, appLabel: string) {
  if (!/^\d+$/.test(String(appId ?? '').trim())) throw new Error(`${appLabel}アプリIDは半角数字で入力してください`);
  if (String(guestId ?? '').trim() && !/^\d+$/.test(String(guestId).trim())) throw new Error(`${appLabel}ゲストスペースIDは半角数字で入力してください`);
}

const hasOwn = (obj: unknown, key: string) => Object.prototype.hasOwnProperty.call(obj ?? {}, key);

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

function validateNumericId(value: unknown, label: string, required = false): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    if (required) throw new Error(`${label}を入力してください`);
    return '';
  }
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${label}は半角数字で入力してください: ${trimmed}`);
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
  if (!appId) return '反映先アプリIDを指定してください。';
  try {
    assertNumericIds(appId, input.targetGuestId, '反映先');
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
  const existingSubtableOwnerByChildCode = new Map<string, string>();
  for (const [tblCode, tblDef] of Object.entries(currentMap) as Array<[string, any]>) {
    if (tblDef?.type === 'SUBTABLE' && tblDef.fields && typeof tblDef.fields === 'object') {
      for (const [childKey, childDef] of Object.entries(tblDef.fields) as Array<[string, any]>) {
        existingSubtableOwnerByChildCode.set(childKey, tblCode);
        if (childDef?.code) existingSubtableOwnerByChildCode.set(String(childDef.code), tblCode);
      }
    }
  }

  // トップレベル同士のコード重複（コード変更の連鎖・入れ替えを含む）は findFieldCodeConflicts が
  // 最終状態で判定する。ここではサブテーブルの子フィールドが絡む階層をまたいだ重複だけを止める。
  const seenTopLevelCodes = new Map<string, string>();
  const seenChildOwnerByCode = new Map<string, string>();
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
    for (const tCode of new Set([code, targetCode])) {
      const childOwner = seenChildOwnerByCode.get(tCode);
      if (childOwner) {
        throw new Error(`フィールドコード「${tCode}」が入力JSON内の「${childOwner}」と重複しています`);
      }
      const subOwner = existingSubtableOwnerByChildCode.get(tCode);
      if (subOwner) {
        throw new Error(`フィールドコード「${tCode}」は既存のサブテーブル「${subOwner}」内の子フィールドと重複しています`);
      }
    }
    seenTopLevelCodes.set(code, code);
    seenTopLevelCodes.set(targetCode, code);

    if (def.type === 'SUBTABLE' && def.fields && typeof def.fields === 'object') {
      for (const [childKey, childDef] of Object.entries(def.fields) as Array<[string, any]>) {
        if (!childDef || typeof childDef !== 'object') continue;
        if (!childDef.code) childDef.code = childKey;
        const childTarget = String(childDef.code || childKey).trim();
        for (const cCode of new Set([childKey, childTarget])) {
          const prevOwner = seenChildOwnerByCode.get(cCode) || seenTopLevelCodes.get(cCode);
          if (prevOwner) {
            throw new Error(`サブテーブル「${code}」の子フィールドコード「${cCode}」が入力JSON内の「${prevOwner}」と重複しています`);
          }
          if (hasOwn(currentMap, cCode) && currentMap[cCode] && cCode !== code && cCode !== targetCode) {
            throw new Error(`サブテーブル「${code}」の子フィールドコード「${cCode}」が既存のトップレベルフィールドと重複しています`);
          }
          const otherSub = existingSubtableOwnerByChildCode.get(cCode);
          if (otherSub && otherSub !== code && otherSub !== targetCode) {
            throw new Error(`サブテーブル「${code}」の子フィールドコード「${cCode}」が別サブテーブル「${otherSub}」内の子フィールドと重複しています`);
          }
        }
        seenChildOwnerByCode.set(childKey, `${code}.${childKey}`);
        seenChildOwnerByCode.set(childTarget, `${code}.${childTarget}`);
      }
    }

    if (hasOwn(currentMap, code) && currentMap[code]) {
      if (overwrite) {
        const curType = String(currentMap[code]?.type || '').trim();
        const nextType = String(def.type || '').trim();
        if (curType && nextType && curType !== nextType) {
          throw new Error(`フィールド「${code}」の type が一致しません（既存: ${curType} / 入力: ${nextType}）。既存フィールドの型変更はできません`);
        }
        if (def.type === 'SUBTABLE' && def.fields && currentMap[code]?.fields) {
          for (const [childKey, childDef] of Object.entries(def.fields) as Array<[string, any]>) {
            const existingChild = hasOwn(currentMap[code].fields, childKey) ? currentMap[code].fields[childKey] : undefined;
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
  const finalCount = new Map<string, number>();
  const count = (code: string) => finalCount.set(code, (finalCount.get(code) || 0) + 1);
  for (const key of Object.keys(current)) count(hasOwn(plan.updates, key) ? String(plan.updates[key]?.code || key) : key);
  for (const [key, def] of Object.entries(plan.adds)) count(String(def?.code || key));
  for (const [key, def] of Object.entries(plan.adds)) {
    const code = String(def?.code || key);
    // 現在のフィールドと重なる追加、または入力内の別の追加・コード変更と同じコードになる追加
    if (hasOwn(current, code) || (finalCount.get(code) || 0) > 1) conflicts.push(`${key}${code !== key ? ` → ${code}` : ''}`);
  }
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
    `反映先 App ${targetAppId}${targetGuestId ? `（ゲストスペース ${targetGuestId}）` : ''} のプレビューへフィールドを反映します。`,
    `追加 ${addCount}件 / 更新 ${updateCount}件 / スキップ ${skipCount}件${plan.lookupConverted.length ? ` / 参照先AppID変換 ${plan.lookupConverted.length}件` : ''}`,
    addCount ? `追加: ${listCodes(plan.adds)}` : '',
    updateCount ? `更新: ${listCodes(plan.updates)}` : '',
    '削除 0件（このツールはフィールドを削除しません）',
    updateCount ? '更新対象は、反映先の既存の定義を反映元の内容で置き換えます。' : '',
    '本番は変わりません（公開は kintone の設定画面で行います）。実行しますか？'
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

interface FieldTargetInspection {
  prefix: string;
  current: any;
  plan: FieldApplyPlan;
  addCount: number;
  updateCount: number;
  skipCount: number;
  /** 反映後にフィールドコードが重複する組み合わせ（空なら問題なし） */
  conflicts: string[];
  /** GET で得た revision（無ければ空文字） */
  revision: string;
}

/** 反映先プレビューのフィールド設定と revision を取得し、反映計画を作る（書き込みはしない）。 */
async function inspectFieldTarget(
  tgtApp: string,
  tgtGuest: string,
  incoming: Record<string, any>,
  lookupMap: Record<string, string>,
  overwrite: boolean
): Promise<FieldTargetInspection> {
  const prefix = buildApiPrefix(tgtGuest, true);
  const current = await apiGet(prefix, '/app/form/fields.json', { app: tgtApp });
  const plan = planFieldApply(incoming, current.properties || ({} as any), lookupMap, overwrite);
  return {
    prefix,
    current,
    plan,
    addCount: Object.keys(plan.adds).length,
    updateCount: Object.keys(plan.updates).length,
    skipCount: plan.skippedSystem.length + plan.skippedExisting.length,
    conflicts: findFieldCodeConflicts(plan, current.properties || ({} as any)),
    revision: pickRevision(current)
  };
}

const FIELD_CODE_CONFLICT_MESSAGE = (conflicts: string[]) =>
  `反映後のフィールドコードが既存のフィールドと重複するため、何も反映せずに中止しました: ${conflicts.join('、')}`;
const FIELD_REVISION_MISSING_MESSAGE = '反映先のフィールド設定の revision を確認できないため反映を中止しました。最新の設定を取得し直してください';

/**
 * 計画の追加（POST）→更新（PUT）を、事前に取得した revision を添えて順に送る。
 * 競合・中止・失敗は logs に記録したうえで例外にして呼び出し元へ返す（部分成功を隠さない）。
 */
async function writeFieldPlan(
  ctx: { prefix: string; tgtApp: string; plan: FieldApplyPlan; revision: string; logs: string[] },
  setStatus: (message: string, isError?: boolean) => void
): Promise<void> {
  const { prefix, tgtApp, plan, logs } = ctx;
  let revision = ctx.revision;
  const addCount = Object.keys(plan.adds).length;
  const updateCount = Object.keys(plan.updates).length;
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
      if (isRunCancelledError(e)) {
        // 追加のリクエストは送る前に止まっている。更新も未実行であることを件数つきで伝える。
        logs.push(`未実行（中止） フィールド追加 ${addCount}件${updateCount ? ` / フィールド更新 ${updateCount}件` : ''}`);
        throw createCancelReport(0, addCount + updateCount, logs);
      }
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
      if (isRunCancelledError(e)) {
        logs.push(`未実行（中止） フィールド更新 ${updateCount}件${addCount ? '（追加 ' + addCount + '件は反映済み）' : ''}`);
        throw createCancelReport(addCount, addCount + updateCount, logs);
      }
      if (!logs.some((l) => l.startsWith('OK フィールド更新'))) {
        logs.push(`NG フィールド更新 ${updateCount}件${addCount ? '（追加 ' + addCount + '件は反映済み）' : ''}`);
      }
      let failure = decorateRevisionConflict(e, 'フィールド更新');
      // 例外ではログが渡らないため、追加が反映済みであることをエラー文面の先頭に含める（部分成功を隠さない）
      if (addCount) failure = withPartialNotice(failure, `フィールド追加 ${addCount}件は反映済みですが、フィールド更新 ${updateCount}件は反映されませんでした。`);
      // 完了済みの処理があるときだけログを添える（何も反映されていなければ元のエラーのまま）
      throw logs.some((l) => l.startsWith('OK ')) ? attachLogsToError(failure, logs) : failure;
    }
  }
}

/**
 * フィールド定義 JSON を反映先プレビューへ追加・更新する。
 * - GET で得た revision を POST/PUT に添え、競合時は上書きせず利用者へ通知する
 * - 反映前に対象アプリと件数を最終確認する（opts.skipConfirm で省略可）
 */
export async function runFieldApplyStandalone(opts, setStatus) {
  const { targetAppId, targetGuestId, fieldJson, lookupMapJson, overwrite } = opts;
  const tgtApp = validateNumericId(targetAppId, '反映先アプリID', true);
  const tgtGuest = validateNumericId(targetGuestId, '反映先ゲストスペースID', false);
  const incoming = parseFieldJsonInput(fieldJson);
  const lookupMap = parseLookupMapInput(lookupMapJson);

  setStatus('反映先のフィールド設定を取得中...');
  const { prefix, plan, addCount, updateCount, skipCount, conflicts, revision } = await inspectFieldTarget(tgtApp, tgtGuest, incoming, lookupMap, !!overwrite);
  const logs = [...plan.logs];

  if (!addCount && !updateCount) {
    setStatus(`追加・更新対象がありません（スキップ ${skipCount}件）`, true);
    logs.push('反映対象なし');
    return logs;
  }
  if (conflicts.length) throw new Error(FIELD_CODE_CONFLICT_MESSAGE(conflicts));
  if (!/^\d+$/.test(revision)) throw new Error(FIELD_REVISION_MISSING_MESSAGE);
  if (!opts.skipConfirm && !kusConfirm(buildFieldApplyConfirmText(tgtApp, tgtGuest, plan))) {
    setStatus('フィールド反映をキャンセルしました');
    logs.push('キャンセル');
    return logs;
  }

  await writeFieldPlan({ prefix, tgtApp, plan, revision, logs }, setStatus);

  setStatus(`フィールド反映完了: 追加 ${addCount} / 更新 ${updateCount} / スキップ ${skipCount}`);
  return logs;
}

// ---------------------------------------------------------------------------
// 複数の反映先（環境内の全アプリを含む）へまとめて反映
// ---------------------------------------------------------------------------

/** まとめて反映する反映先 1 件（アプリごとにゲストスペースを変えられる）。 */
export interface FieldMultiTarget {
  appId: string;
  guestId?: string;
  appName?: string;
}

export type FieldMultiStatus = 'success' | 'unchanged' | 'failed' | 'conflict' | 'not-run';

export const FIELD_MULTI_STATUS_LABEL: Record<FieldMultiStatus, string> = {
  success: '成功',
  unchanged: 'スキップ（変更なし）',
  failed: '失敗',
  conflict: '競合',
  'not-run': '未実行（中止）'
};

export interface FieldMultiTargetResult {
  appId: string;
  guestId: string;
  appName: string;
  status: FieldMultiStatus;
  /** 事前確認の計画件数（失敗した事前確認では 0） */
  add: number;
  update: number;
  skip: number;
  /** 事前確認で止まったか、反映中に止まったか */
  phase: 'precheck' | 'apply';
  /** 利用者向けの説明（失敗理由・競合・中止時に反映済みだった内容など） */
  message: string;
}

export interface FieldMultiApplyReport {
  results: FieldMultiTargetResult[];
  counts: Record<FieldMultiStatus, number>;
  totals: { add: number; update: number; skip: number };
  /** 最終確認で「いいえ」を選んだ（何も書き込んでいない） */
  declined: boolean;
  /** 反映中に中止された */
  cancelled: boolean;
  /** ステータス欄に出す 1 行 */
  headline: string;
  tone: 'ok' | 'warn' | 'err' | 'info';
  /** 結果欄に出す、対象ごとの行 */
  lines: string[];
}

interface NormalizedFieldMultiTarget { appId: string; guestId: string; appName: string }

function fieldMultiLabel(t: { appId: string; guestId: string; appName: string }): string {
  return `App ${t.appId}${t.appName ? `「${t.appName}」` : ''}${t.guestId ? `（ゲストスペース ${t.guestId}）` : ''}`;
}

/** 数値でない ID は例外で止める。同じアプリ・ゲストスペースの重複は 1 件にまとめる。 */
function normalizeFieldMultiTargets(targets: unknown): NormalizedFieldMultiTarget[] {
  const list = Array.isArray(targets) ? targets : [];
  const seen = new Set<string>();
  const out: NormalizedFieldMultiTarget[] = [];
  list.forEach((raw: any, index) => {
    const appId = String(raw?.appId ?? '').trim();
    const guestId = String(raw?.guestId ?? '').trim();
    if (!appId && !guestId) return;
    const label = `まとめて反映する反映先の${index + 1}件目の`;
    const app = validateNumericId(appId, `${label}アプリID`, true);
    const guest = validateNumericId(guestId, `${label}ゲストスペースID`, false);
    const key = `${app}::${guest}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ appId: app, guestId: guest, appName: String(raw?.appName ?? '').trim() });
  });
  if (!out.length) throw new Error('まとめて反映する反映先を 1 件以上指定してください');
  return out;
}

/**
 * まとめて反映する前の入力検査。実行時に失敗する入力を確認画面へ進む前に利用者へ示す純粋関数。
 * 問題が無ければ空文字を返す。
 */
export function findFieldMultiApplyProblem(input: { targets: FieldMultiTarget[]; fieldJson: string; lookupMapJson: string }): string {
  try {
    normalizeFieldMultiTargets(input.targets);
    parseFieldJsonInput(input.fieldJson);
    parseLookupMapInput(input.lookupMapJson);
  } catch (e: any) {
    return String(e?.message || e);
  }
  return '';
}

function singleLineMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String((error as any)?.message ?? error ?? 'エラーが発生しました');
  // 内部ログの「NG …」行は説明の重複になるので除き、反映済みの内訳（OK …）は残す
  return message.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('NG ')).join(' / ');
}

function countByStatus(results: FieldMultiTargetResult[]): Record<FieldMultiStatus, number> {
  const counts: Record<FieldMultiStatus, number> = { success: 0, unchanged: 0, failed: 0, conflict: 0, 'not-run': 0 };
  for (const r of results) counts[r.status] += 1;
  return counts;
}

function describePlanCounts(r: { add: number; update: number; skip: number }): string {
  return `追加 ${r.add} / 更新 ${r.update} / スキップ ${r.skip}`;
}

/** 事前確認の結果から、最終確認ダイアログに出す文面を作る。事前確認に失敗したアプリを先頭に示す。 */
export function buildFieldMultiConfirmText(prechecks: FieldMultiTargetResult[]): string {
  const ready = prechecks.filter((r) => r.status === 'success');
  const failed = prechecks.filter((r) => r.status === 'failed' || r.status === 'conflict');
  const unchanged = prechecks.filter((r) => r.status === 'unchanged');
  const sum = (key: 'add' | 'update' | 'skip') => ready.reduce((n, r) => n + r[key], 0);
  const lines = [
    ...failed.map((r) => `× ${fieldMultiLabel(r)}: 事前確認に失敗（${r.message}）`),
    ...ready.map((r) => `○ ${fieldMultiLabel(r)}: ${describePlanCounts(r)}`),
    ...unchanged.map((r) => `－ ${fieldMultiLabel(r)}: 変更なし（スキップ ${r.skip}）`)
  ];
  return [
    `${prechecks.length} 件の反映先のプレビューへフィールドを反映します。`,
    `反映する ${ready.length}件 / 変更なし ${unchanged.length}件 / 事前確認に失敗 ${failed.length}件（失敗したアプリには反映しません）`,
    `合計: 追加 ${sum('add')}件 / 更新 ${sum('update')}件 / スキップ ${sum('skip')}件`,
    '削除 0件（このツールはフィールドを削除しません）',
    '',
    summarizeList(lines),
    '',
    '中止すると、まだ反映していないアプリは「未実行」になります（反映済みの分は取り消しません）。',
    '本番は変わりません（公開は kintone の設定画面で行います）。実行しますか？'
  ].join('\n');
}

function finishFieldMultiReport(results: FieldMultiTargetResult[], flags: { declined: boolean; cancelled: boolean }): FieldMultiApplyReport {
  const counts = countByStatus(results);
  const totals = results.filter((r) => r.status === 'success').reduce(
    (acc, r) => ({ add: acc.add + r.add, update: acc.update + r.update, skip: acc.skip + r.skip }),
    { add: 0, update: 0, skip: 0 }
  );
  const lines = results.map((r) => {
    const detail = r.status === 'success' ? describePlanCounts(r) : r.status === 'unchanged' ? `スキップ ${r.skip}` : '';
    return `[${FIELD_MULTI_STATUS_LABEL[r.status]}] ${fieldMultiLabel(r)}${detail ? `: ${detail}` : ''}${r.message ? `${detail ? ' / ' : ': '}${r.message}` : ''}`;
  });
  const problems = results.filter((r) => r.status === 'failed' || r.status === 'conflict');
  const parts: string[] = [];
  if (counts.unchanged) parts.push(`変更なし ${counts.unchanged} 件`);
  if (counts.conflict) parts.push(`競合 ${counts.conflict} 件`);
  if (counts.failed) parts.push(`失敗 ${counts.failed} 件`);
  if (counts['not-run']) parts.push(`未実行（中止） ${counts['not-run']} 件`);
  const firstProblem = problems[0] ? `（${fieldMultiLabel(problems[0])}: ${problems[0].message}${problems.length > 1 ? ` ほか${problems.length - 1}件` : ''}）` : '';
  const total = results.length;
  let headline: string;
  let tone: FieldMultiApplyReport['tone'];
  if (flags.declined) {
    headline = `フィールド反映をキャンセルしました（何も書き込んでいません。${total} 件の反映先のうち ${counts.failed + counts.conflict} 件は事前確認に失敗）`;
    tone = 'info';
  } else if (flags.cancelled) {
    const done = counts.success + counts.unchanged + counts.failed + counts.conflict;
    headline = `中止しました（${done}/${total} 件を処理、残り ${counts['not-run']} 件は未実行）。成功 ${counts.success} 件${parts.filter((p) => !p.startsWith('未実行')).length ? `、${parts.filter((p) => !p.startsWith('未実行')).join('、')}` : ''}。反映済みの分は取り消していません${firstProblem}`;
    tone = 'warn';
  } else if (!counts.success && !problems.length && !counts['not-run']) {
    headline = `反映する変更がありませんでした（${total} 件すべて変更なし）`;
    tone = 'info';
  } else if (!counts.success && problems.length) {
    headline = `${total} 件のうち反映できたアプリはありません。${parts.join('、')}${firstProblem}`;
    tone = 'err';
  } else {
    headline = `${total} 件中 ${counts.success} 件を反映しました（追加 ${totals.add} / 更新 ${totals.update}）${parts.length ? `。${parts.join('、')}` : ''}${firstProblem}`;
    tone = problems.length || counts['not-run'] ? 'warn' : 'ok';
  }
  return { results, counts, totals, declined: flags.declined, cancelled: flags.cancelled, headline, tone, lines };
}

/**
 * 同じフィールド定義 JSON を、複数の反映先プレビューへ順に反映する。
 * 1. 全対象の現在の設定と revision を取得して反映計画を作る（失敗した対象は失敗として残す）
 * 2. 最終確認は 1 回だけ（対象数・合計・事前確認の失敗・アプリごとの内訳）
 * 3. 事前確認の revision を添えて 1 件ずつ反映する。競合・失敗した対象があっても次へ進む
 * 4. 中止すると以降の対象は「未実行（中止）」にして止める。本番へは公開しない
 */
export async function runFieldApplyMultiStandalone(
  opts: {
    targets: FieldMultiTarget[];
    fieldJson: string;
    lookupMapJson: string;
    overwrite?: boolean;
    skipConfirm?: boolean;
  },
  setStatus: (message: string, isError?: boolean) => void
): Promise<FieldMultiApplyReport> {
  const targets = normalizeFieldMultiTargets(opts.targets);
  const incoming = parseFieldJsonInput(opts.fieldJson);
  const lookupMap = parseLookupMapInput(opts.lookupMapJson);
  const overwrite = !!opts.overwrite;
  const total = targets.length;

  type Ready = { target: NormalizedFieldMultiTarget; inspection: FieldTargetInspection; entry: FieldMultiTargetResult };
  const results: FieldMultiTargetResult[] = [];
  const ready: Ready[] = [];
  const baseResult = (t: NormalizedFieldMultiTarget) => ({ appId: t.appId, guestId: t.guestId, appName: t.appName });

  // ---- 1. 事前確認（書き込みなし）。中止はここで止める（まだ何も書いていない） ----
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    setStatus(`反映先の現在の設定を確認中... (${i + 1}/${total}) ${fieldMultiLabel(target)}`);
    try {
      const inspection = await inspectFieldTarget(target.appId, target.guestId, incoming, lookupMap, overwrite);
      const counts = { add: inspection.addCount, update: inspection.updateCount, skip: inspection.skipCount };
      if (!inspection.addCount && !inspection.updateCount) {
        results.push({ ...baseResult(target), ...counts, status: 'unchanged', phase: 'precheck', message: '' });
      } else if (inspection.conflicts.length) {
        results.push({ ...baseResult(target), add: 0, update: 0, skip: inspection.skipCount, status: 'failed', phase: 'precheck', message: FIELD_CODE_CONFLICT_MESSAGE(inspection.conflicts) });
      } else if (!/^\d+$/.test(inspection.revision)) {
        results.push({ ...baseResult(target), add: 0, update: 0, skip: inspection.skipCount, status: 'failed', phase: 'precheck', message: FIELD_REVISION_MISSING_MESSAGE });
      } else {
        const entry: FieldMultiTargetResult = { ...baseResult(target), ...counts, status: 'success', phase: 'precheck', message: '' };
        results.push(entry);
        // 書き込みに使うのは計画と revision だけ。全アプリを対象にしても各アプリのフィールド設定全体を持ち続けない。
        ready.push({ target, inspection: { ...inspection, current: null }, entry });
      }
    } catch (e) {
      if (isRunCancelledError(e)) throw e;
      results.push({ ...baseResult(target), add: 0, update: 0, skip: 0, status: 'failed', phase: 'precheck', message: singleLineMessage(e) });
    }
  }

  const prechecks = results.map((r) => ({ ...r }));
  if (!ready.length) {
    const report = finishFieldMultiReport(results, { declined: false, cancelled: false });
    setStatus(report.headline, report.tone === 'err');
    return report;
  }

  // ---- 2. 最終確認（1 回だけ）。「いいえ」なら何も書き込まない ----
  if (!opts.skipConfirm && !kusConfirm(buildFieldMultiConfirmText(prechecks))) {
    const declined = results.map((r) => (r.status === 'success'
      ? { ...r, status: 'not-run' as const, message: '最終確認でキャンセルしたため反映していません' }
      : r));
    const report = finishFieldMultiReport(declined, { declined: true, cancelled: false });
    setStatus(report.headline);
    return report;
  }

  // ---- 3. 1 件ずつ反映（プレビューのみ）。事前確認の revision を添えて競合を検出する ----
  let cancelled = false;
  let doneCount = 0;
  const markNotRun = (entry: FieldMultiTargetResult, message: string) => {
    entry.status = 'not-run';
    entry.message = message;
  };
  for (const { target, inspection, entry } of ready) {
    if (cancelled || isCancelRequested()) {
      cancelled = true;
      markNotRun(entry, '中止したため反映していません');
      continue;
    }
    setStatus(`フィールドを反映中... (${doneCount + 1}/${ready.length}) ${fieldMultiLabel(target)}`);
    const logs: string[] = [];
    try {
      await writeFieldPlan({ prefix: inspection.prefix, tgtApp: target.appId, plan: inspection.plan, revision: inspection.revision, logs }, () => undefined);
      entry.status = 'success';
    } catch (e: any) {
      if (isCancelStop(e)) {
        cancelled = true;
        const applied = isCancelReportError(e) ? e.done : 0;
        markNotRun(entry, applied
          ? `追加 ${applied}件は反映済みですが、残りは中止したため反映していません`
          : '中止したため反映していません');
      } else if (e?.revisionConflict || isRevisionConflictError(e)) {
        entry.status = 'conflict';
        entry.message = `取得後に別の更新が入ったため上書きせず中止しました（revision 競合）${logs.some((l) => l.startsWith('OK ')) ? `。${logs.filter((l) => l.startsWith('OK ')).join('、')}` : ''}`;
      } else {
        entry.status = 'failed';
        entry.phase = 'apply';
        entry.message = singleLineMessage(e);
      }
      entry.phase = 'apply';
    }
    doneCount++;
  }

  const report = finishFieldMultiReport(results, { declined: false, cancelled });
  setStatus(report.headline, report.tone === 'err');
  return report;
}

export async function runLoadFieldsStandalone(opts, setStatus) {
  const { appId, guestId, preview } = opts;
  const id = validateNumericId(appId, 'アプリID', true);
  const guest = validateNumericId(guestId, 'ゲストスペースID', false);
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
 * - renameMode === 'put-rename'（既定）: 既存フィールドのコード変更用。反映時に「既存フィールドのコード変更」(PUT)
 *   として扱われるよう、キーは変更前のコード、`code` に変更後のコードを入れる。
 * - renameMode === 'new-keys': 新規フィールド追加用（プロパティキーも内部 code も新コードへ）
 * フィールドコードはアプリ内で一意なので、変更後のコードがサブテーブルの子や対象外フィールドを
 * 含めて重複する場合は collisions に載せる。
 */
export function planBulkRename(
  props: Record<string, any>,
  prefixText: string,
  removeMode: boolean,
  options?: { renameMode?: BulkRenameMode } | BulkRenameMode
) {
  const renameMode: BulkRenameMode = typeof options === 'string'
    ? options
    : (options?.renameMode || 'put-rename');
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
      for (const [childCode, childDef] of Object.entries(field.fields) as Array<[string, any]>) {
        if (!childDef) continue;
        countCode(RENAME_EXCLUDED_TYPES.has(childDef.type) ? childCode : rename(childCode) || childCode);
      }
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
        if (!childDef || RENAME_EXCLUDED_TYPES.has(childDef.type)) continue;
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
        const childPropKey = renameMode === 'put-rename' ? childCode : (newChild || childCode);
        children[childPropKey] = childClone;
      }
      cloned.fields = children;
    }
    if (!touched) continue;
    newProps[renameMode === 'put-rename' ? code : newCode] = cloned;
    modifiedCount++;
  }
  return { properties: newProps, modifiedCount, renamePairs, collisions, renameMode };
}

/**
 * 反映先プレビューのフィールドコードに対し、プレフィックスを一括付与/除去した
 * 新しい properties JSON を返す（書き換え結果はテキストエリアに反映する想定。
 * 反映自体は別途 runFieldApplyStandalone で実行）。
 */
export async function runBulkRenameFieldStandalone(opts, setStatus) {
  const { targetAppId, targetGuestId, prefix, removeMode, renameMode } = opts;
  const tgtApp = validateNumericId(targetAppId, '反映先アプリID', true);
  const tgtGuest = validateNumericId(targetGuestId, '反映先ゲストスペースID', false);
  if (!prefix || !String(prefix).trim()) throw new Error('プレフィックス文字列を入力してください');
  const apiPrefix = buildApiPrefix(tgtGuest, true);
  setStatus('反映先のフィールド設定を取得中...');
  const fieldsResp = await apiGet(apiPrefix, '/app/form/fields.json', { app: tgtApp });
  const result = planBulkRename(fieldsResp.properties || ({} as any), String(prefix), !!removeMode, { renameMode });
  if (result.collisions.length) {
    throw new Error(`リネーム後のフィールドコードが重複または空になります: ${result.collisions.join(', ')}`);
  }
  setStatus(`プレフィックス${removeMode ? '除去' : '付与'}完了: ${result.modifiedCount}件`);
  return { properties: result.properties, modifiedCount: result.modifiedCount, renamePairs: result.renamePairs, renameMode: result.renameMode };
}
