import { describe, expect, it } from 'vitest';
import { defaultSelectionState } from '../../src/reflect/selection';
import { compose, copy, prepare } from './selection-helpers';

const user = (code: string) => ({ entity: { type: 'USER', code } });

/** [項目キー, 反映元, 反映先, 参照を確かめる requiredFields の期待値(省略可)] */
const CASES: Array<[string, any, any, string[]?]> = [
  ['reportSettings',
    { reports: { R1: { chartType: 'BAR', chartMode: 'NORMAL', groups: [{ code: 'name' }], aggregations: [{ type: 'SUM', code: 'amount' }], filterCond: '', sorts: [{ by: 'TOTAL', order: 'DESC' }], index: '0', name: 'R1' } } },
    { reports: {} }, ['name', 'amount']],
  ['actionSettings',
    { actions: { A1: { name: 'A1', index: '0', destApp: { app: '5' }, mappings: [{ srcType: 'FIELD', srcField: 'name', destField: 'x' }], entities: [], filterCond: '' } } },
    { actions: {} }, ['name']],
  ['fieldAcl',
    { rights: [{ code: 'name', entities: [{ ...user('a'), accessibility: 'WRITE', includeSubs: false }] }] },
    { rights: [] }, ['name']],
  ['reminderNotifications',
    { notifications: [{ timing: { code: 'due', daysLater: '1', hoursLater: '0', time: '09:00' }, filterCond: '', title: 'お知らせ', targets: [{ entity: { type: 'FIELD_ENTITY', code: 'owner' } }] }], timezone: 'Asia/Tokyo' },
    { notifications: [], timezone: 'Asia/Tokyo' }, ['due', 'owner']],
  ['appAcl', { rights: [{ ...user('a'), appEditable: true, recordViewable: true }] }, { rights: [] }],
  ['recordPermissions', { rights: [{ filterCond: '', entities: [{ entity: { type: 'USER', code: 'a' }, viewable: true, editable: false, deletable: false }] }] }, { rights: [] }],
  ['perRecordNotifications', { notifications: [{ filterCond: 'x = 1', title: 't', targets: [] }] }, { notifications: [] }],
  ['categories', { enabled: true, categories: { A: { name: 'A', index: '0', children: { B: { name: 'B', index: '0' } } } } }, { enabled: true, categories: {} }],
  ['processSettings', { enable: true, states: { 開始: { name: '開始', index: '0', assignee: { type: 'ONE', entities: [{ entity: { type: 'FIELD_ENTITY', code: 'owner' }, includeSubs: false }] } } }, actions: [] }, { enable: false, states: {}, actions: [] }, ['owner']]
];

describe('差分の選択: 既定の選択（全選択・修正なし）は項目ごとの既定の計画と同じになる', () => {
  for (const [key, source, target, required] of CASES) {
    it(`${key}`, () => {
      const ctx = prepare(key, source, target);
      expect(ctx.plan.status).toBe('change');
      expect(ctx.model.changes.length).toBeGreaterThan(0);
      const composed = compose(ctx, defaultSelectionState(ctx.model));
      expect(composed.errors).toEqual([]);
      expect(composed.plan.operations).toEqual(ctx.plan.operations);
      expect(composed.plan.requiredFields).toEqual(ctx.plan.requiredFields);
      if (required) expect(composed.plan.requiredFields).toEqual(required);
      expect(composed.plan.changes).toEqual(ctx.plan.changes);
      expect(composed.plan.items).toEqual(ctx.plan.items);
      expect(composed.plan.removalCount).toBe(ctx.plan.removalCount);
      expect(composed.plan.warnings).toEqual(ctx.plan.warnings);
      expect(composed.plan.message).toBe(ctx.plan.message);
      expect(composed.after).toEqual(ctx.plan.values!.after);
      // 何も選ばなければ反映先のまま
      const none = compose(ctx, { selected: [] });
      expect(none.plan.operations).toEqual([]);
      expect(none.after).toEqual(ctx.plan.values!.before);
      // 各モデルの変更は日本語の項目名と値の文字列を持つ
      for (const change of ctx.model.changes) {
        expect(change.labelPath.length).toBeGreaterThan(0);
        expect(change.labelPath.every(part => part.length > 0)).toBe(true);
        expect(change.beforeText).not.toBe('');
        expect(change.afterText).not.toBe('');
        expect(change.id).toBe(`${key}:${change.pointer}`);
      }
    });
  }

  it('反映先だけの設定を保持する項目でも、選ばなければ保持したまま（削除しない）', () => {
    const a = { type: 'LIST', fields: ['name'], index: '0' }, b = { type: 'LIST', fields: ['name'], index: '1' };
    const ctx = prepare('viewSettings', { views: { A: { ...a, filterCond: 'x' } } }, { views: { A: a, KEEP: b } });
    expect(ctx.plan.changes.some(change => change.kind === '保持')).toBe(true);
    const composed = compose(ctx, defaultSelectionState(ctx.model));
    expect(composed.after.views.KEEP).toEqual({ ...b, index: '1' });
    expect(composed.plan.changes).toEqual(ctx.plan.changes);
    expect(composed.plan.items).toEqual(ctx.plan.items);
    expect(copy(composed.after)).toEqual(copy(ctx.plan.values!.after));
  });

  it('全置換（反映先だけの設定を削除する）では、削除も 1 つの変更として選べる', () => {
    const a = { type: 'LIST', fields: ['name'], index: '0' }, b = { type: 'LIST', fields: ['name'], index: '1' };
    const ctx = prepare('viewSettings', { views: { A: a } }, { views: { A: a, GONE: b } }, { preserveTargetOnly: false });
    const removal = ctx.model.changes.find(change => change.kind === '削除')!;
    expect(removal).toMatchObject({ pointer: '/views/GONE', whole: true, afterText: '（なし）' });
    expect(compose(ctx, { selected: [] }).plan.operations).toEqual([]);
    const selected = compose(ctx, { selected: [removal.id] });
    expect(Object.keys(selected.after.views)).toEqual(['A']);
    expect(selected.plan.removalCount).toBe(1);
    expect(selected.plan.operations).toHaveLength(1);
    expect(selected.plan.operations).toEqual(ctx.plan.operations);
  });
});
