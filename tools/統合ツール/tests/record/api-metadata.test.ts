import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../fixtures/api-metadata.json';
import { readRecordViews, readAttachmentFields } from '../../src/tabs/record-metadata';
import { runAttachmentDownloadStandalone, runLoadViewsStandalone, runLoadAttachmentFieldsStandalone, runRecordAppBatchStandalone } from '../../src/tabs/record-standalone';
import { apiGet, fetchRecordsByQuery } from '../../src/api';
import { downloadBlob } from '../../src/utils';
import { loadJSZipLite } from '../../src/jszipLoader';
import { sanitizeZipSegment } from '../../src/tabs/record-query';

vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn(), fetchRecordsByQuery: vi.fn() }));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), downloadBlob: vi.fn() }));
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: vi.fn() }));

// Deliberately overwrite duplicate entries just as JSZip does.
class FakeZip {
  files = new Map<string, unknown>();
  file(path: string, value: unknown) { this.files.set(path, value); return this; }
  folder(path: string) { return { file: (name: string, value: unknown) => this.file(`${path}/${name}`, value) }; }
  async generateAsync() { return new Blob(['synthetic zip']); }
}
let zip: FakeZip;
const options = { appId: '7', guestId: '9', query: 'amount > 1000 order by $id desc', fileFieldCode: 'receipt', folderFieldCode: 'title', zipName: '添付.zip' };
const status = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  zip = new FakeZip();
  vi.mocked(loadJSZipLite).mockResolvedValue(class { constructor() { return zip; } });
  vi.mocked(apiGet).mockResolvedValue(fixture.fields);
  vi.mocked(fetchRecordsByQuery).mockResolvedValue({ records: structuredClone(fixture.records), mode: 'cursor' });
  vi.stubGlobal('fetch', vi.fn(async () => new Response('hello')));
});
afterEach(() => vi.unstubAllGlobals());

describe('official API metadata contracts', () => {
  it('keeps all view types, numeric display order, distinct IDs and filter + sort', () => {
    const views = readRecordViews(fixture.views);
    expect(views.map(v => v.id)).toEqual(['300', '301', '302', '310']);
    expect(views.map(v => v.query)).toEqual(['', '作業者 in (LOGINUSER()) order by $id desc', 'amount > 1000 order by title asc', 'amount > 1000 order by due asc, $id desc']);
    expect(readRecordViews({ views: { key: { type: 'LIST', id: '1', name: '表示名', sort: '$id desc' } } })[0]).toMatchObject({ name: '表示名', query: 'order by $id desc' });
  });
  it('reads nested field objects, labels and codes without mixing them', () => {
    expect(readAttachmentFields(fixture.fields)).toEqual([
      { fileFieldCode: 'receipt', fileLabel: '領収書', tableFieldCode: '', tableLabel: '' },
      { fileFieldCode: 'evidence', fileLabel: '証跡ファイル', tableFieldCode: 'documents', tableLabel: '書類明細' }
    ]);
  });
  it('distinguishes invalid responses from valid empty settings', () => {
    expect(() => readRecordViews({ views: [] })).toThrow(/応答/);
    expect(() => readAttachmentFields({})).toThrow(/応答/);
    expect(readRecordViews({ views: {} })).toEqual([]);
    expect(readAttachmentFields({ properties: {} })).toEqual([]);
  });
  it('requests published settings in the guest context with user-facing labels', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce(fixture.views).mockResolvedValueOnce(fixture.fields);
    await runLoadViewsStandalone(options, status);
    await runLoadAttachmentFieldsStandalone(options, status);
    expect(apiGet).toHaveBeenNthCalledWith(1, '/k/guest/9/v1', '/app/views.json', { app: '7', lang: 'user' });
    expect(apiGet).toHaveBeenNthCalledWith(2, '/k/guest/9/v1', '/app/form/fields.json', { app: '7', lang: 'user' });
  });
});

describe('attachment downloads based on FILE and SUBTABLE responses', () => {
  it('preserves colliding filenames across records and records origin metadata', async () => {
    await runAttachmentDownloadStandalone(options, status);
    const manifest = JSON.parse(zip.files.get('manifest.json') as string);
    expect(manifest.files.map(f => f.recordId)).toEqual(['41', '42']);
    expect(manifest.files.map(f => f.size)).toEqual(['5', '6']);
    expect(new Set(manifest.files.map(f => f.path)).size).toBe(2);
    for (const entry of manifest.files) {
      expect(entry.contentType).toBe('text/plain');
      expect(zip.files.get(entry.path)).toBeInstanceOf(Blob);
    }
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/k/guest/9/v1/file.json?fileKey=SAMEPREFIX12-file1');
    expect(downloadBlob).toHaveBeenCalledWith('添付.zip', expect.any(Blob));
    expect(fetchRecordsByQuery).toHaveBeenCalledWith('/k/guest/9/v1', '7', options.query, expect.any(Object));
  });
  it('downloads every table row and preserves row IDs; empty tables are allowed', async () => {
    await runAttachmentDownloadStandalone({ ...options, fileFieldCode: 'evidence', tableFieldCode: 'documents' }, status);
    const files = JSON.parse(zip.files.get('manifest.json') as string).files;
    expect(files.map(f => f.rowId)).toEqual(['501', '502']);
    expect(files.every(f => f.tableFieldCode === 'documents' && f.recordId === '41')).toBe(true);
    expect(new Set(files.map(f => f.path)).size).toBe(2);
  });
  it.each(['title', '存在しないコード'])('rejects a non-FILE or missing field before retrieving records: %s', async fileFieldCode => {
    await expect(runAttachmentDownloadStandalone({ ...options, fileFieldCode }, status)).rejects.toThrow(/添付フィールド/);
    expect(fetchRecordsByQuery).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reports hidden record fields rather than silently treating them as empty', async () => {
    vi.mocked(fetchRecordsByQuery).mockResolvedValue({ records: [{ $id: { value: '41' } }], mode: 'cursor' });
    await expect(runAttachmentDownloadStandalone(options, status)).rejects.toThrow(/レコード 41.*閲覧権限/);
    expect(downloadBlob).not.toHaveBeenCalled();
  });
  it('reports hidden fields in a table row with row context', async () => {
    vi.mocked(fetchRecordsByQuery).mockResolvedValue({ records: [{ $id: { value: '41' }, documents: { type: 'SUBTABLE', value: [{ id: '501', value: {} }] } }], mode: 'cursor' });
    await expect(runAttachmentDownloadStandalone({ ...options, fileFieldCode: 'evidence', tableFieldCode: 'documents' }, status)).rejects.toThrow(/テーブル行 1/);
  });
  it('keeps partial-download warnings through multi-app execution and logs failed metadata', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('hello')).mockResolvedValueOnce(new Response('', { status: 403 }));
    await runRecordAppBatchStandalone('7', appId => runAttachmentDownloadStandalone({ ...options, appId }, status), status);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('警告 1アプリ'), true);
    expect(zip.files.get('download_errors.txt')).toContain('403');
    expect(JSON.parse(zip.files.get('manifest.json') as string).files[1]).toMatchObject({ recordId: '42', path: '', error: '閲覧権限なし (HTTP 403)' });
  });
  it('returns a warning without loading ZIP libraries when attachments are empty', async () => {
    vi.mocked(fetchRecordsByQuery).mockResolvedValue({ records: [{ $id: { value: '41' }, documents: { type: 'SUBTABLE', value: [] } }], mode: 'cursor' });
    expect(await runAttachmentDownloadStandalone({ ...options, fileFieldCode: 'evidence', tableFieldCode: 'documents' }, status)).toEqual({ warning: 'ダウンロード対象の添付がありませんでした' });
    expect(loadJSZipLite).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not download a success ZIP when all files fail', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 403 }));
    await expect(runAttachmentDownloadStandalone(options, status)).rejects.toThrow(/1件も取得できません/);
    expect(downloadBlob).not.toHaveBeenCalled();
  });
  it.each(['.', '..', '...'])('prevents relative-directory ZIP segments: %s', value => {
    expect(sanitizeZipSegment(value, 'Record_41')).toBe('Record_41');
  });
});
