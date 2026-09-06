import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runBatchProcessStandalone } from '../../src/tabs/record-standalone';

describe('record status updates preserve the reviewed revisions', () => {
  const api = vi.fn();
  const confirm = vi.fn();
  const status = vi.fn();
  const options = { appId: '7', guestId: '3', query: '', action: '承認する', assignee: 'reviewer' };
  const makeRecords = (count: number): any[] => Array.from({ length: count }, (_, index) => ({
    $id: { type: '__ID__', value: String(index + 1) },
    $revision: { type: '__REVISION__', value: String(index + 2) }
  }));
  const writes = () => api.mock.calls.filter((call) => call[1] === 'PUT');

  beforeEach(() => {
    api.mockReset();
    confirm.mockReset().mockReturnValue(true);
    status.mockReset();
    vi.stubGlobal('kintone', { api });
    vi.stubGlobal('window', { confirm });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches IDs and revisions together and keeps each revision through 100-record chunks', async () => {
    const records = makeRecords(201);
    records[0].$revision.value = 0;
    api.mockResolvedValueOnce({ records }).mockResolvedValue({});

    await runBatchProcessStandalone(options, status);

    expect(api.mock.calls[0]).toEqual(['/k/guest/3/v1/records.json', 'GET', {
      app: '7', query: '$id > 0 order by $id asc limit 500', fields: ['$id', '$revision']
    }]);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('201件'));
    expect(writes().map((call) => call[2].records.length)).toEqual([100, 100, 1]);
    expect(writes().flatMap((call) => call[2].records)).toEqual(records.map((record) => ({
      id: Number(record.$id.value), revision: String(record.$revision.value), action: '承認する', assignee: 'reviewer'
    })));
    expect(writes().every((call) => call[0] === '/k/guest/3/v1/records/status.json')).toBe(true);
    expect(status).toHaveBeenLastCalledWith('ステータス一括更新完了 (201件)');
  });

  it('also retains revisions for ordered queries fetched through the cursor API', async () => {
    const records = makeRecords(2).reverse();
    api.mockResolvedValueOnce({ id: 'cursor-1' })
      .mockResolvedValueOnce({ records, next: false })
      .mockResolvedValue({});

    await runBatchProcessStandalone({ ...options, query: 'order by 金額 desc', assignee: '' }, status);

    expect(api.mock.calls[0]).toEqual(['/k/guest/3/v1/records/cursor.json', 'POST', {
      app: '7', query: 'order by 金額 desc', size: 500, fields: ['$id', '$revision']
    }]);
    expect(writes()[0][2].records).toEqual([
      { id: 2, revision: '3', action: '承認する' },
      { id: 1, revision: '2', action: '承認する' }
    ]);
  });

  it.each([undefined, null, '', '-1', -1, '1.5', 'unknown', [], {}])(
    'stops before confirmation or any write when a later record has invalid revision %j',
    async (revision) => {
      const records = makeRecords(102);
      records[100].$revision.value = revision;
      api.mockResolvedValueOnce({ records });

      await expect(runBatchProcessStandalone(options, status)).rejects.toThrow(/レコード 101 の revision を確認できない/);

      expect(confirm).not.toHaveBeenCalled();
      expect(writes()).toHaveLength(0);
    }
  );

  it('does not silently omit a record with a missing ID', async () => {
    const records = makeRecords(2);
    delete records[0].$id;
    api.mockResolvedValueOnce({ records });

    await expect(runBatchProcessStandalone(options, status)).rejects.toThrow(/対象レコードのIDを確認できない/);
    expect(confirm).not.toHaveBeenCalled();
    expect(writes()).toHaveLength(0);
  });

  it('keeps the successful count and stops subsequent chunks when a reviewed revision conflicts', async () => {
    api.mockResolvedValueOnce({ records: makeRecords(201) })
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ code: 'GAIA_CO02', message: '指定したリビジョンは最新ではありません。' });

    const error = await runBatchProcessStandalone(options, status).catch((caught) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('確定済み: 100件 / 失敗チャンク: 101～200件目 / 未処理: 101件');
    expect(error.message).toContain('取得後に別の更新が入ったため中止しました（revision 競合）');
    expect(error.message).toContain('対象レコードを取得し直し、条件と内容を確認');
    expect(error.partial).toEqual({ done: 100, from: 101, to: 200, total: 201 });
    expect(error.original.revisionConflict).toBe(true);
    expect(error.original.code).toBe('GAIA_CO02');
    expect(writes()).toHaveLength(2);
    expect(writes()[1][2].records[0]).toEqual({ id: 101, revision: '102', action: '承認する', assignee: 'reviewer' });
    expect(status).not.toHaveBeenCalledWith(expect.stringContaining('ステータス一括更新完了'));
  });

  it('keeps non-conflict failures separate from revision conflicts', async () => {
    api.mockResolvedValueOnce({ records: makeRecords(1) })
      .mockRejectedValueOnce({ code: 'GAIA_NO01', message: '権限がありません。' });

    const error = await runBatchProcessStandalone(options, status).catch((caught) => caught);

    expect(error.message).toContain('権限がありません');
    expect(error.message).not.toContain('revision 競合');
    expect(writes()).toHaveLength(1);
  });

  it('does not write when the user cancels after fetching the records', async () => {
    api.mockResolvedValueOnce({ records: makeRecords(1) });
    confirm.mockReturnValue(false);

    await runBatchProcessStandalone(options, status);

    expect(writes()).toHaveLength(0);
    expect(status).toHaveBeenLastCalledWith('ステータス一括更新をキャンセルしました');
  });
});
