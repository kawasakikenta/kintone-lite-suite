import { buildReflectSectionPlan, type ReflectSectionPlan } from '../../src/reflect/standalonePlan';
import { buildSectionSelectionModel, composeSectionSelection } from '../../src/reflect/selection';
import type { SectionSelectionModel, SectionSelectionState } from '../../src/reflect/selectionTypes';

export const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export function prepare(key: string, source: any, target: any, options: Record<string, any> = {}) {
  const plan = buildReflectSectionPlan(key, source, target, options);
  const fieldLabels = options.fieldLabels || {};
  const model = buildSectionSelectionModel(plan, fieldLabels) as SectionSelectionModel;
  return { plan, model, fieldLabels };
}

export function compose(ctx: { plan: ReflectSectionPlan; model: SectionSelectionModel; fieldLabels: Record<string, string> }, state: Partial<SectionSelectionState>) {
  return composeSectionSelection(ctx.model, { selected: state.selected ?? [], overrides: state.overrides ?? {}, ...(state.json !== undefined ? { json: state.json } : {}) }, ctx.plan, ctx.fieldLabels);
}

export const idsOf = (model: SectionSelectionModel, predicate: (pointer: string) => boolean) => model.changes.filter(change => predicate(change.pointer)).map(change => change.id);
export const byPointer = (model: SectionSelectionModel, pointer: string) => {
  const found = model.changes.find(change => change.pointer === pointer);
  if (!found) throw new Error(`変更が見つかりません: ${pointer}\n${model.changes.map(change => change.pointer).join('\n')}`);
  return found;
};
