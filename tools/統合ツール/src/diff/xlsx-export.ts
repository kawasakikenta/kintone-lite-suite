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
import { stringifyForDiff, stringifyRowValueForDiff } from './export.js';
import {
  isSensitiveSameDiffRow,
  SENSITIVE_DIFF_SECTION_KEYS,
  SENSITIVE_SAME_VALUE_REDACTION
} from './export-safety.js';
import { extractFieldPathInfo } from './enrich.js';
import { decodeRow } from './path-decoder.js';
import { expandSubtableRowsForDisplay, hasIncompleteActualDiffTruncation } from './engine.js';
import {
  AGGREGATION_TYPE_JP,
  ALIGN_JP,
  APP_THEME_JP,
  CHART_MODE_JP,
  CHART_TYPE_JP,
  CUSTOMIZE_SCOPE_JP,
  DAY_OF_WEEK_JP,
  describeReminderOffset,
  ENTITY_TYPE_JP,
  GROUP_PER_JP,
  ICON_TYPE_JP,
  LINK_PROTOCOL_JP,
  NOTIFICATION_TIMING_JP,
  NUMBER_FORMAT_JP,
  PAGINATION_TYPE_JP,
  PERIODIC_REPORT_EVERY_JP,
  PROCESS_ASSIGNEE_TYPE_JP,
  REPORT_SORT_BY_JP,
  REPORT_SORT_ORDER_JP,
  RESOURCE_TYPE_JP,
  ROUNDING_MODE_JP,
  TITLE_SELECTION_JP,
  UNIT_POSITION_JP,
  VIEW_BUILTIN_TYPE_JP,
  VIEW_DEVICE_JP,
  VIEW_TYPE_JP
} from '../kintone-enums.js';
import {
  buildXlsxBlob,
  makeExcelCellTextVisible,
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
  movedFrom?: number;
  movedTo?: number;
  renameCandidate?: {
    id?: string;
    fromCode?: string;
    toCode?: string;
    entityKind?: string;
    matchedBy?: string;
  } | null;
  reasonSummary?: string;
  notationOnly?: boolean;
  emptyOnly?: boolean;
  entityKind?: string;
  entityLabel?: string;
  entityCode?: string;
  entityPropLabel?: string;
  arrayKey?: string;
  arrayKeyValue?: unknown;
  _displayOnly?: boolean;
  _expandedFromTable?: boolean;
  _parentRowId?: string;
  _nonActionable?: boolean;
  _stateRenameNotice?: boolean;
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
  actualDiffIncomplete?: boolean;
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
  /** customer は提出用の簡潔な構成。未指定時も customer を採用する。 */
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
  type: 'フィールドの種類',
  noLabel: 'フィールド名を表示しない',
  required: '必須項目にする',
  unique: '値の重複を禁止する',
  defaultValue: '初期値',
  defaultNowValue: 'レコード登録時の日時を初期値にする',
  description: '説明',
  minLength: '文字数（最小）',
  maxLength: '文字数（最大）',
  minValue: '数値の制限（最小）',
  maxValue: '数値の制限（最大）',
  expression: '計算式',
  hideExpression: '計算式を表示しない',
  options: '選択肢',
  protocol: '入力値の種類',
  displayScale: '小数点以下の表示桁数',
  digit: '桁区切りを表示する',
  unit: '単位記号',
  unitPosition: '単位記号の表示位置',
  align: '選択肢の並び',
  format: '表示形式',
  entities: '選択候補',
  fields: 'テーブル内のフィールド',
  referenceTable: '関連レコード一覧設定',
  lookup: 'ルックアップ設定',
  condition: '表示するレコードの条件',
  displayFields: '表示するフィールド',
  filterCond: '絞り込み条件',
  relatedApp: '参照するアプリ',
  size: '一度に表示する最大レコード数',
  sort: 'ソート',
  relatedKeyField: 'コピー元のフィールド',
  fieldMappings: 'ほかのフィールドのコピー',
  lookupPickerFields: 'コピー元のレコード選択時に表示するフィールド',
  field: '自アプリのフィールド',
  relatedField: '参照するアプリのフィールド',
  app: '参照するアプリID',
  thumbnailSize: 'サムネイルの大きさ',
  openGroup: 'グループの初期表示',
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

function graphemeClusters(value: unknown): string[] {
  const text = String(value ?? '');
  const Segmenter = (globalThis as any).Intl?.Segmenter;
  if (typeof Segmenter === 'function') {
    try {
      return Array.from(
        new Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
        (part: any) => String(part.segment)
      );
    } catch {
      // 古い実行環境ではコードポイント単位にフォールバックする。
    }
  }
  return Array.from(text);
}

function graphemePrefixWithinUtf16(value: string, maxUtf16Length: number): string {
  if (maxUtf16Length <= 0) return '';
  let output = '';
  for (const cluster of graphemeClusters(value)) {
    if (output.length + cluster.length > maxUtf16Length) break;
    output += cluster;
  }
  return output;
}

function truncateDisplayText(value: unknown, maxGraphemes: number): string {
  const characters = graphemeClusters(value);
  if (characters.length <= maxGraphemes) return characters.join('');
  if (maxGraphemes <= 1) return '…';
  const available = maxGraphemes - 1;
  const headLength = Math.ceil(available * 0.67);
  const tailLength = available - headLength;
  const head = characters.slice(0, headLength).join('').trimEnd();
  const tail = tailLength > 0
    ? characters.slice(characters.length - tailLength).join('').trimStart()
    : '';
  return `${head}…${tail}`;
}

function headerAppLabel(bundle: DiffXlsxBundle | undefined, fallback: string): string {
  return truncateDisplayText(appLabel(bundle) || fallback, 80);
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
      .replace(/\binnerheight\b/gi, '入力欄の高さ')
    : String(row.reasonSummary || '');
  const notes = [
    reasonSummary,
    row._displayOnly ? '表示用の補助情報（差分件数には含めません）' : '',
    row._nonActionable ? '確認専用（自動反映対象外）' : '',
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
  const keep = XLSX_DIFF_VALUE_PREVIEW_LIMIT - prefix.length - suffix.length;
  return prefix + graphemePrefixWithinUtf16(text, keep) + suffix;
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

// フィールド設定の enum 値を kintone の設定画面の選択肢名で表示する（leaf キー別）。
const FIELD_SETTING_ENUM_LABELS: Record<string, Record<string, string>> = {
  unitPosition: UNIT_POSITION_JP,
  protocol: LINK_PROTOCOL_JP,
  align: ALIGN_JP,
  format: NUMBER_FORMAT_JP,
  roundingMode: ROUNDING_MODE_JP
};

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
      defaultNowValue: ['現在日時を使わない', '現在日時を使う'],
      openGroup: ['グループを閉じた状態で表示', 'グループを開いた状態で表示']
    };
    return labels[leafKey]?.[value ? 1 : 0] || (value ? 'はい' : 'いいえ');
  }
  if (typeof value === 'string') {
    if (value === '') return '（空欄）';
    if (leafKey === 'type') return FIELD_TYPE_LABELS[value] || value;
    const enumMap = FIELD_SETTING_ENUM_LABELS[leafKey];
    const enumLabel = enumMap?.[value.trim().toUpperCase()];
    if (enumLabel) return enumLabel;
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
  // プリミティブ値も辞書を通す: フィールド設定は設定キー文脈、
  // それ以外のセクションは path-decoder の enum 解決を優先する。
  // 訳が付かない値は従来どおりの素通し表示にフォールバックする。
  const fieldInfo = extractFieldPathInfo(String(row.path || ''));
  if (fieldInfo) {
    const setting = fieldSettingIdentity(fieldInfo);
    if (setting.settingKey !== '(field)') {
      const humanized = humanizeFieldSettingValue(value, setting.settingKey);
      if (humanized) return humanized;
    }
  } else if (value != null) {
    const decoded = decodedListValue(row, side);
    if (decoded && decoded !== String(value)) {
      return xlsxDiffValuePreview(decoded, decoded.length);
    }
  }
  if (typeof value === 'string') return xlsxDiffValuePreview(humanizeListScalar(value), value.length);
  return humanizeListScalar(value);
}

function conciseReviewValue(value: string, maxCodePoints = 80): string {
  const firstLine = String(value || '').split(/\r\n|\r|\n/, 1)[0].trim();
  if (!firstLine) return '（内容なし）';
  const characters = graphemeClusters(firstLine);
  return characters.length > maxCodePoints
    ? `${characters.slice(0, Math.max(1, maxCodePoints - 1)).join('')}…`
    : firstLine;
}

function reviewChangeSummary(
  row: DiffXlsxRow,
  sourceValue: string,
  targetValue: string
): string {
  if (row._displayOnly) return '参考情報です（実差分には含めません）';
  if (row.type === 'same') return '変更はありません';
  if (row.moved) {
    const from = Number.isFinite(Number(row.movedFrom)) ? Number(row.movedFrom) + 1 : null;
    const to = Number.isFinite(Number(row.movedTo)) ? Number(row.movedTo) + 1 : null;
    return from != null && to != null
      ? `並び順を ${from}番目 → ${to}番目 に変更`
      : '並び順を変更';
  }
  if (row.type === 'added') return `比較先に追加：${conciseReviewValue(targetValue)}`;
  if (row.type === 'removed') return `比較先から削除：${conciseReviewValue(sourceValue)}`;
  return `${conciseReviewValue(sourceValue)} → ${conciseReviewValue(targetValue)}`;
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
  return makeExcelCellTextVisible(value).split(/\r\n|\r|\n/).reduce((total, line) => (
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

const READABLE_CUSTOMER_ROW_HARD_MAX_HEIGHT = 395;

function readableCustomerRowHeight(cells: DiffRowHeightCell[], maxHeight = 96): number {
  const maxLines = cells.reduce((max, cell) => (
    Math.max(max, estimatedWrappedLines(cell.value, cell.width))
  ), 1);
  // 実Excel（Meiryo 11pt）のAutoFitに合わせ、提出版は本文1行あたり17ptを確保する。
  return Math.min(
    READABLE_CUSTOMER_ROW_HARD_MAX_HEIGHT,
    maxHeight,
    28 + Math.max(0, maxLines - 1) * 17
  );
}

const READABLE_HEADER_ROW_MAX_HEIGHT = 120;

function readableHeaderRowHeight(
  cells: DiffRowHeightCell[],
  minimumHeight: number,
  maxHeight = READABLE_HEADER_ROW_MAX_HEIGHT
): number {
  return Math.max(minimumHeight, readableCustomerRowHeight(cells, maxHeight));
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
  if (truncation && hasIncompleteActualDiffTruncation(truncation)) {
    const sections = truncation.sections || [];
    const partial = sections.filter((section) => truncationScanStatusOf(section) === 'partial').length;
    const unscanned = sections.filter((section) => truncationScanStatusOf(section) === 'unscanned').length;
    if (partial) reasons.push(`部分走査 ${partial}セクション`);
    if (unscanned) reasons.push(`未走査 ${unscanned}セクション`);
    if (!partial && !unscanned) reasons.push('件数上限による省略あり');
  }
  if (reasons.length) return `不完全（${reasons.join(' / ')}）`;
  const droppedSame = Number(truncation?.droppedSame || 0);
  return droppedSame > 0
    ? `完全（差分走査済み / 同一証跡 ${droppedSame}件を省略）`
    : '完全（選択範囲を走査済み）';
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
  const legacyUnknownTruncation = hasIncompleteActualDiffTruncation(ctx.truncation)
    && !(ctx.truncation?.sections || []).length;
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
    || hasIncompleteActualDiffTruncation(ctx.truncation));
  const guides: DiffXlsxSheetGuide[] = [{
    name: '概要',
    purpose: '比較結果の判定、件数、比較条件、取得状態を確認できます。',
    useWhen: hasIssues
      ? '最初に確認します。不完全な範囲は「取得・未検証」も確認します。'
      : fieldCount
        ? '最初に確認し、「変更対象一覧」で対象を絞ってからフィールド要約または差分一覧へ進みます。'
        : '最初に確認し、「変更対象一覧」で対象を絞ってから差分一覧へ進みます。',
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
  guides.push({
    name: '変更対象一覧',
    purpose: '変更された業務対象を、フィールドや一覧などの対象単位で大づかみに確認できます。',
    useWhen: '詳細を読む前に、どのフィールド・一覧・設定対象が変わったかを絞り込むときに使います。',
    targetCell: summarizeRows(ctx.rows || []).actual ? 'B4' : 'A4'
  });
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
  const truncation = ctx.truncation || null;
  const actualDiffTruncation = hasIncompleteActualDiffTruncation(truncation) ? truncation : null;
  const incomplete = fetchIssues.length > 0 || partialIssues.length > 0 || !!actualDiffTruncation;
  const filteredWithoutRows = ctx.exportMode === 'filtered' && counts.actual === 0;
  const verdict = incomplete
    ? '比較不完全（差分なしとは判断できません）'
    : counts.actual > 0
      ? '差分あり'
      : filteredWithoutRows
        ? '絞り込み後：掲載対象なし'
        : '差分なし';
  const completeness = completenessLabel(fetchIssues, partialIssues, truncation);
  const comparisonBanner = `${headerAppLabel(ctx.sourceBundle, '比較元')}  →  ${headerAppLabel(ctx.targetBundle, '比較先')}`;
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
    '変更対象の全体像は「変更対象一覧」で確認します。',
    fieldCount ? 'フィールドの設定内容は「フィールド差分要約」へ進みます。' : '',
    rows.length ? '設定項目ごとの差分とレビュー入力は「差分一覧」へ進みます。' : '差分一覧には見出しのみ出力されています。',
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
    ['削除（比較元のみ）', counts.removed, '件数上限', actualDiffTruncation
      ? '差分の省略あり'
      : Number(truncation?.droppedSame || 0) > 0
        ? `同一証跡 ${Number(truncation?.droppedSame || 0)}件を省略`
        : '省略なし'],
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
      ? '①「変更対象一覧」で対象を絞る　②「フィールド差分要約・詳細」で変更内容を確認　③「差分一覧」で確認状況と対応判断を入力　※パスは技術明細シートにのみ掲載'
      : '①「変更対象一覧」で対象を絞る　②「差分一覧」で変更前後を確認　③黄色い4列に確認状況・対応判断・担当者・コメントを入力　※パスは技術明細シートにのみ掲載', '', rows.length ? '③ レビュー入力へ' : ''],
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
  if (actualDiffTruncation) {
    const truncationSections = actualDiffTruncation.sections || [];
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
    pushWarning('⚠ 件数上限', `差分上限 ${actualDiffTruncation.diffLimit || '-'} 件に到達。未収録の差分があるため、このブックだけで反映判断をしないでください。${rangeNotes ? ` ${rangeNotes}` : ''}`);
  } else if (Number(truncation?.droppedSame || 0) > 0) {
    pushWarning('ℹ 同一証跡の省略', `同一証跡は上限 ${truncation?.sameLimit || '-'} 件まで収録し、${Number(truncation?.droppedSame || 0)} 件を省略しました。実差分の検出結果は完全です。`);
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
  const rowHeights: number[] = [
    32,
    readableHeaderRowHeight([{ value: comparisonBanner, width: 154 }], 24),
    0,
    0,
    44
  ];
  rowHeights[overviewRow.comparisonApps] = readableCustomerRowHeight([
    { value: sheetRows[overviewRow.comparisonApps][1], width: 54 },
    { value: sheetRows[overviewRow.comparisonApps][3], width: 54 }
  ], 220);
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
    incomplete
      ? 'statusIncomplete'
      : counts.actual > 0
        ? 'statusDifference'
        : filteredWithoutRows
          ? 'zebraCenter'
          : 'statusGood',
    'sectionHeader',
    incomplete ? 'statusIncomplete' : 'statusGood'
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
  cellStyles[overviewRow.removed][3] = actualDiffTruncation ? 'kpiDanger' : 'kpiGood';
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

interface DiffXlsxCoarseTarget {
  key: string;
  targetType: string;
  targetName: string;
  identifier: string;
  changeState: string;
  diffCount: number;
  mainChanges: string;
  sourceRowIndexes: number[];
  navigationLabel: string;
  navigationSheet: string;
  navigationCell: string;
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

function coarseTargetType(sectionKey: string): string {
  const labels: Record<string, string> = {
    fieldSettings: 'フィールド',
    viewSettings: '一覧',
    layoutSettings: 'レイアウト',
    reportSettings: 'グラフ',
    processSettings: 'プロセス管理',
    actionSettings: 'アプリアクション',
    pluginSettings: 'プラグイン',
    customizeSettings: 'カスタマイズ',
    notifications: 'アプリ条件通知',
    perRecordNotifications: 'レコード条件通知',
    reminderNotifications: 'リマインダー通知'
  };
  return labels[sectionKey] || customerSectionLabel(sectionKey);
}

function coarseTargetIdentifier(target: string, sectionKey: string): string {
  const codeMatches = [...target.matchAll(/（コード:\s*([^）]+)）/g)];
  if (codeMatches.length) return String(codeMatches.at(-1)?.[1] || sectionKey);
  const quoted = /「([^」]+)」/.exec(target)?.[1];
  return quoted || sectionKey;
}

const VIEW_SETTING_PROPERTY_PATTERN = /^(fields(?:\[\d+\])?|filterCond|sort|type|name|pagination|paginationStyle|pager|builtinType|device|date|title|html|index)$/;

interface CoarseViewIdentity {
  viewName: string;
  property: string | null;
  isRoot: boolean;
}

function viewDefinitionNames(
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): string[] {
  return [...new Set([sourceBundle, targetBundle].flatMap((bundle) => {
    const views = bundle?.sections?.viewSettings?.views;
    return views && typeof views === 'object' && !Array.isArray(views) ? Object.keys(views) : [];
  }))].sort((left, right) => right.length - left.length || left.localeCompare(right, 'ja'));
}

function isViewDefinitionObject(value: unknown, rootExistenceChange: boolean): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (rootExistenceChange) return true;
  const keys = Object.keys(value as Record<string, unknown>);
  const definitionKeys = new Set([
    'id', 'name', 'type', 'fields', 'filterCond', 'sort', 'index', 'builtinType',
    'device', 'pagination', 'paginationStyle', 'pager', 'date', 'title', 'html'
  ]);
  return keys.some((key) => definitionKeys.has(key));
}

function resolveCoarseViewIdentity(
  row: DiffXlsxRow,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): CoarseViewIdentity | null {
  const path = String(row.path || '');
  const prefix = 'viewSettings.views.';
  if (!path.startsWith(prefix)) return null;
  const remainder = path.slice(prefix.length);
  if (!remainder) return null;

  const names = viewDefinitionNames(sourceBundle, targetBundle);
  const exactName = names.find((name) => remainder === name) || null;
  const leafCandidates = names.flatMap((name) => {
    if (!remainder.startsWith(`${name}.`)) return [];
    const property = remainder.slice(name.length + 1);
    return VIEW_SETTING_PROPERTY_PATTERN.test(property) ? [{ name, property }] : [];
  });
  const rootExistenceChange = row.type === 'added' || row.type === 'removed';
  const hasDefinitionPayload = [row.left, row.right]
    .some((value) => isViewDefinitionObject(value, rootExistenceChange && !!exactName));

  // 「営業」と「営業.sort」が共存する場合、営業.sort が一覧定義オブジェクトならroot、
  // primitiveなsort値なら「営業」のsort leafとして扱う。
  if (exactName && hasDefinitionPayload) return { viewName: exactName, property: null, isRoot: true };
  if (leafCandidates.length) {
    const leaf = leafCandidates[0];
    return { viewName: leaf.name, property: leaf.property, isRoot: false };
  }
  if (exactName) return { viewName: exactName, property: null, isRoot: true };

  const fallbackLeaf = /^(.*)\.(fields(?:\[\d+\])?|filterCond|sort|type|name|pagination|paginationStyle|pager|builtinType|device|date|title|html|index)$/.exec(remainder);
  if (hasDefinitionPayload || !fallbackLeaf) {
    return { viewName: customerPlainText(remainder), property: null, isRoot: true };
  }
  return {
    viewName: customerPlainText(fallbackLeaf[1]),
    property: fallbackLeaf[2],
    isRoot: false
  };
}

function coarseViewName(
  row: DiffXlsxRow,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): string | null {
  return resolveCoarseViewIdentity(row, sourceBundle, targetBundle)?.viewName || null;
}

interface CoarseStableIdentity {
  key: string;
  identifier: string;
}

function coarseGenericEntityRootPath(row: DiffXlsxRow, sectionKey: string): string | null {
  const path = String(row.path || '');
  const entityCode = String(row.entityCode || '').trim();
  const keyedPrefixes: Record<string, string> = {
    reportSettings: 'reportSettings.reports.',
    categories: 'categories.categories.',
    processSettings: row.entityKind === 'state' ? 'processSettings.states.' : '',
    actionSettings: row.entityKind === 'appAction' && entityCode ? 'actionSettings.actions.' : ''
  };
  const keyedPrefix = keyedPrefixes[sectionKey];
  if (keyedPrefix && entityCode) {
    const root = `${keyedPrefix}${entityCode}`;
    if (path === root || path.startsWith(`${root}.`) || path.startsWith(`${root}[`)) return root;
  }

  const indexedPatterns: Partial<Record<string, RegExp>> = {
    processSettings: /^(processSettings\.(?:actions|states)(?:\[\d+\]|\.\d+))(?=\.|\[|$)/,
    actionSettings: /^(actionSettings\.actions(?:\[\d+\]|\.\d+))(?=\.|\[|$)/,
    appAcl: /^(appAcl\.rights(?:\[\d+\]|\.\d+))(?=\.|\[|$)/,
    recordPermissions: /^(recordPermissions\.rights(?:\[\d+\]|\.\d+))(?=\.|\[|$)/,
    fieldAcl: /^(fieldAcl\.rights(?:\[\d+\]|\.\d+))(?=\.|\[|$)/,
    notifications: /^(notifications\.notifications(?:\[\d+\]|\.\d+))(?=\.|\[|$)/,
    perRecordNotifications: /^(perRecordNotifications\.notifications(?:\[\d+\]|\.\d+))(?=\.|\[|$)/,
    reminderNotifications: /^(reminderNotifications\.notifications(?:\[\d+\]|\.\d+))(?=\.|\[|$)/,
    pluginSettings: /^(pluginSettings\.plugins(?:\[\d+\]|\.\d+))(?=\.|\[|$)/,
    layoutSettings: /^(layoutSettings\.layout(?:\[\d+\]|\.\d+))(?=\.|\[|$)/,
    customizeSettings: /^(customizeSettings\.(?:desktop|mobile)\.(?:js|css)(?:\[\d+\]|\.\d+))(?=\.|\[|$)/
  };
  return indexedPatterns[sectionKey]?.exec(path)?.[1] || null;
}

function coarseStableIdentity(row: DiffXlsxRow, sectionKey: string): CoarseStableIdentity {
  const entityKind = String(row.entityKind || '').trim();
  const entityCode = String(row.entityCode || '').trim();
  if (entityKind && entityCode) {
    return {
      key: JSON.stringify([sectionKey, 'entity', entityKind, entityCode]),
      identifier: entityCode
    };
  }

  if (row.arrayKey && row.arrayKeyValue !== undefined) {
    const stableValue = stableStringify(row.arrayKeyValue) ?? String(row.arrayKeyValue);
    return {
      key: JSON.stringify([sectionKey, 'arrayKey', row.arrayKey, stableValue]),
      identifier: typeof row.arrayKeyValue === 'object'
        ? `${row.arrayKey}: ${shortStableHash(stableValue)}`
        : `${row.arrayKey}: ${String(row.arrayKeyValue)}`
    };
  }

  const rootPath = coarseGenericEntityRootPath(row, sectionKey);
  if (rootPath) return { key: JSON.stringify([sectionKey, 'path', rootPath]), identifier: rootPath };
  const path = String(row.path || sectionKey);
  return { key: JSON.stringify([sectionKey, 'path', path]), identifier: path };
}

function coarseRowIsGenericEntityRoot(row: DiffXlsxRow, sectionKey: string): boolean {
  if (String(row.entityPropLabel || '').trim()) return false;
  const rootPath = coarseGenericEntityRootPath(row, sectionKey);
  if (rootPath && rootPath === String(row.path || '')) return true;
  const keyedObjectRootKinds = new Set(['report', 'category', 'state']);
  return (row.type === 'added' || row.type === 'removed')
    && keyedObjectRootKinds.has(String(row.entityKind || ''))
    && [row.left, row.right].some((value) => !!value && typeof value === 'object' && !Array.isArray(value));
}

function coarseViewIdentifier(
  viewName: string,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): string {
  for (const bundle of [targetBundle, sourceBundle]) {
    const definition = bundle?.sections?.viewSettings?.views?.[viewName];
    const id = definition && typeof definition === 'object' && !Array.isArray(definition)
      ? (definition as Record<string, unknown>).id
      : null;
    if (id != null && String(id).trim()) return `一覧ID ${String(id).trim()}`;
  }
  return `一覧名 ${viewName}`;
}

function coarseRowsChangeState(
  rows: DiffXlsxRow[],
  targetType: string,
  options: {
    sectionKey?: string;
    viewName?: string;
    sourceBundle?: DiffXlsxBundle;
    targetBundle?: DiffXlsxBundle;
  } = {}
): string {
  const states = new Set(rows.map((row) => {
    if (row.moved || row.type === 'moved') return '並び順変更';
    if (row.type === 'added') return '追加';
    if (row.type === 'removed') return '削除';
    return '設定変更';
  }));
  const isView = targetType === '一覧';
  const rootRows = isView
    ? rows.filter((row) => {
      const identity = resolveCoarseViewIdentity(row, options.sourceBundle, options.targetBundle);
      return !!identity?.isRoot && (!options.viewName || identity.viewName === options.viewName);
    })
    : options.sectionKey && options.sectionKey !== 'fieldSettings'
      ? rows.filter((row) => coarseRowIsGenericEntityRoot(row, options.sectionKey!))
      : [];
  const rootAdded = rootRows.some((row) => row.type === 'added');
  const rootRemoved = rootRows.some((row) => row.type === 'removed');
  if ((rootAdded && rootRemoved)
    || (rootAdded && [...states].some((state) => state !== '追加'))
    || (rootRemoved && [...states].some((state) => state !== '削除'))) return '複合変更';
  if (rootAdded) return isView ? '一覧追加' : '追加';
  if (rootRemoved) return isView ? '一覧削除' : '削除';
  if (states.size === 1 && states.has('並び順変更')) return '並び順変更';
  // 配列要素や設定leafの追加・削除であり、対象自体の追加・削除ではない。
  return states.size > 1 ? '複合変更' : '設定変更';
}

function coarseStateStyle(changeState: string): XlsxCellStyle {
  if (/追加$/.test(changeState)) return 'changeAdded';
  if (/削除$/.test(changeState)) return 'changeRemoved';
  if (/並び順/.test(changeState)) return 'changeMoved';
  return 'changeChanged';
}

function coarseRowChangeSummary(
  row: DiffXlsxRow,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle,
  viewName?: string
): string {
  const parts = customerItemParts(row, sourceBundle, targetBundle);
  const sourceValue = humanizeListRowValue(row, 'source', sourceBundle, targetBundle);
  const targetValue = humanizeListRowValue(row, 'target', sourceBundle, targetBundle);
  const viewIdentity = viewName ? resolveCoarseViewIdentity(row, sourceBundle, targetBundle) : null;
  const settingItem = viewIdentity?.isRoot && viewIdentity.viewName === viewName
    ? row.type === 'added'
      ? '一覧を追加'
      : row.type === 'removed'
        ? '一覧を削除'
        : '一覧全体'
    : parts.settingItem;
  return compactFieldSummaryValue(`${settingItem}: ${reviewChangeSummary(row, sourceValue, targetValue)}`);
}

function coarseMainChanges(
  rows: DiffXlsxRow[],
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle,
  viewName?: string
): string {
  const changes = [...new Set(rows
    .slice()
    .sort((left, right) => String(left.path || '').localeCompare(String(right.path || ''), 'ja'))
    .map((row) => coarseRowChangeSummary(row, sourceBundle, targetBundle, viewName)))];
  const visible = changes.slice(0, 3);
  const more = changes.length > visible.length ? `\nほか${changes.length - visible.length}件` : '';
  return `${visible.join('\n')}${more}`;
}

function buildCoarseTargets(
  ctx: DiffXlsxContext,
  fieldModel: DiffXlsxFieldModel,
  differenceRefs: DiffXlsxDifferenceRef[]
): DiffXlsxCoarseTarget[] {
  const targets: DiffXlsxCoarseTarget[] = [];
  const structuredFieldRows = new Set(fieldModel.details.map((detail) => detail.rowIndex));

  for (const [summaryIndex, summary] of fieldModel.summaries.entries()) {
    const details = fieldModel.details.filter((detail) => detail.fieldKey === summary.fieldKey);
    const sourceRowIndexes = details.map((detail) => detail.rowIndex).sort((left, right) => left - right);
    targets.push({
      key: `fieldSettings\u001f${summary.fieldKey}`,
      targetType: 'フィールド',
      targetName: summary.fieldName,
      identifier: summary.fieldCode,
      changeState: coarseRowsChangeState(details.map((detail) => detail.row), 'フィールド') === '複合変更'
        ? '複合変更'
        : fieldSummaryChangeTypeLabel(summary, fieldModel),
      diffCount: summary.diffCount,
      mainChanges: fieldSummaryMainChanges(summary, fieldModel, ctx.sourceBundle, ctx.targetBundle),
      sourceRowIndexes,
      navigationLabel: 'フィールド要約へ',
      navigationSheet: 'フィールド差分要約',
      navigationCell: `C${summaryIndex + 4}`
    });
  }

  const grouped = new Map<string, {
    sectionKey: string;
    targetType: string;
    targetName: string;
    identifier: string;
    rows: Array<{ row: DiffXlsxRow; rowIndex: number }>;
  }>();
  for (const [rowIndex, row] of (ctx.rows || []).entries()) {
    if (!row || row._displayOnly || row.type === 'same' || structuredFieldRows.has(rowIndex)) continue;
    const sectionKey = sectionKeyOfRow(row);
    const parts = customerItemParts(row, ctx.sourceBundle, ctx.targetBundle);
    const viewName = sectionKey === 'viewSettings'
      ? coarseViewName(row, ctx.sourceBundle, ctx.targetBundle)
      : null;
    const targetName = sectionKey === 'fieldSettings'
      ? '未識別のフィールド差分'
      : sectionKey === 'viewSettings' && !viewName
        ? '未識別の一覧差分'
        : viewName || parts.target || customerSectionLabel(sectionKey);
    const targetType = coarseTargetType(sectionKey);
    const stableIdentity = sectionKey === 'fieldSettings' || sectionKey === 'viewSettings'
      ? null
      : coarseStableIdentity(row, sectionKey);
    const identifier = viewName
      ? coarseViewIdentifier(viewName, ctx.sourceBundle, ctx.targetBundle)
      : sectionKey === 'fieldSettings' || sectionKey === 'viewSettings'
        ? sectionKey
        : stableIdentity?.identifier || coarseTargetIdentifier(targetName, sectionKey);
    const key = sectionKey === 'fieldSettings'
      ? `${sectionKey}\u001f(unidentified)`
      : sectionKey === 'viewSettings'
        ? `${sectionKey}\u001f${viewName || '(unidentified)'}`
        : `${sectionKey}\u001f${stableIdentity?.key || String(row.path || sectionKey)}`;
    let group = grouped.get(key);
    if (!group) {
      group = { sectionKey, targetType, targetName, identifier, rows: [] };
      grouped.set(key, group);
    }
    group.rows.push({ row, rowIndex });
  }

  for (const [key, group] of grouped) {
    const sourceRowIndexes = group.rows.map(({ rowIndex }) => rowIndex).sort((left, right) => left - right);
    const firstDifference = differenceRefs[sourceRowIndexes[0]];
    const rows = group.rows.map(({ row }) => row);
    targets.push({
      key,
      targetType: group.targetType,
      targetName: group.targetName,
      identifier: group.identifier,
      changeState: coarseRowsChangeState(rows, group.targetType, {
        sectionKey: group.sectionKey,
        viewName: group.targetType === '一覧' && group.targetName !== '未識別の一覧差分'
          ? group.targetName
          : undefined,
        sourceBundle: ctx.sourceBundle,
        targetBundle: ctx.targetBundle
      }),
      diffCount: rows.length,
      mainChanges: coarseMainChanges(
        rows,
        ctx.sourceBundle,
        ctx.targetBundle,
        group.targetType === '一覧' && group.targetName !== '未識別の一覧差分'
          ? group.targetName
          : undefined
      ),
      sourceRowIndexes,
      navigationLabel: '差分一覧へ',
      navigationSheet: '差分一覧',
      navigationCell: `B${firstDifference?.rowNumber || 4}`
    });
  }

  return targets.sort((left, right) => {
    const leftSection = left.key.split('\u001f', 1)[0];
    const rightSection = right.key.split('\u001f', 1)[0];
    return ((SECTION_ORDER_BY_KEY.get(leftSection) ?? Number.MAX_SAFE_INTEGER)
      - (SECTION_ORDER_BY_KEY.get(rightSection) ?? Number.MAX_SAFE_INTEGER))
      || left.targetType.localeCompare(right.targetType, 'ja')
      || left.targetName.localeCompare(right.targetName, 'ja')
      || left.identifier.localeCompare(right.identifier, 'ja');
  });
}

function buildCoarseTargetSheet(
  ctx: DiffXlsxContext,
  fieldModel: DiffXlsxFieldModel,
  differenceRefs: DiffXlsxDifferenceRef[]
): XlsxSheet {
  const targets = buildCoarseTargets(ctx, fieldModel, differenceRefs);
  const hasTargets = targets.length > 0;
  const incomplete = customerIncomplete(ctx);
  const showIncompleteWarning = hasTargets && incomplete;
  const guide = sheetGuideBand(
    '変更された業務対象を、フィールド・一覧・その他の設定対象ごとにまとめて確認できます。',
    'まず対象名と主な変更で確認範囲を絞り、「ナビゲーション」からフィールド要約または差分一覧へ進みます。'
  );
  const rows: (string | number | null)[][] = [[guide, '', '', '', '', '', '']];
  const rowStyles: XlsxRowStyle[] = ['normal'];
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [['info']];
  const rowHeights = [44];
  if (showIncompleteWarning) {
    rows.push([
      '⚠ 比較できなかった範囲があります。掲載された変更対象は確認できた範囲のみです。「取得・未検証」も確認してください',
      '', '', '', '', '', ''
    ]);
    rowStyles.push('normal');
    cellStyles.push(Array.from({ length: 7 }, () => 'statusIncomplete'));
    rowHeights.push(42);
  }
  const groupRowNumber = rows.length + 1;
  rows.push(['変更された対象', '', '', '変更の概要', '', '', 'ナビゲーション']);
  rowStyles.push('normal');
  const groupCellStyles: Array<XlsxCellStyle | undefined> = [];
  groupCellStyles[0] = 'sectionHeader';
  groupCellStyles[3] = 'info';
  groupCellStyles[6] = 'info';
  cellStyles.push(groupCellStyles);
  rowHeights.push(24);
  const headerRowNumber = rows.length + 1;
  rows.push(['対象種別', '対象名', '識別子', '変更状態', '差分件数', '主な変更', '詳細']);
  rowStyles.push('normal');
  cellStyles.push([]);
  rowHeights.push(32);
  const dataStartRow = headerRowNumber + 1;

  for (const target of targets) {
    rows.push([
      target.targetType,
      target.targetName,
      target.identifier,
      target.changeState,
      target.diffCount,
      target.mainChanges,
      target.navigationLabel
    ]);
    rowStyles.push('normal');
    const styles: Array<XlsxCellStyle | undefined> = [];
    styles[0] = 'category';
    styles[2] = 'info';
    styles[3] = coarseStateStyle(target.changeState);
    styles[4] = 'center';
    styles[6] = 'hyperlink';
    cellStyles.push(styles);
    rowHeights.push(readableDiffRowHeight([
      { value: target.targetType, width: 20 },
      { value: target.targetName, width: 32 },
      { value: target.identifier, width: 28 },
      { value: target.changeState, width: 18 },
      { value: target.mainChanges, width: 64 }
    ], 160));
  }

  if (!hasTargets) {
    const emptyState: { message: string; style: XlsxCellStyle } = incomplete
      ? {
        message: '比較できなかった範囲があります。概要と「取得・未検証」を確認してください',
        style: 'statusIncomplete'
      }
      : ctx.exportMode === 'filtered'
        ? {
          message: '現在の絞り込み条件に該当する変更対象はありません',
          style: 'zebraCenter'
        }
        : { message: '変更対象はありません（差分なし）', style: 'statusGood' };
    rows.push([emptyState.message, '', '', '', '', '', '']);
    rowStyles.push('normal');
    cellStyles.push(Array.from({ length: 7 }, () => emptyState.style));
    rowHeights.push(44);
  }

  return {
    name: '変更対象一覧',
    rows,
    colWidths: [20, 32, 28, 18, 12, 64, 20],
    rowStyles,
    cellStyles,
    headerRow: headerRowNumber,
    autoFilter: hasTargets,
    freezeRows: hasTargets ? headerRowNumber : 0,
    freezeColumns: hasTargets ? 3 : 0,
    rowHeights,
    merges: [
      'A1:G1',
      ...(showIncompleteWarning ? ['A2:G2'] : []),
      `A${groupRowNumber}:C${groupRowNumber}`,
      `D${groupRowNumber}:F${groupRowNumber}`,
      ...(hasTargets ? [] : [`A${dataStartRow}:G${dataStartRow}`])
    ],
    internalHyperlinks: targets.map((target, index) => ({
      ref: `G${index + dataStartRow}`,
      targetSheet: target.navigationSheet,
      targetCell: target.navigationCell,
      tooltip: `${target.targetName}の詳細へ移動`
    })),
    showGridLines: false,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 2, to: headerRowNumber },
      repeatColumns: hasTargets ? { from: 1, to: 3 } : undefined
    }
  };
}

function directionalValueHeader(side: 'source' | 'target', bundle?: DiffXlsxBundle): string {
  const direction = side === 'source' ? '比較元' : '比較先';
  const label = headerAppLabel(bundle, '');
  return label ? `${direction}の値\n${label}` : `${direction}の値`;
}

function buildListSheet(
  rows: DiffXlsxRow[],
  name = '差分一覧',
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle,
  differenceRefs?: DiffXlsxDifferenceRef[],
  technicalRefs?: DiffXlsxTechnicalRef[],
  fieldModel?: DiffXlsxFieldModel,
  ctx?: DiffXlsxContext
): XlsxSheet {
  const hasRows = rows.length > 0;
  const headers = [
    'セクション', '項目／変更内容', '変更種別', '存在状況', '差分ID',
    directionalValueHeader('source', sourceBundle), directionalValueHeader('target', targetBundle), '確認事項',
    '確認状況', '対応判断', '担当者', 'コメント'
  ];
  const groupHeader = [
    '差分対象', '', '変更の事実', '', '',
    '比較元（変更前）', '比較先（変更後）', '確認事項',
    'レビュー入力（黄色）', '', '', ''
  ];
  const guide = sheetGuideBand(
    'このブックに収録された差分を、設定項目ごとの短い変更内容と変更前後の値で確認できます。',
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
  const rowHeights: number[] = [44, 24, readableHeaderRowHeight([
    { value: headers[5], width: 42 },
    { value: headers[6], width: 42 }
  ], 42)];
  const seenIds = new Map<string, number>();
  const fieldDetailByRowIndex = new Map((fieldModel?.details || []).map((detail) => [detail.rowIndex, detail]));
  for (const [rowIndex, row] of rows.entries()) {
    const fieldDetail = fieldDetailByRowIndex.get(rowIndex);
    const isFieldSettings = (row.sectionKey || row.section) === 'fieldSettings';
    const existence = rowExistenceLabel(row);
    const itemLabel = rowItemLabel(row, sourceBundle, targetBundle);
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
    const item = `${itemLabel}\n${reviewChangeSummary(row, sourceValue, targetValue)}`;
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
      styles[8] = 'reviewChoice';
      styles[9] = 'reviewChoice';
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
  if (!hasRows) {
    const incomplete = !!((ctx?.fetchIssues || []).length
      || (ctx?.partialIssues || []).length
      || hasIncompleteActualDiffTruncation(ctx?.truncation));
    const emptyState: { message: string; style: XlsxCellStyle } = incomplete
      ? {
        message: '比較できなかった範囲があります。概要と「取得・未検証」を確認してください',
        style: 'statusIncomplete'
      }
      : ctx?.exportMode === 'filtered'
        ? {
          message: '現在の絞り込み条件に該当する変更はありません',
          style: 'zebraCenter'
        }
        : { message: '差分はありません', style: 'statusGood' };
    out.push([emptyState.message, '', '', '', '', '', '', '', '', '', '', '']);
    rowStyles.push('normal');
    cellStyles.push(Array.from({ length: headers.length }, () => emptyState.style));
    rowHeights.push(Math.max(40, readableDiffRowHeight([{
      value: emptyState.message,
      width: 318
    }], 120)));
  }
  const dataValidations = hasRows
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
    autoFilter: hasRows,
    freezeRows: 3,
    freezeColumns: hasRows ? 5 : undefined,
    rowHeights,
    merges: [
      'A1:L1', 'A2:B2', 'C2:E2', 'I2:L2',
      ...(hasRows ? [] : ['A4:L4'])
    ],
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
      fitToWidth: 2,
      fitToHeight: 0,
      repeatRows: { from: 2, to: 3 },
      repeatColumns: hasRows ? { from: 1, to: 5 } : undefined
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
  const rowHeights: number[] = [44, 24, readableHeaderRowHeight([
    { value: headers[5], width: 42 },
    { value: headers[6], width: 42 }
  ], 42)];
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
      fitToWidth: 2,
      fitToHeight: 0,
      repeatRows: { from: 2, to: 3 },
      repeatColumns: { from: 1, to: 5 }
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
  const compact = value.replace(/\r\n|\r|\n/g, ' / ');
  const characters = graphemeClusters(compact);
  return characters.length <= 100 ? compact : `${characters.slice(0, 99).join('')}…`;
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
      fitToWidth: 2,
      fitToHeight: 0,
      repeatRows: { from: 2, to: 3 },
      repeatColumns: { from: 1, to: 5 }
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
  const rowHeights: number[] = [44, 24, readableHeaderRowHeight([
    { value: headers[6], width: 44 },
    { value: headers[7], width: 44 }
  ], 42)];
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
    freezeColumns: 4,
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
      fitToWidth: 2,
      fitToHeight: 0,
      repeatRows: { from: 2, to: 3 },
      repeatColumns: { from: 1, to: 4 }
    }
  };
}

function incompleteIssueStatusStyle(status: unknown): XlsxCellStyle {
  return /取得失敗|取得できません/.test(String(status ?? '')) ? 'statusError' : 'statusIncomplete';
}

function buildIssuesSheet(ctx: DiffXlsxContext): XlsxSheet | null {
  const fetchIssues = ctx.fetchIssues || [];
  const partialIssues = ctx.partialIssues || [];
  const truncation = hasIncompleteActualDiffTruncation(ctx.truncation) ? ctx.truncation! : null;
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
    cellStyles: rows.map((row, index) => (
      index === 0 ? ['info'] : index === 1 ? [] : [incompleteIssueStatusStyle(row[0])]
    )),
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
// Customer workbook
// ---------------------------------------------------------------------------

interface CustomerDiffItem {
  index: number;
  row: DiffXlsxRow;
  sectionKey: string;
  sectionLabel: string;
  target: string;
  parentTarget: string;
  targetName: string;
  targetCode: string;
  settingItem: string;
  targetDetail: string;
  settingItemDetail: string;
  technicalPath?: string;
  item: string;
  changeType: '追加' | '削除' | '変更' | '並び順変更';
  before: string;
  after: string;
  rawBefore: CustomerRawValue;
  rawAfter: CustomerRawValue;
  tableChild: boolean;
  field?: CustomerFieldColumns;
  /** 他シートの再掲であり、変更一覧と件数集計から外す差分。証跡シートには残す。 */
  redundant: boolean;
}

interface CustomerApiSheetDef {
  key: string;
  sectionKey?: string;
  label: string;
  sheetName: string;
}

interface CustomerApiGroup {
  definition: CustomerApiSheetDef;
  items: CustomerDiffItem[];
}

const CUSTOMER_API_SHEET_DEFS: readonly CustomerApiSheetDef[] = [
  { key: 'appSettings', sectionKey: 'appSettings', label: '01 アプリ一般設定', sheetName: '01_アプリ一般設定' },
  { key: 'appInfo', sectionKey: 'appInfo', label: '02 アプリ情報', sheetName: '02_アプリ情報' },
  { key: 'fieldSettings', sectionKey: 'fieldSettings', label: '03 フォームフィールド', sheetName: '03_フォームフィールド' },
  { key: 'layoutSettings', sectionKey: 'layoutSettings', label: '04 フォームレイアウト', sheetName: '04_フォームレイアウト' },
  { key: 'formSettings', sectionKey: 'formSettings', label: '05 フォーム設計情報', sheetName: '05_フォーム設計情報' },
  { key: 'viewSettings', sectionKey: 'viewSettings', label: '06 一覧設定', sheetName: '06_一覧設定' },
  { key: 'reportSettings', sectionKey: 'reportSettings', label: '07 グラフ設定', sheetName: '07_グラフ設定' },
  { key: 'processSettings', sectionKey: 'processSettings', label: '08 プロセス管理', sheetName: '08_プロセス管理' },
  { key: 'pluginSettings', sectionKey: 'pluginSettings', label: '09 追加済みプラグイン', sheetName: '09_追加済みプラグイン' },
  { key: 'pluginConfig', label: '10 プラグイン個別設定', sheetName: '10_プラグイン個別設定' },
  { key: 'customizeSettings', sectionKey: 'customizeSettings', label: '11 JavaScript・CSS', sheetName: '11_JavaScript・CSS' },
  { key: 'customizeFile', label: '12 カスタマイズ本文', sheetName: '12_カスタマイズ本文' },
  { key: 'actionSettings', sectionKey: 'actionSettings', label: '13 アプリアクション', sheetName: '13_アプリアクション' },
  { key: 'appAcl', sectionKey: 'appAcl', label: '14 アプリ権限', sheetName: '14_アプリ権限' },
  { key: 'fieldAcl', sectionKey: 'fieldAcl', label: '15 フィールド権限', sheetName: '15_フィールド権限' },
  { key: 'recordPermissions', sectionKey: 'recordPermissions', label: '16 レコード権限', sheetName: '16_レコード権限' },
  { key: 'notifications', sectionKey: 'notifications', label: '17 アプリ条件通知', sheetName: '17_アプリ条件通知' },
  { key: 'perRecordNotifications', sectionKey: 'perRecordNotifications', label: '18 レコード条件通知', sheetName: '18_レコード条件通知' },
  { key: 'reminderNotifications', sectionKey: 'reminderNotifications', label: '19 リマインダー通知', sheetName: '19_リマインダー通知' },
  { key: 'categories', sectionKey: 'categories', label: '20 カテゴリー設定', sheetName: '20_カテゴリー設定' },
  { key: 'unknown', label: '99 その他の設定', sheetName: '99_その他の設定' }
];

const CUSTOMER_API_SHEET_DEF_BY_SECTION = new Map(
  CUSTOMER_API_SHEET_DEFS
    .filter((definition) => !!definition.sectionKey)
    .map((definition) => [definition.sectionKey!, definition])
);

const CUSTOMER_API_SHEET_DEF_BY_KEY = new Map(
  CUSTOMER_API_SHEET_DEFS.map((definition) => [definition.key, definition])
);

interface CustomerRawValue {
  state: string;
  text: string;
}

interface CustomerDiffRawContinuation {
  kind: 'difference';
  item: CustomerDiffItem;
  side: 'source' | 'target';
  chunks: string[];
  firstRow: number;
}

interface CustomerCoverageIssueItem {
  index: number;
  sectionLabel: string;
  target: string;
  status: string;
  explanation: string;
  raw: CustomerRawValue;
}

interface CustomerIssueRawContinuation {
  kind: 'coverage';
  issue: CustomerCoverageIssueItem;
  chunks: string[];
  firstRow: number;
}

type CustomerRawContinuation = CustomerDiffRawContinuation | CustomerIssueRawContinuation;

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
  const name = String(extractAppNameFromBundle(bundle) || '').normalize('NFKC').trim();
  return name || fallback;
}

const CUSTOMER_HEADER_APP_NAME_MAX_CODE_POINTS = 54;

function customerHeaderAppName(bundle: DiffXlsxBundle | undefined, fallback: string): string {
  return truncateDisplayText(
    customerAppName(bundle, fallback),
    CUSTOMER_HEADER_APP_NAME_MAX_CODE_POINTS
  );
}

function customerScopeLabel(scopes: string[] | undefined): string {
  const labels = [...new Set((scopes || []).map((key) => customerSectionLabel(key)).filter(Boolean))];
  return labels.length ? labels.join('、') : '比較した設定範囲';
}

/**
 * 旧 /form.json（フォーム設計情報）は fields.json と layout.json の再掲で、
 * 反映もできない読み取り専用APIのため、両方を比較したときは同じ変更が二重に並ぶ。
 * 主要シートと件数からは外し、専用シートに参考として残す。
 */
const CUSTOMER_REDUNDANT_SECTION_KEYS = ['formSettings'] as const;

const CUSTOMER_REDUNDANT_SECTION_SOURCES: Record<string, string[]> = {
  formSettings: ['fieldSettings', 'layoutSettings']
};

const CUSTOMER_REDUNDANT_SECTION_NOTE: Record<string, string> = {
  formSettings: '03 フォームフィールドと 04 フォームレイアウトに同じ変更が載っています（旧 /form.json の再掲）。'
};

/** 再掲として主要シートから外すセクション。再掲元をどちらも比較していない場合は外さない。 */
function customerRedundantSectionKeys(comparedSectionKeys: Set<string>): Set<string> {
  const redundant = new Set<string>();
  for (const key of CUSTOMER_REDUNDANT_SECTION_KEYS) {
    const sources = CUSTOMER_REDUNDANT_SECTION_SOURCES[key] || [];
    if (sources.length && sources.every((source) => comparedSectionKeys.has(source))) redundant.add(key);
  }
  return redundant;
}

function customerComparisonExclusionLabel(ctx: DiffXlsxContext): string {
  const customerLabels: Record<string, string> = {
    viewOrder: 'ビュー順序',
    permissionOrder: '権限順序',
    generalArrayOrder: '一般配列順序',
    fieldOrder: 'フィールド順序',
    processOrder: 'プロセス順序',
    appReferences: '環境固有ID（アプリ・一覧・グラフ・アクション）',
    auditMeta: '監査メタ情報',
    labelsAndText: 'ラベル・説明文',
    appearance: '表示設定',
    fileKeys: 'ファイルキー',
    enabledFlags: '有効フラグ'
  };
  const enabled = Object.entries(ctx.normalizationPresetState || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .filter(([, value]) => !!value)
    .map(([key]) => customerLabels[key] || NORMALIZATION_LABELS[key] || key);
  const ignoreKeys = [...new Set(String(ctx.ignoreKeys || '')
    .split(/[\n\r,、，;；]+/)
    .map((key) => key.trim())
    .filter(Boolean))];
  if (ignoreKeys.length) enabled.push(`個別指定 ${ignoreKeys.length}件`);
  return enabled.length ? enabled.join('、') : 'なし';
}

function customerChangeType(row: DiffXlsxRow): CustomerDiffItem['changeType'] {
  if (row.moved || row.type === 'moved') return '並び順変更';
  if (row.type === 'added') return '追加';
  if (row.type === 'removed') return '削除';
  return '変更';
}

interface CustomerItemParts {
  target: string;
  settingItem: string;
  technicalPath?: string;
}

function customerPlainText(value: unknown, maxLength?: number): string {
  const decoded = String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&#(\d+);/g, (match, code: string) => {
      const codePoint = Number(code);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    })
    .replace(/[\t\r\n ]+/g, ' ')
    .trim();
  if (maxLength == null) return decoded;
  const characters = graphemeClusters(decoded);
  if (characters.length <= maxLength) return decoded;
  return `${characters.slice(0, Math.max(0, maxLength - 1)).join('')}…`;
}

function customerRichText(value: unknown, maxLength?: number): string {
  const withoutMarkup = customerPlainText(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:div|p|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  return customerPlainText(withoutMarkup, maxLength);
}

function customerGenericSettingLabel(sectionKey: string, path: string, decodedLabel: string): string {
  const leaf = path.match(/(?:^|[.\]])([^.[\]]+)$/)?.[1] || '';
  if (sectionKey === 'customizeSettings' && (leaf === '_body' || leaf === 'body')) {
    return 'ファイル内容';
  }
  if (sectionKey === 'pluginSettings' && (leaf === 'config' || leaf === '_config')) {
    return 'プラグイン設定内容';
  }
  const actionAppRef = /\.((?:destApp|targetApp|sourceApp)\.(?:app|appId)|destAppId|targetAppId|sourceAppId)$/.exec(path);
  if (sectionKey === 'actionSettings' && actionAppRef) {
    return actionAppRef[1].startsWith('sourceApp')
      ? 'コピー元のアプリ（アプリID）'
      : 'レコードを追加するアプリ（アプリID）';
  }
  if (sectionKey === 'actionSettings' && /\.mappings(?:\[\d+\])?(?:\.|$)/.test(path)) {
    const mappingIndex = Number(path.match(/\.mappings\[(\d+)\]/)?.[1]);
    const mappingProperty = path.match(/\.(srcField|destField|srcType|destType)$/)?.[1] || '';
    const mappingLabels: Record<string, string> = {
      srcField: 'コピー元フィールド',
      destField: 'コピー先フィールド',
      srcType: 'コピー元の種類',
      destType: 'コピー先の種類'
    };
    const target = Number.isInteger(mappingIndex)
      ? `フィールドの関連付け（${mappingIndex + 1}件目）`
      : 'フィールドの関連付け';
    return mappingProperty ? `${target}：${mappingLabels[mappingProperty]}` : target;
  }
  if ((sectionKey === 'actionSettings' || sectionKey === 'processSettings') && leaf === 'filterCond') {
    return '実行条件';
  }
  if (sectionKey === 'actionSettings' && leaf === 'entities') {
    return 'アクションを利用できるユーザー';
  }
  if (sectionKey === 'processSettings' && leaf === 'enable') {
    return 'プロセス管理を有効にする';
  }
  if ((sectionKey === 'perRecordNotifications' || sectionKey === 'reminderNotifications') && leaf === 'title') {
    return '通知内容';
  }
  if ((sectionKey === 'appSettings' || sectionKey === 'appInfo') && leaf === 'name') {
    return 'アプリ名';
  }
  const labels: Record<string, string> = {
    fileKey: 'ファイル識別情報',
    filterCond: '絞り込み条件',
    sort: 'ソート',
    index: '並び順',
    srcField: 'コピー元フィールド',
    destField: 'コピー先フィールド',
    srcType: 'コピー元の種類',
    destType: 'コピー先の種類',
    enabled: '有効状態',
    enable: '有効状態'
  };
  return labels[leaf] || decodedLabel || '設定内容';
}

const CUSTOMER_ENTITY_TYPE_LABELS: Record<string, string> = {
  ...ENTITY_TYPE_JP,
  DEPARTMENT: '組織',
  DEPT: '組織',
  EVERYONE: '全員',
  FUNCTION: '関数',
  LOGINUSER: 'ログインユーザー'
};

const CUSTOMER_ENTITY_FUNCTION_LABELS: Record<string, string> = {
  'LOGINUSER()': 'ログインユーザー',
  'PRIMARY_ORGANIZATION()': '優先する組織'
};

function customerEntityCodeLabel(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'EVERYONE') return '全員';
  return CUSTOMER_ENTITY_FUNCTION_LABELS[normalized] || value;
}

function customerEntityObjectSummary(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const wrapper = value as Record<string, unknown>;
  const entity = wrapper.entity && typeof wrapper.entity === 'object' && !Array.isArray(wrapper.entity)
    ? wrapper.entity as Record<string, unknown>
    : wrapper;
  const type = String(entity.type || '').trim().toUpperCase();
  const typeLabel = CUSTOMER_ENTITY_TYPE_LABELS[type];
  if (!typeLabel) return null;
  const rawCode = String(entity.code || entity.login || entity.id || '').trim();
  const code = customerEntityCodeLabel(rawCode);
  const name = String(entity.name || '').trim();

  let display: string;
  if (type === 'FUNCTION' && code && code !== rawCode) display = code;
  else if (code === '全員') display = code;
  else if (name && rawCode && name !== rawCode) display = `${typeLabel}「${name}」（コード: ${rawCode}）`;
  else if (name || code) display = `${typeLabel}「${name || code}」`;
  else display = typeLabel;

  const extras: string[] = [];
  if (typeof wrapper.includeSubs === 'boolean') extras.push(wrapper.includeSubs ? '配下の組織を含む' : '配下の組織を含まない');
  if (typeof wrapper.accessibility === 'string') {
    const accessibility = customerMapValue(CUSTOMER_FIELD_ACCESSIBILITY_LABELS, wrapper.accessibility);
    if (accessibility) extras.push(accessibility);
  }
  return extras.length ? `${display} / ${extras.join(' / ')}` : display;
}

function customerEntityCollectionSummary(row: DiffXlsxRow, value: unknown): string | null {
  if (!/(?:^|\.)(?:defaultValue|entity|entities|recipients)(?:\.|\[|$)/.test(String(row.path || ''))) return null;
  if (Array.isArray(value)) {
    if (!value.length) return null;
    const labels = value.map(customerEntityObjectSummary);
    return labels.every(Boolean) ? labels.join('、') : null;
  }
  return customerEntityObjectSummary(value);
}

function localizeCustomerEntityLabel(value: string): string {
  return value.split(/(\s*›\s*)/).map((part) => {
    if (/^\s*›\s*$/.test(part)) return part;
    const match = /^(.*?)\s+\(([A-Z][A-Z0-9_]*)\)$/.exec(part.trim());
    if (!match) return customerEntityCodeLabel(part);
    const code = customerEntityCodeLabel(match[1].trim());
    const type = CUSTOMER_ENTITY_TYPE_LABELS[match[2]];
    if (!type) return part;
    if (match[2] === 'FUNCTION' && code !== match[1].trim()) return code;
    if (code === '全員') return code;
    return code ? `${type}「${code}」` : type;
  }).join('');
}

function customerGenericTargetLabel(row: DiffXlsxRow, sectionKey: string, decodedTargets: string[]): string {
  const entityKind = String((row as any).entityKind || '');
  const rawEntityLabel = customerPlainText((row as any).entityLabel || '');
  const entityLabel = [
    'aclEntry', 'fieldAclEntry', 'recordAclEntry',
    'notification', 'perRecordNotification', 'reminderNotification'
  ].includes(entityKind)
    ? localizeCustomerEntityLabel(rawEntityLabel)
    : rawEntityLabel;
  if (entityLabel) {
    const prefixes: Record<string, string> = {
      action: 'アクション',
      appAction: 'アプリアクション',
      plugin: 'プラグイン',
      jsCss: 'カスタマイズ',
      state: 'ステータス',
      report: 'グラフ',
      notification: '通知',
      perRecordNotification: 'レコード条件通知',
      reminderNotification: 'リマインダー通知'
    };
    const prefix = prefixes[entityKind];
    return prefix ? `${prefix}「${entityLabel}」` : entityLabel;
  }

  const arrayKeyValue = (row as any).arrayKeyValue;
  if (arrayKeyValue != null && typeof arrayKeyValue !== 'object') {
    const value = customerPlainText(arrayKeyValue);
    if (sectionKey === 'pluginSettings') return `プラグイン「${value}」`;
    if (sectionKey === 'actionSettings') return `アプリアクション「${value}」`;
    if (sectionKey === 'processSettings') return `アクション「${value}」`;
  }

  const normalizedTargets = decodedTargets.map((target) => target
    .replace(/^デスクトップ\s*\/\s*JS$/i, 'デスクトップ JavaScript')
    .replace(/^モバイル\s*\/\s*JS$/i, 'モバイル JavaScript')
    .replace(/^デスクトップ\s*\/\s*CSS$/i, 'デスクトップ CSS')
    .replace(/^モバイル\s*\/\s*CSS$/i, 'モバイル CSS'));
  return normalizedTargets.length ? normalizedTargets.join(' › ') : `${customerSectionLabel(sectionKey)}全体`;
}

function customerActionItemParts(
  row: DiffXlsxRow,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): CustomerItemParts | null {
  const path = String(row.path || '');
  if (sectionKeyOfRow(row) !== 'actionSettings' || !/^actionSettings\.actions(?:\.|\[)/.test(path)) {
    return null;
  }

  const actionNames = (bundle?: DiffXlsxBundle): string[] => {
    const actions = bundle?.sections?.actionSettings?.actions;
    if (!actions || typeof actions !== 'object' || Array.isArray(actions)) return [];
    return Object.keys(actions)
      .filter((name) => {
        const prefix = `actionSettings.actions.${name}`;
        return path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`);
      })
      .sort((left, right) => right.length - left.length);
  };
  const preferredBundle = row.type === 'removed' ? sourceBundle : targetBundle;
  const fallbackBundle = row.type === 'removed' ? targetBundle : sourceBundle;
  const entityKind = String((row as any).entityKind || '');
  const entityLabel = customerPlainText((row as any).entityLabel || '');
  const keyedActionName = (row as any).arrayKey === 'name'
    ? customerPlainText((row as any).arrayKeyValue || '')
    : '';
  const pathActionName = customerPlainText(
    /^actionSettings\.actions\.(.+?)(?=\.(?:mappings|destApp|targetApp|sourceApp|destAppId|targetAppId|sourceAppId|filterCond|name|index)(?:\.|\[|$)|$)/
      .exec(path)?.[1] || ''
  );
  const actionName = actionNames(preferredBundle)[0]
    || actionNames(fallbackBundle)[0]
    || (entityKind === 'appAction' ? entityLabel : '')
    || keyedActionName
    || pathActionName
    || '名称不明';

  let settingItem = customerGenericSettingLabel('actionSettings', path, '');
  const actionPrefix = actionName === '名称不明' ? '' : `actionSettings.actions.${actionName}`;
  if (actionPrefix && path === actionPrefix) {
    settingItem = row.type === 'added'
      ? 'アクションを追加'
      : row.type === 'removed'
        ? 'アクションを削除'
        : 'アクション全体';
  }
  return {
    target: `アプリアクション「${actionName}」`,
    settingItem
  };
}

function customerFieldTargetLabel(
  row: DiffXlsxRow,
  info: any,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): string {
  const identity = fieldDisplayIdentity(row, info, { rows: [], sourceBundle, targetBundle });
  const preferredBundle = row.type === 'removed' ? sourceBundle : targetBundle;
  const fallbackBundle = row.type === 'removed' ? targetBundle : sourceBundle;
  if (info.isSubField) {
    const preferredRoot = fieldSettingsProperties(preferredBundle)[info.rootCode];
    const fallbackRoot = fieldSettingsProperties(fallbackBundle)[info.rootCode];
    const preferredChild = fieldDefinitionAt(preferredBundle, info);
    const fallbackChild = fieldDefinitionAt(fallbackBundle, info);
    const rootName = customerPlainText(fieldDefinitionLabel(preferredRoot)
      || fieldDefinitionLabel(fallbackRoot)
      || /^テーブル「([^」]+)」/.exec(String(row.reasonSummary || ''))?.[1]
      || info.rootCode);
    const childName = customerPlainText(fieldDefinitionLabel(preferredChild)
      || fieldDefinitionLabel(fallbackChild)
      || fieldLabelFromRow(row, info)
      || info.subFieldCode);
    const root = rootName && rootName !== info.rootCode
      ? `テーブル「${rootName}」（コード: ${info.rootCode}）`
      : `テーブル「${info.rootCode}」`;
    const child = childName && childName !== info.subFieldCode
      ? `フィールド「${childName}」（コード: ${info.subFieldCode}）`
      : `フィールド「${info.subFieldCode}」`;
    return `${root} › ${child}`;
  }
  const fieldCode = String(identity.fieldCode || info.rootCode || '').trim();
  const fieldName = customerPlainText(identity.fieldName || fieldCode || 'フィールド');
  const preferredDefinition = fieldDefinitionAt(preferredBundle, info);
  const fallbackDefinition = fieldDefinitionAt(fallbackBundle, info);
  const preferredPayload = row.type === 'removed' ? row.left : row.right;
  const fallbackPayload = row.type === 'removed' ? row.right : row.left;
  const definitionType = String(
    preferredDefinition?.type
    || fallbackDefinition?.type
    || (preferredPayload && typeof preferredPayload === 'object' && !Array.isArray(preferredPayload)
      ? (preferredPayload as Record<string, unknown>).type
      : '')
    || (fallbackPayload && typeof fallbackPayload === 'object' && !Array.isArray(fallbackPayload)
      ? (fallbackPayload as Record<string, unknown>).type
      : '')
  ).toUpperCase();
  const kind = definitionType === 'SUBTABLE' ? 'テーブル' : 'フィールド';
  return fieldName && fieldName !== fieldCode
    ? `${kind}「${fieldName}」（コード: ${fieldCode}）`
    : `${kind}「${fieldCode || fieldName || '名称不明'}」`;
}

interface CustomerFieldColumns {
  structure: 'フィールド' | 'テーブル' | '└ テーブル内フィールド';
  parentTableName: string;
  parentTableCode: string;
  fieldName: string;
  fieldCode: string;
  fieldType: string;
  fieldPresence: '両方' | '比較元のみ' | '比較先のみ';
  settingPresence: '両方' | '比較元のみ' | '比較先のみ' | '—';
  wholeField: boolean;
}

function customerFieldSettingLabel(settingKey: string, fallback: string): string {
  if (settingKey === '(field)') return 'フィールド全体';
  if (settingKey.startsWith('options.')) {
    const tokens = settingKey.split('.');
    const option = customerPlainText(tokens[1] || '名称不明');
    const property = FIELD_SETTING_LABELS[tokens.at(-1) || ''] || fallback.split(' / ').at(-1) || '設定内容';
    return `選択肢「${option}」：${property}`;
  }
  const prefix = settingKey.startsWith('lookup.')
    ? 'ルックアップ'
    : settingKey.startsWith('referenceTable.')
      ? '関連レコード一覧'
      : '';
  const leaf = settingKey.split('.').filter(Boolean).at(-1) || '';
  // kintone のフィールド設定画面に表示される項目名に合わせる（独自の略語を作らない）。
  const exactLabels: Record<string, string> = {
    'lookup.relatedApp.app': '関連付けるアプリ（アプリID）',
    'lookup.relatedApp.appId': '関連付けるアプリ（アプリID）',
    'lookup.relatedAppId': '関連付けるアプリ（アプリID）',
    'referenceTable.relatedApp.app': '参照するアプリ（アプリID）',
    'referenceTable.relatedApp.appId': '参照するアプリ（アプリID）',
    'referenceTable.relatedAppId': '参照するアプリ（アプリID）',
    'referenceTable.condition': '表示するレコードの条件',
    'referenceTable.condition.field': '表示するレコードの条件（自アプリのフィールド）',
    'referenceTable.condition.relatedField': '表示するレコードの条件（参照するアプリのフィールド）',
    'referenceTable.sort': 'レコードのソート（表示順）',
    'referenceTable.filterCond': 'さらに絞り込む条件',
    'referenceTable.size': '一度に表示する最大レコード数',
    'lookup.relatedKeyField': 'コピー元のフィールド',
    'lookup.fieldMappings': 'ほかのフィールドのコピー',
    'lookup.lookupPickerFields': 'コピー元のレコード選択時に表示するフィールド',
    'lookup.filterCond': '絞り込みの初期設定',
    'lookup.sort': 'ソートの初期設定'
  };
  let label = exactLabels[settingKey];
  if (!label && /^referenceTable\.displayFields\.\d+$/.test(settingKey)) {
    const index = Number(settingKey.split('.').at(-1));
    label = `表示するフィールド（${index + 1}件目）`;
  }
  if (!label) {
    const mapping = /^lookup\.fieldMappings\.(\d+)\.(field|relatedField)$/.exec(settingKey);
    if (mapping) {
      label = mapping[2] === 'field'
        ? `ほかのフィールドのコピー（${Number(mapping[1]) + 1}件目）のコピー先（自アプリのフィールド）`
        : `ほかのフィールドのコピー（${Number(mapping[1]) + 1}件目）のコピー元（関連付けるアプリのフィールド）`;
    }
  }
  if (!label && /^lookup\.(?:fieldMappings|lookupPickerFields)\.\d+/.test(settingKey)) {
    const index = Number(settingKey.match(/\.(\d+)/)?.[1] || 0);
    label = `${FIELD_SETTING_LABELS[settingKey.split('.')[1]] || '設定項目'}（${index + 1}件目）`;
  }
  if (!label) label = FIELD_SETTING_LABELS[leaf]
    || fallback.split(' / ').at(-1)
    || '設定内容';
  return prefix ? `${prefix}：${label}` : label;
}

function movedSettingItemLabel(settingItem: string): string {
  // 「表示するフィールド（3件目）」のような一覧項目の移動は、何の並び順が変わったかを明示する。
  const listItem = /^(.+?)（\d+件目）$/.exec(settingItem);
  return listItem ? `${listItem[1]}の並び順` : '並び順';
}

function customerLayoutItemParts(
  row: DiffXlsxRow,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): CustomerItemParts | null {
  const path = String(row.path || '');
  const match = /^layoutSettings\.layout\[(\d+)\](.*)$/.exec(path);
  if (!match) return null;
  const rowIndex = Number(match[1]);
  const preferredBundle = row.type === 'removed' ? sourceBundle : targetBundle;
  const fallbackBundle = row.type === 'removed' ? targetBundle : sourceBundle;
  const preferredPayload = row.type === 'removed' ? row.left : row.right;
  const fallbackPayload = row.type === 'removed' ? row.right : row.left;
  const payloadEntity = preferredPayload && typeof preferredPayload === 'object' && !Array.isArray(preferredPayload)
    ? preferredPayload
    : fallbackPayload && typeof fallbackPayload === 'object' && !Array.isArray(fallbackPayload)
      ? fallbackPayload
      : null;
  const entityRootPath = /(?:^|\.)(?:layout|fields)\[\d+\]$/.test(path);
  const layoutAt = (bundle?: DiffXlsxBundle) => bundle?.sections?.layoutSettings?.layout?.[rowIndex];
  let entity = entityRootPath ? payloadEntity : null;
  if (!entity) entity = layoutAt(preferredBundle) || layoutAt(fallbackBundle) || null;
  const childRoutes = [...match[2].matchAll(/\.(fields|layout)\[(\d+)\]/g)]
    .map((entry) => ({ bucket: entry[1], index: Number(entry[2]) }));
  const fieldIndices = [...path.matchAll(/\.fields\[(\d+)\]/g)].map((entry) => Number(entry[1]));
  for (const route of childRoutes) {
    if (entityRootPath && entity === payloadEntity) break;
    entity = entity && typeof entity === 'object' && !Array.isArray(entity)
      ? (entity as Record<string, any>)[route.bucket]?.[route.index]
      : null;
  }
  if (!entity && payloadEntity) entity = payloadEntity;

  const lastFieldIndex = fieldIndices.at(-1);
  const position = lastFieldIndex == null
    ? `${rowIndex + 1}行目`
    : `${rowIndex + 1}行目・${lastFieldIndex + 1}項目目`;
  const definition = entity && typeof entity === 'object' && !Array.isArray(entity)
    ? entity as Record<string, unknown>
    : {};
  const type = String(definition.type || '').toUpperCase();
  const code = String(definition.code || '').trim();
  const entityLabel = customerRichText(definition.label || definition.name || definition.value || '');
  const elementId = String(definition.elementId || '').trim();
  const display = code
    ? customerFieldCodeLabel(code, preferredBundle) || customerFieldCodeLabel(code, fallbackBundle) || code
    : '';
  const labelMatch = /^(.*?)（[^（）]+）$/.exec(display);
  const displayName = customerPlainText(entityLabel || labelMatch?.[1] || display || code);
  const codedTarget = (kind: string): string => displayName && displayName !== code
    ? `${kind}「${displayName}」（コード: ${code}）`
    : `${kind}「${code || displayName || '名称不明'}」`;
  let target: string;
  if (type === 'GROUP') {
    target = codedTarget('グループ');
  } else if (type === 'SUBTABLE') {
    target = codedTarget('テーブル');
  } else if (type === 'LABEL') {
    target = `ラベル「${entityLabel || '文字なし'}」（${position}）`;
  } else if (type === 'SPACER') {
    target = elementId ? `スペース「${elementId}」（${position}）` : `スペース（${position}）`;
  } else if (code) {
    target = codedTarget('フィールド');
  } else if (entityLabel) {
    target = `ラベル「${entityLabel}」（${position}）`;
  } else {
    target = `レイアウト ${position}`;
  }

  const leaf = path.match(/(?:^|\.)([^.[\]]+)$/)?.[1] || '';
  const propLabels: Record<string, string> = {
    type: '種類',
    code: 'フィールドコード',
    elementId: '要素ID',
    label: '表示文字',
    value: '表示文字',
    size: '表示サイズ',
    width: '横幅',
    height: '高さ',
    innerWidth: '入力欄の横幅',
    innerHeight: '入力欄の高さ'
  };
  let settingItem = propLabels[leaf] || (leaf && leaf !== 'layout' && leaf !== 'fields' ? leaf : '');
  if (!settingItem) {
    settingItem = lastFieldIndex == null
      ? row.type === 'added' ? '行を追加' : row.type === 'removed' ? '行を削除' : '行の設定'
      : row.type === 'added' ? '配置を追加' : row.type === 'removed' ? '配置を削除' : '配置の設定';
  }
  return { target, settingItem };
}

function customerViewItemParts(
  row: DiffXlsxRow,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): CustomerItemParts | null {
  const identity = resolveCoarseViewIdentity(row, sourceBundle, targetBundle);
  if (!identity) return null;
  if (identity.isRoot) {
    return {
      target: `一覧「${customerPlainText(identity.viewName)}」`,
      settingItem: row.type === 'added' ? '一覧を追加' : row.type === 'removed' ? '一覧を削除' : '一覧全体'
    };
  }
  const viewName = customerPlainText(identity.viewName);
  const property = String(identity.property || '');
  const labels: Record<string, string> = {
    filterCond: '絞り込み条件',
    sort: 'ソート',
    type: '一覧の表示形式',
    name: '一覧名',
    pagination: 'ページ送り',
    paginationStyle: 'ページ送りの形式',
    pager: 'ページ送り',
    builtinType: '標準一覧の種類',
    device: '表示するデバイス',
    date: '日付の基準フィールド',
    title: '見出し',
    html: 'カスタマイズ内容',
    index: '一覧の並び順'
  };
  const fieldIndex = /^fields\[(\d+)\]$/.exec(property)?.[1];
  const settingItem = property.startsWith('fields')
    ? fieldIndex == null ? '表示するフィールド' : `表示するフィールド（${Number(fieldIndex) + 1}件目）`
    : labels[property] || '一覧設定';
  return { target: `一覧「${viewName}」`, settingItem };
}

function customerItemParts(
  row: DiffXlsxRow,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): CustomerItemParts {
  const sectionKey = sectionKeyOfRow(row);
  const sectionLabel = customerSectionLabel(sectionKey);
  const path = String(row.path || '').trim();
  if (row._stateRenameNotice) return { target: 'プロセス管理', settingItem: 'ステータス名' };

  const fieldInfo = extractFieldPathInfo(path);
  if (fieldInfo) {
    const setting = fieldSettingIdentity(fieldInfo);
    return {
      target: customerFieldTargetLabel(row, fieldInfo, sourceBundle, targetBundle),
      settingItem: customerFieldSettingLabel(setting.settingKey, setting.settingLabel)
    };
  }

  const layout = customerLayoutItemParts(row, sourceBundle, targetBundle);
  if (layout) return layout;

  const view = sectionKey === 'viewSettings' ? customerViewItemParts(row, sourceBundle, targetBundle) : null;
  if (view) return view;

  const action = customerActionItemParts(row, sourceBundle, targetBundle);
  if (action) return action;

  try {
    const decoded = decodeRow(row as any);
    if (decoded) {
      const targets = [...new Set(decoded.whereChips.map((chip) => customerPlainText(chip.label)).filter(Boolean))];
      const decodedSetting = decoded.propLabel === '絞込条件'
        ? '絞り込み条件'
        : decoded.propLabel === 'ソート'
          ? '並び順'
          : customerPlainText(decoded.propLabel);
      return {
        target: customerGenericTargetLabel(row, sectionKey, targets),
        settingItem: customerGenericSettingLabel(sectionKey, path, decodedSetting)
      };
    }
  } catch {
    // 人向けラベルを作れない場合は、明示ラベルまたは技術パスへフォールバックする。
  }

  const explicit = String(row.label || '').trim();
  if (explicit && explicit !== path) {
    return { target: customerPlainText(explicit), settingItem: '設定内容' };
  }
  return {
    target: '未識別の設定項目',
    settingItem: '設定内容',
    technicalPath: path || sectionKey
  };
}

function customerFieldColumns(
  row: DiffXlsxRow,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): CustomerFieldColumns | null {
  const info = extractFieldPathInfo(String(row.path || ''));
  if (!info) return null;

  const sourceDefinition = fieldDefinitionAt(sourceBundle, info);
  const targetDefinition = fieldDefinitionAt(targetBundle, info);
  const preferredDefinition = row.type === 'removed' ? sourceDefinition : targetDefinition;
  const fallbackDefinition = row.type === 'removed' ? targetDefinition : sourceDefinition;
  const identity = fieldDisplayIdentity(row, info, { rows: [], sourceBundle, targetBundle });
  const fieldName = customerPlainText(
    fieldDefinitionLabel(preferredDefinition)
    || fieldDefinitionLabel(fallbackDefinition)
    || fieldLabelFromRow(row, info)
    || info.activeCode
  );
  const preferredRoot = fieldSettingsProperties(row.type === 'removed' ? sourceBundle : targetBundle)[info.rootCode];
  const fallbackRoot = fieldSettingsProperties(row.type === 'removed' ? targetBundle : sourceBundle)[info.rootCode];
  const parentTableName = info.isSubField
    ? customerPlainText(
      fieldDefinitionLabel(preferredRoot)
      || fieldDefinitionLabel(fallbackRoot)
      || /^テーブル「([^」]+)」/.exec(String(row.reasonSummary || ''))?.[1]
      || info.rootCode
    )
    : '—';
  const definitionType = String(
    preferredDefinition?.type
    || fallbackDefinition?.type
    || ((row.type === 'removed' ? row.left : row.right) as Record<string, unknown> | null)?.type
    || ((row.type === 'removed' ? row.right : row.left) as Record<string, unknown> | null)?.type
    || ''
  ).toUpperCase();
  const wholeField = info.isFieldRoot || info.isSubFieldRoot;

  let fieldPresence: CustomerFieldColumns['fieldPresence'];
  if (wholeField && row.type === 'added') fieldPresence = '比較先のみ';
  else if (wholeField && row.type === 'removed') fieldPresence = '比較元のみ';
  else if (sourceDefinition && !targetDefinition) fieldPresence = '比較元のみ';
  else if (!sourceDefinition && targetDefinition) fieldPresence = '比較先のみ';
  else fieldPresence = '両方';

  const settingPresence: CustomerFieldColumns['settingPresence'] = wholeField
    ? '—'
    : row.type === 'added'
      ? '比較先のみ'
      : row.type === 'removed'
        ? '比較元のみ'
        : '両方';

  return {
    structure: info.isSubField
      ? '└ テーブル内フィールド'
      : definitionType === 'SUBTABLE'
        ? 'テーブル'
        : 'フィールド',
    parentTableName,
    parentTableCode: info.isSubField ? String(info.rootCode) : '—',
    fieldName: fieldName || String(info.activeCode || '名称不明'),
    fieldCode: String(info.activeCode || identity.fieldCode || '—'),
    fieldType: identity.fieldType,
    fieldPresence,
    settingPresence,
    wholeField
  };
}

function customerTargetColumns(
  row: DiffXlsxRow,
  parts: CustomerItemParts,
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): Pick<CustomerDiffItem, 'parentTarget' | 'targetName' | 'targetCode' | 'tableChild' | 'field'> {
  const field = customerFieldColumns(row, sourceBundle, targetBundle);
  if (!field) {
    return {
      parentTarget: '—',
      targetName: parts.target,
      targetCode: '—',
      tableChild: false
    };
  }
  const parentTarget = field.parentTableName === '—'
    ? '—'
    : field.parentTableName === field.parentTableCode
      ? field.parentTableCode
      : `${field.parentTableName}（${field.parentTableCode}）`;
  return {
    parentTarget,
    targetName: field.fieldName,
    targetCode: field.fieldCode,
    tableChild: field.structure === '└ テーブル内フィールド',
    field
  };
}

function customerSideIsAbsent(row: DiffXlsxRow, side: 'source' | 'target'): boolean {
  if (side === 'source' && row.type === 'added') return true;
  if (side === 'target' && row.type === 'removed') return true;
  const property = side === 'source' ? 'left' : 'right';
  return !Object.prototype.hasOwnProperty.call(row, property);
}

function customerRawValue(row: DiffXlsxRow, side: 'source' | 'target'): CustomerRawValue {
  if (customerSideIsAbsent(row, side)) return { state: '存在しません', text: '—' };

  const value = side === 'source' ? row.left : row.right;
  if (value === undefined) return { state: '未定義（undefined）', text: 'undefined' };
  if (value === null) return { state: 'null', text: 'null' };
  if (typeof value === 'string') {
    return {
      state: value.length ? `文字列（${value.length}文字）` : '文字列（空文字）',
      text: JSON.stringify(value)
    };
  }
  if (typeof value === 'boolean') return { state: '真偽値', text: value ? 'true' : 'false' };
  if (typeof value === 'number') {
    const serialized = JSON.stringify(value);
    return { state: '数値', text: serialized == null ? String(value) : serialized };
  }
  if (Array.isArray(value)) {
    return { state: `配列（${value.length}件）`, text: stringifyForDiff(value) };
  }
  if (typeof value === 'object') {
    return { state: `オブジェクト（${Object.keys(value as Record<string, unknown>).length}項目）`, text: stringifyForDiff(value) };
  }
  return { state: typeof value, text: String(value) };
}

function customerRawDisplayValue(raw: CustomerRawValue): string {
  if (raw.state === '存在しません') return '存在しません';
  if (raw.state === '文字列（空文字）') return '空文字';
  return raw.text;
}

const CUSTOMER_MAIN_VALUE_COLUMN_WIDTH = 26;
const CUSTOMER_MAIN_VALUE_MAX_LINES = 3;
const CUSTOMER_DETAIL_RAW_MAX_LINES = 5;
const CUSTOMER_RAW_CHUNK_TEXT_LIMIT = 30000;
const CUSTOMER_RAW_CHUNK_LINE_LIMIT = 5;
const CUSTOMER_RAW_CHUNK_COLUMN_WIDTH = 60;

function customerRawNeedsContinuation(raw: CustomerRawValue): boolean {
  return raw.text.length > 32767
    || estimatedWrappedLines(raw.text, 42) > CUSTOMER_DETAIL_RAW_MAX_LINES;
}

function splitCustomerRawText(text: string): string[] {
  if (!text.length) return [''];
  const chunks: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    const capacity = Math.max(8, CUSTOMER_RAW_CHUNK_COLUMN_WIDTH - 2);
    let end = offset;
    let lines = 1;
    let lineWidth = 0;
    while (end < text.length && end - offset < CUSTOMER_RAW_CHUNK_TEXT_LIMIT) {
      const codePoint = text.codePointAt(end)!;
      const charLength = codePoint > 0xffff ? 2 : 1;
      const char = text.slice(end, end + charLength);
      let nextLines = lines;
      let nextWidth = lineWidth;
      if (char === '\n') {
        nextLines += 1;
        nextWidth = 0;
      } else if (char !== '\r') {
        const charWidth = codePoint <= 0xff ? 1 : 2;
        if (nextWidth + charWidth > capacity) {
          nextLines += 1;
          nextWidth = charWidth;
        } else {
          nextWidth += charWidth;
        }
      }
      if (nextLines > CUSTOMER_RAW_CHUNK_LINE_LIMIT && end > offset) break;
      lines = nextLines;
      lineWidth = nextWidth;
      end += charLength;
    }
    if (end <= offset) end = Math.min(text.length, offset + 1);
    chunks.push(text.slice(offset, end));
    offset = end;
  }
  return chunks;
}

function buildCustomerRawContinuations(items: CustomerDiffItem[]): CustomerDiffRawContinuation[] {
  const continuations: CustomerDiffRawContinuation[] = [];
  let firstRow = 2;
  for (const item of items) {
    for (const side of ['source', 'target'] as const) {
      const raw = side === 'source' ? item.rawBefore : item.rawAfter;
      if (!customerRawNeedsContinuation(raw)) continue;
      const chunks = splitCustomerRawText(raw.text);
      continuations.push({ kind: 'difference', item, side, chunks, firstRow });
      firstRow += chunks.length;
    }
  }
  return continuations;
}

function compactCustomerMainValue(value: string): string {
  const normalized = value.replace(/\r\n?/g, '\n');
  if (estimatedWrappedLines(normalized, CUSTOMER_MAIN_VALUE_COLUMN_WIDTH) <= CUSTOMER_MAIN_VALUE_MAX_LINES) {
    return normalized;
  }

  let output = '';
  for (const char of graphemeClusters(normalized)) {
    const candidate = `${output}${char}…`;
    if (estimatedWrappedLines(candidate, CUSTOMER_MAIN_VALUE_COLUMN_WIDTH) > CUSTOMER_MAIN_VALUE_MAX_LINES) break;
    output += char;
  }
  return `${output.replace(/\s+$/g, '')}…`;
}

function customerFieldCodeLabel(codeValue: unknown, bundle?: DiffXlsxBundle): string {
  const code = String(codeValue ?? '').trim();
  if (!code) return code;
  const definition = fieldSettingsProperties(bundle)[code];
  const label = fieldDefinitionLabel(definition);
  return label && label !== code ? `${label}（${code}）` : code;
}

function transformCustomerUnquotedText(value: string, transform: (text: string) => string): string {
  let result = '';
  let unquotedStart = 0;
  let cursor = 0;
  while (cursor < value.length) {
    const quote = value[cursor];
    if (quote !== '"' && quote !== "'") {
      cursor += 1;
      continue;
    }
    result += transform(value.slice(unquotedStart, cursor));
    const quotedStart = cursor;
    cursor += 1;
    while (cursor < value.length) {
      if (value[cursor] === '\\' && cursor + 1 < value.length) {
        cursor += 2;
        continue;
      }
      if (value[cursor] === quote) {
        cursor += 1;
        break;
      }
      cursor += 1;
    }
    result += value.slice(quotedStart, cursor);
    unquotedStart = cursor;
  }
  return result + transform(value.slice(unquotedStart));
}

function replaceCustomerFieldCodes(value: string, bundle?: DiffXlsxBundle): string {
  const definitions = Object.entries(fieldSettingsProperties(bundle))
    .map(([code, definition]) => ({ code, label: fieldDefinitionLabel(definition) }))
    .filter(({ code, label }) => !!code && !!label && code !== label)
    .sort((a, b) => b.code.length - a.code.length);
  if (!definitions.length) return value;

  const labels = new Map(definitions.map(({ code, label }) => [code, label]));
  const alternatives = definitions
    .map(({ code }) => code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const fieldCodePattern = new RegExp(`(^|[^A-Za-z0-9_])(${alternatives})(?=$|[^A-Za-z0-9_])`, 'g');
  const replaceUnquoted = (text: string): string => text.replace(
    fieldCodePattern,
    (_match, prefix: string, code: string) => `${prefix}${labels.get(code)}（${code}）`
  );

  // 絞り込み条件の引用符内は選択肢・文字列リテラルなので、フィールドコードとして置換しない。
  // 未引用部分も一括置換し、挿入したラベルを別コードとして再置換しない。
  return transformCustomerUnquotedText(value, replaceUnquoted);
}

const CUSTOMER_QUERY_FUNCTION_LABELS: Record<string, string> = {
  LOGINUSER: 'ログインユーザー',
  PRIMARY_ORGANIZATION: '優先する組織',
  NOW: '現在日時',
  TODAY: '今日',
  YESTERDAY: '昨日',
  TOMORROW: '明日',
  THIS_WEEK: '今週',
  LAST_WEEK: '先週',
  NEXT_WEEK: '来週',
  THIS_MONTH: '今月',
  LAST_MONTH: '先月',
  NEXT_MONTH: '来月',
  THIS_YEAR: '今年',
  LAST_YEAR: '昨年',
  NEXT_YEAR: '来年'
};

const CUSTOMER_QUERY_PERIOD_LABELS: Record<string, string> = {
  DAYS: '日',
  WEEKS: '週',
  MONTHS: 'か月',
  YEARS: '年'
};

function localizeCustomerFilterFunctions(value: string): string {
  return transformCustomerUnquotedText(value, (text) => {
    let localized = text.replace(
      /\bFROM_TODAY\s*\(\s*(-?\d+)\s*,\s*(DAYS|WEEKS|MONTHS|YEARS)\s*\)/gi,
      (_match, count: string, unit: string) => `今日から（${count}${CUSTOMER_QUERY_PERIOD_LABELS[unit.toUpperCase()] || unit}）`
    );
    localized = localized.replace(
      /\b(LOGINUSER|PRIMARY_ORGANIZATION|NOW|TODAY|YESTERDAY|TOMORROW|THIS_WEEK|LAST_WEEK|NEXT_WEEK|THIS_MONTH|LAST_MONTH|NEXT_MONTH|THIS_YEAR|LAST_YEAR|NEXT_YEAR)\s*\(\s*\)/gi,
      (_match, name: string) => CUSTOMER_QUERY_FUNCTION_LABELS[name.toUpperCase()] || name
    );
    return localized;
  });
}

function customerSortValue(value: string, bundle?: DiffXlsxBundle): string {
  return value.split(/\s*,\s*/).map((part) => {
    const match = /^(.*?)\s+(asc|desc)$/i.exec(part.trim());
    if (!match) return replaceCustomerFieldCodes(part, bundle);
    const field = customerFieldCodeLabel(match[1], bundle);
    return `${field}（${match[2].toLowerCase() === 'asc' ? '昇順' : '降順'}）`;
  }).join('、');
}

function customerTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    LIST: '一覧',
    CALENDAR: 'カレンダー',
    CUSTOM: 'カスタマイズ',
    NUMBER_DIGIT: '数値（桁区切りあり）',
    NUMBER: '数値',
    FIELD: 'フィールド',
    RECORD_URL: 'レコードのURL'
  };
  return FIELD_TYPE_LABELS[value] || labels[value] || value;
}

const CUSTOMER_ONE_BASED_INDEX_SECTIONS = new Set([
  'fieldSettings',
  'viewSettings',
  'reportSettings',
  'processSettings',
  'actionSettings',
  'categories'
]);

const CUSTOMER_VIEW_BUILTIN_LABELS: Record<string, string> = VIEW_BUILTIN_TYPE_JP;

const CUSTOMER_VIEW_DEVICE_LABELS: Record<string, string> = VIEW_DEVICE_JP;

const CUSTOMER_PAGINATION_LABELS: Record<string, string> = {
  ...PAGINATION_TYPE_JP,
  PAGER: 'ページ送り',
  SCROLL: '無限スクロール'
};

const CUSTOMER_FIELD_ACCESSIBILITY_LABELS: Record<string, string> = {
  WRITE: '閲覧・編集可',
  READ_WRITE: '閲覧・編集可',
  READ: '閲覧のみ',
  NONE: 'アクセス不可'
};

const CUSTOMER_APP_THEME_LABELS: Record<string, string> = APP_THEME_JP;

const CUSTOMER_TITLE_SELECTION_LABELS: Record<string, string> = TITLE_SELECTION_JP;

const CUSTOMER_ROUNDING_MODE_LABELS: Record<string, string> = ROUNDING_MODE_JP;

function customerMapValue(map: Record<string, string>, value: unknown): string | null {
  const original = String(value ?? '');
  const label = map[original.trim().toUpperCase()];
  return label || null;
}

function customerOneBasedIndexLabel(row: DiffXlsxRow, value: unknown): string | null {
  if (!CUSTOMER_ONE_BASED_INDEX_SECTIONS.has(sectionKeyOfRow(row))) return null;
  if (!/(?:^|\.)index$/.test(String(row.path || ''))) return null;
  const raw = typeof value === 'number' ? value : String(value ?? '').trim();
  if (typeof raw === 'string' && !/^\d+$/.test(raw)) return null;
  const index = Number(raw);
  if (!Number.isSafeInteger(index) || index < 0) return null;
  return `${index + 1}番目`;
}

function customerContextualEnumLabel(row: DiffXlsxRow, value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const sectionKey = sectionKeyOfRow(row);
  const path = String(row.path || '');
  const leaf = path.match(/(?:^|\.)([^.[\]]+)$/)?.[1] || '';

  if (sectionKey === 'fieldAcl' && leaf === 'accessibility') {
    return customerMapValue(CUSTOMER_FIELD_ACCESSIBILITY_LABELS, value);
  }
  if (/\.(?:entity|entities\[\d+\]|recipients\[\d+\])(?:\.entity)?\.type$/.test(path)) {
    return customerMapValue(CUSTOMER_ENTITY_TYPE_LABELS, value);
  }
  if (/\.(?:entity|entities\[\d+\]|recipients\[\d+\])(?:\.entity)?\.code$/.test(path)) {
    const localized = customerEntityCodeLabel(value);
    return localized === value ? null : localized;
  }

  if (sectionKey === 'fieldSettings') {
    if (/\.defaultValue(?:\[\d+\])?\.type$/.test(path)) {
      return customerMapValue(CUSTOMER_ENTITY_TYPE_LABELS, value);
    }
    if (leaf === 'align') return customerMapValue(ALIGN_JP, value);
    if (leaf === 'unitPosition') return customerMapValue(UNIT_POSITION_JP, value);
    if (leaf === 'protocol') return customerMapValue(LINK_PROTOCOL_JP, value);
    if (leaf === 'format') return customerMapValue(NUMBER_FORMAT_JP, value);
    if (/\.defaultValue(?:\[\d+\])?\.code$/.test(path)) {
      const localized = customerEntityCodeLabel(value);
      return localized === value ? null : localized;
    }
  }

  if (sectionKey === 'viewSettings') {
    if (leaf === 'type') return customerMapValue(VIEW_TYPE_JP, value);
    if (leaf === 'builtinType') return customerMapValue(CUSTOMER_VIEW_BUILTIN_LABELS, value);
    if (leaf === 'device') return customerMapValue(CUSTOMER_VIEW_DEVICE_LABELS, value);
    if (leaf === 'pagination' || leaf === 'paginationStyle' || leaf === 'pager') {
      return customerMapValue(CUSTOMER_PAGINATION_LABELS, value);
    }
  }

  if (sectionKey === 'reportSettings') {
    if (leaf === 'chartType') return customerMapValue(CHART_TYPE_JP, value);
    if (leaf === 'chartMode') return customerMapValue(CHART_MODE_JP, value);
    if (/\.aggregations\[\d+\]\.type$/.test(path)) return customerMapValue(AGGREGATION_TYPE_JP, value);
    if (/\.groups\[\d+\]\.per$/.test(path)) return customerMapValue(GROUP_PER_JP, value);
    if (/\.sorts\[\d+\]\.by$/.test(path)) return customerMapValue(REPORT_SORT_BY_JP, value);
    if (/\.sorts\[\d+\]\.order$/.test(path)) return customerMapValue(REPORT_SORT_ORDER_JP, value);
    if (leaf === 'every') return customerMapValue(PERIODIC_REPORT_EVERY_JP, value);
    if (leaf === 'dayOfWeek') return customerMapValue(DAY_OF_WEEK_JP, value);
  }

  if (sectionKey === 'processSettings' && /\.assignee\.type$/.test(path)) {
    return customerMapValue(PROCESS_ASSIGNEE_TYPE_JP, value);
  }

  if (sectionKey === 'customizeSettings') {
    if (leaf === 'scope') return customerMapValue(CUSTOMIZE_SCOPE_JP, value);
    if (leaf === 'type') return customerMapValue(RESOURCE_TYPE_JP, value);
  }

  if (sectionKey === 'reminderNotifications' && leaf === 'timing') {
    return customerMapValue(NOTIFICATION_TIMING_JP, value);
  }
  if (sectionKey === 'reminderNotifications' && (leaf === 'daysLater' || leaf === 'hoursLater')) {
    return describeReminderOffset(leaf === 'daysLater' ? 'days' : 'hours', value);
  }

  if (sectionKey === 'appSettings') {
    if (leaf === 'theme') return customerMapValue(CUSTOMER_APP_THEME_LABELS, value);
    if (/\.icon\.type$/.test(path)) return customerMapValue(ICON_TYPE_JP, value);
    if (leaf === 'selectionMode') return customerMapValue(CUSTOMER_TITLE_SELECTION_LABELS, value);
    if (leaf === 'roundingMode') return customerMapValue(CUSTOMER_ROUNDING_MODE_LABELS, value);
  }

  if (sectionKey === 'actionSettings' && (leaf === 'srcType' || leaf === 'destType')) {
    const localized = customerTypeLabel(value.trim().toUpperCase());
    return localized === value ? null : localized;
  }
  return null;
}

function customerTechnicalValueLabel(value: string, key: string): string {
  const normalized = value.trim();
  if (key === 'enabled' || key === 'enable') {
    if (normalized === 'true') return 'はい';
    if (normalized === 'false') return 'いいえ';
    return value;
  }
  if (key === 'type' || key === 'srcType' || key === 'destType') return customerTypeLabel(normalized);
  return value;
}

function customerComplexValueSummary(row: DiffXlsxRow, side: 'source' | 'target', value: Record<string, unknown> | unknown[]): string {
  const fieldInfo = sectionKeyOfRow(row) === 'fieldSettings'
    ? extractFieldPathInfo(String(row.path || ''))
    : null;
  const fieldSummary = fieldInfo && (fieldInfo.isFieldRoot || fieldInfo.isSubFieldRoot)
    ? conciseFieldDefinition(value)
    : null;
  if (fieldSummary) return fieldSummary;

  const entitySummary = customerEntityCollectionSummary(row, value);
  if (entitySummary) return entitySummary;

  const decoded = decodedListValue(row, side);
  if (decoded) return decoded;
  if (Array.isArray(value)) {
    if (!value.length) return '空の一覧';
    if (value.every((item) => item == null || typeof item !== 'object')) {
      const preview = value.slice(0, 5).map(humanizeListScalar).join('、');
      return `${value.length}件：${preview}${value.length > 5 ? `、ほか${value.length - 5}件` : ''}`;
    }
    return `${value.length}件の設定`;
  }

  const labels: Record<string, string> = {
    name: '名称', label: '名称', title: '名称', code: 'コード', id: 'ID', url: 'URL',
    type: '種類', enabled: '有効状態', enable: '有効状態',
    srcField: 'コピー元フィールド', destField: 'コピー先フィールド',
    srcType: 'コピー元の種類', destType: 'コピー先の種類'
  };
  const facts = Object.entries(value)
    .filter(([key, item]) => labels[key] && (item == null || typeof item !== 'object'))
    .slice(0, 5)
    .map(([key, item]) => {
      const displayValue = typeof item === 'string'
        ? customerTechnicalValueLabel(item, key)
        : humanizeListScalar(item);
      return `${labels[key]}: ${displayValue}`;
    });
  return facts.length ? facts.join('\n') : `${Object.keys(value).length}項目の設定`;
}

function customerReadableValue(
  row: DiffXlsxRow,
  side: 'source' | 'target',
  sourceBundle?: DiffXlsxBundle,
  targetBundle?: DiffXlsxBundle
): string {
  if (customerSideIsAbsent(row, side)) return '存在しません';

  const value = side === 'source' ? row.left : row.right;
  const bundle = side === 'source' ? sourceBundle : targetBundle;
  const path = String(row.path || '');
  if (value === undefined) return '（未設定）';
  if (value === null) return '（値なし）';
  if (value === '') {
    return /(?:^|\.)filterCond$/.test(path) ? '（空文字：条件なし）' : '（空文字）';
  }

  let display: string;
  if (value && typeof value === 'object') {
    display = customerComplexValueSummary(row, side, value as Record<string, unknown> | unknown[]);
  } else {
    const fieldInfo = extractFieldPathInfo(path);
    const setting = fieldInfo ? fieldSettingIdentity(fieldInfo) : null;
    const oneBasedIndex = customerOneBasedIndexLabel(row, value);
    const contextualEnum = customerContextualEnumLabel(row, value);
    if (oneBasedIndex) {
      display = oneBasedIndex;
    } else if (contextualEnum) {
      display = contextualEnum;
    } else if (fieldInfo && setting?.settingKey !== '(field)') {
      display = humanizeFieldSettingValue(value, setting?.settingKey || '');
    } else if (typeof value === 'boolean') {
      display = value ? 'はい' : 'いいえ';
    } else {
      display = String(value);
    }

    if (oneBasedIndex || contextualEnum) {
      // 上でパス文脈を使って確定した表示値を、そのまま採用する。
    } else if (/(?:\.fields\[\d+\]|\.(?:srcField|destField))$/.test(path) && typeof value === 'string') {
      display = customerFieldCodeLabel(value, bundle);
    } else if (typeof value === 'string' && setting
      && (setting.settingKey === 'referenceTable.condition.field'
        || /^lookup\.fieldMappings\.\d+\.field$/.test(setting.settingKey))) {
      // 自アプリ側のフィールドコードだけ名前解決する。参照先アプリ側のコードは
      // 自アプリの設定で解決すると別フィールドの名前を出しかねないため原文のままにする。
      display = customerFieldCodeLabel(value, bundle);
    } else if (/(?:^|\.)sort$/.test(path) && typeof value === 'string') {
      display = customerSortValue(value, bundle);
    } else if (/(?:^|\.)filterCond$/.test(path) && typeof value === 'string') {
      display = localizeCustomerFilterFunctions(replaceCustomerFieldCodes(value, bundle));
    } else if (/(?:^|\.)(?:width|height|innerWidth|innerHeight)$/.test(path)
      && (typeof value === 'number' || /^-?\d+(?:\.\d+)?$/.test(String(value)))) {
      display = `${value}px`;
    } else if (/(?:^|\.)type$/.test(path) && typeof value === 'string') {
      display = customerTypeLabel(value);
    } else if (/(?:^|\.)(?:srcType|destType)$/.test(path) && typeof value === 'string') {
      display = customerTechnicalValueLabel(value, path.split('.').at(-1) || '');
    } else if (/(?:^|\.)(?:enabled|enable)$/.test(path) && typeof value === 'string') {
      display = customerTechnicalValueLabel(value, path.split('.').at(-1) || '');
    }
  }

  return compactCustomerMainValue(display);
}

function buildCustomerDiffItems(ctx: DiffXlsxContext, includeTableChildren = false): CustomerDiffItem[] {
  const sourceRows = includeTableChildren
    ? expandSubtableRowsForDisplay((ctx.rows || []) as any) as DiffXlsxRow[]
    : (ctx.rows || []);
  const actualRows = sourceRows.filter((row) => (
    row.type !== 'same'
    && (!row._displayOnly || (includeTableChildren && row._expandedFromTable === true))
  ));
  const items: CustomerDiffItem[] = [];
  const groupedRows = groupRowsBySection(actualRows);
  const comparedSectionKeys = new Set<string>([...(ctx.scopes || []), ...groupedRows.keys()]);
  const redundantSectionKeys = customerRedundantSectionKeys(comparedSectionKeys);
  for (const [sectionKey, rows] of groupedRows) {
    const sectionLabel = customerSectionLabel(sectionKey);
    for (const row of rows) {
      const parts = customerItemParts(row, ctx.sourceBundle, ctx.targetBundle);
      const targetColumns = customerTargetColumns(row, parts, ctx.sourceBundle, ctx.targetBundle);
      const moved = row.moved || row.type === 'moved';
      const wholeFieldExistenceChange = targetColumns.field?.wholeField
        && (row.type === 'added' || row.type === 'removed');
      const positionLabel = (value: unknown, fallbackSide: 'source' | 'target'): string => (
        Number.isInteger(value) && Number(value) >= 0
          ? `${Number(value) + 1}番目`
          : customerReadableValue(row, fallbackSide, ctx.sourceBundle, ctx.targetBundle)
      );
      const before = moved
        ? positionLabel(row.movedFrom, 'source')
        : wholeFieldExistenceChange
          ? row.type === 'added' ? '存在しません' : '存在'
          : customerReadableValue(row, 'source', ctx.sourceBundle, ctx.targetBundle);
      const after = moved
        ? positionLabel(row.movedTo, 'target')
        : wholeFieldExistenceChange
          ? row.type === 'removed' ? '存在しません' : '存在'
          : customerReadableValue(row, 'target', ctx.sourceBundle, ctx.targetBundle);
      const rawBeforeBase = customerRawValue(row, 'source');
      const rawAfterBase = customerRawValue(row, 'target');
      const rawBefore = wholeFieldExistenceChange
        ? { ...rawBeforeBase, state: row.type === 'added' ? '存在しません' : '存在' }
        : rawBeforeBase;
      const rawAfter = wholeFieldExistenceChange
        ? { ...rawAfterBase, state: row.type === 'removed' ? '存在しません' : '存在' }
        : rawAfterBase;
      const targetDetail = parts.target;
      const settingItemDetail = moved
        ? movedSettingItemLabel(parts.settingItem)
        : targetColumns.field?.wholeField
          ? targetColumns.field.structure === 'テーブル' ? 'テーブル自体' : 'フィールド自体'
          : parts.settingItem;
      items.push({
        index: items.length,
        row,
        sectionKey,
        sectionLabel,
        target: customerPlainText(targetDetail, 80),
        ...targetColumns,
        settingItem: customerPlainText(settingItemDetail, 80),
        targetDetail,
        settingItemDetail,
        technicalPath: parts.technicalPath,
        item: `${targetDetail} / ${settingItemDetail}`,
        changeType: customerChangeType(row),
        before,
        after,
        rawBefore,
        rawAfter,
        redundant: redundantSectionKeys.has(sectionKey)
      });
    }
  }
  // 再掲の差分を末尾へ寄せ、変更一覧の No. を 1 から連番のまま保つ。
  const ordered = [
    ...items.filter((item) => !item.redundant),
    ...items.filter((item) => item.redundant)
  ];
  ordered.forEach((item, index) => { item.index = index; });
  return ordered;
}

function customerPrimaryItems(items: CustomerDiffItem[]): CustomerDiffItem[] {
  return items.filter((item) => !item.redundant);
}

interface CustomerCoarseTarget {
  key: string;
  classification: string;
  target: string;
  changeState: string;
  changeItems: string;
  detailCount: number;
  firstItemIndex: number;
}

function customerCoarseIdentity(
  item: CustomerDiffItem,
  ctx: DiffXlsxContext
): { key: string; classification: string; target: string; sectionKey: string; viewName?: string } {
  if (item.field) {
    const parentCode = item.field.parentTableCode === '—' ? '' : item.field.parentTableCode;
    return {
      key: JSON.stringify(['fieldSettings', parentCode, item.field.fieldCode]),
      classification: item.field.structure === 'テーブル' ? 'テーブル' : 'フィールド',
      target: customerPlainText(item.targetDetail || item.target, 96),
      sectionKey: item.sectionKey
    };
  }
  if (item.sectionKey === 'viewSettings') {
    const viewName = coarseViewName(item.row, ctx.sourceBundle, ctx.targetBundle);
    if (viewName) {
      return {
        key: JSON.stringify(['viewSettings', viewName]),
        classification: '一覧',
        target: `一覧「${customerPlainText(viewName, 72)}」`,
        sectionKey: item.sectionKey,
        viewName
      };
    }
  }
  const target = customerPlainText(item.targetDetail || item.target || item.sectionLabel, 96);
  const identity = coarseStableIdentity(item.row, item.sectionKey);
  return {
    key: identity.key,
    classification: item.sectionLabel,
    target: target || '未識別の設定項目',
    sectionKey: item.sectionKey
  };
}

function customerCoarseChangeState(
  items: CustomerDiffItem[],
  classification: string,
  ctx: DiffXlsxContext,
  sectionKey: string,
  viewName?: string
): string {
  if (items.some((item) => !!item.field)) {
    const rootExistenceChanges = items.filter((item) => (
      item.field?.wholeField && (item.changeType === '追加' || item.changeType === '削除')
    ));
    const rootAdded = rootExistenceChanges.some((item) => item.changeType === '追加');
    const rootRemoved = rootExistenceChanges.some((item) => item.changeType === '削除');
    const changes = new Set(items.map((item) => item.changeType));
    if ((rootAdded && rootRemoved)
      || (rootAdded && [...changes].some((state) => state !== '追加'))
      || (rootRemoved && [...changes].some((state) => state !== '削除'))) return '複合変更';
    if (rootAdded) return '追加';
    if (rootRemoved) return '削除';
    if (changes.size === 1 && changes.has('並び順変更')) return '並び順変更';
    return changes.size > 1 ? '複合変更' : '設定変更';
  }
  const state = coarseRowsChangeState(items.map((item) => item.row), classification, {
    sectionKey,
    viewName,
    sourceBundle: ctx.sourceBundle,
    targetBundle: ctx.targetBundle
  });
  return state === '一覧追加' ? '追加' : state === '一覧削除' ? '削除' : state;
}

function customerCoarseChangeItems(items: CustomerDiffItem[]): string {
  const labels = [...new Set(items.map((item) => customerPlainText(item.settingItem, 54)).filter(Boolean))];
  const visible = labels.slice(0, 4);
  return `${visible.join('、') || '設定内容'}${labels.length > visible.length ? `、ほか${labels.length - visible.length}項目` : ''}`;
}

function buildCustomerCoarseTargets(ctx: DiffXlsxContext, allItems: CustomerDiffItem[]): CustomerCoarseTarget[] {
  const grouped = new Map<string, {
    classification: string;
    target: string;
    sectionKey: string;
    viewName?: string;
    items: CustomerDiffItem[];
  }>();
  for (const item of customerPrimaryItems(allItems)) {
    const identity = customerCoarseIdentity(item, ctx);
    let group = grouped.get(identity.key);
    if (!group) {
      group = {
        classification: identity.classification,
        target: identity.target,
        sectionKey: identity.sectionKey,
        viewName: identity.viewName,
        items: []
      };
      grouped.set(identity.key, group);
    }
    group.items.push(item);
  }
  return [...grouped.entries()].map(([key, group]) => ({
    key,
    classification: group.classification,
    target: group.target,
    changeState: customerCoarseChangeState(
      group.items,
      group.classification,
      ctx,
      group.sectionKey,
      group.viewName
    ),
    changeItems: customerCoarseChangeItems(group.items),
    detailCount: group.items.length,
    firstItemIndex: Math.min(...group.items.map((item) => item.index))
  })).sort((left, right) => left.firstItemIndex - right.firstItemIndex
    || left.classification.localeCompare(right.classification, 'ja')
    || left.target.localeCompare(right.target, 'ja'));
}

function buildCustomerCoarseTargetSheet(ctx: DiffXlsxContext, allItems: CustomerDiffItem[]): XlsxSheet {
  const targets = buildCustomerCoarseTargets(ctx, allItems);
  const hasTargets = targets.length > 0;
  const incomplete = customerIncomplete(ctx);
  const showIncompleteWarning = hasTargets && incomplete;
  const title = '変更対象一覧\n設定項目ではなく、フィールド・一覧などの変更対象単位でまとめています。';
  const headers = ['No.', '分類', '変更対象', '対象の変更', '変更箇所', '明細件数', '変更一覧'];
  const rows: (string | number | null)[][] = [[title, '', '', '', '', '', '']];
  const rowStyles: XlsxRowStyle[] = ['normal'];
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [['subtitle']];
  const rowHeights: number[] = [44];
  if (showIncompleteWarning) {
    rows.push([
      '⚠ 比較できなかった範囲があります。掲載された変更対象は確認できた範囲のみです。「確認できなかった範囲」も確認してください',
      '', '', '', '', '', ''
    ]);
    rowStyles.push('normal');
    cellStyles.push(Array.from({ length: headers.length }, () => 'statusIncomplete'));
    rowHeights.push(42);
  }
  const headerRowNumber = rows.length + 1;
  rows.push(headers);
  rowStyles.push('normal');
  cellStyles.push([]);
  rowHeights.push(34);
  const dataStartRow = headerRowNumber + 1;
  const stateStyles: Record<string, XlsxCellStyle> = {
    '追加': 'changeAdded',
    '削除': 'changeRemoved',
    '設定変更': 'changeChanged',
    '複合変更': 'changeChanged',
    '並び順変更': 'changeMoved'
  };

  targets.forEach((target, index) => {
    rows.push([
      index + 1,
      target.classification,
      target.target,
      target.changeState,
      target.changeItems,
      target.detailCount,
      '変更一覧へ'
    ]);
    rowStyles.push('normal');
    const alternate = index % 2 === 1;
    const styles: Array<XlsxCellStyle | undefined> = [];
    styles[0] = alternate ? 'zebraCenter' : 'center';
    styles[1] = 'category';
    styles[2] = alternate ? 'zebra' : 'normal';
    styles[3] = stateStyles[target.changeState] || 'changeChanged';
    styles[4] = alternate ? 'zebra' : 'normal';
    styles[5] = alternate ? 'zebraCenter' : 'center';
    styles[6] = 'actionLink';
    cellStyles.push(styles);
    rowHeights.push(readableCustomerRowHeight([
      { value: target.classification, width: 18 },
      { value: target.target, width: 36 },
      { value: target.changeState, width: 14 },
      { value: target.changeItems, width: 42 }
    ], 132));
  });

  if (!hasTargets) {
    const emptyState: { message: string; style: XlsxCellStyle } = incomplete
      ? {
        message: '比較できなかった範囲があります。変更対象0件を差分なしとは判断できません',
        style: 'statusIncomplete'
      }
      : ctx.exportMode === 'filtered'
        ? {
          message: '現在の絞り込み条件に該当する変更対象はありません',
          style: 'zebraCenter'
        }
        : { message: '変更対象はありません（差分なし）', style: 'statusGood' };
    rows.push([emptyState.message, '', '', '', '', '', '']);
    rowStyles.push('normal');
    cellStyles.push(Array.from({ length: headers.length }, () => emptyState.style));
    rowHeights.push(44);
  }

  return {
    name: '変更対象一覧',
    rows,
    colWidths: [7, 18, 36, 14, 42, 10, 14],
    rowStyles,
    cellStyles,
    headerRow: headerRowNumber,
    autoFilter: hasTargets,
    freezeRows: hasTargets ? headerRowNumber : 0,
    freezeColumns: hasTargets ? 3 : 0,
    rowHeights,
    styledEmptyCellsAsBlank: true,
    materializeEmptyCellsFromRow: headerRowNumber,
    merges: [
      'A1:G1',
      ...(showIncompleteWarning ? ['A2:G2'] : []),
      ...(hasTargets ? [] : [`A${dataStartRow}:G${dataStartRow}`])
    ],
    internalHyperlinks: targets.map((target, index) => ({
      ref: `G${index + dataStartRow}`,
      targetSheet: '変更一覧',
      targetCell: `D${target.firstItemIndex + 2}`,
      tooltip: `${target.target}の明細へ移動`
    })),
    showGridLines: false,
    zoomScale: 95,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: headerRowNumber },
      repeatColumns: hasTargets ? { from: 1, to: 3 } : undefined,
      footer: '&L変更対象一覧&Rページ &P / &N'
    }
  };
}

export interface CustomerDiffCounts {
  total: number;
  added: number;
  removed: number;
  changed: number;
  moved: number;
  /** 他シートの再掲として total から除いた件数。 */
  redundant: number;
}

/** 提出用Excelの掲載件数。一括比較結果と各ブックで同じ数え方をそろえる。 */
export function summarizeCustomerDiffContext(ctx: DiffXlsxContext): CustomerDiffCounts {
  if (ctx.audience === 'internal') {
    // 内部監査版は再掲を含む全件を掲載するため、掲載件数もそのまま数える。
    const rows = summarizeCustomerRows(ctx.rows || []);
    return {
      total: rows.actual,
      added: rows.added,
      removed: rows.removed,
      changed: rows.contentChanged,
      moved: rows.moved,
      redundant: 0
    };
  }
  const items = buildCustomerDiffItems(ctx);
  const counts = summarizeCustomerItems(customerPrimaryItems(items));
  return {
    total: counts.actual,
    added: counts.added,
    removed: counts.removed,
    changed: counts.contentChanged,
    moved: counts.moved,
    redundant: items.length - counts.actual
  };
}

function summarizeCustomerItems(items: CustomerDiffItem[]) {
  const counts = { actual: 0, added: 0, removed: 0, contentChanged: 0, moved: 0 };
  for (const item of items) {
    counts.actual += 1;
    if (item.changeType === '並び順変更') counts.moved += 1;
    else if (item.changeType === '追加') counts.added += 1;
    else if (item.changeType === '削除') counts.removed += 1;
    else counts.contentChanged += 1;
  }
  return counts;
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

function customerApiDefinitionForItem(item: CustomerDiffItem): CustomerApiSheetDef {
  const path = String(item.row.path || '');
  if (item.sectionKey === 'pluginSettings'
    && /(?:^|\.)(?:config|_config)(?:$|\.|\[)/.test(path)) {
    return CUSTOMER_API_SHEET_DEF_BY_KEY.get('pluginConfig')!;
  }
  if (item.sectionKey === 'customizeSettings'
    && /(?:^|\.)(?:_body|_bodyText|_bodyHash|_bodyUnavailable)(?:$|\.|\[)/.test(path)) {
    return CUSTOMER_API_SHEET_DEF_BY_KEY.get('customizeFile')!;
  }
  return CUSTOMER_API_SHEET_DEF_BY_SECTION.get(item.sectionKey)
    || CUSTOMER_API_SHEET_DEF_BY_KEY.get('unknown')!;
}

function buildCustomerApiGroups(items: CustomerDiffItem[]): CustomerApiGroup[] {
  const grouped = new Map<string, CustomerDiffItem[]>();
  for (const item of items) {
    const definition = customerApiDefinitionForItem(item);
    const groupItems = grouped.get(definition.key) || [];
    groupItems.push(item);
    grouped.set(definition.key, groupItems);
  }
  return CUSTOMER_API_SHEET_DEFS.flatMap((definition) => {
    const groupItems = grouped.get(definition.key) || [];
    return groupItems.length ? [{ definition, items: groupItems }] : [];
  });
}

function customerApiBreakdown(groups: CustomerApiGroup[]): Array<[string, number, number, number, number, number]> {
  return groups.map((group) => {
    const counts = summarizeCustomerItems(group.items);
    const redundant = group.items.every((item) => item.redundant);
    return [
      redundant ? `${group.definition.label}（参考・再掲）` : group.definition.label,
      counts.added,
      counts.removed,
      counts.contentChanged,
      counts.moved,
      counts.actual
    ];
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
  return hasIncompleteActualDiffTruncation(truncation);
}

/** 未取得・打切りになった設定領域の名前。概要と一括比較結果で同じ文言を使う。 */
export function customerIncompleteScopeLabels(ctx: DiffXlsxContext): string[] {
  const labels: string[] = [];
  const add = (label: string) => {
    if (label && !labels.includes(label)) labels.push(label);
  };
  const push = (key: unknown) => add(customerSectionLabel(String(key || '')));
  for (const issue of ctx.fetchIssues || []) push(issue.sectionKey || issue.section);
  for (const issue of ctx.partialIssues || []) push(issue.sectionKey || issue.section);
  if (customerHasDiffTruncation(ctx.truncation)) {
    const sections = (ctx.truncation?.sections || []).filter(customerTruncationSectionIncomplete);
    if (sections.length) for (const section of sections) push(section.sectionKey || section.section);
    else add('比較対象全体');
  }
  return labels;
}

/** 「一部未完了（カテゴリ設定）」のように、未完了の理由を1行で示す。 */
export function customerIncompleteScopeSuffix(ctx: DiffXlsxContext, maxLabels = 3): string {
  const labels = customerIncompleteScopeLabels(ctx);
  if (!labels.length) return '';
  const shown = labels.slice(0, maxLabels).join('、');
  return labels.length > maxLabels ? `${shown} ほか${labels.length - maxLabels}件` : shown;
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

function buildCustomerSummarySheet(
  ctx: DiffXlsxContext,
  items: CustomerDiffItem[],
  apiGroups: CustomerApiGroup[]
): XlsxSheet {
  const primaryItems = customerPrimaryItems(items);
  const redundantItems = items.filter((item) => item.redundant);
  const counts = summarizeCustomerItems(primaryItems);
  const incomplete = customerIncomplete(ctx);
  const droppedSame = Number(ctx.truncation?.droppedSame || 0);
  const filtered = ctx.exportMode === 'filtered';
  // 未完了でも変更の有無は分かるようにする。ただし変更0件を「変更なし」と言い切らない。
  const verdict = incomplete
    ? counts.actual ? `比較未完了（確認できた範囲に変更 ${counts.actual}件）` : '比較未完了'
    : filtered
      ? counts.actual ? '絞り込み後：変更あり' : '絞り込み後：掲載対象なし'
      : counts.actual ? '変更あり' : '変更なし';
  const incompleteScopes = customerIncompleteScopeSuffix(ctx);
  const completeness = incomplete
    ? incompleteScopes ? `一部未完了（${incompleteScopes}）` : '一部未完了'
    : droppedSame > 0
      ? `正常完了（同一証跡 ${droppedSame}件を省略）`
      : '正常完了（選択範囲）';
  const redundantLabels = [...new Set(redundantItems.map((item) => customerApiDefinitionForItem(item).label))];
  const redundantNote = redundantItems.length
    ? `${redundantLabels.join('、')} の ${redundantItems.length}件（他シートと同じ変更のため件数に含めていません）`
    : 'なし';
  const sourceFullName = customerAppName(ctx.sourceBundle, '比較元のアプリ');
  const targetFullName = customerAppName(ctx.targetBundle, '比較先のアプリ');
  const sourceName = customerHeaderAppName(ctx.sourceBundle, '比較元のアプリ');
  const targetName = customerHeaderAppName(ctx.targetBundle, '比較先のアプリ');
  const navigationLabel = counts.actual
    ? '変更対象一覧を開く'
    : incomplete
      ? '比較未完了'
      : filtered
        ? '掲載対象なし'
        : '変更一覧なし';
  const comparedScopes = ctx.scopes?.length ? ctx.scopes : [...new Set(items.map((item) => item.sectionKey))];
  const rows: (string | number | null)[][] = [
    ['kintone 設定差分確認レポート', '', '', '', '', ''],
    [`比較元\n${sourceName}`, '', '→', `比較先\n${targetName}`, '', ''],
    ['比較結果', verdict, '比較処理', completeness, '', navigationLabel],
    [filtered ? '掲載変更件数' : '変更件数', `${counts.actual}件`, '比較日時', customerDateTime(ctx.comparedAt), '', ''],
    ['追加', `${counts.added}件`, '削除', `${counts.removed}件`, '変更', `${counts.contentChanged}件`],
    ['並び順変更', `${counts.moved}件`, '変更一覧の明細', `${primaryItems.length}件`, '同一証跡の省略', droppedSame ? `${droppedSame}件（変更判定への影響なし）` : '0件'],
    ['比較した設定領域', customerScopeLabel(comparedScopes), '', '', '', ''],
    ['掲載範囲', ctx.exportMode === 'filtered' ? '上記範囲内の一部' : '上記範囲内の全変更', '絞り込み', ctx.exportMode === 'filtered' ? 'あり' : 'なし', '比較から除外', customerComparisonExclusionLabel(ctx)]
  ];
  const fullAppNameRow = sourceName !== sourceFullName || targetName !== targetFullName ? rows.length : -1;
  if (fullAppNameRow >= 0) {
    rows.push(['アプリ名（全文）', `比較元：${sourceFullName}\n比較先：${targetFullName}`, '', '', '', '']);
  }
  const redundantNoteRow = redundantItems.length ? rows.length : -1;
  if (redundantNoteRow >= 0) rows.push(['参考として別シートに掲載', redundantNote, '', '', '', '']);
  const breakdownTitleRow = apiGroups.length ? rows.length : -1;
  const breakdownHeaderRow = apiGroups.length ? rows.length + 1 : -1;
  if (apiGroups.length) {
    rows.push(
      ['kintone機能別の差分件数', '', '', '', '', ''],
      ['kintone機能別シート', '追加', '削除', '変更', '並び順変更', '合計'],
      ...customerApiBreakdown(apiGroups)
    );
  }
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = rows.map(() => []);
  cellStyles[0][0] = 'title';
  cellStyles[1][0] = 'sourceGroup';
  cellStyles[1][2] = 'directionArrow';
  cellStyles[1][3] = 'targetGroup';
  cellStyles[2][0] = 'summaryLabel';
  cellStyles[2][1] = incomplete
    ? 'statusIncomplete'
    : counts.actual
      ? 'statusDifference'
      : filtered
        ? 'zebraCenter'
        : 'statusGood';
  cellStyles[2][2] = 'summaryLabel';
  cellStyles[2][3] = incomplete ? 'statusIncomplete' : 'statusGood';
  // 空欄セルも同じ塗りへそろえ、表の帯が白抜けしないようにする。
  cellStyles[2][4] = incomplete ? 'statusIncomplete' : 'statusGood';
  cellStyles[2][5] = counts.actual
    ? 'actionLink'
    : incomplete
      ? 'statusIncomplete'
      : filtered
        ? 'zebraCenter'
        : 'statusGood';
  cellStyles[3][0] = 'summaryLabel';
  cellStyles[3][1] = 'summaryValue';
  cellStyles[3][2] = 'summaryLabel';
  cellStyles[3][3] = 'info';
  cellStyles[3][4] = 'info';
  cellStyles[3][5] = 'info';
  cellStyles[4] = [
    'changeAdded', 'metricValueAdded',
    'changeRemoved', 'metricValueRemoved',
    'changeChanged', 'metricValueChanged'
  ];
  cellStyles[5][0] = 'changeMoved';
  cellStyles[5][1] = 'metricValueMoved';
  cellStyles[5][2] = 'summaryLabel';
  cellStyles[5][3] = 'zebraCenter';
  cellStyles[5][4] = 'summaryLabel';
  cellStyles[5][5] = 'zebraCenter';
  cellStyles[6][0] = 'summaryLabel';
  cellStyles[6][1] = 'info';
  cellStyles[7][0] = 'summaryLabel';
  cellStyles[7][1] = 'info';
  cellStyles[7][2] = 'summaryLabel';
  cellStyles[7][3] = 'zebraCenter';
  cellStyles[7][4] = 'summaryLabel';
  cellStyles[7][5] = 'zebraCenter';
  if (fullAppNameRow >= 0) {
    cellStyles[fullAppNameRow][0] = 'summaryLabel';
    cellStyles[fullAppNameRow][1] = 'info';
  }
  if (redundantNoteRow >= 0) {
    cellStyles[redundantNoteRow][0] = 'summaryLabel';
    cellStyles[redundantNoteRow][1] = 'info';
  }
  if (breakdownTitleRow >= 0) {
    cellStyles[breakdownTitleRow] = Array.from({ length: 6 }, () => 'sectionHeader');
    const firstDataRow = breakdownHeaderRow + 1;
    for (let index = firstDataRow; index < rows.length; index += 1) {
      const alternate = (index - firstDataRow) % 2 === 1;
      cellStyles[index][0] = 'actionLink';
      for (let column = 1; column < 6; column += 1) {
        cellStyles[index][column] = alternate ? 'zebraCenter' : 'center';
      }
    }
  }
  return {
    name: '比較概要',
    rows,
    colWidths: [24, 22, 10, 22, 16, 22],
    rowStyles: rows.map(() => 'normal'),
    cellStyles,
    headerRow: breakdownHeaderRow >= 0 ? breakdownHeaderRow + 1 : undefined,
    autoFilter: breakdownHeaderRow >= 0,
    freezeRows: 2,
    materializeEmptyCellsFromRow: 3,
    rowHeights: rows.map((row, index) => {
      if (index === 0) return 42;
      if (index === 1) return readableHeaderRowHeight([
        { value: row[0], width: 46 },
        { value: row[3], width: 60 }
      ], 42);
      if (index === 2 || index === 3) return 34;
      if (index === 4 || index === 5) return 38;
      if (index === 6) return readableDiffRowHeight([{ value: row[1], width: 72 }], 58);
      if (index === 7) return readableDiffRowHeight([
        { value: row[1], width: 22 },
        { value: row[3], width: 22 },
        { value: row[5], width: 22 }
      ], 76);
      if (index === fullAppNameRow) return readableCustomerRowHeight([
        { value: row[1], width: 92 }
      ], 395);
      if (index === redundantNoteRow) return readableDiffRowHeight([{ value: row[1], width: 72 }], 58);
      if (index === breakdownTitleRow) return 30;
      return index === breakdownHeaderRow ? 32 : 26;
    }),
    merges: [
      'A1:F1', 'A2:B2', 'D2:F2', 'D3:E3', 'B7:F7',
      ...(fullAppNameRow >= 0 ? [`B${fullAppNameRow + 1}:F${fullAppNameRow + 1}`] : []),
      ...(redundantNoteRow >= 0 ? [`B${redundantNoteRow + 1}:F${redundantNoteRow + 1}`] : []),
      ...(breakdownTitleRow >= 0 ? [`A${breakdownTitleRow + 1}:F${breakdownTitleRow + 1}`] : [])
    ],
    internalHyperlinks: breakdownHeaderRow >= 0 ? [
      ...(counts.actual ? [{
        ref: 'F3',
        targetSheet: '変更対象一覧',
        targetCell: 'A1',
        tooltip: '変更対象一覧へ移動'
      }] : []),
      ...apiGroups.map((group, index) => ({
        ref: `A${breakdownHeaderRow + 2 + index}`,
        targetSheet: group.definition.sheetName,
        targetCell: 'A1',
        tooltip: `${group.definition.label}を開く`
      }))
    ] : [],
    showGridLines: false,
    zoomScale: 100,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
      footer: '&Lkintone 設定差分確認レポート&Rページ &P / &N'
    }
  };
}

function customerComparisonValueStyles(item: CustomerDiffItem): [XlsxCellStyle, XlsxCellStyle] {
  const beforeStyle: XlsxCellStyle = item.rawBefore.state === '存在しません'
    ? 'diffAbsent'
    : item.rawBefore.state === '存在'
      ? 'changeRemoved'
      : 'diffBefore';
  const afterStyle: XlsxCellStyle = item.rawAfter.state === '存在しません'
    ? 'diffAbsent'
    : item.rawAfter.state === '存在'
      ? 'changeAdded'
      : 'diffAfter';
  return [beforeStyle, afterStyle];
}

function buildCustomerListSheet(
  ctx: DiffXlsxContext,
  allItems: CustomerDiffItem[],
  apiGroups: CustomerApiGroup[]
): XlsxSheet {
  // 再掲の差分は末尾に並んでいるため、除いても No. と設定値詳細の行番号は一致したまま。
  const items = customerPrimaryItems(allItems);
  const sourceName = customerHeaderAppName(ctx.sourceBundle, '比較元');
  const targetName = customerHeaderAppName(ctx.targetBundle, '比較先');
  const headers = [
    'No.', '変更区分', '分類', '設定対象／変更内容', '差分プロパティ',
    `変更前\n${sourceName}`, `変更後\n${targetName}`
  ];
  const rows: (string | number | null)[][] = [headers];
  const rowStyles: XlsxRowStyle[] = ['normal'];
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [[]];
  const rowHeights: number[] = [readableHeaderRowHeight([
    { value: headers[5], width: CUSTOMER_MAIN_VALUE_COLUMN_WIDTH },
    { value: headers[6], width: CUSTOMER_MAIN_VALUE_COLUMN_WIDTH }
  ], 46)];
  const changeStyles: Record<CustomerDiffItem['changeType'], XlsxCellStyle> = {
    '追加': 'changeAdded',
    '削除': 'changeRemoved',
    '変更': 'changeChanged',
    '並び順変更': 'changeMoved'
  };
  const internalHyperlinks: NonNullable<XlsxSheet['internalHyperlinks']> = [];
  const apiDefinitionByItem = new Map<CustomerDiffItem, CustomerApiSheetDef>();
  for (const group of apiGroups) {
    for (const item of group.items) apiDefinitionByItem.set(item, group.definition);
  }
  if (!items.length) {
    const emptyState: { message: string; style: XlsxCellStyle } = customerIncomplete(ctx)
      ? {
        message: '比較できなかった範囲があります。比較概要と「確認できなかった範囲」を確認してください',
        style: 'statusIncomplete'
      }
      : ctx.exportMode === 'filtered'
        ? {
          message: '現在の絞り込み条件に該当する変更はありません',
          style: 'zebraCenter'
        }
        : allItems.length
          ? {
            message: '変更一覧の掲載対象はありません（参考・再掲の差分は機能別シートを確認してください）',
            style: 'zebraCenter'
          }
          : { message: '差分はありません', style: 'statusGood' };
    const emptyMessage = emptyState.message;
    rows.push([emptyMessage, '', '', '', '', '', '']);
    rowStyles.push('normal');
    cellStyles.push(Array.from({ length: headers.length }, () => emptyState.style));
    rowHeights.push(Math.max(40, readableCustomerRowHeight([
      { value: emptyMessage, width: 129 }
    ], 120)));
  }
  items.forEach((item, index) => {
    const listTarget = customerPlainText(item.target, 48);
    const changeSummary = item.changeType === '追加'
      ? `比較先に追加：${conciseReviewValue(item.after, 32)}`
      : item.changeType === '削除'
        ? `比較先から削除：${conciseReviewValue(item.before, 32)}`
        : item.changeType === '並び順変更'
          ? '並び順を変更'
          : `${conciseReviewValue(item.before, 32)} → ${conciseReviewValue(item.after, 32)}`;
    rows.push([
      index + 1,
      item.changeType,
      item.sectionLabel,
      `${listTarget}\n${changeSummary}`,
      item.settingItem,
      item.before,
      item.after
    ]);
    rowStyles.push('normal');
    const styles: Array<XlsxCellStyle | undefined> = [];
    const alternate = index % 2 === 1;
    const [beforeStyle, afterStyle] = customerComparisonValueStyles(item);
    styles[0] = 'actionLink';
    styles[1] = changeStyles[item.changeType];
    styles[2] = 'actionLink';
    styles[3] = alternate ? 'zebra' : 'normal';
    styles[4] = alternate ? 'zebra' : 'normal';
    styles[5] = beforeStyle;
    styles[6] = afterStyle;
    cellStyles.push(styles);
    internalHyperlinks.push({
      ref: `A${index + 2}`,
      targetSheet: '設定値詳細',
      targetCell: `A${index + 2}`,
      tooltip: '比較元・比較先の原文を確認'
    });
    const apiDefinition = apiDefinitionByItem.get(item);
    if (apiDefinition) {
      internalHyperlinks.push({
        ref: `C${index + 2}`,
        targetSheet: apiDefinition.sheetName,
        targetCell: 'A1',
        tooltip: `${apiDefinition.label}を開く`
      });
    }
    rowHeights.push(readableCustomerRowHeight([
      { value: item.sectionLabel, width: 14 },
      { value: `${listTarget}\n${changeSummary}`, width: 24 },
      { value: item.settingItem, width: 22 },
      { value: item.before, width: CUSTOMER_MAIN_VALUE_COLUMN_WIDTH },
      { value: item.after, width: CUSTOMER_MAIN_VALUE_COLUMN_WIDTH }
    ], 220));
  });
  return {
    name: '変更一覧',
    rows,
    colWidths: [7, 10, 14, 24, 22, CUSTOMER_MAIN_VALUE_COLUMN_WIDTH, CUSTOMER_MAIN_VALUE_COLUMN_WIDTH],
    rowStyles,
    cellStyles,
    headerRow: 1,
    autoFilter: items.length > 0,
    freezeRows: 1,
    freezeColumns: items.length > 0 ? 5 : undefined,
    rowHeights,
    styledEmptyCellsAsBlank: true,
    materializeEmptyCellsFromRow: 1,
    merges: items.length ? undefined : ['A2:G2'],
    internalHyperlinks,
    showGridLines: false,
    zoomScale: 95,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 1 },
      repeatColumns: items.length > 0 ? { from: 1, to: 5 } : undefined,
      footer: '&L変更一覧&Rページ &P / &N'
    }
  };
}

function customerFeatureSheetTitle(ctx: DiffXlsxContext, definition: CustomerApiSheetDef): string {
  const sourceName = customerHeaderAppName(ctx.sourceBundle, '比較元のアプリ');
  const targetName = customerHeaderAppName(ctx.targetBundle, '比較先のアプリ');
  return `${definition.label}\n比較元：${sourceName}  →  比較先：${targetName}`;
}

function buildCustomerGenericApiDiffSheet(ctx: DiffXlsxContext, group: CustomerApiGroup): XlsxSheet {
  const { definition, items } = group;
  const redundantNote = items.every((item) => item.redundant)
    ? CUSTOMER_REDUNDANT_SECTION_NOTE[String(definition.sectionKey || definition.key)] || ''
    : '';
  const title = redundantNote
    ? `${customerFeatureSheetTitle(ctx, definition)}\n※ 参考・再掲：${redundantNote}変更一覧と件数には含めていません。`
    : customerFeatureSheetTitle(ctx, definition);
  const headers = ['No.', '変更区分', '設定対象', '差分プロパティ', '変更前', '変更後'];
  const rows: (string | number | null)[][] = [
    [title, '', '', '', '', ''],
    headers
  ];
  const rowStyles: XlsxRowStyle[] = ['normal', 'normal'];
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [['subtitle'], []];
  const rowHeights: number[] = [readableHeaderRowHeight([
    { value: title, width: 124 }
  ], redundantNote ? 60 : 42), 44];
  const internalHyperlinks: NonNullable<XlsxSheet['internalHyperlinks']> = [];
  const changeStyles: Record<CustomerDiffItem['changeType'], XlsxCellStyle> = {
    '追加': 'changeAdded',
    '削除': 'changeRemoved',
    '変更': 'changeChanged',
    '並び順変更': 'changeMoved'
  };

  items.forEach((item, index) => {
    const alternate = index % 2 === 1;
    const baseStyle: XlsxCellStyle = alternate ? 'zebra' : 'normal';
    const startsTarget = index === 0 || items[index - 1]?.target !== item.target;
    const target = definition.key === 'unknown'
      ? `${item.sectionLabel}\n${item.target}`
      : item.target;
    rows.push([
      item.index + 1,
      item.changeType,
      target,
      item.settingItem,
      item.before,
      item.after
    ]);
    rowStyles.push('normal');
    const [beforeStyle, afterStyle] = customerComparisonValueStyles(item);
    cellStyles.push([
      'actionLink',
      changeStyles[item.changeType],
      startsTarget ? 'category' : baseStyle,
      baseStyle,
      beforeStyle,
      afterStyle
    ]);
    rowHeights.push(readableCustomerRowHeight([
      { value: target, width: 30 },
      { value: item.settingItem, width: 24 },
      { value: item.before, width: CUSTOMER_MAIN_VALUE_COLUMN_WIDTH },
      { value: item.after, width: CUSTOMER_MAIN_VALUE_COLUMN_WIDTH }
    ], 220));
    internalHyperlinks.push({
      ref: `A${index + 3}`,
      targetSheet: '設定値詳細',
      targetCell: `A${item.index + 2}`,
      tooltip: `設定値詳細 No.${item.index + 1}を開く`
    });
  });

  return {
    name: definition.sheetName,
    rows,
    colWidths: [7, 11, 30, 24, CUSTOMER_MAIN_VALUE_COLUMN_WIDTH, CUSTOMER_MAIN_VALUE_COLUMN_WIDTH],
    rowStyles,
    cellStyles,
    headerRow: 2,
    freezeRows: 2,
    freezeColumns: 4,
    rowHeights,
    styledEmptyCellsAsBlank: true,
    materializeEmptyCellsFromRow: 2,
    merges: ['A1:F1'],
    internalHyperlinks,
    showGridLines: false,
    zoomScale: 95,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 2 },
      repeatColumns: { from: 1, to: 4 },
      footer: `&L${definition.label}&Rページ &P / &N`
    }
  };
}

function customerNamedTarget(target: string, prefixes: string[]): string {
  for (const prefix of prefixes) {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`^${escapedPrefix}「([^」]+)」`).exec(target);
    if (match) return match[1];
  }
  return target;
}

function buildCustomerViewDiffSheet(
  ctx: DiffXlsxContext,
  items: CustomerDiffItem[],
  definition: CustomerApiSheetDef
): XlsxSheet | null {
  const viewItems = [...items]
    .sort((left, right) => customerNamedTarget(left.targetDetail, ['一覧'])
      .localeCompare(customerNamedTarget(right.targetDetail, ['一覧']), 'ja')
      || left.index - right.index);
  if (!viewItems.length) return null;

  const title = customerFeatureSheetTitle(ctx, definition);
  const headers = ['No.', '変更区分', '一覧名', '差分プロパティ', '変更前', '変更後'];
  const rows: (string | number | null)[][] = [
    [title, '', '', '', '', ''],
    headers
  ];
  const rowStyles: XlsxRowStyle[] = ['normal', 'normal'];
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [['subtitle'], []];
  const rowHeights: number[] = [readableHeaderRowHeight([
    { value: title, width: 130 }
  ], 42), 44];
  const internalHyperlinks: NonNullable<XlsxSheet['internalHyperlinks']> = [];
  const changeStyles: Record<CustomerDiffItem['changeType'], XlsxCellStyle> = {
    '追加': 'changeAdded',
    '削除': 'changeRemoved',
    '変更': 'changeChanged',
    '並び順変更': 'changeMoved'
  };

  viewItems.forEach((item, index) => {
    const viewName = customerNamedTarget(item.targetDetail, ['一覧']);
    const previousName = index > 0
      ? customerNamedTarget(viewItems[index - 1].targetDetail, ['一覧'])
      : '';
    const startsTarget = index === 0 || viewName !== previousName;
    const alternate = index % 2 === 1;
    const baseStyle: XlsxCellStyle = alternate ? 'zebra' : 'normal';
    rows.push([
      item.index + 1,
      item.changeType,
      viewName,
      item.settingItem,
      item.before,
      item.after
    ]);
    rowStyles.push('normal');
    const [beforeStyle, afterStyle] = customerComparisonValueStyles(item);
    cellStyles.push([
      'actionLink',
      changeStyles[item.changeType],
      startsTarget ? 'category' : baseStyle,
      baseStyle,
      beforeStyle,
      afterStyle
    ]);
    rowHeights.push(readableCustomerRowHeight([
      { value: viewName, width: 28 },
      { value: item.settingItem, width: 24 },
      { value: item.before, width: 30 },
      { value: item.after, width: 30 }
    ], 96));
    internalHyperlinks.push({
      ref: `A${index + 3}`,
      targetSheet: '設定値詳細',
      targetCell: `A${item.index + 2}`,
      tooltip: '比較元・比較先の原文を確認'
    });
  });

  return {
    name: definition.sheetName,
    rows,
    colWidths: [7, 11, 28, 24, 30, 30],
    rowStyles,
    cellStyles,
    headerRow: 2,
    freezeRows: 2,
    freezeColumns: 4,
    rowHeights,
    materializeEmptyCellsFromRow: 2,
    merges: ['A1:F1'],
    internalHyperlinks,
    showGridLines: false,
    zoomScale: 95,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 2 },
      repeatColumns: { from: 1, to: 4 },
      footer: `&L${definition.label}&Rページ &P / &N`
    }
  };
}

function buildCustomerActionDiffSheet(
  ctx: DiffXlsxContext,
  items: CustomerDiffItem[],
  definition: CustomerApiSheetDef
): XlsxSheet | null {
  const actionItems = [...items].sort((left, right) => {
      const leftKind = left.sectionKey === 'actionSettings' ? 'アプリアクション' : 'プロセスのアクション';
      const rightKind = right.sectionKey === 'actionSettings' ? 'アプリアクション' : 'プロセスのアクション';
      return leftKind.localeCompare(rightKind, 'ja')
        || customerNamedTarget(left.targetDetail, ['アプリアクション', 'アクション'])
          .localeCompare(customerNamedTarget(right.targetDetail, ['アプリアクション', 'アクション']), 'ja')
        || left.index - right.index;
    });
  if (!actionItems.length) return null;

  const title = customerFeatureSheetTitle(ctx, definition);
  const headers = ['No.', '変更区分', 'アクション種別', 'アクション名', '差分プロパティ', '変更前', '変更後'];
  const rows: (string | number | null)[][] = [
    [title, '', '', '', '', '', ''],
    headers
  ];
  const rowStyles: XlsxRowStyle[] = ['normal', 'normal'];
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [['subtitle'], []];
  const rowHeights: number[] = [readableHeaderRowHeight([
    { value: title, width: 145 }
  ], 42), 44];
  const internalHyperlinks: NonNullable<XlsxSheet['internalHyperlinks']> = [];
  const changeStyles: Record<CustomerDiffItem['changeType'], XlsxCellStyle> = {
    '追加': 'changeAdded',
    '削除': 'changeRemoved',
    '変更': 'changeChanged',
    '並び順変更': 'changeMoved'
  };

  actionItems.forEach((item, index) => {
    const actionKind = item.sectionKey === 'actionSettings' ? 'アプリアクション' : 'プロセスのアクション';
    const actionName = customerNamedTarget(item.targetDetail, ['アプリアクション', 'アクション']);
    const previous = actionItems[index - 1];
    const previousName = previous
      ? `${previous.sectionKey}:${customerNamedTarget(previous.targetDetail, ['アプリアクション', 'アクション'])}`
      : '';
    const startsTarget = index === 0 || `${item.sectionKey}:${actionName}` !== previousName;
    const alternate = index % 2 === 1;
    const baseStyle: XlsxCellStyle = alternate ? 'zebra' : 'normal';
    rows.push([
      item.index + 1,
      item.changeType,
      actionKind,
      actionName,
      item.settingItem,
      item.before,
      item.after
    ]);
    rowStyles.push('normal');
    const [beforeStyle, afterStyle] = customerComparisonValueStyles(item);
    cellStyles.push([
      'actionLink',
      changeStyles[item.changeType],
      baseStyle,
      startsTarget ? 'category' : baseStyle,
      baseStyle,
      beforeStyle,
      afterStyle
    ]);
    rowHeights.push(readableCustomerRowHeight([
      { value: actionKind, width: 19 },
      { value: actionName, width: 28 },
      { value: item.settingItem, width: 24 },
      { value: item.before, width: 28 },
      { value: item.after, width: 28 }
    ], 96));
    internalHyperlinks.push({
      ref: `A${index + 3}`,
      targetSheet: '設定値詳細',
      targetCell: `A${item.index + 2}`,
      tooltip: '比較元・比較先の原文を確認'
    });
  });

  return {
    name: definition.sheetName,
    rows,
    colWidths: [7, 11, 19, 28, 24, 28, 28],
    rowStyles,
    cellStyles,
    headerRow: 2,
    freezeRows: 2,
    freezeColumns: 5,
    rowHeights,
    materializeEmptyCellsFromRow: 2,
    merges: ['A1:G1'],
    internalHyperlinks,
    showGridLines: false,
    zoomScale: 92,
    print: {
      orientation: 'landscape',
      fitToWidth: 1,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 2 },
      repeatColumns: { from: 1, to: 5 },
      footer: `&L${definition.label}&Rページ &P / &N`
    }
  };
}

function buildCustomerFieldDiffSheet(
  ctx: DiffXlsxContext,
  items: CustomerDiffItem[],
  definition: CustomerApiSheetDef
): XlsxSheet | null {
  const fieldItems = buildCustomerDiffItems(ctx, true)
    .filter((item) => item.sectionKey === 'fieldSettings' && !!item.field);
  if (!fieldItems.length) return null;

  const title = customerFeatureSheetTitle(ctx, definition);
  const headers = [
    'No.', '変更区分', '配置', 'フィールド名', 'フィールドコード',
    'フィールドの種類', '差分プロパティ', 'フィールド存在', '設定値存在',
    '変更前', '変更後'
  ];
  const rows: (string | number | null)[][] = [
    [title, '', '', '', '', '', '', '', '', '', ''],
    headers
  ];
  const rowStyles: XlsxRowStyle[] = ['normal', 'normal'];
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [['subtitle'], []];
  const rowHeights: number[] = [readableHeaderRowHeight([
    { value: title, width: 212 }
  ], 42), 48];
  const rowOutlines: NonNullable<XlsxSheet['rowOutlines']> = [undefined, undefined];
  const internalHyperlinks: NonNullable<XlsxSheet['internalHyperlinks']> = [];
  const changeStyles: Record<CustomerDiffItem['changeType'], XlsxCellStyle> = {
    '追加': 'changeAdded',
    '削除': 'changeRemoved',
    '変更': 'changeChanged',
    '並び順変更': 'changeMoved'
  };
  const actualIndexByRow = new Map(items.map((item, index) => [item.row, index]));

  fieldItems.forEach((item, index) => {
    const field = item.field!;
    const actualIndex = actualIndexByRow.get(item.row);
    const location = field.structure === '└ テーブル内フィールド'
      ? `テーブル「${field.parentTableName}」（コード: ${field.parentTableCode}）\n└ テーブル内フィールド`
      : field.structure;
    rows.push([
      actualIndex == null ? '' : actualIndex + 1,
      item.changeType,
      location,
      field.fieldName,
      field.fieldCode,
      field.fieldType,
      item.settingItem,
      field.fieldPresence,
      field.settingPresence,
      item.before,
      item.after
    ]);
    rowStyles.push('normal');
    rowOutlines.push(item.tableChild ? { level: 1 } : undefined);
    const alternate = index % 2 === 1;
    const baseStyle: XlsxCellStyle = alternate ? 'zebra' : 'normal';
    const [beforeStyle, afterStyle] = customerComparisonValueStyles(item);
    const styles: Array<XlsxCellStyle | undefined> = Array.from({ length: headers.length }, () => baseStyle);
    styles[0] = actualIndex == null ? (alternate ? 'zebraCenter' : 'center') : 'actionLink';
    styles[1] = changeStyles[item.changeType];
    styles[2] = field.structure === 'テーブル' ? 'category' : baseStyle;
    styles[7] = alternate ? 'zebraCenter' : 'center';
    styles[8] = alternate ? 'zebraCenter' : 'center';
    styles[9] = beforeStyle;
    styles[10] = afterStyle;
    cellStyles.push(styles);
    if (actualIndex != null) {
      internalHyperlinks.push({
        ref: `A${index + 3}`,
        targetSheet: '設定値詳細',
        targetCell: `A${actualIndex + 2}`,
        tooltip: '比較元・比較先の原文を確認'
      });
    }
    rowHeights.push(readableCustomerRowHeight([
      { value: location, width: 30 },
      { value: field.fieldName, width: 22 },
      { value: field.fieldCode, width: 22 },
      { value: field.fieldType, width: 17 },
      { value: item.settingItem, width: 22 },
      { value: item.before, width: CUSTOMER_MAIN_VALUE_COLUMN_WIDTH },
      { value: item.after, width: CUSTOMER_MAIN_VALUE_COLUMN_WIDTH }
    ], 240));
  });

  return {
    name: definition.sheetName,
    rows,
    colWidths: [7, 10, 30, 22, 22, 17, 22, 15, 15, CUSTOMER_MAIN_VALUE_COLUMN_WIDTH, CUSTOMER_MAIN_VALUE_COLUMN_WIDTH],
    rowStyles,
    cellStyles,
    headerRow: 2,
    freezeRows: 2,
    freezeColumns: 5,
    rowHeights,
    rowOutlines,
    outlineSummaryBelow: false,
    materializeEmptyCellsFromRow: 2,
    merges: ['A1:K1'],
    internalHyperlinks,
    showGridLines: false,
    zoomScale: 85,
    print: {
      orientation: 'landscape',
      fitToWidth: 2,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 2 },
      repeatColumns: { from: 1, to: 5 },
      footer: `&L${definition.label}&Rページ &P / &N`
    }
  };
}

function buildCustomerApiDiffSheets(
  ctx: DiffXlsxContext,
  groups: CustomerApiGroup[],
  items: CustomerDiffItem[]
): XlsxSheet[] {
  const sheets: XlsxSheet[] = [];
  for (const group of groups) {
    let sheet: XlsxSheet | null;
    if (group.definition.key === 'fieldSettings' && group.items.every((item) => !!item.field)) {
      sheet = buildCustomerFieldDiffSheet(ctx, items, group.definition)
        || buildCustomerGenericApiDiffSheet(ctx, group);
    } else if (group.definition.key === 'viewSettings') {
      sheet = buildCustomerViewDiffSheet(ctx, group.items, group.definition);
    } else if (group.definition.key === 'actionSettings') {
      sheet = buildCustomerActionDiffSheet(ctx, group.items, group.definition);
    } else {
      sheet = buildCustomerGenericApiDiffSheet(ctx, group);
    }
    if (sheet) sheets.push(sheet);
  }
  return sheets;
}

function buildCustomerValueDetailSheet(
  ctx: DiffXlsxContext,
  items: CustomerDiffItem[],
  continuations: CustomerDiffRawContinuation[]
): XlsxSheet | null {
  if (!items.length) return null;

  const sourceName = customerHeaderAppName(ctx.sourceBundle, '比較元');
  const targetName = customerHeaderAppName(ctx.targetBundle, '比較先');
  const continuationByKey = new Map(continuations.map((continuation) => [
    `${continuation.item.index}:${continuation.side}`,
    continuation
  ]));
  // 再掲の差分は変更一覧に行が無いので、機能別シートの該当行へ戻す。
  const redundantAnchors = new Map<CustomerDiffItem, { sheetName: string; row: number; label: string }>();
  for (const group of buildCustomerApiGroups(items)) {
    group.items.forEach((item, position) => {
      if (!item.redundant) return;
      redundantAnchors.set(item, {
        sheetName: group.definition.sheetName,
        row: position + 3,
        label: group.definition.label
      });
    });
  }
  const headers = [
    'No.', '変更区分', '分類', '設定対象', '差分プロパティ',
    `変更前の原文\n${sourceName}`, `変更後の原文\n${targetName}`, '一覧へ戻る'
  ];
  const rows: (string | number | null)[][] = [headers];
  const rowStyles: XlsxRowStyle[] = ['normal'];
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [[]];
  const rowHeights: number[] = [readableHeaderRowHeight([
    { value: headers[5], width: 42 },
    { value: headers[6], width: 42 }
  ], 52)];
  const internalHyperlinks: NonNullable<XlsxSheet['internalHyperlinks']> = [];
  const changeStyles: Record<CustomerDiffItem['changeType'], XlsxCellStyle> = {
    '追加': 'changeAdded',
    '削除': 'changeRemoved',
    '変更': 'changeChanged',
    '並び順変更': 'changeMoved'
  };

  items.forEach((item, index) => {
    const beforeContinuation = continuationByKey.get(`${item.index}:source`);
    const afterContinuation = continuationByKey.get(`${item.index}:target`);
    const beforeText = beforeContinuation
      ? `長文原文へ（${item.rawBefore.text.length}文字・${beforeContinuation.chunks.length}分割）`
      : customerRawDisplayValue(item.rawBefore);
    const afterText = afterContinuation
      ? `長文原文へ（${item.rawAfter.text.length}文字・${afterContinuation.chunks.length}分割）`
      : customerRawDisplayValue(item.rawAfter);
    const settingItemDetail = item.technicalPath
      ? `${item.settingItemDetail}\n内部パス: ${item.technicalPath}`
      : item.settingItemDetail;
    const anchor = redundantAnchors.get(item);
    rows.push([
      item.index + 1,
      item.changeType,
      item.sectionLabel,
      item.targetDetail,
      settingItemDetail,
      beforeText,
      afterText,
      anchor ? `${anchor.label}へ` : `変更一覧 No.${item.index + 1}へ`
    ]);
    rowStyles.push('normal');
    const startsCategory = index === 0 || items[index - 1]?.sectionLabel !== item.sectionLabel;
    const alternate = index % 2 === 1;
    const styles: Array<XlsxCellStyle | undefined> = [];
    styles[0] = alternate ? 'zebraCenter' : 'center';
    styles[1] = changeStyles[item.changeType];
    styles[2] = startsCategory ? 'category' : alternate ? 'zebra' : 'normal';
    styles[3] = alternate ? 'zebra' : 'normal';
    styles[4] = alternate ? 'zebra' : 'normal';
    styles[5] = beforeContinuation ? 'diffBeforeLink' : item.rawBefore.state === '存在しません' ? 'diffAbsent' : 'rawDiffBefore';
    styles[6] = afterContinuation ? 'diffAfterLink' : item.rawAfter.state === '存在しません' ? 'diffAbsent' : 'rawDiffAfter';
    styles[7] = 'actionLink';
    cellStyles.push(styles);
    rowHeights.push(readableCustomerRowHeight([
      { value: item.targetDetail, width: 24 },
      { value: settingItemDetail, width: 22 },
      { value: beforeText, width: 42 },
      { value: afterText, width: 42 }
    ], 395));
    if (beforeContinuation) {
      internalHyperlinks.push({
        ref: `F${index + 2}`,
        targetSheet: '長文原文',
        targetCell: `A${beforeContinuation.firstRow}`,
        tooltip: `No.${item.index + 1} 変更前の長文原文へ移動`
      });
    }
    if (afterContinuation) {
      internalHyperlinks.push({
        ref: `G${index + 2}`,
        targetSheet: '長文原文',
        targetCell: `A${afterContinuation.firstRow}`,
        tooltip: `No.${item.index + 1} 変更後の長文原文へ移動`
      });
    }
    internalHyperlinks.push(anchor
      ? {
        ref: `H${index + 2}`,
        targetSheet: anchor.sheetName,
        targetCell: `A${anchor.row}`,
        tooltip: `${anchor.label}の該当行へ戻る`
      }
      : {
        ref: `H${index + 2}`,
        targetSheet: '変更一覧',
        targetCell: `A${item.index + 2}`,
        tooltip: `変更一覧 No.${item.index + 1}へ戻る`
      });
  });

  return {
    name: '設定値詳細',
    rows,
    colWidths: [7, 11, 14, 24, 22, 42, 42, 18],
    rowStyles,
    cellStyles,
    headerRow: 1,
    freezeRows: 1,
    freezeColumns: 5,
    rowHeights,
    materializeEmptyCellsFromRow: 1,
    internalHyperlinks,
    showGridLines: false,
    zoomScale: 85,
    print: {
      orientation: 'landscape',
      fitToWidth: 2,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 1 },
      repeatColumns: { from: 1, to: 5 },
      footer: '&L設定値詳細（原文）&Rページ &P / &N'
    }
  };
}

function buildCustomerLongRawSheet(continuations: CustomerRawContinuation[]): XlsxSheet | null {
  if (!continuations.length) return null;

  const rows: (string | number | null)[][] = [[
    '参照', '対象', '比較側', '分割No.', '文字位置', '原文（順に連結）', '参照元へ'
  ]];
  const rowStyles: XlsxRowStyle[] = ['normal'];
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = [[]];
  const rowHeights: number[] = [42];
  const internalHyperlinks: NonNullable<XlsxSheet['internalHyperlinks']> = [];

  for (const continuation of continuations) {
    const difference = continuation.kind === 'difference' ? continuation : undefined;
    const coverage = continuation.kind === 'coverage' ? continuation : undefined;
    const raw = difference
      ? difference.side === 'source' ? difference.item.rawBefore : difference.item.rawAfter
      : coverage!.issue.raw;
    const reference = difference ? difference.item.index + 1 : `確認範囲 ${coverage!.issue.index + 1}`;
    const target = difference ? difference.item.item : coverage!.issue.sectionLabel;
    const side = difference
      ? difference.side === 'source' ? '変更前' : '変更後'
      : coverage!.issue.target;
    const returnLabel = difference
      ? `設定値詳細 No.${difference.item.index + 1}へ`
      : `確認できなかった範囲 ${coverage!.issue.index + 1}へ`;
    let offset = 0;
    continuation.chunks.forEach((chunk, chunkIndex) => {
      const start = offset + 1;
      offset += chunk.length;
      const end = offset;
      const rowNumber = rows.length + 1;
      const displayedTarget = chunkIndex === 0 ? customerPlainText(target, 120) : '同上';
      rows.push([
        reference,
        displayedTarget,
        side,
        `${chunkIndex + 1} / ${continuation.chunks.length}`,
        `${start}–${end} / ${raw.text.length}文字`,
        chunk,
        returnLabel
      ]);
      rowStyles.push('normal');
      const alternate = (rowNumber - 2) % 2 === 1;
      cellStyles.push([
        alternate ? 'zebraCenter' : 'center',
        alternate ? 'zebra' : 'normal',
        alternate ? 'zebraCenter' : 'center',
        alternate ? 'zebraCenter' : 'center',
        alternate ? 'zebraCenter' : 'center',
        difference ? difference.side === 'source' ? 'rawDiffBefore' : 'rawDiffAfter' : 'rawWarning',
        'actionLink'
      ]);
      rowHeights.push(readableCustomerRowHeight([
        { value: displayedTarget, width: 24 },
        { value: chunk, width: CUSTOMER_RAW_CHUNK_COLUMN_WIDTH }
      ], 395));
      internalHyperlinks.push({
        ref: `G${rowNumber}`,
        targetSheet: difference ? '設定値詳細' : '確認できなかった範囲',
        targetCell: `A${difference ? difference.item.index + 2 : coverage!.issue.index + 3}`,
        tooltip: `${returnLabel}戻る`
      });
    });
  }

  return {
    name: '長文原文',
    rows,
    colWidths: [7, 24, 9, 11, 20, CUSTOMER_RAW_CHUNK_COLUMN_WIDTH, 20],
    rowStyles,
    cellStyles,
    headerRow: 1,
    freezeRows: 1,
    freezeColumns: 3,
    rowHeights,
    materializeEmptyCellsFromRow: 1,
    internalHyperlinks,
    showGridLines: false,
    zoomScale: 80,
    print: {
      orientation: 'landscape',
      fitToWidth: 2,
      fitToHeight: 0,
      repeatRows: { from: 1, to: 1 },
      repeatColumns: { from: 1, to: 5 },
      footer: '&L長文原文（分割証跡）&Rページ &P / &N'
    }
  };
}

function customerIssueSide(side: unknown): string {
  if (side === 'source') return '比較元';
  if (side === 'target') return '比較先';
  if (side === 'both') return '比較元・比較先';
  return '対象範囲';
}

function buildCustomerCoverageIssueItems(ctx: DiffXlsxContext): CustomerCoverageIssueItem[] {
  const items: CustomerCoverageIssueItem[] = [];
  const add = (
    sectionLabel: string,
    target: string,
    status: string,
    explanation: string,
    rawValue: unknown
  ) => {
    const text = stringifyForDiff(rawValue);
    items.push({
      index: items.length,
      sectionLabel,
      target,
      status,
      explanation,
      raw: { state: `取得・打切り情報（${text.length}文字）`, text }
    });
  };

  for (const issue of ctx.fetchIssues || []) {
    add(
      customerSectionLabel(String(issue.sectionKey || issue.section || '')),
      customerIssueSide(issue.side),
      '取得できませんでした',
      'この範囲は比較結果に含まれていません。再取得して確認してください。',
      issue
    );
  }
  for (const issue of ctx.partialIssues || []) {
    add(
      customerSectionLabel(String(issue.sectionKey || issue.section || '')),
      customerIssueSide(issue.side),
      '一部のみ確認',
      '取得できた範囲だけを比較しています。必要に応じて再取得してください。',
      issue
    );
  }
  if (customerHasDiffTruncation(ctx.truncation)) {
    const incompleteSections = (ctx.truncation?.sections || []).filter(customerTruncationSectionIncomplete);
    const sections: DiffTruncationSection[] = incompleteSections.length
      ? incompleteSections
      : [{ section: '比較対象全体', partiallyScanned: true, scanStatus: 'partial' }];
    for (const section of sections) {
      const status = truncationScanStatusOf(section);
      add(
        customerSectionLabel(String(section.sectionKey || section.section || '')),
        '件数上限の対象',
        status === 'unscanned' ? '未確認' : status === 'partial' ? '一部のみ確認' : '表示を一部省略',
        status === 'unscanned'
          ? 'この範囲は確認できていません。条件を分けて再比較してください。'
          : status === 'partial'
            ? '確認できた件数は全体の一部です。条件を分けて再比較してください。'
            : '範囲の確認は完了していますが、表示を一部省略しています。',
        {
          truncated: ctx.truncation?.truncated,
          actualDiffIncomplete: ctx.truncation?.actualDiffIncomplete,
          diffLimit: ctx.truncation?.diffLimit,
          sameLimit: ctx.truncation?.sameLimit,
          droppedDiff: ctx.truncation?.droppedDiff,
          droppedSame: ctx.truncation?.droppedSame,
          section
        }
      );
    }
  }
  return items;
}

function buildCustomerIssueRawContinuations(
  items: CustomerCoverageIssueItem[],
  firstDataRow: number
): CustomerIssueRawContinuation[] {
  const continuations: CustomerIssueRawContinuation[] = [];
  let firstRow = firstDataRow;
  for (const issue of items) {
    if (!customerRawNeedsContinuation(issue.raw)) continue;
    const chunks = splitCustomerRawText(issue.raw.text);
    continuations.push({ kind: 'coverage', issue, chunks, firstRow });
    firstRow += chunks.length;
  }
  return continuations;
}

function buildCustomerIssuesSheet(
  items: CustomerCoverageIssueItem[],
  continuations: CustomerIssueRawContinuation[]
): XlsxSheet | null {
  if (!items.length) return null;
  const continuationByIndex = new Map(continuations.map((continuation) => [
    continuation.issue.index,
    continuation
  ]));
  const rows: (string | number | null)[][] = [
    ['このシートの範囲は比較結果に含まれていないか、一部だけ確認できています。取得・打切り情報の原文を確認してください。', '', '', '', ''],
    ['分類', '対象', '確認状態', '説明', '取得・打切り情報（原文）']
  ];
  const internalHyperlinks: NonNullable<XlsxSheet['internalHyperlinks']> = [];
  items.forEach((item, index) => {
    const continuation = continuationByIndex.get(item.index);
    rows.push([
      item.sectionLabel,
      item.target,
      item.status,
      item.explanation,
      continuation
        ? `長文原文へ（${item.raw.text.length}文字・${continuation.chunks.length}分割）`
        : item.raw.text
    ]);
    if (continuation) {
      internalHyperlinks.push({
        ref: `E${index + 3}`,
        targetSheet: '長文原文',
        targetCell: `A${continuation.firstRow}`,
        tooltip: `確認できなかった範囲 ${index + 1} の長文原文へ移動`
      });
    }
  });
  const cellStyles: Array<Array<XlsxCellStyle | undefined>> = rows.map((row, index) => {
    if (index === 0) return ['warning'];
    if (index === 1) return [];
    const alternate = (index - 2) % 2 === 1;
    const baseStyle: XlsxCellStyle = alternate ? 'zebra' : 'normal';
    return [baseStyle, baseStyle, incompleteIssueStatusStyle(row[2]), baseStyle, baseStyle];
  });
  items.forEach((item, index) => {
    if (continuationByIndex.has(item.index)) {
      cellStyles[index + 2][4] = incompleteIssueStatusStyle(item.status) === 'statusError'
        ? 'warningLink'
        : 'actionLink';
    }
  });
  return {
    name: '確認できなかった範囲',
    rows,
    colWidths: [24, 20, 22, 52, 56],
    rowStyles: rows.map(() => 'normal'),
    cellStyles,
    headerRow: 2,
    freezeRows: 2,
    freezeColumns: 2,
    materializeEmptyCellsFromRow: 2,
    rowHeights: rows.map((row, index) => index < 2 ? (index === 0 ? 36 : 30) : readableCustomerRowHeight([
      { value: row[0], width: 24 },
      { value: row[1], width: 20 },
      { value: row[2], width: 22 },
      { value: row[3], width: 52 },
      { value: row[4], width: 56 }
    ], 96)),
    merges: ['A1:E1'],
    internalHyperlinks,
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
  const apiGroups = buildCustomerApiGroups(items);
  const differenceContinuations = buildCustomerRawContinuations(items);
  const issueItems = buildCustomerCoverageIssueItems(ctx);
  const nextLongRawRow = differenceContinuations.reduce(
    (nextRow, continuation) => Math.max(nextRow, continuation.firstRow + continuation.chunks.length),
    2
  );
  const issueContinuations = buildCustomerIssueRawContinuations(issueItems, nextLongRawRow);
  const allContinuations: CustomerRawContinuation[] = [...differenceContinuations, ...issueContinuations];
  const sheets: XlsxSheet[] = [buildCustomerSummarySheet(ctx, items, apiGroups)];
  const issues = buildCustomerIssuesSheet(issueItems, issueContinuations);
  if (issues) sheets.push(issues);
  sheets.push(buildCustomerCoarseTargetSheet(ctx, items));
  sheets.push(buildCustomerListSheet(ctx, items, apiGroups));
  sheets.push(...buildCustomerApiDiffSheets(ctx, apiGroups, items));
  const valueDetails = buildCustomerValueDetailSheet(ctx, items, differenceContinuations);
  if (valueDetails) sheets.push(valueDetails);
  const longRaw = buildCustomerLongRawSheet(allContinuations);
  if (longRaw) sheets.push(longRaw);
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
  // 取得状態に問題があるときは先に注意事項を読み、その後に対象単位の索引で
  // 「どの業務対象が変わったか」を短時間で把握できる読み順にする。
  sheets.push(buildCoarseTargetSheet(ctx, fieldModel, differenceRefs));
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
    fieldModel,
    ctx
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

const XLSX_FILENAME_EXTENSION = '.xlsx';
const XLSX_FILENAME_MAX_UTF16_LENGTH = 180;
const XLSX_FILENAME_BIDI_CONTROLS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u206F]/g;

function removeLoneSurrogates(value: string): string {
  let output = '';
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        output += value[index] + value[index + 1];
        index += 1;
      } else {
        output += ' ';
      }
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      output += ' ';
    } else {
      output += value[index];
    }
  }
  return output;
}

function cleanXlsxFilenameText(value: unknown): string {
  return removeLoneSurrogates(String(value ?? ''))
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(XLSX_FILENAME_BIDI_CONTROLS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[ .]+$/g, '');
}

function boundedXlsxFilenamePart(value: unknown, maxUtf16Length: number): string {
  const cleaned = cleanXlsxFilenameText(value);
  if (cleaned.length <= maxUtf16Length) return cleaned;
  if (maxUtf16Length <= 1) return '…';
  return `${graphemePrefixWithinUtf16(cleaned, maxUtf16Length - 1).replace(/[ .]+$/g, '')}…`;
}

function boundedAppFilenameLabel(bundle: DiffXlsxBundle | undefined, appName: string): string {
  const id = boundedXlsxFilenamePart(bundle?.appId, 16);
  const name = boundedXlsxFilenamePart(appName, 40);
  return buildAppFilenameLabel(id, name);
}

function safeXlsxFilename(value: unknown, fallback: string): string {
  let stem = cleanXlsxFilenameText(value).replace(/\.xlsx$/i, '').replace(/[ .]+$/g, '');
  const timestampMatch = /(_\d{8}_\d{6})$/.exec(stem);
  const timestampSuffix = timestampMatch?.[1] || '';
  if (timestampSuffix) stem = stem.slice(0, -timestampSuffix.length).replace(/[ .]+$/g, '');

  const fallbackStem = cleanXlsxFilenameText(fallback).replace(/\.xlsx$/i, '') || '出力';
  if (!stem) stem = fallbackStem;
  if (/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(stem)) stem = `_${stem}`;

  const available = XLSX_FILENAME_MAX_UTF16_LENGTH
    - XLSX_FILENAME_EXTENSION.length
    - timestampSuffix.length;
  let boundedStem = graphemePrefixWithinUtf16(stem, available).replace(/[ .]+$/g, '');
  if (!boundedStem) {
    boundedStem = graphemePrefixWithinUtf16(fallbackStem, available).replace(/[ .]+$/g, '') || '出力';
  }
  return `${boundedStem}${timestampSuffix}${XLSX_FILENAME_EXTENSION}`;
}

export function buildDiffXlsxExport(ctx: DiffXlsxContext): { filename: string; blob: Blob } {
  const blob = buildDiffXlsxBlob(ctx);
  if (String(ctx.filename || '').trim()) {
    return {
      filename: safeXlsxFilename(ctx.filename, ctx.audience === 'internal' ? '差分一覧' : '設定差分確認'),
      blob
    };
  }
  if (ctx.audience !== 'internal') {
    const source = boundedAppFilenameLabel(ctx.sourceBundle, customerAppName(ctx.sourceBundle, '比較元'));
    const target = boundedAppFilenameLabel(ctx.targetBundle, customerAppName(ctx.targetBundle, '比較先'));
    const pairLabel = [source, target].filter(Boolean).join('_vs_');
    return {
      filename: safeXlsxFilename(
        buildExportFilename('設定差分確認', 'xlsx', { appLabel: pairLabel }),
        '設定差分確認'
      ),
      blob
    };
  }
  const srcName = extractAppNameFromBundle(ctx.sourceBundle);
  const tgtName = extractAppNameFromBundle(ctx.targetBundle);
  const src = boundedAppFilenameLabel(ctx.sourceBundle, srcName);
  const tgt = boundedAppFilenameLabel(ctx.targetBundle, tgtName);
  const pairLabel = src && tgt ? `${src}_vs_${tgt}` : (src || tgt || '');
  const filename = safeXlsxFilename(
    buildExportFilename('差分一覧', 'xlsx', { appLabel: pairLabel }),
    '差分一覧'
  );
  return { filename, blob };
}

export function runExportDiffXlsx(ctx: DiffXlsxContext): { filename: string; blob: Blob } {
  const result = buildDiffXlsxExport(ctx);
  downloadBlob(result.filename, result.blob);
  return result;
}
