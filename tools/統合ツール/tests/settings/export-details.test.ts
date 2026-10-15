import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBundle } from '../../src/api';
import { downloadText } from '../../src/utils';
import { runSettingsExportStandalone } from '../../src/tabs/settings-export-standalone';

const scopes = vi.hoisted(() => ({ keys: [] as string[] }));
vi.mock('../../src/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/api')>(), fetchBundle: vi.fn() }));
vi.mock('../../src/utils', async importOriginal => ({ ...await importOriginal<typeof import('../../src/utils')>(),
  downloadText: vi.fn(), downloadBlob: vi.fn(), selectedScopeKeys: () => scopes.keys }));
const zipFiles = vi.hoisted(() => new Map<string, string>());
const zipLoader = vi.hoisted(() => ({ fail: false }));
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: async () => {
  if (zipLoader.fail) throw new Error('JSZipの読み込みに失敗しました');
  return class {
    file(name: string, content: string) { zipFiles.set(name, content); return this; }
    async generateAsync() { return new Blob(['zip fixture']); }
  };
} }));

const bundle = (sections: Record<string, unknown>) => ({ appId: '1', guestId: '', preview: false, fetchedAt: '', meta: { sectionRevisions: {} }, sections });
beforeEach(() => { vi.clearAllMocks(); zipFiles.clear(); zipLoader.fail = false; scopes.keys = ['appSettings', 'fieldSettings']; });

describe('settings export result details', () => {
  it('lists the failed sections and the first failure reason in the result table', async () => {
    vi.mocked(fetchBundle)
      .mockResolvedValueOnce(bundle({ appSettings: { name: 'A' }, fieldSettings: { _fetchError: '権限がありません\n[API] GET /k/v1/app/form/fields.json app=1' } }))
      .mockResolvedValueOnce({ ...bundle({ appSettings: { _fetchError: 'アプリが見つかりません\n[API] GET /k/v1/app/settings.json' }, fieldSettings: { _fetchError: 'x' } }), appId: '2' });
    const { summaryHtml } = await runSettingsExportStandalone('json', { apps: [{ appId: '1' }, { appId: '2' }] }, vi.fn());
    expect(summaryHtml).toContain('一部セクション取得失敗あり: フィールド設定');
    expect(summaryHtml).toContain('アプリ取得失敗: アプリが見つかりません');
    expect(summaryHtml).not.toContain('[API]');
  });
  it('does not report omitted JS/CSS bodies as a plain success', async () => {
    scopes.keys = ['customizeSettings'];
    vi.mocked(fetchBundle).mockResolvedValue(bundle({ customizeSettings: { desktop: { js: [] }, _partial: { kind: 'customizeBody', files: [{ fileName: 'big.js', reason: 'oversize' }, { fileName: 'a.png', reason: 'unsupported' }] } } }));
    const status = vi.fn();
    const { summaryHtml } = await runSettingsExportStandalone('json', { apps: [{ appId: '1' }] }, status);
    expect(summaryHtml).toContain('JS/CSS本文を省略したファイル 2件');
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('JS/CSSファイル 2件は本文を取得できず'), true);
    expect(downloadText).toHaveBeenCalledTimes(1);
  });
  it('stops before fetching any app when the ZIP library cannot be loaded', async () => {
    zipLoader.fail = true;
    await expect(runSettingsExportStandalone('zip', { apps: [{ appId: '1' }, { appId: '2' }] }, vi.fn())).rejects.toThrow(/JSZip/);
    expect(fetchBundle).not.toHaveBeenCalled();
    zipLoader.fail = false;
    vi.mocked(fetchBundle).mockResolvedValue(bundle({ appSettings: { name: 'A' }, fieldSettings: {} }));
    await runSettingsExportStandalone('json', { apps: [{ appId: '1' }] }, vi.fn());
    expect(downloadText).toHaveBeenCalledTimes(1);
  });
  it('falls back to the app info name for file names and manifest when app settings are not selected', async () => {
    scopes.keys = ['appInfo'];
    vi.mocked(fetchBundle).mockResolvedValue(bundle({ appInfo: { name: '顧客管理' } }));
    await runSettingsExportStandalone('zip', { apps: [{ appId: '1' }] }, vi.fn());
    const manifest = JSON.parse(zipFiles.get('manifest.json')!);
    expect(manifest.apps[0].appName).toBe('顧客管理');
    expect(manifest.apps[0].file).toBe('顧客管理(app1)_本番.json');
    expect(zipFiles.has('顧客管理(app1)_本番.json')).toBe(true);
  });
});
