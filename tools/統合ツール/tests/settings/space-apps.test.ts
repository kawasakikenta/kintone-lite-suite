import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAppsInSpace } from '../../src/api';
import { runSettingsExportListSpaceAppsStandalone } from '../../src/tabs/settings-export-standalone';

vi.mock('../../src/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/api')>(), fetchAppsInSpace: vi.fn() }));

beforeEach(() => { vi.clearAllMocks(); });
describe('settings export space app listing', () => {
  it.each([
    { space: 'abc', guest: '' },
    { space: '5', guest: 'abc' },
    { space: '5', guest: '1/2' }
  ])('rejects non-numeric space/guest IDs before calling the API', async ({ space, guest }) => {
    await expect(runSettingsExportListSpaceAppsStandalone(space, guest, vi.fn())).rejects.toThrow(/半角数字/);
    expect(fetchAppsInSpace).not.toHaveBeenCalled();
  });
  it('lists apps for a numeric guest space and reports an empty space as an error status', async () => {
    vi.mocked(fetchAppsInSpace).mockResolvedValueOnce([{ appId: '3', name: 'A', spaceId: '5' }]).mockResolvedValueOnce([]);
    const status = vi.fn();
    await expect(runSettingsExportListSpaceAppsStandalone('5', '7', status)).resolves.toEqual([{ appId: '3', name: 'A' }]);
    expect(fetchAppsInSpace).toHaveBeenCalledWith('5', '7');
    await expect(runSettingsExportListSpaceAppsStandalone('5', '', status)).resolves.toEqual([]);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('取得対象アプリがありませんでした'), true);
  });
});
