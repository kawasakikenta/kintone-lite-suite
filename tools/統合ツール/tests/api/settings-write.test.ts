import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRevisionConflictError } from '../../src/api';
import { __resetRunControlForTests, beginRun, requestCancel } from '../../src/runControl';
import { SettingsWriteUnconfirmedError, isKintoneRejection, isSettingsWriteUnconfirmed, writeSettingsWithRevision } from '../../src/settingsWrite';

const network = () => Object.assign(new Error('Network Error'), { code: 'NETWORK' });
const realSetTimeout = globalThis.setTimeout;
const options = { subject: '一覧', howToCheck: '差分を取得し直して確認してください。' };

beforeEach(() => {
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: any, ms?: number, ...rest: any[]) => (Number(ms) < 10_000 ? realSetTimeout(fn, 0, ...rest) : realSetTimeout(fn, ms, ...rest))) as any);
});
afterEach(() => {
  __resetRunControlForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('isKintoneRejection: kintone がエラーを返した（反映されていない）か', () => {
  it('エラーの応答（id・kintone のエラーコード・errors）があれば拒否、通信の失敗や本文の無い 5xx は拒否ではない', () => {
    expect(isKintoneRejection({ code: 'GAIA_CO02', id: 'x', message: 'revision' })).toBe(true);
    expect(isKintoneRejection(Object.assign(new Error('revision mismatch'), { code: 'GAIA_CO02' }))).toBe(true);
    expect(isKintoneRejection({ code: 'CB_VA01', errors: { 'properties.a': { messages: ['x'] } } })).toBe(true);
    expect(isKintoneRejection(Object.assign(new Error('wrapped'), { original: { id: 'req', code: 'GAIA_UN99' } }))).toBe(true);
    expect(isKintoneRejection(network())).toBe(false);
    expect(isKintoneRejection(Object.assign(new Error('Request timeout'), { code: 'TIMEOUT' }))).toBe(false);
    expect(isKintoneRejection(Object.assign(new Error('Bad Gateway'), { status: 502 }))).toBe(false);
    expect(isKintoneRejection('<html>502 Bad Gateway</html>')).toBe(false);
    expect(isKintoneRejection(undefined)).toBe(false);
  });
});

describe('writeSettingsWithRevision', () => {
  const setup = (handler: (url: string, method: string, body: any) => any) => {
    const api = vi.fn(async (url: string, method: string, body: any) => handler(url, method, body));
    vi.stubGlobal('kintone', { api });
    return { api, writes: () => api.mock.calls.filter(([, method]) => method !== 'GET'), reads: () => api.mock.calls.filter(([, method]) => method === 'GET') };
  };

  it('成功すれば 1 回だけ送り、読み直さない', async () => {
    const k = setup((_url, method) => (method === 'GET' ? { revision: '5' } : { revision: '6' }));
    await expect(writeSettingsWithRevision('PUT', '/k/v1/preview', '/app/views.json', { app: '3', views: {}, revision: '5' }, options)).resolves.toEqual({ revision: '6' });
    expect(k.writes()).toHaveLength(1);
    expect(k.reads()).toHaveLength(0);
  });

  it('kintone が拒否した書き込みは、読み直しも送り直しもしない（revision 競合はそのまま伝える）', async () => {
    const k = setup((_url, method) => { if (method === 'GET') return { revision: '5' }; throw { code: 'GAIA_CO02', id: 'x', message: '指定したrevisionは最新ではありません。' }; });
    const error = await writeSettingsWithRevision('PUT', '/k/v1/preview', '/app/views.json', { app: '3', revision: '5' }, options).catch((caught) => caught);
    expect(isRevisionConflictError(error)).toBe(true);
    expect(isSettingsWriteUnconfirmed(error)).toBe(false);
    expect(k.writes()).toHaveLength(1);
    expect(k.reads()).toHaveLength(0);
  });

  it('応答が届かず、読み直した revision が進んでいれば、送り直さずに「反映されたか分からない」で止める', async () => {
    let revision = 5;
    const k = setup((_url, method) => { if (method === 'GET') return { revision: String(revision) }; revision += 1; throw network(); });
    const error: any = await writeSettingsWithRevision('POST', '/k/guest/4/v1/preview', '/app/form/fields.json', { app: '3', properties: {}, revision: '5' }, options).catch((caught) => caught);
    expect(error).toBeInstanceOf(SettingsWriteUnconfirmedError);
    expect(error).toMatchObject({ writeUnconfirmed: true, stopReflection: true, sentRevision: '5', currentRevision: '6' });
    expect(error.message).toBe('一覧の書き込みは、応答が届かなかったため、設定の更新番号（revision）を読み直したところ 5 から 6 に進んでいました。この書き込みが反映されたか、ほかの更新が入ったかのどちらかで、反映されたか分かりません。差分を取得し直して確認してください。\n（原因: Network Error）');
    expect(isRevisionConflictError(error)).toBe(false);
    expect(k.writes()).toHaveLength(1);
    // 読み直しは同じ API の GET（app だけを渡す）
    expect(k.reads()[0]).toEqual(['/k/guest/4/v1/preview/app/form/fields.json', 'GET', { app: '3' }]);
  });

  it('応答が届かず、読み直しても revision が変わっていなければ、反映されていないので送り直す（最大 3 回）', async () => {
    const k = setup((_url, method) => (method === 'GET' ? { revision: '5' } : (() => { throw network(); })()));
    const error: any = await writeSettingsWithRevision('PUT', '/k/v1/preview', '/app/views.json', { app: '3', revision: '5' }, options).catch((caught) => caught);
    expect(k.writes()).toHaveLength(3);
    expect(k.writes().every(([, , body]) => body.revision === '5')).toBe(true);
    expect(isSettingsWriteUnconfirmed(error)).toBe(false);
    expect(error.message).toContain('反映先の設定の更新番号（revision）は 5 のままで、この書き込みは反映されていません。');
  });

  it('一時的でない失敗（kintone の応答が無いが、通信の失敗とは分からない）は、反映されていないことを確かめて送り直さない', async () => {
    const k = setup((_url, method) => { if (method === 'GET') return { revision: '5' }; throw new Error('予期しない応答です'); });
    const error: any = await writeSettingsWithRevision('PUT', '/k/v1/preview', '/app/views.json', { app: '3', revision: '5' }, options).catch((caught) => caught);
    expect(k.writes()).toHaveLength(1);
    expect(k.reads()).toHaveLength(1);
    expect(error.message).toMatch(/^予期しない応答です\n/);
    expect(error.message).toContain('は 5 のままで、この書き込みは反映されていません。');
  });

  it('送り直した書き込みが revision 競合になったら、先の書き込みが遅れて反映された可能性があるため「反映されたか分からない」にする', async () => {
    let writes = 0;
    const k = setup((_url, method) => {
      if (method === 'GET') return { revision: '5' };
      writes += 1;
      if (writes === 1) throw network();
      throw { code: 'GAIA_CO02', id: 'x', message: '指定したrevisionは最新ではありません。' };
    });
    const error: any = await writeSettingsWithRevision('PUT', '/k/v1/preview', '/app/views.json', { app: '3', revision: '5' }, options).catch((caught) => caught);
    expect(k.writes()).toHaveLength(2);
    expect(isSettingsWriteUnconfirmed(error)).toBe(true);
    expect(isRevisionConflictError(error)).toBe(false);
    expect(error.message).toContain('先に送った分が遅れて反映されたか、ほかの更新が入ったかのどちらか');
  });

  it('読み直しに失敗したら、反映されたか分からないとして止める', async () => {
    const k = setup((_url, method) => { if (method === 'GET') throw { code: 'CB_NO02', id: 'x', message: '権限がありません。' }; throw network(); });
    const error: any = await writeSettingsWithRevision('PUT', '/k/v1/preview', '/app/views.json', { app: '3', revision: '5' }, options).catch((caught) => caught);
    expect(isSettingsWriteUnconfirmed(error)).toBe(true);
    expect(error.message).toContain('反映先の設定も読み取れなかったため（権限がありません。）');
    expect(k.writes()).toHaveLength(1);
  });

  it('読み直す前に中止されたら、未実行と言わず「確かめる前に中止した」と伝える', async () => {
    beginRun();
    const k = setup((_url, method) => { if (method === 'GET') return { revision: '5' }; requestCancel(); throw network(); });
    const error: any = await writeSettingsWithRevision('PUT', '/k/v1/preview', '/app/views.json', { app: '3', revision: '5' }, options).catch((caught) => caught);
    expect(isSettingsWriteUnconfirmed(error)).toBe(true);
    expect(error.message).toContain('確かめる前に中止したため');
    expect(k.writes()).toHaveLength(1);
  });

  it('送り直しを待つ間に中止されたら、送り直さずに中止として伝える（読み直して反映されていないと確かめ済み）', async () => {
    beginRun();
    // 送り直しの前の待ち時間（数百 ms〜数秒）に入ったところで「中止」が押されたことにする
    vi.mocked(globalThis.setTimeout).mockImplementation(((fn: any, ms?: number, ...rest: any[]) => {
      if (Number(ms) >= 400 && Number(ms) < 10_000) requestCancel();
      return Number(ms) < 10_000 ? realSetTimeout(fn, 0, ...rest) : realSetTimeout(fn, ms, ...rest);
    }) as any);
    const k = setup((_url, method) => { if (method === 'GET') return { revision: '5' }; throw network(); });
    const error: any = await writeSettingsWithRevision('PUT', '/k/v1/preview', '/app/views.json', { app: '3', revision: '5' }, options).catch((caught) => caught);
    expect(k.reads()).toHaveLength(1);
    expect(error?.name).toBe('RunCancelledError');
    expect(k.writes()).toHaveLength(1);
  });

  it('revision を添えない書き込みは照合できないため、1 回だけ送る', async () => {
    const k = setup((_url, method) => { if (method === 'GET') return { revision: '5' }; throw network(); });
    await expect(writeSettingsWithRevision('PUT', '/k/v1/preview', '/app/views.json', { app: '3' }, options)).rejects.toThrow(/Network Error/);
    expect(k.writes()).toHaveLength(1);
    expect(k.reads()).toHaveLength(0);
  });

  it('プレビュー以外への書き込みは、送る前に止める（読み直しもしない）', async () => {
    const k = setup(() => ({ revision: '6' }));
    await expect(writeSettingsWithRevision('PUT', '/k/v1', '/app/views.json', { app: '3', revision: '5' }, options)).rejects.toThrow(/本番APIへの追加・更新・削除は無効/);
    expect(k.api).not.toHaveBeenCalled();
  });
});
