import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAppsInSpace } from '../src/api';
import { buildErCrawlOptions, runGenerateERDiagramStandalone, validateErOptions } from '../src/tabs/er-standalone';

vi.mock('../src/api', async original => ({
  ...await original<typeof import('../src/api')>(),
  fetchAppsInSpace: vi.fn()
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('ER図 Lite input validation', () => {
  it('reports the field that contains a malformed target before crawling', () => {
    expect(validateErOptions({ appId: '1,abc' })).toMatch(/アプリIDは数値.*abc/);
    expect(validateErOptions({ appId: '1', guestId: 'guest' })).toMatch(/ゲストスペースIDは半角数字/);
    expect(validateErOptions({ spaceId: 'space' })).toMatch(/スペースIDは数値/);
    expect(validateErOptions({ appId: '1', maxDepth: '1.5' })).toMatch(/探索深さは0以上の整数/);
  });

  it('accepts a space-only target and rejects an empty target or empty space selection', () => {
    expect(validateErOptions({ spaceId: '7' })).toBe('');
    expect(validateErOptions({ spaceId: '7', spaceSelectedAppIds: ['10'] })).toBe('');
    expect(validateErOptions({ spaceId: '7', spaceSelectedAppIds: [] })).toMatch(/スペース内アプリを1件以上選択/);
    expect(validateErOptions({ appId: '1', spaceId: '7', spaceSelectedAppIds: [] })).toBe('');
    expect(validateErOptions({ appId: '7', appIds: [] })).toBe('');
    expect(validateErOptions({})).toMatch(/アプリID または スペースID/);
  });

  it('normalizes direct comma-separated app IDs and preserves preview flag for standalone callers', () => {
    const built = buildErCrawlOptions({ appId: '1, 2', extraAppIds: '2,3', preview: true });
    expect(built.startAppIds).toEqual(['1', '2', '3']);
    expect(built.source.preview).toBe(true);
  });

  it('rejects app IDs that cannot be fetched as the same number', () => {
    expect(validateErOptions({ appId: '0' })).toMatch(/アプリIDは1以上.*0/);
    expect(validateErOptions({ appId: '1', extraAppIds: '9007199254740993' })).toMatch(/アプリIDは.*9007199254740993/);
    expect(validateErOptions({ appId: '9007199254740991' })).toBe('');
  });

  it('collapses zero-padded duplicates so the start app is recognised in the diagram', () => {
    expect(buildErCrawlOptions({ appId: '007, 7', extraAppIds: '010,10' }).startAppIds).toEqual(['7', '10']);
    expect(buildErCrawlOptions({ appId: '007' }).startAppId).toBe('7');
  });

  it('rejects a space target whose picker has no app selected and no start ID', () => {
    expect(validateErOptions({ spaceId: '7', spaceSelectedAppIds: [] })).toMatch(/1件以上選択/);
    expect(validateErOptions({ spaceId: '7', spaceSelectedAppIds: ['3'] })).toBe('');
    expect(validateErOptions({ spaceId: '7', spaceSelectedAppIds: [], appId: '2' })).toBe('');
    expect(validateErOptions({ spaceId: '7', spaceSelectedAppIds: [], extraAppIds: ['2'] })).toBe('');
  });
});

describe('ER図 Lite popup', () => {
  it('opens the tab before waiting for the space app list and closes it when that fails', async () => {
    const popup = { document: { write: vi.fn() }, close: vi.fn(), opener: {} };
    const open = vi.fn(() => popup);
    vi.stubGlobal('window', { open });
    let rejectList: (reason: Error) => void = () => undefined;
    vi.mocked(fetchAppsInSpace).mockImplementation(() => new Promise((_resolve, reject) => { rejectList = reject; }));

    const run = runGenerateERDiagramStandalone({ spaceId: '7' }, vi.fn());
    expect(open).toHaveBeenCalledTimes(1);
    expect(popup.close).not.toHaveBeenCalled();
    rejectList(new Error('スペースを取得できません'));
    await expect(run).rejects.toThrow('スペースを取得できません');
    expect(popup.close).toHaveBeenCalledTimes(1);
  });

  it('does not open a tab for invalid input', async () => {
    const open = vi.fn();
    vi.stubGlobal('window', { open });
    await expect(runGenerateERDiagramStandalone({ appId: 'abc' }, vi.fn())).rejects.toThrow(/アプリIDは数値/);
    expect(open).not.toHaveBeenCalled();
  });
});
