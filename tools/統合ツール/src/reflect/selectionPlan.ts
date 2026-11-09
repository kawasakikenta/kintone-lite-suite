'use strict';

/**
 * 送る設定（after'）から、書き込みの計画（operations・changes・items・requiredFields ほか）を作り直す。
 * 既定の計画（buildReflectSectionPlan。values・fileUploads・warnings・behavior を持つ）を土台に、
 * 差分の表示と書き込み内容の導きかたは standalonePlan.ts と同じ規則にそろえる。DOM 非依存の純粋関数。
 */

import { SECTION_DEFS, SYSTEM_FIELD_TYPES } from '../constants.js';
import { extractExpressionFieldCodes } from '../kintone-query.js';
import { APP_SETTINGS_LABELS } from './sections.js';
import { comparableCustomizePayload, type CustomizeFileResolution } from './customizeFiles.js';
import { reclassifyLayoutRemovals, retainedItemNames, summarizeReflectItems } from './changeSummary.js';
import {
  diffValues, formatBytes, reflectRequiredFields,
  type ReflectChange, type ReflectFileUpload, type ReflectOperation, type ReflectSectionPlan
} from './standalonePlan.js';
import { isPlainObject, own, sameValue } from './selectionPointer.js';
import { fieldDisplayName } from './selectionLabels.js';

const NAMED_PROPERTY: Record<string, string> = { viewSettings: 'views', reportSettings: 'reports', actionSettings: 'actions' };
const PLATFORMS = ['desktop', 'mobile'] as const;
const KINDS = ['js', 'css'] as const;
const UPLOAD_WARNING = /^\d+ 件のファイル（合計 .+）を反映先へアップロードしてから設定します。$/;

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value !== '';
/** 選択肢（options）を持ち、初期値が選択肢のどれかである必要があるフィールドの種類 */
const CHOICE_FIELD_TYPES: ReadonlySet<string> = new Set(['DROP_DOWN', 'RADIO_BUTTON', 'CHECK_BOX', 'MULTI_SELECT']);

/** 選択肢を持つフィールドの初期値が、送る設定の選択肢にあるか検査する（kintone は書き込みで拒否する）。問題を利用者向けの文で返す。 */
function checkChoiceDefault(label: string, definition: Record<string, any>): string[] {
  if (!CHOICE_FIELD_TYPES.has(definition.type) || !isPlainObject(definition.options)) return [];
  const options = definition.options as Record<string, unknown>;
  const defaults = definition.defaultValue;
  const hint = '初期値は、送る設定の選択肢のどれかにしてください。';
  if (definition.type === 'DROP_DOWN' || definition.type === 'RADIO_BUTTON') {
    if (defaults === undefined || defaults === '' || defaults === null) return definition.type === 'RADIO_BUTTON' ? [`${label}の初期値がありません。ラジオボタンは、初期値を選択肢のどれかにする必要があります。`] : [];
    if (typeof defaults !== 'string') return [`${label}の初期値の形式が不正です。${hint}`];
    return own(options, defaults) ? [] : [`${label}の初期値「${defaults}」が選択肢にありません。${hint}`];
  }
  if (defaults === undefined || defaults === null) return [];
  if (!Array.isArray(defaults)) return [`${label}の初期値の形式が不正です（選択肢の配列にしてください）。`];
  return defaults.filter(value => typeof value !== 'string' || !own(options, value)).map(value => `${label}の初期値「${String(value)}」が選択肢にありません。${hint}`);
}

/**
 * フィールド設定の変更の検査。反映先にあるフィールドの削除・種類やコードの変更は、このツールでは行わない。
 * 送る設定の中で、選択肢にない初期値と、送る設定に無いフィールドを参照する計算式も止める（kintone は書き込みで拒否する）。
 * knownFieldCodes は反映元・反映先のどちらかに実在するフィールドコード。計算式からは、これと一致した語だけを参照とみなす。
 */
function checkFieldSettings(before: any, after: any, fieldLabels: Record<string, string>, knownFieldCodes?: ReadonlySet<string> | readonly string[]): string[] {
  const issues: string[] = [];
  const name = (code: string, parent?: string) => `フィールド「${parent ? `${fieldDisplayName(parent, fieldLabels)} › ` : ''}${fieldDisplayName(code, fieldLabels)}」`;
  const compare = (beforeFields: Record<string, any>, afterFields: Record<string, any>, parent?: string) => {
    for (const [code, definition] of Object.entries(afterFields)) {
      if (!isPlainObject(definition) || !isNonEmptyString(definition.type)) { issues.push(`${name(code, parent)}の定義に種類（type）がありません。`); continue; }
      if (definition.code !== undefined && definition.code !== code) issues.push(`${name(code, parent)}のフィールドコードは変更できません（${code} → ${String(definition.code)}）。`);
      const current = own(beforeFields, code) ? beforeFields[code] : undefined;
      if (isPlainObject(current) && current.type !== definition.type) issues.push(`${name(code, parent)}の種類は変更できません（${String(current.type)} → ${definition.type}）。`);
      issues.push(...checkChoiceDefault(name(code, parent), definition));
      if (definition.type === 'SUBTABLE') {
        if (!isPlainObject(definition.fields)) issues.push(`${name(code, parent)}のテーブル内のフィールド定義（fields）がありません。`);
        else compare(isPlainObject(current?.fields) ? current.fields : {}, definition.fields, code);
      }
    }
    for (const code of Object.keys(beforeFields)) {
      if (!own(afterFields, code)) issues.push(`${name(code, parent)}を削除する設定は反映できません（このツールではフィールドを削除しません）。`);
    }
  };
  if (!isPlainObject(after?.properties)) return ['フィールド設定の properties がありません。'];
  compare(isPlainObject(before?.properties) ? before.properties : {}, after.properties);
  if (knownFieldCodes) {
    const known = knownFieldCodes instanceof Set ? knownFieldCodes : new Set(knownFieldCodes);
    const present = new Set<string>();
    const collect = (fields: Record<string, any>) => { for (const [code, definition] of Object.entries(fields)) { present.add(code); if (isPlainObject(definition) && definition.type === 'SUBTABLE' && isPlainObject(definition.fields)) collect(definition.fields); } };
    collect(after.properties);
    const checkExpressions = (fields: Record<string, any>, parent?: string) => {
      for (const [code, definition] of Object.entries(fields)) {
        if (!isPlainObject(definition)) continue;
        if (isNonEmptyString(definition.expression)) {
          const missing = extractExpressionFieldCodes(definition.expression, known).filter(ref => ref !== code && !present.has(ref));
          if (missing.length) issues.push(`${name(code, parent)}の計算式が、反映先に無いフィールド${missing.map(ref => `「${fieldDisplayName(ref, fieldLabels)}」`).join('、')}を参照しています。${missing.length > 1 ? 'これらの追加' : 'その追加'}も一緒に選ぶか、計算式を反映しないでください。`);
        }
        if (definition.type === 'SUBTABLE' && isPlainObject(definition.fields)) checkExpressions(definition.fields, code);
      }
    };
    checkExpressions(after.properties);
  }
  return issues;
}

/** 反映後の設定が、その項目の PUT 形として書き込める形か検査し、問題を利用者向けの文で返す。 */
export function checkComposedAfter(sectionKey: string, before: any, after: any, fieldLabels: Record<string, string> = {}, knownFieldCodes?: ReadonlySet<string> | readonly string[]): string[] {
  const fail = (message: string) => [message];
  if (!isPlainObject(after)) return fail('反映後の設定はオブジェクトである必要があります。');
  switch (sectionKey) {
    case 'fieldSettings': return checkFieldSettings(before, after, fieldLabels, knownFieldCodes);
    case 'layoutSettings':
      return Array.isArray(after.layout) && after.layout.every(isPlainObject) ? [] : fail('レイアウトの形式が不正です（layout は行の配列である必要があります）。');
    case 'viewSettings': case 'reportSettings': case 'actionSettings': {
      const property = NAMED_PROPERTY[sectionKey], container = after[property];
      if (!isPlainObject(container)) return fail(`${property} の設定がありません。`);
      const issues: string[] = [];
      for (const [name, value] of Object.entries(container)) {
        if (!isPlainObject(value)) { issues.push(`${name}: 設定の形式が不正です。`); continue; }
        if (sectionKey !== 'viewSettings') continue;
        if (!['LIST', 'CALENDAR', 'CUSTOM'].includes(value.type)) issues.push(`${name}: 一覧の種類を取得できません。`);
        else if (value.type === 'LIST' && (!Array.isArray(value.fields) || value.fields.some((code: unknown) => typeof code !== 'string'))) issues.push(`${name}: 一覧のフィールド定義が不完全です。`);
        else if (value.type === 'CUSTOM' && typeof value.html !== 'string') issues.push(`${name}: カスタマイズ一覧のHTMLがありません。`);
      }
      return issues;
    }
    case 'pluginSettings': {
      if (!Array.isArray(after.plugins) || after.plugins.some((id: unknown) => !isNonEmptyString(id))) return fail('プラグイン一覧の形式が不正です。');
      const removed = (Array.isArray(before?.plugins) ? before.plugins : []).filter((id: string) => !after.plugins.includes(id));
      return removed.length ? fail(`プラグインを外す設定は反映できません（${removed.join('、')}）。`) : [];
    }
    case 'customizeSettings': {
      const issues: string[] = [];
      if (!['ALL', 'ADMIN', 'NONE'].includes(after.scope)) issues.push('JS/CSSの適用範囲が不正です。');
      for (const platform of PLATFORMS) for (const kind of KINDS) {
        const list = after[platform]?.[kind];
        if (!Array.isArray(list) || list.some((item: any) => !item || (item.type === 'URL' ? !isNonEmptyString(item.url) : item.type === 'FILE' ? !isNonEmptyString(item.file?.fileKey) : true))) issues.push(`${platform}/${kind}: JS/CSS一覧の形式が不正です。`);
      }
      return issues;
    }
    case 'appAcl': case 'fieldAcl': case 'recordPermissions':
      return Array.isArray(after.rights) ? [] : fail('rights の設定がありません。');
    case 'notifications': case 'perRecordNotifications':
      return Array.isArray(after.notifications) ? [] : fail('notifications の設定がありません。');
    case 'reminderNotifications':
      if (!Array.isArray(after.notifications)) return fail('notifications の設定がありません。');
      return after.notifications.length && !isNonEmptyString(after.timezone) ? fail('リマインダー通知のタイムゾーンがありません。') : [];
    case 'categories':
      return typeof after.enabled === 'boolean' && isPlainObject(after.categories) ? [] : fail('カテゴリーの enabled / categories がありません。');
    case 'processSettings':
      return typeof after.enable === 'boolean' && (!after.enable || (isPlainObject(after.states) && Array.isArray(after.actions))) ? [] : fail('プロセス管理の enable / states / actions の形式が不正です。');
    case 'appSettings':
      if (after.titleField !== undefined && !isPlainObject(after.titleField)) return fail('レコードのタイトルの設定形式が不正です。');
      return after.titleField?.selectionMode === 'MANUAL' && !isNonEmptyString(after.titleField.code) ? fail('レコードのタイトルに使うフィールドが指定されていません。') : [];
    default: return [];
  }
}

/**
 * checkComposedAfter に加え、既定の計画との関係の検査。
 * JS/CSS の 4 つの一覧は、反映元に合わせた内容か反映先のままのどちらかだけ（ファイルのアップロードが必要で、直せないため）。
 */
export function checkComposedAgainstPlan(plan: ReflectSectionPlan, after: any, fieldLabels: Record<string, string> = {}, knownFieldCodes?: ReadonlySet<string> | readonly string[]): string[] {
  if (!plan.values) return ['設定値を取得できていないため、選択・修正した内容から書き込み内容を作れません。'];
  const issues = checkComposedAfter(plan.sectionKey, plan.values.before, after, fieldLabels, knownFieldCodes);
  if (issues.length || plan.sectionKey !== 'customizeSettings') return issues;
  for (const platform of PLATFORMS) for (const kind of KINDS) {
    const list = after[platform][kind];
    if (!sameValue(list, plan.values.after?.[platform]?.[kind]) && !sameValue(list, plan.values.before?.[platform]?.[kind])) issues.push(`${platform}/${kind}: JS/CSSの一覧は、反映元に合わせるか反映先のままにするかのどちらかだけ選べます（ファイルの内容は直せません）。`);
  }
  return issues;
}

function fieldOperations(before: any, after: any, endpoint: string): { operations: ReflectOperation[]; add: number; update: number } {
  const beforeProps: Record<string, any> = before.properties, afterProps: Record<string, any> = after.properties;
  const adds: Record<string, any> = Object.create(null), updates: Record<string, any> = Object.create(null);
  for (const [code, value] of Object.entries(afterProps)) {
    if (SYSTEM_FIELD_TYPES.has(value?.type)) continue;
    if (!own(beforeProps, code)) adds[code] = value;
    else if (value.type === 'SUBTABLE') {
      // テーブルは、中の新しいフィールドを追加（POST）、既存のフィールドと表の設定を更新（PUT）に分ける。
      const current = beforeProps[code];
      const addedFields = Object.fromEntries(Object.entries(value.fields).filter(([child]) => !own(current.fields || {}, child)));
      if (Object.keys(addedFields).length) adds[code] = { type: 'SUBTABLE', code, fields: addedFields };
      const updatedFields = Object.fromEntries(Object.entries(value.fields).filter(([child, childDef]) => own(current.fields || {}, child) && !sameValue(childDef, current.fields[child])));
      const { fields: _nextFields, ...nextTable } = value, { fields: _currentFields, ...currentTable } = current;
      if (Object.keys(updatedFields).length || !sameValue(nextTable, currentTable)) updates[code] = { ...nextTable, fields: updatedFields };
    } else if (!sameValue(value, beforeProps[code])) updates[code] = value;
  }
  const operations: ReflectOperation[] = [];
  const add = Object.keys(adds).length, update = Object.keys(updates).length;
  if (add) operations.push({ method: 'POST', endpoint, body: { properties: adds }, label: 'フィールド追加' });
  if (update) operations.push({ method: 'PUT', endpoint, body: { properties: updates }, label: 'フィールド更新' });
  return { operations, add, update };
}

/**
 * 送る設定（after'）から計画を作り直す。plan は既定の計画（values を持つ）。
 * 既定の計画の blockers（取得失敗・種類の違いなど）・warnings・behavior は引き継ぎ、operations・changes・items・requiredFields は after' から導く。
 * 形が不正な after' は status 'error' と blockers で示す（書き込み内容は作らない）。
 */
export function buildPlanFromComposedAfter(plan: ReflectSectionPlan, after: any, fieldLabels: Record<string, string> = {}, knownFieldCodes?: ReadonlySet<string> | readonly string[]): ReflectSectionPlan {
  const key = plan.sectionKey;
  const result: ReflectSectionPlan = {
    sectionKey: key, label: plan.label, status: 'same', message: '', behavior: plan.behavior, changes: [], changeCount: 0, removalCount: 0,
    warnings: [...plan.warnings], blockers: [...plan.blockers], operations: [],
    ...(plan.fieldStats ? { fieldStats: { ...plan.fieldStats } } : {}), ...(plan.values ? { values: plan.values } : {})
  };
  const fail = (messages: string[]) => {
    for (const message of messages) if (!result.blockers.includes(message)) result.blockers.push(message);
    result.status = 'error'; result.message = result.blockers.join('\n');
    return result;
  };
  if (!plan.values) return fail(['設定値を取得できていないため、選択・修正した内容から書き込み内容を作れません。']);
  const before = plan.values.before;
  const issues = checkComposedAgainstPlan(plan, after, fieldLabels, knownFieldCodes);
  if (issues.length) return fail(issues);
  const def = SECTION_DEFS.find(item => item.key === key);
  const endpoint = key === 'appSettings' ? SECTION_DEFS.find(item => item.key === 'appSettings')?.endpoint || '/app/settings.json' : def?.endpoint;
  if (!endpoint) return fail(['この項目は反映に対応していません。']);
  const retained: ReflectChange[] = plan.changes.filter(change => change.kind === '保持').map(change => ({ ...change }));
  const changes: ReflectChange[] = [...retained];
  const uploads: ReflectFileUpload[] = [];
  let shownBefore = before, shownAfter = after;
  let putAfter = true;
  try {
    if (key === 'fieldSettings') {
      const built = fieldOperations(before, after, endpoint);
      result.operations.push(...built.operations);
      result.fieldStats = { add: built.add, update: built.update, tgtOnly: plan.fieldStats?.tgtOnly ?? 0 };
      putAfter = false;
    } else if (key === 'pluginSettings') {
      const additions = (after.plugins as string[]).filter(id => !(before.plugins as string[]).includes(id));
      if (additions.length) result.operations.push({ method: 'POST', endpoint, body: { ids: additions }, label: 'プラグイン追加' });
      putAfter = false;
    } else if (key === 'customizeSettings') {
      const defaultAfter = plan.values.after;
      const resolution = { files: {}, hashes: plan.values.fileHashes || {}, blobs: new Map(), targetBlobs: new Map(), targetUnavailable: [] } as CustomizeFileResolution;
      const names = plan.values.fileNames || {};
      for (const platform of PLATFORMS) for (const kind of KINDS) {
        const list = after[platform][kind];
        if (sameValue(list, defaultAfter?.[platform]?.[kind])) uploads.push(...(plan.fileUploads || []).filter(upload => upload.platform === platform && upload.kind === kind).map(upload => ({ ...upload })));
      }
      shownBefore = comparableCustomizePayload(before, resolution, names);
      shownAfter = comparableCustomizePayload(after, resolution, names);
      const rest = result.warnings.filter(message => !UPLOAD_WARNING.test(message));
      result.warnings = uploads.length ? [`${uploads.length} 件のファイル（合計 ${formatBytes(uploads.reduce((sum, upload) => sum + upload.byteSize, 0))}）を反映先へアップロードしてから設定します。`, ...rest] : rest;
    }
    diffValues(shownBefore, shownAfter, [], changes);
    if (key === 'layoutSettings') reclassifyLayoutRemovals(changes, shownBefore?.layout, shownAfter?.layout, fieldLabels);
    if (key === 'appSettings') {
      // 一般設定のAPIは設定を削除しない（例: タイトルを自動にするとフィールド指定は不要になるだけ）ため、削除としては数えない。
      for (const change of changes) if (change.kind === '削除') change.kind = '変更';
      for (const change of changes) { const [head, ...rest] = change.path.split(' / '); change.path = [APP_SETTINGS_LABELS[head] || head, ...rest].join(' / '); }
    }
    try {
      result.items = summarizeReflectItems(key, shownBefore, shownAfter, key === 'appSettings' ? { fieldLabels } : { fieldLabels, retained: retainedItemNames(key, changes, fieldLabels) });
    } catch { result.items = []; }
    result.changes = changes;
    result.changeCount = changes.filter(change => change.kind !== '保持').length;
    result.removalCount = changes.filter(change => change.kind === '削除').length;
    if (putAfter && result.changeCount) result.operations.push({ method: 'PUT', endpoint, body: after, label: key === 'appSettings' ? plan.label : def!.label, ...(uploads.length ? { uploads } : {}) });
    if (uploads.length && result.changeCount) result.fileUploads = uploads;
    const required = reflectRequiredFields(key, after, knownFieldCodes);
    if (required !== undefined) result.requiredFields = required;
    if (result.blockers.length) result.status = 'error';
    else result.status = result.operations.length ? 'change' : 'same';
    result.message = result.blockers.length ? result.blockers.join('\n')
      : result.operations.length ? `変更 ${result.changeCount}件 / 削除 ${result.removalCount}件 / ${result.behavior}`
      : key === 'appSettings' ? '書き込み不要（一致）' : `書き込み不要${changes.some(change => change.kind === '保持') ? '（反映先だけの設定は保持）' : '（一致）'}`;
  } catch (error: any) {
    return fail([error?.message || String(error)]);
  }
  return result;
}
