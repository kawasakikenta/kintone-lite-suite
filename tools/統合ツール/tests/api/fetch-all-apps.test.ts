import { afterEach, describe, expect, it, vi } from 'vitest';
import { APPS_PAGE_LIMIT, fetchAllApps } from '../../src/api';
import { __resetRunControlForTests, beginRun, requestCancel } from '../../src/runControl';

afterEach(() => {
  __resetRunControlForTests();
  vi.unstubAllGlobals();
});

const page = (from: number, count: number) => Array.from({ length: count }, (_, i) => ({ appId: String(from + i), name: `アプリ ${from + i}` }));

describe('fetchAllApps', () => {
  it('pages through /apps.json until a short page and returns every app in ID order', async () => {
    const api = vi.fn()
      .mockResolvedValueOnce({ apps: page(101, APPS_PAGE_LIMIT) })
      .mockResolvedValueOnce({ apps: [...page(1, 30), { appId: '150', name: '重複' }] });
    vi.stubGlobal('kintone', { api });
    const progress = vi.fn();
    const apps = await fetchAllApps('', progress);
    expect(api.mock.calls.map(call => [call[0], call[2]])).toEqual([
      ['/k/v1/apps.json', { limit: 100, offset: 0 }],
      ['/k/v1/apps.json', { limit: 100, offset: 100 }]
    ]);
    expect(apps).toHaveLength(130);
    expect(apps[0].appId).toBe('1');
    expect(apps.at(-1).appId).toBe('200');
    expect(apps.find(app => app.appId === '150').name).toBe('アプリ 150');
    expect(progress.mock.calls.map(call => call[0])).toEqual([100, 130]);
  });

  it('uses the guest space path and sorts 64-bit IDs without rounding', async () => {
    const api = vi.fn().mockResolvedValueOnce({ apps: [{ appId: '9223372036854775807' }, { appId: '9223372036854775806' }, { appId: 'x' }] });
    vi.stubGlobal('kintone', { api });
    const apps = await fetchAllApps('7');
    expect(api).toHaveBeenCalledWith('/k/guest/7/v1/apps.json', 'GET', { limit: 100, offset: 0 });
    expect(apps.map(app => app.appId)).toEqual(['9223372036854775806', '9223372036854775807']);
  });

  it('stops on a malformed response instead of returning a partial list as complete', async () => {
    vi.stubGlobal('kintone', { api: vi.fn().mockResolvedValueOnce({ apps: page(1, APPS_PAGE_LIMIT) }).mockResolvedValueOnce({}) });
    await expect(fetchAllApps()).rejects.toThrow(/アプリ一覧の応答が不正/);
  });

  it('does not request the next page after the run is cancelled', async () => {
    beginRun();
    const api = vi.fn().mockImplementationOnce(async () => { requestCancel(); return { apps: page(1, APPS_PAGE_LIMIT) }; });
    vi.stubGlobal('kintone', { api });
    await expect(fetchAllApps()).rejects.toMatchObject({ name: 'RunCancelledError' });
    expect(api).toHaveBeenCalledTimes(1);
  });
});
