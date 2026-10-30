import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { kusConfirm } from '../../src/utils';
import { RunCancelledError, __resetRunControlForTests } from '../../src/runControl';
import { runApplyJsConfigMultiStandalone, jsConfigMultiTargetProblem, buildJsConfigApplyPlan } from '../../src/tabs/jsconfig-standalone';

vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), kusConfirm: vi.fn() }));

type Call = { method: string; url: string; body: any };
let calls: Call[];
let revisions: Record<string, string>;
let getFail: Record<string, Error>;
let putHook: (app: string, body: any) => Promise<any> | any;

const currentFor = (app: string) => ({
  revision: revisions[app],
  scope: 'ALL',
  desktop: { js: [{ type: 'URL', url: `https://example.test/old-${app}.js` }], css: [] },
  mobile: { js: [], css: [] }
});
const json = JSON.stringify({ scope: 'ADMIN', desktop: { js: [{ type: 'URL', url: 'https://example.test/new.js' }], css: [{ type: 'URL', url: 'https://example.test/new.css' }] } });
const targets = (...ids: string[]) => ids.map(appId => ({ appId, guestId: '' }));

beforeEach(() => {
  vi.clearAllMocks();
  __resetRunControlForTests();
  calls = [];
  revisions = { '5': '7', '6': '3', '7': '11' };
  getFail = {};
  putHook = (app) => ({ revision: String(Number(revisions[app]) + 1) });
  vi.mocked(kusConfirm).mockReturnValue(true);
  const api = vi.fn(async (url: string, method: string, body: any) => {
    calls.push({ method, url, body });
    const app = String(body.app);
    if (method === 'GET') {
      if (getFail[app]) throw getFail[app];
      return currentFor(app);
    }
    return putHook(app, body);
  });
  vi.stubGlobal('kintone', { api: Object.assign(api, { url: (p: string) => p }) });
});
afterEach(() => vi.unstubAllGlobals());

const puts = () => calls.filter(c => c.method === 'PUT');

describe('apply JS/CSS to many preview targets', () => {
  it('applies to every target in order with each pre-check revision, preview only, after one confirmation', async () => {
    const status = vi.fn();
    const html = vi.fn();
    const res = await runApplyJsConfigMultiStandalone({ targets: [...targets('5', '6'), { appId: '7', guestId: '2' }, { appId: '5', guestId: '' }], jsonText: json }, status, html);

    expect(kusConfirm).toHaveBeenCalledTimes(1);
    const text = vi.mocked(kusConfirm).mock.calls[0][0];
    expect(text).toContain('3件の反映先プレビュー');
    expect(text).toContain('Desktop JS 1 / CSS 1、Mobile JS 0 / CSS 0');
    expect(text).toContain('適用範囲 ADMIN');
    expect(text).toContain('App 7 / ゲストスペース 2');
    expect(text).toContain('外れる現在の設定: 合計 3件');
    expect(puts().map(c => [c.url, c.body.app, c.body.revision, c.body.scope])).toEqual([
      ['/k/v1/preview/app/customize.json', '5', '7', 'ADMIN'],
      ['/k/v1/preview/app/customize.json', '6', '3', 'ADMIN'],
      ['/k/guest/2/v1/preview/app/customize.json', '7', '11', 'ADMIN']
    ]);
    expect(calls.every(c => c.url.includes('/preview/'))).toBe(true);
    expect(res.counts).toEqual({ total: 3, success: 3, failed: 0, conflict: 0, notExecuted: 0 });
    expect(res.tone).toBe('ok');
    expect(res.results.map(r => [r.appId, r.status, r.revision])).toEqual([['5', 'success', '8'], ['6', 'success', '4'], ['7', 'success', '12']]);
    expect(html.mock.calls[0][0]).toContain('成功');
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('3件の反映先プレビューへ JS/CSS 設定を反映しました'), false);
  });

  it('blocks JSON with FILE entries before any request, and suggests the reflect tool', async () => {
    const fileJson = JSON.stringify({ desktop: { js: [{ type: 'FILE', file: { fileKey: 'k1', name: 'a.js' } }, { type: 'URL', url: 'https://example.test/a.js' }], css: [] } });
    await expect(runApplyJsConfigMultiStandalone({ targets: targets('5', '6'), jsonText: fileJson }, vi.fn(), vi.fn()))
      .rejects.toThrow(/FILE タイプ.*1件.*まとめて反映できません[\s\S]*プレビュー反映/);
    expect(calls).toEqual([]);
    expect(kusConfirm).not.toHaveBeenCalled();
    const plan = buildJsConfigApplyPlan(JSON.parse(fileJson));
    expect(jsConfigMultiTargetProblem(plan)).toContain('別アプリの JS/CSS 転送');
    expect(jsConfigMultiTargetProblem(buildJsConfigApplyPlan(JSON.parse(json)))).toBe('');
  });

  it('rejects empty or non-numeric targets before any request', async () => {
    await expect(runApplyJsConfigMultiStandalone({ targets: [], jsonText: json }, vi.fn(), vi.fn())).rejects.toThrow(/1件以上/);
    await expect(runApplyJsConfigMultiStandalone({ targets: [{ appId: '5', guestId: '' }, { appId: 'x', guestId: '' }], jsonText: json }, vi.fn(), vi.fn())).rejects.toThrow(/半角数字/);
    expect(calls).toEqual([]);
  });

  it('reports a pre-check failure, excludes that target from the writes and shows it in the confirmation', async () => {
    getFail['6'] = Object.assign(new Error('権限がありません'), { code: 'CB_NO02' });
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6', '7'), jsonText: json }, vi.fn(), vi.fn());
    const text = vi.mocked(kusConfirm).mock.calls[0][0];
    expect(text).toContain('2件の反映先プレビュー');
    expect(text).toContain('現在の設定を確認できなかった 1件は反映しません');
    expect(text).toContain('App 6: 権限がありません');
    expect(puts().map(c => c.body.app)).toEqual(['5', '7']);
    expect(res.counts).toMatchObject({ success: 2, failed: 1 });
    expect(res.results[1]).toMatchObject({ appId: '6', status: 'failed', precheck: true, message: '権限がありません' });
    expect(res.tone).toBe('warn');
    expect(res.headline).toContain('3件中 2件を反映しました');
  });

  it('does not ask or write when every pre-check fails', async () => {
    getFail['5'] = new Error('見つかりません');
    getFail['6'] = new Error('見つかりません');
    const html = vi.fn();
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6'), jsonText: json }, vi.fn(), html);
    expect(kusConfirm).not.toHaveBeenCalled();
    expect(puts()).toEqual([]);
    expect(res.tone).toBe('err');
    expect(res.counts.failed).toBe(2);
    expect(html.mock.calls[0][0]).toContain('事前確認で失敗（書き込みなし）');
  });

  it('treats a target without a numeric revision as a pre-check failure', async () => {
    revisions['6'] = '';
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6'), jsonText: json }, vi.fn(), vi.fn());
    expect(res.results[1]).toMatchObject({ appId: '6', status: 'failed', precheck: true });
    expect(res.results[1].message).toContain('revision');
    expect(puts().map(c => c.body.app)).toEqual(['5']);
  });

  it('records a revision conflict on one target without overwriting it, and continues', async () => {
    putHook = (app) => {
      if (app === '6') throw Object.assign(new Error('更新が競合しています'), { code: 'GAIA_CO02' });
      return { revision: '99' };
    };
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6', '7'), jsonText: json }, vi.fn(), vi.fn());
    expect(puts().map(c => c.body.app)).toEqual(['5', '6', '7']);
    expect(res.results.map(r => r.status)).toEqual(['success', 'conflict', 'success']);
    expect(res.results[1].message).toContain('revision 競合');
    expect(res.counts).toEqual({ total: 3, success: 2, failed: 0, conflict: 1, notExecuted: 0 });
    expect(res.tone).toBe('warn');
    expect(res.headline).toContain('競合 1件');
  });

  it('records other PUT failures as failures and continues', async () => {
    putHook = (app) => {
      if (app === '5') throw new Error('JS/CSS の上限を超えています');
      return { revision: '9' };
    };
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6'), jsonText: json }, vi.fn(), vi.fn());
    expect(res.results.map(r => r.status)).toEqual(['failed', 'success']);
    expect(res.results[0].precheck).toBeUndefined();
    expect(res.results[0].message).toBe('JS/CSS の上限を超えています');
  });

  it('stops between targets on cancel and reports the rest as not executed (not failures)', async () => {
    putHook = (app) => {
      if (app === '6') throw new RunCancelledError();
      return { revision: '8' };
    };
    const html = vi.fn();
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6', '7'), jsonText: json }, vi.fn(), html);
    expect(puts().map(c => c.body.app)).toEqual(['5', '6']);
    expect(res.cancelled).toBe(true);
    expect(res.results.map(r => r.status)).toEqual(['success', 'notExecuted', 'notExecuted']);
    expect(res.counts).toEqual({ total: 3, success: 1, failed: 0, conflict: 0, notExecuted: 2 });
    expect(res.tone).toBe('warn');
    expect(res.headline).toContain('中止しました（1/3 件を処理、残り 2 件は未実行）');
    expect(res.headline).toContain('反映済みの 1件は取り消していません');
    expect(html.mock.calls[0][0]).toContain('未実行（中止）');
  });

  it('does not write anything when the confirmation is declined', async () => {
    vi.mocked(kusConfirm).mockReturnValue(false);
    const status = vi.fn();
    const html = vi.fn();
    const res = await runApplyJsConfigMultiStandalone({ targets: targets('5', '6'), jsonText: json }, status, html);
    expect(res.declined).toBe(true);
    expect(puts()).toEqual([]);
    expect(html).not.toHaveBeenCalled();
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('キャンセルしました'));
  });

  it('keeps the confirmation short for many targets', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => String(100 + i));
    for (const id of ids) revisions[id] = '1';
    const res = await runApplyJsConfigMultiStandalone({ targets: targets(...ids), jsonText: json }, vi.fn(), vi.fn());
    const text = vi.mocked(kusConfirm).mock.calls[0][0];
    expect(text).toContain('30件の反映先プレビュー');
    expect(text).toContain('…ほか 10 件（合計 30 件）');
    expect(res.counts.success).toBe(30);
  });
});
