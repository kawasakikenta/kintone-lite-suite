import { describe, expect, it } from 'vitest';
import { stripComparisonScratchForRetention } from '../../src/diff/retention';
import { collectPartialComparisonIssues } from '../../src/tabs/diff-standalone';

const BODY = 'x'.repeat(200_000);

function bundleWithScratch() {
  return {
    appId: '202',
    sections: {
      fieldSettings: { properties: { a: { type: 'SINGLE_LINE_TEXT', code: 'a', label: 'A' } } },
      customizeSettings: {
        scope: 'ALL',
        desktop: {
          js: [
            { type: 'FILE', file: { fileKey: 'k1', name: 'main.js' }, _bodyText: BODY, _bodyHash: 'h1' },
            { type: 'FILE', file: { fileKey: 'k2', name: 'big.js' }, _bodyUnavailable: 'oversize' },
            { type: 'URL', url: 'https://example.com/a.js' }
          ],
          css: [{ type: 'FILE', file: { fileKey: 'k3', name: 'a.css' }, _bodyText: BODY, _bodyHash: 'h3' }]
        },
        mobile: { js: [], css: [] },
        _partial: { kind: 'customizeBody', message: '一部ファイルは本文比較を省略し、fileKey で比較します', files: [{ fileName: 'big.js', fileKey: 'k2', reason: 'oversize' }] }
      },
      pluginSettings: { plugins: [{ id: 'p1', name: 'P1', enabled: true, _config: { color: 'red' } }, { id: 'p2', name: 'P2', enabled: true }] }
    }
  };
}

describe('diff/retention 比較結果を保持する前の整理', () => {
  it('JS/CSS の本文・ハッシュとプラグインの取得結果だけを取り除く', () => {
    const bundle = stripComparisonScratchForRetention(bundleWithScratch()) as any;
    const items = [...bundle.sections.customizeSettings.desktop.js, ...bundle.sections.customizeSettings.desktop.css];
    expect(items.some((item: any) => '_bodyText' in item || '_bodyHash' in item)).toBe(false);
    expect(bundle.sections.pluginSettings.plugins.some((plugin: any) => '_config' in plugin)).toBe(false);
    // 設定の内容・取得状況・URL は残す
    expect(bundle.sections.customizeSettings.desktop.js[0].file).toEqual({ fileKey: 'k1', name: 'main.js' });
    expect(bundle.sections.customizeSettings.desktop.js[1]._bodyUnavailable).toBe('oversize');
    expect(bundle.sections.customizeSettings.desktop.js[2].url).toBe('https://example.com/a.js');
    expect(bundle.sections.customizeSettings._partial.files).toHaveLength(1);
    expect(bundle.sections.fieldSettings.properties.a.label).toBe('A');
    expect(bundle.sections.pluginSettings.plugins.map((plugin: any) => plugin.id)).toEqual(['p1', 'p2']);
  });

  it('保持量が本文の分だけ小さくなる', () => {
    const before = JSON.stringify(bundleWithScratch()).length;
    const after = JSON.stringify(stripComparisonScratchForRetention(bundleWithScratch())).length;
    expect(before - after).toBeGreaterThanOrEqual(2 * BODY.length);
  });

  it('一部未検証の判定は比較の時点で終わっており、整理は「本文を比較できなかった」記録（_bodyUnavailable・_partial）を残す', () => {
    // 判定（collectPartialComparisonIssues）は本文の有無を見るため、整理の前に行う（runDiffStandalone が比較中に行う）。
    const issues = collectPartialComparisonIssues(bundleWithScratch(), bundleWithScratch());
    expect(issues.flatMap((issue: any) => issue.files.map((file: any) => file.fileName))).toEqual(['big.js', 'big.js']);
    const stripped = stripComparisonScratchForRetention(bundleWithScratch()) as any;
    expect(stripped.sections.customizeSettings.desktop.js[1]._bodyUnavailable).toBe('oversize');
    expect(stripped.sections.customizeSettings._partial.files[0].fileName).toBe('big.js');
  });

  it('セクションの無いもの・空のものは何もせず返す', () => {
    expect(stripComparisonScratchForRetention(null)).toBeNull();
    const empty = { appId: '1' } as any;
    expect(stripComparisonScratchForRetention(empty)).toBe(empty);
    expect(() => stripComparisonScratchForRetention({ sections: { customizeSettings: { desktop: { js: null } } } })).not.toThrow();
  });
});
