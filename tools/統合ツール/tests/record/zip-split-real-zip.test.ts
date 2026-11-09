import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, fetchRecordsByQuery } from '../../src/api';
import { downloadBlob } from '../../src/utils';
import { LITE_ZIP_MAX_BYTES, LITE_ZIP_MAX_ENTRIES } from '../../src/archive/lite-zip';
import { runAttachmentDownloadStandalone, runRecordBackupStandalone } from '../../src/tabs/record-standalone';
import { planZipParts } from '../../src/tabs/record-zip-split';
import { readZip } from '../archive/zip-reader';

// 実際の ZIP 実装（LiteZip）で、分割した ZIP がどれも読み戻せ、上限を超えないこと。
vi.mock('../../src/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api')>();
  return { ...actual, apiGet: vi.fn(), fetchRecordsByQuery: vi.fn() };
});
vi.mock('../../src/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils')>();
  return { ...actual, downloadBlob: vi.fn() };
});

const properties = { title: { type: 'SINGLE_LINE_TEXT', code: 'title', label: '件名' }, attach: { type: 'FILE', code: 'attach', label: '添付' } };
const record = (id: number, size: number) => ({
  $id: { type: '__ID__', value: String(id) },
  title: { type: 'SINGLE_LINE_TEXT', value: `t${id}` },
  attach: { type: 'FILE', value: [{ fileKey: `20261015${id}x0`, name: `file${id}.txt`, size: String(size), contentType: 'text/plain' }] }
});
const limits = { targetBytes: 8000, maxBytes: 20000, reservedBytes: 0, reservedEntries: 0, maxEntries: 1000 };
const status = vi.fn();

async function saved(): Promise<Array<{ name: string; entries: Map<string, Buffer>; size: number }>> {
  return Promise.all(vi.mocked(downloadBlob).mock.calls.map(async ([name, blob]) => {
    const buffer = Buffer.from(await (blob as Blob).arrayBuffer());
    return { name, size: buffer.length, entries: new Map(readZip(buffer).map((entry) => [entry.name, entry.data])) };
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiGet).mockResolvedValue({ properties });
  vi.mocked(fetchRecordsByQuery).mockResolvedValue({ records: [1, 2, 3, 4].map((id) => record(id, 1000)), mode: 'keyset' } as any);
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, status: 200, blob: async () => new Blob([`body:${url}`]) })));
});

describe('split ZIPs written by the real ZIP implementation', () => {
  it('every attachment ZIP can be read back, with the files of one record kept together', async () => {
    await runAttachmentDownloadStandalone({ appId: '7', fileFieldCode: 'attach', zipName: 'files.zip', zipLimits: limits }, status);
    const zips = await saved();
    expect(zips.map((zip) => zip.name)).toEqual(['files_part1.zip', 'files_part2.zip']);
    const files = zips.map((zip) => [...zip.entries.keys()].filter((name) => /^Record_/.test(name) && !name.endsWith('/')));
    expect(files.map((list) => list.length)).toEqual([3, 1]);
    for (const zip of zips) {
      const manifest = JSON.parse(zip.entries.get('manifest.json')!.toString('utf8'));
      expect(manifest.split.partCount).toBe(2);
    }
    expect([...zips[0].entries.entries()].find(([name]) => name.startsWith('Record_1/') && !name.endsWith('/'))?.[1].toString()).toContain('body:');
  });

  it('keeps the records, CSV and manifest in the last backup ZIP', async () => {
    await runRecordBackupStandalone({ appId: '7', zipName: 'bk.zip', includeFiles: true, includeComments: false, includeAppSettings: false, zipLimits: limits }, status);
    const zips = await saved();
    expect(zips.map((zip) => zip.name)).toEqual(['bk_part1.zip', 'bk_part2.zip']);
    expect(zips[0].entries.has('records.json')).toBe(false);
    expect(zips[1].entries.has('records.json') && zips[1].entries.has('records.csv')).toBe(true);
    expect(JSON.parse(zips[1].entries.get('manifest.json')!.toString('utf8')).fileCount).toBe(4);
  });

  it('plans with the limits of the ZIP implementation, and an estimate never undercuts the real ZIP size', async () => {
    const plan = planZipParts([{ id: '1', files: [{ path: 'a/b.txt', size: 1 }] }]);
    expect(plan.parts[0].entryCount).toBe(2);
    const { ZIP_MAX_BYTES, ZIP_MAX_ENTRIES } = await import('../../src/tabs/record-zip-split');
    expect(ZIP_MAX_BYTES).toBe(LITE_ZIP_MAX_BYTES);
    expect(ZIP_MAX_ENTRIES).toBe(LITE_ZIP_MAX_ENTRIES);
    // 見積もり（STORE の大きさ）は、実際の ZIP（圧縮を含む）より小さくならない
    await runAttachmentDownloadStandalone({ appId: '7', fileFieldCode: 'attach', zipName: 'files.zip', zipLimits: limits }, status);
    const zips = await saved();
    const planned = planZipParts(
      [1, 2, 3, 4].map((id) => ({ id: String(id), files: [{ path: `Record_${id}/${`20261015${id}x0`.slice(0, 12)}_file${id}.txt`, size: 1000 }] })),
      { limits }
    );
    zips.forEach((zip, index) => expect(zip.size).toBeLessThanOrEqual(planned.parts[index].estimatedBytes + 4000));
  });
});
