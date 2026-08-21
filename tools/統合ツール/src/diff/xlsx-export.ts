'use strict';

import { SECTION_DEFS } from '../constants.js';
import {
  downloadBlob,
  buildExportFilename,
  buildAppFilenameLabel,
  extractAppNameFromBundle,
  getIssueSideLabel,
  stableStringify
} from '../utils.js';
import { stringifyRowValueForDiff } from './export.js';
import {
  isSensitiveSameDiffRow,
  SENSITIVE_DIFF_SECTION_KEYS,
  SENSITIVE_SAME_VALUE_REDACTION
} from './export-safety.js';
import { extractFieldPathInfo } from './enrich.js';
import { decodeRow } from './path-decoder.js';
import {
  buildXlsxBlob,
  type XlsxCellStyle,
  type XlsxRowStyle,
  type XlsxSheet
} from './xlsx-builder.js';

export interface DiffXlsxRow {
  sectionKey?: string;
  section?: string;
  type: string;
  severity?: string;
  path?: string;
  label?: string;
  left?: unknown;
  right?: unknown;
  moved?: boolean;
  reasonSummary?: string;
  notationOnly?: boolean;
  emptyOnly?: boolean;
  _displayOnly?: boolean;
}

export interface DiffXlsxFetchIssue {
  sectionKey?: string;
  section?: string;
  side?: string;
  message?: string;
  sourceError?: string;
  targetError?: string;
}

export interface DiffXlsxPartialIssue {
  sectionKey?: string;
  section?: string;
  side?: string;
  message?: string;
  reason?: string;
  files?: Array<{ fileName?: string; fileKey?: string; reason?: string; detail?: string }>;
}

export interface DiffXlsxTruncation {
  truncated?: boolean;
  diffLimit?: number;
  sameLimit?: number;
  droppedDiff?: number;
  droppedSame?: number;
  sections?: Array<{
    sectionKey?: string;
    section?: string;
    droppedDiff?: number;
    droppedSame?: number;
    scanned?: boolean;
    partiallyScanned?: boolean;
    scanStatus?: 'complete' | 'partial' | 'unscanned';
    omittedDiffCount?: number | null;
  }>;
}

export interface DiffXlsxBundle {
  appId?: string | number;
  guestId?: string;
  preview?: boolean;
  fetchedAt?: string | number;
  meta?: { appName?: string };
  sections?: Record<string, any>;
}

export interface DiffXlsxContext {
  /** 顧客共有用は技術情報を除外する。未指定時も安全側の customer を採用する。 */
  audience?: 'customer' | 'internal';
  rows: DiffXlsxRow[];
  fetchIssues?: DiffXlsxFetchIssue[];
  partialIssues?: DiffXlsxPartialIssue[];
  truncation?: DiffXlsxTruncation | null;
  sourceBundle?: DiffXlsxBundle;
  targetBundle?: DiffXlsxBundle;
  scopes?: string[];
  ignoreKeys?: string;
  normalizationPresetState?: Record<string, boolean>;
  exportMode?: string;
  exportLabel?: string;
  filterDescription?: string;
  exportContentMode?: string;
  filename?: string;
  generatedAt?: string;
  comparedAt?: string | number;
}

export interface DiffXlsxFieldDetail {
  rowIndex: number;
  fieldKey: string;
  fieldCode: string;
  fieldName: string;
  fieldType: string;
  settingKey: string;
  settingLabel: string;
  row: DiffXlsxRow;
}

export interface DiffXlsxFieldSummary {
  fieldKey: string;
  fieldCode: string;
  fieldName: string;
  fieldType: string;
  diffCount: number;
  added: number;
  removed: number;
  changed: number;
  settingLabels: string[];
  summary: string;
}

export interface DiffXlsxFieldModel {
  details: DiffXlsxFieldDetail[];
  summaries: DiffXlsxFieldSummary[];
}

const SECTION_LABEL_BY_KEY = new Map(SECTION_DEFS.map((d) => [d.key, d.label]));
const SECTION_ORDER_BY_KEY = new Map(SECTION_DEFS.map((d, i) => [d.key, i]));
type DiffTruncationSection = NonNullable<DiffXlsxTruncation['sections']>[number];
type DiffTruncationScanStatus = 'complete' | 'partial' | 'unscanned';

function truncationScanStatusOf(section: DiffTruncationSection): DiffTruncationScanStatus {
  if (section.scanStatus === 'complete' || section.scanStatus === 'partial' || section.scanStatus === 'unscanned') {
    return section.scanStatus;
  }
  if (section.scanned === false) return 'unscanned';
  if (section.partiallyScanned === true || section.omittedDiffCount === null) return 'partial';
  return 'complete';
}

function truncationSectionName(section: DiffTruncationSection): string {
  return sectionLabelOf(section.sectionKey || section.section || '全体');
}

const NORMALIZATION_LABELS: Record<string, string> = {
  viewOrder: 'ビュー順序',
  permissionOrder: '権限順序',
  generalArrayOrder: '一般配列順序',
  fieldOrder: 'フィールド順序',
  processOrder: 'プロセス順序',
  appReferences: 'アプリ参照',
  auditMeta: '監査メタ情報',
  labelsAndText: 'ラベル・説明文',
  appearance: '表示設定',
  fileKeys: 'ファイルキー',
  enabledFlags: '有効フラグ'
};

function sectionLabelOf(key: string): string {
  return SECTION_LABEL_BY_KEY.get(key) || key || '(未分類)';
}

function sectionKeyOfRow(row: DiffXlsxRow): string {
  return String(row.sectionKey || row.section || '(その他)');
}

function normalizationLabel(state: Record<string, boolean> | undefined): string {
  if (!state || !Object.keys(state).length) return '未記録';
  const entries = Object.entries(state).sort(([a], [b]) => a.localeCompare(b));
  const enabled = entries.filter(([, value]) => !!value).map(([key]) => NORMALIZATION_LABELS[key] || key);
  const disabled = entries.filter(([, value]) => !value).map(([key]) => NORMALIZATION_LABELS[key] || key);
  return `有効: ${enabled.length ? enabled.join('、') : 'なし'} / 無効: ${disabled.length ? disabled.join('、') : 'なし'}`;
}

function groupRowsBySection(rows: DiffXlsxRow[]): Map<string, DiffXlsxRow[]> {
  const map = new Map<string, DiffXlsxRow[]>();
  for (const r of rows) {
    const key = sectionKeyOfRow(r);
    let list = map.get(key);
    if (!list) { list = []; map.set(key, list); }
    list.push(r);
  }
  const ordered = new Map<string, DiffXlsxRow[]>();
  const known = [...map.keys()].filter((k) => SECTION_ORDER_BY_KEY.has(k))
    .sort((a, b) => (SECTION_ORDER_BY_KEY.get(a)! - SECTION_ORDER_BY_KEY.get(b)!));
  const unknown = [...map.keys()].filter((k) => !SECTION_ORDER_BY_KEY.has(k));
  for (const k of [...known, ...unknown]) ordered.set(k, map.get(k)!);
  return ordered;
}

const FIELD_SETTING_LABELS: Record<string, string> = {
  label: 'フィールド名',
  name: 'フィールド名',
  code: 'フィールドコード',
  type: 'フィールドタイプ',
  noLabel: 'フィールド名を表示しない',
  required: '必須項目にする',
  unique: '重複禁止にする',
  defaultValue: '初期値',
  defaultNowValue: '現在日時を初期値にする',
  description: '説明',
  minLength: '最小文字数',
  maxLength: '最大文字数',
  minValue: '最小値',
  maxValue: '最大値',
  expression: '計算式',
  hideExpression: '計算式を表示しない',
  options: '選択肢',
  protocol: 'プロトコル',
  displayScale: '小数点以下の表示桁数',
  digit: '桁区切りを表示する',
  unit: '単位記号',
  unitPosition: '単位記号の位置',
  align: '並び',
  format: '表示形式',
  entities: '選択候補',
  fields: 'テーブル内の項目',
  referenceTable: '関連レコード一覧設定',
  lookup: 'ルックアップ設定',
  condition: '表示条件（フィールドの一致）',
  displayFields: '表示するフィールド',
  filterCond: '絞り込み条件',
  relatedApp: '参照するアプリ',
  size: '一度に表示する最大件数',
  sort: 'ソート',
  relatedKeyField: 'コピー元のフィールド',
  fieldMappings: 'ほかのフィールドのコピー',
  lookupPickerFields: '選択画面に表示するフィールド',
  field: '自アプリのフィールド',
  relatedField: '参照するアプリのフィールド',
  app: '参照するアプリID',
  thumbnailSize: 'サムネイルの大きさ',
  index: '並び順'
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  SINGLE_LINE_TEXT: '文字列（1行）',
  MULTI_LINE_TEXT: '文字列（複数行）',
  RICH_TEXT: 'リッチエディター',
  NUMBER: '数値',
  CALC: '計算',
  RADIO_BUTTON: 'ラジオボタン',
  CHECK_BOX: 'チェックボックス',
  MULTI_SELECT: '複数選択',
  DROP_DOWN: 'ドロップダウン',
  DATE: '日付',
  TIME: '時刻',
  DATETIME: '日時',
  LINK: 'リンク',
  FILE: '添付ファイル',
  USER_SELECT: 'ユーザー選択',
  ORGANIZATION_SELECT: '組織選択',
  GROUP_SELECT: 'グループ選択',
  REFERENCE_TABLE: '関連レコード一覧',
  SUBTABLE: 'テーブル',
  GROUP: 'グループ',
  LABEL: 'ラベル',
  SPACER: 'スペース',
  RECORD_NUMBER: 'レコード番号',
  CREATOR: '作成者',
  CREATED_TIME: '作成日時',
  MODIFIER: '更新者',
  UPDATED_TIME: '更新日時',
  STATUS: 'ステータス',
  STATUS_ASSIGNEE: '作業者',
  CATEGORY: 'カテゴリー'
};

function fieldSettingsProperties(bundle?: DiffXlsxBundle): Record<string, any> {
  const section = bundle?.sections?.fieldSettings;
  if (!section || typeof section !== 'object' || Array.isArray(section)) return {};
  const properties = section.properties;
  if (properties && typeof properties === 'object' && !Array.isArray(properties)) return properties;
  return section;
}

function fieldDefinitionAt(bundle: DiffXlsxBundle | undefined, info: any): any | null {
  const root = fieldSettingsProperties(bundle)[info.rootCode];
  if (!root || typeof root !== 'object' || Array.isArray(root)) return null;
  if (!info.isSubField) return root;
  const child = root.fields?.[info.subFieldCode];
  return child && typeof child === 'object' && !Array.isArray(child) ? child : null;
}

function fieldDefinitionLabel(definition: any): string {
  if (!definition || typeof definition !== 'object') return '';
  return String(definition.label || definition.name || '').trim();
}

function fieldLabelFromRow(row: DiffXlsxRow, info: any): string {
  const preferredPayload = row.type === 'removed' ? row.left : row.right;
  const fallbackPayload = row.type === 'removed' ? row.right : row.left;
  for (const payload of [preferredPayload, fallbackPayload]) {
    const label = fieldDefinitionLabel(payload);
    if (label) return label;
  }
  if (String(info.leafKey || '') === 'label' || String(info.leafKey || '') === 'name') {
    for (const value of [preferredPayload, fallbackPayload]) {
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  const match = String(row.label || '').match(/(?:フィールド|項目)[「\"]([^」\"]+)[」\"]/);
  return match ? match[1].trim() : '';
}

function fieldDisplayIdentity(row: DiffXlsxRow, info: any, ctx: DiffXlsxContext): {
  fieldKey: string;
  fieldCode: string;
  fieldName: string;
  fieldType: string;
} {
  const sourceDef = fieldDefinitionAt(ctx.sourceBundle, info);
  const targetDef = fieldDefinitionAt(ctx.targetBundle, info);
  const preferredDef = row.type === 'removed' ? sourceDef : targetDef;
  const fallbackDef = row.type === 'removed' ? targetDef : sourceDef;
  const activeLabel = fieldDefinitionLabel(preferredDef)
    || fieldDefinitionLabel(fallbackDef)
    || fieldLabelFromRow(row, info)
    || info.activeCode;
  const preferredPayload = row.type === 'removed' ? row.left : row.right;
  const fallbackPayload = row.type === 'removed' ? row.right : row.left;
  const payloadType = (payload: unknown) => payload && typeof payload === 'object' && !Array.isArray(payload)
    ? String((payload as Record<string, any>).type || '')
    : '';
  const typeCode = String(preferredDef?.type || fallbackDef?.type || payloadType(preferredPayload) || payloadType(fallbackPayload) || '');
  const fieldType = FIELD_TYPE_LABELS[typeCode] || typeCode || '不明';
  if (!info.isSubField) {
    return {
      fieldKey: String(info.rootCode),
      fieldCode: String(info.rootCode),
      fieldName: activeLabel,
      fieldType
    };
  }
  const sourceRoot = fieldSettingsProperties(ctx.sourceBundle)[info.rootCode];
  const targetRoot = fieldSettingsProperties(ctx.targetBundle)[info.rootCode];
  const preferredRoot = row.type === 'removed' ? sourceRoot : targetRoot;
  const fallbackRoot = row.type === 'removed' ? targetRoot : sourceRoot;
  const rootLabel = fieldDefinitionLabel(preferredRoot)
    || fieldDefinitionLabel(fallbackRoot)
    || String(info.rootCode);
  return {
    fieldKey: `${info.rootCode}\u001f${info.subFieldCode}`,
    fieldCode: `${info.rootCode} > ${info.subFieldCode}`,
    fieldName: `${rootLabel} > ${activeLabel}`,
    fieldType
  };
}

function fieldSettingTokenLabel(token: string | number): string {
  if (typeof token === 'number') return `${token + 1}件目`;
  return FIELD_SETTING_LABELS[token] || token;
}

function fieldSettingIdentity(info: any): { settingKey: string; settingLabel: string } {
  const tokens = Array.isArray(info.tailTokens) ? info.tailTokens : [];
  if (!tokens.length) return { settingKey: '(field)', settingLabel: 'フィールド全体' };
  const settingKey = tokens.map((token: string | number) => String(token)).join('.');
  if (tokens[0] === 'options') {
    const option = tokens.length > 1 ? String(tokens[1]) : '';
    const suffix = tokens.length > 2 ? fieldSettingTokenLabel(tokens[2]) : '';
    return {
      settingKey,
      settingLabel: option
        ? `選択肢「${option}」${suffix ? ` / ${suffix}` : ''}`
        : '選択肢と並び順'
    };
  }
  if (tokens[0] === 'lookup' || tokens[0] === 'referenceTable') {
    return {
      settingKey,
      settingLabel: tokens.map(fieldSettingTokenLabel).join(' / ')
    };
  }
  return {
    settingKey,
    settingLabel: tokens.map(fieldSettingTokenLabel).join(' / ')
  };
}

function fieldSummaryText(added: number, removed: number, changed: number, settingLabels: string[]): string {
  const counts = [
    added ? `追加 ${added}件` : '',
    removed ? `削除 ${removed}件` : '',
    changed ? `変更 ${changed}件` : ''
  ].filter(Boolean).join(' / ');
  const visibleSettings = settingLabels.slice(0, 6);
  const more = settingLabels.length > visibleSettings.length ? `、ほか${settingLabels.length - visibleSettings.length}項目` : '';
  return `${counts || '差分なし'}。変更設定: ${visibleSettings.join('、') || 'なし'}${more}`;
}

/**
 * fieldSettings の実差分だけを、フィールド単位と設定項目単位へ正規化する。
 * 表示補助行と同一行は差分件数へ混ぜず、入力順に依存しない並びで返す。
 */
export function buildDiffXlsxFieldModel(ctx: DiffXlsxContext): DiffXlsxFieldModel {
  const details: DiffXlsxFieldDetail[] = [];
  for (const [rowIndex, row] of (ctx.rows || []).entries()) {
    if (!row || row._displayOnly || row.type === 'same') continue;
    const info = extractFieldPathInfo(String(row.path || ''));
    if (!info) continue;
    const identity = fieldDisplayIdentity(row, info, ctx);
    const setting = fieldSettingIdentity(info);
    details.push({
      rowIndex,
      ...identity,
      ...setting,
      row
    });
  }
  details.sort((a, b) => a.fieldCode.localeCompare(b.fieldCode, 'ja')
    || a.settingKey.localeCompare(b.settingKey, 'ja')
    || String(a.row.type || '').localeCompare(String(b.row.type || ''), 'ja')
    || String(a.row.path || '').localeCompare(String(b.row.path || ''), 'ja'));

  const byField = new Map<string, DiffXlsxFieldSummary>();
  for (const detail of details) {
    let summary = byField.get(detail.fieldKey);
    if (!summary) {
      summary = {
        fieldKey: detail.fieldKey,
        fieldCode: detail.fieldCode,
        fieldName: detail.fieldName,
        fieldType: detail.fieldType,
        diffCount: 0,
        added: 0,
        removed: 0,
        changed: 0,
        settingLabels: [],
        summary: ''
      };
      byField.set(detail.fieldKey, summary);
    }
    summary.diffCount += 1;
    if (detail.row.type === 'added') summary.added += 1;
    else if (detail.row.type === 'removed') summary.removed += 1;
    else summary.changed += 1;
    if (!summary.settingLabels.includes(detail.settingLabel)) summary.settingLabels.push(detail.settingLabel);
    // 同じフィールドの複数行で取得できる名前が異なる場合は比較先寄りの最後の有効名を採用する。
    if (detail.fieldName && detail.fieldName !== detail.fieldCode) summary.fieldName = detail.fieldName;
    if (detail.fieldType && detail.fieldType !== '不明') summary.fieldType = detail.fieldType;
  }
  const summaries = [...byField.values()];
  for (const summary of summaries) {
    summary.settingLabels.sort((a, b) => a.localeCompare(b, 'ja'));
    summary.summary = fieldSummaryText(summary.added, summary.removed, summary.changed, summary.settingLabels);
  }
  summaries.sort((a, b) => a.fieldCode.localeCompare(b.fieldCode, 'ja'));
  return { details, summaries };
}

function appLabel(bundle?: DiffXlsxBundle): string {
  if (!bundle) return '';
  const name = extractAppNameFromBundle(bundle) || '';
  const id = bundle.appId != null ? String(bundle.appId) : '';
  if (name && id) return `${name} (App ${id})`;
  return name || (id ? `App ${id}` : '');
}

function scopeLabel(scopes: string[] | undefined): string {
  const labels = (scopes || []).map((key) => sectionLabelOf(key)).filter(Boolean);
  return labels.length ? labels.join('、') : '未記録';
}

function humanDateTime(value: unknown): string {
  if (value == null || value === '') return '未記録';
  const source = typeof value === 'string' && /^\d{11,}$/.test(value.trim())
    ? Number(value)
    : value;
  const date = typeof source === 'number' ? new Date(source) : new Date(String(source));
  if (!Number.isFinite(date.getTime())) return String(value);
  return `${new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).format(date)} JST`;
}

function xlsxContentLabel(rows: DiffXlsxRow[]): string {
  const hasActual = rows.some((row) => !row._displayOnly && row.type !== 'same');
  const hasSame = rows.some((row) => !row._displayOnly && row.type === 'same');
  const hasReference = rows.some((row) => !!row._displayOnly);
  const parts = [
    hasActual ? '差分行' : '',
    hasSame ? '同一証跡行' : '',
    hasReference ? '参考表示行' : ''
  ].filter(Boolean);
  const content = parts.length === 0
    ? '差分行なし'
    : parts.length === 1
      ? `${parts[0]}のみ`
      : parts.length === 2
        ? `${parts[0]}と${parts[1]}`
        : parts.join('・');
  return `収録した${content}（全設定スナップショットなし）`;
}

function filterDescriptionLabel(ctx: DiffXlsxContext): string {
  if (String(ctx.filterDescription || '').trim()) return String(ctx.filterDescription).trim();
  return ctx.exportMode === 'filtered'
    ? '画面で表示中の結果（詳細条件は未記録）'
    : 'フィルターなし（比較結果の全件）';
}

function fieldSettingKind(row: DiffXlsxRow): 'field' | 'setting' | null {
  const fieldInfo = extractFieldPathInfo(String(row.path || ''));
  if (!fieldInfo) return null;
  return fieldSettingIdentity(fieldInfo).settingKey === '(field)' ? 'field' : 'setting';
}

function rowTypeLabel(
  row: DiffXlsxRow
): string {
  if (row._displayOnly) return '参考';
  if (row.moved || row.type === 'moved') return '移動';
  const fieldKind = fieldSettingKind(row);
  if (fieldKind === 'setting' && row.type === 'added') return '設定追加';
  if (fieldKind === 'setting' && row.type === 'removed') return '設定削除';
  if (fieldKind === 'field' && row.type === 'added') return 'フィールド追加';
  if (fieldKind === 'field' && row.type === 'removed') return 'フィールド削除';
  if (row.type === 'added') return '追加';
  if (row.type === 'removed') return '削除';
  if (row.type === 'changed') return '変更';
  if (row.type === 'same') return '同一';
  return String(row.type || '-');
}

function rowExistenceLabel(row: DiffXlsxRow): string {
  if (row._displayOnly) return '—';
  if (row.type === 'added') return '比較先のみ';
  if (row.type === 'removed') return '比較元のみ';
  return '両方';
}

function layoutEntityCaption(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const definition = value as Record<string, unknown>;
  const label = String(definition.label || definition.name || '').trim();
  const code = String(definition.code || '').trim();
  if (label && code) return `「${label}」（${code}）`;
  if (label) return `「${label}」`;
  return code ? `（${code}）` : '';
}

function layoutRowItemLabel(
  row: DiffXlsxRow,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): string {
  const path = String(row.path || '');
  const match = path.match(/^layoutSettings\.layout\[(\d+)\](?:\.(.+))?$/);
  if (!match) return '';
  const rowIndex = Number(match[1]);
  const preferredBundle = row.type === 'removed' ? sourceBundle : targetBundle;
  const fallbackBundle = row.type === 'removed' ? targetBundle : sourceBundle;
  const layoutAt = (bundle?: DiffXlsxBundle) => bundle?.sections?.layoutSettings?.layout?.[rowIndex];
  let entity = layoutAt(preferredBundle) || layoutAt(fallbackBundle) || null;
  const rowCaption = layoutEntityCaption(entity);
  const parts = [`レイアウト行 #${rowIndex + 1}${rowCaption ? ` ${rowCaption}` : ''}`];
  for (const fieldMatch of path.matchAll(/\.fields\[(\d+)\]/g)) {
    const fieldIndex = Number(fieldMatch[1]);
    entity = entity && typeof entity === 'object' && !Array.isArray(entity)
      ? (entity as Record<string, any>).fields?.[fieldIndex]
      : null;
    const fieldCaption = layoutEntityCaption(entity);
    parts.push(`フィールド #${fieldIndex + 1}${fieldCaption ? ` ${fieldCaption}` : ''}`);
  }
  const leaf = path.match(/(?:^|\.)([^.[\]]+)$/)?.[1] || '';
  const propLabels: Record<string, string> = {
    type: '種別',
    code: 'フィールドコード',
    fields: 'フィールド',
    elementId: '要素ID',
    label: 'ラベル',
    value: '初期値',
    size: 'サイズ',
    width: '横幅',
    height: '高さ',
    innerHeight: '内側の高さ'
  };
  if (leaf && leaf !== 'layout' && leaf !== 'fields') parts.push(propLabels[leaf] || leaf);
  return parts.join(' / ');
}

function rowItemLabel(
  row: DiffXlsxRow,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): string {
  const fieldInfo = extractFieldPathInfo(String(row.path || ''));
  if (fieldInfo) {
    const identity = fieldDisplayIdentity(row, fieldInfo, { rows: [], sourceBundle, targetBundle });
    const setting = fieldSettingIdentity(fieldInfo);
    const field = identity.fieldName && identity.fieldName !== identity.fieldCode
      ? `${identity.fieldName}（${identity.fieldCode}）`
      : identity.fieldCode;
    return `${field} / ${setting.settingLabel}`;
  }
  const layoutLabel = layoutRowItemLabel(row, sourceBundle, targetBundle);
  if (layoutLabel) return layoutLabel;
  try {
    const decoded = decodeRow(row as any);
    if (decoded) {
      const where = decoded.whereChips.map((chip) => chip.label).filter(Boolean).join(' / ');
      const readable = [where, decoded.propLabel].filter(Boolean).join(' / ') || decoded.oneLineSummary;
      if (readable) return readable;
    }
  } catch {
    // 人向けの label があれば、技術明細を案内する前に採用する。
  }
  const explicitLabel = String(row.label || '').trim();
  const technicalPath = String(row.path || '').trim();
  if (explicitLabel && explicitLabel !== technicalPath) return explicitLabel;
  return '項目名を判別できません（技術明細を確認）';
}

function rowNote(row: DiffXlsxRow): string {
  const reasonSummary = row.sectionKey === 'layoutSettings'
    ? String(row.reasonSummary || '')
      .replace(/(行|フィールド) #(\d+)/g, (_match, label: string, index: string) => `${label} #${Number(index) + 1}`)
      .replace(/\binnerheight\b/gi, '入力欄の高さ')
    : String(row.reasonSummary || '');
  const notes = [
    reasonSummary,
    row._displayOnly ? '表示用の補助情報（差分件数には含めません）' : '',
    row.notationOnly ? '表記ゆれのみ' : '',
    row.emptyOnly ? '空値の違いのみ' : ''
  ].filter(Boolean);
  return [...new Set(notes)].join(' / ');
}

const XLSX_DIFF_VALUE_PREVIEW_LIMIT = 4000;

function shortStableHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

function xlsxDiffValuePreview(text: string, originalUtf16Length = text.length): string {
  if (text.length <= XLSX_DIFF_VALUE_PREVIEW_LIMIT) return text;
  const hash = shortStableHash(text);
  const prefix = `[一部表示: 元データ ${originalUtf16Length}文字（UTF-16） / 識別:${hash}]\n`;
  const suffix = `\n…（Excel表示用に省略・元UTF-16長 ${originalUtf16Length}・識別:${hash}）`;
  let keep = XLSX_DIFF_VALUE_PREVIEW_LIMIT - prefix.length - suffix.length;
  // UTF-16 サロゲートペアの途中で切らない。
  if (keep > 0 && /[\uD800-\uDBFF]/.test(text.charAt(keep - 1))) keep -= 1;
  return prefix + text.slice(0, Math.max(0, keep)) + suffix;
}

function rowValue(row: DiffXlsxRow, side: 'source' | 'target'): string {
  if (isSensitiveSameDiffRow(row)) return SENSITIVE_SAME_VALUE_REDACTION;
  if (side === 'source' && (row.left === undefined || row.type === 'added')) return '';
  if (side === 'target' && (row.right === undefined || row.type === 'removed')) return '';
  const rawValue = side === 'source' ? row.left : row.right;
  const text = stringifyRowValueForDiff(rawValue, row.path);
  const originalUtf16Length = typeof rawValue === 'string' ? rawValue.length : text.length;
  return xlsxDiffValuePreview(text, originalUtf16Length);
}

function conciseFieldDefinition(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const definition = value as Record<string, any>;
  const type = String(definition.type || '').trim();
  const label = String(definition.label || definition.name || '').trim();
  const code = String(definition.code || '').trim();
  if (!type && !label && !code) return null;

  const parts = [
    type ? `種類: ${FIELD_TYPE_LABELS[type] || type}` : '',
    label ? `表示名: ${label}` : '',
    code ? `コード: ${code}` : '',
    typeof definition.required === 'boolean' ? `必須: ${definition.required ? 'はい' : 'いいえ'}` : '',
    typeof definition.unique === 'boolean' ? `重複禁止: ${definition.unique ? 'はい' : 'いいえ'}` : '',
    definition.options && typeof definition.options === 'object'
      ? `選択肢: ${Object.keys(definition.options).length}件`
      : '',
    definition.fields && typeof definition.fields === 'object'
      ? `テーブル内フィールド: ${Object.keys(definition.fields).length}件`
      : '',
    definition.lookup && typeof definition.lookup === 'object' ? 'ルックアップ: あり' : '',
    definition.referenceTable && typeof definition.referenceTable === 'object' ? '関連レコード設定: あり' : '',
    String(definition.expression || '').trim() ? '計算式: あり' : ''
  ].filter(Boolean);
  return parts.join('\n');
}

function fieldValueOnlyExistsLabel(
  _side: 'source' | 'target',
  _sourceBundle?: DiffXlsxBundle,
  _targetBundle?: DiffXlsxBundle
): string {
  return '（存在しません）';
}

function humanizeFieldSettingValue(value: unknown, settingKey: string): string {
  const leafKey = settingKey.split('.').filter(Boolean).at(-1) || '';
  if (value === undefined) return '（未設定）';
  if (value === null) return '（値なし）';
  if (typeof value === 'boolean') {
    const labels: Record<string, [string, string]> = {
      required: ['任意', '必須'],
      unique: ['重複を許可', '重複を禁止'],
      noLabel: ['フィールド名を表示する', 'フィールド名を表示しない'],
      hideExpression: ['計算式を表示する', '計算式を表示しない'],
      defaultNowValue: ['現在日時を使わない', '現在日時を使う']
    };
    return labels[leafKey]?.[value ? 1 : 0] || (value ? 'はい' : 'いいえ');
  }
  if (typeof value === 'string') {
    if (value === '') return '（空欄）';
    if (leafKey === 'type') return FIELD_TYPE_LABELS[value] || value;
    return xlsxDiffValuePreview(value, value.length);
  }
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (Array.isArray(value)) {
    if (!value.length) return '（空の一覧）';
    if (value.every((item) => item == null || ['string', 'number', 'boolean'].includes(typeof item))) {
      return value.map((item) => humanizeFieldSettingValue(item, leafKey)).join('、');
    }
    return `${value.length}件の設定（詳細は「フィールド技術明細」）`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return `${keys.length}項目の設定（詳細は「フィールド技術明細」）`;
  }
  return String(value);
}

function humanizeListScalar(value: unknown): string {
  if (value === undefined) return '（未設定）';
  if (value === null) return '（値なし）';
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  if (typeof value === 'string') return value === '' ? '（空欄）' : value;
  return String(value);
}

function humanizeDecodedListText(value: string): string {
  return value.replace(/(種別:\s*)([A-Z][A-Z0-9_]*)\b/g, (_match, prefix: string, type: string) => (
    `${prefix}${FIELD_TYPE_LABELS[type] || type}`
  ));
}

function technicalSheetNameForRow(row: DiffXlsxRow): string {
  const key = String(row.sectionKey || row.section || '');
  return key === 'fieldSettings' ? 'フィールド技術明細' : sectionLabelOf(key);
}

function decodedListValue(row: DiffXlsxRow, side: 'source' | 'target'): string {
  try {
    const decoded = decodeRow(row as any);
    if (!decoded) return '';
    const candidate = humanizeDecodedListText(
      String(side === 'source' ? decoded.beforeText : decoded.afterText).trim()
    );
    if (!candidate || candidate === '-' || candidate === '（なし）' || /[{}\[\]]/.test(candidate)) return '';
    return candidate;
  } catch {
    return '';
  }
}

function summarizeListComplexValue(
  row: DiffXlsxRow,
  side: 'source' | 'target',
  value: Record<string, unknown> | unknown[]
): string {
  let summary = decodedListValue(row, side);
  if (!summary && Array.isArray(value)) {
    if (!value.length) summary = '空の一覧';
    else if (value.every((item) => item == null || typeof item !== 'object')) {
      const preview = value.slice(0, 5).map(humanizeListScalar).join('、');
      summary = `${value.length}件: ${preview}${value.length > 5 ? `、ほか${value.length - 5}件` : ''}`;
    } else {
      summary = `${value.length}件の設定`;
    }
  }
  if (!summary && !Array.isArray(value)) {
    const labels: Record<string, string> = {
      name: '名称', label: '名称', title: '名称', code: 'コード', id: 'ID',
      type: '種別', enabled: '有効', enable: '有効'
    };
    const facts = Object.entries(value)
      .filter(([key, item]) => labels[key] && (item == null || typeof item !== 'object'))
      .slice(0, 4)
      .map(([key, item]) => {
        const displayValue = key === 'type' && typeof item === 'string'
          ? FIELD_TYPE_LABELS[item] || item
          : humanizeListScalar(item);
        return `${labels[key]}: ${displayValue}`;
      });
    summary = facts.length ? facts.join(' / ') : `${Object.keys(value).length}項目の設定`;
  }
  const text = `${summary}\n詳細は「${technicalSheetNameForRow(row)}」シートで確認`;
  return xlsxDiffValuePreview(text, text.length);
}

function humanizeListRowValue(
  row: DiffXlsxRow,
  side: 'source' | 'target',
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): string {
  if (isSensitiveSameDiffRow(row)) return SENSITIVE_SAME_VALUE_REDACTION;
  const missing = side === 'source'
    ? row.left === undefined || row.type === 'added'
    : row.right === undefined || row.type === 'removed';
  if (missing) return fieldValueOnlyExistsLabel(side, sourceBundle, targetBundle);
  const value = side === 'source' ? row.left : row.right;
  if (value && typeof value === 'object') {
    return summarizeListComplexValue(row, side, value as Record<string, unknown> | unknown[]);
  }
  if (typeof value === 'string') return xlsxDiffValuePreview(humanizeListScalar(value), value.length);
  return humanizeListScalar(value);
}

function fieldSettingHumanValue(
  detail: DiffXlsxFieldDetail,
  side: 'source' | 'target',
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): string {
  const row = detail.row;
  const missing = side === 'source'
    ? row.left === undefined || row.type === 'added'
    : row.right === undefined || row.type === 'removed';
  if (missing) {
    if (detail.settingKey !== '(field)') {
      return '（未設定）';
    }
    return fieldValueOnlyExistsLabel(side, sourceBundle, targetBundle);
  }
  const value = side === 'source' ? row.left : row.right;
  if (detail.settingKey === '(field)') {
    const summary = conciseFieldDefinition(value);
    return summary || '要約できない形式です。差分IDから「差分一覧」、または「フィールド技術明細」を確認してください。';
  }
  return humanizeFieldSettingValue(value, detail.settingKey);
}

function fieldSettingReviewGuidance(detail: DiffXlsxFieldDetail): string {
  if (detail.settingKey === '(field)' && detail.row.type === 'added') {
    return '入力画面・権限・一覧・外部連携での利用有無を確認してください。';
  }
  if (detail.settingKey === '(field)' && detail.row.type === 'removed') {
    return '保存済みデータ・一覧・外部連携からの参照有無を確認してください。';
  }
  if (detail.settingKey === 'required' || detail.settingKey.endsWith('.required')) {
    return detail.row.right === true
      ? '既存データの未入力有無と、入力画面・外部連携の入力条件を確認してください。'
      : '未入力を許可する設定への変更を確認してください。';
  }
  if (detail.settingKey === 'options' || detail.settingKey.startsWith('options.')) {
    return '既存値・絞り込み条件・連携で使用している選択肢を確認してください。';
  }
  if (['type', 'code'].includes(detail.settingKey) || /\.(?:type|code)$/.test(detail.settingKey)) {
    return '保存済みデータとAPI・外部連携で使用している型・コードを確認してください。';
  }
  if (/^(?:lookup|referenceTable)(?:\.|$)/.test(detail.settingKey)) {
    return '参照先アプリ、キー、コピー項目を確認してください。';
  }
  return '変更前後の設定値と利用箇所を確認してください。';
}

function fieldDetailReviewNote(detail: DiffXlsxFieldDetail): string {
  const notes = [rowNote(detail.row), fieldSettingReviewGuidance(detail)]
    .map((note) => note.trim())
    .filter(Boolean);
  return notes.filter((note, index) => !notes.some((other, otherIndex) => otherIndex < index && other.includes(note))).join(' / ');
}

interface DiffRowHeightCell {
  value: unknown;
  width: number;
}

function visualTextWidth(value: string): number {
  let width = 0;
  for (const char of value) {
    if (char === '\t') width += 4;
    else width += char.codePointAt(0)! <= 0xff ? 1 : 2;
  }
  return width;
}

function estimatedWrappedLines(value: unknown, columnWidth: number): number {
  const capacity = Math.max(8, Math.floor(columnWidth - 2));
  return String(value || '').split(/\r?\n/).reduce((total, line) => (
    total + Math.max(1, Math.ceil(visualTextWidth(line) / capacity))
  ), 0);
}

function readableDiffRowHeight(cells: DiffRowHeightCell[], maxHeight = 110): number {
  const maxLines = cells.reduce((max, cell) => (
    Math.max(max, estimatedWrappedLines(cell.value, cell.width))
  ), 1);
  // Meiryo 11pt の本文に上下の余白を残し、折り返し1行ごとに十分な行間を確保する。
  return Math.min(maxHeight, 26 + Math.max(0, maxLines - 1) * 14);
}

function summarizeRows(rows: DiffXlsxRow[]) {
  const counts = {
    actual: 0,
    added: 0,
    removed: 0,
    changed: 0,
    moved: 0,
    same: 0,
    reference: 0
  };
  for (const row of rows) {
    if (row._displayOnly) { counts.reference += 1; continue; }
    if (row.type === 'same') { counts.same += 1; continue; }
    counts.actual += 1;
    if (row.type === 'added') counts.added += 1;
    else if (row.type === 'removed') counts.removed += 1;
    else counts.changed += 1;
    if (row.moved || row.type === 'moved') counts.moved += 1;
  }
  return {
    ...counts,
    contentChanged: Math.max(0, counts.changed - counts.moved)
  };
}

function issueMessage(issue: DiffXlsxFetchIssue): string {
  if (issue.message) return String(issue.message);
  const details = [issue.sourceError ? `比較元: ${issue.sourceError}` : '', issue.targetError ? `比較先: ${issue.targetError}` : ''].filter(Boolean);
  return details.join(' / ') || '設定を取得できませんでした';
}

function partialFileDetails(issue: DiffXlsxPartialIssue): string {
  return (issue.files || []).map((file) => {
    const identity = file.fileName || file.fileKey || '(対象不明)';
    const reason = file.reason || file.detail || '';
    return reason ? `${identity}: ${reason}` : identity;
  }).join('\n');
}

function bundleEnvironmentLabel(bundle?: DiffXlsxBundle): string {
  if (!bundle) return '未記録';
  return `${bundle?.guestId ? `ゲスト ${bundle.guestId}` : '通常スペース'} / ${bundle?.preview ? 'プレビュー' : '運用'}設定`;
}

function completenessLabel(
  fetchIssues: DiffXlsxFetchIssue[],
  partialIssues: DiffXlsxPartialIssue[],
  truncation: DiffXlsxTruncation | null
): string {
  const reasons: string[] = [];
  if (fetchIssues.length) reasons.push(`取得失敗 ${fetchIssues.length}件`);
  if (partialIssues.length) reasons.push(`一部未検証 ${partialIssues.length}件`);
  if (truncation) {
    const sections = truncation.sections || [];
    const partial = sections.filter((section) => truncationScanStatusOf(section) === 'partial').length;
    const unscanned = sections.filter((section) => truncationScanStatusOf(section) === 'unscanned').length;
    if (partial) reasons.push(`部分走査 ${partial}セクション`);
    if (unscanned) reasons.push(`未走査 ${unscanned}セクション`);
    if (!partial && !unscanned) reasons.push('件数上限による省略あり');
  }
  return reasons.length ? `不完全（${reasons.join(' / ')}）` : '完全（選択範囲を走査済み）';
}

function sectionCompletenessLabel(key: string, ctx: DiffXlsxContext): string {
  if ((ctx.fetchIssues || []).some((issue) => (issue.sectionKey || issue.section) === key)) return '取得失敗あり';
  const status = (ctx.truncation?.sections || [])
    .find((section) => (section.sectionKey || section.section) === key);
  if (status) {
    const scanStatus = truncationScanStatusOf(status);
    if (scanStatus === 'unscanned') return '未走査';
    if (scanStatus === 'partial') return '部分走査';
    if (Number(status.omittedDiffCount ?? status.droppedDiff ?? 0) > 0) return '走査済み・一部省略';
  }
  if ((ctx.partialIssues || []).some((issue) => (issue.sectionKey || issue.section) === key)) return '一部未検証';
  return '走査済み';
}

function fieldComparisonSummary(
  ctx: DiffXlsxContext,
  fieldCount: number,
  settingDiffCount: number,
  unstructuredFieldDiffCount: number
): string {
  const fieldSelected = (ctx.scopes || []).includes('fieldSettings')
    || (ctx.rows || []).some((row) => (row.sectionKey || row.section) === 'fieldSettings');
  if (!fieldSelected) return '比較対象外';

  const fieldTruncation = (ctx.truncation?.sections || [])
    .find((section) => (section.sectionKey || section.section) === 'fieldSettings');
  const fieldScanStatus = fieldTruncation ? truncationScanStatusOf(fieldTruncation) : null;
  const fieldOmittedDiff = Number(fieldTruncation?.omittedDiffCount ?? fieldTruncation?.droppedDiff ?? 0);
  const legacyUnknownTruncation = !!ctx.truncation?.truncated && !(ctx.truncation.sections || []).length;
  const fieldIncomplete = (ctx.fetchIssues || []).some((issue) => (issue.sectionKey || issue.section) === 'fieldSettings')
    || (ctx.partialIssues || []).some((issue) => (issue.sectionKey || issue.section) === 'fieldSettings')
    || legacyUnknownTruncation
    || fieldScanStatus === 'partial'
    || fieldScanStatus === 'unscanned';
  const known = [
    fieldCount ? `${fieldCount}フィールド / ${settingDiffCount}件の差分明細` : '',
    unstructuredFieldDiffCount ? `構造化できない差分 ${unstructuredFieldDiffCount}件` : ''
  ].filter(Boolean).join('、');
  if (fieldIncomplete) return `未判定${known ? `（確認できた範囲: ${known}）` : '（取得・走査が不完全）'}`;
  if (fieldScanStatus === 'complete' && fieldOmittedDiff > 0) {
    return `${known || '確認できた差分 0件'}（走査済み・一部未収録 ${fieldOmittedDiff}件）`;
  }
  if (unstructuredFieldDiffCount) return `${known}。技術明細を確認してください`;
  if (fieldCount) return `${fieldCount}フィールド / ${settingDiffCount}件の差分明細`;
  return ctx.exportMode === 'filtered' ? '0件（この出力範囲内）' : '0件（走査済み）';
}

function summarySectionKeys(ctx: DiffXlsxContext, grouped: Map<string, DiffXlsxRow[]>): string[] {
  const keys = new Set<string>();
  const add = (value: unknown) => {
    const key = String(value || '').trim();
    if (key) keys.add(key);
  };
  (ctx.scopes || []).forEach(add);
  grouped.forEach((_rows, key) => add(key));
  (ctx.fetchIssues || []).forEach((issue) => add(issue.sectionKey || issue.section));
  (ctx.partialIssues || []).forEach((issue) => add(issue.sectionKey || issue.section));
  (ctx.truncation?.sections || []).forEach((section) => add(section.sectionKey || section.section));
  const known = SECTION_DEFS.map((section) => section.key).filter((key) => keys.has(key));
  const unknown = [...keys].filter((key) => !SECTION_ORDER_BY_KEY.has(key));
  return [...known, ...unknown];
}

function sectionCountBreakdown(rows: DiffXlsxRow[]): string {
  const counts = summarizeRows(rows);
  return [
    `追加 ${counts.added}`,
    `削除 ${counts.removed}`,
    `内容変更 ${counts.contentChanged}`,
    `移動 ${counts.moved}`,
    `同一 ${counts.same}`,
    `参考 ${counts.reference}`
  ].join(' / ');
}

interface DiffXlsxSheetGuide {
  name: string;
  purpose: string;
  useWhen: string;
  targetCell: string;
}

function sectionSheetName(key: string): string {
  return key === 'fieldSettings' ? 'フィールド技術明細' : sectionLabelOf(key);
}

function buildSheetGuides(
  ctx: DiffXlsxContext,
  grouped: Map<string, DiffXlsxRow[]>,
  fieldCount: number
): DiffXlsxSheetGuide[] {
  const hasIssues = !!((ctx.fetchIssues || []).length
    || (ctx.partialIssues || []).length
    || ctx.truncation?.truncated);
  const guides: DiffXlsxSheetGuide[] = [{
    name: '概要',
    purpose: '比較結果の判定、件数、比較条件、取得状態を確認できます。',
    useWhen: hasIssues
      ? '最初に確認します。不完全な範囲は「取得・未検証」も確認します。'
      : fieldCount
        ? '最初に確認し、フィールドは「フィールド差分要約」、収録された差分は「差分一覧」へ進みます。'
        : '最初に確認し、収録された差分は「差分一覧」へ進みます。',
    targetCell: 'A1'
  }];
  if (hasIssues) {
    guides.push({
      name: '取得・未検証',
      purpose: '取得失敗、一部未検証、件数上限の対象と理由を確認できます。',
      useWhen: '概要の取得状態が「不完全」または結果が「比較不完全」のときに確認します。',
      targetCell: 'A3'
    });
  }
  if (fieldCount) {
    guides.push(
      {
        name: 'フィールド差分要約',
        purpose: '差分があるフィールドと主な変更を、フィールド単位で確認できます。',
        useWhen: '確認するフィールドを絞り込み、詳細またはレビュー入力へ進むときに使います。',
        targetCell: 'C4'
      },
      {
        name: 'フィールド差分詳細',
        purpose: 'フィールド設定ごとの変更前後と確認事項を確認できます。',
        useWhen: '設定単位の内容を確認し、差分IDからレビュー入力へ進むときに使います。',
        targetCell: 'B4'
      }
    );
  }
  guides.push({
    name: '差分一覧',
    purpose: 'このブックに収録された差分と変更前後の値を一覧で確認できます。',
    useWhen: '黄色の列に確認状況、対応判断、担当者、コメントを記録するときに使います。',
    targetCell: (ctx.rows || []).length ? 'I4' : 'A3'
  });
  for (const key of grouped.keys()) {
    const name = sectionSheetName(key);
    const isFieldTechnical = key === 'fieldSettings';
    guides.push({
      name,
      purpose: isFieldTechnical
        ? 'フィールド設定の技術パスと原データを確認できます。'
        : `${sectionLabelOf(key)}の技術パスと原データを確認できます。`,
      useWhen: isFieldTechnical
        ? '人向けの要約だけでは判断できない場合に、技術的な根拠を確認します。'
        : '差分一覧だけでは判断できない場合に、技術的な根拠を確認します。',
      targetCell: 'A4'
    });
  }
  return guides;
}

function sheetGuideBand(purpose: string, next: string): string {
  return `このシートで分かること：${purpose}\n使い方・次に見る場所：${next}`;
}

function buildSummarySheet(
  ctx: DiffXlsxContext,
  grouped: Map<string, DiffXlsxRow[]>,
  fieldCount: number,
  settingDiffCount: number,
  unstructuredFieldDiffCount: number
): XlsxSheet {
  const rows = ctx.rows || [];
  const fetchIssues = ctx.fetchIssues || [];
  const partialIssues = ctx.partialIssues || [];
  const counts = summarizeRows(rows);
  const truncation = ctx.truncation?.truncated ? ctx.truncation : null;
  const incomplete = fetchIssues.length > 0 || partialIssues.length > 0 || !!truncation;
  const verdict = incomplete
    ? '比較不完全（差分なしとは判断できません）'
    : counts.actual > 0 ? '差分あり' : '差分なし';
  const completeness = completenessLabel(fetchIssues, partialIssues, truncation);
  const comparisonBanner = `${appLabel(ctx.sourceBundle) || '比較元'}  →  ${appLabel(ctx.targetBundle) || '比較先'}`;
  const sensitiveSections = [...new Set(rows
    .filter((row) => !row._displayOnly && row.type !== 'same' && SENSITIVE_DIFF_SECTION_KEYS.has(String(row.sectionKey || '')))
    .map((row) => sectionLabelOf(String(row.sectionKey || ''))))];
  const redactedSensitiveSections = [...new Set(rows
    .filter((row) => isSensitiveSameDiffRow(row))
    .map((row) => sectionLabelOf(String(row.sectionKey || ''))))];
  const fieldStatus = fieldComparisonSummary(ctx, fieldCount, settingDiffCount, unstructuredFieldDiffCount);
  const fieldStatusIncomplete = fieldStatus.startsWith('未判定') || fieldStatus.includes('一部未収録');
  const sheetGuides = buildSheetGuides(ctx, grouped, fieldCount);
  const fieldLinkTarget = fieldCount
    ? { sheet: 'フィールド差分要約', cell: 'C4', label: 'フィールド差分を見る' }
    : unstructuredFieldDiffCount
      ? { sheet: 'フィールド技術明細', cell: 'A4', label: '技術明細を見る' }
      : null;
  const overviewNextPlaces = [
    '最初に確認します。',
    fieldCount ? 'フィールドは「フィールド差分要約」へ進みます。' : '',
    rows.length ? '収録された差分とレビュー入力は「差分一覧」へ進みます。' : '差分一覧には見出しのみ出力されています。',
    incomplete ? '不完全な範囲は「取得・未検証」で確認します。' : ''
  ].filter(Boolean).join(' ');
  const overviewRow = {
    guideBand: 4,
    verdict: 5,
    total: 6,
    added: 7,
    removed: 8,
    contentChanged: 9,
    moved: 10,
    same: 11,
    comparisonTitle: 12,
    comparisonApps: 13,
    comparisonEnvironment: 14,
    normalization: 18,
    fieldStatus: 19,
    usage: 20
  } as const;

  const sheetRows: (string | number | null)[][] = [
    ['kintone 設定差分比較レポート', '', '', ''],
    [comparisonBanner, '', '', ''],
    ['生成日時', humanDateTime(ctx.generatedAt || Date.now()), '比較日時', humanDateTime(ctx.comparedAt)],
    ['比較元取得日時', humanDateTime(ctx.sourceBundle?.fetchedAt), '比較先取得日時', humanDateTime(ctx.targetBundle?.fetchedAt)],
    [sheetGuideBand(
      'この出力範囲の結果、取得状態、収録差分数、比較条件を確認できます。',
      overviewNextPlaces
    ), '', '', ''],
    ['この出力範囲の結果', verdict, '取得状態', completeness],
    ['収録差分数', counts.actual, '取得失敗', fetchIssues.length],
    ['追加（比較先のみ）', counts.added, '一部未検証', partialIssues.length],
    ['削除（比較元のみ）', counts.removed, '件数上限', truncation ? '省略あり' : '省略なし'],
    ['内容変更（移動を除く）', counts.contentChanged, '', ''],
    ['移動', counts.moved, '', ''],
    ['同一', counts.same, '', ''],
    ['比較の向き・条件', '', '', ''],
    ['比較元', appLabel(ctx.sourceBundle) || '未記録', '比較先', appLabel(ctx.targetBundle) || '未記録'],
    ['環境', bundleEnvironmentLabel(ctx.sourceBundle), '環境', bundleEnvironmentLabel(ctx.targetBundle)],
    ['比較方向', '比較元 → 比較先', '出力範囲', ctx.exportLabel || (ctx.exportMode === 'filtered' ? '表示中（フィルタ適用後）' : '全件')],
    ['比較対象', scopeLabel(ctx.scopes), '収録内容', xlsxContentLabel(rows)],
    ['フィルタ条件', filterDescriptionLabel(ctx), '無視キー', String(ctx.ignoreKeys || '').trim() || 'なし'],
    ['正規化設定', normalizationLabel(ctx.normalizationPresetState), '自動判定', '重要度、業務への影響、対応要否は自動判定しません'],
    ['フィールド差分', fieldStatus, '', fieldLinkTarget?.label || ''],
    ['使い方', fieldCount
      ? '①「フィールド差分要約」で対象を確認　②「フィールド差分詳細」で変更前後を確認　③「差分一覧」で確認状況と対応判断を入力　※パスは技術明細シートにのみ掲載'
      : '①概要で結果と取得状態を確認　②「差分一覧」で変更前後を確認　③黄色い4列に確認状況・対応判断・担当者・コメントを入力　※パスは技術明細シートにのみ掲載', '', rows.length ? '③ レビュー入力へ' : ''],
    ['', '', '', '']
  ];
  const guideTitleRow = sheetRows.length;
  sheetRows.push(['シート案内', '', '', '']);
  const guideHeaderRow = sheetRows.length;
  sheetRows.push(['シート名', '目的', '利用場面', '']);
  const guideStartRow = sheetRows.length;
  for (const guide of sheetGuides) {
    sheetRows.push([guide.name, guide.purpose, guide.useWhen, '']);
  }
  const guideEndRow = sheetRows.length;
  sheetRows.push(['', '', '', '']);
  const sectionTitleRow = sheetRows.length;
  sheetRows.push(['セクション別集計', '', '', '']);
  const sectionHeaderRow = sheetRows.length;
  sheetRows.push(['セクション', '収録行数', '客観内訳', '走査・取得状態']);
  for (const key of summarySectionKeys(ctx, grouped)) {
    const list = grouped.get(key) || [];
    sheetRows.push([
      sectionLabelOf(key),
      list.length,
      sectionCountBreakdown(list),
      sectionCompletenessLabel(key, ctx)
    ]);
  }

  const warningRows: number[] = [];
  const pushWarning = (label: string, message: string) => {
    warningRows.push(sheetRows.length);
    sheetRows.push([label, message, '', '']);
  };
  if (truncation) {
    const truncationSections = truncation.sections || [];
    const partial = truncationSections.filter((section) => truncationScanStatusOf(section) === 'partial');
    const unscanned = truncationSections.filter((section) => truncationScanStatusOf(section) === 'unscanned');
    const rangeNotes = [
      partial.length
        ? `部分走査・総件数不明（表示件数は下限）: ${partial.map(truncationSectionName).join('・')}。`
        : '',
      unscanned.length
        ? `未走査・件数不明: ${unscanned.map(truncationSectionName).join('・')}。`
        : ''
    ].filter(Boolean).join(' ');
    pushWarning('⚠ 件数上限', `差分上限 ${truncation.diffLimit || '-'} 件に到達。未収録の差分があるため、このブックだけで反映判断をしないでください。${rangeNotes ? ` ${rangeNotes}` : ''}`);
  }
  if (partialIssues.length) {
    pushWarning('⚠ 一部未検証', `${partialIssues.length} 件。JS/CSS等の本文を取得できず、代替情報で比較した項目があります。`);
  }
  if (fetchIssues.length) {
    pushWarning('⚠ 取得失敗', `${fetchIssues.length} 件。該当セクションは比較できていません。`);
  }
  if (sensitiveSections.length) {
    pushWarning('🔒 取扱注意', `${sensitiveSections.join('・')} の差分値が含まれます。共有先と保管場所を確認してください。`);
  }
  if (redactedSensitiveSections.length) {
    pushWarning('🔒 機密値省略', `${redactedSensitiveSections.join('・')} の同一行は、機密値を重複収録しないため値を省略しています。`);
  }

  const rowStyles: XlsxRowStyle[] = sheetRows.map(() => 'normal');
  const rowHeights: number[] = [32, 24, 0, 0, 44];
  rowHeights[overviewRow.normalization] = readableDiffRowHeight([
    { value: sheetRows[overviewRow.normalization][1], width: 54 },
    { value: sheetRows[overviewRow.normalization][3], width: 54 }
  ], 72);
  for (let rowIndex = guideStartRow; rowIndex < guideEndRow; rowIndex += 1) rowHeights[rowIndex] = 40;
  for (const rowIndex of warningRows) {
    rowHeights[rowIndex] = readableDiffRowHeight([
      { value: sheetRows[rowIndex][0], width: 24 },
      { value: sheetRows[rowIndex][1], width: 120 }
    ], 132);
  }
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = sheetRows.map(() => []);
  cellStyles[0][0] = 'title';
  cellStyles[1][0] = 'sectionHeader';
  cellStyles[overviewRow.guideBand][0] = 'info';
  cellStyles[overviewRow.verdict] = [
    'sectionHeader',
    incomplete ? 'kpiDanger' : 'kpiGood',
    'sectionHeader',
    incomplete ? 'kpiDanger' : 'kpiGood'
  ];
  for (const rowIndex of [
    overviewRow.total,
    overviewRow.added,
    overviewRow.removed,
    overviewRow.contentChanged,
    overviewRow.moved,
    overviewRow.same
  ]) {
    cellStyles[rowIndex] = ['info', 'kpiGood'];
  }
  cellStyles[overviewRow.total][2] = 'info';
  cellStyles[overviewRow.total][3] = fetchIssues.length > 0 ? 'kpiDanger' : 'kpiGood';
  cellStyles[overviewRow.added][2] = 'info';
  cellStyles[overviewRow.added][3] = partialIssues.length > 0 ? 'kpiDanger' : 'kpiGood';
  cellStyles[overviewRow.removed][2] = 'info';
  cellStyles[overviewRow.removed][3] = truncation ? 'kpiDanger' : 'kpiGood';
  cellStyles[overviewRow.comparisonApps][1] = 'source';
  cellStyles[overviewRow.comparisonApps][3] = 'target';
  cellStyles[overviewRow.comparisonEnvironment][1] = 'source';
  cellStyles[overviewRow.comparisonEnvironment][3] = 'target';
  cellStyles[overviewRow.comparisonTitle][0] = 'sectionHeader';
  cellStyles[guideTitleRow][0] = 'sectionHeader';
  cellStyles[guideHeaderRow] = ['sectionHeader', 'sectionHeader', 'sectionHeader', 'sectionHeader'];
  for (let rowIndex = guideStartRow; rowIndex < guideEndRow; rowIndex += 1) {
    cellStyles[rowIndex][0] = 'hyperlink';
  }
  cellStyles[sectionTitleRow][0] = 'sectionHeader';
  cellStyles[sectionHeaderRow] = ['sectionHeader', 'sectionHeader', 'sectionHeader', 'sectionHeader'];
  cellStyles[overviewRow.fieldStatus] = ['info', fieldStatusIncomplete ? 'kpiDanger' : 'kpiGood'];
  if (fieldLinkTarget) cellStyles[overviewRow.fieldStatus][3] = 'hyperlink';
  if (rows.length) cellStyles[overviewRow.usage][3] = 'hyperlink';
  for (const index of warningRows) cellStyles[index][0] = 'warning';
  const merges = [
    'A1:D1', 'A2:D2', `A${overviewRow.guideBand + 1}:D${overviewRow.guideBand + 1}`, `A${overviewRow.comparisonTitle + 1}:D${overviewRow.comparisonTitle + 1}`,
    `A${guideTitleRow + 1}:D${guideTitleRow + 1}`,
    `C${guideHeaderRow + 1}:D${guideHeaderRow + 1}`,
    `A${sectionTitleRow + 1}:D${sectionTitleRow + 1}`
  ];
  for (let rowIndex = guideStartRow; rowIndex < guideEndRow; rowIndex += 1) {
    merges.push(`C${rowIndex + 1}:D${rowIndex + 1}`);
  }
  for (const index of warningRows) merges.push(`B${index + 1}:D${index + 1}`);
  return {
    name: '概要',
    autoFilter: false,
    freezeHeader: false,
    colWidths: [24, 54, 22, 54],
    rows: sheetRows,
    rowStyles,
    cellStyles,
    rowHeights,
    merges,
    internalHyperlinks: [
      ...(fieldLinkTarget ? [{
        ref: `D${overviewRow.fieldStatus + 1}`,
        targetSheet: fieldLinkTarget.sheet,
        targetCell: fieldLinkTarget.cell,
        tooltip: '差分があるフィールドの一覧へ移動'
      }] : []),
      ...(rows.length ? [{
        ref: `D${overviewRow.usage + 1}`,
        targetSheet: '差分一覧',
        targetCell: 'I4',
        tooltip: '確認状況・対応判断・担当者・コメントの入力欄へ移動'
      }] : []),
      ...sheetGuides.map((guide, index) => ({
        ref: `A${guideStartRow + index + 1}`,
        targetSheet: guide.name,
        targetCell: guide.targetCell,
        tooltip: `${guide.name}へ移動`
      }))
    ],
    showGridLines: false,
    print: {
      orientation: 'portrait',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 2 }
    }
  };
}

const REVIEW_PROGRESS_VALUES = ['未確認', '確認中', '確認済み', '対象外'];
const ACTION_DECISION_VALUES = ['未判断', '要対応', '対応不要', '保留', '対象外'];

function stableDifferenceId(row: DiffXlsxRow, seen: Map<string, number>): string {
  const redactedIdentityValue = isSensitiveSameDiffRow(row) ? 'SENSITIVE_SAME_VALUE_REDACTED' : null;
  const leftDigest = shortStableHash(redactedIdentityValue ?? stableStringify(row.left) ?? 'undefined');
  const rightDigest = shortStableHash(redactedIdentityValue ?? stableStringify(row.right) ?? 'undefined');
  const identity = [
    row.sectionKey || row.section || '',
    row.type || '',
    row.path || '',
    row.label || '',
    row.moved ? 'moved' : '',
    leftDigest,
    rightDigest
  ].join('\u001f');
  const base = `D-${shortStableHash(identity)}`;
  const occurrence = (seen.get(base) || 0) + 1;
  seen.set(base, occurrence);
  return occurrence === 1 ? base : `${base}-${occurrence}`;
}

interface DiffXlsxDifferenceRef {
  id: string;
  rowNumber: number;
}

interface DiffXlsxTechnicalRef {
  sheetName: string;
  rowNumber: number;
}

function buildDifferenceRefs(rows: DiffXlsxRow[]): DiffXlsxDifferenceRef[] {
  const refs: DiffXlsxDifferenceRef[] = [];
  const seenIds = new Map<string, number>();
  rows.forEach((row, index) => refs.push({
    id: stableDifferenceId(row, seenIds),
    rowNumber: index + 4
  }));
  return refs;
}

function buildTechnicalRefs(rows: DiffXlsxRow[]): DiffXlsxTechnicalRef[] {
  const sectionCounts = new Map<string, number>();
  return rows.map((row) => {
    const key = sectionKeyOfRow(row);
    const indexInSection = sectionCounts.get(key) || 0;
    sectionCounts.set(key, indexInSection + 1);
    return {
      sheetName: sectionSheetName(key),
      rowNumber: indexInSection + 4
    };
  });
}

function directionalValueHeader(side: 'source' | 'target', bundle?: DiffXlsxBundle): string {
  const direction = side === 'source' ? '比較元' : '比較先';
  const label = appLabel(bundle);
  return label ? `${direction}の値\n${label}` : `${direction}の値`;
}

function buildListSheet(
  rows: DiffXlsxRow[],
  name = '差分一覧',
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle,
  differenceRefs?: DiffXlsxDifferenceRef[],
  technicalRefs?: DiffXlsxTechnicalRef[],
  fieldModel?: DiffXlsxFieldModel
): XlsxSheet {
  const headers = [
    'セクション', '項目', '変更種別', '存在状況', '差分ID',
    directionalValueHeader('source', sourceBundle), directionalValueHeader('target', targetBundle), '確認事項',
    '確認状況', '対応判断', '担当者', 'コメント'
  ];
  const groupHeader = [
    '差分対象', '', '変更の事実', '', '',
    '比較元（変更前）', '比較先（変更後）', '確認事項',
    'レビュー入力（黄色）', '', '', ''
  ];
  const guide = sheetGuideBand(
    'このブックに収録された差分、変更前後の値、確認事項を一覧で確認できます。',
    '黄色の列に確認状況・対応判断・担当者・コメントを入力します。差分IDから技術明細へ移動できます。値先頭の「[一部表示]」は技術明細または元データを確認します。'
  );
  const out: (string | number | null)[][] = [[guide, '', '', '', '', '', '', '', '', '', '', ''], groupHeader, headers];
  const rowStyles: XlsxRowStyle[] = ['normal', 'normal', 'normal'];
  const groupCellStyles: Array<XlsxCellStyle | undefined> = [];
  groupCellStyles[0] = 'sectionHeader';
  groupCellStyles[2] = 'info';
  groupCellStyles[5] = 'sourceGroup';
  groupCellStyles[6] = 'targetGroup';
  groupCellStyles[7] = 'info';
  groupCellStyles[8] = 'sectionHeader';
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [['info'], groupCellStyles, []];
  cellStyles[2][5] = 'headerDivider';
  const rowHeights: number[] = [44, 24, 42];
  const seenIds = new Map<string, number>();
  const fieldDetailByRowIndex = new Map((fieldModel?.details || []).map((detail) => [detail.rowIndex, detail]));
  for (const [rowIndex, row] of rows.entries()) {
    const fieldDetail = fieldDetailByRowIndex.get(rowIndex);
    const isFieldSettings = (row.sectionKey || row.section) === 'fieldSettings';
    const existence = rowExistenceLabel(row);
    const item = rowItemLabel(row, sourceBundle, targetBundle);
    const sourceValue = fieldDetail
      ? fieldSettingHumanValue(fieldDetail, 'source', sourceBundle, targetBundle)
      : isFieldSettings
        ? row.type === 'added'
          ? fieldValueOnlyExistsLabel('source', sourceBundle, targetBundle)
          : humanizeFieldSettingValue(row.left, '')
        : humanizeListRowValue(row, 'source', sourceBundle, targetBundle);
    const targetValue = fieldDetail
      ? fieldSettingHumanValue(fieldDetail, 'target', sourceBundle, targetBundle)
      : isFieldSettings
        ? row.type === 'removed'
          ? fieldValueOnlyExistsLabel('target', sourceBundle, targetBundle)
          : humanizeFieldSettingValue(row.right, '')
        : humanizeListRowValue(row, 'target', sourceBundle, targetBundle);
    const note = fieldDetail ? fieldDetailReviewNote(fieldDetail) : rowNote(row);
    const reviewable = !row._displayOnly && row.type !== 'same';
    out.push([
      sectionLabelOf(row.sectionKey || row.section || ''),
      item,
      rowTypeLabel(row),
      existence,
      differenceRefs?.[rowIndex]?.id || stableDifferenceId(row, seenIds),
      sourceValue,
      targetValue,
      note,
      reviewable ? '未確認' : '対象外',
      reviewable ? '未判断' : '対象外',
      '',
      ''
    ]);
    rowStyles.push('normal');
    const styles: Array<XlsxCellStyle | undefined> = [];
    styles[4] = 'hyperlink';
    styles[5] = 'sourceDivider';
    styles[6] = 'target';
    styles[7] = 'info';
    if (reviewable) {
      styles[8] = 'review';
      styles[9] = 'review';
      styles[10] = 'review';
      styles[11] = 'review';
    } else {
      styles[8] = 'info';
      styles[9] = 'info';
    }
    cellStyles.push(styles);
    rowHeights.push(readableDiffRowHeight([
      { value: sectionLabelOf(row.sectionKey || row.section || ''), width: 18 },
      { value: existence, width: 18 },
      { value: item, width: 30 },
      { value: sourceValue, width: 42 },
      { value: targetValue, width: 42 },
      { value: note, width: 32 }
    ]));
  }
  const dataValidations = rows.length
    ? [{
        sqref: `I4:I${rows.length + 3}`,
        values: REVIEW_PROGRESS_VALUES,
        promptTitle: '確認状況',
        prompt: '事実確認の進捗を選択してください'
      }, {
        sqref: `J4:J${rows.length + 3}`,
        values: ACTION_DECISION_VALUES,
        promptTitle: '対応判断',
        prompt: '人が判断した対応方針を選択してください'
      }]
    : [];
  return {
    name,
    rows: out,
    colWidths: [18, 30, 16, 18, 15, 42, 42, 32, 14, 14, 16, 28],
    rowStyles,
    cellStyles,
    headerRow: 3,
    freezeRows: 3,
    freezeColumns: 5,
    rowHeights,
    merges: ['A1:L1', 'A2:B2', 'C2:E2', 'I2:L2'],
    dataValidations,
    internalHyperlinks: rows.flatMap((_row, index) => {
      const target = technicalRefs?.[index];
      return target ? [{
        ref: `E${index + 4}`,
        targetSheet: target.sheetName,
        targetCell: `A${target.rowNumber}`,
        tooltip: '該当する技術明細へ移動'
      }] : [];
    }),
    showGridLines: false,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 2, to: 3 }
    }
  };
}

function buildSectionSheet(
  label: string,
  list: DiffXlsxRow[],
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle,
  differenceRefs?: DiffXlsxDifferenceRef[]
): XlsxSheet {
  const headers = [
    '差分ID', '変更種別', '存在状況', '項目', 'パス',
    directionalValueHeader('source', sourceBundle),
    directionalValueHeader('target', targetBundle),
    '確認事項'
  ];
  const groupHeader = [
    '差分の識別', '', '', '', '技術パス',
    '比較元（変更前）', '比較先（変更後）', '確認事項'
  ];
  const guide = sheetGuideBand(
    `${label}の技術パスと原データを確認できます。`,
    label === 'フィールド技術明細'
      ? '通常の確認は「フィールド差分詳細」、レビュー記録は同じ差分IDの「差分一覧」で行います。長文はセルを選択して数式バーでも確認し、「[一部表示]」または「…省略」がある場合は元データを確認します。'
      : '通常の確認は「差分一覧」で行い、要約だけでは判断できない場合にこのシートで根拠を確認します。長文はセルを選択して数式バーでも確認し、「[一部表示]」または「…省略」がある場合は元データを確認します。'
  );
  const rows: (string | number | null)[][] = [[guide, '', '', '', '', '', '', ''], groupHeader, headers];
  const rowStyles: XlsxRowStyle[] = ['normal', 'normal', 'normal'];
  const groupCellStyles: Array<XlsxCellStyle | undefined> = [];
  groupCellStyles[0] = 'sectionHeader';
  groupCellStyles[4] = 'info';
  groupCellStyles[5] = 'sourceGroup';
  groupCellStyles[6] = 'targetGroup';
  groupCellStyles[7] = 'info';
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [['info'], groupCellStyles, []];
  cellStyles[2][5] = 'headerDivider';
  const rowHeights: number[] = [44, 24, 42];
  const seenIds = new Map<string, number>();
  for (const [rowIndex, row] of list.entries()) {
    const existence = rowExistenceLabel(row);
    const item = rowItemLabel(row, sourceBundle, targetBundle);
    const sourceValue = rowValue(row, 'source');
    const targetValue = rowValue(row, 'target');
    const note = rowNote(row);
    rows.push([
      differenceRefs?.[rowIndex]?.id || stableDifferenceId(row, seenIds),
      rowTypeLabel(row),
      existence,
      item,
      row.path || '',
      sourceValue,
      targetValue,
      note
    ]);
    rowStyles.push('normal');
    const styles: Array<XlsxCellStyle | undefined> = [differenceRefs?.[rowIndex] ? 'hyperlink' : 'info'];
    styles[5] = 'sourceDivider';
    styles[6] = 'target';
    cellStyles.push(styles);
    rowHeights.push(readableDiffRowHeight([
      { value: existence, width: 18 },
      { value: item, width: 30 },
      { value: row.path || '', width: 34 },
      { value: sourceValue, width: 42 },
      { value: targetValue, width: 42 },
      { value: note, width: 32 }
    ], 264));
  }
  return {
    name: label,
    rows,
    colWidths: [15, 16, 18, 30, 34, 42, 42, 32],
    rowStyles,
    cellStyles,
    headerRow: 3,
    freezeRows: 3,
    freezeColumns: 4,
    rowHeights,
    merges: ['A1:H1', 'A2:D2'],
    internalHyperlinks: list.flatMap((_row, index) => {
      const target = differenceRefs?.[index];
      return target ? [{
        ref: `A${index + 4}`,
        targetSheet: '差分一覧',
        targetCell: `I${target.rowNumber}`,
        tooltip: '差分一覧の確認状況へ戻る'
      }] : [];
    }),
    showGridLines: false,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 2, to: 3 }
    }
  };
}

function fieldSummaryRootChangeType(
  summary: DiffXlsxFieldSummary,
  model: DiffXlsxFieldModel
): 'added' | 'removed' | null {
  const root = model.details.find((detail) => detail.fieldKey === summary.fieldKey && detail.settingKey === '(field)');
  return root?.row.type === 'added' || root?.row.type === 'removed' ? root.row.type : null;
}

function fieldSummaryChangeTypeLabel(
  summary: DiffXlsxFieldSummary,
  model: DiffXlsxFieldModel
): string {
  const rootType = fieldSummaryRootChangeType(summary, model);
  if (rootType === 'added') return 'フィールド追加';
  if (rootType === 'removed') return 'フィールド削除';
  return '設定変更';
}

function fieldSummaryExistenceLabel(
  summary: DiffXlsxFieldSummary,
  model: DiffXlsxFieldModel
): string {
  const rootType = fieldSummaryRootChangeType(summary, model);
  if (rootType === 'added') return '比較先のみ';
  if (rootType === 'removed') return '比較元のみ';
  return '両方';
}

function compactFieldSummaryValue(value: string): string {
  const compact = value.replace(/\r?\n/g, ' / ');
  if (compact.length <= 100) return compact;
  let keep = 99;
  if (keep > 0 && /[\uD800-\uDBFF]/.test(compact.charAt(keep - 1))) keep -= 1;
  return `${compact.slice(0, keep)}…`;
}

function fieldSummaryMainChanges(
  summary: DiffXlsxFieldSummary,
  model: DiffXlsxFieldModel,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): string {
  const details = model.details
    .filter((detail) => detail.fieldKey === summary.fieldKey)
    .sort((a, b) => a.settingKey.localeCompare(b.settingKey, 'ja')
      || String(a.row.type || '').localeCompare(String(b.row.type || ''), 'ja')
      || String(a.row.path || '').localeCompare(String(b.row.path || ''), 'ja'));
  const visible = details.slice(0, 3).map((detail) => {
    if (detail.settingKey === '(field)' && detail.row.type === 'added') {
      return `${detail.settingLabel}: フィールドを追加`;
    }
    if (detail.settingKey === '(field)' && detail.row.type === 'removed') {
      return `${detail.settingLabel}: フィールドを削除`;
    }
    const sourceValue = compactFieldSummaryValue(fieldSettingHumanValue(detail, 'source', sourceBundle, targetBundle));
    const targetValue = compactFieldSummaryValue(fieldSettingHumanValue(detail, 'target', sourceBundle, targetBundle));
    return `${detail.settingLabel}: ${sourceValue} → ${targetValue}`;
  });
  const more = details.length > visible.length ? `\nほか${details.length - visible.length}件` : '';
  return `${visible.join('\n')}${more}`;
}

function fieldSummaryReviewGuidance(summary: DiffXlsxFieldSummary, model: DiffXlsxFieldModel): string {
  const details = model.details
    .filter((detail) => detail.fieldKey === summary.fieldKey)
    .sort((a, b) => a.settingKey.localeCompare(b.settingKey, 'ja')
      || String(a.row.type || '').localeCompare(String(b.row.type || ''), 'ja')
      || String(a.row.path || '').localeCompare(String(b.row.path || ''), 'ja'));
  const unique = [...new Set(details.map(fieldSettingReviewGuidance))];
  const visible = unique.slice(0, 2);
  const more = unique.length > visible.length ? `\nほか${unique.length - visible.length}件の確認事項` : '';
  return `${visible.join('\n')}${more}`;
}

function buildFieldSummarySheet(
  model: DiffXlsxFieldModel,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle,
  differenceRefs?: DiffXlsxDifferenceRef[]
): XlsxSheet {
  const firstDetailRowByField = new Map<string, number>();
  const firstReviewRowByField = new Map<string, number>();
  model.details.forEach((detail, index) => {
    if (!firstDetailRowByField.has(detail.fieldKey)) firstDetailRowByField.set(detail.fieldKey, index + 4);
    if (!firstReviewRowByField.has(detail.fieldKey)) {
      firstReviewRowByField.set(detail.fieldKey, differenceRefs?.[detail.rowIndex]?.rowNumber || 4);
    }
  });
  const groupHeader = [
    '変更の状態', '',
    '差分フィールド', '', '',
    '変更内容', '',
    '確認事項',
    'ナビゲーション', ''
  ];
  const headers = [
    '変更種別', '存在状況',
    'フィールド名', 'フィールドコード', 'フィールド種別',
    '差分明細数', '主な変更', '確認事項', '詳細', 'レビュー'
  ];
  const guide = sheetGuideBand(
    '差分があるフィールドと主な変更を、フィールド単位で確認できます。',
    '「詳細」で設定単位の変更を確認し、「レビュー」から差分一覧の入力欄へ進みます。'
  );
  const rows: (string | number | null)[][] = [[guide, '', '', '', '', '', '', '', '', ''], groupHeader, headers];
  const rowStyles: XlsxRowStyle[] = ['normal', 'normal', 'normal'];
  const groupCellStyles: Array<XlsxCellStyle | undefined> = [];
  groupCellStyles[0] = 'sectionHeader';
  groupCellStyles[2] = 'sectionHeader';
  groupCellStyles[5] = 'info';
  groupCellStyles[7] = 'info';
  groupCellStyles[8] = 'info';
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [['info'], groupCellStyles, []];
  const rowHeights: number[] = [44, 24, 32];
  for (const summary of model.summaries) {
    const changeType = fieldSummaryChangeTypeLabel(summary, model);
    const existence = fieldSummaryExistenceLabel(summary, model);
    const mainChanges = fieldSummaryMainChanges(summary, model, sourceBundle, targetBundle);
    const reviewGuidance = fieldSummaryReviewGuidance(summary, model);
    rows.push([
      changeType,
      existence,
      summary.fieldName,
      summary.fieldCode,
      summary.fieldType,
      summary.diffCount,
      mainChanges,
      reviewGuidance,
      `詳細を見る（${summary.diffCount}件）`,
      'レビュー入力へ'
    ]);
    rowStyles.push('normal');
    const styles: Array<XlsxCellStyle | undefined> = [];
    styles[3] = 'info';
    styles[4] = 'info';
    styles[5] = 'info';
    styles[7] = 'info';
    styles[8] = 'hyperlink';
    styles[9] = 'hyperlink';
    cellStyles.push(styles);
    rowHeights.push(readableDiffRowHeight([
      { value: changeType, width: 18 },
      { value: existence, width: 18 },
      { value: summary.fieldName, width: 28 },
      { value: summary.fieldCode, width: 28 },
      { value: summary.fieldType, width: 18 },
      { value: mainChanges, width: 56 },
      { value: reviewGuidance, width: 42 }
    ]));
  }
  return {
    name: 'フィールド差分要約',
    rows,
    colWidths: [18, 18, 28, 28, 18, 12, 56, 42, 20, 18],
    rowStyles,
    cellStyles,
    headerRow: 3,
    freezeRows: 3,
    freezeColumns: 5,
    rowHeights,
    merges: ['A1:J1', 'A2:B2', 'C2:E2', 'F2:G2', 'I2:J2'],
    internalHyperlinks: [
      ...model.summaries.map((summary, index) => ({
        ref: `I${index + 4}`,
        targetSheet: 'フィールド差分詳細',
        targetCell: `B${firstDetailRowByField.get(summary.fieldKey) || 4}`,
        tooltip: `${summary.fieldName}の詳細差分へ移動`
      })),
      ...model.summaries.map((summary, index) => ({
        ref: `J${index + 4}`,
        targetSheet: '差分一覧',
        targetCell: `I${firstReviewRowByField.get(summary.fieldKey) || 4}`,
        tooltip: `${summary.fieldName}のレビュー入力欄へ移動`
      }))
    ],
    showGridLines: false,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 2, to: 3 }
    }
  };
}

function buildFieldDetailSheet(
  model: DiffXlsxFieldModel,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle,
  differenceRefs?: DiffXlsxDifferenceRef[]
): XlsxSheet {
  const summaryRowByField = new Map(model.summaries.map((summary, index) => [summary.fieldKey, index + 4]));
  const groupHeader = [
    '差分の識別', '差分フィールド', '',
    '設定差分', '', '',
    '比較元（変更前）', '比較先（変更後）',
    '確認事項',
    'ナビゲーション'
  ];
  const headers = [
    '差分ID', 'フィールド名', 'フィールドコード',
    '設定項目', '変更種別', '存在状況',
    directionalValueHeader('source', sourceBundle),
    directionalValueHeader('target', targetBundle),
    '確認事項', '要約へ'
  ];
  const guide = sheetGuideBand(
    '各フィールドの設定項目ごとに、変更種別・存在状況・変更前後の値を確認できます。',
    '差分IDから「差分一覧」のレビュー入力へ進み、「要約へ」でフィールド単位の一覧へ戻ります。値先頭の「[一部表示]」は技術明細または元データを確認します。'
  );
  const rows: (string | number | null)[][] = [[guide, '', '', '', '', '', '', '', '', ''], groupHeader, headers];
  const rowStyles: XlsxRowStyle[] = ['normal', 'normal', 'normal'];
  const groupCellStyles: Array<XlsxCellStyle | undefined> = [];
  groupCellStyles[0] = 'info';
  groupCellStyles[1] = 'sectionHeader';
  groupCellStyles[3] = 'info';
  groupCellStyles[6] = 'sourceGroup';
  groupCellStyles[7] = 'targetGroup';
  groupCellStyles[8] = 'info';
  groupCellStyles[9] = 'info';
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [['info'], groupCellStyles, []];
  cellStyles[2][6] = 'headerDivider';
  const rowHeights: number[] = [44, 24, 42];
  for (const detail of model.details) {
    const changeType = rowTypeLabel(detail.row);
    const existence = rowExistenceLabel(detail.row);
    const sourceValue = fieldSettingHumanValue(detail, 'source', sourceBundle, targetBundle);
    const targetValue = fieldSettingHumanValue(detail, 'target', sourceBundle, targetBundle);
    const note = fieldDetailReviewNote(detail);
    const diffRef = differenceRefs?.[detail.rowIndex];
    rows.push([
      diffRef?.id || '',
      detail.fieldName,
      detail.fieldCode,
      detail.settingLabel,
      changeType,
      existence,
      sourceValue,
      targetValue,
      note,
      '要約へ戻る'
    ]);
    rowStyles.push('normal');
    const styles: Array<XlsxCellStyle | undefined> = ['hyperlink'];
    styles[2] = 'info';
    styles[8] = 'info';
    styles[9] = 'hyperlink';
    styles[6] = 'sourceDivider';
    styles[7] = 'target';
    cellStyles.push(styles);
    rowHeights.push(readableDiffRowHeight([
      { value: detail.fieldName, width: 30 },
      { value: detail.fieldCode, width: 32 },
      { value: detail.settingLabel, width: 34 },
      { value: changeType, width: 18 },
      { value: existence, width: 18 },
      { value: sourceValue, width: 44 },
      { value: targetValue, width: 44 },
      { value: note, width: 40 }
    ], 160));
  }
  return {
    name: 'フィールド差分詳細',
    rows,
    colWidths: [15, 30, 32, 34, 18, 18, 44, 44, 40, 16],
    rowStyles,
    cellStyles,
    headerRow: 3,
    freezeRows: 3,
    freezeColumns: 6,
    rowHeights,
    merges: ['A1:J1', 'B2:C2', 'D2:F2'],
    internalHyperlinks: [
      ...model.details.map((detail, index) => ({
        ref: `A${index + 4}`,
        targetSheet: '差分一覧',
        targetCell: `I${differenceRefs?.[detail.rowIndex]?.rowNumber || 4}`,
        tooltip: `${detail.fieldName}のレビュー入力欄へ移動`
      })),
      ...model.details.map((detail, index) => ({
        ref: `J${index + 4}`,
        targetSheet: 'フィールド差分要約',
        targetCell: `C${summaryRowByField.get(detail.fieldKey) || 4}`,
        tooltip: `${detail.fieldName}の要約へ戻る`
      }))
    ],
    showGridLines: false,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 2, to: 3 }
    }
  };
}

function buildIssuesSheet(ctx: DiffXlsxContext): XlsxSheet | null {
  const fetchIssues = ctx.fetchIssues || [];
  const partialIssues = ctx.partialIssues || [];
  const truncation = ctx.truncation?.truncated ? ctx.truncation : null;
  if (!fetchIssues.length && !partialIssues.length && !truncation) return null;

  const guide = sheetGuideBand(
    '取得失敗、一部未検証、件数上限の対象と理由を確認できます。',
    '概要の取得状態と照らし合わせ、比較できていない範囲を確認してから判断します。'
  );
  const rows: (string | number | null)[][] = [
    [guide, '', '', '', ''],
    ['区分', 'セクション', '対象', '内容', '対象ファイル・補足']
  ];
  for (const issue of fetchIssues) {
    rows.push(['取得失敗', sectionLabelOf(issue.sectionKey || issue.section || ''), getIssueSideLabel(issue.side || ''), issueMessage(issue), '']);
  }
  for (const issue of partialIssues) {
    rows.push(['一部未検証', sectionLabelOf(issue.sectionKey || issue.section || ''), getIssueSideLabel(issue.side || ''), String(issue.message || issue.reason || '一部データを取得できず、代替情報で比較しました'), partialFileDetails(issue)]);
  }
  if (truncation) {
    const sections: DiffTruncationSection[] = truncation.sections?.length
      ? truncation.sections
      : [{ sectionKey: '', section: '全体', partiallyScanned: true, scanStatus: 'partial', omittedDiffCount: null }];
    for (const section of sections) {
      const scanStatus = truncationScanStatusOf(section);
      const knownOmittedDiff = Number(section.omittedDiffCount ?? section.droppedDiff ?? 0);
      const omittedDiff = scanStatus === 'unscanned'
        ? '差分 未走査・件数不明'
        : scanStatus === 'partial'
          ? '差分 部分走査・総件数不明（表示件数は下限）'
          : `差分 ${knownOmittedDiff}件（既知）`;
      const omittedSame = scanStatus === 'complete'
        ? `同一 ${Number(section.droppedSame || 0)}件（既知）`
        : '同一 件数不明';
      const omitted = [omittedDiff, omittedSame].join(' / ');
      const message = scanStatus === 'unscanned'
        ? `差分上限 ${truncation.diffLimit || '-'} 件に到達した後、このセクションは未走査です`
        : scanStatus === 'partial'
          ? `差分上限 ${truncation.diffLimit || '-'} 件に到達し、このセクションは部分走査です。表示件数は総件数の下限です`
          : knownOmittedDiff > 0
            ? `差分上限 ${truncation.diffLimit || '-'} 件に到達後も、この片側セクションは全体を確認済みです`
            : `差分上限 ${truncation.diffLimit || '-'} 件に到達しましたが、このセクションの走査は完了しています`;
      rows.push(['件数上限', sectionLabelOf(section.sectionKey || section.section || '全体'), '両方', message, omitted]);
    }
  }
  return {
    name: '取得・未検証',
    rows,
    colWidths: [14, 22, 12, 72, 60],
    rowStyles: rows.map(() => 'normal'),
    cellStyles: rows.map((_, index) => index === 0 ? ['info'] : index === 1 ? [] : ['warning']),
    headerRow: 2,
    freezeRows: 2,
    freezeColumns: 2,
    rowHeights: rows.map((row, index) => {
      if (index === 0) return 44;
      if (index === 1) return 30;
      return readableDiffRowHeight([
        { value: row[0], width: 14 },
        { value: row[1], width: 22 },
        { value: row[2], width: 12 },
        { value: row[3], width: 72 },
        { value: row[4], width: 60 }
      ], 160);
    }),
    merges: ['A1:E1'],
    showGridLines: false,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 2, to: 2 }
    }
  };
}

// ---------------------------------------------------------------------------
// Customer-safe workbook
// ---------------------------------------------------------------------------

const CUSTOMER_HIGH_RISK_SECTION_KEYS: ReadonlySet<string> = new Set([
  'customizeSettings',
  'pluginSettings',
  'appAcl',
  'fieldAcl',
  'recordPermissions',
  'notifications',
  'perRecordNotifications',
  'reminderNotifications'
]);

const CUSTOMER_VISIBLE_SECTION_KEYS: ReadonlySet<string> = new Set([
  'appSettings',
  'appInfo',
  'fieldSettings',
  'layoutSettings',
  'formSettings',
  'viewSettings',
  'reportSettings',
  'processSettings',
  'actionSettings',
  'categories'
]);

const CUSTOMER_HIDDEN_DETAIL = '詳細は安全のため非表示';
const CUSTOMER_TEXT_LIMIT = 240;
const CUSTOMER_REVIEW_STATUS_VALUES = ['未レビュー', 'レビュー中', 'レビュー済み', '対象外'];
const CUSTOMER_ACTION_DECISION_VALUES = ['未判断', '対応する', '対応しない', '保留', '対象外'];

interface CustomerDiffItem {
  sectionKey: string;
  sectionLabel: string;
  item: string;
  changeType: '追加' | '削除' | '変更' | '要素の移動';
  before: string;
  after: string;
  reviewNote: string;
  omittedTechnicalValues: number;
}

function customerSectionLabel(key: string): string {
  const labels: Record<string, string> = {
    appSettings: 'アプリ基本設定',
    appInfo: 'アプリ情報',
    formSettings: 'フォーム設定',
    pluginSettings: 'プラグイン設定',
    customizeSettings: 'カスタマイズ設定',
    appAcl: 'アプリ権限',
    fieldAcl: 'フィールド権限',
    recordPermissions: 'レコード権限'
  };
  const known = SECTION_LABEL_BY_KEY.get(key) || '';
  return labels[key] || known.replace(/\(※\)/g, '').trim() || 'その他の設定';
}

function customerAppName(bundle: DiffXlsxBundle | undefined, fallback: string): string {
  let name = String(extractAppNameFromBundle(bundle) || '').normalize('NFKC').trim();
  const numericIds = customerBundleNumericIds(bundle);
  if (numericIds.includes(name)) name = '';
  const idLabel = '(?:App|アプリ|Guest|ゲスト|Space|Thread)';
  if (/^\d+$/.test(name)
    || /^ID\s*[:#-]?\s*\d+$/i.test(name)
    || new RegExp(`^${idLabel}\\s*(?:ID\\s*)?[:#-]?\\s*\\d+$`, 'i').test(name)) {
    name = '';
  }
  for (const id of numericIds) {
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    name = name
      .replace(new RegExp(`\\(\\s*(?:${idLabel}\\s*(?:ID\\s*)?[:#-]?\\s*)?${escapedId}(?!\\d)\\s*\\)`, 'gi'), '')
      .replace(new RegExp(`${idLabel}\\s*(?:ID\\s*)?[:#-]?\\s*${escapedId}(?!\\d)`, 'gi'), '')
      .replace(new RegExp(`(^|[^\\p{L}\\p{N}])${escapedId}(?![\\p{L}\\p{N}])`, 'gu'), '$1');
  }
  name = name
    .replace(new RegExp(`[\\(（\\[［【]\\s*${idLabel}\\s*(?:ID\\s*)?[:#-]?\\s*\\d+\\s*[\\)）\\]］】]`, 'gi'), '')
    .replace(/[\(（\[［【]\s*\d{5,}\s*[\)）\]］】]/g, '')
    .replace(new RegExp(`${idLabel}[\\s_=-]*(?:ID[\\s_=-]*)?[:#-]?[\\s_=-]*\\d{5,}`, 'gi'), '')
    .replace(new RegExp(`^${idLabel}\\s*\\d+\\s*[:：-]\\s*`, 'i'), '')
    .replace(new RegExp(`\\s+${idLabel}\\s+\\d{5,}\\s*$`, 'i'), '');
  if (!numericIds.length) {
    name = name
      .replace(new RegExp(`\\(\\s*${idLabel}\\s*(?:ID\\s*)?[:#-]?\\s*\\d+\\s*\\)`, 'gi'), '')
      .replace(new RegExp(`${idLabel}\\s+ID\\s*[:#-]?\\s*\\d+`, 'gi'), '')
      .replace(new RegExp(`${idLabel}[\\s_=-]*(?:ID[\\s_=-]*)?[:#-]?[\\s_=-]*\\d+[\\s_=-]*(?:[:：-][\\s_-]*)?`, 'gi'), '')
      .replace(/^\d{4,}\s*[-:：]\s*/, '');
  }
  name = name
    .replace(/\(\s*\)/g, '')
    .replace(/[（\[［【]\s*[）\]］】]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-:：#]+|[\s\-:：#]+$/g, '')
    .trim();
  if (customerUnsafeRawLabelText(name)) name = '';
  return name || fallback;
}

function customerScopeLabel(scopes: string[] | undefined): string {
  const labels = [...new Set((scopes || []).map((key) => customerSectionLabel(key)).filter(Boolean))];
  return labels.length ? labels.join('、') : '比較した設定範囲';
}

function hasCustomerComparisonAdjustments(ctx: DiffXlsxContext): boolean {
  return !!String(ctx.ignoreKeys || '').trim()
    || Object.values(ctx.normalizationPresetState || {}).some(Boolean);
}

function customerChangeType(row: DiffXlsxRow): CustomerDiffItem['changeType'] {
  if (row.moved || row.type === 'moved') return '要素の移動';
  if (row.type === 'added') return '追加';
  if (row.type === 'removed') return '削除';
  return '変更';
}

function customerAggregatedChangeType(rows: DiffXlsxRow[]): CustomerDiffItem['changeType'] {
  const types = new Set(rows.map(customerChangeType));
  return types.size === 1 ? [...types][0] : '変更';
}

function customerSensitivePath(path: string): boolean {
  const rawPath = String(path || '');
  const normalized = rawPath.toLowerCase();
  const rawSegments = rawPath
    .replace(/\[(?:\d+|[^\]]+)\]/g, '.')
    .split('.')
    .map((segment) => segment.replace(/[^A-Za-z0-9_-]/g, ''))
    .filter(Boolean);
  const segments = rawSegments.map((segment) => segment.toLowerCase());
  if (segments.some((segment) => /(?:token|secret|password|passwd|credential|authorization|privatekey|private_key|apikey|api_key)/.test(segment))) {
    return true;
  }
  if (rawSegments.some((segment) => segment.toLowerCase() === 'id'
    || /(?:Id|ID)$/.test(segment)
    || /(?:^|[_-])id$/i.test(segment)
    || /^(?:app|guest|space|thread|view|report|record|field)id$/i.test(segment)
    || /^(?:uuid|guid)$/i.test(segment))) return true;
  if (segments.some((segment) => ['revision', 'filekey', '_body', 'body', 'config', 'expression', 'formula'].includes(segment))) return true;
  const defaultValueIndex = segments.indexOf('defaultvalue');
  if (defaultValueIndex >= 0 && segments.slice(defaultValueIndex + 1).some((segment) => ['code', 'name', 'login', 'id'].includes(segment))) {
    return true;
  }
  if (/(?:^|\.)destapp\.app(?:\.|$)/.test(normalized)) return true;
  if (/(?:^|\.)(?:relatedapp|lookup|referencetable)(?:\.|[\s\S]*\.)app(?:\.|$)/.test(normalized)) return true;
  if (/(?:^|\.)entity\.(?:code|login)(?:\.|$)/.test(normalized)) return true;
  if (segments.some((segment) => /^(?:assignee|entities|recipients|targets|members|users?|groups?|organizations?)$/.test(segment))) return true;
  if (segments.some((segment) => ['creator', 'modifier', 'createdby', 'updatedby', 'login'].includes(segment))) return true;
  return false;
}

function customerLooksLikeOpaqueToken(text: string): boolean {
  return /[A-Za-z0-9_~+/=-]{24,}/.test(String(text || ''));
}

function customerKnownSafePath(row: DiffXlsxRow): boolean {
  const sectionKey = sectionKeyOfRow(row);
  const path = String(row.path || '');
  if (!path || path === sectionKey) {
    return [row.left, row.right].every((value) => value == null || typeof value === 'object');
  }
  if (customerSensitivePath(path)) return false;

  const fieldInfo = extractFieldPathInfo(path);
  if (sectionKey === 'fieldSettings' && fieldInfo) {
    const tokens = Array.isArray(fieldInfo.tailTokens) ? fieldInfo.tailTokens : [];
    if (!tokens.length) return true;
    const settingKey = fieldSettingIdentity(fieldInfo).settingKey;
    const simple = /^(?:label|name|code|type|noLabel|required|unique|defaultValue(?:\.\d+)?|defaultNowValue|minLength|maxLength|minValue|maxValue|hideExpression|protocol|displayScale|digit|unit|unitPosition|align|format|thumbnailSize|index)$/;
    const option = /^options\.[^.]+(?:\.(?:label|index))?$/;
    const lookup = /^lookup\.(?:relatedKeyField|filterCond|sort|lookupPickerFields\.\d+|retrieveFields\.\d+|fieldMappings\.\d+\.(?:field|relatedField))$/;
    const referenceTable = /^referenceTable\.(?:filterCond|sort|size|displayFields\.\d+|condition\.(?:field|relatedField))$/;
    if (!(simple.test(settingKey) || option.test(settingKey) || lookup.test(settingKey) || referenceTable.test(settingKey))) return false;
    if (option.test(settingKey)) {
      const optionName = String(tokens[1] || '');
      return !!optionName && !customerUnsafeRawLabelText(optionName) && optionName.length <= 120;
    }
    return true;
  }

  const safePatterns: Record<string, RegExp[]> = {
    appSettings: [
      /^appSettings\.(?:name|theme|enableThumbnails|firstMonthOfFiscalYear|numberPrecision)$/
    ],
    appInfo: [
      /^appInfo\.name$/
    ],
    layoutSettings: [
      /^layoutSettings\.layout\[\d+\](?:\.fields\[\d+\])*(?:\.(?:type|code|label|value|elementId|size(?:\.(?:width|height|innerHeight))?))?$/
    ],
    viewSettings: [
      /^viewSettings\.views\.[^.[\]]+(?:\.(?:type|name|index|filterCond|sort|pager|device)|\.fields\[\d+\])?$/
    ],
    processSettings: [
      /^processSettings\.(?:enable|states\.[^.[\]]+(?:\.(?:name|index))?|actions\[\d+\](?:\.(?:name|from|to|filterCond))?)$/
    ],
    actionSettings: [
      /^actionSettings\.actions\[\d+\](?:\.(?:name|index|from|to|filterCond))?$/
    ]
  };
  return (safePatterns[sectionKey] || []).some((pattern) => pattern.test(path));
}

function customerUnsafeText(text: string, allowReadableLongToken = false): boolean {
  text = String(text || '').normalize('NFKC')
    .replace(/[\u2044\u2215\u29F5\uFF0F]/g, '/')
    .replace(/[\u00A5\u2216\uFF3C]/g, '\\');
  return /[\p{Cc}\p{Cf}\p{Cs}]/u.test(text)
    || /(?:https?|ftp):\/\/|\bwww\./i.test(text)
    || /\b(?:data|blob|javascript|vbscript|mailto|ssh|git|s3|gs|jdbc|kintone|chrome-extension):/i.test(text)
    || /(?:^|[^A-Za-z0-9])(?:file:\/\/|[a-z]:[\\/]|\\\\[^\\\s]+\\)/i.test(text)
    || /(?:^|[^A-Za-z0-9])\/(?!\/)[^\s/]+(?:\/[^\s/]+)*/u.test(text)
    || /(?:^|[^A-Za-z0-9])(?:\.{1,2}|~)[\\/](?:[^\\/\r\n]+[\\/])*[^\\/\r\n]+/.test(text)
    || /(?:^|[\s"'=])(?:[A-Za-z0-9_.-]+[\\/])+[A-Za-z0-9_.-]+(?:\.(?:js|ts|json|env|pem|key|crt|log|txt|csv|xlsx?))?(?::\d+:\d+)?/i.test(text)
    || /(?:^|[^A-Za-z0-9])(?:%[A-Za-z_][A-Za-z0-9_]*%|\$(?:\{[A-Za-z_][A-Za-z0-9_]*\}|[A-Za-z_][A-Za-z0-9_]*))[\\/][^\r\n]+/.test(text)
    || /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}_-]{1,63}(?:\.[\p{L}\p{N}_-]{1,63})*/iu.test(text)
    || customerContainsPhoneLike(text)
    || customerContainsPaymentCardLike(text)
    || /\b(?:TypeError|ReferenceError|SyntaxError|RangeError|Error|Exception):/i.test(text)
    || /\b(?:ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|ENOENT|EACCES|ERR_[A-Z0-9_]+|Traceback|Unhandled)\b/i.test(text)
    || /\bat\s+\S+\s*\([^\r\n]+:\d+:\d+\)/.test(text)
    || /\bat\s+[^\r\n]+:\d+:\d+\b/.test(text)
    || /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/.test(text)
    || /\b\d{2,4}-\d{2,4}-\d{3,4}\b/.test(text)
    || /(?:^|[^0-9])(?:\+?81|0)[\s-]?(?:\d[\s-]?){9,10}(?:$|[^0-9])/.test(text)
    || /(?:^|[^0-9])\+\d{1,3}[\s().-]*(?:\d[\s().-]*){7,14}(?:$|[^0-9])/.test(text)
    || /\b(?:ssn|social[\s_-]*security)\s*[:#=-]?\s*\d(?:[\s-]*\d){8}\b/i.test(text)
    || /\b(?:card|credit[\s_-]*card|visa|mastercard)\s*[:#=-]?\s*\d(?:[\s-]*\d){12,18}\b/i.test(text)
    || /\b[\p{L}\p{N}][\p{L}\p{N}.-]*\.(?:internal|corp|local|lan|intra)\b/iu.test(text)
    || /(?:^|[^A-Za-z0-9])(?:JSESSIONID|PHPSESSID|SESSIONID|AUTHSESSION|SID|CSRF(?:TOKEN)?)\s*[:=]\s*[^;,\s]+/i.test(text)
    || /(?:^|[^A-Za-z0-9])(?:Cookie|Set-Cookie)\s*:\s*[^\r\n]+/i.test(text)
    || /(?:^|[^A-Za-z0-9])(?:secret[\s_-]*key|passphrase|session|cookie|auth[\s_-]*code|ssh[\s_-]*key|pin)\s*[:=]\s*[^;,\s]+/i.test(text)
    || /(?:^|[^A-Za-z0-9])(?:passphrase|session|cookie|auth[\s_-]*code|pin)\s+[A-Za-z0-9._~+\/-]{4,}/i.test(text)
    || /(?:^|[^A-Za-z0-9])[A-Za-z0-9_-]*(?:pwd|dbpass|sqlpass)\s*(?:\(|<|\[|\{)\s*[^)\]}>]+\s*(?:\)|>|\]|\})/i.test(text)
    || /(?:^|[^A-Za-z0-9])(?:cfg\s*)?(?:[.\[]\s*)?["']?(?:[A-Za-z0-9_-]*(?:pwd|pass(?:word)?|token|secret|credential))["']?\s*\]?\s*[:=]\s*[^;,\s]+/i.test(text)
    || /(?:^|[^A-Za-z0-9])(?:dsn|uid|server|host|port|data[\s_-]*source|database|[A-Za-z0-9_-]*(?:pwd|pass(?:word)?|token|secret|auth(?:orization)?|credential|access[\s_-]?key|client[\s_-]?secret))\s*[:=]\s*[^;,\s]+/i.test(text)
    || /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/i.test(text)
    || /\b(?:sk|rk|pk)[-_](?:(?:live|test|proj)[-_]?)?[A-Za-z0-9_-]{12,}\b/i.test(text)
    || /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/i.test(text)
    || /\bglpat-[A-Za-z0-9_-]{20,}\b/i.test(text)
    || /\bnpm_[A-Za-z0-9]{30,}\b/i.test(text)
    || /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(text)
    || /\bgh[pousr]_[A-Za-z0-9]{20,}\b/i.test(text)
    || /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/.test(text)
    || /(?:^|[^0-9a-f])[0-9a-f]{32,128}(?:$|[^0-9a-f])/i.test(text)
    || /\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/i.test(text)
    || /(?:commit|sha(?:1|256)?|hash)\s*[:=#-]?\s*[0-9a-f]{7,64}/i.test(text)
    || /\b(?:release|build)\s+[0-9a-f]{7,31}\b/i.test(text)
    || /\b(?:app|guest|space|thread)\s*(?:id)?\s*(?:[:=#]|\bin\b)/i.test(text)
    || /(?:App|アプリ|Guest|ゲスト|Space|Thread)[\s_=-]*(?:ID[\s_=-]*)?[:#-]?[\s_=-]*\d{5,}/i.test(text)
    || /(?:Guest|ゲスト|Space|Thread)[\s_=-]*(?:ID[\s_=-]*)?[:#-]?[\s_=-]*\d+/i.test(text)
    || /(?:view|report|record|field|user|group|org(?:anization)?|client|tenant)[\s_-]*(?:id|code|login)\s*[:=#-]?\s*\S+/i.test(text)
    || /(?:login|user[\s_-]?(?:id|code)|client[\s_-]?id|tenant[\s_-]?id)\s*[:=]\s*\S+/i.test(text)
    || /(?:employee|member|account|owner|assignee|principal|subject|project)?[\s_-]*(?:id|code|login)\s+[A-Za-z0-9_-]+/i.test(text)
    || /\b(?:appId|guestId|spaceId|threadId|fileKey|revision)\b/i.test(text)
    || /(?:^|[^a-z0-9])(?:(?:api|access|account|session|signing)[\s_-]?key|token|secret|password|passwd|credential|authorization|private[\s_-]?key)(?:$|[^a-z0-9])/i.test(text)
    || (!allowReadableLongToken && customerLooksLikeOpaqueToken(text));
}

function customerContainsPhoneLike(text: string): boolean {
  return [...String(text || '').matchAll(/\+?\d[\d\s().-]{7,}\d/g)].some((match) => {
    const digits = match[0].replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  });
}

function customerUnsafeLabelText(text: string): boolean {
  const normalized = String(text || '').normalize('NFKC');
  return customerUnsafeText(normalized, true)
    || customerContainsPhoneLike(normalized)
    || /(?:^|[^\p{L}\p{N}])ID\s*[:#-]?\s*\d+(?:$|[^\p{L}\p{N}])/iu.test(normalized)
    || /[\(（\[［【]\s*\d+\s*[\)）\]］】]/u.test(normalized)
    || /(?:^|[^0-9])\d{5,}(?:$|[^0-9])/.test(normalized);
}

function customerContainsPaymentCardLike(text: string): boolean {
  return [...String(text || '').matchAll(/\d[\d\s-]{11,23}\d/g)].some((match) => {
    const digits = match[0].replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let double = false;
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      let value = Number(digits[index]);
      if (double) {
        value *= 2;
        if (value > 9) value -= 9;
      }
      sum += value;
      double = !double;
    }
    return sum % 10 === 0;
  });
}

function customerUnsafeRawLabelText(text: string): boolean {
  const normalized = String(text || '').normalize('NFKC');
  return customerUnsafeLabelText(normalized)
    || /[@:;=,"'\\/\[\]{}<>]/.test(normalized)
    || /(?:^|[^0-9a-f])(?=[0-9a-f]{8,31}(?:$|[^0-9a-f]))(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{8,31}(?:$|[^0-9a-f])/i.test(normalized)
    || /^(?=[0-9a-f]{7,12}$)(?=.*\d)[0-9a-f]+$/i.test(normalized);
}

function customerLooksLikeFieldCodeLabel(text: string, ...knownCodes: string[]): boolean {
  const value = String(text || '').trim();
  if (!value) return true;
  if (knownCodes.some((code) => code && value === String(code).trim())) return true;
  return /^[a-z][a-z0-9]*$/.test(value) || /[_$-]/.test(value);
}

function customerFieldLabelMap(bundle?: DiffXlsxBundle): Map<string, string> {
  const labels = new Map<string, string>();
  const visit = (properties: Record<string, any>) => {
    for (const [fallbackCode, definition] of Object.entries(properties || {})) {
      if (!definition || typeof definition !== 'object' || Array.isArray(definition)) continue;
      const code = String((definition as any).code || fallbackCode).trim();
      const label = String((definition as any).label || (definition as any).name || '').trim();
      const codeLikeLabel = customerLooksLikeFieldCodeLabel(label, code);
      if (code && label && !codeLikeLabel && !customerUnsafeRawLabelText(label)
        && !customerContainsKnownBundleId(label, bundle) && label.length <= 120) labels.set(code, label);
      const children = (definition as any).fields;
      if (children && typeof children === 'object' && !Array.isArray(children)) visit(children);
    }
  };
  visit(fieldSettingsProperties(bundle));
  return labels;
}

function customerFieldLabelForCode(
  code: string,
  preferredBundle?: DiffXlsxBundle,
  fallbackBundle?: DiffXlsxBundle
): string {
  const normalized = String(code || '').trim();
  if (!normalized) return '';
  return customerFieldLabelMap(preferredBundle).get(normalized)
    || customerFieldLabelMap(fallbackBundle).get(normalized)
    || '';
}

function customerFieldTypeForCode(
  code: string,
  preferredBundle?: DiffXlsxBundle,
  fallbackBundle?: DiffXlsxBundle
): string {
  const normalized = String(code || '').trim();
  if (!normalized) return '';
  const find = (bundle?: DiffXlsxBundle): string => {
    let found = '';
    const visit = (properties: Record<string, any>) => {
      for (const [fallbackCode, definition] of Object.entries(properties || {})) {
        if (found || !definition || typeof definition !== 'object' || Array.isArray(definition)) continue;
        const fieldCode = String((definition as any).code || fallbackCode).trim();
        if (fieldCode === normalized) {
          found = String((definition as any).type || '').trim();
          continue;
        }
        const children = (definition as any).fields;
        if (children && typeof children === 'object' && !Array.isArray(children)) visit(children);
      }
    };
    visit(fieldSettingsProperties(bundle));
    return found;
  };
  return find(preferredBundle) || find(fallbackBundle);
}

function customerFieldOptionValuesForCode(
  code: string,
  preferredBundle?: DiffXlsxBundle,
  fallbackBundle?: DiffXlsxBundle
): Set<string> {
  const normalized = String(code || '').trim();
  const values = new Set<string>();
  if (!normalized) return values;
  const visitBundle = (bundle?: DiffXlsxBundle) => {
    const visit = (properties: Record<string, any>) => {
      for (const [fallbackCode, definition] of Object.entries(properties || {})) {
        if (!definition || typeof definition !== 'object' || Array.isArray(definition)) continue;
        const fieldCode = String((definition as any).code || fallbackCode).trim();
        if (fieldCode === normalized) {
          const options = (definition as any).options;
          if (options && typeof options === 'object' && !Array.isArray(options)) {
            for (const [optionKey, option] of Object.entries(options)) {
              if (!customerUnsafeRawLabelText(String(optionKey))) values.add(String(optionKey));
              if (option && typeof option === 'object' && !Array.isArray(option)) {
                const label = String((option as any).label || '').trim();
                if (label && !customerUnsafeRawLabelText(label)) values.add(label);
              }
            }
          }
        }
        const children = (definition as any).fields;
        if (children && typeof children === 'object' && !Array.isArray(children)) visit(children);
      }
    };
    visit(fieldSettingsProperties(bundle));
  };
  visitBundle(preferredBundle);
  visitBundle(fallbackBundle);
  return values;
}

function customerFieldLooksLikePersonalIdentifier(
  code: string,
  preferredBundle?: DiffXlsxBundle,
  fallbackBundle?: DiffXlsxBundle
): boolean {
  const label = customerFieldLabelForCode(code, preferredBundle, fallbackBundle);
  return /(?:^|[_\s-])(?:ssn|social[\s_-]*security|card|credit[\s_-]*card|pan|my[\s_-]*number|phone|tel|mobile)(?:$|[_\s-])/i
    .test(`${code} ${label}`)
    || /(?:個人番号|マイナンバー|電話|携帯|カード番号)/.test(label);
}

function customerConditionLiteral(raw: string): string | null {
  const value = raw.trim();
  if (customerUnsafeText(value)) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return value;
  const quoted = value.match(/^"([^"\\]*)"$/) || value.match(/^'([^'\\]*)'$/);
  if (!quoted || customerUnsafeText(quoted[1])) return null;
  return `「${quoted[1]}」`;
}

function customerHumanizeExpression(
  text: string,
  path: string,
  preferredBundle?: DiffXlsxBundle,
  fallbackBundle?: DiffXlsxBundle
): string | null {
  const leaf = path.match(/(?:^|\.)([^.[\]]+)$/)?.[1] || '';
  if (leaf === 'sort') {
    const match = text.match(/^\s*([A-Za-z0-9_\u0080-\uffff-]+)\s+(asc|desc)\s*$/i);
    if (!match) return null;
    const field = customerFieldLabelForCode(match[1], preferredBundle, fallbackBundle);
    if (!field) return null;
    return `${field}（${match[2].toLowerCase() === 'asc' ? '昇順' : '降順'}）`;
  }
  if (leaf !== 'filterCond') return null;

  const inMatch = text.match(/^\s*([A-Za-z0-9_\u0080-\uffff-]+)\s+(not\s+in|in)\s*\(([^()]*)\)\s*$/i);
  if (inMatch) {
    const field = customerFieldLabelForCode(inMatch[1], preferredBundle, fallbackBundle);
    const fieldType = customerFieldTypeForCode(inMatch[1], preferredBundle, fallbackBundle);
    if (!['RADIO_BUTTON', 'CHECK_BOX', 'MULTI_SELECT', 'DROP_DOWN'].includes(fieldType)) return null;
    const rawValues = inMatch[3].split(',').map((value) => value.trim()).filter(Boolean);
    const allowedOptions = customerFieldOptionValuesForCode(inMatch[1], preferredBundle, fallbackBundle);
    const optionValues = rawValues.map((raw) => {
      const quoted = raw.match(/^"([^"\\]*)"$/) || raw.match(/^'([^'\\]*)'$/);
      return quoted?.[1] ?? null;
    });
    if (!allowedOptions.size || optionValues.some((value) => value == null || !allowedOptions.has(value))) return null;
    const values = rawValues.map(customerConditionLiteral);
    if (!field || values.length === 0 || values.some((value) => value == null)) return null;
    const joined = values.length === 2
      ? `${values[0]}または${values[1]}`
      : values.length > 2
        ? `${values.slice(0, -1).join('、')}、または${values[values.length - 1]}`
        : values[0];
    const negative = /not\s+in/i.test(inMatch[2]);
    if (values.length === 1) return `${field}が${joined}${negative ? 'ではない' : ''}`;
    return negative ? `${field}が${joined}のいずれでもない` : `${field}が${joined}`;
  }

  const comparison = text.match(/^\s*([A-Za-z0-9_\u0080-\uffff-]+)\s*(<=|>=|!=|=|<|>)\s*(.+?)\s*$/);
  if (!comparison) return null;
  const field = customerFieldLabelForCode(comparison[1], preferredBundle, fallbackBundle);
  const fieldType = customerFieldTypeForCode(comparison[1], preferredBundle, fallbackBundle);
  if (customerFieldLooksLikePersonalIdentifier(comparison[1], preferredBundle, fallbackBundle)) return null;
  if (!['NUMBER', 'CALC', 'RADIO_BUTTON', 'CHECK_BOX', 'MULTI_SELECT', 'DROP_DOWN'].includes(fieldType)) return null;
  if (['NUMBER', 'CALC'].includes(fieldType) && !/^-?\d+(?:\.\d+)?$/.test(comparison[3].trim())) return null;
  if (['RADIO_BUTTON', 'CHECK_BOX', 'MULTI_SELECT', 'DROP_DOWN'].includes(fieldType)) {
    const quoted = comparison[3].match(/^"([^"\\]*)"$/) || comparison[3].match(/^'([^'\\]*)'$/);
    const allowedOptions = customerFieldOptionValuesForCode(comparison[1], preferredBundle, fallbackBundle);
    if (!quoted || !allowedOptions.has(quoted[1])) return null;
  }
  const value = customerConditionLiteral(comparison[3]);
  if (!field || value == null) return null;
  const operatorLabels: Record<string, string> = {
    '=': `${field}が${value}`,
    '!=': `${field}が${value}ではない`,
    '>': `${field}が${value}より大きい`,
    '>=': `${field}が${value}以上`,
    '<': `${field}が${value}より小さい`,
    '<=': `${field}が${value}以下`
  };
  return operatorLabels[comparison[2]] || null;
}

function looksLikeTechnicalPath(text: string, sectionKey: string): boolean {
  const value = String(text || '').trim();
  return !value
    || value === sectionKey
    || value.startsWith(`${sectionKey}.`)
    || /\[[0-9]+\]/.test(value)
    || /^(?:[A-Za-z_$][\w$]*\.){2,}[A-Za-z_$][\w$]*$/.test(value);
}

function customerLayoutItemLabel(
  row: DiffXlsxRow,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): string {
  const path = String(row.path || '');
  const match = path.match(/^layoutSettings\.layout\[(\d+)\](?:\.(.+))?$/);
  if (!match) return '';
  const rowIndex = Number(match[1]);
  const preferredBundle = row.type === 'removed' ? sourceBundle : targetBundle;
  const fallbackBundle = row.type === 'removed' ? targetBundle : sourceBundle;
  const layoutAt = (bundle?: DiffXlsxBundle) => bundle?.sections?.layoutSettings?.layout?.[rowIndex];
  let entity = layoutAt(preferredBundle) || layoutAt(fallbackBundle) || null;
  const parts = [`レイアウト ${rowIndex + 1}行目`];
  for (const fieldMatch of path.matchAll(/\.fields\[(\d+)\]/g)) {
    const fieldIndex = Number(fieldMatch[1]);
    entity = entity && typeof entity === 'object' && !Array.isArray(entity)
      ? (entity as Record<string, any>).fields?.[fieldIndex]
      : null;
    const code = entity && typeof entity === 'object' && !Array.isArray(entity)
      ? String((entity as Record<string, any>).code || '').trim()
      : '';
    const label = customerFieldLabelForCode(code, preferredBundle, fallbackBundle);
    parts.push(label || `フィールド ${fieldIndex + 1}`);
  }
  const leaf = path.match(/(?:^|\.)([^.[\]]+)$/)?.[1] || '';
  const propLabels: Record<string, string> = {
    type: '種別',
    code: 'フィールド',
    fields: 'フィールド',
    elementId: '要素',
    label: 'ラベル',
    value: '初期値',
    size: 'サイズ',
    width: '横幅',
    height: '高さ',
    innerHeight: '入力欄の高さ'
  };
  if (leaf && leaf !== 'layout' && leaf !== 'fields') parts.push(propLabels[leaf] || '設定');
  return parts.join(' / ');
}

function customerViewFieldItemLabel(
  row: DiffXlsxRow,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): string {
  const path = String(row.path || '');
  const match = path.match(/^viewSettings\.views\.([^.[\]]+)\.fields\[(\d+)\](?:\.|$)/);
  if (!match) return '';
  const rawViewName = String(match[1] || '').trim();
  const viewName = rawViewName && !customerUnsafeRawLabelText(rawViewName)
    && !customerContainsKnownBundleId(rawViewName, sourceBundle, targetBundle) && rawViewName.length <= 80
    ? rawViewName
    : '一覧';
  const preferredBundle = row.type === 'removed' ? sourceBundle : targetBundle;
  const fallbackBundle = row.type === 'removed' ? targetBundle : sourceBundle;
  const rawCode = row.type === 'removed' ? row.left : row.right;
  const fieldLabel = typeof rawCode === 'string'
    ? customerFieldLabelForCode(rawCode, preferredBundle, fallbackBundle)
    : '';
  return fieldLabel
    ? `${viewName} / 表示フィールド「${fieldLabel}」`
    : `${viewName} / 表示フィールド`;
}

function customerItemLabel(
  row: DiffXlsxRow,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): string {
  const key = sectionKeyOfRow(row);
  const section = customerSectionLabel(key);
  const path = String(row.path || '');
  if (customerSensitivePath(path) || !customerKnownSafePath(row)) return `${section}の設定情報`;

  const fieldInfo = extractFieldPathInfo(path);
  if (fieldInfo) {
    const identity = fieldDisplayIdentity(row, fieldInfo, { rows: [], sourceBundle, targetBundle });
    const setting = fieldSettingIdentity(fieldInfo);
    const fieldName = String(identity.fieldName || '').trim();
    const safeSetting = String(setting.settingLabel || '設定')
      .replace(/参照するアプリID/g, '参照するアプリ')
      .replace(/\bID\b/gi, '識別情報');
    const safeFieldName = fieldName
      && fieldName !== String(identity.fieldCode || '').trim()
      && !customerUnsafeRawLabelText(fieldName)
      && !customerContainsKnownBundleId(fieldName, sourceBundle, targetBundle)
      && fieldName.length <= 120
      ? fieldName
      : 'フィールド';
    const candidate = setting.settingKey === '(field)'
      ? safeFieldName
      : `${safeFieldName} / ${safeSetting}`;
    return !customerUnsafeLabelText(candidate)
      && !customerContainsKnownBundleId(candidate, sourceBundle, targetBundle) && candidate.length <= 120
      ? candidate
      : `${section}の設定`;
  }

  const layout = customerLayoutItemLabel(row, sourceBundle, targetBundle);
  if (layout && !customerUnsafeLabelText(layout)
    && !customerContainsKnownBundleId(layout, sourceBundle, targetBundle)) return layout;

  const viewField = customerViewFieldItemLabel(row, sourceBundle, targetBundle);
  if (viewField && !customerUnsafeLabelText(viewField)
    && !customerContainsKnownBundleId(viewField, sourceBundle, targetBundle)) return viewField;

  const plainPathLabels: Record<string, string> = {
    'appSettings.name': 'アプリ名',
    'appSettings.description': '説明',
    'appSettings.theme': 'テーマ',
    'appSettings.icon': 'アイコン',
    'appSettings.enableThumbnails': 'サムネイル表示',
    'appSettings.firstMonthOfFiscalYear': '会計年度の開始月',
    'appSettings.numberPrecision': '数値の精度',
    'appInfo.name': 'アプリ名',
    'appInfo.description': '説明'
  };
  if (plainPathLabels[path]) return plainPathLabels[path];

  try {
    const decoded = decodeRow(row as any);
    if (decoded) {
      const parts = [
        ...decoded.whereChips.map((chip) => chip.label),
        decoded.propLabel
      ].filter((part): part is string => !!part)
        .map((part) => part === '絞込条件' ? '絞り込み条件' : part === 'ソート' ? '並び順' : part);
      const readable = [...new Set(parts)].join(' / ') || decoded.oneLineSummary;
      if (readable && !looksLikeTechnicalPath(readable, key) && !customerUnsafeLabelText(readable)
        && !customerContainsKnownBundleId(readable, sourceBundle, targetBundle)) {
        return String(readable).slice(0, 120);
      }
    }
  } catch {
    // 顧客向けでは技術パスへフォールバックしない。
  }

  const explicit = String(row.label || '').trim();
  if (explicit && !looksLikeTechnicalPath(explicit, key) && !customerUnsafeRawLabelText(explicit)
    && !customerContainsKnownBundleId(explicit, sourceBundle, targetBundle)) {
    return explicit.slice(0, 120);
  }
  return `${section}の設定`;
}

function customerFieldDefinitionSummary(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const definition = value as Record<string, any>;
  const type = String(definition.type || '').trim();
  const parts = [
    type ? `種類: ${FIELD_TYPE_LABELS[type] || '設定項目'}` : '',
    typeof definition.required === 'boolean' ? `必須: ${definition.required ? 'はい' : 'いいえ'}` : '',
    typeof definition.unique === 'boolean' ? `重複禁止: ${definition.unique ? 'はい' : 'いいえ'}` : '',
    definition.options && typeof definition.options === 'object'
      ? `選択肢: ${Object.keys(definition.options).length}件`
      : '',
    definition.fields && typeof definition.fields === 'object'
      ? `テーブル内項目: ${Object.keys(definition.fields).length}件`
      : '',
    definition.lookup && typeof definition.lookup === 'object' ? 'ルックアップ設定あり' : '',
    definition.referenceTable && typeof definition.referenceTable === 'object' ? '関連レコード設定あり' : '',
    String(definition.expression || '').trim() ? '計算式あり' : ''
  ].filter(Boolean);
  return parts.length ? `${parts.join('\n')}\n（${CUSTOMER_HIDDEN_DETAIL}）` : null;
}

function customerBundleNumericIds(...bundles: Array<DiffXlsxBundle | undefined>): string[] {
  return [...new Set(bundles.flatMap((bundle) => [
    bundle?.appId,
    bundle?.guestId,
    (bundle as any)?.spaceId,
    (bundle as any)?.threadId
  ]).map((value) => String(value ?? '').trim()).filter((value) => /^\d+$/.test(value)))];
}

function customerContainsKnownBundleId(text: string, ...bundles: Array<DiffXlsxBundle | undefined>): boolean {
  const normalized = String(text || '').normalize('NFKC');
  return customerBundleNumericIds(...bundles).some((id) => {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u').test(normalized);
  });
}

function customerNumericScalar(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value)
    || typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value.trim());
}

function customerScalarValueMatchesPath(
  path: string,
  value: unknown,
  fieldInfo: ReturnType<typeof extractFieldPathInfo>,
  preferredBundle?: DiffXlsxBundle,
  fallbackBundle?: DiffXlsxBundle
): boolean {
  if (fieldInfo) {
    const settingKey = fieldSettingIdentity(fieldInfo).settingKey;
    const root = settingKey.split('.')[0];
    if (root === '(field)') return false;
    if (['label', 'name', 'unit'].includes(root)) {
      return typeof value === 'string' && !customerUnsafeRawLabelText(value)
        && (root === 'unit' || !customerLooksLikeFieldCodeLabel(value, fieldInfo.activeCode, fieldInfo.rootCode))
        && !customerContainsKnownBundleId(value, preferredBundle, fallbackBundle) && value.length <= 120;
    }
    if (root === 'type') return typeof value === 'string' && !!FIELD_TYPE_LABELS[value];
    if (['noLabel', 'required', 'unique', 'defaultNowValue', 'hideExpression', 'digit'].includes(root)) {
      return typeof value === 'boolean';
    }
    if (['minLength', 'maxLength', 'minValue', 'maxValue', 'displayScale', 'size', 'thumbnailSize', 'index'].includes(root)) {
      return customerNumericScalar(value);
    }
    if (root === 'defaultValue') return true;
    if (['code', 'relatedKeyField', 'field', 'relatedField', 'displayFields', 'lookupPickerFields', 'retrieveFields'].includes(root)) {
      return typeof value === 'string';
    }
    if (root === 'options') {
      const leaf = String(fieldInfo.leafKey || '');
      return leaf === 'index'
        ? customerNumericScalar(value)
        : leaf === 'label'
          ? typeof value === 'string' && !customerUnsafeRawLabelText(value)
            && !customerContainsKnownBundleId(value, preferredBundle, fallbackBundle) && value.length <= 120
          : false;
    }
    return false;
  }

  if (/^(?:appSettings|appInfo)\.name$/.test(path)) {
    return typeof value === 'string' && !customerUnsafeRawLabelText(value)
      && !customerContainsKnownBundleId(value, preferredBundle, fallbackBundle) && value.length <= 120;
  }
  if (path === 'appSettings.theme') {
    return typeof value === 'string' && /^(?:WHITE|RED|BLUE|GREEN|YELLOW|BLACK)$/i.test(value);
  }
  if (path === 'appSettings.enableThumbnails') return typeof value === 'boolean';
  if (path === 'appSettings.firstMonthOfFiscalYear') {
    return customerNumericScalar(value) && Number(value) >= 1 && Number(value) <= 12;
  }
  if (path === 'appSettings.numberPrecision') return false;
  if (/^layoutSettings\..*\.(?:width|height|innerHeight)$/.test(path)) return customerNumericScalar(value);
  if (/^layoutSettings\..*\.type$/.test(path)) {
    return typeof value === 'string' && /^(?:ROW|SUBTABLE|GROUP|LABEL|SPACER|HR|REFERENCE_TABLE)$/.test(value);
  }
  if (/^layoutSettings\..*\.(?:code)$/.test(path)) return typeof value === 'string';
  if (/^layoutSettings\..*\.(?:label|value)$/.test(path)) {
    return typeof value === 'string' && !customerUnsafeRawLabelText(value)
      && !customerContainsKnownBundleId(value, preferredBundle, fallbackBundle) && value.length <= 120;
  }
  if (/^viewSettings\..*\.index$/.test(path)) return customerNumericScalar(value);
  if (/^viewSettings\..*\.pager$/.test(path)) return typeof value === 'boolean';
  if (/^viewSettings\..*\.type$/.test(path)) {
    return typeof value === 'string' && /^(?:LIST|CALENDAR|CUSTOM)$/.test(value);
  }
  if (/^(?:viewSettings|processSettings|actionSettings)\..*\.(?:name|from|to)$/.test(path)) {
    return typeof value === 'string' && !customerUnsafeRawLabelText(value)
      && !customerContainsKnownBundleId(value, preferredBundle, fallbackBundle) && value.length <= 120;
  }
  if (/^(?:processSettings)\.enable$/.test(path)) return typeof value === 'boolean';
  if (/^(?:processSettings|actionSettings)\..*\.index$/.test(path)) return customerNumericScalar(value);
  if (/\.(?:filterCond|sort)$/.test(path)) return typeof value === 'string';
  if (/\.fields\[\d+\]$/.test(path)) return typeof value === 'string';
  return false;
}

function customerSafeValue(
  row: DiffXlsxRow,
  side: 'source' | 'target',
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): { text: string; omitted: boolean } {
  const missing = side === 'source'
    ? row.left === undefined || row.type === 'added'
    : row.right === undefined || row.type === 'removed';
  if (missing) return { text: '（設定なし）', omitted: false };

  const path = String(row.path || '');
  if (customerSensitivePath(path) || !customerKnownSafePath(row)) {
    return { text: CUSTOMER_HIDDEN_DETAIL, omitted: true };
  }

  const value = side === 'source' ? row.left : row.right;
  const preferredBundle = side === 'source' ? sourceBundle : targetBundle;
  const fallbackBundle = side === 'source' ? targetBundle : sourceBundle;
  const fieldInfo = extractFieldPathInfo(path);
  if (fieldInfo) {
    const definition = fieldDefinitionAt(preferredBundle, fieldInfo) || fieldDefinitionAt(fallbackBundle, fieldInfo);
    const fieldType = String(definition?.type || '');
    const settingKey = fieldSettingIdentity(fieldInfo).settingKey;
    const anyDefaultValue = /^defaultValue(?:\.|$)/.test(settingKey);
    const safeDefaultValueType = /^(?:NUMBER|CALC|RADIO_BUTTON|CHECK_BOX|MULTI_SELECT|DROP_DOWN|DATE|TIME|DATETIME)$/.test(fieldType);
    const fieldCode = String(fieldInfo.activeCode || fieldInfo.rootCode || '');
    if (anyDefaultValue && customerFieldLooksLikePersonalIdentifier(fieldCode, preferredBundle, fallbackBundle)) {
      return { text: CUSTOMER_HIDDEN_DETAIL, omitted: true };
    }
    if (anyDefaultValue && !safeDefaultValueType) {
      return { text: CUSTOMER_HIDDEN_DETAIL, omitted: true };
    }
    if (anyDefaultValue && value != null && value !== '') {
      const scalar = String(value);
      const validTypedScalar = fieldType === 'NUMBER' || fieldType === 'CALC'
        ? /^-?\d+(?:\.\d+)?$/.test(scalar)
        : fieldType === 'DATE'
          ? /^\d{4}-\d{2}-\d{2}$/.test(scalar)
          : fieldType === 'TIME'
            ? /^\d{2}:\d{2}(?::\d{2})?$/.test(scalar)
            : fieldType === 'DATETIME'
              ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(scalar) && Number.isFinite(new Date(scalar).getTime())
              : true;
      if (!validTypedScalar) return { text: CUSTOMER_HIDDEN_DETAIL, omitted: true };
    }
    if (anyDefaultValue && /^(?:RADIO_BUTTON|CHECK_BOX|MULTI_SELECT|DROP_DOWN)$/.test(fieldType)) {
      const fieldCode = String(fieldInfo.activeCode || fieldInfo.rootCode || '');
      const allowedOptions = customerFieldOptionValuesForCode(fieldCode, preferredBundle, fallbackBundle);
      if (!allowedOptions.has(String(value))) {
        return { text: CUSTOMER_HIDDEN_DETAIL, omitted: true };
      }
    }
  }
  if (value && typeof value === 'object') {
    if (fieldInfo && fieldSettingIdentity(fieldInfo).settingKey === '(field)') {
      const summary = customerFieldDefinitionSummary(value);
      return { text: summary || `設定内容（${Object.keys(value as object).length}項目・${CUSTOMER_HIDDEN_DETAIL}）`, omitted: true };
    }
    const count = Array.isArray(value) ? value.length : Object.keys(value as object).length;
    const unit = Array.isArray(value) ? '件' : '項目';
    return { text: `設定内容（${count}${unit}・${CUSTOMER_HIDDEN_DETAIL}）`, omitted: true };
  }
  if (value === undefined) return { text: '（未設定）', omitted: false };
  if (value === null) return { text: '（値なし）', omitted: false };
  if (!customerScalarValueMatchesPath(path, value, fieldInfo, preferredBundle, fallbackBundle)) {
    return { text: CUSTOMER_HIDDEN_DETAIL, omitted: true };
  }
  if (typeof value === 'boolean') {
    const settingKey = fieldInfo ? fieldSettingIdentity(fieldInfo).settingKey : '';
    return { text: humanizeFieldSettingValue(value, settingKey), omitted: false };
  }

  const text = String(value);
  if (text === '') return { text: '（空欄）', omitted: false };
  if (customerUnsafeText(text) || /^\s*[\[{][\s\S]*[\]}]\s*$/.test(text)) {
    return { text: CUSTOMER_HIDDEN_DETAIL, omitted: true };
  }
  if (text.length > CUSTOMER_TEXT_LIMIT || text.split(/\r?\n/).length > 5) {
    return { text: `長文（${text.length}文字・${CUSTOMER_HIDDEN_DETAIL}）`, omitted: true };
  }
  if (/^(?:appSettings|appInfo)\.name$/.test(path) && customerUnsafeRawLabelText(text)) {
    return { text: CUSTOMER_HIDDEN_DETAIL, omitted: true };
  }
  if (path === 'appSettings.theme'
    && !/^(?:WHITE|RED|BLUE|GREEN|YELLOW|BLACK)$/i.test(text)) {
    return { text: CUSTOMER_HIDDEN_DETAIL, omitted: true };
  }
  if (/\.(?:width|height|innerHeight)$/i.test(path) && /^-?\d+(?:\.\d+)?$/.test(text)) {
    return { text: `${text}px`, omitted: false };
  }
  const fieldLabel = customerFieldLabelForCode(text, preferredBundle, fallbackBundle);
  if (fieldLabel) return { text: fieldLabel, omitted: false };
  if (/(?:\.fields\[\d+\]|\.code|\.relatedKeyField|\.relatedField|\.keyField|\.lookupPickerFields\[\d+\]|\.retrieveFields\[\d+\]|\.displayFields\[\d+\])$/i.test(path)) {
    return { text: 'フィールド（表示名を確認できません）', omitted: true };
  }
  if (/\.(?:filterCond|sort)$/i.test(path)) {
    const humanized = customerHumanizeExpression(text, path, preferredBundle, fallbackBundle);
    if (humanized) return { text: humanized, omitted: false };
    return {
      text: /\.sort$/i.test(path)
        ? '並び順が変更されました（詳細非表示）'
        : '条件が変更されました（詳細非表示）',
      omitted: true
    };
  }
  if (fieldInfo) {
    const settingKey = fieldSettingIdentity(fieldInfo).settingKey;
    if (settingKey === 'type' && typeof value === 'string' && !FIELD_TYPE_LABELS[value]) {
      return { text: CUSTOMER_HIDDEN_DETAIL, omitted: true };
    }
    return { text: humanizeFieldSettingValue(value, settingKey), omitted: false };
  }
  return { text, omitted: false };
}

function customerReviewNote(row: DiffXlsxRow): string {
  const key = sectionKeyOfRow(row);
  const fieldInfo = extractFieldPathInfo(String(row.path || ''));
  if (fieldInfo) {
    const identity = fieldDisplayIdentity(row, fieldInfo, { rows: [] });
    const setting = fieldSettingIdentity(fieldInfo);
    return fieldSettingReviewGuidance({
      rowIndex: 0,
      fieldKey: identity.fieldKey,
      fieldCode: identity.fieldCode,
      fieldName: identity.fieldName,
      fieldType: identity.fieldType,
      settingKey: setting.settingKey,
      settingLabel: setting.settingLabel,
      row
    });
  }
  const guidance: Record<string, string> = {
    appSettings: 'アプリの基本設定が意図した変更か確認してください。',
    appInfo: 'アプリ情報が意図した変更か確認してください。',
    layoutSettings: '配置や表示サイズが意図した変更か確認してください。',
    formSettings: 'フォーム設定が意図した変更か確認してください。',
    viewSettings: '表示項目・条件・並び順が意図した変更か確認してください。',
    reportSettings: 'グラフの項目・条件が意図した変更か確認してください。',
    processSettings: 'ステータス・遷移条件が意図した変更か確認してください。',
    actionSettings: 'アクション設定が意図した変更か確認してください。',
    categories: 'カテゴリ設定が意図した変更か確認してください。'
  };
  return guidance[key] || '変更内容が意図したものか確認してください。';
}

function customerHiddenReviewLocation(sourceHidden: boolean, targetHidden: boolean): string {
  if (sourceHidden && targetHidden) return '比較元と比較先の両方の環境';
  if (sourceHidden) return '比較元の環境';
  return '比較先の環境';
}

function buildCustomerDiffItems(ctx: DiffXlsxContext): CustomerDiffItem[] {
  const actualRows = (ctx.rows || []).filter((row) => !row._displayOnly && row.type !== 'same');
  const grouped = groupRowsBySection(actualRows);
  const items: CustomerDiffItem[] = [];
  for (const [sectionKey, rows] of grouped) {
    const sectionLabel = customerSectionLabel(sectionKey);
    if (CUSTOMER_HIGH_RISK_SECTION_KEYS.has(sectionKey) || !CUSTOMER_VISIBLE_SECTION_KEYS.has(sectionKey)) {
      const sourceHidden = rows.some((row) => row.type !== 'added' && row.left !== undefined);
      const targetHidden = rows.some((row) => row.type !== 'removed' && row.right !== undefined);
      const reviewLocation = customerHiddenReviewLocation(sourceHidden, targetHidden);
      items.push({
        sectionKey,
        sectionLabel,
        item: `${sectionLabel}（${rows.length}件の変更）`,
        changeType: customerAggregatedChangeType(rows),
        before: CUSTOMER_HIDDEN_DETAIL,
        after: CUSTOMER_HIDDEN_DETAIL,
        reviewNote: `設定内容は安全のため非表示です。詳細は権限のある担当者が${reviewLocation}で確認してください。`,
        omittedTechnicalValues: rows.length
      });
      continue;
    }
    for (const row of rows) {
      const before = customerSafeValue(row, 'source', ctx.sourceBundle, ctx.targetBundle);
      const after = customerSafeValue(row, 'target', ctx.sourceBundle, ctx.targetBundle);
      const omitted = before.omitted || after.omitted;
      const reviewLocation = customerHiddenReviewLocation(before.omitted, after.omitted);
      const baseReviewNote = customerReviewNote(row);
      items.push({
        sectionKey,
        sectionLabel,
        item: customerItemLabel(row, ctx.sourceBundle, ctx.targetBundle),
        changeType: customerChangeType(row),
        before: before.text,
        after: after.text,
        reviewNote: omitted
          ? `${baseReviewNote} 詳細は権限のある担当者が${reviewLocation}で確認してください。`
          : baseReviewNote,
        omittedTechnicalValues: omitted ? 1 : 0
      });
    }
  }
  return items;
}

function summarizeCustomerRows(rows: DiffXlsxRow[]) {
  const counts = { actual: 0, added: 0, removed: 0, contentChanged: 0, moved: 0 };
  for (const row of rows) {
    if (!row || row._displayOnly || row.type === 'same') continue;
    counts.actual += 1;
    if (row.moved || row.type === 'moved') counts.moved += 1;
    else if (row.type === 'added') counts.added += 1;
    else if (row.type === 'removed') counts.removed += 1;
    else counts.contentChanged += 1;
  }
  return counts;
}

function customerSectionBreakdown(rows: DiffXlsxRow[]): Array<[string, number, number, number, number, number]> {
  const grouped = new Map<string, DiffXlsxRow[]>();
  for (const row of rows) {
    if (!row || row._displayOnly || row.type === 'same') continue;
    const key = sectionKeyOfRow(row);
    const list = grouped.get(key) || [];
    list.push(row);
    grouped.set(key, list);
  }
  return [...grouped].map(([key, list]) => {
    const counts = summarizeCustomerRows(list);
    return [customerSectionLabel(key), counts.added, counts.removed, counts.contentChanged, counts.moved, counts.actual];
  });
}

function customerIncomplete(ctx: DiffXlsxContext): boolean {
  return !!((ctx.fetchIssues || []).length
    || (ctx.partialIssues || []).length
    || customerHasDiffTruncation(ctx.truncation));
}

function customerTruncationSectionIncomplete(section: DiffTruncationSection): boolean {
  const status = truncationScanStatusOf(section);
  if (status === 'partial' || status === 'unscanned' || section.partiallyScanned) return true;
  const omitted = section.omittedDiffCount;
  return omitted == null ? status !== 'complete' : Number(omitted) > 0;
}

function customerHasDiffTruncation(truncation: DiffXlsxTruncation | null | undefined): boolean {
  if (!truncation) return false;
  if (Number(truncation.droppedDiff || 0) > 0) return true;
  const sections = truncation.sections || [];
  if (sections.some(customerTruncationSectionIncomplete)) return true;
  if (!truncation.truncated) return false;
  const hasExplicitDiffCount = Object.prototype.hasOwnProperty.call(truncation, 'droppedDiff');
  const hasOnlySameOmission = Number(truncation.droppedSame || 0) > 0 && hasExplicitDiffCount;
  const hasCompleteSectionEvidence = sections.length > 0
    && sections.every((section) => truncationScanStatusOf(section) === 'complete'
      && Number(section.omittedDiffCount || 0) === 0);
  return !(hasOnlySameOmission || hasCompleteSectionEvidence);
}

function customerDateTime(value: unknown): string {
  const raw = String(value ?? '').trim();
  const normalized = typeof value === 'number'
    ? value
    : /^\d{11,}$/.test(raw)
      ? Number(raw)
      : raw;
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? humanDateTime(date.toISOString()) : '未記録';
}

function buildCustomerSummarySheet(ctx: DiffXlsxContext, items: CustomerDiffItem[]): XlsxSheet {
  const counts = summarizeCustomerRows(ctx.rows || []);
  const incomplete = customerIncomplete(ctx);
  const filtered = ctx.exportMode === 'filtered';
  const verdict = incomplete
    ? '比較未完了'
    : filtered
      ? counts.actual ? '絞り込み後：変更あり' : '絞り込み後：掲載対象なし'
      : counts.actual ? '変更あり' : '変更なし';
  const completeness = incomplete ? '一部未完了' : '正常完了（選択範囲）';
  const sourceName = customerAppName(ctx.sourceBundle, '比較元のアプリ');
  const targetName = customerAppName(ctx.targetBundle, '比較先のアプリ');
  const omitted = items.reduce((sum, item) => sum + item.omittedTechnicalValues, 0);
  const comparedScopes = ctx.scopes?.length ? ctx.scopes : [...new Set(items.map((item) => item.sectionKey))];
  const rows: (string | number | null)[][] = [
    ['kintone 設定差分確認レポート', '', '', '', '', ''],
    [`比較元：${sourceName}  ／  比較先：${targetName}`, '', '', '', '', ''],
    ['比較結果', verdict, '比較処理', completeness, '', '変更一覧を開く'],
    [filtered ? '掲載変更件数' : '変更件数', `${counts.actual}件`, '比較日時', customerDateTime(ctx.comparedAt), '', ''],
    ['追加', `${counts.added}件`, '削除', `${counts.removed}件`, '変更', `${counts.contentChanged}件`],
    ['要素の移動', `${counts.moved}件`, '詳細を省略した変更', omitted ? `${omitted}件（変更一覧で確認）` : '0件', '', ''],
    ['比較した設定領域', customerScopeLabel(comparedScopes), '', '', '', ''],
    ['掲載範囲', ctx.exportMode === 'filtered' ? '上記範囲内の一部' : '上記範囲内の全変更', '絞り込み', ctx.exportMode === 'filtered' ? 'あり' : 'なし', '比較条件の調整', hasCustomerComparisonAdjustments(ctx) ? 'あり' : 'なし'],
    ['掲載内容', '変更点のみ。上記以外の設定領域は比較していません。', '', '', '', ''],
    ['このレポートは比較元と比較先の現在設定の差を示すもので、設定の反映・移行計画ではありません。重要度、業務への影響、対応要否は自動判定していません。', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['分類別件数', '', '', '', '', ''],
    ['分類', '追加', '削除', '変更', '要素の移動', '合計'],
    ...customerSectionBreakdown(ctx.rows || [])
  ];
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = rows.map(() => []);
  cellStyles[2][1] = incomplete ? 'kpiWarning' : counts.actual ? 'kpiDanger' : 'kpiGood';
  cellStyles[2][3] = incomplete ? 'warning' : 'info';
  cellStyles[2][5] = 'hyperlink';
  cellStyles[3][1] = 'info';
  cellStyles[3][3] = 'info';
  cellStyles[4][1] = 'info';
  cellStyles[4][3] = 'info';
  cellStyles[4][5] = 'info';
  cellStyles[5][1] = 'info';
  cellStyles[5][3] = omitted ? 'warning' : 'info';
  cellStyles[6][1] = 'info';
  cellStyles[7][1] = 'info';
  cellStyles[7][3] = 'info';
  cellStyles[7][5] = 'info';
  cellStyles[8][1] = 'info';
  cellStyles[9][0] = 'info';
  cellStyles[11][0] = 'sectionHeader';
  return {
    name: '比較概要',
    rows,
    colWidths: [20, 34, 18, 32, 18, 24],
    rowStyles: rows.map(() => 'normal'),
    cellStyles,
    headerRow: 13,
    freezeRows: 2,
    rowHeights: rows.map((row, index) => {
      if (index === 0) return 36;
      if (index === 1) return 28;
      if (index === 9) return readableDiffRowHeight([{ value: row[0], width: 72 }], 74);
      return index === 12 ? 30 : 24;
    }),
    merges: ['A1:F1', 'A2:F2', 'B7:F7', 'B9:F9', 'A10:F10', 'A12:F12'],
    internalHyperlinks: [{
      ref: 'F3',
      targetSheet: '変更一覧',
      targetCell: 'A2',
      tooltip: '変更一覧へ移動'
    }],
    showGridLines: false,
    print: {
      orientation: 'portrait',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 2 }
    }
  };
}

function buildCustomerListSheet(ctx: DiffXlsxContext, items: CustomerDiffItem[]): XlsxSheet {
  const sourceName = customerAppName(ctx.sourceBundle, '比較元');
  const targetName = customerAppName(ctx.targetBundle, '比較先');
  const headers = [
    'No.', '分類', '対象', '変更区分',
    `比較元\n${sourceName}`, `比較先\n${targetName}`, '確認ポイント',
    '顧客レビュー状況', '対応方針', '担当者', 'コメント'
  ];
  const rows: (string | number | null)[][] = [
    ['比較元と比較先の現在設定を確認し、「顧客レビュー状況」から「コメント」までの4列に確認結果を入力してください。', '', '', '', '', '', '', '', '', '', ''],
    headers
  ];
  const rowStyles: XlsxRowStyle[] = ['normal', 'normal'];
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [['info'], []];
  const rowHeights: number[] = [30, 42];
  items.forEach((item, index) => {
    rows.push([
      index + 1,
      item.sectionLabel,
      item.item,
      item.changeType,
      item.before,
      item.after,
      item.reviewNote,
      '未レビュー',
      '未判断',
      '',
      ''
    ]);
    rowStyles.push('normal');
    const styles: Array<XlsxCellStyle | undefined> = [];
    styles[4] = 'sourceDivider';
    styles[5] = 'target';
    styles[6] = 'info';
    styles[7] = 'review';
    styles[8] = 'review';
    styles[9] = 'review';
    styles[10] = 'review';
    cellStyles.push(styles);
    rowHeights.push(readableDiffRowHeight([
      { value: item.sectionLabel, width: 18 },
      { value: item.item, width: 34 },
      { value: item.before, width: 36 },
      { value: item.after, width: 36 },
      { value: item.reviewNote, width: 38 }
    ], 132));
  });
  const lastRow = items.length + 2;
  return {
    name: '変更一覧',
    rows,
    colWidths: [8, 18, 34, 16, 36, 36, 38, 14, 16, 16, 28],
    rowStyles,
    cellStyles,
    headerRow: 2,
    freezeRows: 2,
    freezeColumns: 3,
    rowHeights,
    merges: ['A1:K1'],
    dataValidations: items.length ? [{
      sqref: `H3:H${lastRow}`,
      values: CUSTOMER_REVIEW_STATUS_VALUES,
      promptTitle: '顧客レビュー状況',
      prompt: '顧客レビューの進捗を選択してください'
    }, {
      sqref: `I3:I${lastRow}`,
      values: CUSTOMER_ACTION_DECISION_VALUES,
      promptTitle: '対応方針',
      prompt: '人が判断した対応方針を選択してください'
    }] : [],
    showGridLines: false,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 2, to: 2 }
    }
  };
}

function customerIssueSide(side: unknown): string {
  if (side === 'source') return '比較元';
  if (side === 'target') return '比較先';
  if (side === 'both') return '比較元・比較先';
  return '対象範囲';
}

function buildCustomerIssuesSheet(ctx: DiffXlsxContext): XlsxSheet | null {
  if (!customerIncomplete(ctx)) return null;
  const rows: (string | number | null)[][] = [
    ['このシートの範囲は比較結果に含まれていないか、一部だけ確認できています。', '', '', ''],
    ['分類', '対象', '確認状態', '説明']
  ];
  for (const issue of ctx.fetchIssues || []) {
    rows.push([
      customerSectionLabel(String(issue.sectionKey || issue.section || '')),
      customerIssueSide(issue.side),
      '取得できませんでした',
      'この範囲は比較結果に含まれていません。再取得して確認してください。'
    ]);
  }
  for (const issue of ctx.partialIssues || []) {
    rows.push([
      customerSectionLabel(String(issue.sectionKey || issue.section || '')),
      customerIssueSide(issue.side),
      '一部のみ確認',
      '取得できた範囲だけを比較しています。必要に応じて再取得してください。'
    ]);
  }
  if (customerHasDiffTruncation(ctx.truncation)) {
    const incompleteSections = (ctx.truncation?.sections || []).filter(customerTruncationSectionIncomplete);
    const sections: DiffTruncationSection[] = incompleteSections.length
      ? incompleteSections
      : [{ section: '比較対象全体', partiallyScanned: true, scanStatus: 'partial' }];
    for (const section of sections) {
      const status = truncationScanStatusOf(section);
      rows.push([
        customerSectionLabel(String(section.sectionKey || section.section || '')),
        '件数上限の対象',
        status === 'unscanned' ? '未確認' : status === 'partial' ? '一部のみ確認' : '表示を一部省略',
        status === 'unscanned'
          ? 'この範囲は確認できていません。条件を分けて再比較してください。'
          : status === 'partial'
            ? '確認できた件数は全体の一部です。条件を分けて再比較してください。'
            : '範囲の確認は完了していますが、表示を一部省略しています。'
      ]);
    }
  }
  return {
    name: '確認できなかった範囲',
    rows,
    colWidths: [24, 20, 22, 72],
    rowStyles: rows.map(() => 'normal'),
    cellStyles: rows.map((_, index) => index === 0 ? ['warning'] : index === 1 ? [] : ['warning']),
    headerRow: 2,
    freezeRows: 2,
    freezeColumns: 2,
    rowHeights: rows.map((row, index) => index < 2 ? (index === 0 ? 36 : 30) : readableDiffRowHeight([
      { value: row[0], width: 24 },
      { value: row[1], width: 20 },
      { value: row[2], width: 22 },
      { value: row[3], width: 72 }
    ], 118)),
    merges: ['A1:D1'],
    showGridLines: false,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 2, to: 2 }
    }
  };
}

function buildCustomerDiffXlsxSheets(ctx: DiffXlsxContext): XlsxSheet[] {
  const items = buildCustomerDiffItems(ctx);
  const sheets: XlsxSheet[] = [buildCustomerSummarySheet(ctx, items)];
  const issues = buildCustomerIssuesSheet(ctx);
  if (issues) sheets.push(issues);
  sheets.push(buildCustomerListSheet(ctx, items));
  return sheets;
}

export function buildDiffXlsxSheets(ctx: DiffXlsxContext): XlsxSheet[] {
  if (ctx.audience !== 'internal') return buildCustomerDiffXlsxSheets(ctx);
  const rows = ctx.rows || [];
  const grouped = groupRowsBySection(rows);
  const fieldModel = buildDiffXlsxFieldModel(ctx);
  const actionableFieldRows = rows.filter((row) => (row.sectionKey || row.section) === 'fieldSettings'
    && !row._displayOnly
    && row.type !== 'same');
  const unstructuredFieldDiffCount = Math.max(0, actionableFieldRows.length - fieldModel.details.length);
  const differenceRefs = buildDifferenceRefs(rows);
  const technicalRefs = buildTechnicalRefs(rows);
  const differenceRefsBySection = new Map<string, DiffXlsxDifferenceRef[]>();
  rows.forEach((row, index) => {
    const key = sectionKeyOfRow(row);
    const refs = differenceRefsBySection.get(key) || [];
    refs.push(differenceRefs[index]);
    differenceRefsBySection.set(key, refs);
  });
  const sheets: XlsxSheet[] = [buildSummarySheet(
    ctx,
    grouped,
    fieldModel.summaries.length,
    fieldModel.details.length,
    unstructuredFieldDiffCount
  )];
  const issuesSheet = buildIssuesSheet(ctx);
  if (issuesSheet) sheets.push(issuesSheet);
  if (fieldModel.details.length) {
    sheets.push(
      buildFieldSummarySheet(fieldModel, ctx.sourceBundle, ctx.targetBundle, differenceRefs),
      buildFieldDetailSheet(fieldModel, ctx.sourceBundle, ctx.targetBundle, differenceRefs)
    );
  }
  sheets.push(buildListSheet(
    rows,
    '差分一覧',
    ctx.sourceBundle,
    ctx.targetBundle,
    differenceRefs,
    technicalRefs,
    fieldModel
  ));
  for (const [key, list] of grouped) {
    sheets.push(buildSectionSheet(
      sectionSheetName(key),
      list,
      ctx.sourceBundle,
      ctx.targetBundle,
      differenceRefsBySection.get(key)
    ));
  }
  return sheets;
}

export function buildDiffXlsxBlob(ctx: DiffXlsxContext): Blob {
  return buildXlsxBlob(buildDiffXlsxSheets(ctx));
}

export function buildDiffXlsxExport(ctx: DiffXlsxContext): { filename: string; blob: Blob } {
  const blob = buildDiffXlsxBlob(ctx);
  if (ctx.audience !== 'internal') {
    const sourceName = customerAppName(ctx.sourceBundle, '比較元');
    const targetName = customerAppName(ctx.targetBundle, '比較先');
    const pairLabel = [sourceName, targetName].filter(Boolean).join('_vs_');
    return {
      filename: buildExportFilename('設定差分確認', 'xlsx', { appLabel: pairLabel }),
      blob
    };
  }
  const srcName = extractAppNameFromBundle(ctx.sourceBundle);
  const tgtName = extractAppNameFromBundle(ctx.targetBundle);
  const src = buildAppFilenameLabel(ctx.sourceBundle?.appId, srcName);
  const tgt = buildAppFilenameLabel(ctx.targetBundle?.appId, tgtName);
  const pairLabel = src && tgt ? `${src}_vs_${tgt}` : (src || tgt || '');
  const filename = ctx.filename || buildExportFilename('差分一覧', 'xlsx', { appLabel: pairLabel });
  return { filename, blob };
}

export function runExportDiffXlsx(ctx: DiffXlsxContext): { filename: string; blob: Blob } {
  const result = buildDiffXlsxExport(ctx);
  downloadBlob(result.filename, result.blob);
  return result;
}
