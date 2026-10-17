import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPut } from '../../src/api';
import { kusConfirm } from '../../src/utils';
import { runApplyJsConfigStandalone } from '../../src/tabs/jsconfig-standalone';

vi.mock('../../src/api', async original => ({
  ...await original<typeof import('../../src/api')>(),
  apiGet: vi.fn(),
  apiPut: vi.fn()
}));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), kusConfirm: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('JS/CSS apply revision guard', () => {
  it('stops before PUT when the current customize settings have no revision', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      desktop: { js: [], css: [] },
      mobile: { js: [], css: [] }
    });

    await expect(runApplyJsConfigStandalone({
      targetAppId: '5',
      jsonText: JSON.stringify({ desktop: { js: [], css: [] }, mobile: { js: [], css: [] } }),
      skipConfirm: true
    }, vi.fn(), vi.fn())).rejects.toThrow(/revision.*確認できない/);
    expect(apiPut).not.toHaveBeenCalled();
  });

  const current = {
    revision: '7',
    desktop: { js: [{ type: 'FILE', file: { fileKey: 'old', name: 'old.js' } }, { type: 'URL', url: 'https://example.test/keep.js' }], css: [] },
    mobile: { js: [], css: [{ type: 'URL', url: 'https://example.test/m.css' }] }
  };
  const json = JSON.stringify({ desktop: { js: [{ type: 'URL', url: 'https://example.test/keep.js' }], css: [] } });

  it('sends the GET revision with the PUT and shows how many current entries will be dropped in the confirmation', async () => {
    vi.mocked(apiGet).mockResolvedValue(current);
    vi.mocked(apiPut).mockResolvedValue({ revision: '8' });
    vi.mocked(kusConfirm).mockReturnValue(true);
    await runApplyJsConfigStandalone({ targetAppId: '5', targetGuestId: '2', jsonText: json }, vi.fn(), vi.fn());
    const text = vi.mocked(kusConfirm).mock.calls[0][0];
    expect(text).toContain('App 5（ゲスト 2）');
    expect(text).toContain('比較先の現在設定: Desktop JS 2 / CSS 0、Mobile JS 0 / CSS 1');
    expect(text).toContain('外れる現在の設定: 2件');
    expect(apiPut).toHaveBeenCalledWith('/k/guest/2/v1/preview', '/app/customize.json', expect.objectContaining({ app: '5', revision: '7' }));
  });

  it('does not PUT when the confirmation is cancelled', async () => {
    vi.mocked(apiGet).mockResolvedValue(current);
    vi.mocked(kusConfirm).mockReturnValue(false);
    await runApplyJsConfigStandalone({ targetAppId: '5', jsonText: json }, vi.fn(), vi.fn());
    expect(apiPut).not.toHaveBeenCalled();
  });

  it('reports a revision conflict from the PUT instead of overwriting', async () => {
    vi.mocked(apiGet).mockResolvedValue(current);
    vi.mocked(apiPut).mockRejectedValue(Object.assign(new Error('revision mismatch'), { code: 'GAIA_CO02' }));
    await expect(runApplyJsConfigStandalone({ targetAppId: '5', jsonText: json, skipConfirm: true }, vi.fn(), vi.fn()))
      .rejects.toMatchObject({ revisionConflict: true, message: expect.stringContaining('revision 競合') });
  });

  it('rejects a non-numeric app or guest id before any request is built', async () => {
    const jsonText = JSON.stringify({ desktop: { js: [], css: [] } });
    await expect(runApplyJsConfigStandalone({ targetAppId: '１２', jsonText, skipConfirm: true }, vi.fn(), vi.fn())).rejects.toThrow(/反映先アプリID.*数値/);
    await expect(runApplyJsConfigStandalone({ targetAppId: '5', targetGuestId: '1/../2', jsonText, skipConfirm: true }, vi.fn(), vi.fn())).rejects.toThrow(/ゲストID.*数値/);
    expect(apiGet).not.toHaveBeenCalled();
    expect(apiPut).not.toHaveBeenCalled();
  });

  it('stops before the confirmation when the target changed after the JSON was fetched (baseRevision)', async () => {
    vi.mocked(apiGet).mockResolvedValue({ ...current, revision: '9' });
    await expect(runApplyJsConfigStandalone({ targetAppId: '5', jsonText: json, baseRevision: '7' }, vi.fn(), vi.fn()))
      .rejects.toMatchObject({ revisionConflict: true, message: expect.stringContaining('revision 7') });
    expect(kusConfirm).not.toHaveBeenCalled();
    expect(apiPut).not.toHaveBeenCalled();
  });

  it('applies and reports the new revision when baseRevision still matches', async () => {
    vi.mocked(apiGet).mockResolvedValue(current);
    vi.mocked(apiPut).mockResolvedValue({ revision: '8' });
    await expect(runApplyJsConfigStandalone({ targetAppId: '5', jsonText: json, baseRevision: '7', skipConfirm: true }, vi.fn(), vi.fn()))
      .resolves.toEqual({ revision: '8' });
    expect(apiPut).toHaveBeenCalledWith('/k/v1/preview', '/app/customize.json', expect.objectContaining({ revision: '7' }));
  });

  it('rejects non-numeric targetAppId or targetGuestId before calling API', async () => {
    await expect(runApplyJsConfigStandalone({
      targetAppId: 'abc',
      jsonText: JSON.stringify({ desktop: { js: [], css: [] } }),
      skipConfirm: true
    }, vi.fn(), vi.fn())).rejects.toThrow(/半角数字/);
    expect(apiGet).not.toHaveBeenCalled();
  });
});
