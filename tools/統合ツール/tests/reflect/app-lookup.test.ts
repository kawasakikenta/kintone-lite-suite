'use strict';

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  REFLECT_APP_LOOKUP_FAILURE,
  createReflectAppLookupCache,
  formatReflectAppName,
  isLookupableReflectApp,
  lookupReflectApp,
  type ReflectAppLookupResult
} from '../../src/reflect/appLookup.js';

afterEach(() => { vi.unstubAllGlobals(); });

describe('lookupReflectApp', () => {
  it('本番側の app.json を問い合わせ、アプリ名とコードを返す', async () => {
    const api = vi.fn(async () => ({ appId: '101', name: '営業テンプレート', code: 'sales' }));
    vi.stubGlobal('kintone', { api });
    await expect(lookupReflectApp(' 101 ', '')).resolves.toEqual({ ok: true, appId: '101', name: '営業テンプレート', code: 'sales' });
    expect(api).toHaveBeenCalledWith('/k/v1/app.json', 'GET', { id: '101' });
  });

  it('ゲストスペースのアプリはゲスト用の prefix で問い合わせる', async () => {
    const api = vi.fn(async () => ({ appId: '7', name: 'ゲスト', code: '' }));
    vi.stubGlobal('kintone', { api });
    await lookupReflectApp('7', '5');
    expect(api).toHaveBeenCalledWith('/k/guest/5/v1/app.json', 'GET', { id: '7' });
  });

  it('応答のアプリIDが入力と一致しなければ失敗にする', async () => {
    vi.stubGlobal('kintone', { api: vi.fn(async () => ({ appId: '999', name: '別のアプリ' })) });
    await expect(lookupReflectApp('101', '')).resolves.toEqual({ ok: false, message: REFLECT_APP_LOOKUP_FAILURE });
  });

  it('API の例外は ok:false にして投げない', async () => {
    vi.stubGlobal('kintone', { api: vi.fn(async () => { throw Object.assign(new Error('not found'), { code: 'GAIA_AP01' }); }) });
    await expect(lookupReflectApp('101', '')).resolves.toEqual({ ok: false, message: REFLECT_APP_LOOKUP_FAILURE });
  });

  it('正の整数でない入力は問い合わせない', async () => {
    const api = vi.fn(async () => ({}));
    vi.stubGlobal('kintone', { api });
    for (const [app, guest] of [['', ''], ['0', ''], ['abc', ''], ['12', 'x'], ['-3', '']]) {
      expect((await lookupReflectApp(app, guest)).ok).toBe(false);
    }
    expect(api).not.toHaveBeenCalled();
  });
});

describe('isLookupableReflectApp', () => {
  it('アプリIDは正の整数、ゲストスペースIDは空か正の整数のときだけ true', () => {
    expect(isLookupableReflectApp('101', '')).toBe(true);
    expect(isLookupableReflectApp('101', ' 7 ')).toBe(true);
    expect(isLookupableReflectApp('', '')).toBe(false);
    expect(isLookupableReflectApp('0', '')).toBe(false);
    expect(isLookupableReflectApp('101', '0')).toBe(false);
    expect(isLookupableReflectApp('https://example.cybozu.com/k/101/', '')).toBe(false);
  });
});

describe('createReflectAppLookupCache', () => {
  const ok = (appId: string): ReflectAppLookupResult => ({ ok: true, appId, name: `app ${appId}`, code: '' });

  it('同じ (ゲストスペースID, アプリID) の成功結果は再利用する', async () => {
    const lookup = vi.fn(async (appId: string) => ok(appId));
    const cache = createReflectAppLookupCache(lookup);
    expect(cache.peek('1', '')).toBeUndefined();
    await cache.get('1', '');
    await cache.get(' 1 ', '');
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(cache.peek('1', '')).toMatchObject({ ok: true, name: 'app 1' });
    await cache.get('1', '5');
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('同時に同じ問い合わせをしても 1 回にまとめる', async () => {
    const lookup = vi.fn(async (appId: string) => ok(appId));
    const cache = createReflectAppLookupCache(lookup);
    await Promise.all([cache.get('1', ''), cache.get('1', '')]);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('失敗は保持せず、次の確認でもう一度問い合わせる', async () => {
    const lookup = vi.fn(async (): Promise<ReflectAppLookupResult> => ({ ok: false, message: 'ng' }));
    const cache = createReflectAppLookupCache(lookup);
    await cache.get('1', '');
    await cache.get('1', '');
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(cache.peek('1', '')).toBeUndefined();
  });

  it('問い合わせ関数が例外を投げても ok:false を返す', async () => {
    const cache = createReflectAppLookupCache(async () => { throw new Error('boom'); });
    await expect(cache.get('1', '')).resolves.toEqual({ ok: false, message: REFLECT_APP_LOOKUP_FAILURE });
  });
});

describe('formatReflectAppName', () => {
  it('コードがあれば併記し、名前が空ならアプリIDで代替する', () => {
    expect(formatReflectAppName({ appId: '1', name: '営業', code: 'sales' })).toBe('営業（コード: sales）');
    expect(formatReflectAppName({ appId: '1', name: '営業', code: '' })).toBe('営業');
    expect(formatReflectAppName({ appId: '1', name: '' })).toBe('アプリ #1');
  });
});
