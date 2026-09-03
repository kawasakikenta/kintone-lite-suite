import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertAllowsMutatingRestCall,
  decorateRevisionConflict,
  fetchRecordsByQuery,
  isRevisionConflictError,
  pickRevision
} from '../../src/api';

// 本番 API への書き込みガードと、10,000 件超のレコード取得（$id シーク / cursor API）。
// ガードを緩めすぎると本番設定を書き換えてしまい、厳しすぎると cursor が作れない。

describe('assertAllowsMutatingRestCall', () => {
  it('allows the read-only cursor handle on the production prefix', () => {
    expect(() => assertAllowsMutatingRestCall('/k/v1', '/records/cursor.json', 'POST')).not.toThrow();
    expect(() => assertAllowsMutatingRestCall('/k/guest/3/v1', '/records/cursor.json', 'DELETE')).not.toThrow();
  });

  it('still rejects cursor calls on the preview prefix and app settings on production', () => {
    expect(() => assertAllowsMutatingRestCall('/k/v1/preview', '/records/cursor.json', 'POST')).toThrow(/プレビュー/);
    expect(() => assertAllowsMutatingRestCall('/k/v1', '/app/form/fields.json', 'PUT')).toThrow(/本番API/);
    expect(() => assertAllowsMutatingRestCall('/k/v1/preview', '/app/deploy.json', 'POST')).toThrow(/デプロイ/);
    expect(() => assertAllowsMutatingRestCall('/k/v1', '/records.json', 'POST')).not.toThrow();
  });
});

describe('revision conflict helpers', () => {
  it('detects kintone GAIA_CO02 by code or message', () => {
    expect(isRevisionConflictError({ code: 'GAIA_CO02', message: 'x' })).toBe(true);
    expect(isRevisionConflictError(new Error('指定したリビジョンは最新ではありません [GAIA_CO02]'))).toBe(true);
    expect(isRevisionConflictError(new Error('権限がありません'))).toBe(false);
    expect(isRevisionConflictError(null)).toBe(false);
  });

  it('wraps conflicts with guidance and passes other errors through', () => {
    const other = new Error('boom');
    expect(decorateRevisionConflict(other, 'X')).toBe(other);
    const wrapped = decorateRevisionConflict({ code: 'GAIA_CO02', message: 'stale' }, 'フィールド追加');
    expect(wrapped.message).toMatch(/フィールド追加は取得後に別の更新が入ったため中止/);
    expect(wrapped.message).toContain('stale');
    expect(wrapped.revisionConflict).toBe(true);
  });

  it('picks revision as a string', () => {
    expect(pickRevision({ revision: 12 })).toBe('12');
    expect(pickRevision({ revision: '' })).toBe('');
    expect(pickRevision(null)).toBe('');
  });
});

describe('fetchRecordsByQuery', () => {
  const api = vi.fn();
  beforeEach(() => {
    api.mockReset();
    (globalThis as any).kintone = { api };
  });
  afterEach(() => {
    delete (globalThis as any).kintone;
  });

  const makeRecords = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => ({ $id: { type: '__ID__', value: String(from + i) } }));

  it('seeks by $id when the query has no order by', async () => {
    api
      .mockResolvedValueOnce({ records: makeRecords(1, 500) })
      .mockResolvedValueOnce({ records: makeRecords(501, 200) });
    const progress: Array<[number, string]> = [];
    const result = await fetchRecordsByQuery('/k/v1', '7', 'status = "a"', { onProgress: (n, mode) => progress.push([n, mode]) });
    expect(result.mode).toBe('keyset');
    expect(result.records).toHaveLength(700);
    expect(api.mock.calls[0]).toEqual(['/k/v1/records.json', 'GET', { app: '7', query: '(status = "a") and $id > 0 order by $id asc limit 500' }]);
    expect(api.mock.calls[1][2].query).toBe('(status = "a") and $id > 500 order by $id asc limit 500');
    expect(progress).toEqual([[500, 'keyset'], [700, 'keyset']]);
  });

  it('adds $id to explicit field lists so seeking can continue', async () => {
    api.mockResolvedValueOnce({ records: makeRecords(1, 3) });
    await fetchRecordsByQuery('/k/v1', '7', '', { fields: ['title'] });
    expect(api.mock.calls[0][2]).toEqual({ app: '7', query: '$id > 0 order by $id asc limit 500', fields: ['title', '$id'] });
  });

  it('uses the cursor API when the user supplies an order by', async () => {
    api
      .mockResolvedValueOnce({ id: 'cur-1' })
      .mockResolvedValueOnce({ records: makeRecords(1, 500), next: true })
      .mockResolvedValueOnce({ records: makeRecords(501, 10), next: false });
    const result = await fetchRecordsByQuery('/k/v1', '7', 'order by 金額 desc', { fields: ['金額'] });
    expect(result.mode).toBe('cursor');
    expect(result.records).toHaveLength(510);
    expect(api.mock.calls[0]).toEqual(['/k/v1/records/cursor.json', 'POST', { app: '7', query: 'order by 金額 desc', size: 500, fields: ['金額'] }]);
    expect(api.mock.calls[1]).toEqual(['/k/v1/records/cursor.json', 'GET', { id: 'cur-1' }]);
    // 読み切った cursor は kintone 側で消えるので DELETE しない
    expect(api.mock.calls.some((c) => c[1] === 'DELETE')).toBe(false);
  });

  it('does not mistake clause-like text values for order or paging syntax', async () => {
    api.mockResolvedValueOnce({ records: makeRecords(1, 1) });
    const query = 'memo like "order by amount, limit 10"';
    const result = await fetchRecordsByQuery('/k/v1', '7', query);
    expect(result.mode).toBe('keyset');
    expect(api.mock.calls[0][2].query).toBe(`(${query}) and $id > 0 order by $id asc limit 500`);
  });

  it('deletes the cursor when reading fails midway', async () => {
    api
      .mockResolvedValueOnce({ id: 'cur-2' })
      .mockRejectedValueOnce(new Error('HTTP 500 boom'))
      .mockRejectedValueOnce(new Error('HTTP 500 boom'))
      .mockRejectedValueOnce(new Error('HTTP 500 boom'))
      .mockResolvedValueOnce({});
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: any) => { fn(); return 0 as any; }) as any);
    await expect(fetchRecordsByQuery('/k/v1', '7', 'order by 金額 desc')).rejects.toThrow(/boom/);
    const del = api.mock.calls.find((c) => c[1] === 'DELETE');
    expect(del).toEqual(['/k/v1/records/cursor.json', 'DELETE', { id: 'cur-2' }]);
    vi.restoreAllMocks();
  });

  it('rejects limit/offset in the user query before calling the API', async () => {
    await expect(fetchRecordsByQuery('/k/v1', '7', 'limit 10')).rejects.toThrow(/limit\/offset/);
    expect(api).not.toHaveBeenCalled();
  });
});
