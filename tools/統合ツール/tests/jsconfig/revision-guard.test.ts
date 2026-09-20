import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPut } from '../../src/api';
import { runApplyJsConfigStandalone } from '../../src/tabs/jsconfig-standalone';

vi.mock('../../src/api', async original => ({
  ...await original<typeof import('../../src/api')>(),
  apiGet: vi.fn(),
  apiPut: vi.fn()
}));

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
});
