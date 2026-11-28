import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRecordsByQuery } from '../../src/api';

// cursor の GET は、応答が届かなくても kintone 側では読む位置が進んでいることがある。
// 自動で送り直すと次のページが返り、届かなかったページのレコードを黙って取りこぼす。
// そのため cursor の GET は送り直さず、失敗として止めて利用者に取り直してもらう（cursor は片付ける）。
describe('fetchRecordsByQuery（cursor）の失敗', () => {
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
  const httpError = (status: number) => Object.assign(new Error(`HTTP status ${status}`), { status });

  it('応答の届かなかった GET を送り直さず、取りこぼしたまま成功にしない', async () => {
    api
      .mockResolvedValueOnce({ id: 'cur-1' })
      // 1 ページ目: kintone は位置を進めたが、応答が失われた（503）
      .mockRejectedValueOnce(httpError(503))
      // 送り直すと 2 ページ目が返ってしまう
      .mockResolvedValueOnce({ records: makeRecords(501, 10), next: false })
      // 片付け（DELETE）
      .mockResolvedValue({});
    await expect(fetchRecordsByQuery('/k/v1', '7', 'order by 金額 desc')).rejects.toThrow(/503/);
    const gets = api.mock.calls.filter((call) => call[1] === 'GET');
    expect(gets).toHaveLength(1);
    // 途中で止めた cursor は片付ける
    expect(api.mock.calls.some((call) => call[1] === 'DELETE' && call[0] === '/k/v1/records/cursor.json')).toBe(true);
  });
});
