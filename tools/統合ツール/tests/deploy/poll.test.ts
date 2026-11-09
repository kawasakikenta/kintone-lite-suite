import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DEPLOY_POLL, waitForDeploy } from '../../src/deploy/poll';
import { __resetRunControlForTests } from '../../src/runControl';
import { createFakeKintone, makeApp } from './fake-kintone';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); __resetRunControlForTests(); vi.unstubAllGlobals(); });

/** waitForDeploy が状態を確認した時刻（fake timers 上の経過ミリ秒）を記録する。 */
async function runWithTimes(poll: Parameters<typeof waitForDeploy>[2], finishAt: number) {
  const apps = { '1': makeApp() };
  const env = createFakeKintone(apps, { pollsToFinish: finishAt });
  env.deployments.push({ ids: ['1'], revert: false, polls: finishAt, done: false, result: {} });
  const times: number[] = [];
  const start = Date.now();
  const original = env.api;
  vi.stubGlobal('kintone', { api: (url: string, method: string, params: any) => { if (method === 'GET' && /deploy\.json/.test(url)) times.push(Date.now() - start); return original(url, method, params); } });
  const promise = waitForDeploy('', ['1'], poll);
  await vi.runAllTimersAsync();
  const result = await promise;
  return { times, result };
}

describe('waitForDeploy: 完了待ちの間隔', () => {
  it('最初の確認は短く待ち（300ms）、2 回目以降は今の規則（1000ms から 1.5 倍ずつ、上限 5000ms）で伸ばす', async () => {
    expect(DEFAULT_DEPLOY_POLL).toMatchObject({ firstMs: 300, initialMs: 1000, maxMs: 5000 });
    const { times, result } = await runWithTimes(undefined, 5);
    expect(result.kind).toBe('done');
    // 300 → +1000 → +1500 → +2250 → +3375
    expect(times).toEqual([300, 1300, 2800, 5050, 8425]);
  });

  it('initialMs を小さく指定したときは、最初の待ちもそれより長くしない', async () => {
    const { times } = await runWithTimes({ initialMs: 10, maxMs: 40, timeoutMs: 5000 }, 3);
    expect(times).toEqual([10, 20, 35]);
  });

  it('firstMs を指定できる', async () => {
    const { times } = await runWithTimes({ firstMs: 50, initialMs: 1000, maxMs: 5000, timeoutMs: 5000 }, 2);
    expect(times).toEqual([50, 1050]);
  });
});
