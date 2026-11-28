import { describe, expect, it } from 'vitest';
import {
  buildDiffResultIdMaterial,
  computeDiffResultId,
  diffResultIdOf,
  readDiffResultId,
  resolveDiffResultIdForExport,
  type DiffResultIdInput
} from '../../src/diff/result-id';
import { computeDiffRows } from '../../src/diff/engine';
import { enrichDiffRows } from '../../src/diff/enrich';
import { buildDiffHtml } from '../../src/diff/export';
import { buildDiffXlsxSheets } from '../../src/diff/xlsx-export';
import { buildDiffMarkdownBatchExport, buildDiffMarkdownExport } from '../../src/diff/markdown-export';
import {
  buildLiteDiffHtmlContext,
  buildLiteDiffMarkdownContext,
  buildLiteDiffXlsxContext,
  renderLiteDiffOverviewHtml,
  type DiffCache
} from '../../src/entries/diff-lite-ui';
import { buildDiffHtmlStandaloneExport } from '../../src/tabs/diff-export-standalone';

const baseRows = [
  { sectionKey: 'appSettings', section: 'アプリ設定', type: 'changed', path: 'appSettings.name', left: '旧', right: '新' },
  { sectionKey: 'fieldSettings', section: 'フィールド設定', type: 'added', path: 'fieldSettings.properties.memo', right: { code: 'memo', type: 'MULTI_LINE_TEXT', label: 'メモ' } },
  { sectionKey: 'fieldSettings', section: 'フィールド設定', type: 'removed', path: 'fieldSettings.properties.old', left: { code: 'old', type: 'NUMBER', label: '旧数値' } },
  { sectionKey: 'customizeSettings', section: 'JS/CSS設定', type: 'changed', path: 'customizeSettings.desktop.js[0]._body', left: 'console.log("secret-a")', right: 'console.log("secret-b")' }
];

function input(overrides: Partial<DiffResultIdInput> = {}): DiffResultIdInput {
  return {
    sourceBundle: { appId: '101', guestId: '', preview: false, fetchedAt: '2026-11-01T00:00:00.000Z', meta: { appName: '開発' }, sections: {} },
    targetBundle: { appId: '202', guestId: '7', preview: true, fetchedAt: '2026-11-02T00:00:00.000Z', meta: { appName: '本番' }, sections: {} },
    scopes: ['appSettings', 'fieldSettings', 'customizeSettings'],
    ignoreKeys: 'revision, label',
    normalizationPresetState: { appReferences: true, fieldOrder: false },
    rows: baseRows,
    fetchIssues: [],
    partialIssues: [],
    truncation: null,
    ...overrides
  };
}

describe('diff/result-id', () => {
  it('is a deterministic SHA-256 with a 12-digit short form', () => {
    const first = computeDiffResultId(input());
    const second = computeDiffResultId(input());
    expect(first).toEqual(second);
    expect(first.full).toMatch(/^[0-9a-f]{64}$/);
    expect(first.short).toBe(first.full.slice(0, 12));
    expect(first.version).toBe(1);
  });

  it('keeps a fixed value for a fixed input (the calculation must not change silently; ports must match)', () => {
    const id = computeDiffResultId({
      sourceBundle: { appId: '1', guestId: '', preview: false },
      targetBundle: { appId: '2', guestId: '', preview: false },
      scopes: ['appSettings'],
      ignoreKeys: '',
      normalizationPresetState: {},
      rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'A', right: 'B' }],
      fetchIssues: [],
      partialIssues: [],
      truncation: null
    });
    expect(buildDiffResultIdMaterial({
      sourceBundle: { appId: '1' },
      targetBundle: { appId: '2' },
      scopes: ['appSettings'],
      rows: [{ sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: 'A', right: 'B' }]
    })).toBe('o{"conditions":o{"ignoreRules":a[],"normalization":a[],"sections":a[s"appSettings"]},"fetchIssues":a[],"format":s"kintone-diff-result-id","partialIssues":a[],"rows":a[s"o{\\"arrayKey\\":s\\"\\",\\"arrayKeyValue\\":u,\\"left\\":s\\"A\\",\\"moved\\":b0,\\"movedFrom\\":u,\\"movedTo\\":u,\\"path\\":s\\"appSettings.name\\",\\"right\\":s\\"B\\",\\"section\\":s\\"appSettings\\",\\"type\\":s\\"changed\\"}"],"source":o{"appId":s"1","guestId":s"","preview":b0},"target":o{"appId":s"2","guestId":s"","preview":b0},"truncation":a[],"version":d1}');
    // 上の文字列の SHA-256（UTF-8）。Node の crypto で計算した値と同じ。
    expect(id.full).toBe('4e452635b4650bce9c392044c3f6fd68554efbce7334c0528dbf1316f9f57698');
    expect(id.short).toBe('4e452635b465');
  });

  it('does not depend on row order, display labels, enrichment, generation time, or key order', () => {
    const base = computeDiffResultId(input());
    const reordered = computeDiffResultId(input({
      rows: [...baseRows].reverse().map((row, index) => ({
        ...row,
        _id: `d${index}`,
        section: 'Section label in another language',
        reasonSummary: '別の説明',
        entityLabel: '表示名',
        right: row.right && typeof row.right === 'object' ? Object.fromEntries(Object.entries(row.right).reverse()) : row.right
      })),
      scopes: ['customizeSettings', 'fieldSettings', 'appSettings', 'appSettings'],
      ignoreKeys: ' LABEL；revision\n\nlabel ',
      normalizationPresetState: { fieldOrder: false, appReferences: true, viewOrder: false },
      sourceBundle: { appId: '101', guestId: '', preview: false, fetchedAt: '2030-01-01T00:00:00.000Z', meta: { appName: '別の名前' }, sections: {} },
      targetBundle: { appId: '202', guestId: '7', preview: true, sections: {} }
    }));
    expect(reordered.full).toBe(base.full);
  });

  it('ignores same rows and display-only rows (they are not differences)', () => {
    const base = computeDiffResultId(input());
    const withEvidence = computeDiffResultId(input({
      rows: [
        ...baseRows,
        { sectionKey: 'viewSettings', type: 'same', path: 'viewSettings', left: {}, right: {} },
        { sectionKey: 'fieldSettings', type: 'added', path: 'fieldSettings.properties.memo.fields.x', right: 1, _displayOnly: true }
      ],
      truncation: { truncated: true, actualDiffIncomplete: false, droppedSame: 12, sections: [{ sectionKey: 'fieldSettings', scanStatus: 'complete', droppedDiff: 0, droppedSame: 12 }] }
    }));
    expect(withEvidence.full).toBe(base.full);
  });

  it.each([
    ['a changed value', { rows: baseRows.map((row, index) => (index === 0 ? { ...row, right: '新2' } : row)) }],
    ['a changed JS body (values are hashed even though they are not shown)', { rows: baseRows.map((row, index) => (index === 3 ? { ...row, right: 'console.log("secret-c")' } : row)) }],
    ['a missing row', { rows: baseRows.slice(1) }],
    ['null instead of a missing value', { rows: baseRows.map((row, index) => (index === 1 ? { ...row, left: null } : row)) }],
    ['the source app', { sourceBundle: { appId: '103', guestId: '', preview: false } }],
    ['the target environment', { targetBundle: { appId: '202', guestId: '7', preview: false } }],
    ['the guest space', { targetBundle: { appId: '202', guestId: '8', preview: true } }],
    ['the compared sections', { scopes: ['appSettings', 'fieldSettings'] }],
    ['an ignore rule', { ignoreKeys: 'revision' }],
    ['a normalization preset', { normalizationPresetState: { appReferences: true, fieldOrder: true } }],
    ['a fetch failure', { fetchIssues: [{ sectionKey: 'viewSettings', side: 'target', message: '権限がありません' }] }],
    ['an unverified body', { partialIssues: [{ sectionKey: 'customizeSettings', side: 'source', files: [{ fileKey: 'k1', fileName: 'a.js', reason: 'too-large' }] }] }],
    ['an incomplete scan', { truncation: { truncated: true, actualDiffIncomplete: true, sections: [{ sectionKey: 'viewSettings', scanStatus: 'unscanned', scanned: false }] } }]
  ])('changes with %s', (_name, overrides) => {
    expect(computeDiffResultId(input(overrides as Partial<DiffResultIdInput>)).full).not.toBe(computeDiffResultId(input()).full);
  });

  it('does not depend on the fetch error text (language, time, request details)', () => {
    const issue = (message: string) => [{ sectionKey: 'viewSettings', section: 'ビュー設定', side: 'target', message }];
    expect(computeDiffResultId(input({ fetchIssues: issue('権限がありません [API] GET /k/v1/app/views.json 12:00') })).full)
      .toBe(computeDiffResultId(input({ fetchIssues: issue('Permission denied') })).full);
  });

  it('treats the same ignore rules written differently as the same condition, but keeps exact paths case-sensitive', () => {
    expect(computeDiffResultId(input({ ignoreKeys: 'Label,revision' })).full).toBe(computeDiffResultId(input({ ignoreKeys: 'revision、label' })).full);
    expect(computeDiffResultId(input({ ignoreKeys: 'path:viewSettings.views.A' })).full)
      .not.toBe(computeDiffResultId(input({ ignoreKeys: 'path:viewSettings.views.a' })).full);
  });

  it('memoizes per result object and validates ids passed to exports', () => {
    const result = input();
    expect(diffResultIdOf(result)).toBe(diffResultIdOf(result));
    const id = computeDiffResultId(result);
    expect(readDiffResultId(id)).toEqual(id);
    expect(readDiffResultId({ full: 'not-a-hash' })).toBeNull();
    expect(readDiffResultId(null)).toBeNull();
  });

  it('uses the full result for filtered exports, and refuses to guess without it', () => {
    const full = computeDiffResultId(input());
    const subset = baseRows.slice(0, 1);
    expect(resolveDiffResultIdForExport({ ...input(), exportMode: 'filtered', rows: subset, allRows: baseRows })?.full).toBe(full.full);
    expect(resolveDiffResultIdForExport({ ...input(), exportMode: 'filtered', rows: subset })).toBeNull();
    expect(resolveDiffResultIdForExport({ ...input(), exportMode: 'all', rows: baseRows })?.full).toBe(full.full);
    expect(resolveDiffResultIdForExport({ ...input(), exportMode: 'filtered', rows: subset, resultId: full })?.full).toBe(full.full);
    expect(resolveDiffResultIdForExport({ ...input(), exportMode: 'all', rows: subset, resultId: { full: 'bad' } })?.full)
      .toBe(computeDiffResultId(input({ rows: subset })).full);
  });
});

describe('diff/result-id in every output', () => {
  const sourceBundle = {
    appId: '101', guestId: '', preview: false, fetchedAt: '2026-11-01T00:00:00.000Z',
    sections: {
      appSettings: { name: '顧客管理', description: '' },
      fieldSettings: { properties: { a: { code: 'a', type: 'SINGLE_LINE_TEXT', label: '会社名' }, b: { code: 'b', type: 'NUMBER', label: '金額' } } },
      viewSettings: { views: { 一覧: { type: 'LIST', name: '一覧', index: '0', filterCond: '' } } }
    }
  };
  const targetBundle = {
    appId: '202', guestId: '', preview: false, fetchedAt: '2026-11-02T00:00:00.000Z',
    sections: {
      appSettings: { name: '顧客管理（本番）', description: '' },
      fieldSettings: { properties: { a: { code: 'a', type: 'SINGLE_LINE_TEXT', label: '取引先名' }, c: { code: 'c', type: 'DATE', label: '日付' } } },
      viewSettings: { views: { 一覧: { type: 'LIST', name: '一覧', index: '0', filterCond: 'b > 0' } } }
    }
  };
  const scopes = ['appSettings', 'fieldSettings', 'viewSettings'];
  const diff = computeDiffRows(sourceBundle, targetBundle, scopes, '');
  const cache: DiffCache = {
    rows: enrichDiffRows(diff.rows, sourceBundle, targetBundle),
    fetchIssues: diff.fetchIssues,
    partialIssues: [],
    sourceBundle,
    targetBundle,
    scopes,
    ignoreKeys: '',
    normalizationPresetState: {},
    comparedAt: '2026-11-03T00:00:00.000Z',
    truncation: diff.truncation?.truncated ? diff.truncation : null,
    matchingNotices: diff.matchingNotices
  };
  const id = computeDiffResultId(cache);
  const subset = cache.rows.filter((row) => row.sectionKey === 'viewSettings');
  const sheetText = (ctx: any, name: string) => {
    const sheet = buildDiffXlsxSheets(ctx).find((item) => item.name === name);
    return (sheet?.rows || []).map((row) => row.join(' ')).join('\n');
  };

  it('shows the same id in the panel, HTML, Excel and Markdown for the whole result', () => {
    expect(subset.length).toBeGreaterThan(0);
    expect(renderLiteDiffOverviewHtml(cache, { announce: false })).toContain(id.full);
    expect(renderLiteDiffOverviewHtml(cache, { announce: false })).toContain(`>${id.short}<`);
    const html = buildDiffHtmlStandaloneExport(buildLiteDiffHtmlContext(cache, cache.rows, 'all', '全差分')).html;
    expect(html).toContain(`data-result-id="${id.full}"`);
    expect(html).toContain(`<code>${id.short}</code>`);
    // 直接呼び出し（resultId を渡さない全件出力）でも同じ値になる
    expect(buildDiffHtml(sourceBundle, targetBundle, cache.rows, scopes, '', { exportMode: 'all', normalizationState: {}, truncation: cache.truncation })).toContain(`data-result-id="${id.full}"`);
    expect(sheetText(buildLiteDiffXlsxContext(cache, cache.rows, 'all', '全差分'), '比較概要')).toContain(`${id.short}\n完全な値: ${id.full}`);
    expect(sheetText(buildLiteDiffXlsxContext(cache, cache.rows, 'all', '全差分', undefined, { audience: 'internal' }), '概要')).toContain(id.full);
    const markdown = buildDiffMarkdownExport(buildLiteDiffMarkdownContext(cache, cache.rows, 'all', '全差分')).markdown;
    expect(markdown).toContain(`- resultId: \`${id.full}\``);
    expect(markdown).toContain(`- resultIdShort: \`${id.short}\``);
  });

  it('keeps the whole-result id in filtered outputs and says so', () => {
    const html = buildDiffHtmlStandaloneExport(buildLiteDiffHtmlContext(cache, subset, 'filtered', '表示中（フィルタ適用後）')).html;
    expect(html).toContain(`data-result-id="${id.full}"`);
    expect(html).toContain('全件の比較結果の識別子です。この出力は絞り込んだ範囲だけを収録しています。');
    const customer = sheetText(buildLiteDiffXlsxContext(cache, subset, 'filtered', '表示中（フィルタ適用後）', 'セクション: ビュー設定'), '比較概要');
    expect(customer).toContain(id.full);
    expect(customer).toContain('全件の比較結果の識別子です。');
    const markdown = buildDiffMarkdownExport(buildLiteDiffMarkdownContext(cache, subset, 'filtered', '表示中（フィルタ適用後）')).markdown;
    expect(markdown).toContain(`- resultId: \`${id.full}\``);
    expect(markdown).toContain('- exportRange: 表示中（フィルタ適用後）');
    expect(markdown).toContain('全件の比較結果の識別子です。');
    // 全件の行が無い絞り込み出力では、部分の行から全件の識別子を作らない
    expect(buildDiffMarkdownExport({ ...buildLiteDiffMarkdownContext(cache, subset, 'filtered', '表示中'), allRows: undefined, resultId: undefined }).markdown)
      .toContain('- resultId: 未計算（全件の比較結果が渡されていないため）');
  });

  it('does not describe JS/CSS bodies or plugin values next to the id', () => {
    const secretCache: DiffCache = {
      ...cache,
      rows: [...cache.rows, { sectionKey: 'customizeSettings', section: 'JS/CSS設定', type: 'changed', path: 'customizeSettings.desktop.js[0]._body', left: 'const token = "old-secret";', right: 'const token = "new-secret";' }],
      scopes: [...scopes, 'customizeSettings']
    };
    const secretId = computeDiffResultId(secretCache);
    expect(secretId.full).not.toBe(id.full);
    const markdown = buildDiffMarkdownExport(buildLiteDiffMarkdownContext(secretCache, secretCache.rows, 'all', '全差分')).markdown;
    const idSection = markdown.split('## 比較結果の識別子')[1].split('## ')[0];
    expect(idSection).toContain(secretId.full);
    expect(idSection).not.toContain('secret');
    expect(idSection).toContain('JS/CSS の本文・プラグインの設定値を含む');
  });

  it('lists the short id per result in the batch Markdown index', () => {
    const result = buildDiffMarkdownBatchExport([
      { label: '比較 1', context: buildLiteDiffMarkdownContext(cache, cache.rows, 'all', '全差分') }
    ], { generatedAt: '2026-11-04T00:00:00.000Z' });
    expect(result.indexMarkdown).toContain('| 比較結果ID（先頭12桁） |');
    expect(result.indexMarkdown).toContain(`| \`${id.short}\` |`);
  });
});
