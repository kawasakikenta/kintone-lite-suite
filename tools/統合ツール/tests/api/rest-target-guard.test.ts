import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiDelete, apiPost, apiPut, assertAllowsMutatingRestCall, buildApiPrefix, downloadKintoneFile, uploadKintoneFile } from '../../src/api';
import { resolveCustomizeFiles } from '../../src/reflect/customizeFiles';

// ゲストスペースIDは URL のパスにそのまま入る。設定JSONなど読み込んだファイルの guestId に `/`・`..`・`?`・`#` があると、
// プレビュー用のつもりの URL が本番やデプロイの API を指してしまい、書き込みガード（prefix に /v1/preview を含むか）もすり抜けていた。

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const crafted = [
  '1/v1/app/form/fields.json#',
  '1/v1/preview/app/deploy.json?',
  '../../k/v1/records.json?app=5&x=',
  '1/../2',
  '1%2F..',
  '-1',
  'abc',
  '1 2'
];

describe('buildApiPrefix', () => {
  it('keeps the normal and guest-space prefixes', () => {
    expect(buildApiPrefix('', false)).toBe('/k/v1');
    expect(buildApiPrefix(null, true)).toBe('/k/v1/preview');
    expect(buildApiPrefix(' 7 ', true)).toBe('/k/guest/7/v1/preview');
    expect(buildApiPrefix(12, false)).toBe('/k/guest/12/v1');
  });

  it('rejects guest-space IDs that are not positive integers instead of putting them in the URL', () => {
    for (const guestId of crafted) {
      expect(() => buildApiPrefix(guestId, true), guestId).toThrow(/ゲストスペースID/);
      expect(() => buildApiPrefix(guestId, false), guestId).toThrow(/ゲストスペースID/);
    }
  });
});

describe('assertAllowsMutatingRestCall の URL の形', () => {
  it('rejects a prefix that only contains /v1/preview but resolves to another endpoint', () => {
    for (const prefix of [
      '/k/guest/1/v1/app/form/fields.json#/v1/preview',
      '/k/guest/1/v1/preview/app/deploy.json?/v1/preview',
      '/k/guest/../../k/v1/x/v1/preview',
      '/k/v1/preview/..',
      'https://example.com/k/v1/preview',
      '//example.com/k/v1/preview'
    ]) {
      expect(() => assertAllowsMutatingRestCall(prefix, '/app/form/fields.json', 'PUT'), prefix).toThrow(/書き込み先/);
    }
  });

  it('rejects paths with query, fragment or dot segments on the preview prefix', () => {
    for (const path of ['/app/form/fields.json?x=1', '/app/form/fields.json#x', '/app/../app/form/fields.json', '/app/./form/fields.json', '/app/form/fields', 'app/form/fields.json', '/app/form/fields.json/']) {
      expect(() => assertAllowsMutatingRestCall('/k/v1/preview', path, 'PUT'), path).toThrow(/書き込み先/);
    }
  });

  it('still allows the endpoints the tools write to', () => {
    for (const path of ['/app/form/fields.json', '/app/form/layout.json', '/app/views.json', '/app/notifications/perRecord.json', '/field/acl.json', '/record/acl.json', '/app/plugins.json', '/app/customize.json']) {
      expect(() => assertAllowsMutatingRestCall('/k/v1/preview', path, 'PUT'), path).not.toThrow();
      expect(() => assertAllowsMutatingRestCall('/k/guest/3/v1/preview', path, 'POST'), path).not.toThrow();
    }
    expect(() => assertAllowsMutatingRestCall('/k/v1', '/records.json', 'POST')).not.toThrow();
    expect(() => assertAllowsMutatingRestCall('/k/guest/3/v1', '/records/status.json', 'PUT')).not.toThrow();
    expect(() => assertAllowsMutatingRestCall('/k/v1', '/records/cursor.json', 'DELETE')).not.toThrow();
    expect(() => assertAllowsMutatingRestCall('/k/v1', '/file.json', 'POST')).not.toThrow();
  });

  it('does not send a crafted preview write to kintone.api', async () => {
    const api = vi.fn(async () => ({ revision: '2' }));
    vi.stubGlobal('kintone', { api });
    await expect(apiPut('/k/guest/1/v1/app/form/fields.json#/v1/preview', '/app/form/fields.json', { app: '1', properties: {} })).rejects.toThrow(/書き込み先/);
    await expect(apiPost('/k/guest/1/v1/preview/app/deploy.json?/v1/preview', '/app/customize.json', { app: '1' })).rejects.toThrow(/書き込み先/);
    await expect(apiDelete('/k/v1/preview/..', '/records/cursor.json', { id: 'x' })).rejects.toThrow();
    expect(api).not.toHaveBeenCalled();
  });
});

describe('guest-space IDs from loaded files', () => {
  it('does not fetch or upload through a crafted guest-space ID', async () => {
    const fetchMock = vi.fn(async () => new Response(new Blob(['{"records":[]}'])));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('kintone', { getRequestToken: () => 'T', api: vi.fn() });
    await expect(downloadKintoneFile('../../k/v1/records.json?app=5&x=', 'key')).rejects.toThrow(/ゲストスペースID/);
    await expect(uploadKintoneFile('1/v1/preview/app/deploy.json?', new Blob(['x']), 'a.js')).rejects.toThrow(/ゲストスペースID/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a settings JSON with a crafted guestId cannot make reflect download another endpoint as a JS file', async () => {
    const fetchMock = vi.fn(async () => new Response(new Blob(['{"records":[{"secret":{"value":"x"}}]}'])));
    vi.stubGlobal('fetch', fetchMock);
    const file = (key: string, name: string) => ({ type: 'FILE', file: { fileKey: key, name, contentType: 'text/javascript', size: '10' } });
    const section = (js: any[]) => ({ revision: '5', scope: 'ALL', desktop: { js, css: [] }, mobile: { js: [], css: [] } });
    const resolution = await resolveCustomizeFiles(section([file('src', 'a.js')]), section([]), { sourceGuestId: '../../k/v1/records.json?app=5&x=', targetGuestId: '' });
    expect(resolution.files['desktop/js/src']).toMatchObject({ status: 'unavailable' });
    expect(resolution.blobs.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

