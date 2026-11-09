import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, fetchRecordsByQuery } from '../../src/api';
import { loadJSZipLite } from '../../src/jszipLoader';
import { RunCancelledError } from '../../src/runControl';
import { downloadBlob } from '../../src/utils';
import { describeMultipleDownloads, runAttachmentDownloadStandalone, runRecordAppBatchStandalone, runRecordBackupStandalone } from '../../src/tabs/record-standalone';

vi.mock('../../src/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api')>();
  return { ...actual, apiGet: vi.fn(), fetchRecordsByQuery: vi.fn() };
});
vi.mock('../../src/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils')>();
  return { ...actual, downloadBlob: vi.fn() };
});
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: vi.fn() }));

class FakeZip {
  static instances: FakeZip[] = [];
  static failGenerateAt = 0;
  files = new Map<string, string | Blob>();
  generateAsync = vi.fn(async () => {
    if (FakeZip.failGenerateAt && FakeZip.instances.indexOf(this) + 1 === FakeZip.failGenerateAt) throw new Error('ZIP が上限を超えました');
    return new Blob(['zip'], { type: 'application/zip' });
  });
  constructor() { FakeZip.instances.push(this); }
  file(name: string, content: string | Blob) { this.files.set(name, content); return this; }
  folder(prefix: string) { return { file: (name: string, content: string | Blob) => this.file(`${prefix}/${name}`, content) }; }
  json(name: string) { return JSON.parse(String(this.files.get(name))); }
  attachmentPaths() { return [...this.files.keys()].filter((name) => name !== 'manifest.json' && name !== 'download_errors.txt'); }
}

const status = vi.fn();
const properties = { title: { type: 'SINGLE_LINE_TEXT', code: 'title', label: '件名' }, attach: { type: 'FILE', code: 'attach', label: '添付' } };
/** 1 レコード 1 添付。宣言サイズ（size）だけで ZIP の分け方が決まる。 */
const record = (id: number, ...sizes: number[]) => ({
  $id: { type: '__ID__', value: String(id) },
  title: { type: 'SINGLE_LINE_TEXT', value: `t${id}` },
  attach: { type: 'FILE', value: sizes.map((size, index) => ({ fileKey: `20261015${id}x${index}`, name: `file${id}_${index}.bin`, size: String(size), contentType: 'application/octet-stream' })) }
});
// 小さい上限で分割位置を決める。1 ファイルの見積もりはおよそ「宣言サイズ + 1.2KB + パス + フォルダ」で、1000 バイトの添付なら 3 レコードまでが 1 つの ZIP に入る。
const limits = { targetBytes: 8000, maxBytes: 20000, reservedBytes: 0, reservedEntries: 0, maxEntries: 1000 };
const mockRecords = (records: any[]) => vi.mocked(fetchRecordsByQuery).mockResolvedValue({ records, mode: 'keyset' } as any);
const baseOptions = { appId: '7', fileFieldCode: 'attach', zipName: 'files.zip', zipLimits: limits };

beforeEach(() => {
  vi.clearAllMocks();
  FakeZip.instances = [];
  FakeZip.failGenerateAt = 0;
  vi.mocked(loadJSZipLite).mockResolvedValue(FakeZip as any);
  vi.mocked(apiGet).mockResolvedValue({ properties });
  mockRecords([1, 2, 3, 4].map((id) => record(id, 1000)));
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, status: 200, blob: async () => new Blob([url]) })));
});

describe('attachment download: a ZIP that would exceed the limit is split before it is built', () => {
  it('saves each ZIP as soon as its files are fetched and keeps every record in one ZIP', async () => {
    const result = await runAttachmentDownloadStandalone(baseOptions, status);

    expect(vi.mocked(downloadBlob).mock.calls.map((call) => call[0])).toEqual(['files_part1.zip', 'files_part2.zip']);
    expect(FakeZip.instances).toHaveLength(2);
    expect(FakeZip.instances[0].attachmentPaths().map((path) => path.split('/')[0])).toEqual(['Record_1', 'Record_2', 'Record_3']);
    expect(FakeZip.instances[1].attachmentPaths().map((path) => path.split('/')[0])).toEqual(['Record_4']);
    // 1 つ目の ZIP は、2 つ目の取得を始める前に保存している
    const downloadOrder = vi.mocked(downloadBlob).mock.invocationCallOrder[0];
    const lastFetch = vi.mocked(fetch).mock.invocationCallOrder.at(-1) as number;
    expect(downloadOrder).toBeLessThan(lastFetch);
    expect(result.downloads).toEqual(['files_part1.zip', 'files_part2.zip']);
    expect(result.summary?.counts).toMatchObject({ ファイル: 4, 取得失敗: 0, ZIP: 2 });
    expect(result.summary?.describe(result.summary.counts, ['7'])).toBe('添付ファイル 4件を保存しました（2個のZIPに分けて保存）');
    expect(status).toHaveBeenLastCalledWith('添付ファイル 4件を保存しました（2個のZIPに分けて保存）', 'ok');
    expect(result.warning).toBeUndefined();
  });

  it('writes the split and each ZIP range into every manifest', async () => {
    await runAttachmentDownloadStandalone(baseOptions, status);
    const first = FakeZip.instances[0].json('manifest.json');
    const second = FakeZip.instances[1].json('manifest.json');

    expect(first.recordCount).toBe(4);
    expect(first.savedCount).toBe(3);
    expect(first.split).toMatchObject({ partNumber: 1, partCount: 2, recordCount: 4, plannedFileCount: 4 });
    expect(first.split.parts).toEqual([
      expect.objectContaining({ part: 1, fileName: 'files_part1.zip', state: 'saved', firstRecordId: '1', lastRecordId: '3', recordCount: 3, savedCount: 3 }),
      expect.objectContaining({ part: 2, fileName: 'files_part2.zip', state: 'pending', firstRecordId: '4', lastRecordId: '4', plannedFileCount: 1 })
    ]);
    expect(second.split.partNumber).toBe(2);
    expect(second.split.parts.map((part: any) => part.state)).toEqual(['saved', 'saved']);
    expect(second.split.overall).toMatchObject({ savedCount: 4, failedCount: 0, unsavedCount: 0, finishedParts: 2 });
    expect(second.files.map((file: any) => file.recordId)).toEqual(['4']);
  });

  it('does not add split information when everything fits in one ZIP', async () => {
    await runAttachmentDownloadStandalone({ ...baseOptions, zipLimits: undefined }, status);
    expect(vi.mocked(downloadBlob).mock.calls.map((call) => call[0])).toEqual(['files.zip']);
    expect(FakeZip.instances[0].json('manifest.json').split).toBeUndefined();
  });

  it('keeps all files of one record in the same ZIP', async () => {
    mockRecords([record(1, 1000, 1000, 1000), record(2, 1000)]);
    await runAttachmentDownloadStandalone(baseOptions, status);
    expect(FakeZip.instances[0].attachmentPaths().filter((path) => path.startsWith('Record_1/'))).toHaveLength(3);
    expect(FakeZip.instances[1].attachmentPaths()).toHaveLength(1);
  });

  it('records the one attachment that exceeds the ZIP limit as unsaved with a reason and continues', async () => {
    mockRecords([record(1, 1000), record(2, 1000, 30000), record(3, 1000)]);
    const result = await runAttachmentDownloadStandalone(baseOptions, status);

    // 上限を超えるファイルは取得しない（fetch は 4 件中 3 件）
    expect(fetch).toHaveBeenCalledTimes(3);
    const paths = FakeZip.instances.flatMap((zip) => zip.attachmentPaths());
    expect(paths).toHaveLength(3);
    const withUnsaved = FakeZip.instances.find((zip) => zip.files.has('download_errors.txt')) as FakeZip;
    expect(String(withUnsaved.files.get('download_errors.txt'))).toContain('ZIP の上限のため保存できなかった添付ファイル 1件');
    expect(String(withUnsaved.files.get('download_errors.txt'))).toMatch(/record 2\tfile2_1\.bin\t1 ファイルが ZIP の上限/);
    const manifest = withUnsaved.json('manifest.json');
    expect(manifest.unsaved).toEqual([expect.objectContaining({ recordId: '2', fileName: 'file2_1.bin', reason: expect.stringContaining('ZIP の上限') })]);
    expect(manifest.files.find((file: any) => file.unsaved)).toMatchObject({ recordId: '2', path: '' });
    expect(result.summary?.counts).toMatchObject({ ファイル: 3, 取得失敗: 0, 保存不可: 1 });
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('ZIPの上限で保存できなかった添付 1件'), 'warn');
    expect(result.warning).toContain('download_errors.txt');
  });

  it('records a download whose real size exceeds the budget even when the declared size was small', async () => {
    mockRecords([record(1, 10), record(2, 10)]);
    vi.mocked(fetch).mockImplementation((async (url: string) => ({ ok: true, status: 200, blob: async () => ({ size: String(url).includes('2x0') ? 50000 : 10 }) })) as any);
    const result = await runAttachmentDownloadStandalone({ ...baseOptions, zipLimits: { ...limits, targetBytes: 600000, maxBytes: 20000 } }, status);

    const manifest = FakeZip.instances[0].json('manifest.json');
    expect(manifest.savedCount).toBe(1);
    expect(manifest.unsaved).toEqual([expect.objectContaining({ recordId: '2', reason: expect.stringContaining('ZIP の上限') })]);
    expect(result.summary?.counts).toMatchObject({ ファイル: 1, 保存不可: 1 });
  });

  it('splits before the 65,535 entry limit (files and folders both count)', async () => {
    // 1 レコード 1 添付 = ファイル 1 + フォルダ 1。予算 10 件なら 1 つの ZIP に 5 レコード。
    mockRecords(Array.from({ length: 12 }, (_, i) => record(i + 1, 1)));
    await runAttachmentDownloadStandalone({ ...baseOptions, zipLimits: { ...limits, targetBytes: 1e9, maxBytes: 2e9, maxEntries: 10 } }, status);
    expect(FakeZip.instances.map((zip) => zip.attachmentPaths().length)).toEqual([5, 5, 2]);
    expect(vi.mocked(downloadBlob).mock.calls.map((call) => call[0])).toEqual(['files_part1.zip', 'files_part2.zip', 'files_part3.zip']);
  });

  it('pads part numbers so that ten or more ZIPs sort correctly', async () => {
    mockRecords(Array.from({ length: 10 }, (_, i) => record(i + 1, 5000)));
    await runAttachmentDownloadStandalone(baseOptions, status);
    expect(vi.mocked(downloadBlob).mock.calls[0][0]).toBe('files_part01.zip');
    expect(vi.mocked(downloadBlob).mock.calls.at(-1)?.[0]).toBe('files_part10.zip');
  });

  it('reports the saved ZIPs when the user cancels in a later ZIP, and does not save the interrupted one', async () => {
    let calls = 0;
    vi.mocked(fetch).mockImplementation((async (url: string) => {
      calls++;
      if (calls === 4) throw new RunCancelledError();
      return { ok: true, status: 200, blob: async () => new Blob([url]) };
    }) as any);
    const error: any = await runAttachmentDownloadStandalone(baseOptions, status).catch((caught) => caught);

    expect(vi.mocked(downloadBlob).mock.calls.map((call) => call[0])).toEqual(['files_part1.zip']);
    expect(error.message.split('\n')[0]).toBe('中止しました（3/4 件を処理、残り 1 件は未実行）');
    expect(error.message).toContain('中断したレコード: 4');
    expect(error.message).toContain('保存済みの ZIP: files_part1.zip（1個）。中断した ZIP（part 2）と以降は保存していません');
  });

  it('still says no ZIP was saved when the user cancels before the first ZIP', async () => {
    vi.mocked(fetch).mockRejectedValue(new RunCancelledError());
    const error: any = await runAttachmentDownloadStandalone(baseOptions, status).catch((caught) => caught);
    expect(error.message).toContain('添付ファイルの ZIP は保存していません');
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('names the ZIPs already saved when a later ZIP cannot be built', async () => {
    FakeZip.failGenerateAt = 2;
    const error: any = await runAttachmentDownloadStandalone(baseOptions, status).catch((caught) => caught);
    expect(error.message).toContain('ZIP を作成できませんでした（2 個中 part 2）: ZIP が上限を超えました');
    expect(error.message).toContain('保存済みの ZIP: files_part1.zip');
    expect(vi.mocked(downloadBlob).mock.calls.map((call) => call[0])).toEqual(['files_part1.zip']);
  });

  it('carries the failures of a leading ZIP without saved files into the next ZIP instead of saving an empty ZIP', async () => {
    mockRecords([record(1, 5000), record(2, 5000)]);
    vi.mocked(fetch).mockImplementation((async (url: string) => String(url).includes('1x0')
      ? { ok: false, status: 404, blob: async () => new Blob([]) }
      : { ok: true, status: 200, blob: async () => new Blob([url]) }) as any);
    const result = await runAttachmentDownloadStandalone(baseOptions, status);

    expect(vi.mocked(downloadBlob).mock.calls.map((call) => call[0])).toEqual(['files_part2.zip']);
    const zip = FakeZip.instances.at(-1) as FakeZip;
    expect(String(zip.files.get('download_errors.txt'))).toContain('record 1\tfile1_0.bin\tHTTP 404');
    const split = zip.json('manifest.json').split;
    expect(split.parts.map((part: any) => part.state)).toEqual(['empty', 'saved']);
    expect(split.overall).toMatchObject({ savedCount: 1, failedCount: 1 });
    expect(result.summary?.counts).toMatchObject({ ファイル: 1, 取得失敗: 1 });
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('取得失敗 1件'), 'warn');
  });

  it('keeps failing when no attachment could be saved at all', async () => {
    mockRecords([record(1, 5000), record(2, 5000)]);
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500, blob: async () => new Blob([]) } as any);
    await expect(runAttachmentDownloadStandalone(baseOptions, status)).rejects.toThrow('添付ファイルを1件も取得できませんでした（失敗 2件）');
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});

describe('record backup: split into attachment ZIPs and a final ZIP with the records', () => {
  const backupOptions = { appId: '7', zipName: 'backup.zip', includeFiles: true, includeComments: false, includeAppSettings: false, zipLimits: limits };

  it('keeps the records, CSV and the overall manifest in the last ZIP', async () => {
    const result = await runRecordBackupStandalone(backupOptions, status);

    expect(vi.mocked(downloadBlob).mock.calls.map((call) => call[0])).toEqual(['backup_part1.zip', 'backup_part2.zip']);
    const [first, second] = FakeZip.instances;
    expect(first.files.has('records.json')).toBe(false);
    expect(first.files.has('records.csv')).toBe(false);
    expect(first.attachmentPaths().every((path) => path.startsWith('attachments/'))).toBe(true);
    expect(first.json('manifest.json').notes[0]).toContain('最後の ZIP');
    expect(second.files.has('records.json')).toBe(true);
    expect(second.files.has('records.csv')).toBe(true);
    const manifest = second.json('manifest.json');
    expect(manifest.recordCount).toBe(4);
    expect(manifest.fileCount).toBe(4);
    expect(manifest.attachmentSummary).toMatchObject({ savedCount: 4, failedCount: 0 });
    expect(manifest.split.partCount).toBe(2);
    expect(manifest.split.parts.map((part: any) => part.fileName)).toEqual(['backup_part1.zip', 'backup_part2.zip']);
    expect(manifest.notes).toContain('ZIP が大きいため 2 個に分けて保存（manifest.json の split 参照）');
    expect(result.summary?.describe(result.summary.counts, ['7'])).toBe('バックアップを保存しました（レコード 4件・添付 4件・2個のZIPに分けて保存）');
    expect(result.downloads).toEqual(['backup_part1.zip', 'backup_part2.zip']);
  });

  it('produces exactly one ZIP with the previous layout when nothing needs splitting', async () => {
    await runRecordBackupStandalone({ ...backupOptions, zipLimits: undefined }, status);
    expect(vi.mocked(downloadBlob).mock.calls.map((call) => call[0])).toEqual(['backup.zip']);
    const zip = FakeZip.instances[0];
    expect(zip.files.has('records.json') && zip.files.has('records.csv')).toBe(true);
    const manifest = zip.json('manifest.json');
    expect(manifest.split).toBeUndefined();
    expect(manifest.files).toBeUndefined();
    expect(manifest.attachmentSummary).toEqual({ savedCount: 4, failedCount: 0, totalBytes: 4000 });
    expect(zip.files.has('download_errors.txt')).toBe(false);
  });

  it('adds a final ZIP only for the records when the last attachment ZIP has no room left', async () => {
    mockRecords([record(1, 5900)]);
    const result = await runRecordBackupStandalone({ ...backupOptions, zipLimits: { ...limits, maxBytes: 8000, targetBytes: 8000 } }, status);
    expect(vi.mocked(downloadBlob).mock.calls.map((call) => call[0])).toEqual(['backup_part1.zip', 'backup_part2.zip']);
    expect(FakeZip.instances[0].attachmentPaths()).toHaveLength(1);
    expect(FakeZip.instances[1].attachmentPaths()).toEqual(['records.csv', 'records.json']);
    expect(result.summary?.counts.ZIP).toBe(2);
  });

  it('shows the attachment that cannot be stored in the manifest, the errors file and the warning', async () => {
    mockRecords([record(1, 1000), record(2, 1000, 30000)]);
    const result = await runRecordBackupStandalone(backupOptions, status);
    const manifest = FakeZip.instances.at(-1)!.json('manifest.json');
    expect(manifest.unsavedAttachments).toEqual([expect.objectContaining({ recordId: '2', fileName: 'file2_1.bin' })]);
    expect(manifest.attachmentSummary).toMatchObject({ savedCount: 2, unsavedCount: 1 });
    expect(manifest.notes.some((note: string) => note.includes('ZIP の上限のため保存できなかった添付 1件'))).toBe(true);
    expect(FakeZip.instances.some((zip) => zip.files.has('download_errors.txt'))).toBe(true);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('ZIPの上限で保存できなかった添付 1'), 'warn');
    expect(result.warning).toContain('manifest.json');
  });

  it('says the saved attachment ZIPs are not a complete backup when the user cancels afterwards', async () => {
    let calls = 0;
    vi.mocked(fetch).mockImplementation((async (url: string) => {
      calls++;
      if (calls === 4) throw new RunCancelledError();
      return { ok: true, status: 200, blob: async () => new Blob([url]) };
    }) as any);
    const error: any = await runRecordBackupStandalone(backupOptions, status).catch((caught) => caught);
    expect(vi.mocked(downloadBlob).mock.calls.map((call) => call[0])).toEqual(['backup_part1.zip']);
    expect(error.message).toContain('保存済みの ZIP（backup_part1.zip）は添付ファイルの一部で、完全なバックアップではありません');
  });

  it('keeps the old wording when nothing was saved before the cancel', async () => {
    vi.mocked(fetch).mockRejectedValue(new RunCancelledError());
    const error: any = await runRecordBackupStandalone(backupOptions, status).catch((caught) => caught);
    expect(error.message).toContain('バックアップの ZIP は保存していません');
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});

describe('several ZIP downloads', () => {
  it('asks the user to compare the number of downloaded ZIPs with the browser download list', () => {
    expect(describeMultipleDownloads(['a.zip'])).toBe('');
    const note = describeMultipleDownloads(['a.zip', 'b.zip']);
    expect(note).toContain('ZIP 2個のダウンロードを依頼しました');
    expect(note).toContain('ダウンロード一覧に 2 個そろっているか');
    expect(note).toContain('a.zip, b.zip');
    expect(describeMultipleDownloads(Array.from({ length: 25 }, (_, i) => `z${i}.zip`))).toContain('…ほか 5個');
  });

  it('adds the note to the final message of a multi-app run', async () => {
    const message = await runRecordAppBatchStandalone('7,8', async (appId) => ({ downloads: [`app${appId}.zip`] }), status);
    expect(message.message).toContain('ZIP 2個のダウンロードを依頼しました');
    expect(message.tone).toBe('ok');
    const single = await runRecordAppBatchStandalone('7', async () => ({ downloads: ['one.zip'] }), status);
    expect(single.message).not.toContain('ダウンロードを依頼しました');
  });
});
