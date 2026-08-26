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
  it('packages zero-difference and incomplete customer workbooks in input order without a manifest', async () => {
    const progress: DiffXlsxBatchExportProgress[] = [];
    const result = await buildDiffXlsxBatchExport([
      item('一致した比較', context('変更前A', '変更後A')),
      item('取得不完全な比較', context('変更前B', '変更後B', {
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
    expect(result.entries[0]).toMatch(/^001_.*\.xlsx$/);
    expect(result.entries[1]).toMatch(/^002_.*\.xlsx$/);
    expect(new Set(result.entries.map((name) => name.toLocaleLowerCase('en-US'))).size).toBe(2);
    expect(result.entries.some((name) => /manifest/i.test(name))).toBe(false);

    const archiveEntries = parseStoredEntries(await blobToBuffer(result.blob));
    expect(archiveEntries.map((entry) => entry.name)).toEqual(result.entries);
    expect(archiveEntries.every((entry) => entry.data.readUInt32LE(0) === 0x04034b50)).toBe(true);
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
    expect(parseStoredEntries(await blobToBuffer(result.blob))).toHaveLength(2);
  });

  it('makes long or unsafe workbook names customer-safe, bounded, and unique', async () => {
    const unsafeName = `../同名:比較?${'長'.repeat(220)}.xlsx`;
    const internal = context('元', '先', { audience: 'internal', filename: unsafeName });
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
    expect(Array.from(result.entries[0]).length).toBeLessThanOrEqual(180);
    expect(Array.from(result.entries[1]).length).toBeLessThanOrEqual(180);
    expect(result.entries[0]).not.toBe(result.entries[1]);
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
