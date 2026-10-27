import { afterEach, describe, expect, it, vi } from 'vitest';
import { crawl, buildHTML } from '../src/tabs/er';
import { downloadText } from '../src/utils';
import { runExportERDiagramHtmlStandalone, runGenerateERDiagramStandalone, summarizeCrawl } from '../src/tabs/er-standalone';

vi.mock('../src/tabs/er', async original => ({
  ...await original<typeof import('../src/tabs/er')>(),
  crawl: vi.fn(),
  buildHTML: vi.fn(() => '<html></html>'),
  progressUi: { init: vi.fn(), update: vi.fn(), close: vi.fn(), dismiss: vi.fn(), error: vi.fn() }
}));
vi.mock('../src/utils', async original => ({
  ...await original<typeof import('../src/utils')>(),
  downloadText: vi.fn()
}));

const failedApp = (id: number, message: string, name = `アプリ ${id}`) => ({ id, name, status: 'failed', ok: false, relations: [], issues: [{ message }] });
const okApp = (id: number, name = `App${id}`) => ({ id, name, status: 'complete', relations: [], issues: [] });

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('ER図 Lite: 起点アプリを取得できなかった場合', () => {
  it('HTML保存は保存せず、起点アプリと理由を示して失敗にする', async () => {
    vi.mocked(crawl).mockResolvedValue([failedApp(5, 'CB_NO02 権限がありません')] as any);
    const setStatus = vi.fn();
    const run = runExportERDiagramHtmlStandalone({ appId: '5' }, setStatus);
    await expect(run).rejects.toThrow(/起点アプリ 5.*CB_NO02 権限がありません/);
    expect(buildHTML).not.toHaveBeenCalled();
    expect(downloadText).not.toHaveBeenCalled();
    expect(setStatus.mock.calls.some(([message]) => String(message).includes('保存しました'))).toBe(false);
  });

  it('別タブ表示も開いたタブを閉じ、図を表示せず失敗にする', async () => {
    vi.mocked(crawl).mockResolvedValue([failedApp(5, '403 Forbidden')] as any);
    const popup = { document: { write: vi.fn() }, close: vi.fn(), opener: {}, location: { href: '' } };
    vi.stubGlobal('window', { open: vi.fn(() => popup) });
    const setStatus = vi.fn();
    await expect(runGenerateERDiagramStandalone({ appId: '5' }, setStatus)).rejects.toThrow(/起点アプリ 5.*403 Forbidden/);
    expect(popup.close).toHaveBeenCalledTimes(1);
    expect(popup.location.href).toBe('');
    expect(buildHTML).not.toHaveBeenCalled();
  });

  it('複数の起点がすべて失敗したときは、起点ごとの理由を並べる', async () => {
    vi.mocked(crawl).mockResolvedValue([failedApp(5, '403'), failedApp(6, '404')] as any);
    await expect(runExportERDiagramHtmlStandalone({ appId: '5', extraAppIds: '6' }, vi.fn()))
      .rejects.toThrow(/起点アプリ 5.*403.*起点アプリ 6.*404/);
  });

  it('一部だけ失敗した場合は保存を続け、警告トーンで部分結果を知らせる', async () => {
    vi.mocked(crawl).mockResolvedValue([okApp(5), failedApp(9, '403')] as any);
    const setStatus = vi.fn();
    await runExportERDiagramHtmlStandalone({ appId: '5' }, setStatus);
    expect(downloadText).toHaveBeenCalledTimes(1);
    const [message, tone] = setStatus.mock.calls[setStatus.mock.calls.length - 1];
    expect(message).toContain('ER図HTMLを保存しました: 2アプリ（一部取得 0 / 取得失敗 1）');
    expect(tone).toBe('warn');
  });

  it('summarizeCrawl は全件失敗だけをエラー、一部失敗は警告にする', () => {
    expect(summarizeCrawl([failedApp(1, 'x')])).toMatchObject({ analyzedCount: 0, failedCount: 1, tone: true });
    expect(summarizeCrawl([okApp(1), failedApp(2, 'x')])).toMatchObject({ analyzedCount: 1, failedCount: 1, tone: 'warn' });
    expect(summarizeCrawl([okApp(1)])).toMatchObject({ failedCount: 0, tone: false });
  });
});
