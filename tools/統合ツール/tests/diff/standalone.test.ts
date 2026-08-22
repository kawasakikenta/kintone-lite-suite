import { describe, expect, it } from 'vitest';
import { pickSettingsBundle } from '../../src/settingsBundleImport';
import { runDiffStandalone } from '../../src/tabs/diff-standalone';

function makeBundle(appId: string, sections: Record<string, any>) {
  return {
    appId,
    guestId: '',
    preview: false,
    meta: { sectionRevisions: {} },
    sections
  };
}

describe('diff/standalone imported bundles', () => {
  it('marks a requested scope missing from imported JSON as a fetch error', () => {
    const bundle = pickSettingsBundle(
      makeBundle('1', { fieldSettings: { properties: {} } }),
      { appId: '1', sections: ['fieldSettings', 'viewSettings'] }
    );

    expect(bundle.sections.fieldSettings).toEqual({ properties: {} });
    expect(bundle.sections.viewSettings).toEqual({
      _fetchError: '読み込んだ設定JSONに比較対象セクションが含まれていません'
    });
  });

  it('rejects a single imported bundle when the explicitly entered app ID does not match', () => {
    expect(() => pickSettingsBundle(
      makeBundle('99', { fieldSettings: { properties: {} } }),
      { appId: '1', sections: ['fieldSettings'] }
    )).toThrow('設定JSON内に App 1 のバンドルが見つかりません');
  });

  it.each([
    ['source', makeBundle('1', {}), makeBundle('2', { viewSettings: { views: { 一覧: { name: '一覧' } } } })],
    ['target', makeBundle('1', { viewSettings: { views: { 一覧: { name: '一覧' } } } }), makeBundle('2', {})]
  ])('does not misreport a missing %s scope as an added or removed diff', async (side, sourceBundle, targetBundle) => {
    const result = await runDiffStandalone({
      source: { appId: '1' },
      target: { appId: '2' },
      scopes: ['viewSettings'],
      importedSourceBundle: sourceBundle,
      importedTargetBundle: targetBundle
    });

    expect(result.rows).toEqual([]);
    expect(result.fetchIssues).toHaveLength(1);
    expect(result.fetchIssues[0]).toMatchObject({
      sectionKey: 'viewSettings',
      side
    });
    expect(result.fetchIssues[0].message).toContain('読み込んだ設定JSONに比較対象セクションが含まれていません');
    expect(result.summary.counts.added).toBe(0);
    expect(result.summary.counts.removed).toBe(0);
  });

  it('reports both sides as incomparable when the requested scope is absent from both imports', async () => {
    const result = await runDiffStandalone({
      source: { appId: '1' },
      target: { appId: '2' },
      scopes: ['viewSettings'],
      importedSourceBundle: makeBundle('1', {}),
      importedTargetBundle: makeBundle('2', {})
    });

    expect(result.rows).toEqual([]);
    expect(result.fetchIssues).toHaveLength(1);
    expect(result.fetchIssues[0]).toMatchObject({
      sectionKey: 'viewSettings',
      side: 'both'
    });
    expect(result.summary.text).toContain('取得失敗 1件');
  });

  it('states that a truncated comparison result is incomplete', async () => {
    const sourceProperties: Record<string, any> = {};
    for (let i = 0; i < 1200; i += 1) {
      sourceProperties[`field_${i}`] = {
        code: `field_${i}`,
        type: 'SINGLE_LINE_TEXT',
        label: `フィールド ${i}`
      };
    }
    const statuses: string[] = [];
    const result = await runDiffStandalone({
      source: { appId: '1' },
      target: { appId: '2' },
      scopes: ['fieldSettings'],
      importedSourceBundle: makeBundle('1', { fieldSettings: { properties: sourceProperties } }),
      importedTargetBundle: makeBundle('2', { fieldSettings: { properties: {} } }),
      onStatus: (message: string) => statuses.push(message)
    });

    expect(result.truncation?.truncated).toBe(true);
    expect(result.summary.text).toContain('結果は不完全');
    expect(result.summary.text).toContain('差分上限 1000件に到達');
    expect(statuses.at(-1)).toBe(result.summary.text);
  });

  it('reports omitted same evidence without calling the actual diff result incomplete', async () => {
    const sourceProperties: Record<string, any> = {};
    const targetProperties: Record<string, any> = {};
    for (let i = 0; i < 3002; i += 1) {
      sourceProperties[`field_${i}`] = { code: `field_${i}`, type: 'SINGLE_LINE_TEXT', label: `項目 ${i}` };
      targetProperties[`field_${i}`] = { code: `field_${i}`, type: 'SINGLE_LINE_TEXT', label: `項目 ${i}` };
    }
    targetProperties.field_0.label = '変更後';

    const result = await runDiffStandalone({
      source: { appId: '1' },
      target: { appId: '2' },
      scopes: ['fieldSettings'],
      includeSame: true,
      importedSourceBundle: makeBundle('1', { fieldSettings: { properties: sourceProperties } }),
      importedTargetBundle: makeBundle('2', { fieldSettings: { properties: targetProperties } })
    });

    expect(result.truncation).toMatchObject({ truncated: true, actualDiffIncomplete: false, droppedSame: 3 });
    expect(result.summary.text).not.toContain('結果は不完全');
    expect(result.summary.text).toContain('同一証跡 3件を上限により省略（実差分の走査は完了）');
  });

  it('does not claim the actual diff scan completed when diff and same limits are both reached', async () => {
    const sourceProperties: Record<string, any> = {};
    const targetProperties: Record<string, any> = {};
    for (let i = 0; i < 3002; i += 1) {
      const code = `a_same_${String(i).padStart(4, '0')}`;
      sourceProperties[code] = { code, type: 'SINGLE_LINE_TEXT', label: `同一 ${i}` };
      targetProperties[code] = { code, type: 'SINGLE_LINE_TEXT', label: `同一 ${i}` };
    }
    for (let i = 0; i < 1002; i += 1) {
      const code = `z_removed_${String(i).padStart(4, '0')}`;
      sourceProperties[code] = { code, type: 'SINGLE_LINE_TEXT', label: `削除 ${i}` };
    }

    const result = await runDiffStandalone({
      source: { appId: '1' },
      target: { appId: '2' },
      scopes: ['fieldSettings'],
      includeSame: true,
      importedSourceBundle: makeBundle('1', { fieldSettings: { properties: sourceProperties } }),
      importedTargetBundle: makeBundle('2', { fieldSettings: { properties: targetProperties } })
    });

    expect(result.truncation?.actualDiffIncomplete).toBe(true);
    expect(Number(result.truncation?.droppedSame || 0)).toBeGreaterThan(0);
    expect(result.summary.text).toContain('結果は不完全');
    expect(result.summary.text).toMatch(/同一証跡 \d+件を上限により省略/);
    expect(result.summary.text).not.toContain('実差分の走査は完了');
  });

  it('exposes an isolated source bundle for reuse across multi-target comparisons', async () => {
    let reusableSource: any = null;
    const result = await runDiffStandalone({
      source: { appId: '1' },
      target: { appId: '2' },
      scopes: ['viewSettings'],
      importedSourceBundle: makeBundle('1', { viewSettings: { views: { 一覧: { name: '一覧' } } } }),
      importedTargetBundle: makeBundle('2', { viewSettings: { views: { 一覧: { name: '一覧' } } } }),
      onSourceBundle: (bundle: any) => { reusableSource = bundle; }
    });

    expect(reusableSource).toEqual(result.sourceBundle);
    reusableSource.sections.viewSettings.views.一覧.name = '変更済み';
    expect(result.sourceBundle.sections.viewSettings.views.一覧.name).toBe('一覧');
  });

  it('reports partially verified customization bodies as an incomplete comparison', async () => {
    const sourceSection = {
      desktop: { js: [{ type: 'FILE', file: { fileKey: 'large-a', name: 'large.js' }, _bodyUnavailable: 'oversize' }], css: [] },
      mobile: { js: [], css: [] },
      _partial: {
        kind: 'customizeBody',
        message: '一部ファイルは本文比較を省略し、fileKey で比較します',
        files: [{ fileName: 'large.js', fileKey: 'large-a', reason: 'oversize', byteSize: 2 * 1024 * 1024 }]
      }
    };
    const targetSection = {
      desktop: { js: [{ type: 'FILE', file: { fileKey: 'large-b', name: 'large.js' }, _bodyUnavailable: 'oversize' }], css: [] },
      mobile: { js: [], css: [] }
    };
    const result = await runDiffStandalone({
      source: { appId: '1' },
      target: { appId: '2' },
      scopes: ['customizeSettings'],
      importedSourceBundle: makeBundle('1', { customizeSettings: sourceSection }),
      importedTargetBundle: makeBundle('2', { customizeSettings: targetSection })
    });

    expect(result.partialIssues).toHaveLength(1);
    expect(result.partialIssues[0]).toMatchObject({
      sectionKey: 'customizeSettings',
      side: 'source',
      files: [expect.objectContaining({ fileName: 'large.js', reason: 'oversize' })]
    });
    expect(result.summary.text).toContain('本文未検証 1件');
    expect(result.summary.text).toContain('結果は不完全');
  });

  it('does not count partial metadata when the same section is uncomparable', async () => {
    const sourceSection = {
      desktop: { js: [], css: [] },
      mobile: { js: [], css: [] },
      _partial: {
        kind: 'customizeBody',
        message: '一部ファイルは本文比較を省略し、fileKey で比較します',
        files: [{ fileName: 'large.js', fileKey: 'large-a', reason: 'oversize' }]
      },
      _fetchError: 'JS/CSSファイル本文の取得に失敗したため、このセクションは比較できません'
    };
    const targetSection = {
      desktop: { js: [], css: [] },
      mobile: { js: [], css: [] }
    };

    const result = await runDiffStandalone({
      source: { appId: '1' },
      target: { appId: '2' },
      scopes: ['customizeSettings'],
      importedSourceBundle: makeBundle('1', { customizeSettings: sourceSection }),
      importedTargetBundle: makeBundle('2', { customizeSettings: targetSection })
    });

    expect(result.rows).toEqual([]);
    expect(result.fetchIssues).toHaveLength(1);
    expect(result.partialIssues).toEqual([]);
    expect(result.summary.warning).toMatchObject({ issueCount: 1, partialIssueCount: 0, total: 1 });
    expect(result.summary.text).not.toContain('本文未検証 1件');
  });
});
