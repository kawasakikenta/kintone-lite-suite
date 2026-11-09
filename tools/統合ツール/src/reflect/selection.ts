'use strict';

/**
 * 差分の選択と反映内容の修正。取り決めは selectionTypes.ts を参照（粒度の規則も同ファイル）。
 *
 * - selectionModel.ts: 計画の before → after を、設定値 1 つずつの変更に分解する（buildSectionSelectionModel）
 * - selectionCompose.ts: 選んだ変更と修正から、送る設定と計画を作り直す（composeSectionSelection）
 * - selectionPlan.ts: 送る設定から書き込みの計画を作り直す（buildPlanFromComposedAfter）
 * - selectionRequires.ts: 計算式・条件が参照する追加フィールドの追加を、項目をまたいで requires に付ける（attachFieldAdditionRequires）
 * - selectionLabels.ts / selectionPointer.ts: 表示用の名前・値の文字列、JSON Pointer の操作
 */

export { buildSectionSelectionModel } from './selectionModel.js';
export { composeSectionSelection, defaultSelectionState } from './selectionCompose.js';
export { buildPlanFromComposedAfter, checkComposedAfter, checkComposedAgainstPlan } from './selectionPlan.js';
export { attachFieldAdditionRequires } from './selectionRequires.js';
