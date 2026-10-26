import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, fetchRecordsByQuery } from '../../src/api';
import { downloadBlob, kusConfirm } from '../../src/utils';
import { loadJSZipLite } from '../../src/jszipLoader';
import { RunCancelledError, isRunCancelledError } from '../../src/runControl';
import { runCsvImportBatchStandalone, runRecordAppBatchStandalone } from '../../src/tabs/record-standalone';
import { runCsvTemplateStandalone, runRecordQualityStandalone } from '../../src/tabs/record-quality-standalone';

vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn(), apiPost: vi.fn(), fetchRecordsByQuery: vi.fn() }));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), kusConfirm: vi.fn(), downloadBlob: vi.fn() }));
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: vi.fn() }));

class FakeZip {
  static files = new Map<string, string>();
  file(name: string, content: string) { FakeZip.files.set(name, content); return this; }
  async generateAsync() { return new Blob(['zip']); }
}
const props = { title: { type: 'SINGLE_LINE_TEXT', label: '件名', required: false } };
const csvRows = (count: number) => ['title', ...Array.from({ length: count }, (_, i) => `T${i + 1}`)].join('\n');
const csvFile = (count: number) => ({ name: 'data.csv', text: async () => csvRows(count) });

beforeEach(() => {
  vi.clearAllMocks();
  FakeZip.files.clear();
  vi.mocked(apiGet).mockReset().mockResolvedValue({ properties: props });
  vi.mocked(apiPost).mockReset().mockResolvedValue({ ids: ['1'], revisions: ['1'] });
  vi.mocked(fetchRecordsByQuery).mockReset().mockResolvedValue({ records: [], mode: 'cursor' });
  vi.mocked(kusConfirm).mockReturnValue(true);
  vi.mocked(loadJSZipLite).mockResolvedValue(FakeZip as any);
});

describe('app batch stops at the first cancel', () => {
  it('does not run later apps and reports processed and unprocessed counts', async () => {
    const visited: string[] = [];
    const status = vi.fn();
    const error: any = await runRecordAppBatchStandalone('463,464,469', async (appId) => {
      visited.push(appId);
      if (appId === '464') throw new RunCancelledError();
    }, status).catch(caught => caught);

    expect(visited).toEqual(['463', '464']);
    expect(error).toBeInstanceOf(Error);
    expect(error.message.split('\n')[0]).toBe('中止しました（1/3 件を処理、残り 2 件は未実行）');
    expect(error.message).toContain('未実行（中止）: App 464, App 469');
    expect(error.message).not.toContain('件が失敗しました');
    // 件数つきの本文をパネルに届けるため、中止の例外そのものとしては扱わない
    expect(isRunCancelledError(error)).toBe(false);
    expect(status).not.toHaveBeenCalledWith(expect.stringContaining('操作が完了しました'));
  });

  it('keeps failures, warnings and declined confirmations collected before the cancel', async () => {
    const error: any = await runRecordAppBatchStandalone('1,2,3,4', async (appId) => {
      if (appId === '1') throw new Error('権限がありません');
      if (appId === '2') return { warning: '一部未取得' };
      if (appId === '3') throw new RunCancelledError();
    }, vi.fn()).catch(caught => caught);

    expect(error.message.split('\n')[0]).toBe('中止しました（2/4 件を処理、残り 2 件は未実行）');
    expect(error.message).toContain('失敗 App 1: 権限がありません');
    expect(error.message).toContain('警告 App 2: 一部未取得');
    expect(error.message).toContain('未実行（中止）: App 3, App 4');
  });
});

describe('CSV import chunking stops between chunks', () => {
  it('reports how many records were written when the second chunk is cancelled', async () => {
    vi.mocked(apiPost).mockResolvedValueOnce({ ids: [], revisions: [] }).mockRejectedValueOnce(new RunCancelledError());
    const error: any = await runCsvImportBatchStandalone({ appIdsText: '7', guestId: '', file: csvFile(250) }, vi.fn()).catch(caught => caught);

    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(error.message.split('\n')[0]).toBe('中止しました（0/1 件を処理、残り 1 件は未実行）');
    expect(error.message).toContain('中止しました（100/250 件を処理、残り 150 件は未実行）');
    expect(error.message).toContain('100件を書き込み済み、残り 150件は書き込んでいません');
    expect(error.message).not.toContain('途中で失敗しました');
  });

  it('does not start the next app after a cancel and counts the finished app as processed', async () => {
    // 1 つ目のアプリ: 100 + 50 件、2 つ目のアプリ: 先頭チャンクのあと中止
    vi.mocked(apiPost)
      .mockResolvedValueOnce({}).mockResolvedValueOnce({})
      .mockResolvedValueOnce({}).mockRejectedValueOnce(new RunCancelledError());
    const error: any = await runCsvImportBatchStandalone({ appIdsText: '7,8,9', guestId: '', file: csvFile(150) }, vi.fn()).catch(caught => caught);

    expect(apiPost).toHaveBeenCalledTimes(4);
    expect(vi.mocked(apiPost).mock.calls.map(call => (call[2] as any).app)).toEqual(['7', '7', '8', '8']);
    expect(error.message.split('\n')[0]).toBe('中止しました（1/3 件を処理、残り 2 件は未実行）');
    expect(error.message).toContain('App 8: 中止しました（100/150 件を処理、残り 50 件は未実行）');
    expect(error.message).toContain('未実行（中止）: App 8, App 9');
  });
});

describe('record quality stops at the first cancel', () => {
  const options = { appIdsText: '7,8,9', guestId: '', codes: ['title'], query: '', trimText: false, ignoreCase: false };

  it('returns inspected results and marks the rest as not run instead of failed', async () => {
    vi.mocked(fetchRecordsByQuery).mockResolvedValueOnce({ records: [], mode: 'cursor' }).mockRejectedValueOnce(new RunCancelledError());
    const status = vi.fn();
    const results = await runRecordQualityStandalone(options, status);

    expect(fetchRecordsByQuery).toHaveBeenCalledTimes(2);
    expect(results.map(result => result.appId)).toEqual(['7', '8', '9']);
    expect(results[0].report?.total).toBe(0);
    expect(results.slice(1).map(result => result.error)).toEqual(['未実行（中止）', '未実行（中止）']);
    expect(results.slice(1).every(result => !result.report)).toBe(true);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('中止しました（1/3 件を処理、残り 2 件は未実行）'), true);
  });

  it('saves only the templates built before the cancel and lists the rest', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce({ properties: props }).mockRejectedValueOnce(new RunCancelledError());
    const result = await runCsvTemplateStandalone({ appIdsText: '7,8,9', guestId: '' }, vi.fn());

    expect(apiGet).toHaveBeenCalledTimes(2);
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(result.warning?.split('\n')[0]).toBe('中止しました（1/3 件を処理、残り 2 件は未実行）');
    expect(result.warning).toContain('未実行（中止）: App 8, App 9');
    const manifest = JSON.parse(FakeZip.files.get('manifest.json') as string);
    expect(manifest.templates.map((item: any) => item.appId)).toEqual(['7']);
    expect(manifest.cancelled).toBe(true);
    expect(manifest.notExecuted).toEqual(['App 8: 未実行（中止）', 'App 9: 未実行（中止）']);
  });

  it('saves nothing when the first template is cancelled', async () => {
    vi.mocked(apiGet).mockRejectedValueOnce(new RunCancelledError());
    const error: any = await runCsvTemplateStandalone({ appIdsText: '7,8', guestId: '' }, vi.fn()).catch(caught => caught);
    expect(error.message.split('\n')[0]).toBe('中止しました（0/2 件を処理、残り 2 件は未実行）');
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});
