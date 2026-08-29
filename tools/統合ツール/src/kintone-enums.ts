'use strict';

/**
 * kintone REST API のレスポンスに含まれる ENUM 値を、設計書 / 差分 / Excel / CSV / Markdown
 * といった出力で一貫して日本語ラベルに変換するための辞書とヘルパー。
 *
 * 同じ辞書を複数箇所で重複定義するのを避けるため、本モジュールに集約する。
 * 既存ファイルの個別辞書（design-xlsx の FIELD_TYPE 等）は元のまま残し、
 * 新規追加・全文置換用にここを参照する。
 */

export const FIELD_TYPE_JP: Record<string, string> = {
  SINGLE_LINE_TEXT: '文字列(1行)',
  MULTI_LINE_TEXT: '文字列(複数行)',
  RICH_TEXT: 'リッチエディター',
  NUMBER: '数値',
  CALC: '計算',
  CHECK_BOX: 'チェックボックス',
  RADIO_BUTTON: 'ラジオボタン',
  DROP_DOWN: 'ドロップダウン',
  MULTI_SELECT: '複数選択',
  DATE: '日付',
  TIME: '時刻',
  DATETIME: '日時',
  LINK: 'リンク',
  FILE: '添付ファイル',
  USER_SELECT: 'ユーザー選択',
  ORGANIZATION_SELECT: '組織選択',
  GROUP_SELECT: 'グループ選択',
  CATEGORY: 'カテゴリー',
  STATUS: 'ステータス',
  STATUS_ASSIGNEE: '作業者',
  SUBTABLE: 'テーブル',
  REFERENCE_TABLE: '関連レコード一覧',
  RECORD_NUMBER: 'レコード番号',
  CREATOR: '作成者',
  CREATED_TIME: '作成日時',
  MODIFIER: '更新者',
  UPDATED_TIME: '更新日時',
  SPACER: 'スペース',
  HR: '罫線',
  LABEL: 'ラベル',
  GROUP: 'グループ',
  LOOKUP: 'ルックアップ'
};

/** ACL / 通知の対象エンティティ種別 */
export const ENTITY_TYPE_JP: Record<string, string> = {
  USER: 'ユーザー',
  GROUP: 'グループ',
  ORGANIZATION: '組織',
  FIELD_ENTITY: 'フィールド値',
  CREATOR: '作成者',
  MODIFIER: '更新者',
  LOGIN_USER: 'ログインユーザー',
  ALL: '全員',
  CUSTOM_FIELD: 'カスタムフィールド'
};

/** 一覧（views）の表示形式。kintone の一覧設定画面の選択肢名に合わせる。 */
export const VIEW_TYPE_JP: Record<string, string> = {
  LIST: '表形式',
  CALENDAR: 'カレンダー形式',
  CUSTOM: 'カスタマイズ'
};

/** ビュー組み込み種別 */
export const VIEW_BUILTIN_TYPE_JP: Record<string, string> = {
  ASSIGNEE: '作業者ビュー'
};

/** ページャ種別 */
export const PAGINATION_TYPE_JP: Record<string, string> = {
  ROW: '行ページャ',
  PAGE: 'ページ番号'
};

/** グラフ（reports）の種別 */
export const CHART_TYPE_JP: Record<string, string> = {
  BAR: '横棒グラフ',
  COLUMN: '縦棒グラフ',
  LINE: '折れ線グラフ',
  PIE: '円グラフ',
  PIVOT_TABLE: 'クロス集計表',
  TABLE: '表',
  AREA: '面グラフ',
  SPLINE: '曲線グラフ',
  SPLINE_AREA: '曲線面グラフ',
  SCATTER: '散布図'
};

export const CHART_MODE_JP: Record<string, string> = {
  NORMAL: '通常',
  STACKED: '積み上げ',
  PERCENTAGE: '100%積み上げ'
};

export const AGGREGATION_TYPE_JP: Record<string, string> = {
  COUNT: 'レコード数',
  SUM: '合計',
  AVG: '平均',
  MAX: '最大値',
  MIN: '最小値'
};

/** グルーピング単位（reports.groups[].per） */
export const GROUP_PER_JP: Record<string, string> = {
  YEAR: '年',
  QUARTER: '四半期',
  MONTH: '月',
  WEEK: '週',
  DAY: '日',
  HOUR: '時',
  MINUTE: '分'
};

/** プロセス管理の作業者の選択方式（APIの assignee.type は ONE / ALL / ANY） */
export const PROCESS_ASSIGNEE_TYPE_JP: Record<string, string> = {
  ONE: '候補から作業者を1人選ぶ',
  ANY: '候補のうち誰か1人が作業する',
  ANYONE: '候補のうち誰か1人が作業する',
  ALL: '候補の全員が作業する'
};

/** 通知タイミング */
export const NOTIFICATION_TIMING_JP: Record<string, string> = {
  CREATION: 'レコード作成時',
  DAYS_OF_WEEK: '曜日指定',
  TIME: '時刻指定',
  WEEKLY: '毎週',
  MONTHLY: '毎月'
};

/** カスタマイズ参照種別 */
export const RESOURCE_TYPE_JP: Record<string, string> = {
  URL: 'URL指定',
  FILE: 'ファイル指定'
};

/** カスタマイズスコープ */
export const CUSTOMIZE_SCOPE_JP: Record<string, string> = {
  ALL: '全ユーザー',
  ADMIN: '管理者のみ',
  NONE: '無効'
};

/** アイコン種別 */
export const ICON_TYPE_JP: Record<string, string> = {
  PRESET: 'プリセット',
  FILE: 'アップロードファイル'
};

/** Webhook イベント */
export const WEBHOOK_EVENT_JP: Record<string, string> = {
  ADD_RECORD: 'レコード追加',
  UPDATE_RECORD: 'レコード編集',
  DELETE_RECORD: 'レコード削除',
  UPDATE_STATUS: 'ステータス変更',
  ADD_COMMENT: 'コメント追加',
  DELETE_COMMENT: 'コメント削除'
};

/** 数値・計算フィールドの format */
export const NUMBER_FORMAT_JP: Record<string, string> = {
  NUMBER: '数値',
  NUMBER_DIGIT: '数値（桁区切り）',
  PERCENT: 'パーセント',
  CURRENCY: '通貨',
  DATE: '日付',
  TIME: '時刻',
  DATETIME: '日時',
  HOUR_MINUTE: '時:分',
  HOUR_MINUTE_SECOND: '時:分:秒'
};


/** 選択肢の並び（CHECK_BOX/RADIO_BUTTON 等） */
export const ALIGN_JP: Record<string, string> = {
  HORIZONTAL: '横並び',
  VERTICAL: '縦並び'
};

/** 単位記号の表示位置。kintone の設定画面の選択肢名に合わせる。 */
export const UNIT_POSITION_JP: Record<string, string> = {
  BEFORE: '前につける',
  AFTER: '後につける'
};

/** リンクフィールドの入力値の種類。kintone の設定画面の選択肢名に合わせる。 */
export const LINK_PROTOCOL_JP: Record<string, string> = {
  WEB: 'Webサイトのアドレス',
  CALL: '電話番号',
  MAIL: 'メールアドレス'
};

/** 単一の ENUM lookup（未知の値は元の値を返すフォールバック付き） */
export function lookupEnum(map: Record<string, string>, value: any): string {
  if (value == null || value === '') return '';
  const key = String(value).trim().toUpperCase();
  return map[key] || String(value);
}


/** すべての ENUM 辞書を 1 つにまとめたフラットマップ。テキスト全文置換用。 */
const ALL_ENUM_LABELS: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  // フィールド型 / エンティティ型は CREATOR / MODIFIER などキーが衝突するので
  // 「より使われる方」を優先（フィールド型 → エンティティ型の順で上書き）。
  Object.assign(out, ENTITY_TYPE_JP, FIELD_TYPE_JP);
  Object.assign(out, VIEW_TYPE_JP, VIEW_BUILTIN_TYPE_JP, PAGINATION_TYPE_JP);
  Object.assign(out, CHART_TYPE_JP, CHART_MODE_JP, AGGREGATION_TYPE_JP, GROUP_PER_JP);
  Object.assign(out, PROCESS_ASSIGNEE_TYPE_JP, NOTIFICATION_TIMING_JP);
  Object.assign(out, RESOURCE_TYPE_JP, CUSTOMIZE_SCOPE_JP, ICON_TYPE_JP);
  Object.assign(out, WEBHOOK_EVENT_JP, NUMBER_FORMAT_JP);
  Object.assign(out, ALIGN_JP, UNIT_POSITION_JP, LINK_PROTOCOL_JP);
  return out;
})();

/**
 * JSON 化されたテキストに含まれる kintone API ENUM 値を日本語ラベルに置換する。
 *
 * 安全性のため、置換対象は **ダブルクォートで囲まれた完全一致トークン** （例: `"CREATOR"`）に限定。
 *  - URL 文字列内の `/URL/foo` のような偶発的一致を起こさない
 *  - 置換結果の値（例: 「URL指定」）が次の置換で再度マッチして「URL指定指定」になることを防ぐ
 *
 * 長いキーから先に置換することで部分一致衝突を避ける（例: STATUS_ASSIGNEE → STATUS の順）。
 */
export function localizeKintoneEnumsInText(input: string): string {
  if (!input) return input;
  let out = input;
  const keys = Object.keys(ALL_ENUM_LABELS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const jp = ALL_ENUM_LABELS[key];
    out = out.split('"' + key + '"').join('"' + jp + '"');
  }
  return out;
}
