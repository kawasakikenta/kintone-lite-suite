import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../../src/api';
import { downloadBlob } from '../../src/utils';
import { loadJSZipLite } from '../../src/jszipLoader';
import { RunCancelledError } from '../../src/runControl';
import { runBatchJsConfigDownloadStandalone } from '../../src/tabs/jsconfig-standalone';

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
const customizeFor = (key: string) => ({ scope: 'ALL', desktop: { js: [{ type: 'FILE', file: { fileKey: key, name: `${key}.js`, size: '1' } }], css: [] }, mobile: { js: [], css: [] } });
const appsResponse = { apps: [{ appId: '5', name: 'A' }, { appId: '6', name: 'B' }, { appId: '7', name: 'C' }] };

beforeEach(() => {
  vi.clearAllMocks();
  zip = new FakeZip();
  vi.mocked(loadJSZipLite).mockResolvedValue(class { constructor() { return zip; } } as any);
  vi.stubGlobal('fetch', vi.fn(async () => new Response('console.log(1)')));
});
afterEach(() => vi.unstubAllGlobals());

describe('JS/CSS batch download stops at the first cancel', () => {
  it('stops before the third app and records the unprocessed apps in the manifest', async () => {
    vi.mocked(apiGet).mockImplementation(async (_prefix: string, path: string, params: any) => {
      if (path === '/apps.json') return appsResponse;
      if (params.app === '6') throw new RunCancelledError();
      return customizeFor(`k${params.app}`);
    });
    const status = vi.fn();
    const result = await runBatchJsConfigDownloadStandalone({ guestId: '' }, status);

    const customizeCalls = vi.mocked(apiGet).mock.calls.filter(call => call[1] === '/app/customize.json');
    expect(customizeCalls.map(call => (call[2] as any).app)).toEqual(['5', '6']);
    expect(result).toMatchObject({ apps: 3, files: 1, failed: 0 });
    expect(result.notExecuted).toEqual([{ appId: '6', name: 'B' }, { appId: '7', name: 'C' }]);
    expect(result.failedApps).toEqual([]);
    const manifest = JSON.parse(zip.files.get('manifest.json') as string);
    expect(manifest.cancelled).toBe(true);
    expect(manifest.apps.map((app: any) => app.appId)).toEqual(['5']);
    expect(manifest.notExecuted).toEqual(result.notExecuted);
    expect(zip.files.get('download_errors.txt')).toContain('未実行（中止） 2アプリ');
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('中止しました（1/3 件を処理、残り 2 件は未実行）'), true);
  });

  it('drops the app interrupted while downloading its files so no half-filled folder is saved', async () => {
    vi.mocked(apiGet).mockImplementation(async (_prefix: string, path: string, params: any) => path === '/apps.json' ? appsResponse : customizeFor(`k${params.app}`));
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('k6')) throw new RunCancelledError();
      return new Response('x');
    }));
    const result = await runBatchJsConfigDownloadStandalone({ guestId: '' }, vi.fn());

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.notExecuted?.map(app => app.appId)).toEqual(['6', '7']);
    expect(result.failedFiles).toEqual([]);
    expect([...zip.files.keys()].some(name => name.startsWith('6_'))).toBe(false);
    expect((JSON.parse(zip.files.get('manifest.json') as string)).apps.map((app: any) => app.appId)).toEqual(['5']);
  });

  it('does not create a ZIP when the first app is cancelled', async () => {
    vi.mocked(apiGet).mockImplementation(async (_prefix: string, path: string) => {
      if (path === '/apps.json') return appsResponse;
      throw new RunCancelledError();
    });
    const error: any = await runBatchJsConfigDownloadStandalone({ guestId: '' }, vi.fn()).catch(caught => caught);

    expect(error.message.split('\n')[0]).toBe('中止しました（0/3 件を処理、残り 3 件は未実行）');
    expect(error.message).toContain('ZIP は保存していません');
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});
