'use strict';

/**
 * 差分の選択と反映内容の修正の取り決め（本番反映ツールの「反映元アプリから本番へ」で使う）。
 *
 * 流れ: previewReflectStandalone（差分の抽出。各項目の計画に values = { before, after } を持つ）
 *   → buildSectionSelectionModel（設定値 1 つずつの変更に分解）
 *   → 利用者が選択（SectionSelectionState.selected）と修正（overrides・json）
 *   → composeReflectSelectionStandalone（選んだ変更と修正から、送る設定 after' と計画を作り直す）
 *   → runApplyPreviewStandalone({ composed })（反映先プレビューへ書き込み）→ 本番へ反映。
 *
 * 粒度の規則（実装担当が守ること）:
 * - オブジェクトはキーごとにたどり、末端の値（文字列・数値・真偽・null）を 1 つの変更にする。
 * - 配列は 1 つの値として扱う（順序や重複に意味があるため。例: 一覧の表示フィールド、アクセス権、通知、プロセスのアクション）。
 * - 名前をキーにした入れ物（フィールド・テーブル内フィールド・選択肢・一覧・グラフ・アクション・ステータス・カテゴリー）の
 *   要素が片方にしか無いときは、要素ごと 1 つの変更（whole）にする。両方にあれば中の値ごとに分ける。
 * - 値どうしが組で意味を持つもの（lookup・referenceTable・レコードのタイトル・作業者 assignee・リマインダーの timing など）は 1 つの値として扱う。
 * - レイアウトは項目全体で 1 つの変更にする（配置は部分的に選べない）。JS/CSS は適用範囲と 4 つの一覧（PC/モバイル × JS/CSS）をそれぞれ 1 つの値にする。
 * - 一覧・グラフ・アクション・ステータス・カテゴリーの表示順（index）は、選んだ結果から自動で振り直す（利用者は選ばない）。
 */

import type { ReflectSectionPlan } from './standalonePlan.js';

export type SelectableKind = '追加' | '変更' | '削除';

/** 画面の入力欄の種類。select は選択肢（値, 表示名）を持つ。 */
export interface SelectableEditor {
  type: 'text' | 'boolean' | 'select';
  options?: Array<[string, string]>;
}

/** 画面で直せる値（主な値だけ。残りは JSON で直す）。 */
export interface SelectableEditable {
  /** 修正の保存キー。反映後の設定（PUT 形）の JSON Pointer（例 "/properties/name/label"） */
  pointer: string;
  /** 利用者向けの値の名前（例「表示名」「必須」） */
  label: string;
  /** 既定の反映後の値 */
  value: unknown;
  editor: SelectableEditor;
}

export interface SelectableChange {
  /** `${sectionKey}:${pointer}`。選択の保存キー */
  id: string;
  sectionKey: string;
  /** 反映後の設定（PUT 形）での場所（JSON Pointer） */
  pointer: string;
  /** 利用者向けの場所（例 ['顧客名（name）', '必須']） */
  labelPath: string[];
  /** まとまり（フィールド 1 つ・一覧 1 つなど）の ID と表示名。画面のグループ見出し */
  groupId: string;
  groupLabel: string;
  kind: SelectableKind;
  /** 反映先の現在の値（undefined はなし） */
  before: unknown;
  /** 反映元に合わせた値（undefined はなし＝削除） */
  after: unknown;
  beforeText: string;
  afterText: string;
  /** まとまりごと追加・削除する（中の値を個別には選べない） */
  whole: boolean;
  /** 画面で直せる値。whole の追加なら、その要素の主な値（表示名・必須など）を並べる */
  editables: SelectableEditable[];
  /** この変更を選ぶときに一緒に必要な変更の ID（画面は選ぶときに一緒に選ぶ） */
  requires?: string[];
}

export interface SectionSelectionModel {
  sectionKey: string;
  label: string;
  /** 反映先の現在（PUT 形） */
  before: any;
  /** 既定の反映後（反映元に合わせたもの。PUT 形） */
  after: any;
  changes: SelectableChange[];
  /** JSON での修正を受け付けるか（JS/CSS・プラグインは false） */
  jsonEditable: boolean;
  /** 選択の単位の補足（例「レイアウトは全体で選びます」） */
  note?: string;
}

export interface SectionSelectionState {
  /** 反映する change.id。既定はすべて */
  selected: string[];
  /** JSON Pointer → 修正後の値（画面の入力欄） */
  overrides: Record<string, unknown>;
  /** JSON で直した反映後の設定（PUT 形）。あれば selected / overrides より優先 */
  json?: unknown;
}

export interface ComposedSection {
  sectionKey: string;
  label: string;
  /** 送る設定（PUT 形）。何も選ばなければ before と同じ */
  after: any;
  /** after から作り直した計画（operations・changes・items・requiredFields・blockers・fileUploads） */
  plan: ReflectSectionPlan;
  /** 選んだ変更の数 / 全体の数 */
  selectedCount: number;
  totalCount: number;
  /** 入力欄・JSON で既定から変えた値の数（JSON で直した項目は 1 以上） */
  editedCount: number;
  /** 修正内容の問題（JSON の形式・フィールドの種類やコードの変更・フィールドの削除など）。あれば書き込めない */
  errors: string[];
}

export interface ComposedReflectSelection {
  /** 選択した項目（scopes）の順 */
  sections: ComposedSection[];
  /** 書き込めない理由（各項目の errors・blockers と、参照するフィールドの不足。reflectSelectionBlockers と同じ規則） */
  blockers: string[];
}
