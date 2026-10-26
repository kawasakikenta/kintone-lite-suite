import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  API_GET_TIMEOUT_MS,
  FILE_DOWNLOAD_TIMEOUT_MS,
  FILE_TEXT_FETCH_TIMEOUT_MS,
  apiGet,
  apiPut,
  downloadKintoneFile,
  fetchBundle,
  fetchRecordsByQuery,
  fetchTextFileBody,
  getApiGetMetrics,
  resetApiGetMetrics,
  uploadKintoneFile
} from '../../src/api';
import {
  RunCancelledError,
  __resetRunControlForTests,
  beginRun,
  isRunCancelledError,
  requestCancel
} from '../../src/runControl';

afterEach(() => {
  __resetRunControlForTests();
  resetApiGetMetrics();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const httpError = (status: number) => Object.assign(new Error(`HTTP status ${status}`), { status });
const never = () => new Promise<never>(() => {});

/** signal の abort で reject する fetch のモック（reason をそのまま返す）。 */
function abortableFetch() {
  return vi.fn((_url: string, init: any) => new Promise<Response>((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
  }));
}

describe('apiGet と中止', () => {
  it('中止要求後は kintone.api を呼ぶ前に RunCancelledError を投げる', async () => {
    const api = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('kintone', { api });
    beginRun();
    expect(requestCancel()).toBe(true);
    const error: any = await apiGet('/k/v1', '/records.json', {}).catch((e) => e);
    expect(error).toBeInstanceOf(RunCancelledError);
    expect(isRunCancelledError(error)).toBe(true);
    expect(api).not.toHaveBeenCalled();
    expect(getApiGetMetrics().failures).toBe(0);
  });

  it('処理が無い（beginRun していない）ときは従来どおり動く', async () => {
    const api = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('kintone', { api });
    await expect(apiGet('/k/v1', '/records.json', {})).resolves.toEqual({ ok: true });
  });

  it('応答が返らない読み取りは中止要求で即座に打ち切られ、再試行も失敗集計もしない', async () => {
    const api = vi.fn(() => never());
    vi.stubGlobal('kintone', { api });
    beginRun();
    const pending = apiGet('/k/v1', '/records.json', {});
    const assertion = expect(pending).rejects.toBeInstanceOf(RunCancelledError);
    await Promise.resolve();
    requestCancel();
    await assertion;
    expect(api).toHaveBeenCalledTimes(1);
    expect(getApiGetMetrics().failures).toBe(0);
    expect(getApiGetMetrics().retries).toBe(0);
  });

  it('API_GET_TIMEOUT_MS を超えた読み取りは TIMEOUT として再試行される', async () => {
    vi.useFakeTimers();
    const api = vi.fn()
      .mockImplementationOnce(() => never())
      .mockImplementationOnce(async () => ({ ok: 'second' }));
    vi.stubGlobal('kintone', { api });
    const pending = apiGet('/k/v1', '/records.json', {}, { retries: 2, baseDelayMs: 1, maxDelayMs: 1 });
    await vi.advanceTimersByTimeAsync(API_GET_TIMEOUT_MS);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toEqual({ ok: 'second' });
    expect(api).toHaveBeenCalledTimes(2);
    expect(getApiGetMetrics().retries).toBe(1);
  });

  it('すべての試行がタイムアウトしたら TIMEOUT コード付きで失敗する', async () => {
    vi.useFakeTimers();
    const api = vi.fn(() => never());
    vi.stubGlobal('kintone', { api });
    const pending = apiGet('/k/v1', '/records.json', {}, { retries: 2, baseDelayMs: 1, maxDelayMs: 1 });
    const assertion = expect(pending).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(API_GET_TIMEOUT_MS * 2 + 1000);
    await assertion;
    expect(api).toHaveBeenCalledTimes(2);
    expect(getApiGetMetrics().failures).toBe(1);
  });

  it('再試行の待機中に中止すると待たずに終了する', async () => {
    vi.useFakeTimers();
    const api = vi.fn(async () => { throw httpError(503); });
    vi.stubGlobal('kintone', { api });
    beginRun();
    const pending = apiGet('/k/v1', '/records.json', {}, { retries: 3, baseDelayMs: 60_000, maxDelayMs: 60_000 });
    const assertion = expect(pending).rejects.toBeInstanceOf(RunCancelledError);
    await vi.advanceTimersByTimeAsync(10);
    expect(api).toHaveBeenCalledTimes(1);
    requestCancel();
    await assertion;
    // 待機時間（60 秒）を進めていないのに終了している
    expect(api).toHaveBeenCalledTimes(1);
    expect(getApiGetMetrics().failures).toBe(0);
  });
});

describe('書き込みと中止', () => {
  it('進行中の PUT は中止で打ち切らず、次の試行の前で止める', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    const api = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementation(async () => ({ revision: '2' }));
    vi.stubGlobal('kintone', { api });
    beginRun();
    const first = apiPut('/k/v1/preview', '/app/settings.json', { app: 1 });
    await Promise.resolve();
    requestCancel();
    resolveFirst({ revision: '1' });
    await expect(first).resolves.toEqual({ revision: '1' });
    const second: any = await apiPut('/k/v1/preview', '/app/settings.json', { app: 1 }).catch((e) => e);
    expect(second).toBeInstanceOf(RunCancelledError);
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('PUT の再試行待機中に中止すると次の試行を送らない', async () => {
    vi.useFakeTimers();
    const api = vi.fn(async () => { throw httpError(503); });
    vi.stubGlobal('kintone', { api });
    beginRun();
    const pending = apiPut('/k/v1/preview', '/app/settings.json', { app: 1 });
    const assertion = expect(pending).rejects.toBeInstanceOf(RunCancelledError);
    await vi.advanceTimersByTimeAsync(10);
    expect(api).toHaveBeenCalledTimes(1);
    requestCancel();
    await assertion;
    expect(api).toHaveBeenCalledTimes(1);
  });
});

describe('一括取得と中止', () => {
  it('fetchBundle は中止を _fetchError に格納せず例外として伝える', async () => {
    const api = vi.fn(() => never());
    vi.stubGlobal('kintone', { api });
    beginRun();
    const pending = fetchBundle({ appId: '1', preview: true, sections: ['appSettings', 'fieldSettings'] });
    const assertion = expect(pending).rejects.toBeInstanceOf(RunCancelledError);
    await Promise.resolve();
    requestCancel();
    await assertion;
  });

  it('fetchBundle は一般の取得失敗を従来どおり _fetchError に格納する', async () => {
    const api = vi.fn(async () => { throw new Error('権限がありません'); });
    vi.stubGlobal('kintone', { api });
    beginRun();
    const bundle = await fetchBundle({ appId: '1', preview: true, sections: ['appSettings'] });
    expect(bundle.sections.appSettings._fetchError).toContain('権限がありません');
  });

  it('cursor 取得の途中で中止しても cursor は削除され、中止が伝わる', async () => {
    const calls: string[] = [];
    const api = vi.fn((path: string, method: string) => {
      calls.push(`${method} ${path}`);
      if (method === 'POST') return Promise.resolve({ id: 'c1' });
      if (method === 'DELETE') return Promise.resolve({});
      return never();
    });
    vi.stubGlobal('kintone', { api });
    beginRun();
    const pending = fetchRecordsByQuery('/k/v1', 1, 'order by $id desc');
    const assertion = expect(pending).rejects.toBeInstanceOf(RunCancelledError);
    await vi.waitFor(() => expect(calls).toContain('GET /k/v1/records/cursor.json'));
    requestCancel();
    await assertion;
    expect(calls).toContain('DELETE /k/v1/records/cursor.json');
  });
});

describe('ファイル取得と中止', () => {
  it('fetchTextFileBody は signal を fetch に渡す', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: any) => new Response(new Blob(['abc'])));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchTextFileBody('/k/v1', 'k')).resolves.toMatchObject({ ok: true, text: 'abc' });
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('fetchTextFileBody は 60 秒で打ち切り、日本語のタイムアウト詳細を返す', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', abortableFetch());
    const pending = fetchTextFileBody('/k/v1', 'k');
    await vi.advanceTimersByTimeAsync(FILE_TEXT_FETCH_TIMEOUT_MS);
    await expect(pending).resolves.toEqual({
      ok: false,
      reason: 'error',
      detail: '応答待ちが 60 秒を超えました（timeout）'
    });
  });

  it('fetchTextFileBody は中止を取得失敗にせず RunCancelledError を投げる', async () => {
    vi.stubGlobal('fetch', abortableFetch());
    beginRun();
    const pending = fetchTextFileBody('/k/v1', 'k');
    const assertion = expect(pending).rejects.toBeInstanceOf(RunCancelledError);
    requestCancel();
    await assertion;
  });

  it('downloadKintoneFile は signal を渡し、120 秒のタイムアウトを日本語で報告する', async () => {
    const ok = vi.fn(async (_url: string, _init: any) => new Response(new Blob(['abc'])));
    vi.stubGlobal('fetch', ok);
    await expect(downloadKintoneFile('', 'k')).resolves.toBeInstanceOf(Blob);
    expect(ok.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);

    vi.useFakeTimers();
    vi.stubGlobal('fetch', abortableFetch());
    const pending = downloadKintoneFile('', 'k');
    const assertion = expect(pending).rejects.toThrow('ファイルを取得できません（応答待ちが 120 秒を超えました）');
    await vi.advanceTimersByTimeAsync(FILE_DOWNLOAD_TIMEOUT_MS);
    await assertion;
  });

  it('downloadKintoneFile は fetch 中の中止で RunCancelledError を投げる', async () => {
    vi.stubGlobal('fetch', abortableFetch());
    beginRun();
    const pending = downloadKintoneFile('', 'k');
    const assertion = expect(pending).rejects.toBeInstanceOf(RunCancelledError);
    requestCancel();
    await assertion;
  });

  it('downloadKintoneFile は本文の読み取り中（resp.blob()）の中止でも RunCancelledError を投げる', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: any) => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      blob: () => new Promise<Blob>((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
      })
    })));
    beginRun();
    const pending = downloadKintoneFile('', 'k');
    const assertion = expect(pending).rejects.toBeInstanceOf(RunCancelledError);
    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    await Promise.resolve();
    requestCancel();
    await assertion;
  });

  it('uploadKintoneFile は signal を渡し、中止で RunCancelledError を投げる', async () => {
    vi.stubGlobal('kintone', { getRequestToken: () => 'T' });
    const ok = vi.fn(async (_url: string, _init: any) => new Response(JSON.stringify({ fileKey: 'k1' })));
    vi.stubGlobal('fetch', ok);
    await expect(uploadKintoneFile('', new Blob(['x']), 'a.js')).resolves.toBe('k1');
    expect(ok.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);

    vi.stubGlobal('fetch', abortableFetch());
    beginRun();
    const pending = uploadKintoneFile('', new Blob(['x']), 'a.js');
    const assertion = expect(pending).rejects.toBeInstanceOf(RunCancelledError);
    requestCancel();
    await assertion;
  });
});
