import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBundle } from '../../src/api';
import { runSettingsExportStandalone } from '../../src/tabs/settings-export-standalone';
import { parseDiffBatchFolderImport } from '../../src/diff/batch-folder-import';

vi.mock('../../src/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/api')>(), fetchBundle: vi.fn() }));
vi.mock('../../src/utils', async importOriginal => ({ ...await importOriginal<typeof import('../../src/utils')>(),
  downloadText: vi.fn(), downloadBlob: vi.fn(), selectedScopeKeys: () => ['appSettings', 'fieldSettings'] }));
const zipFiles = vi.hoisted(() => new Map<string, string>());
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: async () => class {
  file(name: string, content: string) { zipFiles.set(name, content); return this; }
  async generateAsync() { return new Blob(['zip fixture']); }
} }));

beforeEach(() => { vi.clearAllMocks(); zipFiles.clear(); });
describe('settings export ZIP is readable by the folder import', () => {
  it.each([false, true])('imports every exported file without issues (preview=%s)', async preview => {
    vi.mocked(fetchBundle).mockImplementation(async ({ appId, guestId }: any) => ({ appId, guestId: guestId || '', preview, fetchedAt: '2026-09-14T00:00:00.000Z', meta: { sectionRevisions: {} },
      sections: appId === '3'
        ? { appSettings: { _fetchError: '権限不足' }, fieldSettings: { _fetchError: '権限不足' } }
        : { appSettings: { name: appId === '1' ? 'A/B:顧客?' : '' }, fieldSettings: { properties: {} } } }));
    await runSettingsExportStandalone('zip', { preview, apps: [{ appId: '1' }, { appId: '1', guestId: '9' }, { appId: '3' }] }, vi.fn());
    const files = [...zipFiles].map(([name, text]) => ({ name, relativePath: `設定一括取得/${name}`, text }));
    const result = parseDiffBatchFolderImport(files);
    expect(result.issues).toEqual([]);
    expect(result.bundles).toHaveLength(3);
    expect(result.manifestFileCount).toBe(1);
    expect(result.bundles.map(item => `${item.appId}:${item.guestId}:${item.preview}`)).toEqual([`1::${preview}`, `1:9:${preview}`, `3::${preview}`]);
    expect([...zipFiles.keys()].every(name => !/[\\/:*?"<>|]/.test(name))).toBe(true);
  });
});
