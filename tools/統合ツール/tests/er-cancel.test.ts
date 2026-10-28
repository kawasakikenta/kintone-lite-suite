import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/api';
import { RunCancelledError } from '../src/runControl';
import { crawl } from '../src/tabs/er';

vi.mock('../src/api', async original => ({ ...await original<typeof import('../src/api')>(), apiGet: vi.fn() }));

const options = { maxDepth: 0, includeReverseLookup: false, sleepMs: 1, source: { guestId: '', preview: false } };
const lookupField = (to: number) => ({ properties: { lk: { type: 'NUMBER', code: 'lk', label: 'LK', lookup: { relatedApp: { app: String(to) }, relatedKeyField: 'key' } }, key: { type: 'SINGLE_LINE_TEXT', code: 'key', label: 'Key' } } });

beforeEach(() => vi.clearAllMocks());

describe('ER crawl stops at the first cancel', () => {
  it('does not cache the cancel as a failed app and never reaches the next app', async () => {
    vi.mocked(apiGet).mockImplementation(async (_prefix: string, path: string, params: any) => {
      const id = Number(params?.app ?? params?.id);
      if (id === 2 && path === '/app/form/fields.json') throw new RunCancelledError();
      if (path === '/app.json') return { appId: String(id), name: `App${id}` };
      if (path === '/app/actions.json') return { actions: {} };
      if (id === 1) return lookupField(2);
      if (id === 2) return lookupField(3);
      throw new Error(`unexpected app ${id}`);
    });
    const error: any = await crawl(['1'], options).catch(caught => caught);

    expect(error.message.split('\n')[0]).toBe('中止しました（1/2 件を処理、残り 1 件は未実行）');
    expect(error.message).toContain('解析を中断したアプリ: 2');
    expect(error.message).toContain('ER図は生成していません');
    const fieldCalls = vi.mocked(apiGet).mock.calls.filter(call => call[1] === '/app/form/fields.json').map(call => (call[2] as any).app);
    expect(fieldCalls).toEqual([1, 2]);
  });
});
