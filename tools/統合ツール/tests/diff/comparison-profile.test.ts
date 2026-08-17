import { describe, expect, it } from 'vitest';
import {
  buildDiffComparisonProfile,
  DIFF_COMPARISON_PROFILE_KIND,
  DIFF_COMPARISON_PROFILE_LIMITS,
  DiffComparisonProfileError,
  parseDiffComparisonProfile,
  serializeDiffComparisonProfile
} from '../../src/diff/comparison-profile';

describe('diff/comparison-profile', () => {
  it('builds a canonical settings-only profile without mutating the input', () => {
    const input = {
      name: '  定期監査  ',
      savedAt: '2026-08-16T01:02:03+09:00',
      scopes: ['fieldSettings', 'unknown', 'fieldSettings', 'viewSettings'],
      ignoreKeys: 'revision, updatedAt, __proto__, revision',
      includeSame: true,
      normalizationPresetState: {
        viewOrder: true,
        permissionOrder: false,
        unknownPreset: true,
        constructor: true
      },
      display: { charDiff: false, showResultList: true, density: 'compact', layout: 'stacked', unsafe: 'discard' },
      appId: 123,
      guestId: '9',
      sourceBundle: { secret: 'DO_NOT_EXPORT' },
      targetValue: 'DO_NOT_EXPORT'
    };
    const before = JSON.stringify(input);

    const profile = buildDiffComparisonProfile(input);

    expect(profile).toEqual({
      kind: DIFF_COMPARISON_PROFILE_KIND,
      version: 1,
      name: '定期監査',
      savedAt: '2026-08-15T16:02:03.000Z',
      scopes: ['fieldSettings', 'viewSettings'],
      ignoreKeys: 'revision, updatedAt',
      includeSame: true,
      normalizationPresetState: { viewOrder: true, permissionOrder: false },
      display: { charDiff: false, showResultList: true, density: 'compact', layout: 'stacked' }
    });
    expect(JSON.stringify(input)).toBe(before);
    const serialized = JSON.stringify(profile);
    expect(serialized).not.toContain('appId');
    expect(serialized).not.toContain('guestId');
    expect(serialized).not.toContain('Bundle');
    expect(serialized).not.toContain('Value');
    expect(serialized).not.toContain('DO_NOT_EXPORT');
  });

  it('round-trips a profile through safe parsing and serialization', () => {
    const serialized = serializeDiffComparisonProfile({
      name: '標準比較',
      savedAt: 1_700_000_000_000,
      scopes: ['layoutSettings'],
      ignoreKeys: ['revision', 'creator'],
      includeSame: false,
      normalizationPresetState: { fieldOrder: true },
      display: { charDiff: true, showResultList: false, density: 'comfortable', layout: 'stacked' },
      appId: 99
    });
    const parsed = parseDiffComparisonProfile(serialized);

    expect(parsed.kind).toBe('kintone-diff-comparison-profile');
    expect(parsed.version).toBe(1);
    expect(parsed.savedAt).toBe('2023-11-14T22:13:20.000Z');
    expect(parsed.scopes).toEqual(['layoutSettings']);
    expect(parsed.ignoreKeys).toBe('revision, creator');
    expect(parsed.display).toEqual({ charDiff: true, showResultList: false, density: 'comfortable', layout: 'stacked' });
    expect(serialized).not.toContain('appId');
  });

  it('falls back to the split layout for an unsupported display value', () => {
    const profile = buildDiffComparisonProfile({
      name: 'layout fallback',
      scopes: ['fieldSettings'],
      display: { layout: 'diagonal' }
    });

    expect(profile.display.layout).toBe('split');
  });

  it('safely parses a legacy minimal object and supplies optional defaults', () => {
    const parsed = parseDiffComparisonProfile({
      name: '旧プロファイル',
      scopes: 'fieldSettings, viewSettings'
    });

    expect(parsed.kind).toBe(DIFF_COMPARISON_PROFILE_KIND);
    expect(parsed.version).toBe(1);
    expect(parsed.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(parsed.scopes).toEqual(['fieldSettings', 'viewSettings']);
    expect(parsed.ignoreKeys).toBe('');
    expect(parsed.includeSame).toBe(false);
    expect(parsed.normalizationPresetState).toEqual({});
    expect(parsed.display).toEqual({ charDiff: true, showResultList: true, density: 'standard', layout: 'split' });
  });

  it('round-trips an exact ignore path whose entity name contains spaces', () => {
    const profile = buildDiffComparisonProfile({
      name: '空白を含むビュー',
      scopes: ['viewSettings'],
      ignoreKeys: 'revision\nviewSettings.views.営業 一覧.filterCond'
    });
    expect(profile.ignoreKeys).toBe('revision, viewSettings.views.営業 一覧.filterCond');
    expect(parseDiffComparisonProfile(serializeDiffComparisonProfile(profile)).ignoreKeys)
      .toContain('viewSettings.views.営業 一覧.filterCond');
  });

  it('keeps case-distinct encoded literal paths as separate rules', () => {
    const profile = buildDiffComparisonProfile({
      name: '大小文字を区別',
      scopes: ['viewSettings'],
      ignoreKeys: [
        'path:viewSettings.views.SalesView.filterCond',
        'path:viewSettings.views.salesView.filterCond'
      ]
    });
    expect(profile.ignoreKeys).toContain('path:viewSettings.views.SalesView.filterCond');
    expect(profile.ignoreKeys).toContain('path:viewSettings.views.salesView.filterCond');
  });

  it('ignores inherited values, accessors, and prototype-pollution keys', () => {
    const polluted = JSON.parse('{"__proto__":{"polluted":true},"constructor":true,"viewOrder":true}');
    const input = Object.create({ includeSame: true, display: { density: 'compact' } });
    Object.defineProperties(input, {
      name: { value: '安全確認', enumerable: true },
      savedAt: { value: '2026-08-16T00:00:00.000Z', enumerable: true },
      scopes: { value: ['fieldSettings'], enumerable: true },
      normalizationPresetState: { value: polluted, enumerable: true },
      ignoreKeys: { get: () => { throw new Error('getter must not run'); }, enumerable: true }
    });

    const profile = buildDiffComparisonProfile(input);

    expect(profile.includeSame).toBe(false);
    expect(profile.display).toEqual({ charDiff: true, showResultList: true, density: 'standard', layout: 'split' });
    expect(profile.normalizationPresetState).toEqual({ viewOrder: true });
    expect(profile.ignoreKeys).toBe('');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects malformed, mismatched, or unsupported profile envelopes in Japanese', () => {
    expect(() => parseDiffComparisonProfile('{')).toThrow('JSON形式が正しくありません');
    expect(() => parseDiffComparisonProfile({ kind: 'another-kind', name: 'x', scopes: ['fieldSettings'] }))
      .toThrow('種類が正しくありません');
    expect(() => parseDiffComparisonProfile({ version: 2, name: 'x', scopes: ['fieldSettings'] }))
      .toThrow('対応していない');
  });

  it('requires a name and at least one known SECTION_DEFS scope', () => {
    expect(() => buildDiffComparisonProfile({ name: '', scopes: ['fieldSettings'] }))
      .toThrow('プロファイル名を入力してください');
    expect(() => buildDiffComparisonProfile({ name: '対象なし', scopes: ['unknown', '__proto__'] }))
      .toThrow('比較対象セクションを1つ以上指定してください');
  });

  it('enforces realistic string and array limits', () => {
    expect(() => buildDiffComparisonProfile({
      name: 'x'.repeat(DIFF_COMPARISON_PROFILE_LIMITS.nameLength + 1),
      scopes: ['fieldSettings']
    })).toThrow('文字以内');

    expect(() => buildDiffComparisonProfile({
      name: '範囲超過',
      scopes: Array.from({ length: DIFF_COMPARISON_PROFILE_LIMITS.scopeItems + 1 }, () => 'fieldSettings')
    })).toThrow('件以内');

    expect(() => buildDiffComparisonProfile({
      name: 'キー超過',
      scopes: ['fieldSettings'],
      ignoreKeys: ['x'.repeat(DIFF_COMPARISON_PROFILE_LIMITS.ignoreKeyLength + 1)]
    })).toThrow('無視キー1件');

    const oversizedJson = ' '.repeat(DIFF_COMPARISON_PROFILE_LIMITS.jsonLength + 1);
    expect(() => parseDiffComparisonProfile(oversizedJson)).toThrow('JSONが大きすぎます');
  });

  it('uses a dedicated Japanese validation error type', () => {
    expect(() => buildDiffComparisonProfile(null)).toThrow(DiffComparisonProfileError);
    expect(() => buildDiffComparisonProfile(null)).toThrow('オブジェクトで指定してください');
  });
});
