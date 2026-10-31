import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../../src/api';
import { downloadBlob } from '../../src/utils';
import { loadJSZipLite } from '../../src/jszipLoader';
import { buildJsConfigBatchIndexMarkdown, runBatchJsConfigDownloadStandalone } from '../../src/tabs/jsconfig-standalone';

vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn() }));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), downloadBlob: vi.fn() }));
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: vi.fn() }));

class FakeZip {
  files = new Map<string, unknown>();
  file(path: string, value: unknown) { this.files.set(path, value); return this; }
  folder(path: string) { return { file: (name: string, value: unknown) => this.file(`${path}/${name}`, value) }; }
  async generateAsync() { return new Blob(['zip']); }
}
let zip: FakeZip;
const customize = {
  scope: 'ALL',
  desktop: { js: [{ type: 'FILE', file: { fileKey: 'k1', name: 'app.js', size: '10' } }, { type: 'URL', url: 'https://example.invalid/x.js' }], css: [] },
  mobile: { js: [], css: [{ type: 'FILE', file: { fileKey: 'k2', name: 'app.js', size: '4' } }] }
};

beforeEach(() => {
  vi.clearAllMocks();
  zip = new FakeZip();
  vi.mocked(loadJSZipLite).mockResolvedValue(class { constructor() { return zip; } });
  vi.mocked(apiGet).mockImplementation(async (_prefix: string, path: string) => {
    if (path === '/apps.json') return { apps: [{ appId: '5', name: '案件/管理' }, { appId: '6', name: 'なし' }] };
    return customize;
  });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('k2') ? new Response('', { status: 403 }) : new Response('console.log(1)')));
});
afterEach(() => vi.unstubAllGlobals());

describe('JS/CSS batch download manifest', () => {
  it('records the source slot of every file, failures, and skips URL entries', async () => {
    vi.mocked(apiGet).mockImplementationOnce(async () => ({ apps: [{ appId: '5', name: '案件/管理' }] }));
    const result = await runBatchJsConfigDownloadStandalone({ guestId: '' }, vi.fn());
    expect(result).toMatchObject({ apps: 1, files: 1, failed: 1 });
    const manifest = JSON.parse(zip.files.get('manifest.json') as string);
    expect(manifest.formatVersion).toBe(1);
    expect(manifest.exportedAt).toBe(manifest.generatedAt);
    expect(manifest.appCount).toBe(1);
    expect(manifest.fileCount).toBe(1);
    expect(manifest.apps).toEqual([{
      appId: '5',
      name: '案件/管理',
      folder: '5_案件_管理',
      scope: 'ALL',
      revision: '',
      files: [{ entry: '5_案件_管理/app.js', area: 'desktop', kind: 'js', order: 0, name: 'app.js', fileKey: 'k1', size: '10' }],
      urlEntries: [{ type: 'js', scope: 'desktop', url: 'https://example.invalid/x.js', order: 1 }],
      failures: [{ appId: '5', fileName: 'app.js', reason: '閲覧権限なし (HTTP 403)' }]
    }]);
    expect(manifest.failures).toEqual([{ type: 'file', appId: '5', fileName: 'app.js', reason: '閲覧権限なし (HTTP 403)' }]);
    const indexMd = zip.files.get('INDEX.md') as string;
    expect(indexMd).toContain('# JS/CSS設定 一括取得 INDEX');
    expect(indexMd).toContain('https://example.invalid/x.js');
    expect(indexMd).toContain('5_案件_管理/app.js');
    expect(buildJsConfigBatchIndexMarkdown(manifest)).toBe(indexMd);
    expect(manifest.fileCount).toBe(1);


    expect(manifest.failedFiles).toEqual([{ appId: '5', fileName: 'app.js', reason: '閲覧権限なし (HTTP 403)' }]);
    expect(zip.files.has('5_案件_管理/app.js')).toBe(true);
    expect(zip.files.get('download_errors.txt')).toContain('403');
    expect(downloadBlob).toHaveBeenCalledTimes(1);
  });

  it('includes URL-only apps in the index when another app contributes downloadable files', async () => {
    vi.mocked(apiGet).mockImplementation(async (_prefix: string, path: string, params?: { app?: string }) => {
      if (path === '/apps.json') return { apps: [{ appId: '5', name: 'ファイルあり' }, { appId: '6', name: 'URLのみ' }] };
      if (params?.app === '5') return customize;
      return {
        scope: 'ALL',
        desktop: { js: [{ type: 'URL', url: 'https://example.invalid/only.js' }], css: [] },
        mobile: { js: [], css: [] }
      };
    });

    const result = await runBatchJsConfigDownloadStandalone({}, vi.fn());
    expect(result).toMatchObject({ apps: 2, files: 1, failed: 1 });
    const manifest = JSON.parse(zip.files.get('manifest.json') as string);
    expect(manifest.appCount).toBe(2);
    expect(manifest.apps).toHaveLength(2);
    expect(manifest.apps[1]).toMatchObject({
      appId: '6',
      name: 'URLのみ',
      folder: '',
      files: [],
      urlEntries: [{ type: 'js', scope: 'desktop', url: 'https://example.invalid/only.js', order: 0 }]
    });
    expect(zip.files.get('INDEX.md')).toContain('https://example.invalid/only.js');
    expect([...zip.files.keys()].some((path) => path.startsWith('6_'))).toBe(false);
  });

  it('throws the failure details instead of a bare count when no ZIP can be made', async () => {
    vi.mocked(apiGet).mockImplementation(async (_prefix: string, path: string) => {
      if (path === '/apps.json') return { apps: [{ appId: '5', name: 'A' }, { appId: '6', name: 'B' }] };
      if (path === '/app/customize.json') throw new Error('権限がありません');
      return customize;
    });
    const status = vi.fn();
    await expect(runBatchJsConfigDownloadStandalone({}, status)).rejects.toThrow(/app 5 A: customize\.json 取得失敗: 権限がありません\napp 6 B/);
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('is not an error when there are simply no FILE entries', async () => {
    vi.mocked(apiGet).mockImplementation(async (_prefix: string, path: string) =>
      path === '/apps.json' ? { apps: [{ appId: '5', name: 'A' }] } : { desktop: { js: [{ type: 'URL', url: 'https://x' }], css: [] }, mobile: { js: [], css: [] } });
    const status = vi.fn();
    await expect(runBatchJsConfigDownloadStandalone({}, status)).resolves.toMatchObject({ files: 0, failed: 0 });
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('対象ファイルがありません'));
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric guest id before listing apps', async () => {
    await expect(runBatchJsConfigDownloadStandalone({ guestId: '1/x' }, vi.fn())).rejects.toThrow(/ゲストスペースIDは半角数字/);
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('keeps names that differ only by case and dot-only names from colliding or escaping the folder', async () => {
    vi.mocked(apiGet).mockImplementation(async (_prefix: string, path: string) => path === '/apps.json'
      ? { apps: [{ appId: '5', name: '..' }] }
      : { desktop: { js: [{ type: 'FILE', file: { fileKey: 'a', name: 'App.js' } }, { type: 'FILE', file: { fileKey: 'b', name: '..' } }], css: [] },
        mobile: { js: [{ type: 'FILE', file: { fileKey: 'c', name: 'app.js' } }], css: [] } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x')));
    await runBatchJsConfigDownloadStandalone({}, vi.fn());
    const manifest = JSON.parse(zip.files.get('manifest.json') as string);
    expect(manifest.apps[0].folder).toBe('5_app5');
    expect(manifest.apps[0].files.map((f: any) => f.entry)).toEqual(['5_app5/App.js', '5_app5/file.bin', '5_app5/app_2.js']);
    expect([...zip.files.keys()].some(k => k.includes('..'))).toBe(false);
  });
});
