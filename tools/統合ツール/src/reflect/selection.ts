'use strict';

/**
 * 差分の選択と反映内容の修正（仮実装）。取り決めは selectionTypes.ts を参照。実装担当が置き換える。署名は変えない。
 */

import type { ReflectSectionPlan } from './standalonePlan.js';
import type { ComposedSection, SectionSelectionModel, SectionSelectionState } from './selectionTypes.js';

/** 計画（values を持つ）を、設定値 1 つずつの変更に分解する。values が無い・書き込めない項目は null。 */
export function buildSectionSelectionModel(plan: ReflectSectionPlan, fieldLabels: Record<string, string> = {}): SectionSelectionModel | null {
  void plan; void fieldLabels;
  throw new Error('buildSectionSelectionModel は未実装です');
}

/** 既定の選択（すべての変更を選び、修正なし）。 */
export function defaultSelectionState(model: SectionSelectionModel): SectionSelectionState {
  return { selected: model.changes.map(change => change.id), overrides: {} };
}

/** 選んだ変更と修正から、送る設定と計画を作り直す（純粋関数）。plan は抽出時の既定の計画。 */
export function composeSectionSelection(model: SectionSelectionModel, state: SectionSelectionState, plan: ReflectSectionPlan, fieldLabels: Record<string, string> = {}): ComposedSection {
  void model; void state; void plan; void fieldLabels;
  throw new Error('composeSectionSelection は未実装です');
}

/** 送る設定（after'）から計画を作り直す（実行時に、再取得した既定の計画と、確認済みの after' から書き込み内容を作る）。 */
export function buildPlanFromComposedAfter(plan: ReflectSectionPlan, after: any, fieldLabels: Record<string, string> = {}): ReflectSectionPlan {
  void plan; void after; void fieldLabels;
  throw new Error('buildPlanFromComposedAfter は未実装です');
}
