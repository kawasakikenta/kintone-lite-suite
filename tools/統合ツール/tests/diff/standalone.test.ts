import { describe, expect, it } from 'vitest';
import { pickSettingsBundle } from '../../src/settingsBundleImport';
import { runDiffStandalone } from '../../src/tabs/diff-standalone';
import { buildDiffHtml } from '../../src/diff/export';

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
  it.each(['revision', 'creator', 'createdAt', 'modifier', 'modifiedAt'])(
    'detects imported field changes with the valid code %s', async (code) => {
      const source = makeBundle('1', { fieldSettings: { revision: '10', properties: { [code]: { code, type: 'SINGLE_LINE_TEXT', label: '旧名称' } } } });
      const target = makeBundle('2', { fieldSettings: { revision: '20', properties: { [code]: { code, type: 'SINGLE_LINE_TEXT', label: '新名称' } } } });
      const result = await runDiffStandalone({
        source: { appId: '1' }, target: { appId: '2' }, scopes: ['fieldSettings'],
        importedSourceBundle: source, importedTargetBundle: target
      });
      expect(result.rows).toMatchObject([
        { type: 'changed', path: `fieldSettings.properties.${code}.label`, left: '旧名称', right: '新名称' }
      ]);
      expect(result.fetchIssues).toEqual([]);
      expect(result.sourceBundle.sections.fieldSettings.properties[code]).toEqual(source.sections.fieldSettings.properties[code]);
      expect(source.sections.fieldSettings.revision).toBe('10');
    }
  );

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

    expect(result.partialIssues).toHaveLength(2);
    expect(result.partialIssues[0]).toMatchObject({
      sectionKey: 'customizeSettings',
      side: 'source',
      files: [expect.objectContaining({ fileName: 'large.js', reason: 'oversize' })]
    });
    expect(result.summary.text).toContain('本文未検証 2件');
    expect(result.summary.text).toContain('結果は不完全');
  });

  const customization = (fileKey: string, body?: string) => ({
    desktop: { js: [{ type: 'FILE', file: { fileKey, name: 'app.js', size: '15' }, ...(body === undefined ? {} : { _bodyText: body }) }], css: [] },
    mobile: { js: [], css: [] }
  });

  it.each([
    ['target', 'console.log(1);', undefined, ['target']],
    ['source', undefined, 'console.log(1);', ['source']],
    ['both', undefined, undefined, ['source', 'target']]
  ])('marks missing %s FILE bodies without partial metadata as incomplete and blocks HTML reflection', async (_name, sourceBody, targetBody, sides) => {
    const result = await runDiffStandalone({
      source: { appId: '1' }, target: { appId: '2' }, scopes: ['customizeSettings'],
      importedSourceBundle: makeBundle('1', { customizeSettings: customization('key-a', sourceBody) }),
      importedTargetBundle: makeBundle('2', { customizeSettings: customization('key-b', targetBody) })
    });
    expect(result.partialIssues.map((issue) => issue.side)).toEqual(sides);
    expect(result.partialIssues.every((issue) => issue.files.length === 1 && issue.files[0].reason === 'missing-body')).toBe(true);
    expect(result.summary.text).toContain('結果は不完全');
    const html = buildDiffHtml(result.sourceBundle, result.targetBundle, result.rows, ['customizeSettings'], '', {
      exportContentMode: 'withCompared', fetchIssues: result.fetchIssues, partialIssues: result.partialIssues
    });
    const reportMeta = JSON.parse(html.match(/\bconst REPORT_META = (.+);\r?\n/)![1]);
    expect(reportMeta).toMatchObject({ incompleteComparison: true, reflectJsonAvailable: false });
  });

  it('does not report equality as complete when matching fileKeys lack file bodies', async () => {
    const result = await runDiffStandalone({
      source: { appId: '1' }, target: { appId: '2' }, scopes: ['customizeSettings'],
      importedSourceBundle: makeBundle('1', { customizeSettings: customization('same-key', 'console.log(1);') }),
      importedTargetBundle: makeBundle('2', { customizeSettings: customization('same-key') })
    });
    expect(result.rows).toEqual([]);
    expect(result.partialIssues).toHaveLength(1);
    expect(result.summary.text).toContain('結果は不完全');
  });

  it('combines inferred missing bodies with existing partial file details without duplicates', async () => {
    const sourceSection = {
      ...customization('key-a'),
      _partial: { message: 'サイズ上限により未検証', files: [{ fileName: 'app.js', fileKey: 'key-a', reason: 'oversize', detail: '上限超過', byteSize: 2000000 }] }
    };
    const result = await runDiffStandalone({
      source: { appId: '1' }, target: { appId: '2' }, scopes: ['customizeSettings'],
      importedSourceBundle: makeBundle('1', { customizeSettings: sourceSection }),
      importedTargetBundle: makeBundle('2', { customizeSettings: customization('key-b', 'console.log(1);') })
    });
    expect(result.partialIssues).toHaveLength(1);
    expect(result.partialIssues[0]).toMatchObject({ side: 'source', message: 'サイズ上限により未検証', files: [{ reason: 'oversize', detail: '上限超過', byteSize: 2000000 }] });
  });

  it.each(['source', 'target'])('does not count missing bodies on either side if %s failed acquisition', async (failedSide) => {
    const sourceSection: any = customization('key-a');
    const targetSection: any = customization('key-b');
    (failedSide === 'source' ? sourceSection : targetSection)._fetchError = '取得失敗';
    const result = await runDiffStandalone({
      source: { appId: '1' }, target: { appId: '2' }, scopes: ['customizeSettings'],
      importedSourceBundle: makeBundle('1', { customizeSettings: sourceSection }),
      importedTargetBundle: makeBundle('2', { customizeSettings: targetSection })
    });
    expect(result.fetchIssues).toHaveLength(1);
    expect(result.partialIssues).toEqual([]);
  });

  it('treats empty file bodies as verified and does not require bodies for URL resources', async () => {
    const section = customization('key-a', '');
    section.desktop.js.push({ type: 'URL', url: 'https://example.test/app.js' } as any);
    const result = await runDiffStandalone({
      source: { appId: '1' }, target: { appId: '2' }, scopes: ['customizeSettings'],
      importedSourceBundle: makeBundle('1', { customizeSettings: section }),
      importedTargetBundle: makeBundle('2', { customizeSettings: section })
    });
    expect(result.rows).toEqual([]);
    expect(result.partialIssues).toEqual([]);
    expect(result.summary.text).not.toContain('結果は不完全');
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

  it('includes matching notice count in status line when composite key fallback occurs', async () => {
    // タイトルが空の通知はキー識別子なしのフォールバックが発生し、matchingNotices に記録される
    const notiCount = 3;
    const makeNotif = (title: string | null) => ({ title, timing: { condition: {} } });
    const srcNotifs = [makeNotif(null), makeNotif('通知A'), makeNotif('通知B')];
    const tgtNotifs = [makeNotif(null), makeNotif('通知A改'), makeNotif('通知B')];
    const srcBundle = makeBundle('1', { perRecordNotifications: { notifications: srcNotifs } });
    const tgtBundle = makeBundle('2', { perRecordNotifications: { notifications: tgtNotifs } });

    const result = await runDiffStandalone({
      source: { appId: '1' },
      target: { appId: '2' },
      scopes: ['perRecordNotifications'],
      importedSourceBundle: srcBundle,
      importedTargetBundle: tgtBundle
    });

    expect(result.matchingNotices.items.length).toBeGreaterThan(0);
    expect(result.summary.text).toContain('対応付けの注意');
  });
});
