import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../../src/api';
import { downloadBlob } from '../../src/utils';
import { loadJSZipLite } from '../../src/jszipLoader';
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
    expect(manifest.appCount).toBe(1);
    expect(manifest.fileCount).toBe(1);
    expect(manifest.apps).toEqual([{ appId: '5', name: '案件/管理', folder: '5_案件_管理', scope: 'ALL',
      files: [{ entry: '5_案件_管理/app.js', area: 'desktop', kind: 'js', name: 'app.js', fileKey: 'k1', size: '10' }] }]);
    expect(manifest.failedFiles).toEqual([{ appId: '5', fileName: 'app.js', reason: '閲覧権限なし (HTTP 403)' }]);
    expect(zip.files.has('5_案件_管理/app.js')).toBe(true);
    expect(zip.files.get('download_errors.txt')).toContain('403');
    expect(downloadBlob).toHaveBeenCalledTimes(1);
  });
});
