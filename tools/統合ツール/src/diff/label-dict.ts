'use strict';

/**
 * 差分表示用の辞書（値・プロパティ・セクション）。
 *
 * 行一覧モード / セクション別ビュー / Markdown 出力 / 検索インデックスの
 * すべてから参照する単一のエントリポイント。kintone API が返す内部キー
 * (`recordViewable`, `accessibility=WRITE`, `entity.type=GROUP` 等) を
 * 日本語ラベル＋アイコンに変換することで「JSON 内部用語の露出」を排除する。
 *
 * 対象は **enum 値** と **プロパティ名** に限定する。自由文字列（`filterCond`
 * の中身、ユーザー入力名）は辞書化しない（膨張防止と意味のずれ防止）。
 */

import {
  VIEW_BUILTIN_TYPE_JP, VIEW_DEVICE_JP, GROUP_PER_JP, CHART_MODE_JP,
  REPORT_SORT_BY_JP, REPORT_SORT_ORDER_JP, PERIODIC_REPORT_EVERY_JP, DAY_OF_WEEK_JP,
  PROCESS_ASSIGNEE_TYPE_JP, ICON_TYPE_JP, AGGREGATION_TYPE_JP, RESOURCE_TYPE_JP,
  CUSTOMIZE_SCOPE_JP, APP_THEME_JP, TITLE_SELECTION_JP, ROUNDING_MODE_JP
} from '../kintone-enums.js';

export interface PropMeta {
  label: string;
  icon?: string;
}

// ---------------------------------------------------------------------------
// 値辞書 (enum 値の日本語化)
// ---------------------------------------------------------------------------

export const VALUE_LABELS: Record<string, Record<string, string>> = {
  // entity.type
  'entity.type': {
    USER: '👤 ユーザー',
    GROUP: '👥 グループ',
    ORGANIZATION: '🏢 部署',
    DEPARTMENT: '🏢 部署',
    DEPT: '🏢 部署',
    CREATOR: '✏️ 作成者',
    MODIFIER: '✏️ 更新者',
    FUNCTION: '⚙ 関数',
    LOGIN_USER: '👤 ログインユーザー',
    ALL: '🌐 全員',
    FIELD_ENTITY: '🔗 フィールド',
    EVERYONE: '🌐 全員',
    CUSTOM_FIELD: '🔗 ユーザー選択フィールド'
  },
  // field acl level
  accessibility: {
    NONE: '不可',
    READ: '閲覧のみ',
    WRITE: '閲覧・編集可',
    READ_WRITE: '閲覧・編集可'
  },
  // 一覧の表示形式（kintone の一覧設定画面の選択肢名）
  'view.type': {
    LIST: '表形式',
    CALENDAR: 'カレンダー形式',
    CUSTOM: 'カスタマイズ'
  },
  // グラフ種別（kintone のグラフ設定画面の名称）
  'chart.type': {
    BAR: '横棒グラフ',
    COLUMN: '縦棒グラフ',
    PIE: '円グラフ',
    LINE: '折れ線グラフ',
    PIVOT_TABLE: 'クロス集計表',
    TABLE: '表',
    AREA: '面グラフ',
    AREA_STACKED: '積み上げ面グラフ',
    SPLINE: '曲線グラフ',
    SPLINE_AREA: '曲線面グラフ',
    BUBBLE: 'バブル',
    BAR_STACKED: '積み上げ横棒',
    FUNNEL: 'ファネル'
  },
  // ページ送り
  paginationStyle: {
    NORMAL: '通常',
    NUMBER: 'ページ番号',
    INFINITE: '無限スクロール'
  },
  // 通知トリガ
  recordTrigger: {
    APP: 'アプリ全体',
    RECORD: 'レコード単位'
  },
  // ここから下はセクション文脈込みで参照するスコープ（path-decoder が
  // sectionKey を見て選択する）。kintone-enums の共通辞書を単一ソースとする。
  'assignee.type': PROCESS_ASSIGNEE_TYPE_JP,
  'icon.type': ICON_TYPE_JP,
  'aggregation.type': AGGREGATION_TYPE_JP,
  'resource.type': RESOURCE_TYPE_JP,
  builtinType: VIEW_BUILTIN_TYPE_JP,
  device: VIEW_DEVICE_JP,
  chartMode: CHART_MODE_JP,
  scope: CUSTOMIZE_SCOPE_JP,
  theme: APP_THEME_JP,
  selectionMode: TITLE_SELECTION_JP,
  roundingMode: ROUNDING_MODE_JP,
  per: GROUP_PER_JP,
  by: REPORT_SORT_BY_JP,
  order: REPORT_SORT_ORDER_JP,
  every: PERIODIC_REPORT_EVERY_JP,
  dayOfWeek: DAY_OF_WEEK_JP
};

// ---------------------------------------------------------------------------
// プロパティ辞書 (キー名 → 日本語ラベル＋アイコン)
// ---------------------------------------------------------------------------

export const PROP_LABELS: Record<string, PropMeta> = {
  // appAcl 操作権限（kintone のアクセス権設定画面の列名）
  appEditable:      { label: 'アプリ管理', icon: '⚙' },
  recordViewable:   { label: 'レコード閲覧', icon: '👁' },
  recordAddable:    { label: 'レコード追加', icon: '➕' },
  recordEditable:   { label: 'レコード編集', icon: '✏️' },
  recordDeletable:  { label: 'レコード削除', icon: '🗑' },
  recordImportable: { label: 'ファイル読み込み', icon: '📥' },
  recordExportable: { label: 'ファイル書き出し', icon: '📤' },

  // recordPermissions の権限
  viewable:         { label: '閲覧',       icon: '👁' },
  editable:         { label: '編集',       icon: '✏️' },
  deletable:        { label: '削除',       icon: '🗑' },

  // 共通
  filterCond:       { label: '絞込条件',   icon: '🔍' },
  includeSubs:      { label: '配下を含む' },
  entities:         { label: 'エンティティ' },
  entity:           { label: '対象' },
  rights:           { label: '権限エントリー' },
  accessibility:    { label: 'アクセス権' },

  // viewSettings（kintone の一覧設定画面の項目名）
  fields:           { label: '表示するフィールド', icon: '📋' },
  sort:             { label: 'ソート',     icon: '↕' },
  index:            { label: '表示順',     icon: '🔢' },
  paginationStyle:  { label: 'ページ送り', icon: '📄' },
  defaultView:      { label: '既定ビュー' },
  view:             { label: 'ビュー' },
  views:            { label: 'ビュー一覧' },
  builtinType:      { label: '標準一覧の種類' },
  device:           { label: '表示するデバイス' },
  pager:            { label: 'ページ送りの表示' },
  date:             { label: '日付の基準フィールド' },

  // reportSettings（kintone のグラフ設定画面の項目名）
  groups:           { label: '分類',       icon: '📊' },
  aggregations:     { label: '集計',       icon: '🧮' },
  chartType:        { label: 'グラフ種別' },
  chartMode:        { label: 'モード' },
  reports:          { label: 'グラフ一覧' },
  periodicReports:  { label: '定期レポート' },
  periodicReport:   { label: '定期レポート' },
  period:           { label: '実行スケジュール' },
  every:            { label: '間隔' },
  dayOfWeek:        { label: '曜日' },
  dayOfMonth:       { label: '日' },
  per:              { label: '分類の時間単位' },
  by:               { label: 'ソートの基準' },
  order:            { label: 'ソートの順序' },
  active:           { label: '有効状態' },

  // notifications（kintone の通知設定画面の項目名）
  recordAdded:      { label: 'レコードの追加' },
  recordEdited:     { label: 'レコードの編集' },
  commentAdded:     { label: 'コメントの書き込み' },
  statusChanged:    { label: 'ステータスの更新' },
  fileImported:     { label: 'ファイルの読み込み' },
  recipients:       { label: '通知先' },
  targets:          { label: '通知先' },
  notifications:    { label: '通知ルール' },
  timing:           { label: '通知するタイミング' },
  daysLater:        { label: '通知する日' },
  hoursLater:       { label: '通知する時間' },
  time:             { label: '時刻' },
  notifyToCommenter:{ label: 'コメントを書き込んだユーザーへの通知' },
  notifyToMentioned:{ label: 'コメントの宛先ユーザーへの通知' },
  notifyOnUpdate:   { label: '更新時に通知' },
  timezone:         { label: 'タイムゾーン' },
  perRecordNotifications: { label: 'レコード条件通知' },
  reminderNotifications:  { label: 'リマインダー通知' },
  title:            { label: 'タイトル' },
  body:             { label: '本文' },

  // processSettings（kintone のプロセス管理設定画面の項目名）
  enable:           { label: 'プロセス管理の有効化' },
  states:           { label: 'ステータス' },
  actions:          { label: 'アクション' },
  from:             { label: '実行前のステータス' },
  to:               { label: '実行後のステータス' },
  assignee:         { label: '作業者' },
  type:             { label: '種別' },
  settings:         { label: '設定' },

  // actionSettings
  app:              { label: '対象アプリ' },
  mappings:         { label: 'フィールド対応' },
  sourceField:      { label: '元フィールド' },
  destField:        { label: '先フィールド' },
  destApp:          { label: '先アプリ' },

  // customizeSettings
  desktop:          { label: 'デスクトップ' },
  mobile:           { label: 'モバイル' },
  js:               { label: 'JS' },
  css:              { label: 'CSS' },
  file:             { label: 'ファイル' },
  scope:            { label: '適用範囲' },
  url:              { label: 'URL' },

  // pluginSettings
  plugins:          { label: 'プラグイン一覧' },
  version:          { label: 'バージョン' },
  id:               { label: 'ID' },
  enabled:          { label: '有効状態' },

  // appSettings / appInfo（kintone のアプリ設定画面の項目名）
  name:             { label: '名前' },
  description:      { label: '説明' },
  theme:            { label: 'デザインテーマ' },
  titleField:       { label: 'レコードのタイトル' },
  selectionMode:    { label: '選択方法' },
  icon:             { label: 'アイコン' },
  enableThumbnails: { label: 'サムネイルの表示' },
  enableBulkDeletion: { label: 'レコードの一括削除' },
  enableComments:   { label: 'レコードのコメント機能' },
  enableDuplicateRecord: { label: 'レコードの再利用' },
  enableInlineRecordEditing: { label: '一覧でのレコードのインライン編集' },
  numberPrecision:  { label: '数値や計算の精度' },
  digits:           { label: '全体の桁数' },
  decimalPlaces:    { label: '小数部の桁数' },
  roundingMode:     { label: '数値の丸めかた' },
  firstMonthOfFiscalYear: { label: '第1四半期の開始月' },
  appId:            { label: 'アプリID' },
  spaceId:          { label: 'スペースID' },
  threadId:         { label: 'スレッドID' },
  code:             { label: 'コード' },
  label:            { label: 'ラベル' },

  // categories
  categories:       { label: 'カテゴリ' },

  // layoutSettings
  layout:           { label: 'レイアウト' },
  row:              { label: '行' },
  width:            { label: '横幅' },
  height:           { label: '高さ' },
  innerHeight:      { label: '入力欄の高さ' },

  // fieldSettings: 関連レコード一覧（referenceTable）/ ルックアップ（lookup）
  // kintone のフィールド設定画面の項目名に合わせる。
  referenceTable:    { label: '関連レコード一覧設定' },
  lookup:            { label: 'ルックアップ設定' },
  condition:         { label: '表示するレコードの条件' },
  displayFields:     { label: '表示するフィールド' },
  relatedApp:        { label: '参照するアプリ' },
  relatedField:      { label: '参照するアプリのフィールド' },
  relatedKeyField:   { label: 'コピー元のフィールド' },
  fieldMappings:     { label: 'ほかのフィールドのコピー' },
  lookupPickerFields:{ label: 'コピー元のレコード選択時に表示するフィールド' },
  size:              { label: '一度に表示する最大レコード数' }
};

// ---------------------------------------------------------------------------
// セクション辞書
// ---------------------------------------------------------------------------

export const SECTION_LABELS: Record<string, PropMeta> = {
  appAcl:                 { label: 'アプリ権限',         icon: '🔐' },
  fieldAcl:               { label: 'フィールド権限',     icon: '🔐' },
  recordPermissions:      { label: 'レコード権限',       icon: '🔐' },
  notifications:          { label: '通知',               icon: '🔔' },
  perRecordNotifications: { label: 'レコード条件通知',   icon: '🔔' },
  reminderNotifications:  { label: 'リマインダー通知',   icon: '🔔' },
  viewSettings:           { label: 'ビュー設定',         icon: '📊' },
  reportSettings:         { label: 'グラフ設定',         icon: '📈' },
  processSettings:        { label: 'プロセス管理',       icon: '🔁' },
  actionSettings:         { label: 'アクション設定',     icon: '⚡' },
  customizeSettings:      { label: 'JS/CSS設定',         icon: '🧪' },
  pluginSettings:         { label: 'プラグイン',         icon: '🧩' },
  appSettings:            { label: 'アプリ設定',         icon: '⚙' },
  appInfo:                { label: 'アプリ情報',         icon: 'ℹ️' },
  formSettings:           { label: 'フォーム設定',       icon: '📝' },
  fieldSettings:          { label: 'フィールド設定',     icon: '🔤' },
  layoutSettings:         { label: 'レイアウト設定',     icon: '🧩' },
  categories:             { label: 'カテゴリ設定',       icon: '🗂' }
};

// ---------------------------------------------------------------------------
// 公開ヘルパ
// ---------------------------------------------------------------------------

export function labelOfProp(key: string | null | undefined): string {
  if (!key) return '';
  return PROP_LABELS[key]?.label || String(key);
}

export function iconOfProp(key: string | null | undefined): string {
  if (!key) return '';
  return PROP_LABELS[key]?.icon || '';
}

export function labelOfValue(scope: string, value: any): string | null {
  if (value == null) return null;
  const dict = VALUE_LABELS[scope];
  if (!dict) return null;
  return dict[String(value)] || null;
}

export function labelOfSection(sectionKey: string | null | undefined): PropMeta {
  if (!sectionKey) return { label: '-', icon: '' };
  return SECTION_LABELS[sectionKey] || { label: String(sectionKey), icon: '' };
}

const PERMISSION_KEYS = new Set([
  'appEditable',
  'recordViewable', 'recordAddable', 'recordEditable', 'recordDeletable',
  'recordImportable', 'recordExportable',
  'viewable', 'editable', 'deletable',
  'includeSubs'
]);

/**
 * boolean 値を文脈に応じた日本語に変換する。文脈不明なら はい/いいえ。
 */
export function labelOfBool(value: boolean, propKey?: string): string {
  if (propKey && PERMISSION_KEYS.has(propKey)) {
    return value ? '許可' : '不許可';
  }
  if (propKey === 'enable' || propKey === 'enabled' || propKey === 'active') {
    return value ? '有効' : '無効';
  }
  if (propKey === 'pager') {
    return value ? '表示する' : '表示しない';
  }
  if (propKey === 'notifyToCommenter' || propKey === 'notifyToMentioned' || propKey === 'notifyOnUpdate') {
    return value ? '通知する' : '通知しない';
  }
  return value ? 'はい' : 'いいえ';
}

/**
 * エンティティ ({type, code, name?}) を「アイコン 表示名」形式に整形。
 * 名前と code が両方あるときは "👥 営業部 (sales)" のように補助表示。
 */
export function formatEntityText(entity: any, options: { compact?: boolean } = {}): string {
  if (!entity || typeof entity !== 'object') return '';
  const type = String(entity.type || '');
  const code = String(entity.code || entity.login || entity.id || '');
  const name = String(entity.name || '');
  const functionLabel = type.toUpperCase() === 'FUNCTION'
    ? ({
        'LOGINUSER()': 'ログインユーザー',
        'PRIMARY_ORGANIZATION()': '優先する組織'
      } as Record<string, string>)[code.trim().toUpperCase()]
    : '';
  if (functionLabel && !name) return functionLabel;
  const typed = VALUE_LABELS['entity.type']?.[type] || (type ? `· ${type}` : '·');
  const display = name || code || '(未設定)';
  if (options.compact) return `${typed} ${display}`;
  if (name && code && name !== code) return `${typed} ${name} (${code})`;
  return `${typed} ${display}`;
}
