import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchBundle } from '../../src/api';
import { runSettingsExportStandalone } from '../../src/tabs/settings-export-standalone';
import { mergePastedTargetAppIds } from '../../src/entries/diff-lite-ui';
import { parseRecordAppIds } from '../../src/tabs/record-standalone';
import { runBatchDesignExportMdZipStandalone } from '../../src/tabs/design-standalone';
import { extractAppIdFromInput, extractGuestIdFromInput } from '../../src/handlers/diffFocus';
import { needsAppReferenceParse, parseAppReference } from '../../src/reflect/appReference';
import { normalizeIdInputText } from '../../src/utils';
import { buildErCrawlOptions, validateErOptions } from '../../src/tabs/er-standalone';
import { parseLookupMapText } from '../../src/reflect/liteSetup';
import { parseRolloutQueue } from '../../src/reflect/rolloutQueue';

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

// 日本語入力のまま入れた全角数字（１０１）も、半角にして受け付ける（12 ツールとも同じ）。
describe('アプリIDの全角数字', () => {
  it('全角数字と全角カンマだけを半角にし、文字数は変えない', () => {
    expect(normalizeIdInputText('１０１，２３４５６７８９０')).toBe('101,234567890');
    expect(normalizeIdInputText('第１営業部 ＡＢ')).toBe('第1営業部 ＡＢ');
    expect(normalizeIdInputText('１０１，１０２').length).toBe('１０１，１０２'.length);
    expect(normalizeIdInputText(undefined)).toBe('');
  });

  it('入力欄の読み取り（数字・URL・ゲストスペース）で全角数字を受け付ける', () => {
    expect(extractAppIdFromInput('１０１')).toBe('101');
    expect(extractGuestIdFromInput('https://example.cybozu.com/k/guest/５/１２/')).toBe('5');
    expect(parseAppReference('１２')).toEqual({ appId: '12', guestId: '' });
    expect(needsAppReferenceParse('１２')).toBe(false);
    expect(needsAppReferenceParse('１２a')).toBe(true);
  });

  it('ER図: 起点・追加起点・ゲストスペース・スペースの全角数字を受け付ける', () => {
    const opts = { appId: '１０１，１０２', appIds: ['１０１', '１０２'], extraAppIds: ['１２０'], guestId: '５', spaceId: '３' };
    expect(validateErOptions(opts)).toBe('');
    const crawl = buildErCrawlOptions(opts);
    expect(crawl.startAppIds).toEqual(['101', '102', '120']);
    expect(crawl.source.guestId).toBe('5');
    expect(parseRecordAppIds('１０１，１０２、１０３')).toEqual(['101', '102', '103']);
    // 全角でも数字でない文字は従来どおり止める
    expect(validateErOptions({ appId: '１０Ａ' })).toMatch(/アプリIDは数値で入力してください: 10Ａ/);
  });

  it('差分比較: 比較先へ貼り付けた全角数字を分ける', () => {
    expect(mergePastedTargetAppIds('', 0, 0, '１０１，１０２')).toEqual({ merged: '101,102', splits: true });
    expect(mergePastedTargetAppIds('１００，', 4, 4, '１０１　１０２')).toEqual({ merged: '100,101,102', splits: true });
  });

  it('設定取得: 全角数字のアプリIDとゲストスペースIDを受け付ける', async () => {
    vi.mocked(fetchBundle).mockImplementation(async ({ appId }: any) => ({ appId, guestId: '', preview: false, fetchedAt: '', meta: { sectionRevisions: {} }, sections: { appSettings: { name: `App ${appId}` } } }) as any);
    await runSettingsExportStandalone('json', { appIdsText: '１０１，１０２', scopeRoot: {} }, vi.fn());
    expect(vi.mocked(fetchBundle).mock.calls.map(([params]: any) => params.appId)).toEqual(['101', '102']);
    vi.mocked(fetchBundle).mockClear();
    await runSettingsExportStandalone('json', { apps: [{ appId: '２０１', guestId: '９' }], scopeRoot: {} }, vi.fn());
    expect(vi.mocked(fetchBundle).mock.calls.map(([params]: any) => [params.appId, params.guestId])).toEqual([['201', '9']]);
  });
});

// 書き込み・レコード系のツールも同じ。入力欄は makeInput({ idInput: true }) で直し、値を読む側の解析でも受け付ける。
// 送信する値の検査（半角数字だけ）は変えない（buildApiPrefix などは全角のままの値を止める）。
describe('アプリIDの全角数字（lite だけのツール）', () => {
  it('プレビュー反映: 続けて反映する反映先に全角数字・全角カンマ・URL を受け付ける', () => {
    expect(parseRolloutQueue('２０３，２０４\nhttps://example.cybozu.com/k/guest/５/２０５/')).toEqual({
      ok: true,
      targets: [{ appId: '203', guestId: '' }, { appId: '204', guestId: '' }, { appId: '205', guestId: '5' }]
    });
    expect(parseRolloutQueue('２０３Ａ')).toMatchObject({ ok: false });
  });

  it('プレビュー反映・本番反映: 参照先変換（旧AppID → 新AppID）の全角数字を受け付ける', () => {
    expect(parseLookupMapText('１０ → ２５\n３０，４０')).toEqual({ ok: true, value: { 10: '25', 30: '40' }, count: 2 });
    expect(parseLookupMapText('{"１０":"２５"}')).toEqual({ ok: true, value: { 10: '25' }, count: 1 });
    expect(parseLookupMapText('１０ → ２Ａ')).toMatchObject({ ok: false });
  });

  it('レコード系: 対象アプリIDの全角数字を受け付け、数字でない文字は止める', () => {
    expect(parseRecordAppIds('１０１，１０２　１０３')).toEqual(['101', '102', '103']);
    expect(() => parseRecordAppIds('１０１，Ａ')).toThrow(/アプリIDは正の数値で入力してください: Ａ/);
  });
});
