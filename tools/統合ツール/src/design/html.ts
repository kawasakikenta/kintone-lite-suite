'use strict';

/**
 * 設計書の HTML（1 つのファイルでブラウザだけで読める。目次・フィールドの絞り込み・印刷）。
 *
 * 中身は Markdown の設計書（diff/export.ts の bundleToMarkdown）と同じ組み立て（design* の表）から作り、
 * 同じ情報・同じ言葉にする。レイアウトだけは、Excel の「フォームレイアウト」と同じくフィールド名・種類・幅も並べる。
 *
 * 安全: kintone の設定の文字列はすべて esc() で逃がす。CSP で通信・外部の読み込み・フォーム送信を禁じ、
 * 埋め込んだスクリプトとスタイルを 1 つずつ内容のハッシュで許可する（設定の文字列に HTML があっても動かない）。
 * プラグインの設定値と JS/CSS ファイルの本文は、Markdown と同じく載せない（sanitize.ts）。ブラウザストレージは使わない。
 */

import { SECTION_DEFS, TOOL_NAME, TOOL_VERSION } from '../constants.js';
import { decodeHtmlEntities, esc, stripHtmlToText, withoutApiContextLines } from '../utils.js';
import { sha256Base64 } from '../diff/export-safety.js';
import {
  DESIGN_NO_REVIEW_POINTS,
  designActionTable,
  designAppAclTable,
  designAppSettingsTable,
  designCategoryTable,
  designCustomizeAreas,
  designDocumentInfo,
  designFieldAclTables,
  designFieldTables,
  designFieldTypeLabel,
  designNotificationTable,
  designPerRecordNotificationTable,
  designPluginTable,
  designProcessTables,
  designRecordPermissionTables,
  designReminderNotificationTable,
  designReportTable,
  designReviewPoints,
  designSectionPlan,
  designStatusTable,
  designSummaryTable,
  designViewTable,
  hasDesignSectionRenderer,
  type MdRenderContext
} from '../diff/export.js';
import { isRichText, type DesignCell, type DesignTable } from './doc-text.js';
import { buildDesignSnapshot, designSnapshotStatusLabel, type DesignSnapshotSection } from './snapshot.js';
import { stripSensitiveSupplements } from './sanitize.js';
import { DESIGN_HTML_CSS, DESIGN_HTML_SCRIPT } from './html-assets.js';

export interface DesignHtmlOptions {
  /** 参照先アプリの名前（Markdown の設計書と同じ。キーは `${appId}::${guestId}` または appId）。 */
  appNames?: Record<string, string>;
  /** 見出しに出す取得元。'settings-json' は読み込んだ設定JSON、'kintone' はアプリから取得。無ければ出さない。 */
  source?: 'settings-json' | 'kintone';
  /** 作成日時（既定は今）。 */
  generatedAt?: Date;
}

/** この HTML の中で組み立てた（逃がし済みの）マークアップ。設定の値から作られることはない。 */
class TrustedMarkup {
  readonly html: string;
  constructor(html: string) {
    this.html = html;
  }
}

/** 設定の文字列を、HTML の本文として安全な形にする（文字参照を戻してから逃がす。改行は <br>）。 */
function textHtml(value: unknown): string {
  return esc(decodeHtmlEntities(value)).replace(/\r\n|\r|\n/g, '<br>');
}

/** 改行を空白にした 1 行の文字列。 */
function oneLine(value: unknown): string {
  return decodeHtmlEntities(value).replace(/\s*[\r\n]+\s*/g, ' ').trim();
}

function cellHtml(cell: DesignCell): string {
  if (cell instanceof TrustedMarkup) return cell.html;
  if (isRichText(cell)) {
    return cell.parts.map((part) => (typeof part === 'string' ? textHtml(part) : `<code>${textHtml(part.code)}</code>`)).join('');
  }
  return textHtml(cell);
}

/** フィールドの絞り込みに使う文字列（全角・半角と大文字・小文字をそろえる）。 */
export function normalizeDesignSearchText(value: unknown): string {
  let text = String(value ?? '');
  try { text = text.normalize('NFKC'); } catch { /* そのまま */ }
  return text.toLowerCase();
}

const MARK_HEADERS = new Set(['必須', '重複禁止', 'アプリ管理', '閲覧', '追加', '編集', '削除', '読込', '書出', 'レコード追加', 'レコード編集', 'コメント', 'ステータス変更', 'ファイル取込']);
const NUM_HEADERS = new Set(['表示順', '件数', 'マッピング数']);
const CODE_HEADERS = new Set(['コード', 'プラグインID', 'キー']);
const NOWRAP_HEADERS = new Set(['種別', '状態', 'チャート', 'モード']);

interface TableOptions {
  className?: string;
  /** 行に付ける属性（逃がし済み） */
  rowAttributes?: (row: DesignCell[]) => string;
  /** 絞り込みのまとまり（すべての行が隠れたら、表ごと隠す） */
  searchBlock?: boolean;
}

function tableHtml(table: DesignTable | null | undefined, options: TableOptions = {}): string {
  if (!table || !table.rows || table.rows.length === 0) return '';
  const columnClass = table.headers.map((header) => (MARK_HEADERS.has(header) ? 'col-mark' : NUM_HEADERS.has(header) ? 'col-num' : CODE_HEADERS.has(header) ? 'col-code' : NOWRAP_HEADERS.has(header) ? 'col-nowrap' : ''));
  const head = table.headers.map((header, index) => `<th scope="col"${columnClass[index] === 'col-mark' || columnClass[index] === 'col-num' ? ` class="${columnClass[index]}"` : ''}>${esc(header)}</th>`).join('');
  const body = table.rows.map((row) => {
    if (!Array.isArray(row)) return '';
    const cells = row.map((cell, index) => {
      const html = cellHtml(cell);
      return `<td data-label="${esc(table.headers[index] ?? '')}"${columnClass[index] ? ` class="${columnClass[index]}"` : ''}>${html}</td>`;
    }).join('');
    return `<tr${options.rowAttributes ? options.rowAttributes(row) : ''}>${cells}</tr>`;
  }).join('');
  return `<div class="table-wrap"${options.searchBlock ? ' data-search-block' : ''}><table class="data-table${options.className ? ` ${options.className}` : ''}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

const fieldRowAttributes = (row: DesignCell[]) => ` data-search="${esc(normalizeDesignSearchText(`${String(row[0] ?? '')} ${String(row[1] ?? '')}`))}"`;

function lead(label: string, value: string): string {
  return `<p class="sec-lead"><b>${esc(label)}</b>: ${value}</p>`;
}

function onOff(value: boolean): string {
  return `<span class="badge${value ? ' badge--ok' : ''}">${value ? '有効' : '無効'}</span>`;
}

function ownLabel(map: any, code: unknown): string {
  const key = String(code ?? '');
  if (!map || typeof map !== 'object' || !Object.prototype.hasOwnProperty.call(map, key)) return '';
  const field = map[key];
  return field && typeof field === 'object' ? oneLine(stripHtmlToText(field.label || '')) : '';
}

/** フィールドコードからフィールド名を引く（テーブル内のフィールドも探す）。 */
function fieldLabelOf(sections: any, code: unknown): string {
  const properties = sections?.fieldSettings?.properties;
  const top = ownLabel(properties, code);
  if (top) return top;
  if (!properties || typeof properties !== 'object') return '';
  for (const field of Object.values(properties) as any[]) {
    if (field?.type === 'SUBTABLE') {
      const child = ownLabel(field.fields, code);
      if (child) return child;
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// セクションの本文
// ---------------------------------------------------------------------------

function renderFields(sec: any, _sections: any, ctx: MdRenderContext): string {
  const tables = designFieldTables(sec, ctx);
  const subtableFieldCount = tables.subtables.reduce((sum, item) => sum + item.table.rows.length, 0);
  const parts: string[] = [];
  parts.push(lead('フィールド数', `${tables.fields.rows.length}${subtableFieldCount ? `（テーブル内フィールド数: ${subtableFieldCount}）` : ''}`));
  parts.push(tableHtml(tables.fields, { className: 'field-table', rowAttributes: fieldRowAttributes, searchBlock: true }));
  tables.subtables.forEach((item) => {
    const label = oneLine(item.label);
    parts.push(`<div class="subtable" data-search-block><h3>テーブル: <code>${textHtml(item.code)}</code>${label ? ` — ${esc(label)}` : ''}</h3>`);
    parts.push(tableHtml(item.table, { className: 'field-table', rowAttributes: fieldRowAttributes }));
    parts.push('</div>');
  });
  parts.push('<p class="search-empty" id="field-search-empty" hidden>一致するフィールドはありません。フィールド名・コードの一部で絞り込めます。</p>');
  return parts.join('');
}

function widthClass(width: unknown): string {
  const value = Number.parseFloat(String(width ?? ''));
  if (!Number.isFinite(value)) return '';
  return value >= 280 ? ' w-l' : value >= 150 ? ' w-m' : '';
}

function layoutCellHtml(cell: any, fields: any): string {
  if (!cell || typeof cell !== 'object') return '';
  if (cell.type === 'LABEL') {
    return `<div class="lay-cell lay-cell--deco${widthClass(cell.size?.width)}"><span class="lay-name">[ラベル]${esc(oneLine(stripHtmlToText(cell.label || '')))}</span></div>`;
  }
  if (cell.type === 'SPACER') return `<div class="lay-cell lay-cell--deco"><span class="lay-name">[スペース${cell.elementId ? `:${esc(oneLine(cell.elementId))}` : ''}]</span></div>`;
  if (cell.type === 'HR') return '<div class="lay-cell lay-cell--deco"><span class="lay-name">[罫線]</span></div>';
  const code = String(cell.code ?? '');
  const field = fields && typeof fields === 'object' && Object.prototype.hasOwnProperty.call(fields, code) ? fields[code] : null;
  const name = field ? oneLine(stripHtmlToText(field.label || '')) : '';
  const type = designFieldTypeLabel(field?.type || cell.type);
  const width = cell.size?.width;
  const meta = [
    `<code>${textHtml(code)}</code>`,
    type ? `<span>${esc(type)}</span>` : '',
    width != null && width !== '' ? `<span>幅 ${esc(String(width))}</span>` : '',
    field?.required ? '<span class="badge badge--req">必須</span>' : ''
  ].filter(Boolean).join('');
  return `<div class="lay-cell${widthClass(width)}"><span class="lay-name">${esc(name || code || '（コードなし）')}</span><span class="lay-meta">${meta}</span></div>`;
}

function layoutItemHtml(item: any, fields: any, depth: number): string {
  if (!item || typeof item !== 'object' || depth > 20) return '';
  if (item.type === 'ROW') {
    const cells = (Array.isArray(item.fields) ? item.fields : []).map((cell: any) => layoutCellHtml(cell, fields)).join('');
    return `<div class="lay-row">${cells || '<span class="lay-empty">（空）</span>'}</div>`;
  }
  if (item.type === 'SUBTABLE') {
    const code = String(item.code ?? '');
    const table = fields && typeof fields === 'object' && Object.prototype.hasOwnProperty.call(fields, code) ? fields[code] : null;
    const label = table ? oneLine(stripHtmlToText(table.label || '')) : '';
    const columns = (Array.isArray(item.fields) ? item.fields : []).map((cell: any) => layoutCellHtml(cell, table?.fields || {})).join('');
    return `<div class="lay-box"><p class="lay-box-title">テーブル: <code>${textHtml(code)}</code>${label ? ` — ${esc(label)}` : ''}</p>${columns ? `<div class="lay-row">${columns}</div>` : ''}</div>`;
  }
  if (item.type === 'GROUP') {
    const code = String(item.code ?? '');
    const label = oneLine(stripHtmlToText(item.label || (fields && typeof fields === 'object' && Object.prototype.hasOwnProperty.call(fields, code) ? fields[code]?.label : '') || ''));
    const children = (Array.isArray(item.layout) ? item.layout : []).map((child: any) => layoutItemHtml(child, fields, depth + 1)).join('');
    return `<div class="lay-box"><p class="lay-box-title">グループ: <code>${textHtml(code)}</code>${label ? ` — ${esc(label)}` : ''}</p>${children ? `<div class="lay">${children}</div>` : ''}</div>`;
  }
  return '';
}

function renderLayout(sec: any, sections: any): string {
  const layout = sec?.layout || [];
  if (!Array.isArray(layout)) throw new TypeError('レイアウトが配列ではありません');
  const fields = sections?.fieldSettings?.properties || {};
  const items = layout.map((item) => layoutItemHtml(item, fields, 0)).join('');
  return items ? `<div class="lay">${items}</div>` : '';
}

function renderProcess(sec: any): string {
  const tables = designProcessTables(sec);
  const parts = [lead('プロセス管理', onOff(tables.enabled))];
  if (tables.states) parts.push('<h3>ステータス</h3>', tableHtml(tables.states));
  if (tables.actions) parts.push('<h3>アクション</h3>', tableHtml(tables.actions));
  return parts.join('');
}

function renderCustomize(sec: any): string {
  const data = designCustomizeAreas(sec);
  const parts = [lead('適用範囲（スコープ）', textHtml(data.scopeLabel))];
  data.areas.forEach((area) => {
    parts.push(`<h3>${esc(area.label)}</h3>`);
    area.kinds.forEach((kind) => {
      parts.push(`<p><b>${esc(kind.label)}</b></p><ul class="plain-list">`);
      kind.items.forEach((item) => {
        parts.push(`<li><b>${textHtml(item.typeLabel || '(種別不明)')}</b>: ${textHtml(oneLine(item.src))}</li>`);
      });
      parts.push('</ul>');
    });
  });
  return parts.join('');
}

function renderFieldAcl(sec: any, sections: any): string {
  return designFieldAclTables(sec).map((item) => {
    const label = fieldLabelOf(sections, item.code);
    return `<h3><code>${textHtml(item.code)}</code>${label ? ` — ${esc(label)}` : ''}</h3>${tableHtml(item.table)}`;
  }).join('');
}

function renderRecordPermissions(sec: any): string {
  return designRecordPermissionTables(sec).map((item) => (
    `<h3>条件 ${item.index + 1}${item.filterCond ? `: <code>${textHtml(oneLine(item.filterCond))}</code>` : ''}</h3>${tableHtml(item.table)}`
  )).join('');
}

function renderNotifications(sec: any): string {
  const data = designNotificationTable(sec);
  return `${data.notifyToCommenter != null ? lead('コメント投稿者へ通知', onOff(data.notifyToCommenter)) : ''}${tableHtml(data.table)}`;
}

function renderReminders(sec: any): string {
  const data = designReminderNotificationTable(sec);
  return `${data.timezone ? lead('タイムゾーン', esc(oneLine(data.timezone))) : ''}${tableHtml(data.table)}`;
}

function renderCategories(sec: any): string {
  const data = designCategoryTable(sec);
  return `${lead('カテゴリー機能', onOff(data.enabled))}${tableHtml(data.table)}`;
}

/** セクションの本文。キーの組は Markdown の設計書と同じ（hasDesignSectionRenderer）。 */
export const DESIGN_HTML_SECTION_RENDERERS: Record<string, (sec: any, sections: any, ctx: MdRenderContext) => string> = {
  appSettings: (sec) => tableHtml(designAppSettingsTable(sec)),
  fieldSettings: renderFields,
  layoutSettings: renderLayout,
  viewSettings: (sec) => tableHtml(designViewTable(sec)),
  reportSettings: (sec) => tableHtml(designReportTable(sec)),
  processSettings: renderProcess,
  pluginSettings: (sec) => tableHtml(designPluginTable(sec)),
  customizeSettings: renderCustomize,
  actionSettings: (sec, _sections, ctx) => tableHtml(designActionTable(sec, ctx)),
  appAcl: (sec) => tableHtml(designAppAclTable(sec)),
  fieldAcl: renderFieldAcl,
  recordPermissions: renderRecordPermissions,
  notifications: renderNotifications,
  perRecordNotifications: (sec) => tableHtml(designPerRecordNotificationTable(sec)),
  reminderNotifications: renderReminders,
  categories: renderCategories
};

// ---------------------------------------------------------------------------
// 見出し・目次・ページ
// ---------------------------------------------------------------------------

/** 目次の分け方（Excel のシートの分類と同じ言葉）。順番は設計書のセクションの順と同じ。 */
const TOC_GROUPS: Array<{ label: string; keys: string[] }> = [
  { label: '基本', keys: ['appSettings', 'appInfo', 'fieldSettings', 'layoutSettings', 'formSettings', 'viewSettings', 'reportSettings'] },
  { label: 'プロセス', keys: ['processSettings'] },
  { label: 'カスタマイズ・連携', keys: ['pluginSettings', 'customizeSettings', 'actionSettings'] },
  { label: '権限', keys: ['appAcl', 'fieldAcl', 'recordPermissions'] },
  { label: '通知', keys: ['notifications', 'perRecordNotifications', 'reminderNotifications'] },
  { label: 'その他', keys: ['categories'] }
];

function statusBadge(row: DesignSnapshotSection | undefined): string {
  if (!row) return '';
  const label = designSnapshotStatusLabel(row.status);
  const tone = row.status === 'fetch-error' ? ' badge--err' : row.status === 'partial' ? ' badge--warn' : row.status === 'missing' ? ' badge--missing' : row.status === 'available' ? ' badge--ok' : '';
  return `<span class="badge${tone}" data-status="${esc(row.status)}">${esc(label)}</span>`;
}

function countBadge(row: DesignSnapshotSection | undefined): string {
  if (!row) return '';
  if (row.status === 'available') return row.count == null ? '' : `<span class="badge">${esc(String(row.count))}件</span>`;
  return statusBadge(row);
}

/** CSS の文字列（@page の見出し）。英数字以外はすべて 16 進の文字参照にする（`</style>` などを作らない）。 */
function cssString(value: string): string {
  let out = '"';
  for (const ch of value) out += /[0-9A-Za-z]/.test(ch) ? ch : `\\${(ch.codePointAt(0) || 0x3f).toString(16)} `;
  return `${out}"`;
}

function truncate(value: string, max: number): string {
  const chars = Array.from(value);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : value;
}

function readableTime(date: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}`;
}

function rawJsonHtml(sec: any): string {
  let body = '';
  try { body = JSON.stringify(sec, null, 2); } catch { body = String(sec); }
  if (body == null) body = String(sec);
  return `<details class="raw"><summary>APIレスポンス（生データ）</summary><pre>${esc(body)}</pre></details>`;
}

/** 設定の 1 つのセクションの本文（Markdown の設計書と同じ判断で、取得失敗・部分取得・空・整形表示なしを出し分ける）。 */
function sectionHtml(def: { key: string; label: string }, sec: any, sections: any, ctx: MdRenderContext, row: DesignSnapshotSection | undefined): string {
  const renderer = DESIGN_HTML_SECTION_RENDERERS[def.key];
  const plan = designSectionPlan(sec, row, hasDesignSectionRenderer(def.key));
  const parts: string[] = [];
  parts.push(`<section class="doc-section" id="sec-${def.key}" aria-labelledby="h-${def.key}">`);
  parts.push(`<div class="sec-head"><h2 id="h-${def.key}">${esc(def.label)}</h2>${countBadge(row)}<span class="sec-key">${esc(def.key)}</span></div>`);
  if (plan.fetchError !== null) {
    // 内部の通信情報の行（[API] GET …）は出さない（ER図と同じ。生データ（原文）にだけ残る）
    parts.push(`<div class="notice notice--err" role="note">⚠ 取得できませんでした: ${esc(oneLine(withoutApiContextLines(plan.fetchError)))}</div>`);
    if (plan.mode === 'none') {
      parts.push('</section>');
      return parts.join('');
    }
  }
  const render = (): string => {
    if (!renderer) return '';
    try { return renderer(sec, sections, ctx) || ''; } catch { return ''; }
  };
  if (plan.mode === 'fetch-error') {
    parts.push(`<p class="sec-note">（取得失敗: ${esc(oneLine(plan.detail))}）</p>`);
  } else if (plan.mode === 'partial') {
    parts.push(`<div class="notice notice--warn" role="note">（部分取得: ${textHtml(plan.detail)}）</div>`);
    parts.push(render());
  } else if (plan.mode === 'empty') {
    parts.push('<p class="sec-note">（設定コレクションは空です）</p>');
  } else if (plan.mode === 'unsupported') {
    parts.push('<p class="sec-note">（整形表示は未対応です。設定データは下の原文を参照してください）</p>');
  } else {
    const rendered = render();
    parts.push(rendered.trim() ? rendered : '<p class="sec-note">（整形表示できる項目はありません。設定データは下の原文を参照してください）</p>');
  }
  parts.push(rawJsonHtml(sec));
  parts.push('</section>');
  return parts.join('');
}

/** 取得できなかった・一部だけ取得したセクションの理由（1 行目。内部の通信情報の行は除く）。 */
function reasonOf(row: DesignSnapshotSection): string {
  const first = withoutApiContextLines(row.detail).split(/\r?\n/).map((line) => line.trim()).find(Boolean) || '';
  return first.replace(/^取得失敗:\s*/, '');
}

function cspFor(css: string, script: string | null): string {
  return [
    "default-src 'none'",
    script === null ? "script-src 'none'" : `script-src 'sha256-${sha256Base64(script)}'`,
    `style-src 'sha256-${sha256Base64(css)}'`,
    "img-src 'none'",
    "font-src 'none'",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
    "require-trusted-types-for 'script'"
  ].join('; ');
}

/** 一括出力（ZIP）のサマリの表の見出し（overview.md と overview.html で同じ）。 */
export const BATCH_DESIGN_OVERVIEW_HEADERS = ['アプリID', 'アプリ名', 'ゲストスペース', '取得元', '状態', '出力ファイル', '備考・エラー'] as const;

/** 一括出力（ZIP）のサマリの中身。値は逃がす前の文字列。 */
export interface BatchDesignOverviewModel {
  /** 生成日時・出力形式・参照環境・対象アプリ数 */
  facts: Array<[string, string]>;
  notes: string[];
  rows: Array<{ appId: string; appName: string; guest: string; source: string; status: string; ok: boolean; files: string[]; remarks: string }>;
}

/**
 * 一括出力（HTML の ZIP）の overview.html。各アプリの設計書 HTML（同じ ZIP の中のファイル）へのリンクを持つ。
 * スクリプトは持たない（CSP で禁じる）。
 */
export function buildBatchDesignHtmlOverview(model: BatchDesignOverviewModel): string {
  const css = DESIGN_HTML_CSS;
  const rows = model.rows.map((row) => {
    const files = row.files.map((file) => `<a href="${esc(encodeURIComponent(file))}">${esc(file)}</a>`).join('<br>');
    const status = `<span class="badge${!row.ok ? ' badge--err' : row.status === '成功' ? ' badge--ok' : ' badge--warn'}">${esc(row.status)}</span>`;
    const cells = [esc(row.appId), esc(oneLine(row.appName)), esc(row.guest), esc(row.source), status, files, esc(oneLine(row.remarks))];
    return `<tr>${cells.map((cell, index) => `<td data-label="${esc(BATCH_DESIGN_OVERVIEW_HEADERS[index])}"${index === 0 ? ' class="col-code"' : ''}>${cell}</td>`).join('')}</tr>`;
  }).join('');
  const table = `<div class="table-wrap"><table class="data-table"><thead><tr>${BATCH_DESIGN_OVERVIEW_HEADERS.map((header) => `<th scope="col">${esc(header)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  const facts = model.facts.map(([label, value]) => `<div class="fact"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('');
  const notes = model.notes.length ? `<div class="notice notice--warn" role="note"><ul>${model.notes.map((note) => `<li>${esc(note)}</li>`).join('')}</ul></div>` : '';
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${cspFor(css, null)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="referrer" content="no-referrer">
<meta name="generator" content="${esc(`${TOOL_NAME} ${TOOL_VERSION}`)}">
<title>設計書 HTML 一括出力サマリ</title>
<style>${css}</style>
</head>
<body>
<main id="main">
<header class="doc-head"><p class="doc-kicker">kintone 設計書</p><h1 class="doc-title">設計書 HTML 一括出力サマリ</h1><dl class="facts">${facts}</dl>${notes}</header>
<section class="doc-section" aria-labelledby="h-apps"><div class="sec-head"><h2 id="h-apps">アプリ一覧</h2></div><p class="sec-note">アプリごとの設計書は、この ZIP の中の HTML ファイルです。ZIP を展開してから開いてください。</p>${table}</section>
<footer class="doc-foot">${esc(TOOL_NAME)} ${esc(TOOL_VERSION)} で作成しました。この HTML は通信せずにブラウザだけで読めます。</footer>
</main>
</body>
</html>
`;
}

/**
 * 設計書の HTML を組み立てる。入力の設定は変えない。
 * プラグインの設定値と JS/CSS ファイルの本文は、原文（APIレスポンス）にも載せない。
 */
export function buildDesignHtml(inputBundle: any, options: DesignHtmlOptions = {}): string {
  const bundle = stripSensitiveSupplements(inputBundle).bundle;
  const sections = bundle?.sections || ({} as any);
  const ctx: MdRenderContext = { appNames: options.appNames || {}, guestId: String(bundle?.guestId ?? '') };
  const snapshot = buildDesignSnapshot(bundle);
  const rowByKey = new Map(snapshot.sections.map((row) => [row.key, row]));
  const info = designDocumentInfo(bundle);
  const appId = String(bundle?.appId ?? '').trim();
  const appName = oneLine(info.appName);
  const generatedAt = options.generatedAt instanceof Date && !Number.isNaN(options.generatedAt.getTime()) ? options.generatedAt : new Date();
  const knownKeys = new Set(SECTION_DEFS.map((def) => def.key));
  const knownRows = snapshot.sections.filter((row) => knownKeys.has(row.key));
  const incompleteRows = knownRows.filter((row) => row.status === 'fetch-error' || row.status === 'partial' || row.status === 'missing');
  const countOf = (status: string) => knownRows.filter((row) => row.status === status).length;
  const shown = SECTION_DEFS.filter((def) => Object.prototype.hasOwnProperty.call(sections, def.key) && sections[def.key] != null);
  const shownKeys = new Set(shown.map((def) => def.key));
  const fieldRowCount = (() => {
    if (!shownKeys.has('fieldSettings')) return 0;
    try {
      const tables = designFieldTables(sections.fieldSettings, ctx);
      return tables.fields.rows.length + tables.subtables.reduce((sum, item) => sum + item.table.rows.length, 0);
    } catch {
      return 0;
    }
  })();

  // ---- 見出し ----
  const acquisitionParts = [
    countOf('fetch-error') ? `取得失敗 ${countOf('fetch-error')}` : '',
    countOf('partial') ? `部分取得 ${countOf('partial')}` : '',
    countOf('missing') ? `未取得 ${countOf('missing')}` : ''
  ].filter(Boolean);
  const acquisition = acquisitionParts.length
    ? `<span class="badge ${countOf('fetch-error') ? 'badge--err' : 'badge--warn'}">基本設定${SECTION_DEFS.length}種：未完了</span> ${esc(acquisitionParts.join('・'))}`
    : `<span class="badge badge--ok">基本設定${SECTION_DEFS.length}種：完了</span>`;
  const facts: string[] = [];
  for (const [label, value] of info.table.rows as Array<[string, unknown]>) {
    if (label === 'アプリ名' || label === '取得できなかったセクション') continue;
    facts.push(`<div class="fact"><dt>${esc(label)}</dt><dd>${textHtml(value)}</dd></div>`);
  }
  facts.push(`<div class="fact"><dt>取得状態</dt><dd>${acquisition}</dd></div>`);
  if (options.source) facts.push(`<div class="fact"><dt>取得元</dt><dd>${options.source === 'settings-json' ? '読み込んだ設定JSON' : 'アプリから取得'}</dd></div>`);
  facts.push(`<div class="fact"><dt>作成日時</dt><dd>${esc(readableTime(generatedAt))}</dd></div>`);
  facts.push('<div class="fact print-only" hidden><dt>印刷日時</dt><dd id="printed-at"></dd></div>');
  facts.push(`<div class="fact fact--wide"><dt>取得できなかったセクション</dt><dd>${info.failedSectionLabels.length ? esc(info.failedSectionLabels.join('、')) : 'なし'}</dd></div>`);
  const incompleteNotice = incompleteRows.length
    ? `<div class="notice ${countOf('fetch-error') ? 'notice--err' : 'notice--warn'}" role="note"><b>取得できていない設定があります（${esc(acquisitionParts.join('・'))}）。</b>取得できていない設定の値は、0件や無効を意味しません。<ul>${incompleteRows.map((row) => {
      const label = shownKeys.has(row.key) ? `<a href="#sec-${esc(row.key)}">${esc(row.label)}</a>` : `<a href="#sec-status">${esc(row.label)}</a>`;
      const reason = reasonOf(row);
      return `<li>${label}（${esc(designSnapshotStatusLabel(row.status))}）${reason ? `: ${esc(reason)}` : ''}</li>`;
    }).join('')}</ul></div>`
    : '';
  const head = `<header class="doc-head" id="sec-head"><p class="doc-kicker">kintone アプリ設計書</p><h1 class="doc-title">${esc(appName || '（取得なし）')}</h1><dl class="facts">${facts.join('')}</dl>${incompleteNotice}</header>`;

  // ---- 取得状態・サマリー・確認ポイント ----
  const statusTable = designStatusTable(snapshot);
  statusTable.rows = statusTable.rows.map((row, index) => {
    const next = [...row];
    next[2] = new TrustedMarkup(statusBadge(snapshot.sections[index]));
    return next;
  });
  const overview: string[] = [];
  overview.push(`<section class="doc-section" id="sec-status" aria-labelledby="h-status"><div class="sec-head"><h2 id="h-status">取得状態</h2></div>${tableHtml(statusTable)}</section>`);
  const summary = designSummaryTable(bundle);
  if (summary.rows.length) {
    overview.push(`<section class="doc-section" id="sec-summary" aria-labelledby="h-summary"><div class="sec-head"><h2 id="h-summary">サマリー</h2></div><dl class="tiles">${summary.rows.map((row) => `<div class="tile"><dt>${textHtml(row[0])}</dt><dd>${textHtml(row[1])}</dd></div>`).join('')}</dl></section>`);
  }
  const points = designReviewPoints(bundle);
  overview.push(`<section class="doc-section" id="sec-review" aria-labelledby="h-review"><div class="sec-head"><h2 id="h-review">確認ポイント</h2></div><ul class="points">${(points.length ? points : [DESIGN_NO_REVIEW_POINTS]).map((point) => `<li>${esc(point)}</li>`).join('')}</ul></section>`);

  // ---- 各セクション ----
  const body = shown.map((def) => sectionHtml(def, sections[def.key], sections, ctx, rowByKey.get(def.key))).join('');

  // ---- 目次 ----
  const tocLink = (id: string, label: string, extra = '') => `<li><a href="#${esc(id)}"><span class="toc-label">${esc(label)}</span>${extra}</a></li>`;
  const tocCount = (row: DesignSnapshotSection | undefined) => {
    if (!row) return '';
    if (row.status === 'available') return row.count == null ? '' : `<span class="toc-count">${esc(String(row.count))}</span>`;
    return statusBadge(row);
  };
  const tocParts: string[] = [];
  tocParts.push(`<ol>${tocLink('sec-head', 'アプリの情報')}${tocLink('sec-status', '取得状態')}${summary.rows.length ? tocLink('sec-summary', 'サマリー') : ''}${tocLink('sec-review', '確認ポイント')}</ol>`);
  for (const group of TOC_GROUPS) {
    const defs = shown.filter((def) => group.keys.includes(def.key));
    if (!defs.length) continue;
    tocParts.push(`<p class="toc-group">${esc(group.label)}</p><ol>${defs.map((def) => tocLink(`sec-${def.key}`, def.label, tocCount(rowByKey.get(def.key)))).join('')}</ol>`);
  }
  const toc = `<nav class="toc" id="toc" aria-label="目次"><div class="toc-head"><p class="toc-title">目次</p><button type="button" class="tb toc-close" id="toc-close" aria-label="目次を閉じる">×</button></div>${tocParts.join('')}</nav>`;

  // ---- 上部の操作バー ----
  const envShort = bundle && Object.prototype.hasOwnProperty.call(bundle, 'preview') && bundle.preview != null ? (bundle.preview ? 'プレビュー' : '本番') : '';
  const sub = [appId ? `App ${appId}` : '', envShort, options.source === 'settings-json' ? '設定JSONから作成' : ''].filter(Boolean).join(' · ');
  const search = fieldRowCount
    ? `<div class="search-wrap" role="search" data-js-only hidden><label class="sr-only" for="field-search">フィールド名・コードで絞り込む</label><input id="field-search" type="search" placeholder="フィールド名・コードで絞り込み" autocomplete="off" spellcheck="false" aria-describedby="field-search-meta"><a class="search-meta" id="field-search-meta" href="#sec-fieldSettings" aria-live="polite">${fieldRowCount} 件</a></div>`
    : '';
  const topbar = `<header class="topbar"><button type="button" class="tb" id="toc-toggle" aria-controls="toc" aria-expanded="false" data-js-only hidden><span aria-hidden="true">☰</span><span class="tb-label">目次</span></button><div class="brand"><p class="brand-title">kintone アプリ設計書<small>${esc(appName)}</small></p><p class="brand-sub">${esc(sub)}</p></div>${search}<div class="tb-actions" data-js-only hidden><button type="button" class="tb" id="theme-btn" aria-pressed="false" aria-label="暗い配色に切り替える" title="配色を切り替える（保存しません）"><span aria-hidden="true">◐</span><span class="tb-label">暗い配色</span></button><button type="button" class="tb" id="print-btn" title="印刷（目次と操作の部品は印刷しません）"><span aria-hidden="true">⎙</span><span class="tb-label">印刷</span></button></div></header>`;

  const foot = `<footer class="doc-foot">${esc(TOOL_NAME)} ${esc(TOOL_VERSION)} で、kintone の設定を読み取って作成しました（${esc(readableTime(generatedAt))}）。プラグインの設定値と JS/CSS ファイルの本文は載せていません。この HTML は通信せずにブラウザだけで読めます。</footer>`;

  // 印刷するページの上に、アプリ名を見出しとして出す（対応するブラウザだけ。目次の代わり）
  const pageTitle = truncate(`kintone アプリ設計書 ${appName || ''}${appId ? `（App ${appId}）` : ''}`, 90);
  const css = `${DESIGN_HTML_CSS}\n@media print{@page{size:A4 landscape;margin:12mm 10mm;@top-left{content:${cssString(pageTitle)};font-size:8pt;color:#475569;}@bottom-right{content:counter(page) " / " counter(pages);font-size:8pt;color:#475569;}}}`;
  const script = DESIGN_HTML_SCRIPT;
  // 自己完結の設計書なので、外部への通信・読み込み・フォーム送信・<base> を禁じ、埋め込んだスクリプトとスタイルだけを内容のハッシュで許可する。
  const contentSecurityPolicy = cspFor(css, script);
  const title = `設計書 ${appName || ''}${appId ? `（App ${appId}）` : ''}`.trim();

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="referrer" content="no-referrer">
<meta name="generator" content="${esc(`${TOOL_NAME} ${TOOL_VERSION}`)}">
<title>${esc(title)}</title>
<style>${css}</style>
</head>
<body>
<a class="skip" href="#main">本文へ移動</a>
${topbar}
<div class="layout">
${toc}
<div class="toc-backdrop" id="toc-backdrop"></div>
<main id="main" tabindex="-1">
${head}
${overview.join('\n')}
${body}
${foot}
</main>
</div>
<script>${script}</script>
</body>
</html>
`;
}
