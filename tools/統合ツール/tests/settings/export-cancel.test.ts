import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBundle } from '../../src/api';
import { downloadText, downloadBlob } from '../../src/utils';
import { RunCancelledError, RUN_CANCELLED_MESSAGE } from '../../src/runControl';
import { runSettingsExportStandalone } from '../../src/tabs/settings-export-standalone';

vi.mock('../../src/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/api')>(), fetchBundle: vi.fn() }));
vi.mock('../../src/utils', async importOriginal => ({ ...await importOriginal<typeof import('../../src/utils')>(),
  downloadText: vi.fn(), downloadBlob: vi.fn(), selectedScopeKeys: () => ['appSettings', 'fieldSettings'] }));
const zipFiles = vi.hoisted(() => new Map<string, string>());
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: async () => class {
  file(name: string, content: string) { zipFiles.set(name, content); return this; }
  async generateAsync() { return new Blob(['zip fixture']); }
} }));

const bundle = (appId: string) => ({ appId, guestId: '', preview: false, fetchedAt: '', meta: { sectionRevisions: {} },
  sections: { appSettings: { name: `対象${appId}` }, fieldSettings: { properties: {} } } });
const apps = [{ appId: '1' }, { appId: '2' }, { appId: '3' }];

beforeEach(() => { vi.clearAllMocks(); zipFiles.clear(); });

describe('settings export stops at the first cancel', () => {
  it('saves the finished app, never fetches the third and marks the rest as not run (json)', async () => {
    vi.mocked(fetchBundle).mockResolvedValueOnce(bundle('1') as any).mockRejectedValueOnce(new RunCancelledError());
    const status = vi.fn();
    const result = await runSettingsExportStandalone('json', { apps, scopeRoot: {} }, status);

    expect(fetchBundle).toHaveBeenCalledTimes(2);
    expect(downloadText).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(vi.mocked(downloadText).mock.calls[0][1]);
    expect(payload.apps.map((app: any) => app.appId)).toEqual(['1']);
    expect(payload.cancelled).toBe(true);
    expect(payload.notExecuted).toEqual([{ appId: '2', guestId: '' }, { appId: '3', guestId: '' }]);
    expect(payload.failedAppCount).toBe(0);
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('中止しました（1/3 件を処理、残り 2 件は未実行）'), true);
    expect(result.summaryHtml).toContain('未実行（中止）');
  });

  it('records not-run apps in the ZIP manifest instead of failed apps', async () => {
    vi.mocked(fetchBundle).mockResolvedValueOnce(bundle('1') as any).mockRejectedValueOnce(new RunCancelledError());
    await runSettingsExportStandalone('zip', { apps, scopeRoot: {} }, vi.fn());

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const manifest = JSON.parse(zipFiles.get('manifest.json') as string);
    expect(manifest.cancelled).toBe(true);
    expect(manifest.apps).toHaveLength(1);
    expect(manifest.notExecuted.map((target: any) => target.appId)).toEqual(['2', '3']);
    expect(manifest.failedAppCount).toBe(0);
    expect([...zipFiles.keys()].filter(name => name.endsWith('.json') && name !== 'manifest.json')).toHaveLength(1);
  });

  it('does not keep a bundle whose sections failed because of the cancel', async () => {
    const interrupted = { ...bundle('2'), sections: { appSettings: { _fetchError: RUN_CANCELLED_MESSAGE }, fieldSettings: { _fetchError: RUN_CANCELLED_MESSAGE } } };
    vi.mocked(fetchBundle).mockResolvedValueOnce(bundle('1') as any).mockResolvedValueOnce(interrupted as any);
    await runSettingsExportStandalone('json', { apps, scopeRoot: {} }, vi.fn());

    expect(fetchBundle).toHaveBeenCalledTimes(2);
    const payload = JSON.parse(vi.mocked(downloadText).mock.calls[0][1]);
    expect(payload.apps.map((app: any) => app.appId)).toEqual(['1']);
    expect(payload.notExecuted.map((target: any) => target.appId)).toEqual(['2', '3']);
  });

  it('saves nothing and reports the counts when the first app is cancelled', async () => {
    vi.mocked(fetchBundle).mockRejectedValueOnce(new RunCancelledError());
    const error: any = await runSettingsExportStandalone('json', { apps, scopeRoot: {} }, vi.fn()).catch(caught => caught);

    expect(error.message.split('\n')[0]).toBe('中止しました（0/3 件を処理、残り 3 件は未実行）');
    expect(error.message).toContain('何も保存していません');
    expect(downloadText).not.toHaveBeenCalled();
  });
});
