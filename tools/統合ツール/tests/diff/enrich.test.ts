import { describe, it, expect } from 'vitest';
import { computeDiffRows } from '../../src/diff/engine';
import { enrichDiffRows, buildStatusImpactIndex, extractEntityContext } from '../../src/diff/enrich';

function makeBundle(sections: Record<string, any>) {
  return { sections };
}

describe('diff/enrich (non-field improvements)', () => {
  describe('buildStatusImpactIndex', () => {
    it('indexes transition actions by referenced state names', () => {
      const bundle = makeBundle({
        processSettings: {
          enable: true,
          states: { 未処理: {}, 処理中: {}, 完了: {} },
          actions: [
            { name: '着手', from: '未処理', to: '処理中' },
            { name: '完了する', from: '処理中', to: '完了' }
          ]
        }
      });
      const index = buildStatusImpactIndex(bundle, null);
      expect(index.get('処理中')?.length).toBe(2);
      const kinds = (index.get('処理中') || []).map((r: any) => r.kind).sort();
      expect(kinds).toEqual(['遷移元参照', '遷移先参照']);
      expect(index.get('未処理')?.length).toBe(1);
    });
  });

  describe('enrichDiffRows: state removal impact', () => {
    it('attaches transition action refs to a removed state row', () => {
      const source = makeBundle({
        processSettings: {
          enable: true,
          states: { 未処理: {}, 完了: {}, 保留: {} },
          actions: [
            { name: '完了する', from: '未処理', to: '完了' },
            { name: '保留にする', from: '未処理', to: '保留' }
          ]
        }
      });
      const target = makeBundle({
        processSettings: {
          enable: true,
          states: { 未処理: {}, 完了: {} },
          actions: [
            { name: '完了する', from: '未処理', to: '完了' }
          ]
        }
      });
      const { rows } = computeDiffRows(source, target, ['processSettings'], '');
      const enriched = enrichDiffRows(rows, source, target);
      const stateRow = enriched.find((r: any) => r.path === 'processSettings.states.保留');
      expect(stateRow).toBeTruthy();
      expect(stateRow.type).toBe('removed');
      expect(stateRow.impactCount).toBeGreaterThan(0);
      expect(stateRow.impactRefs.some((ref: any) => ref.kind === '遷移先参照' && ref.label === '保留にする')).toBe(true);
    });
  });

  describe('enrichDiffRows: field removal impact covers ACL sections', () => {
    it('includes fieldAcl references for a removed field', () => {
      const source = makeBundle({
        fieldSettings: { properties: { price: { type: 'NUMBER', code: 'price', label: '価格' } } },
        fieldAcl: { rights: [{ code: 'price', entities: [{ entity: { type: 'GROUP', code: 'sales' }, accessibility: 'READ' }] }] }
      });
      const target = makeBundle({
        fieldSettings: { properties: {} },
        fieldAcl: { rights: [{ code: 'price', entities: [{ entity: { type: 'GROUP', code: 'sales' }, accessibility: 'READ' }] }] }
      });
      const { rows } = computeDiffRows(source, target, ['fieldSettings'], '');
      const enriched = enrichDiffRows(rows, source, target);
      const fieldRow = enriched.find((r: any) => r.path === 'fieldSettings.properties.price');
      expect(fieldRow).toBeTruthy();
      expect(fieldRow.impactRefs.some((ref: any) => ref.sectionKey === 'fieldAcl')).toBe(true);
    });
  });

  describe('extractEntityContext', () => {
    it('labels general notification rows by recipient entity', () => {
      const row = {
        sectionKey: 'notifications',
        path: 'notifications.notifications[0].includeSubs',
        type: 'changed',
        left: false,
        right: true,
        arrayKey: 'entity',
        arrayKeyValue: { type: 'GROUP', code: 'sales' }
      };
      const ctx = extractEntityContext(row);
      expect(ctx.entityKind).toBe('notification');
      expect(ctx.entityLabel).toBe('sales (GROUP)');
    });

    it('labels fieldAcl entity-level rows by target entity', () => {
      const row = {
        sectionKey: 'fieldAcl',
        path: 'fieldAcl.rights[0].entities[1].accessibility',
        type: 'changed',
        left: 'READ',
        right: 'NONE',
        arrayKey: 'entity',
        arrayKeyValue: { type: 'GROUP', code: 'support' }
      };
      const ctx = extractEntityContext(row);
      expect(ctx.entityKind).toBe('fieldAclEntry');
      expect(ctx.entityLabel).toBe('support (GROUP)');
      expect(ctx.propLabel).toBe('アクセス権');
    });
  });
});
