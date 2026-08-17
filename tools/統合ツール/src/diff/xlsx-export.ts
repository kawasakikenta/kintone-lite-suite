'use strict';

import { SECTION_DEFS } from '../constants.js';
import {
  downloadBlob,
  buildExportFilename,
  buildAppFilenameLabel,
  extractAppNameFromBundle,
  getSeverityDisplayLabel,
  getIssueSideLabel,
  stableStringify
} from '../utils.js';
import { stringifyRowValueForDiff, getDiffExportContentLabel } from './export.js';
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
  meta?: { appName?: string };
  sections?: Record<string, any>;
}

export interface DiffXlsxContext {
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
  severity: 'high' | 'medium' | 'low';
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
  severity: 'high' | 'medium' | 'low';
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
    const key = r.sectionKey || '(その他)';
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

function normalizeSeverity(severity: string | undefined): 'high' | 'medium' | 'low' {
  const value = String(severity || '').toLowerCase();
  if (value === 'high' || value === 'medium') return value;
  return 'low';
}

function severityRank(severity: string | undefined): number {
  const value = normalizeSeverity(severity);
  return value === 'high' ? 2 : value === 'medium' ? 1 : 0;
}

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
      severity: normalizeSeverity(row.severity),
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
        severity: detail.severity,
        settingLabels: [],
        summary: ''
      };
      byField.set(detail.fieldKey, summary);
    }
    summary.diffCount += 1;
    if (detail.row.type === 'added') summary.added += 1;
    else if (detail.row.type === 'removed') summary.removed += 1;
    else summary.changed += 1;
    if (severityRank(detail.severity) > severityRank(summary.severity)) summary.severity = detail.severity;
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
  summaries.sort((a, b) => severityRank(b.severity) - severityRank(a.severity)
    || a.fieldCode.localeCompare(b.fieldCode, 'ja'));
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
  return (scopes || []).map((key) => sectionLabelOf(key)).join('、');
}

function rowStyleOf(row: DiffXlsxRow): XlsxRowStyle {
  if (row._displayOnly) return 'reference';
  if (row.type === 'added') return 'added';
  if (row.type === 'removed') return 'removed';
  if (row.type === 'same') return 'same';
  return 'changed';
}

function severityStyleOf(severity: string | undefined): XlsxCellStyle {
  const normalized = String(severity || '').toLowerCase();
  if (normalized === 'high') return 'severityHigh';
  if (normalized === 'medium') return 'severityMedium';
  return 'severityLow';
}

function rowTypeLabel(row: DiffXlsxRow): string {
  if (row._displayOnly) return '参考（件数外）';
  if (row.moved || row.type === 'moved') return '移動';
  if (row.type === 'added') return '追加（比較先のみ）';
  if (row.type === 'removed') return '削除（比較元のみ）';
  if (row.type === 'changed') return '変更';
  if (row.type === 'same') return '同一';
  return String(row.type || '-');
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
  if (row.label) return String(row.label);
  try {
    const decoded = decodeRow(row as any);
    const where = decoded.whereChips.map((chip) => chip.label).filter(Boolean).join(' / ');
    return [where, decoded.propLabel].filter(Boolean).join(' / ') || decoded.oneLineSummary || row.path || '';
  } catch {
    return row.path || '';
  }
}

function rowNote(row: DiffXlsxRow): string {
  const notes = [
    row.reasonSummary || '',
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
  const suffix = `\n…（Excel表示用に省略・元UTF-16長 ${originalUtf16Length}・識別:${shortStableHash(text)}）`;
  let keep = XLSX_DIFF_VALUE_PREVIEW_LIMIT - suffix.length;
  // UTF-16 サロゲートペアの途中で切らない。
  if (keep > 0 && /[\uD800-\uDBFF]/.test(text.charAt(keep - 1))) keep -= 1;
  return text.slice(0, Math.max(0, keep)) + suffix;
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

function fieldDetailValue(detail: DiffXlsxFieldDetail, side: 'source' | 'target'): string {
  const row = detail.row;
  const missing = side === 'source'
    ? row.left === undefined || row.type === 'added'
    : row.right === undefined || row.type === 'removed';
  if (missing) return side === 'source'
    ? '—（比較元には存在しません）'
    : '—（比較先には存在しません）';
  if (detail.settingKey === '(field)') {
    const summary = conciseFieldDefinition(side === 'source' ? row.left : row.right);
    return summary || '要約できない形式です。差分IDから「差分一覧」、または「フィールド技術明細」を確認してください。';
  }
  return rowValue(row, side);
}

function readableDiffRowHeight(...values: string[]): number {
  const maxLines = values.reduce((max, value) => {
    const lines = String(value || '').split(/\r?\n/).length;
    return Math.max(max, lines);
  }, 1);
  // Keep simple rows compact while preventing wrapped JSON from consuming an
  // entire screen. Excel users can still expand a row to inspect more text.
  return Math.min(70, 22 + Math.min(4, maxLines - 1) * 12);
}

function summarizeRows(rows: DiffXlsxRow[]) {
  const counts = {
    actual: 0,
    added: 0,
    removed: 0,
    changed: 0,
    moved: 0,
    same: 0,
    reference: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  for (const row of rows) {
    if (row._displayOnly) { counts.reference += 1; continue; }
    if (row.type === 'same') { counts.same += 1; continue; }
    counts.actual += 1;
    const severity = String(row.severity || 'low').toLowerCase();
    if (severity === 'high') counts.high += 1;
    else if (severity === 'medium') counts.medium += 1;
    else counts.low += 1;
    if (row.type === 'added') counts.added += 1;
    else if (row.type === 'removed') counts.removed += 1;
    else counts.changed += 1;
    if (row.moved || row.type === 'moved') counts.moved += 1;
  }
  return counts;
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

  const fieldIncomplete = (ctx.fetchIssues || []).some((issue) => (issue.sectionKey || issue.section) === 'fieldSettings')
    || (ctx.partialIssues || []).some((issue) => (issue.sectionKey || issue.section) === 'fieldSettings')
    || (ctx.truncation?.sections || []).some((section) => (section.sectionKey || section.section) === 'fieldSettings');
  const known = [
    fieldCount ? `${fieldCount}フィールド / ${settingDiffCount}設定差分` : '',
    unstructuredFieldDiffCount ? `構造化できない差分 ${unstructuredFieldDiffCount}件` : ''
  ].filter(Boolean).join('、');
  if (fieldIncomplete) return `未判定${known ? `（確認できた範囲: ${known}）` : '（取得・走査が不完全）'}`;
  if (unstructuredFieldDiffCount) return `${known}。技術明細を確認してください`;
  if (fieldCount) return `${fieldCount}フィールド / ${settingDiffCount}設定差分`;
  return ctx.exportMode === 'filtered' ? '0件（この出力範囲内）' : '0件（走査済み）';
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
    ? '要確認（比較結果は不完全です。差分なしとは判断できません）'
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
  const fieldStatusIncomplete = fieldStatus.startsWith('未判定');
  const fieldLinkTarget = fieldCount
    ? { sheet: 'フィールド差分要約', cell: 'C3', label: 'フィールド差分を見る' }
    : unstructuredFieldDiffCount
      ? { sheet: 'フィールド技術明細', cell: 'A3', label: '技術明細を見る' }
      : null;

  const sheetRows: (string | number | null)[][] = [
    ['kintone 設定差分比較レポート', '', '', ''],
    [comparisonBanner, '', '', ''],
    ['生成日時', ctx.generatedAt || new Date().toISOString(), '比較日時', ctx.comparedAt == null || ctx.comparedAt === '' ? '未記録' : String(ctx.comparedAt)],
    ['', '', '', ''],
    ['判定', verdict, '完全性', completeness],
    ['差分件数', counts.actual, '取得失敗', fetchIssues.length],
    ['追加（比較先のみ）', counts.added, '削除（比較元のみ）', counts.removed],
    ['変更', counts.changed, '一部未検証', partialIssues.length],
    ['移動（変更の内数）', counts.moved, '件数上限', truncation ? '省略あり' : '省略なし'],
    ['重要度 高 / 中 / 低', `${counts.high} / ${counts.medium} / ${counts.low}`, '同一 / 参考行', `${counts.same} / ${counts.reference}`],
    ['', '', '', ''],
    ['比較の向き・条件', '', '', ''],
    ['比較元', appLabel(ctx.sourceBundle), '比較先', appLabel(ctx.targetBundle)],
    ['環境', bundleEnvironmentLabel(ctx.sourceBundle), '環境', bundleEnvironmentLabel(ctx.targetBundle)],
    ['比較方向', '比較元 → 比較先', '出力範囲', ctx.exportLabel || (ctx.exportMode === 'filtered' ? '表示中（フィルタ適用後）' : '全件')],
    ['比較対象', scopeLabel(ctx.scopes), '出力内容', getDiffExportContentLabel(ctx.exportContentMode || 'diffOnly')],
    ['正規化設定', normalizationLabel(ctx.normalizationPresetState), '無視キー', String(ctx.ignoreKeys || '')],
    ['フィールド差分', fieldStatus, '', fieldLinkTarget?.label || ''],
    ['使い方', `「差分一覧」の黄色い3列に確認状態・担当者・コメントを記入し、フィルタで絞り込めます。確認状態の初期値は「未確認」です。${fieldCount ? ' フィールド差分は「フィールド差分要約」で対象を特定し、「フィールド差分詳細」で設定項目ごとの比較値を確認できます。' : ''}`, '', ''],
    ['', '', '', ''],
    ['セクション別集計', '', '', ''],
    ['セクション', '一覧行数', '差分件数', '走査・取得状態']
  ];
  for (const [key, list] of grouped) {
    sheetRows.push([
      sectionLabelOf(key),
      list.length,
      summarizeRows(list).actual,
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
  for (const index of warningRows) rowStyles[index] = 'warning';
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = sheetRows.map(() => []);
  cellStyles[0][0] = 'title';
  cellStyles[1][0] = 'sectionHeader';
  cellStyles[4] = [
    'sectionHeader',
    incomplete ? 'kpiDanger' : counts.actual > 0 ? 'kpiWarning' : 'kpiGood',
    'sectionHeader',
    incomplete ? 'kpiDanger' : 'kpiGood'
  ];
  for (const rowIndex of [5, 6, 7, 8, 9]) {
    cellStyles[rowIndex] = ['info', 'kpiWarning', 'info', 'kpiWarning'];
  }
  cellStyles[5][1] = counts.actual > 0 ? 'kpiWarning' : 'kpiGood';
  cellStyles[5][3] = fetchIssues.length > 0 ? 'kpiDanger' : 'kpiGood';
  cellStyles[7][3] = partialIssues.length > 0 ? 'kpiDanger' : 'kpiGood';
  cellStyles[8][3] = truncation ? 'kpiDanger' : 'kpiGood';
  for (const rowIndex of [11, 20]) cellStyles[rowIndex][0] = 'sectionHeader';
  cellStyles[21] = ['sectionHeader', 'sectionHeader', 'sectionHeader', 'sectionHeader'];
  cellStyles[17] = ['info', fieldStatusIncomplete ? 'kpiDanger' : fieldCount || unstructuredFieldDiffCount ? 'kpiWarning' : 'kpiGood'];
  if (fieldLinkTarget) cellStyles[17][3] = 'hyperlink';
  const merges = ['A1:D1', 'A2:D2', 'A12:D12', 'A21:D21'];
  for (const index of warningRows) merges.push(`B${index + 1}:D${index + 1}`);
  return {
    name: '概要',
    autoFilter: false,
    freezeHeader: false,
    colWidths: [24, 54, 22, 54],
    rows: sheetRows,
    rowStyles,
    cellStyles,
    rowHeights: [32, 24],
    merges,
    internalHyperlinks: fieldLinkTarget ? [{
      ref: 'D18',
      targetSheet: fieldLinkTarget.sheet,
      targetCell: fieldLinkTarget.cell,
      tooltip: '差分があるフィールドの一覧へ移動'
    }] : [],
    showGridLines: false,
    print: {
      orientation: 'portrait',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 2 }
    }
  };
}

const REVIEW_STATUS_VALUES = ['未確認', '確認中', '対応要', '対応不要', '確認済み'];

function stableDifferenceId(row: DiffXlsxRow, seen: Map<string, number>): string {
  const leftDigest = shortStableHash(stableStringify(row.left) ?? 'undefined');
  const rightDigest = shortStableHash(stableStringify(row.right) ?? 'undefined');
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

function buildDifferenceRefs(rows: DiffXlsxRow[]): DiffXlsxDifferenceRef[] {
  const refs: DiffXlsxDifferenceRef[] = [];
  const seenIds = new Map<string, number>();
  rows.forEach((row, index) => refs.push({
    id: stableDifferenceId(row, seenIds),
    rowNumber: index + 3
  }));
  return refs;
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
  differenceRefs?: DiffXlsxDifferenceRef[]
): XlsxSheet {
  const headers = [
    '差分ID', '重要度', '種別', 'セクション', '項目',
    '確認状態', '担当者', 'レビューコメント',
    'パス', directionalValueHeader('source', sourceBundle), directionalValueHeader('target', targetBundle), '確認ポイント'
  ];
  const groupHeader = [
    '差分の識別', '', '', '', '',
    'レビュー入力（黄色）', '', '',
    '技術パス', '値の比較（比較元 → 比較先）', '', '確認ポイント'
  ];
  const out: (string | number | null)[][] = [groupHeader, headers];
  const rowStyles: XlsxRowStyle[] = ['normal', 'normal'];
  const groupCellStyles: Array<XlsxCellStyle | undefined> = [];
  groupCellStyles[0] = 'sectionHeader';
  groupCellStyles[5] = 'kpiWarning';
  groupCellStyles[8] = 'info';
  groupCellStyles[9] = 'sectionHeader';
  groupCellStyles[11] = 'info';
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [groupCellStyles, []];
  const rowHeights: number[] = [24, 42];
  const seenIds = new Map<string, number>();
  for (const [rowIndex, row] of rows.entries()) {
    const sourceValue = rowValue(row, 'source');
    const targetValue = rowValue(row, 'target');
    const note = rowNote(row);
    out.push([
      differenceRefs?.[rowIndex]?.id || stableDifferenceId(row, seenIds),
      getSeverityDisplayLabel(row.severity || 'low'),
      rowTypeLabel(row),
      sectionLabelOf(row.sectionKey || row.section || ''),
      rowItemLabel(row, sourceBundle, targetBundle),
      '未確認',
      '',
      '',
      row.path || '',
      sourceValue,
      targetValue,
      note
    ]);
    const rowStyle = rowStyleOf(row);
    rowStyles.push(rowStyle);
    const styles: Array<XlsxCellStyle | undefined> = ['info', severityStyleOf(row.severity)];
    styles[5] = 'review';
    styles[6] = 'review';
    styles[7] = 'review';
    cellStyles.push(styles);
    rowHeights.push(readableDiffRowHeight(sourceValue, targetValue, note));
  }
  const dataValidations = rows.length
    ? [{
        sqref: `F3:F${rows.length + 2}`,
        values: REVIEW_STATUS_VALUES,
        promptTitle: '確認状態',
        prompt: 'レビューの進捗を選択してください'
      }]
    : [];
  return {
    name,
    rows: out,
    colWidths: [15, 9, 16, 18, 30, 14, 16, 28, 34, 42, 42, 32],
    rowStyles,
    cellStyles,
    headerRow: 2,
    freezeRows: 2,
    freezeColumns: 5,
    rowHeights,
    merges: ['A1:E1', 'F1:H1', 'J1:K1'],
    dataValidations,
    showGridLines: false,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 2 }
    }
  };
}

function buildSectionSheet(
  label: string,
  list: DiffXlsxRow[],
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): XlsxSheet {
  const headers = [
    '差分ID', '重要度', '種別', '項目', 'パス',
    directionalValueHeader('source', sourceBundle),
    directionalValueHeader('target', targetBundle),
    '確認ポイント'
  ];
  const groupHeader = [
    '差分の識別', '', '', '', '技術パス',
    '値の比較（比較元 → 比較先）', '', '確認ポイント'
  ];
  const rows: (string | number | null)[][] = [groupHeader, headers];
  const rowStyles: XlsxRowStyle[] = ['normal', 'normal'];
  const groupCellStyles: Array<XlsxCellStyle | undefined> = [];
  groupCellStyles[0] = 'sectionHeader';
  groupCellStyles[4] = 'info';
  groupCellStyles[5] = 'sectionHeader';
  groupCellStyles[7] = 'info';
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [groupCellStyles, []];
  const rowHeights: number[] = [24, 42];
  const seenIds = new Map<string, number>();
  for (const row of list) {
    const sourceValue = rowValue(row, 'source');
    const targetValue = rowValue(row, 'target');
    const note = rowNote(row);
    rows.push([
      stableDifferenceId(row, seenIds),
      getSeverityDisplayLabel(row.severity || 'low'),
      rowTypeLabel(row),
      rowItemLabel(row, sourceBundle, targetBundle),
      row.path || '',
      sourceValue,
      targetValue,
      note
    ]);
    rowStyles.push(rowStyleOf(row));
    cellStyles.push(['info', severityStyleOf(row.severity)]);
    rowHeights.push(readableDiffRowHeight(sourceValue, targetValue, note));
  }
  return {
    name: label,
    rows,
    colWidths: [15, 9, 16, 30, 34, 42, 42, 32],
    rowStyles,
    cellStyles,
    headerRow: 2,
    freezeRows: 2,
    freezeColumns: 4,
    rowHeights,
    merges: ['A1:D1', 'F1:G1'],
    showGridLines: false,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 2 }
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

function fieldSummaryRowStyle(summary: DiffXlsxFieldSummary, model: DiffXlsxFieldModel): XlsxRowStyle {
  const rootType = fieldSummaryRootChangeType(summary, model);
  if (rootType === 'added') return 'added';
  if (rootType === 'removed') return 'removed';
  return 'changed';
}

function fieldSummaryStateLabel(summary: DiffXlsxFieldSummary, model: DiffXlsxFieldModel): string {
  const rootType = fieldSummaryRootChangeType(summary, model);
  if (rootType === 'added') return '追加（比較先のみ）';
  if (rootType === 'removed') return '削除（比較元のみ）';
  return '設定変更';
}

function buildFieldSummarySheet(model: DiffXlsxFieldModel): XlsxSheet {
  const firstDetailRowByField = new Map<string, number>();
  model.details.forEach((detail, index) => {
    if (!firstDetailRowByField.has(detail.fieldKey)) firstDetailRowByField.set(detail.fieldKey, index + 3);
  });
  const groupHeader = [
    '判断', '',
    '差分フィールド', '', '',
    '変更内容', '',
    'ナビゲーション'
  ];
  const headers = [
    '状態', '影響度',
    'フィールド名', 'フィールドコード', 'フィールド種別',
    '設定差分数', '主な変更', '詳細'
  ];
  const rows: (string | number | null)[][] = [groupHeader, headers];
  const rowStyles: XlsxRowStyle[] = ['normal', 'normal'];
  const groupCellStyles: Array<XlsxCellStyle | undefined> = [];
  groupCellStyles[0] = 'kpiWarning';
  groupCellStyles[2] = 'sectionHeader';
  groupCellStyles[5] = 'info';
  groupCellStyles[7] = 'info';
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [groupCellStyles, []];
  const rowHeights: number[] = [24, 32];
  for (const summary of model.summaries) {
    const settings = summary.settingLabels.join('、');
    rows.push([
      fieldSummaryStateLabel(summary, model),
      getSeverityDisplayLabel(summary.severity),
      summary.fieldName,
      summary.fieldCode,
      summary.fieldType,
      summary.diffCount,
      settings,
      `詳細を見る（${summary.diffCount}件）`
    ]);
    rowStyles.push(fieldSummaryRowStyle(summary, model));
    const styles: Array<XlsxCellStyle | undefined> = [undefined, severityStyleOf(summary.severity)];
    styles[3] = 'info';
    styles[4] = 'info';
    styles[5] = summary.severity === 'high' ? 'kpiDanger' : 'kpiWarning';
    styles[7] = 'hyperlink';
    cellStyles.push(styles);
    rowHeights.push(readableDiffRowHeight(settings));
  }
  return {
    name: 'フィールド差分要約',
    rows,
    colWidths: [20, 10, 30, 32, 20, 12, 48, 22],
    rowStyles,
    cellStyles,
    headerRow: 2,
    freezeRows: 2,
    freezeColumns: 5,
    rowHeights,
    merges: ['A1:B1', 'C1:E1', 'F1:G1'],
    internalHyperlinks: model.summaries.map((summary, index) => ({
      ref: `H${index + 3}`,
      targetSheet: 'フィールド差分詳細',
      targetCell: `C${firstDetailRowByField.get(summary.fieldKey) || 3}`,
      tooltip: `${summary.fieldName}の詳細差分へ移動`
    })),
    showGridLines: false,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 2 }
    }
  };
}

function buildFieldDetailSheet(
  model: DiffXlsxFieldModel,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle,
  differenceRefs?: DiffXlsxDifferenceRef[]
): XlsxSheet {
  const summaryRowByField = new Map(model.summaries.map((summary, index) => [summary.fieldKey, index + 3]));
  const groupHeader = [
    '差分の識別', '差分フィールド', '', '',
    '設定差分', '',
    '値の比較（比較元 → 比較先）', '',
    '技術情報', '',
    'ナビゲーション'
  ];
  const headers = [
    '差分ID', '影響度', 'フィールド名', 'フィールドコード',
    '設定項目', '種別',
    directionalValueHeader('source', sourceBundle),
    directionalValueHeader('target', targetBundle),
    'パス', '確認ポイント', '要約へ'
  ];
  const rows: (string | number | null)[][] = [groupHeader, headers];
  const rowStyles: XlsxRowStyle[] = ['normal', 'normal'];
  const groupCellStyles: Array<XlsxCellStyle | undefined> = [];
  groupCellStyles[0] = 'info';
  groupCellStyles[1] = 'sectionHeader';
  groupCellStyles[4] = 'info';
  groupCellStyles[6] = 'sectionHeader';
  groupCellStyles[8] = 'info';
  groupCellStyles[10] = 'info';
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [groupCellStyles, []];
  const rowHeights: number[] = [24, 42];
  for (const detail of model.details) {
    const sourceValue = fieldDetailValue(detail, 'source');
    const targetValue = fieldDetailValue(detail, 'target');
    const note = rowNote(detail.row);
    const diffRef = differenceRefs?.[detail.rowIndex];
    rows.push([
      diffRef?.id || '',
      getSeverityDisplayLabel(detail.severity),
      detail.fieldName,
      detail.fieldCode,
      detail.settingLabel,
      rowTypeLabel(detail.row),
      sourceValue,
      targetValue,
      detail.row.path || '',
      note,
      '要約へ戻る'
    ]);
    rowStyles.push(rowStyleOf(detail.row));
    const styles: Array<XlsxCellStyle | undefined> = ['hyperlink', severityStyleOf(detail.severity)];
    styles[3] = 'info';
    styles[8] = 'info';
    styles[10] = 'hyperlink';
    if (detail.row.type === 'added') {
      styles[6] = 'reference';
      styles[7] = 'added';
    } else if (detail.row.type === 'removed') {
      styles[6] = 'removed';
      styles[7] = 'reference';
    }
    else {
      styles[6] = 'removed';
      styles[7] = 'added';
    }
    cellStyles.push(styles);
    rowHeights.push(readableDiffRowHeight(sourceValue, targetValue, note));
  }
  return {
    name: 'フィールド差分詳細',
    rows,
    colWidths: [15, 10, 30, 32, 34, 18, 46, 46, 46, 34, 16],
    rowStyles,
    cellStyles,
    headerRow: 2,
    freezeRows: 2,
    freezeColumns: 5,
    rowHeights,
    merges: ['B1:D1', 'E1:F1', 'G1:H1', 'I1:J1'],
    internalHyperlinks: [
      ...model.details.map((detail, index) => ({
        ref: `A${index + 3}`,
        targetSheet: '差分一覧',
        targetCell: `A${differenceRefs?.[detail.rowIndex]?.rowNumber || 3}`,
        tooltip: `${detail.fieldName}の全差分行へ移動`
      })),
      ...model.details.map((detail, index) => ({
        ref: `K${index + 3}`,
        targetSheet: 'フィールド差分要約',
        targetCell: `C${summaryRowByField.get(detail.fieldKey) || 3}`,
        tooltip: `${detail.fieldName}の要約へ戻る`
      }))
    ],
    showGridLines: false,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 2 }
    }
  };
}

function buildIssuesSheet(ctx: DiffXlsxContext): XlsxSheet | null {
  const fetchIssues = ctx.fetchIssues || [];
  const partialIssues = ctx.partialIssues || [];
  const truncation = ctx.truncation?.truncated ? ctx.truncation : null;
  if (!fetchIssues.length && !partialIssues.length && !truncation) return null;

  const rows: (string | number | null)[][] = [['区分', 'セクション', '対象', '内容', '対象ファイル・補足']];
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
    rowStyles: rows.map((_, index) => index === 0 ? 'normal' : 'warning'),
    freezeColumns: 2,
    rowHeights: [30],
    showGridLines: false,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 1 }
    }
  };
}

export function buildDiffXlsxSheets(ctx: DiffXlsxContext): XlsxSheet[] {
  const rows = ctx.rows || [];
  const grouped = groupRowsBySection(rows);
  const fieldModel = buildDiffXlsxFieldModel(ctx);
  const actionableFieldRows = rows.filter((row) => (row.sectionKey || row.section) === 'fieldSettings'
    && !row._displayOnly
    && row.type !== 'same');
  const unstructuredFieldDiffCount = Math.max(0, actionableFieldRows.length - fieldModel.details.length);
  const differenceRefs = buildDifferenceRefs(rows);
  const sheets: XlsxSheet[] = [buildSummarySheet(
    ctx,
    grouped,
    fieldModel.summaries.length,
    fieldModel.details.length,
    unstructuredFieldDiffCount
  )];
  if (fieldModel.details.length) {
    sheets.push(
      buildFieldSummarySheet(fieldModel),
      buildFieldDetailSheet(fieldModel, ctx.sourceBundle, ctx.targetBundle, differenceRefs)
    );
  }
  sheets.push(buildListSheet(rows, '差分一覧', ctx.sourceBundle, ctx.targetBundle, differenceRefs));
  for (const [key, list] of grouped) {
    sheets.push(buildSectionSheet(
      key === 'fieldSettings' ? 'フィールド技術明細' : sectionLabelOf(key),
      list,
      ctx.sourceBundle,
      ctx.targetBundle
    ));
  }
  const issuesSheet = buildIssuesSheet(ctx);
  if (issuesSheet) sheets.push(issuesSheet);
  return sheets;
}

export function buildDiffXlsxBlob(ctx: DiffXlsxContext): Blob {
  return buildXlsxBlob(buildDiffXlsxSheets(ctx));
}

export function buildDiffXlsxExport(ctx: DiffXlsxContext): { filename: string; blob: Blob } {
  const blob = buildDiffXlsxBlob(ctx);
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
