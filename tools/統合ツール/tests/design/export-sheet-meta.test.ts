import { describe, it, expect } from 'vitest';
import { getDesignExportSheetMeta } from '../../src/tabs/design-xlsx';

describe('design export sheet meta', () => {
  const { defs, categories, presets } = getDesignExportSheetMeta();
  const defKeys = new Set(defs.map((d) => d.key));
  const catKeys = new Set(categories.map((c) => c.key));

  it('has unique sheet keys', () => {
    expect(defKeys.size).toBe(defs.length);
  });

  it('assigns every sheet to a known category', () => {
    for (const d of defs) {
      expect(catKeys.has(d.cat)).toBe(true);
    }
  });

  it('only references existing sheet keys from presets', () => {
    for (const p of presets) {
      if (p.keys == null) continue; // null = すべて
      for (const k of p.keys) {
        expect(defKeys.has(k)).toBe(true);
      }
    }
  });

  it('keeps non-empty presets actually selecting at least one sheet', () => {
    for (const p of presets) {
      if (p.keys == null) continue;
      expect(p.keys.length).toBeGreaterThan(0);
    }
  });
});
