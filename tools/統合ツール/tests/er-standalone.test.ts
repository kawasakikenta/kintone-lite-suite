import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAppsInSpace } from '../src/api';
import {
  buildErCrawlOptions,
  runGenerateERDiagramStandalone,
  validateErOptions,
  runExportERMarkdownStandalone,
  runExportERMermaidStandalone,
  runExportERRelationsCsvStandalone
} from '../src/tabs/er-standalone';

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

describe('ER図 Standalone Direct Export (Markdown / Mermaid / CSV with importedBundles)', () => {
  const sampleBundles = [
    {
      appId: '101',
      appName: '見積管理',
      sections: {
        formFields: {
          properties: {
            quote_no: { code: 'quote_no', label: '見積番号', type: 'RECORD_NUMBER' },
            customer_code: {
              code: 'customer_code',
              label: '顧客コード',
              type: 'SINGLE_LINE_TEXT',
              lookup: { relatedApp: { app: '202' }, relatedKeyField: 'code' }
            }
          }
        }
      }
    },
    {
      appId: '202',
      appName: '顧客マスタ',
      sections: {
        formFields: {
          properties: {
            code: { code: 'code', label: '顧客コード', type: 'SINGLE_LINE_TEXT', unique: true }
          }
        }
      }
    }
  ];

  it('exports Markdown spec directly from importedBundles without opening a popup or calling API', async () => {
    const setStatus = vi.fn();
    const res = await runExportERMarkdownStandalone(
      { importedBundles: sampleBundles, download: false, generatedAt: '2026-10-31T00:00:00.000Z' },
      setStatus
    );
    expect(res.apps).toHaveLength(2);
    expect(res.markdown).toContain('# kintone ER図 仕様書');
    expect(res.markdown).toContain('## グラフ分析サマリ');
    expect(res.markdown).toContain('見積管理');
    expect(res.markdown).toContain('顧客マスタ');
    expect(setStatus).toHaveBeenLastCalledWith('ER図仕様書を保存しました (2アプリ)', false);
  });

  it('exports Mermaid erDiagram source directly from importedBundles', async () => {
    const setStatus = vi.fn();
    const res = await runExportERMermaidStandalone(
      { importedBundles: sampleBundles, download: false },
      setStatus
    );
    expect(res.mermaid).toContain('erDiagram');
    expect(res.mermaid).toContain('app_101 }o--o| app_202');
    expect(setStatus).toHaveBeenLastCalledWith('ER図Mermaidを保存しました (2アプリ)', false);


  });

  it('exports Relations CSV directly from importedBundles', async () => {
    const setStatus = vi.fn();
    const res = await runExportERRelationsCsvStandalone(
      { importedBundles: sampleBundles, download: false },
      setStatus
    );
    expect(res.csv.startsWith('\uFEFF')).toBe(true);
    expect(res.csv).toContain('101,見積管理,customer_code,顧客コード,LOOKUP,202,顧客マスタ,customer_code -> code');
    expect(setStatus).toHaveBeenLastCalledWith('ER図リレーション一覧CSVを保存しました (2アプリ)', false);

  });
});
