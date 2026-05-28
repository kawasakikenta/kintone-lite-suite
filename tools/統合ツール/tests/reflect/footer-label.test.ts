import { describe, it, expect } from 'vitest';
import { buildApplyButtonLabel } from '../../src/reflect/footerLabel';

describe('buildApplyButtonLabel', () => {
  it('shows the selected node count in node mode when applicable', () => {
    expect(buildApplyButtonLabel({ isNode: true, selectedNodeCount: 7, scopeCount: 0, canApply: true }))
      .toBe('プレビューへ反映（7件）');
  });

  it('shows the section count in section mode when applicable', () => {
    expect(buildApplyButtonLabel({ isNode: false, selectedNodeCount: 0, scopeCount: 3, canApply: true }))
      .toBe('プレビューへ反映（3セクション）');
  });

  it('falls back to the plain label when not applicable (disabled)', () => {
    expect(buildApplyButtonLabel({ isNode: true, selectedNodeCount: 7, scopeCount: 0, canApply: false }))
      .toBe('プレビューへ反映');
    expect(buildApplyButtonLabel({ isNode: false, selectedNodeCount: 0, scopeCount: 3, canApply: false }))
      .toBe('プレビューへ反映');
  });

  it('falls back to the plain label when count is zero even if canApply is true', () => {
    expect(buildApplyButtonLabel({ isNode: true, selectedNodeCount: 0, scopeCount: 0, canApply: true }))
      .toBe('プレビューへ反映');
    expect(buildApplyButtonLabel({ isNode: false, selectedNodeCount: 0, scopeCount: 0, canApply: true }))
      .toBe('プレビューへ反映');
  });

  it('is defensive against missing options', () => {
    // @ts-expect-error intentionally passing undefined
    expect(buildApplyButtonLabel(undefined)).toBe('プレビューへ反映');
  });
});
