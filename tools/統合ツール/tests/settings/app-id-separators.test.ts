import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBundle } from '../../src/api';
import { runSettingsExportStandalone } from '../../src/tabs/settings-export-standalone';
import { mergePastedTargetAppIds } from '../../src/entries/diff-lite-ui';
import { parseRecordAppIds } from '../../src/tabs/record-standalone';
import { runBatchDesignExportMdZipStandalone } from '../../src/tabs/design-standalone';

vi.mock('../../src/api', async importOriginal => ({ ...await importOriginal<typeof import('../../src/api')>(), fetchBundle: vi.fn() }));
vi.mock('../../src/utils', async importOriginal => ({ ...await importOriginal<typeof import('../../src/utils')>(),
  downloadText: vi.fn(), downloadBlob: vi.fn(), selectedScopeKeys: () => ['appSettings'] }));
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: vi.fn(async () => class FakeJSZip { file() {} async generateAsync() { return new Blob(['zip']); } }) }));

beforeEach(() => { vi.clearAllMocks(); });

// アプリIDの区切り文字は、ER図・レコード系（parseRecordAppIds）と同じく「,」「、」「，」・空白・改行にそろえる。
describe('アプリIDの区切り文字（全角カンマ）', () => {
  it('レコード系・ER図は全角カンマで区切る（基準）', () => {
    expect(parseRecordAppIds('101，102、103,104 105')).toEqual(['101', '102', '103', '104', '105']);
  });

  it('差分比較: 比較先へ貼り付けた全角カンマ区切りのアプリIDを分ける', () => {
    expect(mergePastedTargetAppIds('', 0, 0, '101，102')).toEqual({ merged: '101,102', splits: true });
    expect(mergePastedTargetAppIds('100，', 4, 4, '101，102')).toEqual({ merged: '100,101,102', splits: true });
  });

  it('設定取得: 全角カンマ区切りのアプリIDを受け付ける', async () => {
    vi.mocked(fetchBundle).mockImplementation(async ({ appId }: any) => ({ appId, guestId: '', preview: false, fetchedAt: '', meta: { sectionRevisions: {} }, sections: { appSettings: { name: `App ${appId}` } } }) as any);
    await runSettingsExportStandalone('json', { appIdsText: '101，102', scopeRoot: {} }, vi.fn());
    expect(vi.mocked(fetchBundle).mock.calls.map(([params]: any) => params.appId)).toEqual(['101', '102']);
  });

  it('設計書作成: 旧来のアプリIDの文字列（appIdsText）も全角カンマで区切る', async () => {
    vi.mocked(fetchBundle).mockImplementation(async ({ appId }: any) => ({ appId, guestId: '', preview: false, fetchedAt: '', meta: { sectionRevisions: {} }, sections: { appSettings: { name: `App ${appId}` } } }) as any);
    await runBatchDesignExportMdZipStandalone({ appIdsText: '101，102', format: 'md' }, vi.fn());
    expect(vi.mocked(fetchBundle).mock.calls.map(([params]: any) => params.appId)).toEqual(['101', '102']);
  });
});
