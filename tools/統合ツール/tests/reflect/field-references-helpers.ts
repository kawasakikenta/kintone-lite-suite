import { applySelection } from '../../src/deploy/sourceSession';
import { buildRequirementIndex } from '../../src/deploy/sourceDisplay';
import type { SectionSelectionModel } from '../../src/reflect/selectionTypes';

/** 選択モデルだけから、セッションの選択の連動（requires）を試す。画面なしで applySelection を呼ぶための最小のセッション。 */
export function applyRequires(models: Record<string, SectionSelectionModel>, ids: string[]) {
  const selected: Record<string, Set<string>> = Object.fromEntries(Object.keys(models).map(key => [key, new Set<string>()]));
  const session = { models, selected, index: buildRequirementIndex(Object.values(models)) } as any;
  const on = applySelection(session, ids, true);
  const selectedAfter = Object.values(selected).flatMap(set => [...set]);
  const off = applySelection(session, ['fieldSettings:/properties/region'], false);
  return { selectedAfter, required: on.required, deselected: off.cascaded };
}
