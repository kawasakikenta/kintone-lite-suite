import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost } from '../../src/api';
import { kusConfirm } from '../../src/utils';
import { parseRecordAppIds, runCsvImportBatchStandalone } from '../../src/tabs/record-standalone';

// アプリIDを数値として読む kintone では「07」も App 7 を指しうる。レコード系の対象アプリIDは重複を 1 件にまとめるが、文字列のまま比べていたため
// 「7, 07」は 2 つの別のアプリとして残り、CSV取込・レコードコピー（追加は送り直さない・revision も無い）が同じアプリへ 2 回追加していた。
// データ品質チェック（record-quality-standalone.ts）はすでに先頭の 0 を外してまとめている。書き込みをするツールも同じにそろえる。

vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), kusConfirm: vi.fn() }));

const props = { title: { type: 'SINGLE_LINE_TEXT', label: '件名' } };
const file = (csv: string) => ({ name: 'data.csv', text: vi.fn(async () => csv) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiGet).mockReset().mockResolvedValue({ properties: props });
  vi.mocked(apiPost).mockReset().mockResolvedValue({ ids: ['1'], revisions: ['1'] });
  vi.mocked(kusConfirm).mockReturnValue(true);
});

describe('record app IDs with leading zeros', () => {
  it('are read as the same app as without them, and listed once', () => {
    expect(parseRecordAppIds('7, 07, 007')).toEqual(['7']);
    expect(parseRecordAppIds('０７，7、10')).toEqual(['7', '10']);
    expect(parseRecordAppIds('0100 100')).toEqual(['100']);
  });

  it('still reject zero and non-numbers', () => {
    expect(() => parseRecordAppIds('0')).toThrow('アプリIDは正の数値で入力してください: 0');
    expect(() => parseRecordAppIds('00')).toThrow('アプリIDは正の数値で入力してください: 00');
    expect(() => parseRecordAppIds('7,abc')).toThrow('アプリIDは正の数値で入力してください: abc');
  });

  it('CSV import to "7, 07" adds the records to App 7 only once', async () => {
    await runCsvImportBatchStandalone({ appIdsText: '7, 07', file: file('title\na\nb\n') }, vi.fn());
    expect(vi.mocked(apiPost).mock.calls.map(call => [call[1], (call[2] as any).app])).toEqual([['/records.json', '7']]);
    expect(vi.mocked(kusConfirm).mock.calls[0][0]).toContain('CSVから 1アプリの本番レコードへ追加します');
  });
});
