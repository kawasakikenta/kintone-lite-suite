import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../../src/api';
import { downloadBlob } from '../../src/utils';
import { loadJSZipLite } from '../../src/jszipLoader';
import { RunCancelledError, __resetRunControlForTests, beginRun, requestCancel } from '../../src/runControl';
import {
  buildProcessBatchDiagramFileName,
  createProcessBatchNameSet,
  buildProcessBatchManifest,
  buildProcessBatchMmd,
  buildProcessBatchOverviewMarkdown,
  formatProcessBatchResultLines,
  normalizeProcessBatchTargets,
  runProcessBatchZipStandalone,
  validateProcessBatchTargets,
  type ProcessBatchRow
} from '../../src/tabs/process-standalone';

vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn() }));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), downloadBlob: vi.fn() }));
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: vi.fn() }));

class FakeZip {
  files = new Map<string, string>();
  file(path: string, value: string) { this.files.set(path, value); return this; }
  async generateAsync() { return new Blob(['zip']); }
}
let zip: FakeZip;

const enabledStatus = {
  enable: true,
  states: { '未処理': { index: '0' }, '完了': { index: '1' } },
  actions: [{ name: '申請', from: '未処理', to: '完了' }]
};
const row = (over: Partial<ProcessBatchRow>): ProcessBatchRow => ({
  appId: '1', guestId: '', appName: '', outcome: 'enabled', stateCount: 0, actionCount: 0, warnings: [], reason: '', file: '', ...over
});

beforeEach(() => {
  vi.clearAllMocks();
  __resetRunControlForTests();
  zip = new FakeZip();
  vi.mocked(loadJSZipLite).mockResolvedValue(class { constructor() { return zip; } } as any);
});
afterEach(() => __resetRunControlForTests());

describe('buildProcessBatchDiagramFileName', () => {
  it('puts the app ID (and guest space) in the name and strips unsafe characters', () => {
    const used = new Set<string>();
    expect(buildProcessBatchDiagramFileName({ appId: '12', guestId: '', appName: '見積/管理:*?' }, used)).toBe('diagrams/12_見積 管理.mmd');
    expect(buildProcessBatchDiagramFileName({ appId: '12', guestId: '5', appName: '' }, used)).toBe('diagrams/guest5_12.mmd');
  });

  it('removes control characters, trailing dots and truncates long names', () => {
    const name = buildProcessBatchDiagramFileName({ appId: '7', appName: `a\u0000b‮c.${'あ'.repeat(100)}` }, new Set());
    expect(name).toMatch(/^diagrams\/7_abc\.あ+\.mmd$/);
    expect(Array.from(name).filter(c => c === 'あ').length).toBeLessThanOrEqual(60);
    expect(buildProcessBatchDiagramFileName({ appId: '8', appName: 'con' }, new Set())).toBe('diagrams/8__con.mmd');
  });

  it('makes names unique even when only the letter case differs', () => {
    const used = createProcessBatchNameSet();
    const names = ['Sales', 'SALES', 'sales'].map(appName => buildProcessBatchDiagramFileName({ appId: '3', appName }, used));
    expect(new Set(names.map(n => n.toLowerCase())).size).toBe(3);
    expect(names[1]).toBe('diagrams/3_SALES_2.mmd');
  });
});

describe('target validation', () => {
  it('reports the first invalid row with its row number', () => {
    expect(validateProcessBatchTargets([])).toContain('1件以上');
    expect(validateProcessBatchTargets([{ appId: '1' }, { appId: 'x' }])).toMatch(/^2行目: アプリID/);
    expect(validateProcessBatchTargets([{ appId: '1', guestId: 'g' }])).toMatch(/^1行目: ゲストID/);
    expect(validateProcessBatchTargets([{ appId: '1', guestId: '3' }])).toBe('');
  });

  it('drops duplicate app/guest pairs but keeps the same ID in another guest space', () => {
    expect(normalizeProcessBatchTargets([
      { appId: '5', guestId: '' }, { appId: ' 5 ', guestId: '', appName: 'x' }, { appId: '5', guestId: '2' }
    ]).map(t => `${t.guestId}:${t.appId}`)).toEqual([':5', '2:5']);
  });
});

describe('overview Markdown and manifest', () => {
  const rows: ProcessBatchRow[] = [
    row({ appId: '1', appName: '見積|管理', outcome: 'enabled', stateCount: 2, actionCount: 1, warnings: ['終端状態がありません'], file: 'diagrams/1_見積_管理.mmd' }),
    row({ appId: '2', appName: '日報', outcome: 'disabled' }),
    row({ appId: '3', guestId: '9', outcome: 'failed', reason: '権限がありません\n詳細' }),
    row({ appId: '4', outcome: 'not-run' })
  ];
  const sources = { 'diagrams/1_見積_管理.mmd': 'stateDiagram-v2\n    state "x ```" as s0\n' };
  const meta = { generatedAt: '2026-10-30T00:00:00.000Z', preview: true, cancelled: true, total: 4 };

  it('lists every app with its outcome and embeds a mermaid block only for enabled apps', () => {
    const md = buildProcessBatchOverviewMarkdown(rows, sources, meta);
    expect(md).toContain('参照環境: プレビュー');
    expect(md).toContain('プロセス管理あり 1 / 無効 1 / 取得失敗 1 / 未実行（中止） 1');
    expect(md).toContain('中止したため');
    expect(md).toContain('| 1 | 見積\\|管理 | 有効 | 2 | 1 | 終端状態がありません |'.replace('| 1 | 見積\\|管理 | 有効', '| 1 | 見積\\|管理 |  | 有効'));
    expect(md).toContain('| 2 | 日報 |  | 無効 |');
    expect(md).toContain('| 3 |  | 9 | 取得失敗 |');
    expect(md).toContain('権限がありません 詳細');
    expect(md).toContain('| 4 |  |  | 未実行（中止） |');
    expect(md.match(/mermaid\n/g)?.length).toBe(1);
    // ソース内の ``` より長い囲みを使う
    expect(md).toContain('````mermaid');
  });

  it('says so when no app has process management enabled', () => {
    const md = buildProcessBatchOverviewMarkdown([row({ outcome: 'disabled' })], {}, { ...meta, cancelled: false, total: 1 });
    expect(md).toContain('プロセス管理が有効なアプリはありませんでした。');
    expect(md).not.toContain('mermaid\n');
  });

  it('records failures and not-executed apps in the manifest', () => {
    const manifest = buildProcessBatchManifest(rows, { ...meta, guestIds: ['9'] });
    expect(manifest).toMatchObject({
      environment: 'preview', guestIds: ['9'], targetCount: 4, appCount: 3, enabledAppCount: 1, disabledAppCount: 1, failedAppCount: 1,
      cancelled: true, notExecuted: [{ appId: '4', guestId: '', appName: '' }]
    });
    expect(manifest.apps.map(a => [a.appId, a.processManagement, a.status])).toEqual([['1', 'enabled', 'ok'], ['2', 'disabled', 'ok'], ['3', 'unknown', 'failed']]);
    expect(manifest.apps[0]).toMatchObject({ file: 'diagrams/1_見積_管理.mmd', stateCount: 2, actionCount: 1 });
    expect(manifest.apps[2]).toMatchObject({ error: '権限がありません\n詳細' });
    expect(buildProcessBatchManifest([rows[0]], { ...meta, cancelled: false, total: 1, guestIds: [] })).not.toHaveProperty('cancelled');
  });

  it('formats one log line per app without hiding failures or not-run apps', () => {
    const lines = formatProcessBatchResultLines(rows);
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('有効\tアプリ 1 見積|管理');
    expect(lines[1]).toContain('プロセス管理は無効です');
    expect(lines[2]).toContain('取得失敗\tアプリ 3 (guest:9)');
    expect(lines[3]).toContain('未実行（中止）');
  });

  it('writes the same header as the single-app .mmd save', () => {
    const mmd = buildProcessBatchMmd({ appId: '1', guestId: '2', appName: '名前\n改行' }, 'stateDiagram-v2\n', false, new Date(2026, 9, 30, 1, 2, 3));
    const [first, second, third] = mmd.split('\n');
    expect(first).toMatch(/^%% kintone プロセス図 \/ アプリ 1 名前 改行 \/ ゲストスペース 2 \/ 本番 \/ 生成 /);
    expect(second).toContain('mermaid.live');
    expect(third).toBe('stateDiagram-v2');
    expect(mmd.endsWith('stateDiagram-v2\n')).toBe(true);
  });
});

describe('runProcessBatchZipStandalone', () => {
  const mockApi = (impl: (path: string, params: any, prefix: string) => any) =>
    vi.mocked(apiGet).mockImplementation(async (prefix: string, path: string, params: any) => impl(path, params, prefix));

  it('saves enabled apps, notes disabled ones and records failures without stopping', async () => {
    mockApi((path, params) => {
      if (path === '/app.json') return { name: params.id === '11' ? '取得した名前' : '?' };
      if (params.app === '10') return enabledStatus;
      if (params.app === '11') return { enable: false };
      if (params.app === '12') throw new Error('GAIA_NO01: 権限がありません\n詳細');
      return { ...enabledStatus, states: { A: { index: '0' } }, actions: [{ name: 'x', from: 'A', to: 'B' }, { name: 'bad', from: 'A' }] };
    });
    const status = vi.fn();
    const result = await runProcessBatchZipStandalone({
      apps: [{ appId: '10', guestId: '', appName: '見積' }, { appId: '11', guestId: '' }, { appId: '12', guestId: '' }, { appId: '13', guestId: '' }, { appId: '10', guestId: '' }],
      preview: true
    }, status);

    expect(result.counts).toEqual({ enabled: 2, disabled: 1, failed: 1, notRun: 0 });
    expect(result.stoppedAt).toBe(-1);
    expect(result.rows.map(r => [r.appId, r.outcome, r.appName])).toEqual([
      ['10', 'enabled', '見積'], ['11', 'disabled', '取得した名前'], ['12', 'failed', '?'], ['13', 'enabled', '?']
    ]);
    // プレビュー環境で取得し、名前を補う /app.json だけ本番 prefix
    const statusCalls = vi.mocked(apiGet).mock.calls.filter(c => c[1] === '/app/status.json');
    expect(statusCalls.every(c => c[0] === '/k/v1/preview')).toBe(true);
    expect(statusCalls.map(c => (c[2] as any).app)).toEqual(['10', '11', '12', '13']);
    const nameCalls = vi.mocked(apiGet).mock.calls.filter(c => c[1] === '/app.json');
    expect(nameCalls.map(c => (c[2] as any).id)).toEqual(['11', '12', '13']);
    expect(nameCalls.every(c => c[0] === '/k/v1')).toBe(true);

    expect(result.rows[2].reason).toBe('GAIA_NO01: 権限がありません');
    expect(result.rows[3].warnings.join()).toContain('from/to 未設定のアクション 1件を除外');

    expect([...zip.files.keys()].sort()).toEqual(['diagrams/10_見積.mmd', 'diagrams/13.mmd', 'manifest.json', 'overview.md'].sort());
    expect(zip.files.get('diagrams/10_見積.mmd')).toContain('stateDiagram-v2');
    expect(zip.files.get('diagrams/10_見積.mmd')).toContain('s0 --> s1 : 申請');
    expect(zip.files.get('overview.md')).toContain('取得失敗');
    const manifest = JSON.parse(zip.files.get('manifest.json')!);
    expect(manifest).toMatchObject({ environment: 'preview', targetCount: 4, enabledAppCount: 2, disabledAppCount: 1, failedAppCount: 1 });
    expect(manifest).not.toHaveProperty('cancelled');

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(vi.mocked(downloadBlob).mock.calls[0][0]).toMatch(/^プロセス図一括_4アプリ_プレビュー_\d{8}_\d{6}\.zip$/);
    expect(status.mock.calls.some(c => String(c[0]).startsWith('[1/4] アプリ 10'))).toBe(true);
    expect(status.mock.calls.some(c => String(c[0]).startsWith('[4/4]') && String(c[0]).includes('取得失敗 1件'))).toBe(true);
    // 一部失敗は警告として最終報告する
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('取得失敗 1件'), true);
    expect(String(status.mock.calls.at(-1)![0])).toContain('2件を含むZIP');
  });

  it('reports success without warning when every app is fine, and treats disabled process management as not a failure', async () => {
    mockApi((_path, params) => params.app === '2' ? { enable: false } : enabledStatus);
    const status = vi.fn();
    const result = await runProcessBatchZipStandalone({ apps: [{ appId: '1', guestId: '', appName: 'A' }, { appId: '2', guestId: '3', appName: 'B' }] }, status);
    expect(result.counts).toEqual({ enabled: 1, disabled: 1, failed: 0, notRun: 0 });
    expect(status).toHaveBeenLastCalledWith(expect.not.stringContaining('取得失敗'), false);
    expect(vi.mocked(apiGet).mock.calls.find(c => (c[2] as any).app === '2')![0]).toBe('/k/guest/3/v1');
  });

  it('keeps an app whose name lookup failed and says so in the overview', async () => {
    mockApi((path) => { if (path === '/app.json') throw new Error('404'); return enabledStatus; });
    const result = await runProcessBatchZipStandalone({ apps: [{ appId: '5', guestId: '' }] }, vi.fn());
    expect(result.rows[0]).toMatchObject({ outcome: 'enabled', appName: '' });
    expect(result.rows[0].reason).toContain('アプリ名を取得できませんでした');
    expect(zip.files.has('diagrams/5.mmd')).toBe(true);
    expect(zip.files.get('overview.md')).toContain('アプリ名を取得できませんでした');
  });

  it('treats an unexpected response as a failure instead of "disabled"', async () => {
    mockApi((_p, params) => (params.app === '1' ? null : enabledStatus));
    const result = await runProcessBatchZipStandalone({ apps: [{ appId: '1', guestId: '', appName: 'A' }, { appId: '2', guestId: '', appName: 'B' }] }, vi.fn());
    expect(result.rows[0]).toMatchObject({ outcome: 'failed' });
    expect(result.rows[0].reason).toContain('想定外の応答形式');
  });

  it('stops at the cancelled app, saves what was collected and records the rest as not run', async () => {
    mockApi((_path, params) => {
      if (params.app === '2') throw new RunCancelledError();
      return enabledStatus;
    });
    const status = vi.fn();
    const result = await runProcessBatchZipStandalone({
      apps: ['1', '2', '3'].map(appId => ({ appId, guestId: '', appName: `App${appId}` }))
    }, status);
    expect(vi.mocked(apiGet).mock.calls.map(c => (c[2] as any).app)).toEqual(['1', '2']);
    expect(result.stoppedAt).toBe(1);
    expect(result.counts).toEqual({ enabled: 1, disabled: 0, failed: 0, notRun: 2 });
    expect(result.rows.map(r => r.outcome)).toEqual(['enabled', 'not-run', 'not-run']);
    const manifest = JSON.parse(zip.files.get('manifest.json')!);
    expect(manifest).toMatchObject({ cancelled: true, appCount: 1, failedAppCount: 0 });
    expect(manifest.notExecuted.map((t: any) => t.appId)).toEqual(['2', '3']);
    expect([...zip.files.keys()].filter(k => k.endsWith('.mmd'))).toEqual(['diagrams/1_App1.mmd']);
    expect(zip.files.get('overview.md')).toContain('未実行（中止）');
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('中止しました（1/3 件を処理、残り 2 件は未実行）'), true);
    expect(String(status.mock.calls.at(-1)![0])).toContain('取得済みの 1アプリだけを保存しました');
  });

  it('stops between apps when cancel is requested while an app is being fetched', async () => {
    beginRun();
    mockApi((_path, params) => {
      if (params.app === '1') requestCancel();
      return enabledStatus;
    });
    const result = await runProcessBatchZipStandalone({ apps: ['1', '2', '3'].map(appId => ({ appId, guestId: '', appName: 'N' })) }, vi.fn());
    expect(vi.mocked(apiGet).mock.calls.map(c => (c[2] as any).app)).toEqual(['1']);
    expect(result.rows.map(r => r.outcome)).toEqual(['enabled', 'not-run', 'not-run']);
  });

  it('does not save a ZIP when cancelled before anything was collected, and reports failures so far', async () => {
    mockApi((_path, params) => {
      if (params.app === '1') throw new Error('boom');
      throw new RunCancelledError();
    });
    await expect(runProcessBatchZipStandalone({ apps: ['1', '2'].map(appId => ({ appId, guestId: '', appName: 'N' })) }, vi.fn()))
      .rejects.toMatchObject({ cancelReport: true, message: expect.stringContaining('アプリ 1 N: 取得失敗: boom') });
    expect(downloadBlob).not.toHaveBeenCalled();
    expect(zip.files.size).toBe(0);
  });

  it('throws with every reason and saves nothing when no app could be read', async () => {
    mockApi(() => { throw new Error('通信エラー'); });
    const error = await runProcessBatchZipStandalone({ apps: ['1', '2'].map(appId => ({ appId, guestId: '', appName: 'N' })) }, vi.fn()).catch(e => e);
    expect(error.message).toContain('取得失敗 2件');
    expect(error.message).toContain('アプリ 1 N: 取得失敗: 通信エラー');
    expect(error.message).toContain('アプリ 2 N: 取得失敗: 通信エラー');
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('rejects invalid input before any request and loads JSZip first', async () => {
    await expect(runProcessBatchZipStandalone({ apps: [] }, vi.fn())).rejects.toThrow('1件以上');
    await expect(runProcessBatchZipStandalone({ apps: [{ appId: 'abc', guestId: '' }] }, vi.fn())).rejects.toThrow('アプリID');
    expect(apiGet).not.toHaveBeenCalled();
    vi.mocked(loadJSZipLite).mockRejectedValueOnce(new Error('JSZipの読み込みに失敗しました'));
    await expect(runProcessBatchZipStandalone({ apps: [{ appId: '1', guestId: '' }] }, vi.fn())).rejects.toThrow('JSZip');
    expect(apiGet).not.toHaveBeenCalled();
  });
});
