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
import { decodeRow } from './path-decoder.js';
import { buildXlsxBlob, type XlsxRowStyle, type XlsxSheet } from './xlsx-builder.js';

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
  sections?: Array<{ sectionKey?: string; section?: string; droppedDiff?: number; droppedSame?: number }>;
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
const SENSITIVE_SECTION_KEYS = new Set(['customizeSettings', 'pluginSettings']);
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

function rowValue(row: DiffXlsxRow, side: 'source' | 'target'): string {
  if (side === 'source' && (row.left === undefined || row.type === 'added')) return '';
  if (side === 'target' && (row.right === undefined || row.type === 'removed')) return '';
  return stringifyRowValueForDiff(side === 'source' ? row.left : row.right, row.path);
}

function summarizeRows(rows: DiffXlsxRow[]) {
  const counts = { actual: 0, added: 0, removed: 0, changed: 0, moved: 0, same: 0, reference: 0 };
  for (const row of rows) {
    if (row._displayOnly) { counts.reference += 1; continue; }
    if (row.type === 'same') { counts.same += 1; continue; }
    counts.actual += 1;
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
  const sensitiveSections = [...new Set(rows
    .filter((row) => !row._displayOnly && row.type !== 'same' && SENSITIVE_SECTION_KEYS.has(String(row.sectionKey || '')))
    .map((row) => sectionLabelOf(String(row.sectionKey || ''))))];

  const sheetRows: (string | number | null)[][] = [
    ['項目', '値'],
    ['判定', verdict],
    ['比較方向', '比較元 → 比較先'],
    ['生成日時', ctx.generatedAt || new Date().toISOString()],
    ['比較日時', ctx.comparedAt == null || ctx.comparedAt === '' ? '未記録' : String(ctx.comparedAt)],
    ['比較元', appLabel(ctx.sourceBundle)],
    ['比較元の環境', `${ctx.sourceBundle?.guestId ? `ゲスト ${ctx.sourceBundle.guestId}` : '通常スペース'} / ${ctx.sourceBundle?.preview ? 'プレビュー' : '運用'}設定`],
    ['比較先', appLabel(ctx.targetBundle)],
    ['比較先の環境', `${ctx.targetBundle?.guestId ? `ゲスト ${ctx.targetBundle.guestId}` : '通常スペース'} / ${ctx.targetBundle?.preview ? 'プレビュー' : '運用'}設定`],
    ['出力範囲', ctx.exportLabel || (ctx.exportMode === 'filtered' ? '表示中（フィルタ適用後）' : '全件')],
    ['比較対象', scopeLabel(ctx.scopes)],
    ['出力内容', getDiffExportContentLabel(ctx.exportContentMode || 'diffOnly')],
    ['無視キー', String(ctx.ignoreKeys || '')],
    ['正規化設定', normalizationLabel(ctx.normalizationPresetState)],
    ['', ''],
    ['集計', '件数'],
    ['差分件数', counts.actual],
    ['  追加（比較先のみ）', counts.added],
    ['  削除（比較元のみ）', counts.removed],
    ['  変更', counts.changed],
    ['  移動（変更の内数）', counts.moved],
    ['同一', counts.same],
    ['参考行（件数外）', counts.reference],
    ['取得失敗', fetchIssues.length],
    ['一部未検証', partialIssues.length],
    ['', ''],
    ['セクション', '一覧行数']
  ];
  for (const [key, list] of grouped) sheetRows.push([sectionLabelOf(key), list.length]);
  if (truncation) {
    sheetRows.push(['⚠ 件数上限', `差分上限 ${truncation.diffLimit || '-'} 件に到達。未収録の差分があるため、このブックだけで反映判断をしないでください。`]);
  }
  if (partialIssues.length) {
    sheetRows.push(['⚠ 一部未検証', `${partialIssues.length} 件。JS/CSS等の本文を取得できず、代替情報で比較した項目があります。`]);
  }
  if (fetchIssues.length) {
    sheetRows.push(['⚠ 取得失敗', `${fetchIssues.length} 件。該当セクションは比較できていません。`]);
  }
  if (sensitiveSections.length) {
    sheetRows.push(['🔒 取扱注意', `${sensitiveSections.join('・')} の差分値が含まれます。共有先と保管場所を確認してください。`]);
  }

  const rowStyles: XlsxRowStyle[] = sheetRows.map(() => 'normal');
  sheetRows.forEach((row, index) => {
    if (index > 0 && /^⚠|^🔒/.test(String(row[0] || ''))) rowStyles[index] = 'warning';
  });
  return { name: '概要', autoFilter: false, freezeHeader: false, colWidths: [24, 72], rows: sheetRows, rowStyles };
}

const LIST_HEADER = ['種別', 'セクション', '重要度', '項目', 'パス', '比較元の値', '比較先の値', '確認ポイント'];
const LIST_COL_WIDTHS = [18, 20, 8, 32, 42, 48, 48, 36];

function buildListSheet(rows: DiffXlsxRow[], name = '差分一覧'): XlsxSheet {
  const out: (string | number | null)[][] = [LIST_HEADER];
  const rowStyles: XlsxRowStyle[] = ['normal'];
  for (const row of rows) {
    out.push([
      rowTypeLabel(row),
      sectionLabelOf(row.sectionKey || row.section || ''),
      getSeverityDisplayLabel(row.severity || 'low'),
      rowItemLabel(row),
      row.path || '',
      rowValue(row, 'source'),
      rowValue(row, 'target'),
      rowNote(row)
    ]);
    rowStyles.push(rowStyleOf(row));
  }
  return { name, rows: out, colWidths: LIST_COL_WIDTHS, rowStyles };
}

function buildSectionSheet(label: string, list: DiffXlsxRow[]): XlsxSheet {
  const sheet = buildListSheet(list, label);
  sheet.rows = sheet.rows.map((row) => [row[0], row[2], row[3], row[4], row[5], row[6], row[7]]);
  sheet.rows[0] = ['種別', '重要度', '項目', 'パス', '比較元の値', '比較先の値', '確認ポイント'];
  sheet.colWidths = [18, 8, 32, 42, 48, 48, 36];
  return sheet;
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
    const sections = truncation.sections?.length ? truncation.sections : [{ sectionKey: '', section: '全体' }];
    for (const section of sections) {
      const omitted = [`差分 ${Number(section.droppedDiff || 0)}件以上`, `同一 ${Number(section.droppedSame || 0)}件以上`].join(' / ');
      rows.push(['件数上限', sectionLabelOf(section.sectionKey || section.section || '全体'), '両方', `差分上限 ${truncation.diffLimit || '-'} 件に到達し、比較結果は不完全です`, omitted]);
    }
  }
  return { name: '取得・未検証', rows, colWidths: [14, 22, 12, 72, 60], rowStyles: rows.map((_, index) => index === 0 ? 'normal' : 'warning') };
}

export function buildDiffXlsxSheets(ctx: DiffXlsxContext): XlsxSheet[] {
  const rows = ctx.rows || [];
  const grouped = groupRowsBySection(rows);
  const sheets: XlsxSheet[] = [buildSummarySheet(ctx, grouped), buildListSheet(rows)];
  for (const [key, list] of grouped) sheets.push(buildSectionSheet(sectionLabelOf(key), list));
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
