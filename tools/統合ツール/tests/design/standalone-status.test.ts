import { beforeEach, describe, expect, it, vi } from 'vitest';

const downloads: Array<{ name: string; text: string }> = [];
vi.mock('../../src/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/utils')>()),
  downloadText: (name: string, text: string) => { downloads.push({ name, text }); }
}));

const xlsxMock = vi.hoisted(() => ({
  runAdvancedDesignExporter: vi.fn(),
  runBatchDesignExportXlsxZip: vi.fn()
}));
vi.mock('../../src/tabs/design-xlsx', () => xlsxMock);

import {
  runBatchDesignExportXlsxZipStandalone,
  runDesignDiffMdStandalone,
  runDesignExportStandalone,
  runDesignExportXlsxStandalone
} from '../../src/tabs/design-standalone';

function bundle(sections: Record<string, any>, appId = '1') {
  return { appId, guestId: '', preview: false, fetchedAt: '2026-01-01T00:00:00.000Z', meta: { sectionRevisions: {} }, sections };
}

describe('設計書の完了メッセージ', () => {
  beforeEach(() => {
    downloads.length = 0;
    xlsxMock.runAdvancedDesignExporter.mockReset();
    xlsxMock.runBatchDesignExportXlsxZip.mockReset();
  });

  it('設定JSONに含まれないセクションは取得失敗として扱い、完了メッセージもエラー扱いで残す', async () => {
    const setStatus = vi.fn();
    await runDesignExportStandalone('md', { appId: '1', importedBundle: bundle({ appSettings: { name: 'A' } }) }, setStatus);
    const [message, isError] = setStatus.mock.calls[setStatus.mock.calls.length - 1];
    expect(isError).toBe(true);
    expect(message).toMatch(/設計書出力完了（App 1）。取得できなかったセクション \d+件（.*フィールド設定.*）は設計書に「取得失敗」/);
    expect(downloads[0].text).toContain('> ⚠ 取得できませんでした: 読み込んだ設定JSONに比較対象セクションが含まれていません');
  });

  it('全セクションがそろっていれば通常の完了メッセージ', async () => {
    const { SECTION_DEFS } = await import('../../src/constants');
    const sections = Object.fromEntries(SECTION_DEFS.map((d) => {
      switch (d.key) {
        case 'appSettings': return [d.key, { name: 'A' }];
        case 'fieldSettings': return [d.key, { properties: {} }];
        case 'layoutSettings': return [d.key, { layout: [] }];
        case 'viewSettings': return [d.key, { views: {} }];
        case 'reportSettings': return [d.key, { reports: {} }];
        case 'processSettings': return [d.key, { enable: false, states: {}, actions: [] }];
        case 'pluginSettings': return [d.key, { plugins: [] }];
        case 'customizeSettings': return [d.key, { desktop: { js: [], css: [] }, mobile: { js: [], css: [] } }];
        case 'actionSettings': return [d.key, { actions: [] }];
        case 'appAcl':
        case 'fieldAcl':
        case 'recordPermissions': return [d.key, { rights: [] }];
        case 'notifications':
        case 'perRecordNotifications':
        case 'reminderNotifications': return [d.key, { notifications: [] }];
        case 'categories': return [d.key, { categories: [] }];
        default: return [d.key, {}];
      }
    }));
    const setStatus = vi.fn();
    await runDesignExportStandalone('json', { appId: '1', importedBundle: bundle(sections) }, setStatus);
    expect(setStatus).toHaveBeenLastCalledWith('設計書出力完了（App 1）', false);
  });

  it('差分レポートは取得できなかったセクションを表と完了メッセージに残す', async () => {
    const setStatus = vi.fn();
    await runDesignDiffMdStandalone({
      source: { appId: '1', importedBundle: bundle({ appSettings: { name: 'A' } }, '1') },
      target: { appId: '2', importedBundle: bundle({ appSettings: { name: 'B' } }, '2') }
    }, setStatus);
    expect(downloads[0].text).toContain('| 取得できなかったセクション（差分が不完全） | 比較元: ');
    const [message, isError] = setStatus.mock.calls[setStatus.mock.calls.length - 1];
    expect(isError).toBe(true);
    expect(message).toContain('差分は不完全です');
  });

  it('Excel は選択した取得環境を渡し、API 取得失敗があれば完了メッセージに残す', async () => {
    xlsxMock.runAdvancedDesignExporter.mockImplementation(async (params: any) => {
      params.onFinish({ failedAPIs: [{ name: 'ビュー設定', error: '403' }, { name: 'ビュー設定', error: '403' }] });
      return true;
    });
    const setStatus = vi.fn();
    // 取得失敗がある部分成功は、要点を警告で出し内訳をログへ残すため partialSuccess 付きの例外で返す
    const error: any = await runDesignExportXlsxStandalone({ appId: '5', guestId: '2', preview: true }, setStatus).catch(caught => caught);
    expect(xlsxMock.runAdvancedDesignExporter).toHaveBeenCalledWith(expect.objectContaining({ appId: '5', guestId: '2', preview: true }));
    expect(error.partialSuccess).toBe(true);
    expect(error.message).toContain('取得に失敗した項目 2件（ビュー設定）');
    expect(error.message).toContain('- ビュー設定:');
  });

  it('Excel は失敗がなければ通常の完了メッセージ、キャンセルならその旨', async () => {
    xlsxMock.runAdvancedDesignExporter.mockImplementation(async (params: any) => { params.onFinish({ failedAPIs: [] }); return true; });
    const ok = vi.fn();
    await runDesignExportXlsxStandalone({ appId: '5' }, ok);
    expect(ok).toHaveBeenLastCalledWith('設計書Excel出力完了');
    xlsxMock.runAdvancedDesignExporter.mockResolvedValue(false);
    const cancelled = vi.fn();
    await runDesignExportXlsxStandalone({ appId: '5' }, cancelled);
    expect(cancelled).toHaveBeenLastCalledWith('設計書Excel出力をキャンセルしました');
  });

  it('ZIP は部分成功・中断・API取得失敗を「完了」だけで隠さない', async () => {
    xlsxMock.runBatchDesignExportXlsxZip.mockImplementation(async (params: any) => {
      params.onFinish({
        total: 3, successCount: 1, failedCount: 2, cancelled: false,
        failedApps: [{ appId: '2', error: 'x' }, { appId: '3', error: 'y' }],
        failedAPIs: [{ app: 'App 1', name: 'ビュー設定', error: '403' }]
      });
      return true;
    });
    const setStatus = vi.fn();
    await runBatchDesignExportXlsxZipStandalone({ apps: [{ appId: '1' }, { appId: '2' }, { appId: '3' }] }, setStatus);
    const [message, isError] = setStatus.mock.calls[setStatus.mock.calls.length - 1];
    expect(isError).toBe(true);
    expect(message).toContain('成功 1 / 失敗・未処理 2（全3件）');
    expect(message).toContain('失敗したアプリ: App 2, App 3');
    expect(message).toContain('API取得に失敗した項目 1件');
  });

  it('ZIP は全件成功なら通常の完了メッセージ、1件も作らず中断したらキャンセル', async () => {
    xlsxMock.runBatchDesignExportXlsxZip.mockImplementation(async (params: any) => {
      params.onFinish({ total: 2, successCount: 2, failedCount: 0, cancelled: false, failedApps: [], failedAPIs: [] });
      return true;
    });
    const ok = vi.fn();
    await runBatchDesignExportXlsxZipStandalone({ apps: [{ appId: '1' }, { appId: '2' }] }, ok);
    expect(ok).toHaveBeenLastCalledWith('設計書ZIP出力完了（2件）');
    xlsxMock.runBatchDesignExportXlsxZip.mockResolvedValue(false);
    const cancelled = vi.fn();
    await runBatchDesignExportXlsxZipStandalone({ apps: [{ appId: '1' }] }, cancelled);
    expect(cancelled).toHaveBeenLastCalledWith('設計書ZIP出力をキャンセルしました');
  });
});
