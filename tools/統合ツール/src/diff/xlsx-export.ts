'use strict';

import { SECTION_DEFS } from '../constants.js';
import {
  downloadBlob,
  buildExportFilename,
  buildAppFilenameLabel,
  getDiffTypeDisplayLabel,
  getSeverityDisplayLabel,
  getIssueSideLabel
} from '../utils.js';
import { stringifyRowValueForDiff, getDiffExportContentLabel } from './export.js';
import { buildXlsxBlob, type XlsxSheet } from './xlsx-builder.js';

export interface DiffXlsxRow {
  sectionKey?: string;
  type: string;
  severity?: string;
  path?: string;
  label?: string;
  left?: unknown;
  right?: unknown;
  moved?: boolean;
}

export interface DiffXlsxFetchIssue {
  sectionKey?: string;
  side?: string;
  message?: string;
}

export interface DiffXlsxContext {
  rows: DiffXlsxRow[];
  fetchIssues?: DiffXlsxFetchIssue[];
  sourceBundle?: { appId?: string | number; guestId?: string; preview?: boolean; meta?: { appName?: string } };
  targetBundle?: { appId?: string | number; guestId?: string; preview?: boolean; meta?: { appName?: string } };
  ignoreKeys?: string;
  exportContentMode?: string;
  filename?: string;
}

const SECTION_LABEL_BY_KEY = new Map(SECTION_DEFS.map((d) => [d.key, d.label]));
const SECTION_ORDER_BY_KEY = new Map(SECTION_DEFS.map((d, i) => [d.key, i]));

function sectionLabelOf(key: string): string {
  return SECTION_LABEL_BY_KEY.get(key) || key || '(未分類)';
}

function groupRowsBySection(rows: DiffXlsxRow[]): Map<string, DiffXlsxRow[]> {
  const map = new Map<string, DiffXlsxRow[]>();
  for (const r of rows) {
    const key = r.sectionKey || '(その他)';
    let list = map.get(key);
    if (!list) { list = []; map.set(key, list); }
    list.push(r);
  }
  // 既知セクションは SECTION_DEFS の順、未知は末尾。Map の挿入順を再構築する。
  const ordered = new Map<string, DiffXlsxRow[]>();
  const known = [...map.keys()].filter((k) => SECTION_ORDER_BY_KEY.has(k))
    .sort((a, b) => (SECTION_ORDER_BY_KEY.get(a)! - SECTION_ORDER_BY_KEY.get(b)!));
  const unknown = [...map.keys()].filter((k) => !SECTION_ORDER_BY_KEY.has(k));
  for (const k of [...known, ...unknown]) ordered.set(k, map.get(k)!);
  return ordered;
}

function appLabel(bundle?: DiffXlsxContext['sourceBundle']): string {
  if (!bundle) return '';
  const name = bundle.meta?.appName ? String(bundle.meta.appName) : '';
  const id = bundle.appId != null ? String(bundle.appId) : '';
  if (name && id) return `${name} (App ${id})`;
  return name || (id ? `App ${id}` : '');
}

const HEADER = ['種別', '重要度', 'パス', '項目', '比較元 (旧)', '比較先 (新)'];
const COL_WIDTHS = [10, 8, 38, 28, 48, 48];

function buildSummarySheet(ctx: DiffXlsxContext, grouped: Map<string, DiffXlsxRow[]>): XlsxSheet {
  const rows: DiffXlsxRow[] = ctx.rows || [];
  const issues = ctx.fetchIssues || [];
  const typeCounts: Record<string, number> = { added: 0, removed: 0, changed: 0, moved: 0, same: 0 };
  const sevCounts: Record<string, number> = { high: 0, medium: 0, low: 0 };
  for (const r of rows) {
    if (typeCounts[r.type] != null) typeCounts[r.type] += 1;
    const sev = String(r.severity || '').toLowerCase();
    if (sevCounts[sev] != null) sevCounts[sev] += 1;
  }
  const diffCount = typeCounts.added + typeCounts.removed + typeCounts.changed + typeCounts.moved;

  const sheet: XlsxSheet = {
    name: '概要',
    autoFilter: false,
    freezeHeader: false,
    colWidths: [22, 60],
    rows: [
      ['項目', '値'],
      ['生成日時', new Date().toISOString()],
      ['比較元アプリ', appLabel(ctx.sourceBundle)],
      ['比較元ゲストID', String(ctx.sourceBundle?.guestId || '')],
      ['比較元プレビュー', ctx.sourceBundle?.preview ? 'はい' : 'いいえ'],
      ['比較先アプリ', appLabel(ctx.targetBundle)],
      ['比較先ゲストID', String(ctx.targetBundle?.guestId || '')],
      ['比較先プレビュー', ctx.targetBundle?.preview ? 'はい' : 'いいえ'],
      ['出力内容', getDiffExportContentLabel(ctx.exportContentMode || 'diffOnly')],
      ['無視キー', String(ctx.ignoreKeys || '')],
      ['', ''],
      ['集計', '件数'],
      ['全行数', String(rows.length)],
      ['差分件数 (追加/削除/変更/移動)', String(diffCount)],
      ['  追加', String(typeCounts.added)],
      ['  削除', String(typeCounts.removed)],
      ['  変更', String(typeCounts.changed)],
      ['  移動', String(typeCounts.moved)],
      ['  同一', String(typeCounts.same)],
      ['重要度: 高', String(sevCounts.high)],
      ['重要度: 中', String(sevCounts.medium)],
      ['重要度: 低', String(sevCounts.low)],
      ['取得時の問題', String(issues.length)],
      ['', ''],
      ['セクション', '件数']
    ]
  };
  for (const [key, list] of grouped) {
    sheet.rows.push([sectionLabelOf(key), String(list.length)]);
  }
  return sheet;
}

function buildSectionSheet(label: string, list: DiffXlsxRow[]): XlsxSheet {
  const rows: (string | number | null)[][] = [HEADER];
  for (const r of list) {
    const type = getDiffTypeDisplayLabel(r.type, { moved: !!r.moved });
    const sev = getSeverityDisplayLabel(r.severity || 'low');
    const left = r.left === undefined || r.type === 'added' ? '' : stringifyRowValueForDiff(r.left, r.path);
    const right = r.right === undefined || r.type === 'removed' ? '' : stringifyRowValueForDiff(r.right, r.path);
    rows.push([type, sev, r.path || '', r.label || '', left, right]);
  }
  return { name: label, rows, colWidths: COL_WIDTHS };
}

function buildIssuesSheet(issues: DiffXlsxFetchIssue[]): XlsxSheet {
  const rows: (string | number | null)[][] = [['セクション', '対象', 'メッセージ']];
  for (const i of issues) {
    rows.push([sectionLabelOf(i.sectionKey || ''), getIssueSideLabel(i.side || ''), String(i.message || '')]);
  }
  return { name: '取得時の問題', rows, colWidths: [22, 12, 80] };
}

export function buildDiffXlsxBlob(ctx: DiffXlsxContext): Blob {
  const rows = ctx.rows || [];
  const issues = ctx.fetchIssues || [];
  if (!rows.length && !issues.length) throw new Error('出力できる比較結果がありません');

  const grouped = groupRowsBySection(rows);
  const sheets: XlsxSheet[] = [buildSummarySheet(ctx, grouped)];
  for (const [key, list] of grouped) {
    sheets.push(buildSectionSheet(sectionLabelOf(key), list));
  }
  if (issues.length) sheets.push(buildIssuesSheet(issues));
  return buildXlsxBlob(sheets);
}

export function runExportDiffXlsx(ctx: DiffXlsxContext): void {
  const blob = buildDiffXlsxBlob(ctx);
  const src = buildAppFilenameLabel(ctx.sourceBundle?.appId, ctx.sourceBundle?.meta?.appName);
  const tgt = buildAppFilenameLabel(ctx.targetBundle?.appId, ctx.targetBundle?.meta?.appName);
  const pairLabel = src && tgt ? `${src}_vs_${tgt}` : (src || tgt || '');
  const filename = ctx.filename || buildExportFilename('差分', 'xlsx', { appLabel: pairLabel });
  downloadBlob(filename, blob);
}
