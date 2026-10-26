import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadKintoneFile, uploadKintoneFile } from '../../src/api';

afterEach(() => vi.unstubAllGlobals());

describe('downloadKintoneFile', () => {
  it('fetches the body from the production file endpoint of the guest space', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: any) => new Response(new Blob(['abc'])));
    vi.stubGlobal('fetch', fetchMock);
    const blob = await downloadKintoneFile('7', 'key/1');
    expect(await blob.text()).toBe('abc');
    expect(fetchMock).toHaveBeenCalledWith('/k/guest/7/v1/file.json?fileKey=key%2F1', { method: 'GET', headers: { 'X-Requested-With': 'XMLHttpRequest' }, signal: expect.any(AbortSignal) });
    await downloadKintoneFile('', 'k');
    expect(fetchMock.mock.calls[1][0]).toBe('/k/v1/file.json?fileKey=k');
  });

  it('reports HTTP errors, oversize bodies and network failures in Japanese', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    await expect(downloadKintoneFile('', 'k')).rejects.toThrow('HTTP 404');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['12345']))));
    await expect(downloadKintoneFile('', 'k', { maxBytes: 4 })).rejects.toThrow('大きすぎます');
    await expect(downloadKintoneFile('', 'k')).resolves.toBeInstanceOf(Blob);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await expect(downloadKintoneFile('', 'k')).rejects.toThrow('ファイルを取得できません（offline）');
  });
});

describe('uploadKintoneFile', () => {
  it('posts multipart data with the request token to the normal prefix and returns the fileKey', async () => {
    vi.stubGlobal('kintone', { getRequestToken: () => 'TOKEN' });
    const fetchMock = vi.fn(async (_url: string, _init: any) => new Response(JSON.stringify({ fileKey: 'new-key' })));
    vi.stubGlobal('fetch', fetchMock);
    await expect(uploadKintoneFile('3', new Blob(['body'], { type: 'text/css' }), 'a.css')).resolves.toBe('new-key');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/k/guest/3/v1/file.json');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'X-Requested-With': 'XMLHttpRequest' });
    const form = init.body as FormData;
    expect(form.get('__REQUEST_TOKEN__')).toBe('TOKEN');
    expect((form.get('file') as File).name).toBe('a.css');
  });

  it('fails clearly without a request token, on HTTP errors and on a response without fileKey', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: 'CB_VA01', message: '不正な値' }), { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('kintone', {});
    await expect(uploadKintoneFile('', new Blob(['x']), 'a.js')).rejects.toThrow('リクエストトークン');
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubGlobal('kintone', { getRequestToken: () => 'T' });
    await expect(uploadKintoneFile('', new Blob(['x']), 'a.js')).rejects.toThrow('HTTP 400: CB_VA01 不正な値');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}))));
    await expect(uploadKintoneFile('', new Blob(['x']), 'a.js')).rejects.toThrow('fileKey');
  });
});
