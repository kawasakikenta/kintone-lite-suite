import { describe, it, expect } from 'vitest';
import {
  formatApplyHistoryModeLabel,
  summarizeApplyHistory,
  resolveReplayScopeKeys,
  type ApplyHistoryEntry
} from '../../src/reflect/applyHistorySummary';

describe('formatApplyHistoryModeLabel', () => {
  it('maps known modes to Japanese labels', () => {
    expect(formatApplyHistoryModeLabel('section')).toBe('まとめ反映');
    expect(formatApplyHistoryModeLabel('nodes')).toBe('差分選択');
    expect(formatApplyHistoryModeLabel('patch')).toBe('JSONパッチ');
    expect(formatApplyHistoryModeLabel('retry')).toBe('再反映');
    expect(formatApplyHistoryModeLabel('restore')).toBe('復元');
  });

  it('falls back to the raw mode for unknown values and a default for empty', () => {
    expect(formatApplyHistoryModeLabel('custom-mode')).toBe('custom-mode');
    expect(formatApplyHistoryModeLabel('')).toBe('反映');
    expect(formatApplyHistoryModeLabel(undefined)).toBe('反映');
    expect(formatApplyHistoryModeLabel(null)).toBe('反映');
  });
});

describe('summarizeApplyHistory', () => {
  it('returns a zeroed summary for empty / invalid input', () => {
    expect(summarizeApplyHistory([])).toEqual({
      count: 0, totalOk: 0, totalNg: 0, totalSkip: 0, errorEntryCount: 0, lastAppliedAt: null
    });
    expect(summarizeApplyHistory(null)).toEqual({
      count: 0, totalOk: 0, totalNg: 0, totalSkip: 0, errorEntryCount: 0, lastAppliedAt: null
    });
    // @ts-expect-error intentionally passing a non-array
    expect(summarizeApplyHistory({}).count).toBe(0);
  });

  it('accumulates counts and tracks the latest timestamp', () => {
    const entries: ApplyHistoryEntry[] = [
      { at: 1000, mode: 'section', okCount: 3, ngCount: 0, skipCount: 1 },
      { at: 3000, mode: 'nodes', okCount: 2, ngCount: 2, skipCount: 0, hadError: true },
      { at: 2000, mode: 'patch', okCount: 1, ngCount: 0, skipCount: 0 }
    ];
    expect(summarizeApplyHistory(entries)).toEqual({
      count: 3,
      totalOk: 6,
      totalNg: 2,
      totalSkip: 1,
      errorEntryCount: 1,
      lastAppliedAt: 3000
    });
  });

  it('counts an entry as an error when ngCount > 0 even without hadError', () => {
    const entries: ApplyHistoryEntry[] = [
      { at: 1, okCount: 0, ngCount: 1 },
      { at: 2, okCount: 5, ngCount: 0, hadError: true }
    ];
    const summary = summarizeApplyHistory(entries);
    expect(summary.errorEntryCount).toBe(2);
  });

  it('ignores malformed entries and negative/NaN counts', () => {
    const entries = [
      null,
      undefined,
      'oops',
      { at: 10, okCount: -5, ngCount: Number.NaN, skipCount: '2' }
    ] as unknown as ApplyHistoryEntry[];
    expect(summarizeApplyHistory(entries)).toEqual({
      count: 1, totalOk: 0, totalNg: 0, totalSkip: 2, errorEntryCount: 0, lastAppliedAt: 10
    });
  });
});

describe('resolveReplayScopeKeys', () => {
  const available = ['fieldSettings', 'viewSettings', 'generalSettings'];

  it('keeps only keys that exist in the available scopes, preserving order', () => {
    const res = resolveReplayScopeKeys(['viewSettings', 'fieldSettings'], available);
    expect(res.applicable).toEqual(['viewSettings', 'fieldSettings']);
    expect(res.unavailable).toEqual([]);
  });

  it('splits keys that are no longer selectable into unavailable', () => {
    const res = resolveReplayScopeKeys(['fieldSettings', 'legacySection', 'viewSettings'], available);
    expect(res.applicable).toEqual(['fieldSettings', 'viewSettings']);
    expect(res.unavailable).toEqual(['legacySection']);
  });

  it('de-duplicates and trims keys', () => {
    const res = resolveReplayScopeKeys(['fieldSettings', ' fieldSettings ', 'fieldSettings'], available);
    expect(res.applicable).toEqual(['fieldSettings']);
  });

  it('is defensive against empty / nullish inputs', () => {
    expect(resolveReplayScopeKeys(null, available)).toEqual({ applicable: [], unavailable: [] });
    expect(resolveReplayScopeKeys(['fieldSettings'], null)).toEqual({ applicable: [], unavailable: ['fieldSettings'] });
    expect(resolveReplayScopeKeys(['', '  ', null as unknown as string], available)).toEqual({ applicable: [], unavailable: [] });
  });

  it('accepts a Set as the available scope source', () => {
    const res = resolveReplayScopeKeys(['viewSettings', 'x'], new Set(available));
    expect(res.applicable).toEqual(['viewSettings']);
    expect(res.unavailable).toEqual(['x']);
  });
});
