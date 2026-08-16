'use strict';

import { SECTION_DEFS } from '../constants.js';
import { buildCharDiffHtml, stringifyRowValueForDiff } from '../diff/export.js';
import { runExportDiffXlsx, type DiffXlsxContext } from '../diff/xlsx-export.js';
import { decodeRow, type DecodedRow } from '../diff/path-decoder.js';
import { esc, extractAppNameFromBundle } from '../utils.js';
import { runExportDiffHtmlStandalone } from '../tabs/diff-export-standalone.js';
import {
  createLitePanel,
  makeRow,
  makeInput,
  makeButton,
  makeCheck,
  makeChip,
  makeTextarea,
  makeSelect,
  makeCard,
  makeDetails,
  makeNote,
  liteRun,
  type LitePanelHandle
} from './litePanelTheme.js';
import { createAppSearchControl } from './appSearchControl.js';
import { readSettingsBundleFile } from '../settingsBundleImport.js';

const SCOPE_OPTS: Array<[string, string, boolean]> = [
  ['fieldSettings', 'フィールド', true],
  ['layoutSettings', 'レイアウト', true],
  ['viewSettings', 'ビュー', true],
  ['reportSettings', 'グラフ', false],
  ['processSettings', 'プロセス', true],
  ['appSettings', 'アプリ設定', false],
  ['formSettings', 'フォーム', false],
  ['customizeSettings', 'JS/CSS', false],
  ['pluginSettings', 'プラグイン', false],
  ['actionSettings', 'アクション', false],
  ['appAcl', 'アプリ権限', false],
  ['fieldAcl', 'フィールド権限', false],
  ['recordPermissions', 'レコード権限', false],
  ['notifications', '通知', false],
  ['perRecordNotifications', 'レコード条件通知', false],
  ['reminderNotifications', 'リマインダー', false],
  ['categories', 'カテゴリ', false]
];

const TYPE_LABEL: Record<string, string> = { added: '追加', removed: '削除', changed: '変更', moved: '移動', same: '同一' };
const RESULT_PAGE_SIZE = 200;
const XLSX_EXPORT_COOLDOWN_MS = 400;

const RESULT_CSS_ID = 'kus-diff-lite-result-styles';
const RESULT_CSS = `
.kus-dl-result{font:12px/1.5 ui-monospace,Menlo,monospace;color:#0f172a}
.kus-dl-overview{font-family:-apple-system,Segoe UI,sans-serif;border:1px solid #cbd5e1;border-radius:10px;background:#fff;margin-bottom:10px;overflow:hidden}
.kus-dl-overview__direction{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.kus-dl-side{min-width:0}
.kus-dl-side--target{text-align:right}
.kus-dl-side__role{display:block;color:#64748b;font-size:10px;font-weight:700;letter-spacing:.04em}
.kus-dl-side__name{display:block;color:#0f172a;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-dl-side__env{display:block;color:#64748b;font-size:10px}
.kus-dl-overview__arrow{color:#2563eb;font-size:18px;font-weight:800}
.kus-dl-verdict{padding:10px 12px;border-bottom:1px solid #e2e8f0;background:#eff6ff;color:#1e3a8a}
.kus-dl-verdict--same{background:#f0fdf4;color:#166534}
.kus-dl-verdict--warn{background:#fff7ed;color:#9a3412}
.kus-dl-verdict strong{display:block;font-size:13px;margin-bottom:2px}
.kus-dl-verdict span{font-size:11px;line-height:1.55}
.kus-dl-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;padding:10px 12px}
.kus-dl-metric{appearance:none;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;color:#334155;padding:7px 5px;text-align:center;font:inherit}
button.kus-dl-metric{cursor:pointer}
button.kus-dl-metric:hover{border-color:#93c5fd;background:#eff6ff}
.kus-dl-metric__num{display:block;color:#0f172a;font-size:15px;font-weight:800;font-variant-numeric:tabular-nums}
.kus-dl-metric__label{display:block;font-size:10px;font-weight:700}
.kus-dl-metric__hint{display:block;color:#64748b;font-size:9px;font-weight:400}
.kus-dl-section-nav{display:flex;flex-wrap:wrap;gap:5px;padding:0 12px 10px}
.kus-dl-section-nav__label{width:100%;color:#64748b;font-size:10px;font-weight:700}
.kus-dl-section-jump{border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#334155;padding:3px 8px;font:600 10.5px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer}
.kus-dl-section-jump:hover{border-color:#60a5fa;background:#eff6ff;color:#1d4ed8}
.kus-dl-alert{margin:0 12px 10px;padding:8px 10px;border:1px solid #fdba74;border-radius:7px;background:#fff7ed;color:#9a3412;font:600 11px/1.55 -apple-system,Segoe UI,sans-serif}
.kus-dl-legend{padding:0 12px 10px;color:#64748b;font:10.5px/1.5 -apple-system,Segoe UI,sans-serif}
.kus-dl-result__summary{margin:0 0 6px;font-family:-apple-system,Segoe UI,sans-serif;font-size:11.5px;color:#475569;display:flex;flex-wrap:wrap;gap:6px 12px}
.kus-dl-colheads{position:sticky;top:0;z-index:2;display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;padding:6px;background:#e2e8f0;border:1px solid #cbd5e1;border-radius:8px;font:700 11px/1.4 -apple-system,Segoe UI,sans-serif;color:#334155}
.kus-dl-colheads>span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-dl-colheads>span:last-child{text-align:right}
.kus-dl-result__summary strong{color:#0f172a}
.kus-dl-section{border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;overflow:hidden;background:#fff}
.kus-dl-section>summary{padding:6px 10px;background:#f8fafc;font:600 12px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:8px}
.kus-dl-section>summary::-webkit-details-marker{display:none}
.kus-dl-section>summary::before{content:"▸";display:inline-block;margin-right:6px;color:#64748b;transition:transform .15s}
.kus-dl-section[open]>summary::before{transform:rotate(90deg)}
.kus-dl-section__count{color:#64748b;font-weight:400}
.kus-dl-section__breakdown{margin-left:auto;color:#475569;font-size:10px;font-weight:500;white-space:nowrap}
.kus-dl-section__body{padding:6px}
.kus-dl-row{border-bottom:1px solid #f1f5f9;padding:6px 8px;font-family:-apple-system,Segoe UI,sans-serif;font-size:11.5px}
.kus-dl-row:last-child{border-bottom:none}
.kus-dl-row__head{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:4px}
.kus-dl-row__path{font-family:ui-monospace,Menlo,monospace;color:#334155;word-break:break-all;flex:1;min-width:120px}
.kus-dl-row__title{color:#0f172a;font-weight:700;flex:1;min-width:160px}
.kus-dl-row__context{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:0 0 5px 30px;color:#64748b}
.kus-dl-row__chip{display:inline-flex;align-items:center;border-radius:999px;background:#e2e8f0;color:#334155;padding:1px 6px;font-size:10px}
.kus-dl-row__raw{font:9.5px/1.4 ui-monospace,Menlo,monospace;color:#64748b;word-break:break-all}
.kus-dl-row__cols{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-family:ui-monospace,Menlo,monospace;font-size:11px}
.kus-dl-pre{margin:0;padding:6px 8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow:auto}
.kus-dl-pre.del{background:#fef2f2;border-color:#fecaca;color:#7f1d1d}
.kus-dl-pre.add{background:#f0fdf4;border-color:#bbf7d0;color:#14532d}
.kus-dl-pre.empty{color:#64748b;font-style:italic}
.kus-dl-badge{display:inline-block;padding:1px 6px;border-radius:4px;font:600 10.5px/1.4 -apple-system,Segoe UI,sans-serif;letter-spacing:.02em}
.kus-dl-badge--added{background:#dcfce7;color:#166534}
.kus-dl-badge--removed{background:#fee2e2;color:#991b1b}
.kus-dl-badge--changed{background:#dbeafe;color:#1d4ed8}
.kus-dl-badge--moved{background:#fef3c7;color:#92400e}
.kus-dl-badge--same{background:#e2e8f0;color:#475569}
.kus-dl-empty{padding:14px;text-align:center;color:#64748b;font-size:12px;background:#f8fafc;border-radius:8px}
.kus-dl-reason{display:inline-block;padding:1px 6px;border-radius:999px;background:#fff7ed;color:#9a3412;border:1px solid #fdba74;font:500 10px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-flag{display:inline-block;padding:1px 6px;border-radius:999px;background:#f5f3ff;color:#5b21b6;border:1px solid #c4b5fd;font:500 10px/1.4 -apple-system,Segoe UI,sans-serif}
.kus-dl-result mark.diff-char-del{background:#fecaca;color:#7f1d1d;border-radius:2px;padding:0 1px;text-decoration:line-through}
.kus-dl-result mark.diff-char-add{background:#bbf7d0;color:#14532d;border-radius:2px;padding:0 1px}
.kus-dl-target-field{display:flex;flex:1 1 180px;min-width:180px;flex-direction:column}
.kus-dl-target-field .kus-lp__input{width:100%;box-sizing:border-box}
.kus-dl-target-name{min-height:1.35em;margin-top:3px;color:#64748b;font-size:10.5px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kus-dl-target-name:not(.kus-dl-target-name--empty)::before{content:'アプリ名: ';color:#334155;font-weight:600}
.kus-dl-more{display:flex;justify-content:center;padding:8px 0 2px}
.kus-dl-multi{width:100%;border-collapse:collapse;font:11px/1.45 -apple-system,Segoe UI,sans-serif}
.kus-dl-multi caption{text-align:left;color:#475569;font-weight:700;padding:0 0 6px}
.kus-dl-multi th,.kus-dl-multi td{padding:6px 7px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top}
.kus-dl-multi th:first-child,.kus-dl-multi td:first-child{text-align:left}
.kus-dl-multi thead th{position:sticky;top:0;background:#f8fafc;color:#475569;font-size:10px}
.kus-dl-multi__warn{color:#9a3412;font-weight:700}
.kus-dl-multi__ok{color:#166534;font-weight:700}
@media(max-width:640px){
  .kus-dl-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .kus-dl-row__cols,.kus-dl-colheads{grid-template-columns:1fr}
  .kus-dl-colheads>span:last-child{text-align:left}
  .kus-dl-section__breakdown{width:100%;margin-left:20px}
}
`;

function ensureResultStyles() {
  if (document.getElementById(RESULT_CSS_ID)) return;
  const st = document.createElement('style');
  st.id = RESULT_CSS_ID;
  st.textContent = RESULT_CSS;
  document.head.appendChild(st);
}

export interface DiffRow {
  sectionKey: string;
  section: string;
  type: string;
  severity?: string;
  path: string;
  label?: string;
  left?: any;
  right?: any;
  moved?: boolean;
  reasonSummary?: string;
  notationOnly?: boolean;
  emptyOnly?: boolean;
  _displayOnly?: boolean;
}

export interface DiffCache {
  rows: DiffRow[];
  fetchIssues: any[];
  partialIssues: any[];
  sourceBundle: any;
  targetBundle: any;
  scopes: string[];
  ignoreKeys: string;
  normalizationPresetState: any;
  comparedAt?: string | number;
  /** 差分エンジンの上限打ち切り情報（打ち切りなしなら null） */
  truncation: any;
}

export function buildLiteDiffXlsxContext(
  cache: DiffCache,
  rows: DiffRow[],
  exportMode: string,
  exportLabel: string
): DiffXlsxContext {
  return {
    rows,
    fetchIssues: cache.fetchIssues || [],
    partialIssues: cache.partialIssues || [],
    truncation: cache.truncation || null,
    sourceBundle: cache.sourceBundle,
    targetBundle: cache.targetBundle,
    scopes: cache.scopes,
    ignoreKeys: cache.ignoreKeys,
    normalizationPresetState: cache.normalizationPresetState || {},
    comparedAt: cache.comparedAt || cache.targetBundle?.fetchedAt || cache.sourceBundle?.fetchedAt,
    exportMode,
    exportLabel,
    exportContentMode: 'diffOnly'
  };
}

interface DiffCounts {
  total: number;
  actual: number;
  added: number;
  removed: number;
  changed: number;
  moved: number;
  same: number;
  displayOnly: number;
}

interface MultiXlsxExportItem {
  label: string;
  cache: DiffCache;
}

const rowSearchCache = new WeakMap<object, string>();
const SEARCH_VALUE_TEXT_LIMIT = 8000;
const SEARCH_NESTED_STRING_LIMIT = 2000;

function safeDecodeRow(row: DiffRow): DecodedRow | null {
  try { return decodeRow(row); } catch { return null; }
}

export function summarizeLiteDiffRows(rows: DiffRow[]): DiffCounts {
  const counts: DiffCounts = { total: rows.length, actual: 0, added: 0, removed: 0, changed: 0, moved: 0, same: 0, displayOnly: 0 };
  for (const row of rows) {
    if (row._displayOnly) {
      counts.displayOnly += 1;
      continue;
    }
    if (row.type === 'same') {
      counts.same += 1;
      continue;
    }
    counts.actual += 1;
    if (row.type === 'added') counts.added += 1;
    else if (row.type === 'removed') counts.removed += 1;
    else {
      counts.changed += 1;
      if (row.moved) counts.moved += 1;
    }
  }
  return counts;
}

export function isIncompleteLiteDiff(result: { fetchIssues?: any[]; partialIssues?: any[]; truncation?: any } | null | undefined): boolean {
  return !!result?.truncation?.truncated || (result?.fetchIssues || []).length > 0 || (result?.partialIssues || []).length > 0;
}

function rowSearchText(row: DiffRow): string {
  const cached = rowSearchCache.get(row);
  if (cached !== undefined) return cached;
  const safe = (v: any) => {
    try {
      if (v === undefined) return '';
      const text = JSON.stringify(v, (_key, value) => (
        typeof value === 'string' && value.length > SEARCH_NESTED_STRING_LIMIT
          ? `${value.slice(0, SEARCH_NESTED_STRING_LIMIT)}…`
          : value
      ));
      return String(text || '').slice(0, SEARCH_VALUE_TEXT_LIMIT);
    } catch {
      return String(v).slice(0, SEARCH_VALUE_TEXT_LIMIT);
    }
  };
  const decoded = safeDecodeRow(row);
  const text = [
    row.section || '', row.sectionKey || '', row.path || '', row.label || '', row.reasonSummary || '',
    safe(row.left), safe(row.right), decoded?.oneLineSummary || '', ...(decoded?.searchableTokens || [])
  ].join('\n').toLowerCase();
  rowSearchCache.set(row, text);
  return text;
}

function rowMatchesFilters(row: DiffRow, filters: { section: string; type: string; keyword: string }): boolean {
  if (filters.section && row.sectionKey !== filters.section) return false;
  if (filters.type) {
    if (filters.type === 'moved') {
      if (!row.moved) return false;
    } else if (row.type !== filters.type) {
      return false;
    }
  }
  if (filters.keyword && !rowSearchText(row).includes(filters.keyword)) return false;
  return true;
}

function rowColumnsHtml(row: DiffRow, useCharDiff: boolean, decoded: DecodedRow | null = null): { left: string; right: string } {
  const leftStr = decoded?.beforeText ?? stringifyRowValueForDiff(row.left, row.path);
  const rightStr = decoded?.afterText ?? stringifyRowValueForDiff(row.right, row.path);
  const pre = (value: string, className: string, label: string, rawHtml = false) =>
    `<pre class="kus-dl-pre ${className}" aria-label="${esc(label)}">${rawHtml ? value : esc(value)}</pre>`;
  if (row.type === 'added') {
    return { left: pre('（比較元にはなし）', 'empty', '比較元の値'), right: pre(rightStr, 'add', '比較先の値') };
  }
  if (row.type === 'removed') {
    return { left: pre(leftStr, 'del', '比較元の値'), right: pre('（比較先にはなし）', 'empty', '比較先の値') };
  }
  if (row.type === 'same') {
    return { left: pre(leftStr, 'empty', '比較元の値'), right: pre('（同一）', 'empty', '比較先の値') };
  }
  // changed (or moved with both sides)
  if (useCharDiff) {
    const charDiff = buildCharDiffHtml(leftStr, rightStr);
    if (charDiff) {
      return { left: pre(charDiff.left, 'del', '比較元の値', true), right: pre(charDiff.right, 'add', '比較先の値', true) };
    }
  }
  return { left: pre(leftStr, 'del', '比較元の値'), right: pre(rightStr, 'add', '比較先の値') };
}

function displayBundleSide(bundle: any, fallbackRole: string): { name: string; environment: string } {
  const appId = String(bundle?.appId || '').trim();
  const appName = extractAppNameFromBundle(bundle);
  const name = appName && appId ? `${appName}（App ${appId}）` : (appName || (appId ? `App ${appId}` : fallbackRole));
  const guest = String(bundle?.guestId || '').trim();
  const environment = `${bundle?.preview ? 'プレビュー' : '運用'}${guest ? ` / ゲスト ${guest}` : ' / 通常スペース'}`;
  return { name, environment };
}

export function renderLiteDiffOverviewHtml(cache: DiffCache): string {
  const counts = summarizeLiteDiffRows(cache.rows || []);
  const source = displayBundleSide(cache.sourceBundle, '比較元');
  const target = displayBundleSide(cache.targetBundle, '比較先');
  const fetchIssues = cache.fetchIssues || [];
  const partialIssues = cache.partialIssues || [];
  const truncated = !!cache.truncation?.truncated;
  const incomplete = isIncompleteLiteDiff(cache);
  const hasNoticeOnlyChanges = counts.actual === 0 && counts.displayOnly > 0;
  const verdictClass = incomplete ? 'kus-dl-verdict--warn' : (counts.actual === 0 && !hasNoticeOnlyChanges ? 'kus-dl-verdict--same' : '');
  const verdictTitle = incomplete
    ? '比較結果は不完全です'
    : (hasNoticeOnlyChanges
      ? `状態名の変更候補が ${counts.displayOnly} 件見つかりました`
      : (counts.actual === 0 ? '選択した設定に差分はありません' : `差分が ${counts.actual} 件見つかりました`));
  const verdictText = incomplete
    ? (counts.actual ? `取得できた範囲では ${counts.actual} 件の差分があります。警告内容を確認してください。` : '差分なしとは判断できません。取得失敗または件数上限を解消して再比較してください。')
    : (hasNoticeOnlyChanges
      ? '参照先の連動変更をまとめた表示用通知です。削除・追加としては数えていません。内容を確認してください。'
      : (counts.actual === 0
        ? `比較元と比較先は一致しています${counts.same ? `（同一 ${counts.same} 件）` : ''}。`
        : `追加 ${counts.added} / 削除 ${counts.removed} / 変更 ${counts.changed}${counts.moved ? `（移動 ${counts.moved}）` : ''}`));
  const metric = (type: string, label: string, hint: string, value: number) =>
    `<button type="button" class="kus-dl-metric" data-kus-dl-type-filter="${esc(type)}" aria-label="${esc(label)} ${value}件を表示"${value ? '' : ' disabled'}>` +
      `<span class="kus-dl-metric__num">${value}</span><span class="kus-dl-metric__label">${esc(label)}</span><span class="kus-dl-metric__hint">${esc(hint)}</span></button>`;

  const bySection = new Map<string, DiffRow[]>();
  for (const row of cache.rows || []) {
    const key = row.sectionKey || '(その他)';
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key)!.push(row);
  }
  const orderedKeys: string[] = [];
  for (const def of SECTION_DEFS) if (bySection.has(def.key)) orderedKeys.push(def.key);
  for (const key of bySection.keys()) if (!orderedKeys.includes(key)) orderedKeys.push(key);
  const sectionButtons = orderedKeys.map((key) => {
    const sectionCounts = summarizeLiteDiffRows(bySection.get(key) || []);
    const label = SECTION_DEFS.find((def) => def.key === key)?.label || key;
    const countLabel = sectionCounts.actual
      ? `${sectionCounts.actual}件`
      : (sectionCounts.displayOnly ? `変更候補 ${sectionCounts.displayOnly}件` : `一致 ${sectionCounts.same}件`);
    return `<button type="button" class="kus-dl-section-jump" data-kus-dl-section-filter="${esc(key)}">${esc(label)} ${esc(countLabel)}</button>`;
  }).join('');

  const alerts: string[] = [];
  if (truncated) {
    const sections = (cache.truncation?.sections || []).map((item: any) => item?.section || item?.sectionKey).filter(Boolean);
    const sectionText = sections.length ? ` 対象: ${sections.join('、')}` : '';
    alerts.push(`差分上限 ${Number(cache.truncation?.diffLimit || 0).toLocaleString()} 件に到達したため、結果の一部が表示されていません。${sectionText}`);
  }
  if (fetchIssues.length) {
    const sections = [...new Set(fetchIssues.map((item: any) => item?.section || item?.sectionKey).filter(Boolean))];
    const sideLabel: Record<string, string> = { source: '比較元', target: '比較先', both: '両側' };
    const details = fetchIssues.slice(0, 3).map((item: any) => {
      const section = item?.section || item?.sectionKey || '不明なセクション';
      const side = sideLabel[String(item?.side || '')] || '取得元不明';
      const message = String(item?.message || item?.sourceError || item?.targetError || '取得できませんでした').replace(/\s+/g, ' ').slice(0, 180);
      return `${section}（${side}）: ${message}`;
    });
    const remainder = fetchIssues.length > details.length ? ` / ほか ${fetchIssues.length - details.length} 件` : '';
    alerts.push(`設定の取得に ${fetchIssues.length} 件失敗しました。${sections.length ? ` 対象: ${sections.join('、')}。` : ''} ${details.join(' / ')}${remainder}`);
  }
  if (partialIssues.length) {
    const sideLabel: Record<string, string> = { source: '比較元', target: '比較先', both: '両側' };
    const details = partialIssues.slice(0, 3).map((item: any) => {
      const section = item?.section || item?.sectionKey || '不明なセクション';
      const side = sideLabel[String(item?.side || '')] || '取得元不明';
      const files = (item?.files || []).slice(0, 3).map((file: any) => file?.fileName || file?.fileKey).filter(Boolean);
      return `${section}（${side}）${files.length ? `: ${files.join('、')}` : ''}`;
    });
    const remainder = partialIssues.length > details.length ? ` / ほか ${partialIssues.length - details.length} 件` : '';
    alerts.push(`本文サイズまたは形式の制約により ${partialIssues.length} 件を fileKey で比較しました。本文内容は未検証です。${details.join(' / ')}${remainder}`);
  }

  return `<section class="kus-dl-overview" aria-label="比較結果サマリー">` +
    `<div class="kus-dl-overview__direction"><div class="kus-dl-side"><span class="kus-dl-side__role">比較元</span><span class="kus-dl-side__name" title="${esc(source.name)}">${esc(source.name)}</span><span class="kus-dl-side__env">${esc(source.environment)}</span></div>` +
    `<span class="kus-dl-overview__arrow" aria-label="から">→</span>` +
    `<div class="kus-dl-side kus-dl-side--target"><span class="kus-dl-side__role">比較先</span><span class="kus-dl-side__name" title="${esc(target.name)}">${esc(target.name)}</span><span class="kus-dl-side__env">${esc(target.environment)}</span></div></div>` +
    `<div class="kus-dl-verdict ${verdictClass}" role="status"><strong>${esc(verdictTitle)}</strong><span>${esc(verdictText)}</span></div>` +
    `<div class="kus-dl-metrics"><div class="kus-dl-metric"><span class="kus-dl-metric__num">${counts.actual}</span><span class="kus-dl-metric__label">差分</span><span class="kus-dl-metric__hint">同一を除く</span></div>` +
      metric('added', '追加', '比較先のみ', counts.added) + metric('removed', '削除', '比較元のみ', counts.removed) +
      metric('changed', '変更', '値が異なる', counts.changed) + metric('moved', '移動', '並び順', counts.moved) + '</div>' +
    (sectionButtons ? `<div class="kus-dl-section-nav"><span class="kus-dl-section-nav__label">セクションを開く</span>${sectionButtons}</div>` : '') +
    alerts.map((message) => `<div class="kus-dl-alert" role="alert">⚠ ${esc(message)}</div>`).join('') +
    '<div class="kus-dl-legend">追加 = 比較先にのみ存在 / 削除 = 比較元にのみ存在。比較方向は上の矢印で確認できます。</div></section>';
}

export function renderRowsHtml(rows: DiffRow[], useCharDiff: boolean, summary: string, allFilteredRows: DiffRow[] = rows): string {
  if (!rows.length) return `<div class="kus-dl-empty">該当する差分はありません${summary ? ` — ${summary}` : ''}</div>`;
  const bySection = new Map<string, DiffRow[]>();
  const allBySection = new Map<string, DiffRow[]>();
  for (const r of rows) {
    const key = r.sectionKey || '(その他)';
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key)!.push(r);
  }
  for (const r of allFilteredRows) {
    const key = r.sectionKey || '(その他)';
    if (!allBySection.has(key)) allBySection.set(key, []);
    allBySection.get(key)!.push(r);
  }
  // SECTION_DEFS 順を尊重
  const orderedKeys: string[] = [];
  for (const def of SECTION_DEFS) if (bySection.has(def.key)) orderedKeys.push(def.key);
  for (const k of bySection.keys()) if (!orderedKeys.includes(k)) orderedKeys.push(k);

  const parts: string[] = [];
  parts.push(`<div class="kus-dl-result__summary">${summary}</div>`);
  for (const k of orderedKeys) {
    const list = bySection.get(k)!;
    const allInSection = allBySection.get(k) || list;
    const label = SECTION_DEFS.find((d) => d.key === k)?.label || k;
    const sectionCounts = summarizeLiteDiffRows(allInSection);
    const breakdown = sectionCounts.actual
      ? [`+${sectionCounts.added}`, `−${sectionCounts.removed}`, `~${sectionCounts.changed}`, sectionCounts.moved ? `↕${sectionCounts.moved}` : ''].filter(Boolean).join(' / ')
      : (sectionCounts.same ? `一致 ${sectionCounts.same}` : `変更候補 ${sectionCounts.displayOnly}`);
    const countLabel = list.length === allInSection.length ? `${list.length}件` : `${list.length} / ${allInSection.length}件表示`;
    parts.push(`<details class="kus-dl-section" open><summary>${esc(label)} <span class="kus-dl-section__count">${countLabel}</span><span class="kus-dl-section__breakdown">${esc(breakdown)}</span></summary><div class="kus-dl-section__body">`);
    for (const r of list) {
      const decoded = safeDecodeRow(r);
      const cols = rowColumnsHtml(r, useCharDiff, decoded);
      const typeKey = r.moved ? 'moved' : (r.type || 'same');
      const typeBadge = `<span class="kus-dl-badge kus-dl-badge--${esc(typeKey)}">${esc(TYPE_LABEL[typeKey] || typeKey)}</span>`;
      const primaryHtml = decoded
        ? `<span class="kus-dl-row__title">${esc(decoded.oneLineSummary || decoded.propLabel)}</span>`
        : `<span class="kus-dl-row__path">${esc(r.path || '')}</span>`;
      const labelHtml = !decoded && r.label ? `<span style="color:#475569">${esc(r.label)}</span>` : '';
      const reasonHtml = r.reasonSummary ? `<span class="kus-dl-reason">${esc(r.reasonSummary)}</span>` : '';
      const flagHtml = [
        r.notationOnly ? '<span class="kus-dl-flag" title="型・表記だけが異なり、値としては同じです（例: &quot;100&quot; と 100）">表記のみ</span>' : '',
        r.emptyOnly ? '<span class="kus-dl-flag" title="空文字・null・空配列など、空値同士の差です">空値ゆれ</span>' : ''
      ].join('');
      const contextHtml = decoded
        ? `<div class="kus-dl-row__context">${decoded.whereChips.map((chip) => `<span class="kus-dl-row__chip">${esc(`${chip.icon || ''}${chip.icon ? ' ' : ''}${chip.label}`)}</span>`).join('')}<span class="kus-dl-row__raw" title="内部パス">${esc(r.path || '')}</span></div>`
        : '';
      parts.push(`<div class="kus-dl-row"><div class="kus-dl-row__head">${typeBadge}${primaryHtml}${reasonHtml}${flagHtml}${labelHtml}</div>${contextHtml}<div class="kus-dl-row__cols">${cols.left}${cols.right}</div></div>`);
    }
    parts.push('</div></details>');
  }
  return parts.join('');
}

export function mountDiffLitePanel(runDiffStandalone: (opts: any) => Promise<any>) {
  ensureResultStyles();
  const panel: LitePanelHandle = createLitePanel({
    id: 'kus-diff-lite',
    title: '差分比較',
    subtitle: '2 アプリの設定差分を比較し、HTML レポートと Excel 一覧で確認',
    accent: 'diff',
    badges: [{ label: 'Lite' }, { label: '出力対応' }],
    hint: '比較完了と同時に HTML レポートを保存します。結果は Excel (.xlsx) の一覧としても保存できます。<strong>統合ツール.js は不要</strong>。',
    wide: true
  });
  panel.status.setAttribute('role', 'status');
  panel.status.setAttribute('aria-live', 'polite');
  panel.status.setAttribute('aria-atomic', 'true');

  // ---- アプリ ----
  const srcApp = makeInput({ placeholder: 'アプリID', width: 'id', ariaLabel: '比較元アプリID' });
  const srcGuest = makeInput({ placeholder: 'ゲストID', width: 'guest', ariaLabel: '比較元ゲストスペースID' });
  const srcPrev = makeCheck({ label: 'プレビューで取得' });
  const tgtApp = makeInput({ placeholder: 'アプリID（カンマ区切り可）', width: 'medium', ariaLabel: '比較先1アプリID' });
  const tgtGuest = makeInput({ placeholder: 'ゲストID', width: 'guest', ariaLabel: '比較先1ゲストスペースID' });
  const tgtPrev = makeCheck({ label: 'プレビューで取得' });

  interface TargetRowEntry { app: HTMLInputElement; guest: HTMLInputElement; row: HTMLElement; name: HTMLElement; appName: string }
  const cardApp = makeCard({ title: 'アプリと環境', number: 1 });
  const makeTargetName = () => {
    const el = document.createElement('div');
    el.className = 'kus-dl-target-name kus-dl-target-name--empty';
    return el;
  };
  const makeTargetField = (app: HTMLInputElement, name: HTMLElement) => {
    const wrap = document.createElement('div');
    wrap.className = 'kus-dl-target-field';
    wrap.appendChild(app);
    wrap.appendChild(name);
    return wrap;
  };
  const setTargetName = (entry: TargetRowEntry, appName: string) => {
    entry.appName = String(appName || '').trim();
    entry.name.textContent = entry.appName;
    entry.name.title = entry.appName ? `アプリ名: ${entry.appName}` : '';
    entry.name.classList.toggle('kus-dl-target-name--empty', !entry.appName);
  };
  const srcName = makeTargetName();
  let sourceAppName = '';
  const setSourceName = (appName: string) => {
    sourceAppName = String(appName || '').trim();
    srcName.textContent = sourceAppName;
    srcName.title = sourceAppName ? `アプリ名: ${sourceAppName}` : '';
    srcName.classList.toggle('kus-dl-target-name--empty', !sourceAppName);
  };
  cardApp.body.appendChild(makeRow([makeTargetField(srcApp, srcName), srcGuest, srcPrev.label], { label: '比較元' }));
  const tgtName = makeTargetName();
  const firstTargetRow = makeRow([makeTargetField(tgtApp, tgtName), tgtGuest, tgtPrev.label], { label: '比較先 1' });
  cardApp.body.appendChild(firstTargetRow);
  const targetList = document.createElement('div');
  targetList.style.display = 'grid';
  targetList.style.gap = '6px';
  targetList.style.marginTop = '6px';
  targetList.style.maxHeight = '180px';
  targetList.style.overflowY = 'auto';
  targetList.style.paddingRight = '2px';
  const targetRows: TargetRowEntry[] = [{ app: tgtApp, guest: tgtGuest, row: firstTargetRow, name: tgtName, appName: '' }];
  const relabelTargetRows = () => targetRows.forEach((r, idx) => {
    const label = r.row?.querySelector?.('.kus-lp__label') as HTMLElement | null;
    if (label) label.textContent = `比較先 ${idx + 1}`;
    r.app.setAttribute('aria-label', `比較先${idx + 1}アプリID`);
    r.guest.setAttribute('aria-label', `比較先${idx + 1}ゲストスペースID`);
  });
  const addTargetRow = (appId = '', guestId = '', appName = '') => {
    const rowNumber = targetRows.length + 1;
    const app = makeInput({ placeholder: 'アプリID（カンマ区切り可）', width: 'medium', ariaLabel: `比較先${rowNumber}アプリID` });
    const guest = makeInput({ placeholder: 'ゲストID', width: 'guest', ariaLabel: `比較先${rowNumber}ゲストスペースID` });
    const name = makeTargetName();
    app.value = appId;
    guest.value = guestId;
    const copy = makeButton('行コピー', 'sub');
    const remove = makeButton('削除', 'ghost');
    const row = makeRow([makeTargetField(app, name), guest, copy, remove], { label: `比較先 ${targetRows.length + 1}` });
    const entry: TargetRowEntry = { app, guest, row, name, appName: '' };
    setTargetName(entry, appName);
    copy.addEventListener('click', async () => {
      const text = [`比較先 ${targetRows.indexOf(entry) + 1}`, app.value.trim(), guest.value.trim()].join('\t');
      try { await navigator.clipboard.writeText(text); panel.setStatus('比較先行をコピーしました', 'info'); } catch { panel.setStatus(text, 'info'); }
    });
    remove.addEventListener('click', () => {
      row.remove();
      const idx = targetRows.indexOf(entry);
      if (idx >= 0) targetRows.splice(idx, 1);
      relabelTargetRows();
    });
    app.addEventListener('input', () => { if (entry.appName) setTargetName(entry, ''); });
    targetRows.push(entry);
    targetList.appendChild(row);
    attachTargetSplit(entry);
    return entry;
  };
  // 比較先のアプリID欄に「100, 120, 130」のようにカンマ区切りで入力したら比較先行へ分割する
  const attachTargetSplit = (entry: TargetRowEntry) => {
    const distribute = () => {
      const raw = entry.app.value;
      if (!/[,、\s]/.test(raw)) return;
      const tokens = raw.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean);
      if (tokens.length <= 1) { entry.app.value = tokens[0] || ''; setTargetName(entry, ''); return; }
      entry.app.value = tokens[0];
      setTargetName(entry, '');
      const guestVal = entry.guest.value.trim();
      for (let k = 1; k < tokens.length; k += 1) addTargetRow(tokens[k], guestVal);
      panel.setStatus(`比較先を ${tokens.length} 件に分割しました`, 'info');
    };
    entry.app.addEventListener('change', distribute);
    entry.app.addEventListener('paste', (ev: ClipboardEvent) => {
      const text = ev.clipboardData?.getData('text') || '';
      if (!/[,、\s]/.test(text)) return;
      ev.preventDefault();
      entry.app.value = [entry.app.value.trim(), text].filter(Boolean).join(',');
      distribute();
    });
  };
  srcApp.addEventListener('input', () => { if (sourceAppName) setSourceName(''); });
  tgtApp.addEventListener('input', () => { if (targetRows[0]?.appName) setTargetName(targetRows[0], ''); });
  attachTargetSplit(targetRows[0]);
  const addTargetBtn = makeButton('比較先行を追加', 'sub');
  addTargetBtn.addEventListener('click', () => { addTargetRow(); panel.setStatus('比較先行を追加しました', 'info'); });
  const copyFirstBtn = makeButton('比較先1を複製', 'sub');
  copyFirstBtn.addEventListener('click', () => addTargetRow(tgtApp.value.trim(), tgtGuest.value.trim(), targetRows[0]?.appName || ''));
  cardApp.body.appendChild(makeRow([addTargetBtn, copyFirstBtn], { label: '複数比較' }));
  cardApp.body.appendChild(createAppSearchControl(panel, {
    targets: [
      { label: '比較元', apply: (id, name, guestId) => { srcApp.value = id; setSourceName(name); if (guestId && !srcGuest.value.trim()) srcGuest.value = guestId; } },
      { label: '比較先', apply: (id, name, guestId) => {
        const empty = targetRows.find((r) => !r.app.value.trim()) || addTargetRow();
        empty.app.value = id;
        setTargetName(empty, name);
        if (guestId && !empty.guest.value.trim()) empty.guest.value = guestId;
      } }
    ]
  }));
  cardApp.body.appendChild(targetList);
  panel.body.insertBefore(cardApp.card, panel.status);

  // ---- セクション ----
  const cardScope = makeCard({ title: '比較セクション', number: 2 });
  const chipBox = document.createElement('div');
  chipBox.className = 'kus-lp__chips';
  const chips = SCOPE_OPTS.map(([key, label, def]) => makeChip({ label, value: key, checked: def }));
  chips.forEach((c) => chipBox.appendChild(c.label));
  cardScope.body.appendChild(chipBox);
  const allBtn = makeButton('全選択', 'sub');
  const noneBtn = makeButton('全解除', 'sub');
  cardScope.actions.appendChild(allBtn);
  cardScope.actions.appendChild(noneBtn);
  allBtn.addEventListener('click', () => chips.forEach((c) => { c.checkbox.checked = true; }));
  noneBtn.addEventListener('click', () => chips.forEach((c) => { c.checkbox.checked = false; }));
  panel.body.insertBefore(cardScope.card, panel.status);

  // ---- 設定JSON読込 ----
  const cardImport = makeCard({ title: '設定JSON読込（任意）', soft: true });
  cardImport.body.appendChild(makeNote('設定出力で保存した単体JSON、設定一括取得JSON（apps 配列）、差分バンドルJSONを指定できます。指定した側はAPI取得せずJSONを使用します。比較先JSONは単一比較専用です。'));
  const srcFile = document.createElement('input');
  srcFile.type = 'file';
  srcFile.accept = '.json,application/json';
  srcFile.className = 'kus-lp__file';
  const tgtFile = document.createElement('input');
  tgtFile.type = 'file';
  tgtFile.accept = '.json,application/json';
  tgtFile.className = 'kus-lp__file';
  const clearImportBtn = makeButton('読込解除', 'ghost');
  cardImport.body.appendChild(makeRow(srcFile, { label: '比較元JSON' }));
  cardImport.body.appendChild(makeRow(tgtFile, { label: '比較先JSON' }));
  cardImport.body.appendChild(makeRow(clearImportBtn));
  panel.body.insertBefore(cardImport.card, panel.status);

  // ---- 詳細オプション ----
  const advDetails = makeDetails('詳細オプション');
  const ignTa = makeTextarea({ rows: 2, code: true, placeholder: '無視キー（カンマ区切り）' });
  advDetails.body.appendChild(makeRow(ignTa, { label: '無視キー', block: true }));

  const includeSame = makeCheck({ label: '同一行も差分行に含める' });
  const showResultList = makeCheck({ label: '画面に差分明細を表示（200件ずつ）', checked: true, help: '大量差分でも固まりにくいよう、明細は200件ずつ段階表示します' });
  const nView = makeCheck({ label: 'ビュー/グラフ/アクション順序を無視', checked: false });
  const nPerm = makeCheck({ label: '権限/通知/カテゴリ順序を無視', checked: false });
  const nAll = makeCheck({ label: 'すべての配列順序を無視', checked: false });
  const nField = makeCheck({ label: 'フィールド/レイアウト順序を無視', checked: false });
  const nProcess = makeCheck({ label: 'プロセスの並び順を無視', checked: false });
  const nAppRefs = makeCheck({ label: 'アプリID/参照先アプリIDを無視', checked: false });
  const nAudit = makeCheck({ label: '監査/リビジョン情報を無視', checked: false });
  const nText = makeCheck({ label: 'ラベル/説明文/ヘルプを無視', checked: false });
  const nAppearance = makeCheck({ label: '見た目/幅/座標を無視', checked: false });
  const nFileKeys = makeCheck({ label: '添付/JS/CSS fileKeyを無視', checked: false });
  const nEnabled = makeCheck({ label: '有効/無効フラグを無視', checked: false });
  const normGrid = document.createElement('div');
  normGrid.className = 'kus-lp__check-grid';
  [
    includeSame.label,
    showResultList.label,
    nView.label,
    nPerm.label,
    nAll.label,
    nField.label,
    nProcess.label,
    nAppRefs.label,
    nAudit.label,
    nText.label,
    nAppearance.label,
    nFileKeys.label,
    nEnabled.label
  ].forEach((el) => normGrid.appendChild(el));
  advDetails.body.appendChild(normGrid);
  panel.body.insertBefore(advDetails.details, panel.status);

  // ---- 実行 ----
  const runBtn = makeButton('差分比較を実行', 'run', { icon: '◎' });
  const runAllBtn = makeButton('全比較先を順に比較', 'sub', { icon: '◎' });
  panel.body.insertBefore(makeRow([runBtn, runAllBtn]), panel.status);
  // 入力欄で Enter を押すと差分比較を実行（読み取り専用なので安全）
  panel.setPrimaryAction(runBtn);

  // ---- 結果フィルタ ----
  const cardFilter = makeCard({ title: '結果の絞り込み', soft: true });
  cardFilter.card.style.display = 'none';
  const filterSection = makeSelect([['', '全セクション']]);
  filterSection.setAttribute('aria-label', '結果のセクション絞り込み');
  const filterType = makeSelect([
    ['', '全種別'],
    ['added', '追加'],
    ['removed', '削除'],
    ['changed', '変更'],
    ['moved', '移動'],
    ['same', '同一']
  ]);
  filterType.setAttribute('aria-label', '結果の種別絞り込み');
  const filterSearch = makeInput({ placeholder: '日本語ラベル・パス・値で検索', width: 'wide', noSubmit: true, ariaLabel: '差分結果を検索' });
  const filterClear = makeButton('クリア', 'ghost');
  cardFilter.body.appendChild(makeRow([filterSection, filterType, filterClear], { label: 'フィルタ' }));
  cardFilter.body.appendChild(makeRow(filterSearch, { label: '検索' }));
  const charDiffCb = makeCheck({ label: '文字単位ハイライト', checked: true, help: '変更行で「どこが変わったか」を文字単位で強調表示します' });
  cardFilter.body.appendChild(makeRow(charDiffCb.label));
  let filterRenderTimer: number | undefined;
  const resetResultPage = () => { resultLimit = RESULT_PAGE_SIZE; };
  const rerenderFromFilter = () => {
    if (!cache) return;
    resetResultPage();
    rerender();
  };
  filterClear.addEventListener('click', () => {
    filterSection.value = '';
    filterType.value = '';
    filterSearch.value = '';
    rerenderFromFilter();
  });
  [filterSection, filterType].forEach((el) => el.addEventListener('change', rerenderFromFilter));
  filterSearch.addEventListener('input', () => {
    if (filterRenderTimer !== undefined) window.clearTimeout(filterRenderTimer);
    filterRenderTimer = window.setTimeout(rerenderFromFilter, 160);
  });
  // 複数比較の結果表は cache を使わず描画するため、単一比較の結果がある時だけ再描画する。
  charDiffCb.checkbox.addEventListener('change', () => { if (cache) rerender(); });
  showResultList.checkbox.addEventListener('change', () => { if (cache) rerender(); });
  panel.body.insertBefore(cardFilter.card, panel.status);

  // ---- 結果表示エリア（HTMLテーブル） ----
  const cardResult = makeCard({ title: '結果', soft: true });
  cardResult.card.style.display = 'none';
  const resultBox = document.createElement('div');
  resultBox.className = 'kus-dl-result';
  cardResult.body.appendChild(resultBox);
  panel.body.insertBefore(cardResult.card, panel.status);

  // ---- 出力（再出力用。初回は比較実行時に自動保存される） ----
  const cardOut = makeCard({ title: 'ファイル出力', number: 3, soft: true });
  cardOut.body.appendChild(makeNote('HTML レポートは比較実行時に自動保存されます。Excel は比較後に、全件または画面で絞り込んだ範囲を一覧として保存できます。'));
  cardOut.body.appendChild(makeNote('HTMLには選択した設定値が埋め込まれます。プラグイン設定やJS/CSS本文を含めた場合は、共有先と保管場所に注意してください。'));
  const expRange = makeSelect([
    ['all', '全件'],
    ['filtered', '表示中（フィルタ適用後）']
  ], 'all');
  cardOut.body.appendChild(makeRow(expRange, { label: '範囲' }));

  const grid = document.createElement('div');
  grid.className = 'kus-lp__btn-grid';
  const bXlsx = makeButton('差分一覧を Excel 保存 (.xlsx)', 'primary', { icon: '↓' });
  const bHtml = makeButton('差分 HTML を再出力', 'sub', { icon: '↓' });
  grid.appendChild(bXlsx);
  grid.appendChild(bHtml);
  cardOut.body.appendChild(grid);
  // 出力カードは結果カードの前に挿入し、差分件数が多くても結果リストの下までスクロールせず
  // 出力ボタンへすぐ届くようにする
  panel.body.insertBefore(cardOut.card, cardResult.card);

  const setExportControlsEnabled = (enabled: boolean) => {
    expRange.disabled = !enabled;
    bXlsx.disabled = !enabled;
    bHtml.disabled = !enabled;
  };
  setExportControlsEnabled(false);

  // ---- 状態 ----
  let cache: DiffCache | null = null;
  let multiXlsxExports: MultiXlsxExportItem[] = [];
  let multiXlsxExportActive = false;
  let summaryText = '';
  let resultLimit = RESULT_PAGE_SIZE;
  let importedSourceBundle: any = null;
  let importedTargetBundle: any = null;

  srcFile.addEventListener('change', () => liteRun(panel, '比較元JSONを読み込み中…', async () => {
    const file = srcFile.files?.[0];
    if (!file) return;
    importedSourceBundle = await readSettingsBundleFile(file, { side: 'source', appId: srcApp.value.trim() });
    if (!srcApp.value.trim() && importedSourceBundle?.appId) srcApp.value = String(importedSourceBundle.appId);
    setSourceName(extractAppNameFromBundle(importedSourceBundle));
    panel.setStatus(`比較元JSONを読み込みました: App ${importedSourceBundle?.appId || '-'}`, 'ok');
  }));
  tgtFile.addEventListener('change', () => liteRun(panel, '比較先JSONを読み込み中…', async () => {
    const file = tgtFile.files?.[0];
    if (!file) return;
    importedTargetBundle = await readSettingsBundleFile(file, { side: 'target', appId: tgtApp.value.trim() });
    if (!tgtApp.value.trim() && importedTargetBundle?.appId) tgtApp.value = String(importedTargetBundle.appId);
    setTargetName(targetRows[0], extractAppNameFromBundle(importedTargetBundle));
    panel.setStatus(`比較先JSONを読み込みました: App ${importedTargetBundle?.appId || '-'}`, 'ok');
  }));
  clearImportBtn.addEventListener('click', () => {
    importedSourceBundle = null;
    importedTargetBundle = null;
    srcFile.value = '';
    tgtFile.value = '';
    panel.setStatus('設定JSONの読込を解除しました', 'info');
  });

  function readTargets() {
    const seen = new Set<string>();
    return targetRows
      .map((r) => ({ appId: r.app.value.trim(), guestId: r.guest.value.trim(), preview: tgtPrev.checkbox.checked, appName: r.appName }))
      .filter((t) => t.appId)
      .filter((t) => {
        const key = `${t.appId}::${t.guestId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function readForm() {
    return {
      source: { appId: srcApp.value.trim(), guestId: srcGuest.value.trim(), preview: srcPrev.checkbox.checked, appName: sourceAppName },
      target: { appId: tgtApp.value.trim(), guestId: tgtGuest.value.trim(), preview: tgtPrev.checkbox.checked, appName: targetRows[0]?.appName || '' },
      scopes: chips.filter((c) => c.checkbox.checked).map((c) => c.checkbox.value),
      ignoreKeys: ignTa.value,
      includeSame: includeSame.checkbox.checked,
      normalizationPresetState: {
        viewOrder: nView.checkbox.checked,
        permissionOrder: nPerm.checkbox.checked,
        generalArrayOrder: nAll.checkbox.checked,
        fieldOrder: nField.checkbox.checked,
        processOrder: nProcess.checkbox.checked,
        appReferences: nAppRefs.checkbox.checked,
        auditMeta: nAudit.checkbox.checked,
        labelsAndText: nText.checkbox.checked,
        appearance: nAppearance.checkbox.checked,
        fileKeys: nFileKeys.checkbox.checked,
        enabledFlags: nEnabled.checkbox.checked
      }
    };
  }

  function currentFilters() {
    return {
      section: filterSection.value,
      type: filterType.value,
      keyword: filterSearch.value.trim().toLowerCase()
    };
  }

  function filteredRows(): DiffRow[] {
    if (!cache) return [];
    const f = currentFilters();
    return cache.rows.filter((r) => rowMatchesFilters(r, f));
  }

  function attachKnownAppName(bundle: any, appName: string) {
    const name = String(appName || '').trim();
    if (!bundle || !name || extractAppNameFromBundle(bundle)) return;
    if (!bundle.meta || typeof bundle.meta !== 'object') bundle.meta = {};
    bundle.meta.appName = name;
  }

  function refreshFilterSectionOptions() {
    if (!cache) return;
    const set = new Set(cache.rows.map((r) => r.sectionKey).filter(Boolean));
    const prev = filterSection.value;
    filterSection.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = ''; optAll.textContent = '全セクション';
    filterSection.appendChild(optAll);
    for (const def of SECTION_DEFS) {
      if (set.has(def.key)) {
        const o = document.createElement('option');
        o.value = def.key; o.textContent = def.label;
        filterSection.appendChild(o);
      }
    }
    if ([...filterSection.options].some((o) => o.value === prev)) filterSection.value = prev;
  }

  function rerender() {
    if (!cache) {
      resultBox.innerHTML = '';
      cardResult.card.style.display = 'none';
      cardFilter.card.style.display = 'none';
      return;
    }
    const overview = renderLiteDiffOverviewHtml(cache);
    cardResult.card.style.display = 'block';
    if (!showResultList.checkbox.checked) {
      resultBox.innerHTML = overview;
      cardFilter.card.style.display = 'none';
      return;
    }
    const rows = filteredRows();
    const visibleRows = rows.slice(0, resultLimit);
    const summary = `<strong>${visibleRows.length}</strong> / ${rows.length}件を表示${rows.length !== cache.rows.length ? `（比較結果全体 ${cache.rows.length}件）` : ''}`;
    const source = displayBundleSide(cache.sourceBundle, '比較元');
    const target = displayBundleSide(cache.targetBundle, '比較先');
    const headings = `<div class="kus-dl-colheads" aria-label="比較列"><span>比較元: ${esc(source.name)}</span><span>比較先: ${esc(target.name)}</span></div>`;
    const more = rows.length > visibleRows.length
      ? `<div class="kus-dl-more"><button type="button" class="kus-lp__btn kus-lp__btn--sub" data-kus-dl-more>さらに ${Math.min(RESULT_PAGE_SIZE, rows.length - visibleRows.length)} 件表示（残り ${rows.length - visibleRows.length} 件）</button></div>`
      : '';
    resultBox.innerHTML = overview + headings + renderRowsHtml(visibleRows, charDiffCb.checkbox.checked, summary, rows) + more;
    cardFilter.card.style.display = 'block';
  }

  resultBox.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement | null;
    const multiXlsxButton = target?.closest<HTMLButtonElement>('[data-kus-dl-multi-xlsx]');
    if (multiXlsxButton) {
      const index = Number(multiXlsxButton.dataset.kusDlMultiXlsx);
      const item = Number.isInteger(index) ? multiXlsxExports[index] : null;
      if (!item || multiXlsxButton.disabled || multiXlsxExportActive) return;
      const exportStartedAt = Date.now();
      multiXlsxExportActive = true;
      multiXlsxButton.disabled = true;
      try {
        panel.setStatus(`${item.label} の差分一覧 Excel を生成中…`, 'busy');
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        const result = runExportDiffXlsx(buildLiteDiffXlsxContext(item.cache, item.cache.rows, 'all', '全件'));
        const incomplete = isIncompleteLiteDiff(item.cache);
        panel.setStatus(`${item.label} の差分一覧 Excel のダウンロードを開始しました: ${result.filename}${incomplete ? ' — 比較結果は不完全です' : ''}`, incomplete ? 'warn' : 'ok');
      } catch (e: any) {
        panel.setStatus(`Excel出力エラー: ${e?.message || String(e)}`, 'err');
      } finally {
        const cooldown = XLSX_EXPORT_COOLDOWN_MS - (Date.now() - exportStartedAt);
        if (cooldown > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, cooldown));
        multiXlsxExportActive = false;
        multiXlsxButton.disabled = false;
      }
      return;
    }
    const typeButton = target?.closest<HTMLElement>('[data-kus-dl-type-filter]');
    if (typeButton) {
      showResultList.checkbox.checked = true;
      filterType.value = typeButton.dataset.kusDlTypeFilter || '';
      rerenderFromFilter();
      return;
    }
    const sectionButton = target?.closest<HTMLElement>('[data-kus-dl-section-filter]');
    if (sectionButton) {
      showResultList.checkbox.checked = true;
      filterSection.value = sectionButton.dataset.kusDlSectionFilter || '';
      rerenderFromFilter();
      return;
    }
    if (target?.closest('[data-kus-dl-more]')) {
      resultLimit += RESULT_PAGE_SIZE;
      rerender();
    }
  });

  function exportCtx(forceAll = false) {
    if (!cache) throw new Error('先に差分比較を実行してください');
    const isAll = forceAll || expRange.value === 'all';
    const rows = isAll ? cache.rows : filteredRows();
    return {
      ...cache,
      rows,
      exportMode: isAll ? 'all' : 'filtered',
      exportLabel: isAll ? '全差分' : '表示中（フィルタ適用後）'
    };
  }

  let diffRunActive = false;
  async function runDiffTask(busyMessage: string, task: () => Promise<void>) {
    if (diffRunActive) {
      panel.setStatus('比較を実行中です。完了までお待ちください', 'warn');
      return;
    }
    diffRunActive = true;
    runBtn.disabled = true;
    runAllBtn.disabled = true;
    setExportControlsEnabled(false);
    try {
      await liteRun(panel, busyMessage, task);
    } finally {
      diffRunActive = false;
      runBtn.disabled = false;
      runAllBtn.disabled = false;
      setExportControlsEnabled(!!cache);
    }
  }

  runAllBtn.addEventListener('click', () => {
    const targets = readTargets();
    if (!targets.length) {
      panel.setStatus('比較先アプリIDを 1 件以上入力してください', 'warn');
      return;
    }
    if (importedTargetBundle) {
      panel.setStatus('比較先JSONは単一比較専用です。「差分比較を実行」を使うか、比較先JSONの読込を解除してください', 'warn');
      return;
    }
    const base = readForm();
    if (!base.scopes.length) {
      panel.setStatus('比較セクションを 1 つ以上選択してください', 'warn');
      return;
    }
    cache = null;
    multiXlsxExports = [];
    setExportControlsEnabled(false);
    summaryText = '';
    resetResultPage();
    resultBox.innerHTML = '';
    cardResult.card.style.display = 'none';
    cardFilter.card.style.display = 'none';
    runDiffTask('全比較先を比較中…', async () => {
      const resultRows: string[] = [];
      let sharedSourceBundle = importedSourceBundle;
      let exported = 0;
      let failed = 0;
      let exportFailed = 0;
      let incomplete = 0;
      for (let i = 0; i < targets.length; i += 1) {
        const t = targets[i];
        panel.setStatus(`比較中 (${i + 1}/${targets.length}) App:${t.appId}${t.guestId ? ` / Guest:${t.guestId}` : ''}`, 'busy');
        try {
          const out = await runDiffStandalone({
            source: base.source,
            target: t,
            scopes: base.scopes,
            ignoreKeys: base.ignoreKeys,
            includeSame: base.includeSame,
            normalizationPresetState: base.normalizationPresetState,
            importedSourceBundle: sharedSourceBundle,
            onSourceBundle: (bundle: any) => {
              attachKnownAppName(bundle, base.source.appName);
              sharedSourceBundle = bundle;
            },
            onStatus: (m: string) => panel.setStatus(m, 'busy')
          });
          if (!sharedSourceBundle) sharedSourceBundle = out.sourceBundle;
          attachKnownAppName(out.sourceBundle, base.source.appName);
          attachKnownAppName(out.targetBundle, t.appName);
          const counts = summarizeLiteDiffRows(out.rows || []);
          const issueCount = (out.fetchIssues || []).length;
          const partialIssueCount = (out.partialIssues || []).length;
          const needsReview = isIncompleteLiteDiff(out);
          const comparedAt = new Date().toISOString();
          if (needsReview) incomplete += 1;

          let exportNote = '';
          try {
            runExportDiffHtmlStandalone({
              rows: out.rows,
              fetchIssues: out.fetchIssues || [],
              partialIssues: out.partialIssues || [],
              sourceBundle: out.sourceBundle,
              targetBundle: out.targetBundle,
              scopes: base.scopes,
              ignoreKeys: base.ignoreKeys,
              normalizationPresetState: base.normalizationPresetState,
              truncation: out.truncation || null
            });
            exported += 1;
          } catch (e: any) {
            exportNote = ` / HTML出力失敗: ${e?.message || String(e)}`;
            exportFailed += 1;
          }
          const targetLabel = t.appName ? `${t.appName}（App ${t.appId}）` : `App ${t.appId}`;
          const multiExportIndex = multiXlsxExports.push({
            label: targetLabel,
            cache: {
              rows: out.rows || [],
              fetchIssues: out.fetchIssues || [],
              partialIssues: out.partialIssues || [],
              sourceBundle: out.sourceBundle,
              targetBundle: out.targetBundle,
              scopes: base.scopes,
              ignoreKeys: base.ignoreKeys,
              normalizationPresetState: base.normalizationPresetState,
              comparedAt,
              truncation: out.truncation || null
            }
          }) - 1;
          resultRows.push(`<tr><td>${esc(targetLabel)}<br><small>${esc(t.guestId ? `ゲスト ${t.guestId}` : '通常スペース')} / ${t.preview ? 'プレビュー' : '運用'}</small></td>` +
            `<td>${counts.actual}</td><td>${counts.added}</td><td>${counts.removed}</td><td>${counts.changed}</td><td>${counts.moved}</td><td>${issueCount}${partialIssueCount ? ` / 未検証 ${partialIssueCount}` : ''}</td>` +
            `<td class="${needsReview || exportNote ? 'kus-dl-multi__warn' : 'kus-dl-multi__ok'}">${exportNote ? '出力失敗' : (needsReview ? '要確認' : '完了')}${esc(exportNote)}</td>` +
            `<td><button type="button" class="kus-lp__btn kus-lp__btn--sub" data-kus-dl-multi-xlsx="${multiExportIndex}">Excel保存</button></td></tr>`);
        } catch (e: any) {
          failed += 1;
          const targetLabel = t.appName ? `${t.appName}（App ${t.appId}）` : `App ${t.appId}`;
          resultRows.push(`<tr><td>${esc(targetLabel)}</td><td colspan="6">—</td><td class="kus-dl-multi__warn">失敗: ${esc(e?.message || String(e))}</td><td>—</td></tr>`);
        }
      }
      cardResult.card.style.display = '';
      resultBox.innerHTML = `<div class="kus-dl-result"><table class="kus-dl-multi"><caption>複数比較の結果（比較元は最初の取得結果を再利用）</caption><thead><tr><th>比較先</th><th>差分</th><th>追加<br><small>比較先のみ</small></th><th>削除<br><small>比較元のみ</small></th><th>変更</th><th>移動</th><th>取得失敗<br><small>一部未検証</small></th><th>状態</th><th>Excel</th></tr></thead><tbody>${resultRows.join('')}</tbody></table></div>`;
      const tone = failed || exportFailed || incomplete || exported !== targets.length ? 'warn' : 'ok';
      const note = [failed ? `比較失敗 ${failed}件` : '', exportFailed ? `HTML出力失敗 ${exportFailed}件` : '', incomplete ? `要確認 ${incomplete}件` : ''].filter(Boolean).join(' / ');
      panel.setStatus(`全比較先の比較が完了: HTMLダウンロード ${exported}/${targets.length}件開始${note ? ` / ${note}` : ''}`, tone);
    });
  });

  runBtn.addEventListener('click', () => {
    cache = null;
    multiXlsxExports = [];
    setExportControlsEnabled(false);
    summaryText = '';
    resetResultPage();
    resultBox.innerHTML = '';
    cardResult.card.style.display = 'none';
    cardFilter.card.style.display = 'none';
    const f = readForm();
    if (!f.scopes.length) {
      panel.setStatus('比較セクションを 1 つ以上選択してください', 'warn');
      return;
    }
    runDiffTask('差分比較を実行中…', async () => {
      const out = await runDiffStandalone({
        source: f.source,
        target: f.target,
        scopes: f.scopes,
        ignoreKeys: f.ignoreKeys,
        includeSame: f.includeSame,
        normalizationPresetState: f.normalizationPresetState,
        importedSourceBundle,
        importedTargetBundle,
        onStatus: (m: string) => panel.setStatus(m, 'busy')
      });
      attachKnownAppName(out.sourceBundle, f.source.appName);
      attachKnownAppName(out.targetBundle, f.target.appName);
      cache = {
        rows: out.rows,
        fetchIssues: out.fetchIssues || [],
        partialIssues: out.partialIssues || [],
        sourceBundle: out.sourceBundle,
        targetBundle: out.targetBundle,
        scopes: f.scopes,
        ignoreKeys: f.ignoreKeys,
        normalizationPresetState: f.normalizationPresetState,
        comparedAt: new Date().toISOString(),
        truncation: out.truncation || null
      };
      summaryText = out.summary?.text || '完了';
      refreshFilterSectionOptions();
      rerender();
      // 比較が終わったらそのまま HTML レポートを保存する（出力ボタンを押す手間を省く）
      try {
        runExportDiffHtmlStandalone(exportCtx(true));
        const incomplete = isIncompleteLiteDiff(out);
        panel.setStatus(`${summaryText} — 差分 HTML レポートのダウンロードを開始しました`, incomplete ? 'warn' : 'ok');
      } catch (e: any) {
        panel.setStatus(`${summaryText} — HTML出力に失敗: ${e?.message || String(e)}`, 'warn');
      }
    });
  });

  bHtml.addEventListener('click', () => {
    try {
      const ctx = exportCtx();
      if (!ctx.rows.length && cache?.rows.length) {
        panel.setStatus('現在のフィルタに該当する行がありません。範囲を「全件」に戻すか、フィルタを見直してください', 'warn');
        return;
      }
      runExportDiffHtmlStandalone(ctx);
      const incomplete = isIncompleteLiteDiff(cache);
      panel.setStatus(`差分 HTML のダウンロードを開始しました（${expRange.value === 'all' ? '全件' : '表示中'}）${incomplete ? ' — 元の比較結果は不完全です' : ''}`, incomplete ? 'warn' : 'ok');
    } catch (e: any) {
      panel.setStatus(`エラー: ${e?.message || String(e)}`, 'err');
    }
  });

  let xlsxExportActive = false;
  bXlsx.addEventListener('click', async () => {
    if (xlsxExportActive) return;
    const exportStartedAt = Date.now();
    xlsxExportActive = true;
    setExportControlsEnabled(false);
    try {
      const snapshot = cache;
      if (!snapshot) throw new Error('先に差分比較を実行してください');
      const ctx = exportCtx();
      if (!ctx.rows.length && snapshot.rows.length) {
        panel.setStatus('現在のフィルタに該当する行がありません。範囲を「全件」に戻すか、フィルタを見直してください', 'warn');
        return;
      }
      panel.setStatus('差分一覧 Excel を生成中…', 'busy');
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const result = runExportDiffXlsx(buildLiteDiffXlsxContext(snapshot, ctx.rows, ctx.exportMode, ctx.exportLabel));
      const incomplete = isIncompleteLiteDiff(snapshot);
      panel.setStatus(`差分一覧 Excel のダウンロードを開始しました: ${result.filename}${incomplete ? ' — 元の比較結果は不完全です' : ''}`, incomplete ? 'warn' : 'ok');
    } catch (e: any) {
      panel.setStatus(`Excel出力エラー: ${e?.message || String(e)}`, 'err');
    } finally {
      const cooldown = XLSX_EXPORT_COOLDOWN_MS - (Date.now() - exportStartedAt);
      if (cooldown > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, cooldown));
      xlsxExportActive = false;
      setExportControlsEnabled(!!cache);
    }
  });
}
