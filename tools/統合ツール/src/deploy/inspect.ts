'use strict';

/**
 * 本番とプレビューの差分を確認する純粋関数（DOM・通信に依存しない）。
 * 変更の要約は常に before = 本番、after = プレビューの向きで作る。
 */

import { SYSTEM_FIELD_TYPES } from '../constants.js';
import { summarizeReflectItems, type ReflectItemSummary } from '../reflect/changeSummary.js';
import { isCompleteReflectSection, stableReflectStringify } from '../reflect/standalonePreflight.js';
import { deploySectionLabel } from './sections.js';
import type { DeployRemovedField, DeploySectionDiff } from './types.js';

const isObject = (value: any): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);

/** 内容の比較からは、アプリ単位で変わる revision（トップレベル）を除く。 */
function withoutRevision(section: any): any {
  if (!isObject(section) || !Object.prototype.hasOwnProperty.call(section, 'revision')) return section;
  const { revision: _revision, ...rest } = section;
  return rest;
}

/**
 * JS/CSS の FILE 項目は fileKey ではなくファイル名とサイズで比べる（再アップロードで fileKey が変わっても同じファイルとして扱う）。
 * 比較用の別オブジェクトを返し、元の設定は変更しない。
 */
function comparableCustomize(section: any): any {
  if (!isObject(section)) return section;
  const result: Record<string, any> = { ...section };
  for (const platform of ['desktop', 'mobile']) {
    const platformSection = section[platform];
    if (!isObject(platformSection)) continue;
    const next: Record<string, any> = { ...platformSection };
    for (const kind of ['js', 'css']) {
      if (!Array.isArray(platformSection[kind])) continue;
      next[kind] = platformSection[kind].map((item: any) => item?.type === 'FILE'
        ? { type: 'FILE', file: { name: item.file?.name ?? '', contentHash: `size:${item.file?.size ?? ''}` } }
        : item);
    }
    result[platform] = next;
  }
  return result;
}

function comparable(sectionKey: string, section: any): any {
  const base = withoutRevision(section);
  return sectionKey === 'customizeSettings' ? comparableCustomize(base) : base;
}

function incompleteReason(side: string, label: string, section: any): string | undefined {
  if (isCompleteReflectSection(section)) return undefined;
  if (isObject(section) && section._fetchError) return `${side}の${label}を取得できません（${String(section._fetchError).split('\n')[0]}）。`;
  if (isObject(section) && section._partial) return `${side}の${label}を完全に取得できません。`;
  return `${side}の${label}を取得できません。`;
}

/** 1 項目の本番とプレビューを比べる。取得できていない項目は status 'error'。 */
export function compareDeploySection(sectionKey: string, production: any, preview: any, fieldLabels: Record<string, string> = {}): DeploySectionDiff {
  const label = deploySectionLabel(sectionKey);
  const empty = { added: 0, changed: 0, removed: 0 };
  const reasons = [incompleteReason('本番', label, production), incompleteReason('プレビュー', label, preview)].filter((reason): reason is string => !!reason);
  if (reasons.length) return { sectionKey, label, status: 'error', items: [], counts: { ...empty }, message: reasons.join(' ') };

  const before = comparable(sectionKey, production), after = comparable(sectionKey, preview);
  if (stableReflectStringify(before) === stableReflectStringify(after)) return { sectionKey, label, status: 'same', items: [], counts: { ...empty } };

  let items: ReflectItemSummary[] = [];
  try { items = summarizeReflectItems(sectionKey, before, after, { fieldLabels }); } catch { items = []; }
  if (!items.length) items = [{ kind: '変更', name: label, details: ['設定の内容が異なります'] }];
  const counts = { ...empty };
  for (const item of items) {
    if (item.kind === '追加') counts.added += 1;
    else if (item.kind === '変更') counts.changed += 1;
    else if (item.kind === '削除') counts.removed += 1;
  }
  return { sectionKey, label, status: 'change', items, counts };
}

/** レコードの値を持たないフィールドの種類（削除しても値は失われない）。 */
const NO_VALUE_FIELD_TYPES: ReadonlySet<string> = new Set(['GROUP', 'REFERENCE_TABLE']);

interface FlatField { code: string; label: string; type: string; table?: string }

/** フィールド設定（properties）を、テーブル内のフィールドも含めて平らにする。 */
function flattenFields(fieldSettings: any): FlatField[] {
  const out: FlatField[] = [];
  const properties = isObject(fieldSettings) ? fieldSettings.properties : undefined;
  if (!isObject(properties)) return out;
  for (const [key, definition] of Object.entries(properties)) {
    if (!isObject(definition)) continue;
    const code = typeof definition.code === 'string' && definition.code ? definition.code : key;
    const type = String(definition.type ?? '');
    out.push({ code, label: typeof definition.label === 'string' ? definition.label : '', type });
    if (type === 'SUBTABLE' && isObject(definition.fields)) {
      for (const [innerKey, inner] of Object.entries(definition.fields)) {
        if (!isObject(inner)) continue;
        out.push({ code: typeof inner.code === 'string' && inner.code ? inner.code : innerKey, label: typeof inner.label === 'string' ? inner.label : '', type: String(inner.type ?? ''), table: code });
      }
    }
  }
  return out;
}

/**
 * 本番にあり、プレビューに無いフィールドを返す（システムフィールドは除く）。
 * 本番へ反映するとそのフィールドのレコードの値も削除され、元に戻せない。
 * 削除されるテーブルの中のフィールドは、テーブルの削除に含まれるため別に数えない。
 * グループ・関連レコード一覧はレコードの値を持たないため含めない（フィールド設定の変更の要約には「削除」として出る）。
 */
export function findRemovedFields(productionFieldSettings: any, previewFieldSettings: any): DeployRemovedField[] {
  const production = flattenFields(productionFieldSettings), preview = flattenFields(previewFieldSettings);
  const previewCodes = new Set(preview.map(field => field.code));
  const productionCodes = new Set(production.map(field => field.code));
  const removedTables = new Set(production.filter(field => !field.table && field.type === 'SUBTABLE' && !previewCodes.has(field.code)).map(field => field.code));
  const removed = production.filter(field => !SYSTEM_FIELD_TYPES.has(field.type) && !NO_VALUE_FIELD_TYPES.has(field.type) && !previewCodes.has(field.code) && !(field.table && removedTables.has(field.table)));
  // コードだけを変えたように見える候補。1 つの新しいフィールドを複数の削除の候補にしない。
  const claimed = new Set<string>();
  return removed.map((field) => {
    const candidates = preview.filter(item => !productionCodes.has(item.code) && item.type === field.type && item.label !== '' && item.label === field.label);
    const candidate = candidates.find(item => !claimed.has(item.code)) ?? candidates[0];
    if (candidate) claimed.add(candidate.code);
    return {
      code: field.code,
      label: field.label || field.code,
      type: field.type,
      ...(field.table ? { table: field.table } : {}),
      ...(candidate ? { possibleRename: candidate.code } : {})
    };
  });
}

const ACL_SECTIONS = ['appAcl', 'recordPermissions', 'fieldAcl'];

/**
 * アプリ単位の注意（反映は止めない）。本番で影響が大きいものを利用者向けの文で返す。
 * sections は比べた項目の結果、production / preview はバンドルの sections。
 */
export function buildDeployWarnings(opts: { sections: DeploySectionDiff[]; contentSame: boolean; production: Record<string, any>; preview: Record<string, any> }): string[] {
  const warnings: string[] = [];
  const changed = (key: string) => opts.sections.some(section => section.sectionKey === key && section.status === 'change');
  if (opts.contentSame) {
    warnings.push('比べた項目の内容に違いはなく、設定の更新番号（revision）だけが異なります。プラグインの個別設定や JS/CSS ファイルの中身など、比べていない変更が含まれている可能性があります。');
  }
  if (changed('processSettings') && opts.production.processSettings?.enable === true && opts.preview.processSettings?.enable === false) {
    warnings.push('プロセス管理が有効から無効に変わります。本番でもステータスの管理ができなくなります。');
  }
  if (changed('categories') && opts.production.categories?.enabled === true && opts.preview.categories?.enabled === false) {
    warnings.push('カテゴリー機能が有効から無効に変わります。本番のレコードのカテゴリーが使えなくなります。');
  }
  const acl = ACL_SECTIONS.filter(changed);
  if (acl.length) warnings.push(`アクセス権（${acl.map(deploySectionLabel).join('、')}）が変わります。反映後、利用者が操作できる範囲が変わります。`);
  return warnings;
}
