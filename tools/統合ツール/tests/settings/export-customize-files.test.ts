import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBundle } from '../../src/api';
import { downloadBlob, downloadText } from '../../src/utils';
import { RunCancelledError } from '../../src/runControl';
import { downloadCustomizeFile } from '../../src/reflect/customizeFiles';
import { runSettingsExportStandalone } from '../../src/tabs/settings-export-standalone';

const scopes = vi.hoisted(() => ({ keys: [] as string[] }));
vi.mock('../../src/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/api')>(), fetchBundle: vi.fn() }));
vi.mock('../../src/utils', async importOriginal => ({ ...await importOriginal<typeof import('../../src/utils')>(),
  downloadText: vi.fn(), downloadBlob: vi.fn(), selectedScopeKeys: () => scopes.keys }));
vi.mock('../../src/reflect/customizeFiles', async importOriginal => ({ ...await importOriginal<typeof import('../../src/reflect/customizeFiles')>(), downloadCustomizeFile: vi.fn() }));
const zipFiles = vi.hoisted(() => new Map<string, unknown>());
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: async () => class {
  file(name: string, content: unknown) { zipFiles.set(name, content); return this; }
  async generateAsync() { return new Blob(['zip fixture']); }
} }));

const file = (name: string, fileKey: string) => ({ type: 'FILE', file: { name, fileKey, size: '10', contentType: 'text/javascript' } });
const customize = {
  scope: 'ALL',
  desktop: {
    js: [{ type: 'URL', url: 'https://cdn.example/lib.js' }, file('main.js', 'k-main'), file('Main.js', 'k-main2')],
    css: [file('style.css', 'k-style')]
  },
  mobile: { js: [file('main.js', 'k-main')], css: [] }
};
const bundle = (appId: string, sections: Record<string, unknown> = { customizeSettings: customize }) =>
  ({ appId, guestId: '', preview: false, fetchedAt: '', meta: { sectionRevisions: {} }, sections: { appSettings: { name: '顧客管理' }, ...sections } });
const zipPaths = () => [...zipFiles.keys()].filter(name => name.includes('_JS_CSS/')).sort();
const manifest = () => JSON.parse(zipFiles.get('manifest.json') as string);

beforeEach(() => {
  vi.clearAllMocks();
  zipFiles.clear();
  scopes.keys = ['appSettings', 'customizeSettings'];
  vi.mocked(downloadCustomizeFile).mockImplementation(async (_guestId, fileKey) => new Blob([`/* ${fileKey} */`]));
});

describe('settings export with JS/CSS files', () => {
  it('saves the files per PC/mobile and JS/CSS folder, keeping same-named files apart', async () => {
    vi.mocked(fetchBundle).mockResolvedValue(bundle('1') as any);
    const status = vi.fn();
    const { summaryHtml } = await runSettingsExportStandalone('zip', { apps: [{ appId: '1' }], includeCustomizeFiles: true }, status);

    expect(zipPaths()).toEqual([
      '顧客管理(app1)_本番_JS_CSS/desktop/css/style.css',
      '顧客管理(app1)_本番_JS_CSS/desktop/js/Main_2.js',
      '顧客管理(app1)_本番_JS_CSS/desktop/js/main.js',
      '顧客管理(app1)_本番_JS_CSS/mobile/js/main.js'
    ]);
    // 同じ fileKey は PC とモバイルで 1 回だけ取得する
    expect(downloadCustomizeFile).toHaveBeenCalledTimes(3);
    expect(zipFiles.has('顧客管理(app1)_本番.json')).toBe(true);
    const app = manifest().apps[0];
    expect(manifest().customizeFiles).toMatchObject({ layout: 'slot', saved: 4, failed: 0 });
    expect(app.customizeFiles.folder).toBe('顧客管理(app1)_本番_JS_CSS');
    // URL 指定は保存しないが、読み込み順には数える
    expect(app.customizeFiles.files[0]).toMatchObject({ platform: 'desktop', kind: 'js', order: 2, name: 'main.js', fileKey: 'k-main', path: '顧客管理(app1)_本番_JS_CSS/desktop/js/main.js' });
    expect(summaryHtml).toContain('JS/CSSファイル 4件を保存');
    expect(status).toHaveBeenLastCalledWith('設定一括取得ZIPを保存しました（1アプリ・JS/CSSファイル 4件）', false);
    expect(downloadBlob).toHaveBeenCalledTimes(1);
  });

  it('puts the files directly in the app folder when no subfolders are chosen', async () => {
    vi.mocked(fetchBundle).mockResolvedValue(bundle('1') as any);
    await runSettingsExportStandalone('zip', { apps: [{ appId: '1' }], includeCustomizeFiles: true, customizeFileLayout: 'app' }, vi.fn());

    expect(zipPaths()).toEqual([
      '顧客管理(app1)_本番_JS_CSS/Main_2.js',
      '顧客管理(app1)_本番_JS_CSS/main.js',
      '顧客管理(app1)_本番_JS_CSS/main_3.js',
      '顧客管理(app1)_本番_JS_CSS/style.css'
    ]);
    expect(manifest().customizeFiles.layout).toBe('app');
  });

  it('prefixes the slot and load order when the ordered layout is chosen', async () => {
    vi.mocked(fetchBundle).mockResolvedValue(bundle('1') as any);
    await runSettingsExportStandalone('zip', { apps: [{ appId: '1' }], includeCustomizeFiles: true, customizeFileLayout: 'ordered' }, vi.fn());

    expect(zipPaths()).toEqual([
      '顧客管理(app1)_本番_JS_CSS/desktop_css_01_style.css',
      '顧客管理(app1)_本番_JS_CSS/desktop_js_02_main.js',
      '顧客管理(app1)_本番_JS_CSS/desktop_js_03_Main.js',
      '顧客管理(app1)_本番_JS_CSS/mobile_js_01_main.js'
    ]);
  });

  it('keeps the other files and reports the files it could not fetch', async () => {
    vi.mocked(fetchBundle).mockResolvedValue(bundle('1') as any);
    vi.mocked(downloadCustomizeFile).mockImplementation(async (_guestId, fileKey) => {
      if (fileKey === 'k-style') throw new Error('ファイルを取得できません（HTTP 403）');
      return new Blob(['x']);
    });
    const status = vi.fn();
    const { summaryHtml } = await runSettingsExportStandalone('zip', { apps: [{ appId: '1' }], includeCustomizeFiles: true }, status);

    expect(zipPaths()).toHaveLength(3);
    const failed = manifest().apps[0].customizeFiles.files.find((item: any) => item.name === 'style.css');
    expect(failed).toMatchObject({ path: '', error: 'ファイルを取得できません（HTTP 403）' });
    expect(manifest().customizeFiles).toMatchObject({ saved: 3, failed: 1 });
    expect(summaryHtml).toContain('JS/CSSファイル 4件中 3件を保存。失敗 1件（style.css: ファイルを取得できません（HTTP 403））');
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('JS/CSSファイル 1件は取得できませんでした'), true);
  });

  it('does not keep an app whose files were cut off by the cancel', async () => {
    vi.mocked(fetchBundle).mockResolvedValueOnce(bundle('1') as any).mockResolvedValueOnce({ ...bundle('2'), sections: { appSettings: { name: '案件管理' }, customizeSettings: customize } } as any);
    let calls = 0;
    vi.mocked(downloadCustomizeFile).mockImplementation(async () => {
      calls += 1;
      if (calls === 4) throw new RunCancelledError();
      return new Blob(['x']);
    });
    const status = vi.fn();
    await runSettingsExportStandalone('zip', { apps: [{ appId: '1' }, { appId: '2' }, { appId: '3' }], includeCustomizeFiles: true }, status);

    expect(fetchBundle).toHaveBeenCalledTimes(2);
    expect(manifest().apps.map((app: any) => app.appId)).toEqual(['1']);
    expect(manifest().notExecuted.map((target: any) => target.appId)).toEqual(['2', '3']);
    expect(zipPaths().every(path => path.startsWith('顧客管理(app1)'))).toBe(true);
    expect(zipFiles.has('案件管理(app2)_本番.json')).toBe(false);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('中止しました（1/3 件を処理、残り 2 件は未実行）'), true);
  });

  it('saves the settings when the JS/CSS settings themselves could not be fetched', async () => {
    vi.mocked(fetchBundle).mockResolvedValue(bundle('1', { customizeSettings: { _fetchError: '権限がありません' } }) as any);
    const { summaryHtml } = await runSettingsExportStandalone('zip', { apps: [{ appId: '1' }], includeCustomizeFiles: true }, vi.fn());

    expect(zipPaths()).toEqual([]);
    expect(downloadCustomizeFile).not.toHaveBeenCalled();
    expect(manifest().apps[0].customizeFiles).toMatchObject({ saved: 0, failed: 0, files: [] });
    expect(summaryHtml).toContain('一部セクション取得失敗あり: JS/CSS設定');
  });

  it('rejects the JSON format, a missing JS/CSS section and an unknown layout before fetching', async () => {
    await expect(runSettingsExportStandalone('json', { apps: [{ appId: '1' }], includeCustomizeFiles: true }, vi.fn())).rejects.toThrow('JS/CSSファイルはZIPにだけ保存できます');
    scopes.keys = ['appSettings'];
    await expect(runSettingsExportStandalone('zip', { apps: [{ appId: '1' }], includeCustomizeFiles: true }, vi.fn())).rejects.toThrow('「JS/CSS設定」を含めてください');
    scopes.keys = ['customizeSettings'];
    await expect(runSettingsExportStandalone('zip', { apps: [{ appId: '1' }], includeCustomizeFiles: true, customizeFileLayout: 'nested' }, vi.fn())).rejects.toThrow('フォルダ分けの指定が正しくありません');
    expect(fetchBundle).not.toHaveBeenCalled();
    expect(downloadText).not.toHaveBeenCalled();
  });

  it('leaves the ZIP unchanged when the files are not requested', async () => {
    vi.mocked(fetchBundle).mockResolvedValue(bundle('1') as any);
    await runSettingsExportStandalone('zip', { apps: [{ appId: '1' }] }, vi.fn());

    expect(zipPaths()).toEqual([]);
    expect(downloadCustomizeFile).not.toHaveBeenCalled();
    expect(manifest().customizeFiles).toBeUndefined();
    expect(manifest().apps[0].customizeFiles).toBeUndefined();
  });
});
