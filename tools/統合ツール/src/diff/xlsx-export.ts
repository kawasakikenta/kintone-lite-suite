'use strict';

import { SECTION_DEFS } from '../constants.js';
import {
  downloadBlob,
  buildExportFilename,
  buildAppFilenameLabel,
  extractAppNameFromBundle,
  getSeverityDisplayLabel,
  getIssueSideLabel
} from '../utils.js';
import { stringifyRowValueForDiff, getDiffExportContentLabel } from './export.js';
import {
  isSensitiveSameDiffRow,
  SENSITIVE_DIFF_SECTION_KEYS,
  SENSITIVE_SAME_VALUE_REDACTION
} from './export-safety.js';
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

function rowItemLabel(row: DiffXlsxRow): string {
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

function buildSummarySheet(ctx: DiffXlsxContext, grouped: Map<string, DiffXlsxRow[]>): XlsxSheet {
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
    ['使い方', '「差分一覧」の黄色い3列に確認状態・担当者・コメントを記入し、フィルタで絞り込めます。確認状態の初期値は「未確認」です。', '', ''],
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
  for (const rowIndex of [11, 19]) cellStyles[rowIndex][0] = 'sectionHeader';
  cellStyles[20] = ['sectionHeader', 'sectionHeader', 'sectionHeader', 'sectionHeader'];
  const merges = ['A1:D1', 'A2:D2', 'A12:D12', 'A20:D20'];
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
  const identity = [
    row.sectionKey || row.section || '',
    row.type || '',
    row.path || '',
    row.label || '',
    row.moved ? 'moved' : ''
  ].join('\u001f');
  const base = `D-${shortStableHash(identity)}`;
  const occurrence = (seen.get(base) || 0) + 1;
  seen.set(base, occurrence);
  return occurrence === 1 ? base : `${base}-${occurrence}`;
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
  targetBundle?: DiffXlsxBundle
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
  for (const row of rows) {
    const sourceValue = rowValue(row, 'source');
    const targetValue = rowValue(row, 'target');
    const note = rowNote(row);
    out.push([
      stableDifferenceId(row, seenIds),
      getSeverityDisplayLabel(row.severity || 'low'),
      rowTypeLabel(row),
      sectionLabelOf(row.sectionKey || row.section || ''),
      rowItemLabel(row),
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
      rowItemLabel(row),
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
  const sheets: XlsxSheet[] = [
    buildSummarySheet(ctx, grouped),
    buildListSheet(rows, '差分一覧', ctx.sourceBundle, ctx.targetBundle)
  ];
  for (const [key, list] of grouped) {
    sheets.push(buildSectionSheet(sectionLabelOf(key), list, ctx.sourceBundle, ctx.targetBundle));
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
