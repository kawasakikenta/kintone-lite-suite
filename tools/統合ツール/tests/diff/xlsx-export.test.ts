import { describe, it, expect } from 'vitest';
import {
  buildDiffXlsxBlob,
  buildDiffXlsxExport,
  type DiffXlsxContext
} from '../../src/diff/xlsx-export';

async function readEntry(blob: Blob, name: string): Promise<string> {
  const ab = await blob.arrayBuffer();
  const buf = Buffer.from(ab);
  for (let off = 0; off < buf.length - 4; off++) {
    if (buf.readUInt32LE(off) === 0x04034b50) {
      const nameLen = buf.readUInt16LE(off + 26);
      const extraLen = buf.readUInt16LE(off + 28);
      const compressed = buf.readUInt32LE(off + 18);
      const entryName = buf.slice(off + 30, off + 30 + nameLen).toString('utf8');
      if (entryName === name) {
        const dataStart = off + 30 + nameLen + extraLen;
        return buf.slice(dataStart, dataStart + compressed).toString('utf8');
      }
    }
  }
  throw new Error(`entry not found: ${name}`);
}

const sampleCtx: DiffXlsxContext = {
  generatedAt: '2026-08-16T00:00:00.000Z',
  comparedAt: '2026-08-15T23:59:00.000Z',
  sourceBundle: { appId: 1, guestId: '', preview: false, meta: { appName: 'アプリA' } },
  targetBundle: { appId: 2, guestId: '7', preview: true, meta: { appName: 'アプリB' } },
  scopes: ['fieldSettings', 'viewSettings'],
  ignoreKeys: 'revision',
  normalizationPresetState: { viewOrder: true, permissionOrder: false },
  exportMode: 'filtered',
  exportLabel: '表示中（フィルタ適用後）',
  exportContentMode: 'diffOnly',
  rows: [
    { sectionKey: 'fieldSettings', type: 'added', severity: 'high', path: 'fieldSettings.properties.foo', label: 'フィールド「foo」', right: { code: 'foo', type: 'SINGLE_LINE_TEXT' } },
    { sectionKey: 'fieldSettings', type: 'changed', severity: 'low', path: 'fieldSettings.properties.bar.label', label: 'フィールド「bar」 / フィールド名', left: '旧ラベル', right: '新ラベル', reasonSummary: '表示名が変更されています' },
    { sectionKey: 'viewSettings', type: 'removed', severity: 'medium', path: 'viewSettings.views.一覧A', label: 'ビュー「一覧A」', left: { type: 'LIST' } }
  ],
  fetchIssues: [
    { sectionKey: 'pluginSettings', side: 'source', message: '権限不足' }
  ]
};

describe('diff/xlsx-export', () => {
  it('builds summary, one filterable list, per-section sheets, and an issue sheet', async () => {
    const blob = buildDiffXlsxBlob(sampleCtx);
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    expect(workbook).toContain('name="概要"');
    expect(workbook).toContain('name="差分一覧"');
    expect(workbook).toContain('name="フィールド設定"');
    expect(workbook).toContain('name="ビュー設定"');
    expect(workbook).toContain('name="取得・未検証"');
  });

  it('records normalization switches in the evidence summary', async () => {
    const summary = await readEntry(buildDiffXlsxBlob(sampleCtx), 'xl/worksheets/sheet1.xml');
    expect(summary).toContain('正規化設定');
    expect(summary).toContain('有効: ビュー順序');
    expect(summary).toContain('無効: 権限順序');
  });

  it('writes comparison direction, export range, scopes, and accurate counts', async () => {
    const summary = await readEntry(buildDiffXlsxBlob(sampleCtx), 'xl/worksheets/sheet1.xml');
    expect(summary).toContain('アプリA (App 1)');
    expect(summary).toContain('アプリB (App 2)');
    expect(summary).toContain('比較元 → 比較先');
    expect(summary).toContain('比較日時');
    expect(summary).toContain('2026-08-15T23:59:00.000Z');
    expect(summary).toContain('表示中（フィルタ適用後）');
    expect(summary).toContain('フィールド設定、ビュー設定');
    expect(summary).toContain('追加（比較先のみ）');
    expect(summary).toContain('削除（比較元のみ）');
    expect(summary).toMatch(/<c r="B17" s="2"><v>3<\/v>/);
  });

  it('writes one row per result to the consolidated list with directional values', async () => {
    const list = await readEntry(buildDiffXlsxBlob(sampleCtx), 'xl/worksheets/sheet2.xml');
    expect((list.match(/<row r="/g) || []).length).toBe(4);
    expect(list).toContain('比較元の値');
    expect(list).toContain('比較先の値');
    expect(list).toContain('確認ポイント');
    expect(list).toContain('表示名が変更されています');
    expect(list).toContain('追加（比較先のみ）');
    expect(list).toContain('削除（比較元のみ）');
    // 追加行は比較元(F列)が空、比較先(G列)だけに値がある。
    expect(list).not.toMatch(/<c r="F2"/);
    expect(list).toMatch(/<c r="G2"/);
    // 削除行は比較元(F列)だけに値がある。
    expect(list).toMatch(/<c r="F4"/);
    expect(list).not.toMatch(/<c r="G4"/);
  });

  it('keeps section-specific drill-down sheets', async () => {
    const fieldSheet = await readEntry(buildDiffXlsxBlob(sampleCtx), 'xl/worksheets/sheet3.xml');
    expect((fieldSheet.match(/<row r="/g) || []).length).toBe(3);
    expect(fieldSheet).toContain('フィールド「foo」');
    expect(fieldSheet).toContain('旧ラベル');
    expect(fieldSheet).toContain('新ラベル');
  });

  it('exports a zero-difference evidence workbook instead of throwing', async () => {
    const blob = buildDiffXlsxBlob({
      generatedAt: '2026-08-16T00:00:00.000Z',
      rows: [],
      fetchIssues: [],
      partialIssues: [],
      scopes: ['fieldSettings'],
      sourceBundle: { appId: 1, meta: { appName: '同一アプリA' } },
      targetBundle: { appId: 2, meta: { appName: '同一アプリB' } }
    });
    const summary = await readEntry(blob, 'xl/worksheets/sheet1.xml');
    const list = await readEntry(blob, 'xl/worksheets/sheet2.xml');
    expect(summary).toContain('差分なし');
    expect(summary).not.toContain('差分なしとは判断できません');
    expect((list.match(/<row r="/g) || []).length).toBe(1);
  });

  it('records fetch failures, partial comparison, and truncation as incomplete', async () => {
    const blob = buildDiffXlsxBlob({
      rows: [],
      fetchIssues: [{ sectionKey: 'pluginSettings', side: 'target', targetError: 'HTTP 403' }],
      partialIssues: [{
        sectionKey: 'customizeSettings', side: 'source', message: '本文未検証',
        files: [{ fileName: 'desktop.js', fileKey: 'abc', reason: 'サイズ上限' }]
      }],
      truncation: {
        truncated: true,
        diffLimit: 1000,
        droppedDiff: 2,
        sections: [{ sectionKey: 'fieldSettings', droppedDiff: 2 }]
      }
    });
    const summary = await readEntry(blob, 'xl/worksheets/sheet1.xml');
    const issues = await readEntry(blob, 'xl/worksheets/sheet3.xml');
    expect(summary).toContain('要確認（比較結果は不完全です。差分なしとは判断できません）');
    expect(summary).toContain('差分上限 1000 件');
    expect(summary).toContain('一部未検証');
    expect(issues).toContain('取得失敗');
    expect(issues).toContain('HTTP 403');
    expect(issues).toContain('本文未検証');
    expect(issues).toContain('desktop.js: サイズ上限');
    expect(issues).toContain('件数上限');
  });

  it('counts moved changes and excludes display-only rows from diff totals', async () => {
    const summary = await readEntry(buildDiffXlsxBlob({
      rows: [
        { sectionKey: 'layoutSettings', type: 'changed', moved: true, path: 'layoutSettings.layout[0]' },
        { sectionKey: 'processSettings', type: 'changed', path: 'processSettings.__rename__', _displayOnly: true },
        { sectionKey: 'appSettings', type: 'same', path: 'appSettings' }
      ]
    }), 'xl/worksheets/sheet1.xml');
    expect(summary).toMatch(/<c r="B17" s="2"><v>1<\/v>/);
    expect(summary).toMatch(/<c r="B21" s="2"><v>1<\/v>/);
    expect(summary).toMatch(/<c r="B23" s="2"><v>1<\/v>/);
  });

  it('keeps formula-looking values as inline text without formulas or links', async () => {
    const list = await readEntry(buildDiffXlsxBlob({
      rows: [
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.name', left: '=1+1', right: ' +SUM(A1:A2)' },
        { sectionKey: 'appSettings', type: 'changed', path: 'appSettings.description', left: '\t-HYPERLINK("https://example.com")', right: '@SUM(A1:A2)' }
      ]
    }), 'xl/worksheets/sheet2.xml');
    expect(list).toContain('t="inlineStr"');
    expect(list).not.toContain('<f>');
    expect(list).not.toContain('<hyperlink');
    expect(list).not.toContain('externalLink');
    expect(list).toContain('=1+1');
    expect(list).toContain('@SUM(A1:A2)');
  });

  it('uses app names from appSettings when building the filename', () => {
    const result = buildDiffXlsxExport({
      rows: [],
      sourceBundle: { appId: 10, sections: { appSettings: { name: '受注/管理' } } },
      targetBundle: { appId: 20, sections: { appSettings: { name: '受注:改修' } } }
    });
    expect(result.filename).toMatch(/^差分一覧_/);
    expect(result.filename).toMatch(/app10/i);
    expect(result.filename).toMatch(/app20/i);
    expect(result.filename).toMatch(/\.xlsx$/);
    expect(result.filename).not.toMatch(/[\/:*?"<>|]/);
  });
});
