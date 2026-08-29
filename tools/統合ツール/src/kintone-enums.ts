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
  ASSIGNEE: '作業者ビュー',
  UNDONE: '未完了レコード',
  ACTIVE_BY_USER: '自分が処理すべきレコード',
  RECORDS_OF_USER: '自分が関わるレコード'
};

/** 一覧（カスタマイズビュー）の表示デバイス */
export const VIEW_DEVICE_JP: Record<string, string> = {
  ANY: 'PC・モバイル両方',
  DESKTOP: 'PC版のみ'
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

/** グラフのソート基準（reports.sorts[].by） */
export const REPORT_SORT_BY_JP: Record<string, string> = {
  TOTAL: '集計値',
  GROUP1: '分類1',
  GROUP2: '分類2',
  GROUP3: '分類3'
};

/** グラフのソート順序（reports.sorts[].order）。kintone のグラフ設定画面の選択肢名。 */
export const REPORT_SORT_ORDER_JP: Record<string, string> = {
  ASC: '小さい順',
  DESC: '大きい順'
};

/** 定期レポートの実行間隔（periodicReport.period.every） */
export const PERIODIC_REPORT_EVERY_JP: Record<string, string> = {
  YEAR: '毎年',
  QUARTER: '四半期ごと',
  MONTH: '毎月',
  WEEK: '毎週',
  DAY: '毎日',
  HOUR: '毎時'
};

/** 曜日（periodicReport.period.dayOfWeek） */
export const DAY_OF_WEEK_JP: Record<string, string> = {
  SUNDAY: '日曜日',
  MONDAY: '月曜日',
  TUESDAY: '火曜日',
  WEDNESDAY: '水曜日',
  THURSDAY: '木曜日',
  FRIDAY: '金曜日',
  SATURDAY: '土曜日'
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

/** アプリのデザインテーマ。kintone のデザインテーマ設定画面の名称。 */
export const APP_THEME_JP: Record<string, string> = {
  WHITE: 'ホワイト',
  RED: 'レッド',
  BLUE: 'ブルー',
  GREEN: 'グリーン',
  YELLOW: 'イエロー',
  BLACK: 'ブラック',
  CLIPBOARD: 'クリップボード',
  BINDER: 'バインダー',
  PENCIL: 'ペンシル',
  CLIPS: 'クリップ'
};

/** レコードのタイトルの選択方法（appSettings.titleField.selectionMode） */
export const TITLE_SELECTION_JP: Record<string, string> = {
  AUTO: '自動選択',
  MANUAL: '手動指定'
};

/** 数値や計算の精度の丸めかた（appSettings.numberPrecision.roundingMode） */
export const ROUNDING_MODE_JP: Record<string, string> = {
  HALF_EVEN: '四捨五入（偶数丸め）',
  UP: '切り上げ',
  DOWN: '切り捨て'
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

/**
 * リマインダー通知の daysLater / hoursLater を kintone の設定画面と同じ
 * 「◯日前 / ◯日後」「◯時間前 / ◯時間後」表現へ変換する。
 * 数値と解釈できない値は null（呼び出し側で原文を使う）。
 */
export function describeReminderOffset(kind: 'days' | 'hours', value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!/^[+-]?\d+$/.test(raw)) return null;
  const n = Number(raw);
  const unit = kind === 'days' ? '日' : '時間';
  if (n === 0) return kind === 'days' ? '当日' : '同時刻';
  return n < 0 ? `${-n}${unit}前` : `${n}${unit}後`;
}

/**
 * 定期レポート（reports.*.periodicReport）を 1 行の日本語へ要約する。
 * 例: 「有効（毎週 月曜日 09:00）」「無効」。形が想定外なら null。
 */
export function describePeriodicReport(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const report = value as Record<string, any>;
  if (typeof report.active !== 'boolean' && !report.period) return null;
  const period = (report.period && typeof report.period === 'object') ? report.period : {};
  const schedule = [
    lookupEnum(PERIODIC_REPORT_EVERY_JP, period.every),
    period.month != null && period.month !== '' ? `${period.month}月` : '',
    period.dayOfMonth != null && period.dayOfMonth !== '' ? `${period.dayOfMonth}日` : '',
    lookupEnum(DAY_OF_WEEK_JP, period.dayOfWeek),
    period.time != null && period.time !== '' ? String(period.time) : ''
  ].filter(Boolean).join(' ');
  const state = report.active === false ? '無効' : '有効';
  return schedule ? `${state}（${schedule}）` : state;
}


/** すべての ENUM 辞書を 1 つにまとめたフラットマップ。テキスト全文置換用。 */
// @__PURE__ 注釈: 未使用バンドルでは辞書ごと tree-shaking できるようにする
// （これが無いと IIFE が副作用扱いになり、全 lite bundle に全辞書が混入する）。
const ALL_ENUM_LABELS: Record<string, string> = /* @__PURE__ */ (() => {
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
  // 文脈でしか意味が決まらない辞書（REPORT_SORT_ORDER_JP の ASC/DESC、
  // PERIODIC_REPORT_EVERY_JP の MONTH=毎月 と GROUP_PER_JP の MONTH=月 等）は
  // 全文置換に混ぜると別の場所を壊すため、ここへは加えない。
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
