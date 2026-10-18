import { SECTION_DEFS } from '../constants.js';

/**
 * 反映できるセクションキーの実行順。
 * 共有の SECTION_DEFS は appSettings を put: false としているため、一般設定は反映ツール側で追加する。
 * レコードタイトル（titleField）がフィールドの存在を必要とするため、フィールド・レイアウトより後に置く。
 */
export const REFLECT_SECTION_KEYS: readonly string[] = SECTION_DEFS.filter(def => def.put).map(def => def.key).flatMap(key => key === 'layoutSettings' ? [key, 'appSettings'] : [key]);

/** 反映する一般設定のキー。アプリ名・説明・アイコンはアプリ固有の情報なので反映しない。 */
export const APP_SETTINGS_REFLECT_KEYS: readonly string[] = ['theme', 'titleField', 'enableThumbnails', 'enableBulkDeletion', 'enableComments', 'enableDuplicateRecord', 'enableInlineRecordEditing', 'numberPrecision', 'firstMonthOfFiscalYear'];

/** 一般設定の項目名（差分の内訳と変更の要約で共通）。 */
export const APP_SETTINGS_LABELS: Record<string, string> = {
  theme: 'テーマ', titleField: 'レコードのタイトル', enableThumbnails: 'サムネイル表示', enableBulkDeletion: '一括削除',
  enableComments: 'コメント機能', enableDuplicateRecord: 'レコードの再利用', enableInlineRecordEditing: '一覧でのインライン編集',
  numberPrecision: '数値の桁数と丸め', firstMonthOfFiscalYear: '年度の開始月'
};

export function isReflectableSection(key: string): boolean { return REFLECT_SECTION_KEYS.includes(key); }

export function reflectSectionLabel(key: string): string {
  return key === 'appSettings' ? '一般設定' : SECTION_DEFS.find(def => def.key === key)?.label || key;
}
