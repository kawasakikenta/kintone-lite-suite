import { describe, it, expect } from 'vitest';
import {
  detectRowSeverity, isIgnoredKey, parseIgnoreRules,
  hasUniquePrimitiveKey, computeDiffRows
} from '../../src/diff/engine';

function makeBundle(sections: Record<string, any>) {
  return { sections };
}

function diffRows(sourceSections: Record<string, any>, targetSections: Record<string, any>, sections: string[]) {
  const { rows } = computeDiffRows(makeBundle(sourceSections), makeBundle(targetSections), sections, '');
  return rows.filter((r: any) => r.type !== 'same');
}

describe('diff/engine', () => {
  describe('detectRowSeverity', () => {
    it('returns low for simple decoration changes', () => {
      const row = { sectionKey: 'fieldSettings', path: 'fieldSettings.width', type: 'changed' };
      expect(detectRowSeverity(row)).toBe('low');
    });

    it('returns high for ACL downgrade (true -> false)', () => {
      const row = { sectionKey: 'appAcl', path: 'appAcl.recordViewable', type: 'changed', left: true, right: false };
      expect(detectRowSeverity(row)).toBe('high');
    });

    it('returns medium for ACL upgrade (false -> true)', () => {
      const row = { sectionKey: 'appAcl', path: 'appAcl.recordViewable', type: 'changed', left: false, right: true };
      expect(detectRowSeverity(row)).toBe('medium');
    });

    it('returns high for HIGH_IMPACT_SECTIONS removal', () => {
      const row = { sectionKey: 'fieldSettings', path: 'fieldSettings.code1', type: 'removed' };
      expect(detectRowSeverity(row)).toBe('high');
    });
  });

  describe('parseIgnoreRules & isIgnoredKey', () => {
    it('parses comma separated ignore keys', () => {
      const rules = parseIgnoreRules('id, name, revision');
      expect(isIgnoredKey(rules, 'id')).toBe(true);
      expect(isIgnoredKey(rules, 'name')).toBe(true);
      expect(isIgnoredKey(rules, 'revision')).toBe(true);
      expect(isIgnoredKey(rules, 'code')).toBe(false);
    });

    it('supports wildcard patterns', () => {
      const rules = parseIgnoreRules('test_*');
      expect(isIgnoredKey(rules, 'test_abc')).toBe(true);
      expect(isIgnoredKey(rules, 'test_123')).toBe(true);
      expect(isIgnoredKey(rules, 'other_test')).toBe(false);
    });
  });

  describe('detectRowSeverity (non-field refinements)', () => {
    it('returns high when process management is turned off', () => {
      const row = { sectionKey: 'processSettings', path: 'processSettings.enable', type: 'changed', left: true, right: false };
      expect(detectRowSeverity(row)).toBe('high');
    });

    it('returns medium when process management is turned on', () => {
      const row = { sectionKey: 'processSettings', path: 'processSettings.enable', type: 'changed', left: false, right: true };
      expect(detectRowSeverity(row)).toBe('medium');
    });

    it('returns high for plugin removal', () => {
      const row = { sectionKey: 'pluginSettings', path: 'pluginSettings.plugins[2]', type: 'removed' };
      expect(detectRowSeverity(row)).toBe('high');
    });

    it('returns medium for plugin addition', () => {
      const row = { sectionKey: 'pluginSettings', path: 'pluginSettings.plugins[0]', type: 'added' };
      expect(detectRowSeverity(row)).toBe('medium');
    });

    it('returns high for plugin disabling', () => {
      const row = { sectionKey: 'pluginSettings', path: 'pluginSettings.plugins[0].enabled', type: 'changed', left: true, right: false };
      expect(detectRowSeverity(row)).toBe('high');
    });

    it('returns high for JS/CSS item removal', () => {
      const row = { sectionKey: 'customizeSettings', path: 'customizeSettings.desktop.js[1]', type: 'removed' };
      expect(detectRowSeverity(row)).toBe('high');
    });
  });

  describe('hasUniquePrimitiveKey', () => {
    it('rejects boolean keys as identities', () => {
      const arr = [{ includeSubs: true }, { includeSubs: false }];
      expect(hasUniquePrimitiveKey(arr, 'includeSubs')).toBe(false);
    });
  });

  describe('composite-key array matching (appAcl.rights)', () => {
    const rights = (entries: Array<[string, string, boolean]>) => ({
      rights: entries.map(([type, code, editable]) => ({
        entity: { type, code },
        includeSubs: false,
        appEditable: editable,
        recordViewable: true
      }))
    });

    it('reorder of ACL entries yields moved rows, not added/removed', () => {
      const src = rights([['USER', 'u1', true], ['GROUP', 'g1', false]]);
      const tgt = rights([['GROUP', 'g1', false], ['USER', 'u1', true]]);
      const rows = diffRows({ appAcl: src }, { appAcl: tgt }, ['appAcl']);
      expect(rows.every((r: any) => r.type === 'changed' && r.moved)).toBe(true);
      expect(rows.length).toBe(2);
    });

    it('flag change on one entity yields a single changed row with entity context', () => {
      const src = rights([['USER', 'u1', true], ['GROUP', 'g1', false]]);
      const tgt = rights([['GROUP', 'g1', false], ['USER', 'u1', false]]);
      const rows = diffRows({ appAcl: src }, { appAcl: tgt }, ['appAcl']);
      const changed = rows.filter((r: any) => !r.moved);
      expect(changed.length).toBe(1);
      expect(changed[0].path).toMatch(/appEditable$/);
      expect(changed[0].arrayKey).toBe('entity');
      expect(changed[0].arrayKeyValue).toEqual({ type: 'USER', code: 'u1' });
      expect(rows.some((r: any) => r.type === 'added' || r.type === 'removed')).toBe(false);
    });

    it('entity removal is reported as removed with entity key', () => {
      const src = rights([['USER', 'u1', true], ['GROUP', 'g1', false]]);
      const tgt = rights([['USER', 'u1', true]]);
      const rows = diffRows({ appAcl: src }, { appAcl: tgt }, ['appAcl']);
      expect(rows.length).toBe(1);
      expect(rows[0].type).toBe('removed');
      expect(rows[0].arrayKeyValue).toEqual({ type: 'GROUP', code: 'g1' });
    });
  });

  describe('composite-key array matching (process actions with duplicate names)', () => {
    it('matches actions by name|from|to when no single key is unique', () => {
      const src = {
        enable: true,
        states: { draft: {}, review: {}, done: {} },
        actions: [
          { name: '承認', from: 'draft', to: 'review', filterCond: '' },
          { name: '承認', from: 'review', to: 'done', filterCond: '' },
          { name: '却下', from: 'review', to: 'draft', filterCond: '' },
          { name: '却下', from: 'done', to: 'draft', filterCond: '' }
        ]
      };
      const tgt = JSON.parse(JSON.stringify(src));
      tgt.actions[1].filterCond = 'status = "A"';
      const rows = diffRows({ processSettings: src }, { processSettings: tgt }, ['processSettings']);
      expect(rows.length).toBe(1);
      expect(rows[0].type).toBe('changed');
      expect(rows[0].path).toMatch(/filterCond$/);
      expect(rows[0].arrayKey).toBe('name');
      expect(rows[0].arrayKeyValue).toBe('承認');
    });
  });

  describe('composite-key array matching (fieldAcl entities)', () => {
    it('pairs entity-level accessibility changes by entity identity', () => {
      const src = {
        rights: [{
          code: 'price',
          entities: [
            { entity: { type: 'GROUP', code: 'sales' }, accessibility: 'READ_WRITE' },
            { entity: { type: 'GROUP', code: 'support' }, accessibility: 'READ' }
          ]
        }]
      };
      const tgt = JSON.parse(JSON.stringify(src));
      tgt.rights[0].entities = [tgt.rights[0].entities[1], tgt.rights[0].entities[0]];
      tgt.rights[0].entities[0].accessibility = 'NONE';
      const rows = diffRows({ fieldAcl: src }, { fieldAcl: tgt }, ['fieldAcl']);
      const real = rows.filter((r: any) => !r.moved);
      expect(real.length).toBe(1);
      expect(real[0].path).toMatch(/accessibility$/);
      expect(real[0].arrayKeyValue).toEqual({ type: 'GROUP', code: 'support' });
      expect(rows.some((r: any) => r.type === 'added' || r.type === 'removed')).toBe(false);
    });
  });

  describe('pure-reorder detection', () => {
    it('reports layout row reorder as moved rows instead of added/removed', () => {
      const rowA = { type: 'ROW', fields: [{ type: 'SINGLE_LINE_TEXT', code: 'a' }] };
      const rowB = { type: 'ROW', fields: [{ type: 'NUMBER', code: 'b' }] };
      const rowC = { type: 'ROW', fields: [{ type: 'DATE', code: 'c' }] };
      const src = { layout: [rowA, rowB, rowC] };
      const tgt = { layout: [rowC, rowA, rowB] };
      const rows = diffRows({ layoutSettings: src }, { layoutSettings: tgt }, ['layoutSettings']);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r: any) => r.type === 'changed' && r.moved)).toBe(true);
      expect(rows.every((r: any) => r.severity === 'low')).toBe(true);
    });
  });
});
