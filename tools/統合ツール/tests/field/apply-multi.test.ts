import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../../src/api';
import { beginRun, endRun, requestCancel, RunCancelledError, type RunToken } from '../../src/runControl';
import { kusConfirm } from '../../src/utils';
import {
  buildFieldApplyReportMarkdown,
  buildFieldMultiConfirmText,
  findFieldMultiApplyProblem,
  runFieldApplyMultiStandalone
} from '../../src/tabs/field-standalone';

vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn() }));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), kusConfirm: vi.fn() }));

const fieldJson = JSON.stringify({ properties: { added: { type: 'SINGLE_LINE_TEXT', label: '追加' } } });
const targets = [{ appId: '11' }, { appId: '12', guestId: '3' }, { appId: '13', appName: '三つ目' }];

/** 反映先ごとの現在の設定。app ごとに revision を変えて、各対象の revision が使われることを確かめる。 */
function mockTargetFields(extra: Record<string, any> = {}) {
  vi.mocked(apiGet).mockImplementation(async (_prefix: string, _path: string, params: any) => {
    const app = String(params.app);
    if (extra[app] instanceof Error) throw extra[app];
    return extra[app] || { properties: {}, revision: `${app}0` };
  });
}

let token: RunToken | null = null;

beforeEach(() => {
  token = null;
  vi.clearAllMocks();
  vi.mocked(kusConfirm).mockReturnValue(true);
  vi.mocked(apiPost).mockImplementation(async (_prefix: string, _path: string, body: any) => ({ revision: String(Number(body.revision) + 1) }));
  mockTargetFields();
});
afterEach(() => endRun(token));

const run = (overrides: Record<string, unknown> = {}, setStatus = vi.fn()) =>
  runFieldApplyMultiStandalone({ targets, fieldJson, lookupMapJson: '', overwrite: false, ...overrides } as any, setStatus);

describe('field apply to many targets', () => {
  it('applies to every target with its own pre-check revision after one confirmation', async () => {
    const report = await run();

    expect(kusConfirm).toHaveBeenCalledTimes(1);
    const text = vi.mocked(kusConfirm).mock.calls[0][0];
    expect(text).toContain('3 件の反映先');
    expect(text).toContain('合計: 追加 3件 / 更新 0件');
    expect(text).toContain('App 13「三つ目」');
    expect(text).toContain('ゲストスペース 3');
    expect(vi.mocked(apiPost).mock.calls.map(([prefix, path, body]: any[]) => [prefix, path, body.app, body.revision])).toEqual([
      ['/k/v1/preview', '/app/form/fields.json', '11', '110'],
      ['/k/guest/3/v1/preview', '/app/form/fields.json', '12', '120'],
      ['/k/v1/preview', '/app/form/fields.json', '13', '130']
    ]);
    expect(apiPut).not.toHaveBeenCalled();
    expect(report.counts).toEqual({ success: 3, unchanged: 0, failed: 0, conflict: 0, 'not-run': 0 });
    expect(report.totals).toEqual({ add: 3, update: 0, skip: 0 });
    expect(report.tone).toBe('ok');
    expect(report.headline).toContain('3 件中 3 件を反映しました');
    expect(report.lines[0]).toBe('[成功] App 11: 追加 1 / 更新 0 / スキップ 0');
  });

  it('records a pre-check failure, shows it in the confirmation and still applies the other targets', async () => {
    mockTargetFields({ '12': new Error('権限がありません') });
    const report = await run();

    const text = vi.mocked(kusConfirm).mock.calls[0][0];
    expect(text).toContain('事前確認に失敗 1件');
    expect(text).toContain('× App 12（ゲストスペース 3）: 事前確認に失敗（権限がありません）');
    expect(vi.mocked(apiPost).mock.calls.map(([, , body]: any[]) => body.app)).toEqual(['11', '13']);
    expect(report.results[1]).toMatchObject({ appId: '12', status: 'failed', phase: 'precheck', message: '権限がありません' });
    expect(report.counts).toMatchObject({ success: 2, failed: 1 });
    expect(report.tone).toBe('warn');
    expect(report.headline).toContain('2 件を反映しました');
    expect(report.headline).toContain('失敗 1 件');
    expect(report.headline).toContain('権限がありません');
  });

  it('reports a revision conflict on one target without overwriting and continues with the next', async () => {
    vi.mocked(apiPost).mockImplementation(async (_prefix: string, _path: string, body: any) => {
      if (String(body.app) === '12') throw Object.assign(new Error('GAIA_CO02: revision mismatch'), { code: 'GAIA_CO02' });
      return { revision: String(Number(body.revision) + 1) };
    });
    const report = await run();

    expect(report.results.map((r) => r.status)).toEqual(['success', 'conflict', 'success']);
    expect(report.results[1].message).toContain('revision 競合');
    // 競合した対象は再送も別の revision での上書きもしない
    expect(vi.mocked(apiPost).mock.calls.filter(([, , body]: any[]) => String(body.app) === '12')).toHaveLength(1);
    expect(vi.mocked(apiPost).mock.calls.at(-1)![2]).toMatchObject({ app: '13', revision: '130' });
    expect(report.counts.conflict).toBe(1);
    expect(report.tone).toBe('warn');
    expect(report.headline).toContain('競合 1 件');
  });

  it('keeps going after an ordinary failure and reports it as failed', async () => {
    vi.mocked(apiPost).mockImplementation(async (_prefix: string, _path: string, body: any) => {
      if (String(body.app) === '11') throw new Error('サーバーエラー');
      return { revision: String(Number(body.revision) + 1) };
    });
    const report = await run();

    expect(report.results.map((r) => r.status)).toEqual(['failed', 'success', 'success']);
    expect(report.results[0]).toMatchObject({ phase: 'apply', message: 'サーバーエラー' });
    expect(report.tone).toBe('warn');
  });

  it('stops between targets when cancelled and reports the rest as not run, not failed', async () => {
    token = beginRun();
    vi.mocked(apiPost).mockImplementation(async (_prefix: string, _path: string, body: any) => {
      requestCancel(); // 1 件目の書き込み中に「中止」が押された
      return { revision: String(Number(body.revision) + 1) };
    });
    const report = await run();

    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(report.cancelled).toBe(true);
    expect(report.results.map((r) => r.status)).toEqual(['success', 'not-run', 'not-run']);
    expect(report.results[1].message).toContain('中止したため反映していません');
    expect(report.counts).toMatchObject({ success: 1, failed: 0, conflict: 0, 'not-run': 2 });
    expect(report.tone).toBe('warn');
    expect(report.headline).toContain('中止しました（1/3 件を処理、残り 2 件は未実行）');
    expect(report.lines[2]).toContain('[未実行（中止）]');
  });

  it('treats a cancel raised by the API layer as not run for that target and the rest', async () => {
    vi.mocked(apiPost).mockRejectedValueOnce(new RunCancelledError());
    const report = await run();

    expect(report.results.map((r) => r.status)).toEqual(['not-run', 'not-run', 'not-run']);
    expect(report.counts.failed).toBe(0);
    expect(apiPost).toHaveBeenCalledTimes(1);
  });

  it('writes nothing when the single final confirmation is declined', async () => {
    vi.mocked(kusConfirm).mockReturnValue(false);
    const report = await run();

    expect(kusConfirm).toHaveBeenCalledTimes(1);
    expect(apiPost).not.toHaveBeenCalled();
    expect(apiPut).not.toHaveBeenCalled();
    expect(report.declined).toBe(true);
    expect(report.results.every((r) => r.status === 'not-run')).toBe(true);
    expect(report.headline).toContain('何も書き込んでいません');
    expect(report.tone).toBe('info');
  });

  it('does not ask for confirmation or write when no target needs a change', async () => {
    mockTargetFields({
      '11': { properties: { added: { type: 'SINGLE_LINE_TEXT', code: 'added' } }, revision: '5' },
      '12': { properties: { added: { type: 'SINGLE_LINE_TEXT', code: 'added' } }, revision: '5' },
      '13': { properties: { added: { type: 'SINGLE_LINE_TEXT', code: 'added' } }, revision: '5' }
    });
    const report = await run();

    expect(kusConfirm).not.toHaveBeenCalled();
    expect(apiPost).not.toHaveBeenCalled();
    expect(report.counts.unchanged).toBe(3);
    expect(report.lines[0]).toBe('[スキップ（変更なし）] App 11: スキップ 1');
    expect(report.tone).toBe('info');
  });

  it('reports an error tone when every pre-check fails and never writes', async () => {
    mockTargetFields({ '11': new Error('a'), '12': new Error('b'), '13': new Error('c') });
    const report = await run();

    expect(kusConfirm).not.toHaveBeenCalled();
    expect(apiPost).not.toHaveBeenCalled();
    expect(report.counts.failed).toBe(3);
    expect(report.tone).toBe('err');
  });

  it('fails a target whose pre-check has no revision instead of writing without one', async () => {
    mockTargetFields({ '12': { properties: {} } });
    const report = await run();

    expect(report.results[1]).toMatchObject({ status: 'failed', phase: 'precheck' });
    expect(report.results[1].message).toContain('revision');
    expect(vi.mocked(apiPost).mock.calls.map(([, , body]: any[]) => body.app)).toEqual(['11', '13']);
  });

  it('sends updates with the revision returned by the add of the same target', async () => {
    mockTargetFields({ '11': { properties: { existing: { type: 'NUMBER', code: 'existing' } }, revision: '7' } });
    vi.mocked(apiPut).mockResolvedValue({ revision: '9' });
    const json = JSON.stringify({ properties: { added: { type: 'SINGLE_LINE_TEXT' }, existing: { type: 'NUMBER', label: '更新後' } } });
    const report = await run({ targets: [{ appId: '11' }], fieldJson: json, overwrite: true });

    expect(vi.mocked(apiPost).mock.calls[0][2]).toMatchObject({ app: '11', revision: '7' });
    expect(vi.mocked(apiPut).mock.calls[0][2]).toMatchObject({ app: '11', revision: '8' });
    expect(report.totals).toEqual({ add: 1, update: 1, skip: 0 });
  });

  it('applies duplicated targets once', async () => {
    const report = await run({ targets: [{ appId: '11' }, { appId: '11', guestId: '' }, { appId: '11', guestId: '4' }] });
    expect(report.results).toHaveLength(2);
    expect(apiPost).toHaveBeenCalledTimes(2);
  });
});

describe('field apply to many targets: input checks', () => {
  it('requires at least one target and numeric ids before any request', async () => {
    expect(findFieldMultiApplyProblem({ targets: [], fieldJson, lookupMapJson: '' })).toContain('1 件以上');
    expect(findFieldMultiApplyProblem({ targets: [{ appId: 'abc' }], fieldJson, lookupMapJson: '' })).toContain('半角数字');
    expect(findFieldMultiApplyProblem({ targets: [{ appId: '1', guestId: 'x' }], fieldJson, lookupMapJson: '' })).toContain('ゲストスペースID');
    expect(findFieldMultiApplyProblem({ targets: [{ appId: '1' }], fieldJson: '{', lookupMapJson: '' })).toContain('解析できません');
    expect(findFieldMultiApplyProblem({ targets: [{ appId: '1' }], fieldJson, lookupMapJson: '[1]' })).toContain('Lookup');
    expect(findFieldMultiApplyProblem({ targets: [{ appId: '1' }], fieldJson, lookupMapJson: '' })).toBe('');

    await expect(run({ targets: [{ appId: 'abc' }] })).rejects.toThrow('半角数字');
    await expect(run({ targets: [] })).rejects.toThrow('1 件以上');
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('shortens a long confirmation list but keeps the count and the failures first', () => {
    const prechecks = Array.from({ length: 30 }, (_, i) => ({
      appId: String(i + 1), guestId: '', appName: '', add: 1, update: 0, skip: 0, phase: 'precheck' as const, message: '',
      status: (i === 29 ? 'failed' : 'success') as 'failed' | 'success'
    }));
    prechecks[29].message = '権限がありません';
    const text = buildFieldMultiConfirmText(prechecks);
    expect(text).toContain('30 件の反映先');
    expect(text).toContain('…ほか 10 件（合計 30 件）');
    expect(text.indexOf('× App 30')).toBeLessThan(text.indexOf('○ App 1:'));
  });

  it('formats single and multi-app field apply results as Markdown via buildFieldApplyReportMarkdown', async () => {
    const report = await run();
    const multiMd = buildFieldApplyReportMarkdown(report);
    expect(multiMd).toContain('# フィールド追加・更新 実行レポート');
    expect(multiMd).toContain('## 反映先アプリ別結果');
    expect(multiMd).toContain('| 13 | 三つ目 | 通常 | 成功 | 1 | 0 | 0 |');

    const singleMd = buildFieldApplyReportMarkdown({
      generatedAt: '2026-10-31T00:00:00.000Z',
      targetAppId: '11',
      targetGuestId: '3',
      targetAppName: '営業管理',
      overwrite: true,
      lookupMap: { '1': '2' },
      plan: {
        adds: { codeA: { type: 'SINGLE_LINE_TEXT' } },
        updates: { codeB: { type: 'NUMBER' } },
        skippedExisting: [],
        skippedSystem: ['$id'],
        lookupConverted: ['codeA'],
        logs: ['ADD codeA (参照先AppID変換)', 'UPDATE codeB']
      }
    });
    expect(singleMd).toContain('App 11（営業管理） / ゲストスペース 3');
    expect(singleMd).toContain('Lookup AppID変換: 1 → 2');
    expect(singleMd).toContain('| 追加 (ADD) | 1 | codeA |');
    expect(singleMd).toContain('| 更新 (UPDATE) | 1 | codeB |');
  });
});
