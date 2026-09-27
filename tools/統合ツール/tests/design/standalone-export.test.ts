import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SECTION_DEFS } from '../../src/constants';
import { fetchBundle } from '../../src/api';
import { copyTextToClipboard, downloadText } from '../../src/utils';
import { runAdvancedDesignExporter } from '../../src/tabs/design-xlsx';
import {
  runBatchDesignExportXlsxZipStandalone,
  runDesignCopyAiMdStandalone,
  runDesignExportStandalone,
  runDesignExportXlsxStandalone,
  validateDesignExportTargets,
  validateDesignTarget
} from '../../src/tabs/design-standalone';

vi.mock('../../src/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/api')>(),
  fetchBundle: vi.fn()
}));

vi.mock('../../src/utils', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/utils')>(),
  copyTextToClipboard: vi.fn(),
  downloadText: vi.fn()
}));

vi.mock('../../src/tabs/design-xlsx', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/tabs/design-xlsx')>(),
  runAdvancedDesignExporter: vi.fn(),
  runBatchDesignExportXlsxZip: vi.fn()
}));

const emptySections = () => Object.fromEntries(SECTION_DEFS.map((section) => {
  switch (section.key) {
    case 'appSettings': return [section.key, { name: '対象アプリ' }];
    case 'fieldSettings': return [section.key, { properties: {} }];
    case 'layoutSettings': return [section.key, { layout: [] }];
    case 'viewSettings': return [section.key, { views: {} }];
    case 'reportSettings': return [section.key, { reports: {} }];
    case 'processSettings': return [section.key, { enable: false, states: {}, actions: [] }];
    case 'pluginSettings': return [section.key, { plugins: [] }];
    case 'customizeSettings': return [section.key, { desktop: { js: [], css: [] }, mobile: { js: [], css: [] } }];
    case 'actionSettings': return [section.key, { actions: [] }];
    case 'appAcl':
    case 'fieldAcl':
    case 'recordPermissions': return [section.key, { rights: [] }];
    case 'notifications':
    case 'perRecordNotifications':
    case 'reminderNotifications': return [section.key, { notifications: [] }];
    case 'categories': return [section.key, { categories: [] }];
    default: return [section.key, {}];
  }
}));

const bundle = (appId: string, sections = emptySections()) => ({
  appId,
  guestId: '77',
  preview: false,
  fetchedAt: '2026-09-26T00:00:00.000Z',
  meta: { sectionRevisions: {} },
  sections
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchBundle).mockRejectedValue(new Error('fetch should not run for this test'));
  vi.mocked(copyTextToClipboard).mockResolvedValue(true);
  vi.mocked(runAdvancedDesignExporter).mockResolvedValue(true);
});

describe('lite design export', () => {
  it('rejects an unsupported format before fetching settings', async () => {
    await expect(runDesignExportStandalone('pdf', { appId: '1' }, vi.fn())).rejects.toThrow(/md.*json.*ai-md/);
  });
  it('rejects malformed app and guest IDs before any export work', async () => {
    expect(validateDesignTarget({ appId: 'abc' })).toMatch(/アプリIDは数値/);
    expect(validateDesignTarget({ appId: '1', guestId: 'x' })).toMatch(/ゲストIDは数値/);
    await expect(runDesignExportStandalone('json', { appId: 'abc' }, vi.fn())).rejects.toThrow(/アプリIDは数値/);
    await expect(runBatchDesignExportXlsxZipStandalone({ apps: [{ appId: '1' }, { appId: 'bad' }] }, vi.fn())).rejects.toThrow(/2行目.*アプリIDは数値/);
  });
  it('does not silently drop malformed batch targets', () => {
    expect(validateDesignExportTargets([{ appId: '1' }, { appId: 'bad' }])).toMatch(/2行目.*アプリIDは数値/);
    expect(validateDesignExportTargets([{ appId: '1', guestId: 'bad' }])).toMatch(/ゲストIDは数値/);
  });

  it('uses the selected imported bundle for AI save and copy, with identical content', async () => {
    const wrapper = { apps: [bundle('101'), bundle('202', { ...emptySections(), appSettings: { name: '選択対象' } })] };
    const status = vi.fn();

    await runDesignExportStandalone('ai-md', { appId: '202', importedBundle: wrapper }, status);
    await runDesignCopyAiMdStandalone({ appId: '202', importedBundle: wrapper }, status);

    expect(fetchBundle).not.toHaveBeenCalled();
    expect(downloadText).toHaveBeenCalledTimes(1);
    const [, saved] = vi.mocked(downloadText).mock.calls[0];
    expect(saved).toContain('選択対象');
    expect(saved).not.toContain('appId: 101');
    expect(copyTextToClipboard).toHaveBeenCalledWith(saved);
    expect(vi.mocked(downloadText).mock.calls[0][0]).toMatch(/設計書_AI向けMarkdown/);
  });

  it('does not pass the imported wrapper or a different app to the Excel exporter, and forwards preview', async () => {
    const wrapper = { apps: [bundle('101'), bundle('202')] };
    const status = vi.fn();

    await runDesignExportXlsxStandalone({ appId: '202', guestId: '999', preview: true, importedBundle: wrapper }, status);

    expect(runAdvancedDesignExporter).toHaveBeenCalledTimes(1);
    const params = vi.mocked(runAdvancedDesignExporter).mock.calls[0][0];
    expect(params.appId).toBe('202');
    expect(params.preview).toBe(true);
    expect(params.bundle).toEqual(expect.objectContaining({ appId: '202' }));
    expect(params.bundle).not.toEqual(expect.objectContaining({ appId: '101', apps: expect.anything() }));
    expect(params.bundle.apps).toBeUndefined();
    expect(params.guestId).toBe('999');
    expect(params.onComplete).toBeUndefined();
  });

  it('keeps live Excel retrieval warnings in the final completion status', async () => {
    vi.mocked(runAdvancedDesignExporter).mockImplementation(async (params: any) => {
      expect(params.onComplete).toEqual(expect.any(Function));
      params.onComplete({
        source: 'live',
        complete: false,
        incompleteSectionCount: 2,
        missingSectionCount: 1,
        fetchErrorSectionCount: 1,
        partialSectionCount: 0,
        supplementalMissingCount: 1,
        supplementalIncompleteCount: 1
      });
      return true;
    });
    const status = vi.fn();

    await runDesignExportXlsxStandalone({ appId: '606', guestId: '12', preview: true }, status);

    expect(status).toHaveBeenLastCalledWith(
      '設計書Excel出力完了（未取得 1件 / 取得失敗 1件 / 補足情報未取得 1件。内容を確認してください）',
      true
    );
  });

  it('requests raw settings for live AI Markdown and records the supplement policy', async () => {
    vi.mocked(fetchBundle).mockResolvedValue(bundle('404') as any);
    const status = vi.fn();

    await runDesignExportStandalone('ai-md', { appId: '404', rawSettings: true }, status);

    expect(vi.mocked(fetchBundle).mock.calls[0][0]).toMatchObject({ appId: '404', rawSettings: true });
    const [, saved] = vi.mocked(downloadText).mock.calls[0];
    expect(saved).toContain('"designSource"');
    expect(saved).toContain('raw-settings-api');
    expect(saved).toContain('not-requested');
  });

  it('does not invent an import timestamp when the source bundle omits it', async () => {
    const imported: any = bundle('505');
    delete imported.fetchedAt;
    imported.meta.rawMarker = 'kept-from-input';

    await runDesignExportStandalone('ai-md', { appId: '505', importedBundle: imported }, vi.fn());

    const [, saved] = vi.mocked(downloadText).mock.calls[0];
    expect(saved).toContain('| `fetched_at` | `null` |');
    expect(saved).toContain('kept-from-input');
  });

  it('keeps missing, failed, and partial retrieval state in the completion notification', async () => {
    const sections = emptySections();
    delete (sections as any).viewSettings;
    (sections as any).fieldSettings = { _fetchError: '権限不足' };
    (sections as any).customizeSettings = { _partial: { message: '本文未取得' } };
    const status = vi.fn();

    await runDesignExportStandalone('ai-md', { appId: '303', importedBundle: bundle('303', sections) }, status);

    const finalStatus = status.mock.calls.at(-1)?.[0] || '';
    expect(finalStatus).toMatch(/完了/);
    expect(finalStatus).toMatch(/未取得 1件/);
    expect(finalStatus).toMatch(/取得失敗 1件/);
    expect(finalStatus).toMatch(/部分取得 1件/);
    expect(status.mock.calls.some(([message, error]) => error === true && /状態を付けて載ります/.test(message))).toBe(true);
  });
});
