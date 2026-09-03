import { describe, it, expect } from 'vitest';
import { buildJsConfigApplyConfirmText, buildJsConfigApplyPlan, sanitizeFolderName } from '../../src/tabs/jsconfig-standalone';

// JS/CSS 設定 lite の反映は取得 JSON をそのまま PUT していたため、GET 専用項目や
// 不正なエントリがそのまま送られていた。送信形の正規化と件数表示を固定する。

describe('buildJsConfigApplyPlan', () => {
  it('normalizes the payload, counts entries and keeps a valid scope', () => {
    const plan = buildJsConfigApplyPlan({
      scope: 'admin',
      revision: '9',
      desktop: {
        js: [
          { type: 'FILE', file: { fileKey: 'k1', name: 'a.js', size: '10' }, _bodyText: 'x' },
          { type: 'URL', url: 'https://example.test/a.js' },
          { type: 'FILE', file: {} }
        ],
        css: []
      },
      mobile: { js: [{ type: 'URL', url: 'https://example.test/m.js' }] }
    });
    expect(plan.payload).toEqual({
      desktop: { js: [{ type: 'FILE', file: { fileKey: 'k1' } }, { type: 'URL', url: 'https://example.test/a.js' }], css: [] },
      mobile: { js: [{ type: 'URL', url: 'https://example.test/m.js' }], css: [] }
    });
    expect(plan.scope).toBe('ADMIN');
    expect(plan.counts).toEqual({ desktopJs: 2, desktopCss: 0, mobileJs: 1, mobileCss: 0, file: 1, url: 2 });
    expect(plan.dropped).toBe(1);
  });

  it('ignores an invalid scope and rejects non-object input', () => {
    expect(buildJsConfigApplyPlan({ scope: 'everyone' }).scope).toBeNull();
    expect(() => buildJsConfigApplyPlan([])).toThrow(/desktop/);
    expect(() => buildJsConfigApplyPlan(null)).toThrow(/desktop/);
  });

  it('rejects an all-invalid non-empty list instead of clearing current settings', () => {
    expect(() => buildJsConfigApplyPlan({
      desktop: { js: [{ type: 'FILE', file: {} }] }
    })).toThrow(/全削除/);
    expect(buildJsConfigApplyPlan({ desktop: { js: [], css: [] } }).counts.desktopJs).toBe(0);
  });

  it('warns about FILE fileKey reuse only when FILE entries exist', () => {
    const withFile = buildJsConfigApplyPlan({ desktop: { js: [{ type: 'FILE', file: { fileKey: 'k' } }] } });
    expect(buildJsConfigApplyConfirmText('5', '', withFile)).toContain('fileKey');
    const urlOnly = buildJsConfigApplyPlan({ desktop: { js: [{ type: 'URL', url: 'https://x' }] } });
    expect(buildJsConfigApplyConfirmText('5', '2', urlOnly)).not.toContain('fileKey');
    expect(buildJsConfigApplyConfirmText('5', '2', urlOnly)).toContain('App 5（ゲスト 2）');
  });
});

describe('sanitizeFolderName', () => {
  it('replaces path separators and strips control characters', () => {
    expect(sanitizeFolderName('a/b:c*d?e"f<g>h|i')).toBe('a_b_c_d_e_f_g_h_i');
    expect(sanitizeFolderName('tab\there\u0000nul\nnl')).toBe('tabherenulnl');
    expect(sanitizeFolderName('  名前  ')).toBe('名前');
  });
});
