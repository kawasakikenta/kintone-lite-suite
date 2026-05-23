import { describe, it, expect } from 'vitest';
import { detectRowSeverity, isIgnoredKey, parseIgnoreRules } from '../../src/diff/engine';

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
});
