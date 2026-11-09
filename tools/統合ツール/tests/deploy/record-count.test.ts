'use strict';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeRecordCount } from '../../src/deploy/display';
import { fetchRecordCountStandalone } from '../../src/tabs/deploy-record-count';

afterEach(() => { vi.unstubAllGlobals(); });

describe('fetchRecordCountStandalone', () => {
  it('レコード API の GET（totalCount・limit 1・$id だけ）で件数を読み取り、書き込まない', async () => {
    const api = vi.fn(async () => ({ records: [{ $id: { type: '__ID__', value: '1' } }], totalCount: '12345' }));
    vi.stubGlobal('kintone', { api });
    await expect(fetchRecordCountStandalone({ appId: '5' })).resolves.toEqual({ ok: true, count: 12345 });
    expect(api).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledWith('/k/v1/records.json', 'GET', { app: '5', query: 'limit 1', fields: ['$id'], totalCount: true });
  });

  it('ゲストスペースのアプリは、ゲストスペースの URL で読み取る。レコードが 0 件でも 0 件と返す', async () => {
    const api = vi.fn(async () => ({ records: [], totalCount: '0' }));
    vi.stubGlobal('kintone', { api });
    await expect(fetchRecordCountStandalone({ appId: '7', guestId: '3' })).resolves.toEqual({ ok: true, count: 0 });
    expect(api).toHaveBeenCalledWith('/k/guest/3/v1/records.json', 'GET', expect.objectContaining({ app: '7' }));
  });

  it('閲覧できない・取得に失敗したときは、例外にせず理由を返す（本番反映の確認を止めない）', async () => {
    vi.stubGlobal('kintone', { api: vi.fn(async () => { throw Object.assign(new Error('権限がありません。\n[API] GET /k/v1/records.json'), { code: 'CB_NO02' }); }) });
    await expect(fetchRecordCountStandalone({ appId: '5' })).resolves.toEqual({ ok: false, message: '権限がありません。' });
  });

  it('応答にレコード数が無いときは、0 件とみなさず確認できなかったとする', async () => {
    vi.stubGlobal('kintone', { api: vi.fn(async () => ({ records: [] })) });
    await expect(fetchRecordCountStandalone({ appId: '5' })).resolves.toEqual({ ok: false, message: '応答にレコード数がありませんでした' });
  });
});

describe('describeRecordCount', () => {
  it('件数は閲覧できるレコードの数として示し、削除するフィールドの値がそのレコードから削除されることを添える', () => {
    expect(describeRecordCount({ ok: true, count: 12345 })).toBe('このアプリのレコード: 12,345 件（閲覧できるレコードの数）。削除するフィールドの値は、これらのレコードから削除されます。');
    expect(describeRecordCount({ ok: true, count: 0 })).toContain('このアプリのレコード: 0 件');
  });

  it('取得できなかったときは「確認できませんでした」と示し、すべてのレコードから削除されると伝える', () => {
    expect(describeRecordCount({ ok: false, message: '権限がありません。' })).toBe('レコード数は確認できませんでした（権限がありません。）。削除するフィールドの値は、すべてのレコードから削除されます。');
  });
});
