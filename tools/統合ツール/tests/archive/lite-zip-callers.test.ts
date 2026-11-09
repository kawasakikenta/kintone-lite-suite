import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, fetchRecordsByQuery } from '../../src/api';
import { downloadBlob } from '../../src/utils';
import { runAttachmentDownloadStandalone, runRecordBackupStandalone } from '../../src/tabs/record-standalone';
import { readZip } from './zip-reader';

// 実際の ZIP 実装（loadJSZipLite の本物）を通し、ツールが保存する ZIP を読み戻して中身を確かめる。
vi.mock('../../src/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api')>();
  return { ...actual, apiGet: vi.fn(), fetchRecordsByQuery: vi.fn() };
});
vi.mock('../../src/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils')>();
  return { ...actual, downloadBlob: vi.fn() };
});

const status = vi.fn();
const properties = { title: { type: 'SINGLE_LINE_TEXT', code: 'title', label: '件名' }, attach: { type: 'FILE', code: 'attach', label: '添付' } };
const records = () => [{
  $id: { type: '__ID__', value: '5' },
  title: { type: 'SINGLE_LINE_TEXT', value: '見積書' },
  attach: { type: 'FILE', value: [
    { fileKey: '202610151200AAA', name: '見積 2026.pdf', size: '3', contentType: 'application/pdf' },
    { fileKey: '202610151200BBB', name: '見積 2026.pdf', size: '3', contentType: 'application/pdf' }
  ] }
}];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiGet).mockResolvedValue({ properties });
  vi.mocked(fetchRecordsByQuery).mockResolvedValue({ records: records(), mode: 'keyset' } as any);
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, status: 200, blob: async () => new Blob([`bytes of ${String(url).slice(-6)}`]) })));
});
afterEach(() => { vi.unstubAllGlobals(); });

async function savedZip() {
  const [filename, blob] = vi.mocked(downloadBlob).mock.calls.at(-1)!;
  const list = readZip(Buffer.from(await (blob as Blob).arrayBuffer()));
  return { filename, entries: new Map(list.map((entry) => [entry.name, entry])) };
}

describe('保存される ZIP の中身（実際の ZIP 実装）', () => {
  it('添付ファイルを日本語名のフォルダへ入れ、取得したバイト列とマニフェストが一致する', async () => {
    await runAttachmentDownloadStandalone({ appId: '7', fileFieldCode: 'attach', folderFieldCode: 'title', zipName: '見積の添付' }, status);
    const { filename, entries } = await savedZip();
    expect(filename).toBe('見積の添付.zip');
    const files = [...entries.keys()].filter((name) => !name.endsWith('/'));
    expect(files).toHaveLength(3);
    expect(entries.has('見積書/')).toBe(true);
    const attachments = files.filter((name) => name.startsWith('見積書/'));
    expect(attachments).toHaveLength(2);
    for (const name of attachments) expect(entries.get(name)!.data.toString('utf8')).toMatch(/^bytes of /);
    const manifest = JSON.parse(entries.get('manifest.json')!.data.toString('utf8'));
    expect(manifest).toMatchObject({ appId: '7', recordCount: 1, savedCount: 2, failedCount: 0 });
  });

  it('レコードのバックアップ ZIP を、レコード JSON とマニフェストつきで保存する', async () => {
    await runRecordBackupStandalone({ appId: '7', zipName: 'バックアップ', includeFiles: false }, status);
    const { filename, entries } = await savedZip();
    expect(filename).toBe('バックアップ.zip');
    expect(JSON.parse(entries.get('records.json')!.data.toString('utf8')).records).toHaveLength(1);
    expect(JSON.parse(entries.get('manifest.json')!.data.toString('utf8')).appId).toBe('7');
  });
});
