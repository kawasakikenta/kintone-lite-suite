import { describe, expect, it } from 'vitest';
import {
  buildDiffXlsxBatchExport,
  DiffXlsxBatchExportError,
  type DiffXlsxBatchExportItem,
  type DiffXlsxBatchExportProgress
} from '../../src/diff/xlsx-batch-export';
import type { DiffXlsxContext } from '../../src/diff/xlsx-export';

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  return Buffer.from(await blob.arrayBuffer());
}

function parseStoredEntries(buffer: Buffer): Array<{ name: string; data: Buffer }> {
  const entries: Array<{ name: string; data: Buffer }> = [];
  let offset = 0;
  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    expect(buffer.readUInt16LE(offset + 8)).toBe(0);
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    entries.push({
      name: buffer.subarray(nameStart, nameStart + nameLength).toString('utf8'),
      data: buffer.subarray(dataStart, dataStart + size)
    });
    offset = dataStart + size;
  }
  return entries;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function firstWorksheetCells(workbook: Buffer): Record<string, string> {
  const sheet = parseStoredEntries(workbook).find((entry) => entry.name === 'xl/worksheets/sheet1.xml');
  expect(sheet).toBeDefined();
  const xml = sheet!.data.toString('utf8');
  const cells: Record<string, string> = {};
  for (const match of xml.matchAll(/<c\b([^>]*)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const attributes = match[1] || match[2] || '';
    const ref = attributes.match(/\br="([A-Z]+\d+)"/)?.[1];
    if (!ref) continue;
    const content = match[3] || '';
    const inlineText = [...content.matchAll(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g)]
      .map((part) => decodeXmlText(part[1]))
      .join('');
    const scalar = content.match(/<v>([\s\S]*?)<\/v>/)?.[1] || '';
    cells[ref] = inlineText || decodeXmlText(scalar);
  }
  return cells;
}

function firstWorksheetRowHeights(workbook: Buffer): Record<string, number> {
  const sheet = parseStoredEntries(workbook).find((entry) => entry.name === 'xl/worksheets/sheet1.xml');
  expect(sheet).toBeDefined();
  const xml = sheet!.data.toString('utf8');
  const heights: Record<string, number> = {};
  for (const match of xml.matchAll(/<row\b([^>]*)>/g)) {
    const row = match[1].match(/\br="(\d+)"/)?.[1];
    const height = Number(match[1].match(/\bht="([\d.]+)"/)?.[1]);
    if (row && Number.isFinite(height)) heights[row] = height;
  }
  return heights;
}

function firstWorksheetCellStyleIds(workbook: Buffer): Record<string, number> {
  const sheet = parseStoredEntries(workbook).find((entry) => entry.name === 'xl/worksheets/sheet1.xml');
  expect(sheet).toBeDefined();
  const xml = sheet!.data.toString('utf8');
  const styles: Record<string, number> = {};
  for (const match of xml.matchAll(/<c\b([^>]*)/g)) {
    const ref = match[1].match(/\br="([A-Z]+\d+)"/)?.[1];
    const styleId = Number(match[1].match(/\bs="(\d+)"/)?.[1]);
    if (ref && Number.isSafeInteger(styleId)) styles[ref] = styleId;
  }
  return styles;
}

function firstWorkbookStyles(workbook: Buffer): {
  cellXfs: string[];
  fonts: string[];
  fills: string[];
} {
  const entry = parseStoredEntries(workbook).find((item) => item.name === 'xl/styles.xml');
  expect(entry).toBeDefined();
  const xml = entry!.data.toString('utf8');
  const section = (name: 'cellXfs' | 'fonts' | 'fills'): string => {
    const content = xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`))?.[1];
    expect(content).toBeDefined();
    return content!;
  };
  return {
    cellXfs: [...section('cellXfs').matchAll(/<xf\b[^>]*?\/>|<xf\b[^>]*?>[\s\S]*?<\/xf>/g)].map((match) => match[0]),
    fonts: [...section('fonts').matchAll(/<font\b[^>]*>[\s\S]*?<\/font>/g)].map((match) => match[0]),
    fills: [...section('fills').matchAll(/<fill\b[^>]*>[\s\S]*?<\/fill>/g)].map((match) => match[0])
  };
}

function context(sourceName: string, targetName: string, extra: Partial<DiffXlsxContext> = {}): DiffXlsxContext {
  return {
    audience: 'customer',
    rows: [],
    sourceBundle: {
      appId: '101',
      meta: { appName: sourceName },
      sections: { appSettings: { name: sourceName } }
    },
    targetBundle: {
      appId: '202',
      meta: { appName: targetName },
      sections: { appSettings: { name: targetName } }
    },
    scopes: ['fields'],
    exportMode: 'all',
    exportLabel: '全件',
    filterDescription: 'フィルターなし（比較結果の全件）',
    ...extra
  };
}

function item(label: string, ctx: DiffXlsxContext): DiffXlsxBatchExportItem {
  return { label, context: ctx };
}

function failingContext(message: string): DiffXlsxContext {
  return Object.defineProperty({}, 'rows', {
    enumerable: true,
    get() { throw new Error(message); }
  }) as DiffXlsxContext;
}

describe('diff/xlsx-batch-export', () => {
  it('puts a readable batch summary first and keeps zero-difference and warning rows in input order', async () => {
    const progress: DiffXlsxBatchExportProgress[] = [];
    const result = await buildDiffXlsxBatchExport([
      item('一致した比較', context('05.【検証用 物件DB】保有物件', '05.【MG検証用 物件DB】保有物件', {
        rows: [{ sectionKey: 'fields', type: 'same', path: 'properties.物件名.label' }]
      })),
      item('取得不完全な比較', context('14.【検証用 物件DB】固都税管理', '14.【MG検証用 物件DB】固都税 路線価管理', {
        rows: [
          { sectionKey: 'fields', type: 'added', path: 'properties.A' },
          { sectionKey: 'fields', type: 'removed', path: 'properties.B' },
          { sectionKey: 'fields', type: 'changed', path: 'properties.C.label' },
          { sectionKey: 'layout', type: 'changed', moved: true, path: 'layout[0]' }
        ],
        fetchIssues: [{ section: 'フィールド', side: 'target', message: '取得できませんでした' }]
      }))
    ], {
      generatedAt: new Date(2026, 7, 27, 12, 34, 56),
      onProgress: (value) => progress.push(value)
    });

    expect(result.filename).toBe('設定差分確認_一括_2件_20260827_123456.zip');
    expect(result.blob.type).toBe('application/zip');
    expect(result.failures).toEqual([]);
    expect(result.entries).toHaveLength(2);
    expect(result.entries).toEqual([
      '001_保有物件.xlsx',
      '002_固都税管理_vs_固都税 路線価管理.xlsx'
    ]);
    expect(new Set(result.entries.map((name) => name.toLocaleLowerCase('en-US'))).size).toBe(2);
    expect(result.entries.some((name) => /manifest/i.test(name))).toBe(false);

    const archiveEntries = parseStoredEntries(await blobToBuffer(result.blob));
    expect(archiveEntries.map((entry) => entry.name)).toEqual([
      '000_一括比較結果.xlsx',
      ...result.entries
    ]);
    expect(archiveEntries.every((entry) => entry.data.readUInt32LE(0) === 0x04034b50)).toBe(true);
    const summaryXml = parseStoredEntries(archiveEntries[0].data)
      .find((entry) => entry.name === 'xl/worksheets/sheet1.xml')!.data.toString('utf8');
    const summaryCells = firstWorksheetCells(archiveEntries[0].data);
    expect(summaryCells).toMatchObject({
      A1: 'kintone 設定差分 一括比較結果',
      A3: 'No.', B3: '比較元', C3: '比較先', D3: '結果', E3: '取得状態',
      F3: '未取得・打切りの範囲', G3: '合計', K3: '並び順変更', L3: 'アプリ名',
      D4: '差分なし', E4: '全範囲を取得', F4: '', G4: '0', L4: '一致', M4: '001_保有物件.xlsx',
      D5: '差分あり', E5: '一部未取得', G5: '4', H5: '1', I5: '1', J5: '1', K5: '1',
      L5: '名称が異なります', M5: '002_固都税管理_vs_固都税 路線価管理.xlsx'
    });
    // 未取得があっても、確認できた範囲の差分件数は一括表で判断できる。
    expect(summaryCells.A2).toContain('差分あり 1件');
    expect(summaryCells.A2).toContain('一部未取得 1件');
    expect(summaryCells.F5).toBeTruthy();
    expect(summaryXml).not.toContain('<f');
    expect(summaryXml).not.toContain('<hyperlinks');
    expect(progress).toEqual([
      { stage: 'building', current: 1, total: 2, label: '一致した比較' },
      { stage: 'building', current: 2, total: 2, label: '取得不完全な比較' },
      { stage: 'archiving', current: 2, total: 2 }
    ]);
  });

  it('continues after a workbook failure and reports its original input index', async () => {
    const result = await buildDiffXlsxBatchExport([
      item('first', context('元1', '先1')),
      item('broken', failingContext('broken workbook')),
      item('third', context('元3', '先3'))
    ], { generatedAt: '2026-08-27T00:00:00+09:00' });

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatch(/^001_/);
    expect(result.entries[1]).toMatch(/^003_/);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({ index: 1, label: 'broken' });
    expect(result.failures[0].message).toBeTruthy();
    const archiveEntries = parseStoredEntries(await blobToBuffer(result.blob));
    expect(archiveEntries.map((entry) => entry.name)).toEqual([
      '000_一括比較結果.xlsx',
      ...result.entries
    ]);
    expect(archiveEntries).toHaveLength(3);
    expect(firstWorksheetCells(archiveEntries[0].data)).toMatchObject({
      A5: '2',
      D5: 'Excel生成失敗',
      E5: '—',
      L5: '名称未取得',
      G5: '—', H5: '—', I5: '—', J5: '—', K5: '—',
      M5: '—'
    });
  });

  it('uses semantic centered 11pt styles while zebra-striping only neutral batch cells', async () => {
    const result = await buildDiffXlsxBatchExport([
      item('no difference', context('同一アプリ', '同一アプリ')),
      item('with difference', context('比較元アプリ', '比較先アプリ', {
        rows: [{ sectionKey: 'fields', type: 'changed', path: 'properties.A.label', left: '旧', right: '新' }]
      })),
      item('incomplete', context('', '', {
        fetchIssues: [{ sectionKey: 'pluginSettings', side: 'source', message: '取得失敗' }]
      })),
      item('failed', failingContext('broken workbook'))
    ]);

    const archiveEntries = parseStoredEntries(await blobToBuffer(result.blob));
    const summaryWorkbook = archiveEntries[0].data;
    const cells = firstWorksheetCells(summaryWorkbook);
    const styles = firstWorksheetCellStyleIds(summaryWorkbook);
    const workbookStyles = firstWorkbookStyles(summaryWorkbook);

    expect(cells).toMatchObject({
      D4: '差分なし', E4: '全範囲を取得', L4: '一致',
      D5: '差分あり', E5: '全範囲を取得', L5: '名称が異なります',
      D6: '差分は確認できず', E6: '一部未取得', L6: '名称未取得',
      D7: 'Excel生成失敗', E7: '—', L7: '名称未取得'
    });
    expect(styles).toMatchObject({
      // First data row: neutral cells are unshaded; semantic cells keep their fills.
      A4: 22, B4: 2, C4: 2, D4: 25, E4: 25, F4: 2,
      G4: 22, H4: 22, I4: 22, J4: 22, K4: 22, L4: 25, M4: 2,
      // Second data row: only neutral cells receive the zebra fill.
      A5: 24, B5: 23, C5: 23, D5: 28, E5: 25, F5: 23,
      G5: 24, H5: 24, I5: 24, J5: 24, K5: 24, L5: 27, M5: 23,
      // Coverage detail and failure detail retain their own severity styles on either stripe.
      A6: 22, B6: 2, C6: 2, D6: 27, E6: 27, F6: 11,
      G6: 22, H6: 22, I6: 22, J6: 22, K6: 22, L6: 26, M6: 2,
      A7: 24, B7: 23, C7: 23, D7: 26, E7: 39, F7: 5,
      G7: 39, H7: 39, I7: 39, J7: 39, K7: 39, L7: 26, M7: 39
    });

    const semanticStyles = [
      { id: 25, fill: 'FFECFDF5' }, // good: green
      { id: 28, fill: 'FFF5F3FF' }, // difference: purple
      { id: 27, fill: 'FFFFFBEB' }, // incomplete: amber
      { id: 26, fill: 'FFFEF2F2' } // error: red
    ];
    for (const { id, fill } of semanticStyles) {
      const xf = workbookStyles.cellXfs[id];
      expect(xf).toContain('vertical="center"');
      expect(xf).toContain('horizontal="center"');
      expect(xf).toContain('wrapText="1"');
      const fontId = Number(xf.match(/\bfontId="(\d+)"/)?.[1]);
      const fillId = Number(xf.match(/\bfillId="(\d+)"/)?.[1]);
      expect(workbookStyles.fonts[fontId]).toContain('<sz val="11"/>');
      expect(workbookStyles.fills[fillId]).toContain(`rgb="${fill}"`);
    }
    expect(workbookStyles.cellXfs[39]).toContain('horizontal="center"');
    expect(workbookStyles.cellXfs[39]).toContain('vertical="center"');
    expect(workbookStyles.cellXfs[11]).toContain('fillId="6"');
    expect(workbookStyles.cellXfs[11]).toContain('vertical="top"');
    expect(workbookStyles.cellXfs[5]).toContain('fillId="5"');
    expect(workbookStyles.cellXfs[5]).toContain('vertical="top"');
  });

  it('counts an empty filtered result separately from a verified no-difference result', async () => {
    const result = await buildDiffXlsxBatchExport([
      item('filtered empty', context('絞込元', '絞込先', { exportMode: 'filtered' })),
      item('verified empty', context('同一', '同一'))
    ]);
    const summaryWorkbook = parseStoredEntries(await blobToBuffer(result.blob))[0].data;
    const cells = firstWorksheetCells(summaryWorkbook);
    const styles = firstWorksheetCellStyleIds(summaryWorkbook);

    expect(cells.D4).toBe('絞り込み後：掲載対象なし');
    expect(cells.D5).toBe('差分なし');
    expect(cells.A2).toContain('差分なし 1件');
    expect(cells.A2).toContain('絞り込み後：掲載対象なし 1件');
    expect(styles.D4).toBe(24);
    expect(styles.D5).toBe(25);
  });

  it('makes long or unsafe workbook names customer-safe, bounded, and unique', async () => {
    const unsafeName = `../同名:比較?${'長'.repeat(220)}`;
    const internal = context(unsafeName, unsafeName, { audience: 'internal', filename: `${unsafeName}.xlsx` });
    const result = await buildDiffXlsxBatchExport([
      item('same 1', internal),
      item('same 2', internal)
    ], {
      generatedAt: 1787774400000,
      archiveFilename: '../一括:結果?.ZIP'
    });

    expect(result.filename).toBe('一括_結果_.zip');
    expect(result.entries[0]).not.toMatch(/[\\/:*?"<>|]/);
    expect(result.entries[1]).not.toMatch(/[\\/:*?"<>|]/);
    expect(Array.from(result.entries[0]).length).toBeLessThanOrEqual(96);
    expect(Array.from(result.entries[1]).length).toBeLessThanOrEqual(96);
    expect(result.entries[0]).not.toBe(result.entries[1]);
  });

  it('expands summary data rows using half-width/full-width wrapping and caps extreme text', async () => {
    const halfWidthName = 'ｱ'.repeat(27);
    const fullWidthName = 'ア'.repeat(27);
    const forbiddenName = '\u0001'.repeat(6);
    const extremeName = '極'.repeat(400);
    const result = await buildDiffXlsxBatchExport([
      item('short', context('元', '先')),
      item('half-width', context(halfWidthName, halfWidthName)),
      item('full-width', context(fullWidthName, fullWidthName)),
      item('visible forbidden characters', context(forbiddenName, forbiddenName)),
      item('coverage detail', context('元', '先', {
        fetchIssues: [
          { sectionKey: 'pluginSettings', side: 'source', message: '取得失敗' },
          { sectionKey: 'customizeSettings', side: 'target', message: '取得失敗' },
          { sectionKey: 'recordPermissions', side: 'target', message: '取得失敗' }
        ]
      })),
      item('long filename', context('A'.repeat(36), 'B'.repeat(36))),
      item('extreme', context(extremeName, extremeName)),
      item('single line failure', failingContext('broken workbook'))
    ]);

    const archiveEntries = parseStoredEntries(await blobToBuffer(result.blob));
    const heights = firstWorksheetRowHeights(archiveEntries[0].data);
    // 短文は1行のまま、半角カナはNFKC正規化後の全角表示に合わせて2行にする。
    expect(heights['4']).toBe(32);
    expect(heights['5']).toBe(49);
    expect(heights['6']).toBe(49);
    // XML-forbidden characters expand to visible tokens before wrap measurement.
    expect(heights['7']).toBeGreaterThanOrEqual(49);
    expect(heights['8']).toBeGreaterThanOrEqual(49);
    expect(heights['9']).toBe(49);
    expect(heights['10']).toBe(220);
    expect(heights['11']).toBe(32);
    expect(Object.values(heights).every((height) => height <= 220)).toBe(true);
  });

  it('rejects the whole archive when the configured byte limit would be exceeded', async () => {
    await expect(buildDiffXlsxBatchExport([
      item('too large', context('元', '先'))
    ], { maxArchiveBytes: 100 })).rejects.toMatchObject({
      name: 'DiffXlsxBatchExportError',
      code: 'MAX_ARCHIVE_BYTES',
      maxArchiveBytes: 100,
      failures: []
    });
  });

  it('rejects with all failure details when no workbook can be generated', async () => {
    try {
      await buildDiffXlsxBatchExport([
        item('bad 1', failingContext('first failed')),
        item('bad 2', failingContext('second failed'))
      ]);
      throw new Error('expected buildDiffXlsxBatchExport to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(DiffXlsxBatchExportError);
      expect(error).toMatchObject({
        code: 'NO_SUCCESSFUL_WORKBOOK',
        failures: [
          { index: 0, label: 'bad 1' },
          { index: 1, label: 'bad 2' }
        ]
      });
    }
  });

  it('does not let a progress-rendering exception corrupt the archive', async () => {
    const result = await buildDiffXlsxBatchExport([
      item('safe', context('元', '先'))
    ], {
      onProgress: () => { throw new Error('render failed'); }
    });
    expect(result.entries).toHaveLength(1);
    expect(result.blob.type).toBe('application/zip');
  });
});
