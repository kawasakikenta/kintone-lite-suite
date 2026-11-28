import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isKintoneRejection, isSettingsWriteUnconfirmed, SettingsWriteUnconfirmedError, writeSettingsWithRevision } from '../../src/settingsWrite';
import { isUnconfirmedWriteFailure } from '../../src/tabs/record-query';
import { inspectDeployTargetsStandalone, runDeployStandalone } from '../../src/tabs/deploy-standalone';
import { __resetRunControlForTests } from '../../src/runControl';
import { createFakeKintone, field, makeApp } from '../deploy/fake-kintone';

// 書き込みの失敗が「kintone が拒否した（＝書き込まれていない）」のか「応答が届かなかった（＝書き込まれたか分からない）」のかは、
// 失敗の形で見分ける（settingsWrite.ts の isKintoneRejection）。kintone のエラー応答は必ず code（GAIA_CO02・CB_VA01 など）・id・message を持つ。
// id や errors という名前の項目は、中継装置・ゲートウェイの JSON のエラー（要求ID・errors の配列など）にもよくある。
// これだけで「拒否された」と判断すると、応答が届かずに反映済みだった書き込みを「書き込まれていない」と言い切り、
// 利用者が再実行して二重に登録してしまう（レコードの追加）。kintone の形のエラーコードが無い失敗は、拒否と見なさない。

/** 中継装置・ゲートウェイが返しうる JSON のエラー（kintone のエラーコードが無い） */
const GATEWAY_LIKE_FAILURES: Array<[string, unknown]> = [
  ['a request id only', { id: 'gw-7f3a91', message: 'Service Unavailable' }],
  ['a numeric id', { id: 503, message: 'Service Unavailable' }],
  ['an empty errors array', { errors: [], message: 'Bad Gateway' }],
  ['a JSON:API errors array', { errors: [{ status: '504', title: 'Gateway Timeout' }] }],
  ['an errors object without a code', { errors: { upstream: 'unavailable' }, message: 'Bad Gateway' }],
  ['a non-kintone code with an id', { code: 'UPSTREAM_ERROR', id: 'edge-1', message: 'Bad Gateway' }],
  ['a wrapped gateway error', Object.assign(new Error('wrapped'), { original: { id: 'gw-1', errors: [] } })]
];

afterEach(() => {
  __resetRunControlForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('isKintoneRejection does not take a gateway-like JSON error for a kintone rejection', () => {
  for (const [label, failure] of GATEWAY_LIKE_FAILURES) {
    it(`is not a rejection: ${label}`, () => {
      expect(isKintoneRejection(failure)).toBe(false);
      expect(isUnconfirmedWriteFailure(failure)).toBe(true);
    });
  }

  it('still recognises kintone error responses (kintone error code, with or without id / errors)', () => {
    expect(isKintoneRejection({ code: 'GAIA_CO02', id: 'x', message: '指定したrevisionは最新ではありません。' })).toBe(true);
    expect(isKintoneRejection({ code: 'CB_VA01', id: 'y', message: '入力内容が正しくありません。', errors: { 'records[0].title.value': { messages: ['必須です。'] } } })).toBe(true);
    expect(isKintoneRejection(Object.assign(new Error('権限がありません。'), { code: 'CB_NO02' }))).toBe(true);
    expect(isKintoneRejection(Object.assign(new Error('wrapped'), { original: { id: 'req', code: 'GAIA_UN99', message: 'サーバーエラー' } }))).toBe(true);
  });
});

describe('settings write: a gateway-like JSON error after the write was applied is not reported as a plain failure', () => {
  const realSetTimeout = globalThis.setTimeout;
  beforeEach(() => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: any, ms?: number, ...rest: any[]) => (Number(ms) < 10_000 ? realSetTimeout(fn, 0, ...rest) : realSetTimeout(fn, ms, ...rest))) as any);
  });

  for (const [label, failure] of GATEWAY_LIKE_FAILURES) {
    it(`reads the revision back and stops as unconfirmed when it has moved on (${label})`, async () => {
      let revision = 5;
      const api = vi.fn(async (_url: string, method: string) => {
        if (method === 'GET') return { revision: String(revision) };
        // kintone では反映されたが、応答は中継装置の JSON のエラーになった
        revision += 1;
        throw failure;
      });
      vi.stubGlobal('kintone', { api });
      const error: any = await writeSettingsWithRevision('PUT', '/k/v1/preview', '/app/views.json', { app: '3', views: {}, revision: '5' }, { subject: '一覧', howToCheck: '差分を取得し直して確認してください。' }).catch((caught) => caught);
      expect(error).toBeInstanceOf(SettingsWriteUnconfirmedError);
      expect(isSettingsWriteUnconfirmed(error)).toBe(true);
      expect(api.mock.calls.filter(([, method]) => method !== 'GET')).toHaveLength(1);
    });
  }
});

describe('production deploy: a gateway-like JSON error after the request is not reported as "not accepted"', () => {
  const fields = (...items: any[]) => ({ properties: Object.fromEntries(items.map(item => [item.code, item])) });
  const changedApp = () => makeApp({
    prodRevision: '10', previewRevision: '12',
    production: { fieldSettings: fields(field('name', '名前')) },
    preview: { fieldSettings: fields(field('name', '名前'), field('added', '追加項目')) }
  });

  for (const [label, postError] of GATEWAY_LIKE_FAILURES) {
    it(`is unknown, not failed, and is not re-sent (${label})`, async () => {
      const env = createFakeKintone({ '1': changedApp(), '2': changedApp() }, { postError });
      vi.stubGlobal('kintone', { api: env.api });
      const inspected = await inspectDeployTargetsStandalone({ targets: [{ appId: '1', guestId: '' }, { appId: '2', guestId: '' }] });
      const result = await runDeployStandalone({
        mode: 'deploy', batchMode: 'sequential', targets: inspected.apps, poll: { initialMs: 1, maxMs: 2, timeoutMs: 5000 },
        saveBackup: () => {}
      });
      expect(result.apps.map(app => app.status)).toEqual(['unknown', 'pending']);
      expect(result.apps[0].message).toContain('二重に実行しないよう');
      expect(env.api.mock.calls.filter(call => call[1] === 'POST')).toHaveLength(1);
    });
  }
});
