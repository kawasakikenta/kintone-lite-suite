import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, fetchRecordsByQuery } from '../../src/api';
import { loadJSZipLite } from '../../src/jszipLoader';
import { downloadBlob } from '../../src/utils';
import { runAttachmentDownloadStandalone, runRecordBackupStandalone, zipNameForApp } from '../../src/tabs/record-standalone';

vi.mock('../../src/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api')>();
  return { ...actual, apiGet: vi.fn(), fetchRecordsByQuery: vi.fn() };
});
vi.mock('../../src/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils')>();
  return { ...actual, downloadBlob: vi.fn() };
});
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: vi.fn() }));

// 実際の JSZip と同様に、同じパスへの追加は先のファイルを置き換える。
class FakeZip {
  static instances: FakeZip[] = [];
  files = new Map<string, string | Blob>();
  generateAsync = vi.fn(async () => new Blob(['zip'], { type: 'application/zip' }));
  constructor() { FakeZip.instances.push(this); }
  file(name: string, content: string | Blob) { this.files.set(name, content); return this; }
  folder(prefix: string) { return { file: (name: string, content: string | Blob) => this.file(`${prefix}/${name}`, content) }; }
}

const status = vi.fn();
const sameKeyPrefix = (suffix: string) => `202610151200${suffix}`;
const properties = { title: { type: 'SINGLE_LINE_TEXT', code: 'title', label: '件名' }, attach: { type: 'FILE', code: 'attach', label: '添付' } };
const records = () => [{
  $id: { type: '__ID__', value: '5' },
  title: { type: 'SINGLE_LINE_TEXT', value: 't' },
  attach: { type: 'FILE', value: [
    { fileKey: sameKeyPrefix('AAA'), name: 'image.png', size: '1', contentType: 'image/png' },
    { fileKey: sameKeyPrefix('BBB'), name: 'image.png', size: '1', contentType: 'image/png' }
  ] }
}];

beforeEach(() => {
  vi.clearAllMocks();
  FakeZip.instances = [];
  vi.mocked(loadJSZipLite).mockResolvedValue(FakeZip as any);
  vi.mocked(apiGet).mockResolvedValue({ properties });
  vi.mocked(fetchRecordsByQuery).mockResolvedValue({ records: records(), mode: 'keyset' } as any);
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, status: 200, blob: async () => new Blob([url]) })));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('ZIP file names for multiple apps', () => {
  it('adds the app ID only when several apps share one requested name', () => {
    expect(zipNameForApp(' backup ', '7', true)).toBe('backup_app7.zip');
    expect(zipNameForApp('backup.ZIP', '7', true)).toBe('backup_app7.zip');
    expect(zipNameForApp('backup.zip', '7', false)).toBe('backup.zip');
    expect(zipNameForApp('', '7', true)).toBe('');
  });

  it('saves attachment and backup ZIPs with a .zip extension even if the user omitted it', async () => {
    await runAttachmentDownloadStandalone({ appId: '7', fileFieldCode: 'attach', zipName: 'my files' }, status);
    expect(downloadBlob).toHaveBeenLastCalledWith('my files.zip', expect.any(Blob));
    await runRecordBackupStandalone({ appId: '7', zipName: 'my backup', includeFiles: false }, status);
    expect(downloadBlob).toHaveBeenLastCalledWith('my backup.zip', expect.any(Blob));
  });
});

describe('attachment folder names from a field', () => {
  it('names the folder after a user/option value instead of "[object Object]"', async () => {
    const rows = records();
    Object.assign(rows[0], { 作成者: { type: 'CREATOR', value: { code: 'tanaka', name: '田中' } } });
    vi.mocked(fetchRecordsByQuery).mockResolvedValue({ records: rows, mode: 'keyset' } as any);
    await runAttachmentDownloadStandalone({ appId: '7', fileFieldCode: 'attach', folderFieldCode: '作成者' }, status);
    const paths = [...FakeZip.instances[0].files.keys()].filter((name) => name !== 'manifest.json');
    expect(paths.every((name) => name.startsWith('tanaka/'))).toBe(true);
    expect(paths).toHaveLength(2);
  });
});

describe('backup attachment paths', () => {
  it('keeps both files when two attachments in one field share a name and a fileKey prefix', async () => {
    await runRecordBackupStandalone({ appId: '7', includeFiles: true, includeComments: false, includeAppSettings: false }, status);
    const zip = FakeZip.instances[0];
    const attachments = [...zip.files.keys()].filter((name) => name.startsWith('attachments/'));
    expect(attachments).toEqual(['attachments/record_5/attach/202610151200_image.png', 'attachments/record_5/attach/202610151200_image_2.png']);
    const manifest = JSON.parse(String(zip.files.get('manifest.json')));
    expect(manifest.fileCount).toBe(2);
  });
});
