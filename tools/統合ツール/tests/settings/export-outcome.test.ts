import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBundle } from '../../src/api';
import { downloadText, downloadBlob } from '../../src/utils';
import { runSettingsExportStandalone } from '../../src/tabs/settings-export-standalone';

vi.mock('../../src/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/api')>(), fetchBundle: vi.fn() }));
vi.mock('../../src/utils', async importOriginal => ({ ...await importOriginal<typeof import('../../src/utils')>(),
  downloadText: vi.fn(), downloadBlob: vi.fn(), selectedScopeKeys: () => ['appSettings', 'fieldSettings'] }));
const zipFiles = vi.hoisted(() => new Map<string, string>());
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: async () => class {
  file(name: string, content: string) { zipFiles.set(name, content); return this; }
  async generateAsync() { return new Blob(['zip fixture']); }
} }));

beforeEach(() => { vi.clearAllMocks(); zipFiles.clear(); });
describe('settings export completion', () => {
  it.each([
    { apps: [{ appId: '1' }, { appId: 'invalid' }] },
    { apps: [{ appId: '1', guestId: 'invalid' }] },
    { appIdsText: '1,invalid' }
  ])('rejects invalid targets before fetching or downloading', async opts => {
    await expect(runSettingsExportStandalone('json', opts, vi.fn())).rejects.toThrow(/数値/);
    expect(fetchBundle).not.toHaveBeenCalled();
    expect(downloadText).not.toHaveBeenCalled();
  });
  it.each(['json', 'zip'])('keeps a partial-fetch warning after saving %s', async mode => {
    vi.mocked(fetchBundle).mockResolvedValue({ appId: '1', guestId: '', preview: false, fetchedAt: '', meta: { sectionRevisions: {} },
      sections: { appSettings: { name: '対象' }, fieldSettings: { _fetchError: '権限不足' } } });
    const status = vi.fn();
    const result = await runSettingsExportStandalone(mode, { apps: [{ appId: '1' }], scopeRoot: {} }, status);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('1アプリ・1セクションの取得に失敗'), true);
    expect(result.summaryHtml).toContain('一部セクション取得失敗あり');
    expect(mode === 'json' ? downloadText : downloadBlob).toHaveBeenCalledTimes(1);
    if (mode === 'json') {
      const payload = JSON.parse(vi.mocked(downloadText).mock.calls[0][1]);
      expect(payload.apps[0].sections.fieldSettings._fetchError).toBe('権限不足');
    }
  });
  it('reports success only when all selected sections were fetched', async () => {
    vi.mocked(fetchBundle).mockResolvedValue({ appId: '1', guestId: '', preview: false, fetchedAt: '', meta: { sectionRevisions: {} },
      sections: { appSettings: { name: '対象' }, fieldSettings: { properties: {} } } });
    const status = vi.fn();
    await runSettingsExportStandalone('json', { apps: [{ appId: '1' }] }, status);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('保存しました'), false);
  });
  it('ZIP の manifest.json にアプリごとのファイル名・アプリ名・失敗セクションを記録する', async () => {
    vi.mocked(fetchBundle).mockResolvedValue({ appId: '1', guestId: '', preview: false, fetchedAt: '2026-09-14T00:00:00.000Z', meta: { sectionRevisions: {} },
      sections: { appSettings: { name: '対象アプリ' }, fieldSettings: { _fetchError: '権限不足' } } });
    await runSettingsExportStandalone('zip', { apps: [{ appId: '1', guestId: '7' }], scopeRoot: {} }, vi.fn());
    const manifest = JSON.parse(zipFiles.get('manifest.json')!);
    expect(manifest.environment).toBe('production');
    expect(manifest.scopeLabels).toEqual(['アプリ設定', 'フィールド設定']);
    expect(manifest.appCount).toBe(1);
    expect(manifest.failedAppCount).toBe(1);
    expect(manifest.apps[0]).toMatchObject({ appId: '1', appName: '対象アプリ', guestId: '7', fetchedAt: '2026-09-14T00:00:00.000Z', sections: { ok: 1, ng: 1 } });
    expect(manifest.apps[0].file).toMatch(/_ゲスト7_本番\.json$/);
    expect(manifest.apps[0].failedSections).toEqual([{ key: 'fieldSettings', label: 'フィールド設定', error: '権限不足' }]);
    expect(zipFiles.has(manifest.apps[0].file)).toBe(true);
  });
});
