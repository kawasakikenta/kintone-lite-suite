import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../../src/api';
import { runFieldApplyStandalone } from '../../src/tabs/field-standalone';

vi.mock('../../src/api', async original => ({
  ...await original<typeof import('../../src/api')>(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn()
}));

beforeEach(() => vi.clearAllMocks());

describe('field apply revision guard', () => {
  it('stops before POST when the current field settings have no revision', async () => {
    vi.mocked(apiGet).mockResolvedValue({ properties: {} });

    await expect(runFieldApplyStandalone({
      targetAppId: '5',
      fieldJson: JSON.stringify({ properties: { title: { type: 'SINGLE_LINE_TEXT' } } }),
      skipConfirm: true
    }, vi.fn())).rejects.toThrow(/revision.*確認できない/);
    expect(apiPost).not.toHaveBeenCalled();
    expect(apiPut).not.toHaveBeenCalled();
  });

  it('does not require a revision when the plan has no writes', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      properties: { existing: { type: 'NUMBER', code: 'existing' } }
    });

    const logs = await runFieldApplyStandalone({
      targetAppId: '5',
      fieldJson: JSON.stringify({ properties: { existing: { type: 'NUMBER' } } }),
      skipConfirm: true
    }, vi.fn());
    expect(logs.at(-1)).toBe('反映対象なし');
    expect(apiPost).not.toHaveBeenCalled();
    expect(apiPut).not.toHaveBeenCalled();
  });

  it('does not reuse the old revision for an update when the add response omits it', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      properties: { existing: { type: 'NUMBER', code: 'existing' } },
      revision: '10'
    });
    vi.mocked(apiPost).mockResolvedValue({});

    await expect(runFieldApplyStandalone({
      targetAppId: '5',
      fieldJson: JSON.stringify({ properties: {
        added: { type: 'SINGLE_LINE_TEXT' },
        existing: { type: 'NUMBER', label: '更新後' }
      } }),
      overwrite: true,
      skipConfirm: true
    }, vi.fn())).rejects.toThrow(/更新後の revision/);
    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPut).not.toHaveBeenCalled();
  });
});
