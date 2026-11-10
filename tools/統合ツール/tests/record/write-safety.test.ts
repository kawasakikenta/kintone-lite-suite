import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost } from '../../src/api';
import { kusConfirm } from '../../src/utils';
import { isCalendarDate, isValidCsvDate, isValidCsvDateTime, parseCsvText, planCsvImport } from '../../src/tabs/record-csv-import';
import { describeBatchWriteFailure, describeKintoneRecordErrors, isUnconfirmedWriteFailure, writeInChunks } from '../../src/tabs/record-query';
import { runCsvImportBatchStandalone, runRecordAppBatchStandalone, runRecordCopyStandalone } from '../../src/tabs/record-standalone';

vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn(), apiPost: vi.fn(), fetchRecordsByQuery: vi.fn() }));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), kusConfirm: vi.fn() }));

const props = {
  title: { type: 'SINGLE_LINE_TEXT', label: '件名', required: true },
  due: { type: 'DATE', label: '期限' },
  startAt: { type: 'DATETIME', label: '開始日時' }
};
const plan = (csv: string) => planCsvImport(parseCsvText(csv), props);
const file = (csv: string) => ({ name: 'data.csv', text: vi.fn(async () => csv) });
const status = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiGet).mockReset().mockResolvedValue({ properties: props });
  vi.mocked(apiPost).mockReset().mockResolvedValue({ ids: ['1'], revisions: ['1'] });
  vi.mocked(kusConfirm).mockReturnValue(true);
});

describe('CSV preflight: dates and date-times that exist', () => {
  it('knows month lengths, leap years and the end of the year', () => {
    expect(isCalendarDate(2026, 2, 28)).toBe(true);
    expect(isCalendarDate(2026, 2, 29)).toBe(false);
    expect(isCalendarDate(2028, 2, 29)).toBe(true);
    expect(isCalendarDate(2100, 2, 29)).toBe(false);
    expect(isCalendarDate(2026, 4, 31)).toBe(false);
    expect(isCalendarDate(2026, 12, 31)).toBe(true);
    expect(isCalendarDate(2026, 13, 1)).toBe(false);
    expect(isCalendarDate(2026, 0, 1)).toBe(false);
    expect(isCalendarDate(2026, 1, 0)).toBe(false);
  });

  it('accepts only real dates and date-times (time zone offsets allowed, seconds optional)', () => {
    expect(isValidCsvDate('2026-02-30')).toBe(false);
    expect(isValidCsvDate('2028-02-29')).toBe(true);
    expect(isValidCsvDateTime('2026-04-01T09:00:00Z')).toBe(true);
    expect(isValidCsvDateTime('2026-04-01T09:00')).toBe(true);
    expect(isValidCsvDateTime('2026-04-01T23:59:59+09:00')).toBe(true);
    expect(isValidCsvDateTime('2026-04-01T09:00:00.123Z')).toBe(true);
    expect(isValidCsvDateTime('2026-13-01T09:00:00Z')).toBe(false);
    expect(isValidCsvDateTime('2026-04-31T09:00:00Z')).toBe(false);
    expect(isValidCsvDateTime('2026-04-01T24:00:00Z')).toBe(false);
    expect(isValidCsvDateTime('2026-04-01T09:60:00Z')).toBe(false);
    expect(isValidCsvDateTime('2026-04-01T09:00:60Z')).toBe(false);
    expect(isValidCsvDateTime('2026-04-01T09:00:00+25:00')).toBe(false);
  });

  it('reports impossible dates with the row and the value before any write', () => {
    const result = plan('title,due,startAt\nA,2026-02-30,2026-13-01T09:00:00Z\nB,2028-02-29,2026-04-01T09:00:00Z\nC,2026-4-1,x');
    expect(result.issues.map(issue => `${issue.row}:${issue.field}:${issue.message}`)).toEqual([
      '2:期限［due］:存在しない日付です（2026-02-30）',
      '2:開始日時［startAt］:存在しない日時です（2026-13-01T09:00:00Z）',
      '4:期限［due］:日付の形式が不正です（YYYY-MM-DD）',
      '4:開始日時［startAt］:日時の形式が不正です（ISO 8601形式: YYYY-MM-DDTHH:MM:SSZ）'
    ]);
  });

  it('stops the import before the first write when a row has an impossible date', async () => {
    await expect(runCsvImportBatchStandalone({ appId: '7', file: file('title,due\nA,2026-02-30') }, status)).rejects.toThrow(/2行目.*存在しない日付です/);
    expect(apiPost).not.toHaveBeenCalled();
    expect(kusConfirm).not.toHaveBeenCalled();
  });
});

describe('record writes are not re-sent automatically', () => {
  const lastArgs = () => vi.mocked(apiPost).mock.calls.map(call => call.slice(1));

  it('sends CSV import chunks once each (a lost response must not create the records twice)', async () => {
    const csv = 'title\n' + Array.from({ length: 150 }, (_, i) => `件名${i}`).join('\n');
    await runCsvImportBatchStandalone({ appId: '7', file: file(csv) }, status);
    expect(lastArgs().map(args => [args[0], (args[1] as any).records.length, args[2]])).toEqual([['/records.json', 100, 1], ['/records.json', 50, 1]]);
  });

  it('sends record copy chunks once each', async () => {
    const { fetchRecordsByQuery } = await import('../../src/api');
    vi.mocked(apiGet).mockResolvedValue({ properties: { title: { type: 'SINGLE_LINE_TEXT' } } });
    vi.mocked(fetchRecordsByQuery).mockResolvedValue({ records: Array.from({ length: 120 }, (_, i) => ({ $id: { type: '__ID__', value: String(i + 1) }, title: { type: 'SINGLE_LINE_TEXT', value: `t${i}` } })), mode: 'keyset' } as any);
    await runRecordCopyStandalone({ sourceAppId: '1', targetAppId: '2' }, status);
    expect(lastArgs().map(args => [(args[1] as any).records.length, args[2]])).toEqual([[100, 1], [20, 1]]);
  });
});

describe('a chunk whose response never arrived is reported as unconfirmed', () => {
  const rejection = Object.assign(new Error('入力内容が正しくありません。'), { code: 'CB_VA01', id: 'abc', errors: { 'records[0].title.value': { messages: ['必須です。'] } } });

  it('tells a rejection by kintone (error id / errors) from a lost response', () => {
    expect(isUnconfirmedWriteFailure(rejection)).toBe(false);
    expect(isUnconfirmedWriteFailure(Object.assign(new Error('x'), { original: { id: 'req-1', code: 'GAIA_UN99', message: 'サーバーエラー' } }))).toBe(false);
    expect(isUnconfirmedWriteFailure(Object.assign(new Error('wrapped'), { original: Object.assign(new Error('Network Error'), { code: 'NETWORK' }) }))).toBe(true);
    expect(isUnconfirmedWriteFailure(new Error('Request timeout'))).toBe(true);
    expect(isUnconfirmedWriteFailure(new Error('Failed to fetch'))).toBe(true);
    expect(isUnconfirmedWriteFailure(Object.assign(new Error('Bad Gateway'), { status: 502 }))).toBe(true);
    expect(isUnconfirmedWriteFailure(new Error('権限がありません'))).toBe(false);
    expect(isUnconfirmedWriteFailure(null)).toBe(false);
  });

  it('adds a line telling the user to count the records in kintone before re-running', async () => {
    const items = Array.from({ length: 250 }, (_, i) => i);
    const lost = Object.assign(new Error('wrapped'), { original: Object.assign(new Error('Network Error'), { code: 'NETWORK' }) });
    const error: any = await writeInChunks(items, 'CSV取込', async (_chunk, index) => { if (index === 1) throw lost; }).catch(caught => caught);
    expect(error.message).toContain('確定済み: 100件 / 失敗チャンク: 101～200件目 / 未処理: 150件（全250件）');
    expect(error.message).toContain('失敗チャンク（101～200件目）は、応答が届かなかったため、kintone に書き込まれたかどうか確認できません。再実行する前に、kintone 画面で対象アプリのレコード件数を確認してください。');
    expect(error.partial).toEqual({ done: 100, from: 101, to: 200, total: 250, unconfirmed: true });
  });

  it('does not add the line when kintone rejected the chunk', async () => {
    const error: any = await writeInChunks([1, 2, 3], 'CSV取込', async () => { throw rejection; }).catch(caught => caught);
    expect(error.message).not.toContain('書き込まれたかどうか確認できません');
    expect(error.partial.unconfirmed).toBeUndefined();
    expect(describeBatchWriteFailure('x', { done: 0, from: 1, to: 3, total: 3 }, rejection)).not.toContain('確認できません');
  });

  it('shows the uncertainty in the multi-app summary too', async () => {
    const unconfirmed = Object.assign(new Error('失敗'), { partial: { done: 100, total: 250, unconfirmed: true } });
    const error: any = await runRecordAppBatchStandalone('7,8', async (appId) => { if (appId === '8') throw unconfirmed; }, status).catch(caught => caught);
    expect(error.message.split('\n')[0]).toBe('2アプリ中1アプリで失敗しました（成功 1アプリ・書き込み済み 100件・未処理 150件・1アプリで失敗した塊が書き込まれたか未確認）');
  });
});

describe('field names in kintone record errors', () => {
  it('maps the field path to a label through describeField and leaves the default unchanged', () => {
    const error = { errors: { 'records[1].amount.value': { messages: ['数字でなければなりません。'] }, 'records[0].table.value[0].value.qty.value': { messages: ['不正です。'] } } };
    expect(describeKintoneRecordErrors(error, 100, (index) => `CSV ${index + 2}行目`)).toEqual(['CSV 103行目・amount: 数字でなければなりません。', 'CSV 102行目・table.value[0].value.qty: 不正です。']);
    const label = (path: string) => (path === 'amount' ? '金額［amount］' : path);
    expect(describeKintoneRecordErrors(error, 0, undefined, label)).toEqual(['2件目・金額［amount］: 数字でなければなりません。', '1件目・table.value[0].value.qty: 不正です。']);
  });
});
