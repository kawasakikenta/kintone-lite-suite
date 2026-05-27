import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildDiffXlsxBlob, type DiffXlsxContext } from '../../src/diff/xlsx-export';

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
  sourceBundle: { appId: 1, guestId: '', preview: false, meta: { appName: 'アプリA' } },
  targetBundle: { appId: 2, guestId: '7', preview: true, meta: { appName: 'アプリB' } },
  ignoreKeys: '',
  exportContentMode: 'diffOnly',
  rows: [
    { sectionKey: 'fieldSettings', type: 'added', severity: 'high', path: 'fieldSettings.properties.foo', label: 'フィールド「foo」', right: { code: 'foo', type: 'SINGLE_LINE_TEXT' } },
    { sectionKey: 'fieldSettings', type: 'changed', severity: 'low', path: 'fieldSettings.properties.bar.label', label: 'フィールド「bar」 / フィールド名', left: '旧ラベル', right: '新ラベル' },
    { sectionKey: 'viewSettings', type: 'removed', severity: 'medium', path: 'viewSettings.views.一覧A', label: 'ビュー「一覧A」', left: { type: 'LIST' } }
  ],
  fetchIssues: [
    { sectionKey: 'pluginSettings', side: 'source', message: '権限不足' }
  ]
};

describe('diff/xlsx-export', () => {
  it('builds a workbook with summary + per-section sheets + issues sheet', async () => {
    const blob = buildDiffXlsxBlob(sampleCtx);
    const workbook = await readEntry(blob, 'xl/workbook.xml');
    expect(workbook).toContain('name="概要"');
    expect(workbook).toContain('name="フィールド設定"');
    expect(workbook).toContain('name="ビュー設定"');
    expect(workbook).toContain('name="取得時の問題"');
  });

  it('writes summary metadata and section counts', async () => {
    const blob = buildDiffXlsxBlob(sampleCtx);
    const summary = await readEntry(blob, 'xl/worksheets/sheet1.xml');
    expect(summary).toContain('アプリA (App 1)');
    expect(summary).toContain('アプリB (App 2)');
    // counts
    expect(summary).toMatch(/差分件数 \(追加\/削除\/変更\/移動\)/);
    expect(summary).toContain('フィールド設定');
    expect(summary).toContain('ビュー設定');
  });

  it('section sheet has the header row and one data row per diff', async () => {
    const blob = buildDiffXlsxBlob(sampleCtx);
    // フィールド設定 has 2 rows → sheet2 (after 概要)
    const sheet2 = await readEntry(blob, 'xl/worksheets/sheet2.xml');
    // 1 header row + 2 data rows = 3 rows
    expect((sheet2.match(/<row r="/g) || []).length).toBe(3);
    // header
    expect(sheet2).toContain('種別');
    expect(sheet2).toContain('重要度');
    expect(sheet2).toContain('比較元 (旧)');
    expect(sheet2).toContain('比較先 (新)');
    // a value
    expect(sheet2).toContain('新ラベル');
  });

  it('throws when there is nothing to export', () => {
    expect(() => buildDiffXlsxBlob({ rows: [], fetchIssues: [] })).toThrow(/出力できる/);
  });

  it('omits left value for added rows and right value for removed rows', async () => {
    const blob = buildDiffXlsxBlob(sampleCtx);
    // added の左セル(E列) は空文字 → 出力されない (skip empty)、required value cell missing
    const sheet2 = await readEntry(blob, 'xl/worksheets/sheet2.xml');
    // The added row at row 2: E2 should NOT appear; F2 (right) should
    expect(sheet2).not.toMatch(/<c r="E2"/);
    expect(sheet2).toMatch(/<c r="F2"/);

    // removed の右セル(F列) は空 → セル出力されない
    const sheet3 = await readEntry(blob, 'xl/worksheets/sheet3.xml');
    // sheet3 = viewSettings, single removed row at row 2
    expect(sheet3).toMatch(/<c r="E2"/);
    expect(sheet3).not.toMatch(/<c r="F2"/);
  });
});
