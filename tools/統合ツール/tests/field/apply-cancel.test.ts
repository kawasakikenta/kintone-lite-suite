import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../../src/api';
import { RunCancelledError } from '../../src/runControl';
import { runFieldApplyStandalone } from '../../src/tabs/field-standalone';

vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn() }));

const opts = {
  targetAppId: '5',
  fieldJson: JSON.stringify({ properties: { added: { type: 'SINGLE_LINE_TEXT' }, existing: { type: 'NUMBER', label: '更新後' } } }),
  overwrite: true,
  skipConfirm: true
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiGet).mockResolvedValue({ properties: { existing: { type: 'NUMBER', code: 'existing' } }, revision: '10' });
});

describe('field apply reports a cancel as not run, not as a failed write', () => {
  it('says that nothing was added or updated when the add request is not sent', async () => {
    vi.mocked(apiPost).mockRejectedValue(new RunCancelledError());
    const error: any = await runFieldApplyStandalone(opts, vi.fn()).catch(caught => caught);

    expect(error.message.split('\n')[0]).toBe('中止しました（0/2 件を処理、残り 2 件は未実行）');
    expect(error.message).toContain('未実行（中止） フィールド追加 1件 / フィールド更新 1件');
    expect(error.message).not.toContain('NG フィールド追加');
    expect(apiPut).not.toHaveBeenCalled();
  });

  it('keeps the applied add in the report when the update is cancelled', async () => {
    vi.mocked(apiPost).mockResolvedValue({ revision: '11' });
    vi.mocked(apiPut).mockRejectedValue(new RunCancelledError());
    const error: any = await runFieldApplyStandalone(opts, vi.fn()).catch(caught => caught);

    expect(error.message.split('\n')[0]).toBe('中止しました（1/2 件を処理、残り 1 件は未実行）');
    expect(error.message).toContain('OK フィールド追加 1件');
    expect(error.message).toContain('未実行（中止） フィールド更新 1件（追加 1件は反映済み）');
  });
});
