'use strict';

/**
 * 差分の選択・修正（reflect/selection*.ts）の表示用の名前と値の文字列。DOM 非依存。
 * 項目名は diff/label-dict.ts（FIELD_SETTING_LABELS など）と reflect/sections.ts（APP_SETTINGS_LABELS）、
 * 選択肢の表示名は kintone-enums.ts を使い、画面・Excel・Markdown と同じ名称にそろえる。
 */

import {
  ALIGN_JP, APP_THEME_JP, CHART_MODE_JP, CHART_TYPE_JP, CUSTOMIZE_SCOPE_JP, ENTITY_TYPE_JP, FIELD_TYPE_JP,
  LINK_PROTOCOL_JP, NUMBER_FORMAT_JP, ROUNDING_MODE_JP, TITLE_SELECTION_JP, UNIT_POSITION_JP,
  VIEW_BUILTIN_TYPE_JP, VIEW_DEVICE_JP, VIEW_TYPE_JP
} from '../kintone-enums.js';
import { FIELD_SETTING_LABELS, labelOfProp } from '../diff/label-dict.js';
import { APP_SETTINGS_LABELS } from './sections.js';
import { isPlainObject, own } from './selectionPointer.js';

const MAX_TEXT = 80;

export function clipText(text: string, max = MAX_TEXT): string {
  if (text.length <= max) return text;
  const chars = Array.from(text);
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join('')}…`;
}

/** 「表示名（コード）」。表示名が無い、またはコードと同じならコードだけ。 */
export function fieldDisplayName(code: string, fieldLabels: Record<string, string>, hint?: unknown): string {
  const label = typeof hint === 'string' && hint ? hint : own(fieldLabels, code) ? fieldLabels[code] : '';
  return label && label !== code ? `${label}（${code}）` : code;
}

const VIEW_LABELS: Record<string, string> = {
  fields: '表示フィールド', sort: '並び順', filterCond: '絞り込み条件', type: '一覧の種類', date: '日付フィールド', title: 'タイトルフィールド',
  html: 'HTML', pager: 'ページ送りの表示', device: '表示するデバイス', builtinType: '標準一覧の種類', index: '表示順', name: '名前', views: '一覧'
};
const REPORT_LABELS: Record<string, string> = {
  chartType: 'グラフの種類', chartMode: 'モード', groups: '分類', aggregations: '集計', sorts: '並び順', filterCond: '絞り込み条件',
  periodicReport: '定期レポート', index: '表示順', name: '名前', reports: 'グラフ'
};
const ACTION_LABELS: Record<string, string> = {
  filterCond: '実行条件', entities: '実行できる対象', destApp: 'コピー先アプリ', mappings: 'フィールド対応', index: '表示順', name: '名前', actions: 'アクション'
};
const PROCESS_LABELS: Record<string, string> = {
  enable: 'プロセス管理の有効化', states: 'ステータス', actions: 'アクション', assignee: '作業者', index: '表示順', name: '名前'
};
const CATEGORY_LABELS: Record<string, string> = {
  enabled: 'カテゴリー機能', categories: 'カテゴリー', children: '下の階層のカテゴリー', index: '表示順', name: '名前'
};
const CUSTOMIZE_LABELS: Record<string, string> = { scope: '適用範囲', desktop: 'PC', mobile: 'モバイル', js: 'JS', css: 'CSS' };
const OTHER_TOP_LABELS: Record<string, Record<string, string>> = {
  appAcl: { rights: 'アプリのアクセス権' },
  fieldAcl: { rights: 'フィールドのアクセス権' },
  recordPermissions: { rights: 'レコードのアクセス権' },
  notifications: { notifications: '通知' },
  perRecordNotifications: { notifications: 'レコード条件通知' },
  reminderNotifications: { notifications: 'リマインダー通知' },
  layoutSettings: { layout: 'レイアウト' },
  pluginSettings: { plugins: 'プラグイン' }
};
const SECTION_KEY_LABELS: Record<string, Record<string, string>> = {
  viewSettings: VIEW_LABELS, reportSettings: REPORT_LABELS, actionSettings: ACTION_LABELS, processSettings: PROCESS_LABELS,
  categories: CATEGORY_LABELS, customizeSettings: CUSTOMIZE_LABELS, appSettings: APP_SETTINGS_LABELS, fieldSettings: FIELD_SETTING_LABELS,
  ...OTHER_TOP_LABELS
};

/** 設定の項目（キー）の利用者向けの名前。辞書に無ければ共通の項目名辞書、それも無ければキーのまま。 */
export function keyLabel(sectionKey: string, key: string): string {
  const table = SECTION_KEY_LABELS[sectionKey];
  if (table && own(table, key)) return table[key];
  return labelOfProp(key);
}

const MONTH_OPTIONS: Array<[string, string]> = Array.from({ length: 12 }, (_value, index) => [String(index + 1), `${index + 1}月`]);

const SELECT_BY_KEY: Record<string, Record<string, string>> = {
  theme: APP_THEME_JP, roundingMode: ROUNDING_MODE_JP, scope: CUSTOMIZE_SCOPE_JP, align: ALIGN_JP, unitPosition: UNIT_POSITION_JP,
  protocol: LINK_PROTOCOL_JP, format: NUMBER_FORMAT_JP, chartType: CHART_TYPE_JP, chartMode: CHART_MODE_JP,
  builtinType: VIEW_BUILTIN_TYPE_JP, device: VIEW_DEVICE_JP, selectionMode: TITLE_SELECTION_JP
};

/** 値が選択肢で決まる設定の選択肢（値, 表示名）。値が既知の選択肢にないときは undefined（入力欄にする）。 */
export function selectOptionsFor(sectionKey: string, key: string, value: unknown): Array<[string, string]> | undefined {
  let options: Array<[string, string]> | undefined;
  if (key === 'firstMonthOfFiscalYear') options = MONTH_OPTIONS;
  else if (key === 'type' && sectionKey === 'viewSettings') options = Object.entries(VIEW_TYPE_JP);
  else if (own(SELECT_BY_KEY, key)) options = Object.entries(SELECT_BY_KEY[key]);
  if (!options) return undefined;
  return typeof value === 'string' && options.some(([option]) => option === value) ? options : undefined;
}

function enumText(sectionKey: string, key: string, value: string): string | undefined {
  if (key === 'firstMonthOfFiscalYear') return /^\d+$/.test(value) ? `${Number(value)}月` : undefined;
  if (key === 'type') {
    const dict = sectionKey === 'viewSettings' ? VIEW_TYPE_JP : sectionKey === 'fieldSettings' ? FIELD_TYPE_JP : undefined;
    return dict && own(dict, value) ? dict[value] : undefined;
  }
  const dict = own(SELECT_BY_KEY, key) ? SELECT_BY_KEY[key] : undefined;
  return dict && own(dict, value) ? dict[value] : undefined;
}

export interface TextContext { sectionKey: string; fieldLabels: Record<string, string>; fileNames?: Record<string, string> }

function entityName(entity: any): string {
  if (!isPlainObject(entity)) return String(entity);
  const type = String(entity.type || ''), code = String(entity.code ?? '');
  const typeText = own(ENTITY_TYPE_JP, type) ? ENTITY_TYPE_JP[type] : type === 'DEPARTMENT' ? '組織' : type;
  return code ? `${typeText}「${code}」` : typeText || '対象';
}

/** 配列の 1 要素の短い名前。 */
function elementName(element: any, key: string, ctx: TextContext): string {
  if (typeof element === 'string') return ctx.sectionKey === 'viewSettings' && key === 'fields' ? fieldDisplayName(element, ctx.fieldLabels) : element;
  if (!isPlainObject(element)) return String(element);
  if (ctx.sectionKey === 'customizeSettings') {
    if (element.type === 'URL') return String(element.url ?? '');
    const fileKey = String(element.file?.fileKey ?? '');
    return element.file?.name || (ctx.fileNames && own(ctx.fileNames, fileKey) ? ctx.fileNames[fileKey] : '') || 'アップロードファイル';
  }
  if (isPlainObject(element.entity)) return entityName(element.entity);
  if (ctx.sectionKey === 'fieldAcl' && element.code) return fieldDisplayName(String(element.code), ctx.fieldLabels);
  if (ctx.sectionKey === 'processSettings' && key === 'actions') return `${element.name ?? '（名称なし）'}（${element.from ?? '?'} → ${element.to ?? '?'}）`;
  if (ctx.sectionKey === 'recordPermissions' && typeof element.filterCond === 'string') return element.filterCond ? `条件「${clipText(element.filterCond, 30)}」` : '条件なし';
  if (key === 'groups' || key === 'aggregations') return String(element.code ?? element.type ?? JSON.stringify(element));
  if (typeof element.name === 'string' && element.name) return element.name;
  if (typeof element.code === 'string' && element.code) return element.code;
  if (typeof element.type === 'string' && element.type) return element.type;
  return clipText(JSON.stringify(element), 30);
}

function layoutText(layout: any[]): string {
  let fields = 0;
  const walk = (nodes: any[]) => {
    for (const node of nodes) {
      if (!isPlainObject(node)) continue;
      if (typeof node.code === 'string' && node.code && node.type !== 'GROUP' && node.type !== 'SUBTABLE') fields += 1;
      if (Array.isArray(node.fields)) walk(node.fields);
      if (Array.isArray(node.layout)) walk(node.layout);
    }
  };
  walk(layout);
  return `${layout.length} 行・フィールド ${fields} 個`;
}

/** 設定値を利用者が読める 1 行の文字列にする。長い値は省略する。 */
export function describeValue(key: string, value: unknown, ctx: TextContext): string {
  if (value === undefined || value === null) return '（なし）';
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (value === '') return '（空）';
    return clipText(enumText(ctx.sectionKey, key, value) ?? value);
  }
  if (Array.isArray(value)) {
    if (!value.length) return '（空）';
    if (ctx.sectionKey === 'layoutSettings' && key === 'layout') return layoutText(value);
    const names = value.map(element => elementName(element, key, ctx));
    const joined = names.join('、');
    const objects = value.some(isPlainObject);
    return clipText(objects || value.length > 3 ? `${value.length}件（${joined}）` : joined);
  }
  if (isPlainObject(value)) {
    if (ctx.sectionKey === 'appSettings' && key === 'titleField') {
      const mode = typeof value.selectionMode === 'string' ? enumText(ctx.sectionKey, 'selectionMode', value.selectionMode) ?? value.selectionMode : '';
      return value.code ? `${mode}（${fieldDisplayName(String(value.code), ctx.fieldLabels)}）` : String(mode || '（なし）');
    }
    if ((key === 'lookup' || key === 'referenceTable') && isPlainObject(value.relatedApp)) {
      const keyField = typeof value.relatedKeyField === 'string' && value.relatedKeyField ? `（${value.relatedKeyField}）` : '';
      return clipText(`参照するアプリ ${String(value.relatedApp.app ?? '?')}${keyField}`);
    }
    return clipText(JSON.stringify(value));
  }
  return clipText(String(value));
}

/** まとまりごと追加・削除する要素の短い説明。 */
export function describeWholeElement(sectionKey: string, tokens: readonly string[], value: unknown, ctx: TextContext): string {
  if (value === undefined) return '（なし）';
  if (!isPlainObject(value)) return describeValue(tokens[tokens.length - 1] ?? '', value, ctx);
  if (sectionKey === 'fieldSettings' && typeof value.type === 'string' && !tokens.includes('options')) {
    const type = own(FIELD_TYPE_JP, value.type) ? FIELD_TYPE_JP[value.type] : value.type;
    const extra = value.type === 'SUBTABLE' && isPlainObject(value.fields) ? `（テーブル内フィールド ${Object.keys(value.fields).length}個）` : value.required === true ? '（必須）' : '';
    return `${type}${extra}`;
  }
  if (sectionKey === 'viewSettings' && typeof value.type === 'string') return own(VIEW_TYPE_JP, value.type) ? VIEW_TYPE_JP[value.type] : value.type;
  if (sectionKey === 'reportSettings' && typeof value.chartType === 'string') return own(CHART_TYPE_JP, value.chartType) ? CHART_TYPE_JP[value.chartType] : value.chartType;
  if (sectionKey === 'processSettings' && tokens[0] === 'states') return 'ステータス';
  if (tokens.includes('options')) return String(tokens[tokens.length - 1]);
  if (sectionKey === 'categories') return 'カテゴリー';
  return clipText(JSON.stringify(value));
}
