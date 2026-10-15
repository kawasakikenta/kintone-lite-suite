import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, apiPut } from '../../src/api';
import { runBulkRenameFieldStandalone, runFieldApplyStandalone, runLoadFieldsStandalone } from '../../src/tabs/field-standalone';

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

  it('chains the revision from the add response into the update and targets the preview API', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      properties: { existing: { type: 'NUMBER', code: 'existing' } },
      revision: '10'
    });
    vi.mocked(apiPost).mockResolvedValue({ revision: '11' });
    vi.mocked(apiPut).mockResolvedValue({ revision: '12' });

    const logs = await runFieldApplyStandalone({
      targetAppId: '5',
      targetGuestId: '7',
      fieldJson: JSON.stringify({ properties: {
        added: { type: 'SINGLE_LINE_TEXT' },
        existing: { type: 'NUMBER', label: '更新後' }
      } }),
      overwrite: true,
      skipConfirm: true
    }, vi.fn());

    expect(apiPost).toHaveBeenCalledWith('/k/guest/7/v1/preview', '/app/form/fields.json', {
      app: '5', properties: { added: { type: 'SINGLE_LINE_TEXT', code: 'added' } }, revision: '10'
    });
    expect(apiPut).toHaveBeenCalledWith('/k/guest/7/v1/preview', '/app/form/fields.json', {
      app: '5', properties: { existing: { type: 'NUMBER', label: '更新後', code: 'existing' } }, revision: '11'
    });
    expect(logs.join('\n')).toContain('revision 12');
  });

  it('tells the user that the add was applied when the following update fails', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      properties: { existing: { type: 'NUMBER', code: 'existing' } },
      revision: '10'
    });
    vi.mocked(apiPost).mockResolvedValue({ revision: '11' });
    vi.mocked(apiPut).mockRejectedValue(Object.assign(new Error('revision mismatch'), { code: 'GAIA_CO02' }));

    const error: any = await runFieldApplyStandalone({
      targetAppId: '5',
      fieldJson: JSON.stringify({ properties: {
        added: { type: 'SINGLE_LINE_TEXT' },
        existing: { type: 'NUMBER' }
      } }),
      overwrite: true,
      skipConfirm: true
    }, vi.fn()).catch(e => e);

    expect(error).toBeInstanceOf(Error);
    expect(error.message.split('\n')[0]).toMatch(/追加 1件は反映済み/);
    expect(error.message).toMatch(/revision 競合/);
    expect(error.revisionConflict).toBe(true);
  });

  it('does not add a partial-success notice when only an update is attempted', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      properties: { existing: { type: 'NUMBER', code: 'existing' } },
      revision: '10'
    });
    vi.mocked(apiPut).mockRejectedValue(new Error('boom'));

    await expect(runFieldApplyStandalone({
      targetAppId: '5',
      fieldJson: JSON.stringify({ properties: { existing: { type: 'NUMBER' } } }),
      overwrite: true,
      skipConfirm: true
    }, vi.fn())).rejects.toThrow(/^boom$/);
  });

  it('rejects non-numeric app and guest ids before any request', async () => {
    const fieldJson = JSON.stringify({ properties: { a: { type: 'NUMBER' } } });
    await expect(runFieldApplyStandalone({ targetAppId: '5x', fieldJson, skipConfirm: true }, vi.fn())).rejects.toThrow(/アプリIDは数値/);
    await expect(runFieldApplyStandalone({ targetAppId: '5', targetGuestId: '../1', fieldJson, skipConfirm: true }, vi.fn())).rejects.toThrow(/ゲストIDは数値/);
    await expect(runLoadFieldsStandalone({ appId: '5x', preview: true }, vi.fn())).rejects.toThrow(/アプリIDは数値/);
    await expect(runLoadFieldsStandalone({ appId: '5', guestId: 'a', preview: true }, vi.fn())).rejects.toThrow(/ゲストIDは数値/);
    await expect(runBulkRenameFieldStandalone({ targetAppId: '5x', prefix: 'dev_' }, vi.fn())).rejects.toThrow(/アプリIDは数値/);
    expect(apiGet).not.toHaveBeenCalled();
    expect(apiPost).not.toHaveBeenCalled();
  });
});
