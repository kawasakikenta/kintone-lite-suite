'use strict';

/**
 * 差分表示用の辞書（値・プロパティ・セクション）。
 *
 * 行一覧モード / セクション別ビュー / Markdown 出力 / 検索インデックスの
 * すべてから参照する単一のエントリポイント。kintone API が返す内部キー
 * (`recordViewable`, `accessibility=READ_WRITE`, `entity.type=GROUP` 等) を
 * 日本語ラベル＋アイコンに変換することで「JSON 内部用語の露出」を排除する。
 *
 * 対象は **enum 値** と **プロパティ名** に限定する。自由文字列（`filterCond`
 * の中身、ユーザー入力名）は辞書化しない（膨張防止と意味のずれ防止）。
 */

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
    FIELD_ENTITY: '🔗 フィールド',
    EVERYONE: '🌐 全員',
    CUSTOM_FIELD: '🔗 ユーザー選択フィールド'
  },
  // field acl level
  accessibility: {
    NONE: '不可',
    READ: '閲覧のみ',
    READ_WRITE: '閲覧+編集'
  },
  // ビュー種別
  'view.type': {
    LIST: '一覧',
    CALENDAR: 'カレンダー',
    CUSTOM: 'カスタマイズ'
  },
  // グラフ種別
  'chart.type': {
    BAR: '棒グラフ',
    COLUMN: '縦棒グラフ',
    PIE: '円グラフ',
    LINE: '折れ線',
    PIVOT_TABLE: 'クロス集計表',
    TABLE: '集計表',
    AREA: 'エリアグラフ',
    AREA_STACKED: '積み上げエリア',
    SPLINE: 'スプライン',
    SPLINE_AREA: 'スプラインエリア',
    BUBBLE: 'バブル',
    BAR_STACKED: '積み上げ棒',
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
  }
};

// ---------------------------------------------------------------------------
// プロパティ辞書 (キー名 → 日本語ラベル＋アイコン)
// ---------------------------------------------------------------------------

export const PROP_LABELS: Record<string, PropMeta> = {
  // appAcl 操作権限
  appEditable:      { label: 'アプリ管理', icon: '⚙' },
  recordViewable:   { label: '閲覧',       icon: '👁' },
  recordAddable:    { label: '追加',       icon: '➕' },
  recordEditable:   { label: '編集',       icon: '✏️' },
  recordDeletable:  { label: '削除',       icon: '🗑' },
  recordImportable: { label: 'CSV読込',    icon: '📥' },
  recordExportable: { label: 'CSV書出',    icon: '📤' },

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

  // viewSettings
  fields:           { label: '表示項目',   icon: '📋' },
  sort:             { label: 'ソート',     icon: '↕' },
  index:            { label: '表示順',     icon: '🔢' },
  paginationStyle:  { label: 'ページ送り', icon: '📄' },
  defaultView:      { label: '既定ビュー' },
  view:             { label: 'ビュー' },
  views:            { label: 'ビュー一覧' },

  // reportSettings
  groups:           { label: '分類',       icon: '📊' },
  aggregations:     { label: '集計',       icon: '🧮' },
  chartType:        { label: 'グラフ種別' },
  chartMode:        { label: 'モード' },
  reports:          { label: 'グラフ一覧' },
  periodicReports:  { label: '定期レポート' },

  // notifications
  recordAdded:      { label: 'レコード追加時' },
  recordEdited:     { label: 'レコード編集時' },
  commentAdded:     { label: 'コメント追加時' },
  statusChanged:    { label: 'ステータス変更時' },
  fileImported:     { label: 'ファイル取込時' },
  recipients:       { label: '宛先' },
  targets:          { label: '宛先' },
  notifications:    { label: '通知ルール' },
  timing:           { label: 'タイミング' },
  notifyOnUpdate:   { label: '更新時に通知' },
  timezone:         { label: 'タイムゾーン' },
  perRecordNotifications: { label: 'レコード条件通知' },
  reminderNotifications:  { label: 'リマインダー通知' },
  title:            { label: 'タイトル' },
  body:             { label: '本文' },

  // processSettings
  enable:           { label: 'プロセス有効化' },
  states:           { label: 'ステータス' },
  actions:          { label: 'アクション' },
  from:             { label: '遷移元' },
  to:               { label: '遷移先' },
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
  scope:            { label: '配置' },
  url:              { label: 'URL' },

  // pluginSettings
  plugins:          { label: 'プラグイン一覧' },
  version:          { label: 'バージョン' },
  id:               { label: 'ID' },

  // appSettings / appInfo
  name:             { label: '名前' },
  description:      { label: '説明' },
  theme:            { label: 'テーマ' },
  titleField:       { label: 'タイトルフィールド' },
  icon:             { label: 'アイコン' },
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
  referenceTable:    { label: '関連レコード一覧設定' },
  lookup:            { label: 'ルックアップ設定' },
  condition:         { label: '表示条件（フィールドの一致）' },
  displayFields:     { label: '表示するフィールド' },
  relatedApp:        { label: '参照するアプリ' },
  relatedField:      { label: '参照するアプリのフィールド' },
  relatedKeyField:   { label: 'コピー元のフィールド' },
  fieldMappings:     { label: 'ほかのフィールドのコピー' },
  lookupPickerFields:{ label: '選択画面に表示するフィールド' },
  size:              { label: '一度に表示する最大件数' }
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
  if (propKey === 'enable' || propKey === 'enabled') {
    return value ? '有効' : '無効';
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
  const typed = VALUE_LABELS['entity.type']?.[type] || (type ? `· ${type}` : '·');
  const display = name || code || '(未設定)';
  if (options.compact) return `${typed} ${display}`;
  if (name && code && name !== code) return `${typed} ${name} (${code})`;
  return `${typed} ${display}`;
}
