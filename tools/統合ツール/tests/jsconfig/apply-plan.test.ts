import { describe, it, expect } from 'vitest';
import {
  buildJsConfigApplyConfirmText,
  buildJsConfigApplyPlan,
  sanitizeFolderName,
  renderCustomizeResultHtml,
  formatFileSize
} from '../../src/tabs/jsconfig-standalone';

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

  it('ignores an invalid scope and rejects non-object or unrelated JSON input', () => {
    expect(buildJsConfigApplyPlan({ scope: 'everyone' }).scope).toBeNull();
    expect(() => buildJsConfigApplyPlan([])).toThrow(/desktop/);
    expect(() => buildJsConfigApplyPlan(null)).toThrow(/desktop/);
    expect(() => buildJsConfigApplyPlan({})).toThrow(/desktop/);
    expect(() => buildJsConfigApplyPlan({ properties: { a: { type: 'SINGLE_LINE_TEXT' } } })).toThrow(/desktop/);
  });

  it('rejects an all-invalid non-empty list instead of clearing current settings', () => {
    expect(() => buildJsConfigApplyPlan({
      desktop: { js: [{ type: 'FILE', file: {} }] }
    })).toThrow(/全削除/);
    expect(buildJsConfigApplyPlan({ desktop: { js: [], css: [] } }).counts.desktopJs).toBe(0);
  });

  it('warns about FILE fileKey reuse only when FILE entries exist and warns when 0 entries will clear settings', () => {
    const withFile = buildJsConfigApplyPlan({ desktop: { js: [{ type: 'FILE', file: { fileKey: 'k' } }] } });
    expect(buildJsConfigApplyConfirmText('5', '', withFile)).toContain('fileKey');
    const urlOnly = buildJsConfigApplyPlan({ desktop: { js: [{ type: 'URL', url: 'https://x' }] } });
    expect(buildJsConfigApplyConfirmText('5', '2', urlOnly)).not.toContain('fileKey');
    expect(buildJsConfigApplyConfirmText('5', '2', urlOnly)).toContain('App 5（ゲスト 2）');
    const emptyPlan = buildJsConfigApplyPlan({ desktop: { js: [], css: [] }, mobile: { js: [], css: [] } });
    expect(buildJsConfigApplyConfirmText('5', '', emptyPlan)).toContain('0件に初期化');
  });
});

describe('renderCustomizeResultHtml & formatFileSize', () => {
  it('renders URL/FILE counts and file size in preview HTML', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    const html = renderCustomizeResultHtml({
      scope: 'ALL',
      desktop: {
        js: [
          { type: 'URL', url: 'https://example.test/app.js' },
          { type: 'FILE', file: { name: 'bundle.js', fileKey: 'fk1', size: '2048' } }
        ],
        css: []
      },
      mobile: { js: [], css: [] }
    });
    expect(html).toContain('URL:1 / FILE:1');
    expect(html).toContain('bundle.js');
    expect(html).toContain('(2.0 KB)');
  });
});

describe('sanitizeFolderName', () => {
  it('replaces path separators and strips control characters', () => {
    expect(sanitizeFolderName('a/b:c*d?e"f<g>h|i')).toBe('a_b_c_d_e_f_g_h_i');
    expect(sanitizeFolderName('tab\there\u0000nul\nnl')).toBe('tabherenulnl');
    expect(sanitizeFolderName('  名前  ')).toBe('名前');
  });
});
