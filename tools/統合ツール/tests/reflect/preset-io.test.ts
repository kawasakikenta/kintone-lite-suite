import { describe, it, expect } from 'vitest';
import {
  REFLECT_PRESETS_EXPORT_KIND,
  normalizeReflectPreset,
  buildReflectPresetsExport,
  normalizeImportedReflectPresets,
  mergeReflectPresets
} from '../../src/reflect/presetIo';

describe('normalizeReflectPreset', () => {
  it('rejects entries without a usable name', () => {
    expect(normalizeReflectPreset(null)).toBeNull();
    expect(normalizeReflectPreset({})).toBeNull();
    expect(normalizeReflectPreset({ name: '   ' })).toBeNull();
  });

  it('coerces endpoints, scopes and options with sane defaults', () => {
    const preset = normalizeReflectPreset({
      name: '  開発→検証  ',
      source: { appId: 12, guestId: ' g1 ', preview: 1 },
      scopes: ['fieldSettings', ' fieldSettings ', 'viewSettings', ''],
      applyDiffOnly: 'yes',
      lookupMap: '10=20'
    });
    expect(preset).not.toBeNull();
    expect(preset!.name).toBe('開発→検証');
    expect(preset!.source).toEqual({ appId: '12', guestId: 'g1', preview: true });
    expect(preset!.target).toEqual({ appId: '', guestId: '', preview: false });
    expect(preset!.scopes).toEqual(['fieldSettings', 'viewSettings']);
    expect(preset!.applyDiffOnly).toBe(true);
    expect(preset!.lookupMap).toBe('10=20');
    expect(typeof preset!.createdAt).toBe('string');
  });

  it('preserves an existing createdAt string', () => {
    const preset = normalizeReflectPreset({ name: 'x', createdAt: '2024-01-01T00:00:00.000Z' });
    expect(preset!.createdAt).toBe('2024-01-01T00:00:00.000Z');
  });
});

describe('buildReflectPresetsExport', () => {
  it('wraps normalized presets with kind/count metadata and drops invalid ones', () => {
    const payload = buildReflectPresetsExport([
      { name: 'a', scopes: ['fieldSettings'] },
      { name: '' },
      null
    ]);
    expect(payload.kind).toBe(REFLECT_PRESETS_EXPORT_KIND);
    expect(payload.count).toBe(1);
    expect(payload.presets).toHaveLength(1);
    expect(payload.presets[0].name).toBe('a');
    expect(typeof payload.exportedAt).toBe('string');
  });
});

describe('normalizeImportedReflectPresets', () => {
  it('accepts the wrapped export format', () => {
    const res = normalizeImportedReflectPresets({
      kind: REFLECT_PRESETS_EXPORT_KIND,
      presets: [{ name: 'a' }, { name: 'b' }]
    });
    expect(res.error).toBeUndefined();
    expect(res.presets.map((p) => p.name)).toEqual(['a', 'b']);
  });

  it('accepts a bare array (no kind wrapper)', () => {
    const res = normalizeImportedReflectPresets([{ name: 'a' }, { name: '' }]);
    expect(res.error).toBeUndefined();
    expect(res.presets.map((p) => p.name)).toEqual(['a']);
  });

  it('rejects a mismatched kind', () => {
    const res = normalizeImportedReflectPresets({ kind: 'reflect-selection', items: [] });
    expect(res.presets).toEqual([]);
    expect(res.error).toMatch(/反映プリセットとして認識できません/);
  });

  it('rejects objects without a presets array', () => {
    const res = normalizeImportedReflectPresets({ foo: 1 });
    expect(res.presets).toEqual([]);
    expect(res.error).toMatch(/presets 配列/);
  });
});

describe('mergeReflectPresets', () => {
  it('places imported presets first and overwrites same-named entries', () => {
    const existing = [
      { name: 'keep', scopes: ['viewSettings'] },
      { name: 'dup', scopes: ['fieldSettings'] }
    ];
    const incoming = [
      normalizeReflectPreset({ name: 'dup', scopes: ['generalSettings'] })!,
      normalizeReflectPreset({ name: 'fresh' })!
    ];
    const res = mergeReflectPresets(existing, incoming);
    expect(res.presets.map((p) => p.name)).toEqual(['dup', 'fresh', 'keep']);
    expect(res.presets[0].scopes).toEqual(['generalSettings']); // overwritten
    expect(res.added).toBe(1);
    expect(res.replaced).toBe(1);
  });

  it('honors the limit by trimming the tail', () => {
    const existing = Array.from({ length: 5 }, (_v, i) => ({ name: `e${i}` }));
    const incoming = [normalizeReflectPreset({ name: 'new' })!];
    const res = mergeReflectPresets(existing, incoming, 3);
    expect(res.presets).toHaveLength(3);
    expect(res.presets[0].name).toBe('new');
  });

  it('is defensive against nullish inputs', () => {
    expect(mergeReflectPresets(null, null)).toEqual({ presets: [], added: 0, replaced: 0 });
  });
});
