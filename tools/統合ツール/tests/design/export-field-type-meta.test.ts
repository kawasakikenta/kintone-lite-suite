import { describe, it, expect } from 'vitest';
import { getDesignExportFieldTypeMeta } from '../../src/tabs/design-xlsx';

describe('design export field-type meta', () => {
  const { defs, categories, labels } = getDesignExportFieldTypeMeta();
  const defKeys = new Set(defs.map((d) => d.key));
  const catKeys = new Set(categories.map((c) => c.key));

  it('has unique field-type keys', () => {
    expect(defKeys.size).toBe(defs.length);
  });

  it('assigns every field type to a known category', () => {
    for (const d of defs) {
      expect(catKeys.has(d.cat)).toBe(true);
    }
  });

  it('exposes the layout/decoration types that callers want to exclude', () => {
    for (const key of ['LABEL', 'HR', 'SPACER', 'GROUP']) {
      expect(defKeys.has(key)).toBe(true);
    }
  });

  it('gives every field type a non-empty label', () => {
    for (const d of defs) {
      expect(typeof d.label).toBe('string');
      expect(d.label.length).toBeGreaterThan(0);
    }
  });

  it('keeps data-type keys aligned with the shared label dictionary', () => {
    for (const d of defs) {
      // GROUP のみ見出し用に独自ラベル。それ以外は共有辞書と一致させる。
      if (d.key === 'GROUP') continue;
      expect(labels[d.key]).toBe(d.label);
    }
  });
});
