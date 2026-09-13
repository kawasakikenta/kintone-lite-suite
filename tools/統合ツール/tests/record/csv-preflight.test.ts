import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCsvText, planCsvImport, formatCsvImportReport } from '../../src/tabs/record-csv-import';
import { runCsvImportBatchStandalone, runPreviewCsvImportStandalone } from '../../src/tabs/record-standalone';
import { apiGet, apiPost } from '../../src/api';
import { kusConfirm } from '../../src/utils';

vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), kusConfirm: vi.fn() }));
const props = {
  title: { type: 'SINGLE_LINE_TEXT', label: '件名', required: true, unique: true, defaultValue: '' },
  amount: { type: 'NUMBER', label: '金額', required: false },
  priority: { type: 'DROP_DOWN', label: '優先度', options: { 高: { label: '高', index: '0' }, 低: { label: '低', index: '1' } } },
  tags: { type: 'CHECK_BOX', label: '分類', options: { A: { label: 'A' }, B: { label: 'B' } } },
  owner: { type: 'USER_SELECT', label: '担当者' }
};
const status = vi.fn();
const file = (csv: string) => ({ name: 'data.csv', text: vi.fn(async () => csv) });
const plan = (csv: string, properties: any = props) => planCsvImport(parseCsvText(csv), properties);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiGet).mockReset().mockResolvedValue({ properties: props });
  vi.mocked(apiPost).mockReset().mockResolvedValue({ ids: ['1'], revisions: ['1'] });
  vi.mocked(kusConfirm).mockReturnValue(true);
});

describe('CSV preflight against field settings', () => {
  it.each(['title\n"閉じない', 'title\n"閉じた"余分', 'title\nab"cd'])('rejects malformed quoting without changing cell content: %s', csv => {
    expect(() => parseCsvText(csv)).toThrow(/CSV 2行目・1列目/);
  });
  it('retains quoted commas, CRLF within cells, escaped quotes, and trailing empty columns', () => {
    expect(parseCsvText('a,b,c\r\n"x,y","複数\r\n行 ""引用""",')).toEqual([['a', 'b', 'c'], ['x,y', '複数\r\n行 "引用"', '']]);
  });
  it.each(['title,title\nA,B', 'title,\nA,B'])('rejects duplicate or unnamed columns: %s', csv => {
    expect(() => plan(csv)).toThrow(/ヘッダ/);
  });
  it('does not silently discard extra columns or fill missing ones', () => {
    const result = plan('title,amount\nA,1,余分\nB\nC,3');
    expect(result.count).toBe(3);
    expect(result.issues.map(issue => issue.row)).toEqual([2, 3]);
    expect(result.issues.every(issue => issue.message.includes('列数'))).toBe(true);
  });
  it('reports required values, choices, numeric syntax and duplicates with labels and row numbers', () => {
    const result = plan('title,amount,priority\n,abc,中\n重複,1,高\n重複,2,低');
    expect(result.issueCount).toBe(4);
    expect(formatCsvImportReport(result)).toContain('2行目・件名［title］: 必須項目が空');
    expect(formatCsvImportReport(result)).toContain('2行目・優先度［priority］: 選択肢にありません: 中');
    expect(formatCsvImportReport(result)).toContain('4行目・件名［title］: CSV内で同じ値が重複しています（3行目）');
  });
  it('preserves exact numeric strings and coerces lists and user codes without modifying other text', () => {
    const result = plan('title,amount,tags,owner\n空白を残す ,9007199254740993,"A,B","reviewer,guest/user"');
    expect(result.issueCount).toBe(0);
    expect(result.records[0]).toEqual({ title: { value: '空白を残す ' }, amount: { value: '9007199254740993' }, tags: { value: ['A', 'B'] }, owner: { value: [{ code: 'reviewer' }, { code: 'guest/user' }] } });
  });
  it('finds an omitted required column but accepts a configured default or lookup mapping', () => {
    expect(plan('amount\n1').issues[0]).toMatchObject({ row: 1, field: '件名［title］' });
    expect(plan('amount\n1', { ...props, title: { ...props.title, defaultValue: '初期値' } }).issueCount).toBe(0);
    expect(plan('amount\n1', { ...props, amount: { ...props.amount, lookup: { fieldMappings: [{ field: 'title' }] } } }).issueCount).toBe(0);
    expect(plan('title\nA', { ...props, date: { type: 'DATE', required: true, defaultNowValue: true } }).issueCount).toBe(0);
  });
  it('rejects computed text columns and does not mistake inherited property names for valid fields', () => {
    expect(() => plan('title\nA', { title: { ...props.title, expression: '"自動"' } })).toThrow(/自動計算/);
    expect(() => plan('toString\nA')).toThrow(/存在しない/);
    expect(() => plan('title,amount\nA,1', { ...props, amount: { ...props.amount, lookup: { fieldMappings: [{ field: 'title' }] } } })).toThrow(/ルックアップのコピー先/);
  });
  it('bounds issue and preview size while retaining the full error count', () => {
    const result = plan('title,priority\n' + Array.from({ length: 150 }, (_, i) => `件名${i},対象外`).join('\n'));
    expect(result.issueCount).toBe(150); expect(result.issues).toHaveLength(100); expect(result.sample).toHaveLength(5);
    expect(formatCsvImportReport(result)).toContain('ほか 50件');
  });
});

describe('all-app CSV inspection before any writes', () => {
  it('previews every app with one file read and performs no confirmation or write', async () => {
    const csvFile = file('\uFEFFtitle,amount\nA,100');
    const result = await runPreviewCsvImportStandalone({ appIdsText: '7,8,7', guestId: '3', file: csvFile }, status);
    expect(result.map(item => item.appId)).toEqual(['7', '8']);
    expect(result[0].report.count).toBe(1); expect(result[0].report).not.toHaveProperty('records');
    expect(csvFile.text).toHaveBeenCalledTimes(1);
    expect(apiGet).toHaveBeenNthCalledWith(2, '/k/guest/3/v1', '/app/form/fields.json', { app: '8' });
    expect(kusConfirm).not.toHaveBeenCalled(); expect(apiPost).not.toHaveBeenCalled();
  });
  it('catches a problem after row 100 before the first write', async () => {
    const csv = 'title,amount\n' + Array.from({ length: 102 }, (_, i) => `件名${i},${i === 101 ? '無効' : i}`).join('\n');
    await expect(runCsvImportBatchStandalone({ appId: '7', file: file(csv) }, status)).rejects.toThrow(/103行目.*数値/);
    expect(kusConfirm).not.toHaveBeenCalled(); expect(apiPost).not.toHaveBeenCalled();
  });
  it('stops every app if the second app has a different schema', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce({ properties: props }).mockResolvedValueOnce({ properties: {} });
    await expect(runCsvImportBatchStandalone({ appIdsText: '7,8', file: file('title\nA') }, status)).rejects.toThrow(/App 8:.*存在しない/);
    expect(apiPost).not.toHaveBeenCalled(); expect(kusConfirm).not.toHaveBeenCalled();
  });
  it('retains per-app API errors in a read-only preview', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce({ properties: props }).mockRejectedValueOnce(new Error('権限なし'));
    const result = await runPreviewCsvImportStandalone({ appIdsText: '7,8', file: file('title\nA') }, status);
    expect(result[0].report.issueCount).toBe(0); expect(result[1].error).toBe('権限なし');
    expect(status).toHaveBeenLastCalledWith(expect.stringContaining('1アプリに問題'), true);
  });
  it('inspects all apps before one confirmation, then chunks each app by 100', async () => {
    const csvFile = file('title\n' + Array.from({ length: 201 }, (_, i) => `件名${i}`).join('\n'));
    await runCsvImportBatchStandalone({ appIdsText: '7,8', file: csvFile }, status);
    expect(kusConfirm).toHaveBeenCalledTimes(1);
    expect(kusConfirm).toHaveBeenCalledWith(expect.stringMatching(/App 7: 201件.*App 8: 201件/s));
    expect(apiGet.mock.invocationCallOrder.at(-1)).toBeLessThan(apiPost.mock.invocationCallOrder[0]);
    expect(vi.mocked(apiPost).mock.calls.map(call => call[2].records.length)).toEqual([100, 100, 1, 100, 100, 1]);
    expect(csvFile.text).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenLastCalledWith('CSV取込完了: 2アプリ / 402件');
  });
  it('rechecks schema and file contents after a preview instead of trusting cached success', async () => {
    const csvFile = file('title,amount\nA,100');
    await runPreviewCsvImportStandalone({ appId: '7', file: csvFile }, status);
    csvFile.text.mockResolvedValue('title,amount\nA,invalid');
    await expect(runCsvImportBatchStandalone({ appId: '7', file: csvFile }, status)).rejects.toThrow(/数値/);
    expect(apiGet).toHaveBeenCalledTimes(2); expect(apiPost).not.toHaveBeenCalled();
  });
  it('keeps cancellation distinct from successful import', async () => {
    vi.mocked(kusConfirm).mockReturnValue(false);
    expect(await runCsvImportBatchStandalone({ appId: '7', file: file('title\nA') }, status)).toEqual({ warning: 'CSV取込をキャンセルしました' });
    expect(apiPost).not.toHaveBeenCalled();
  });
  it('retains the committed count on an actual chunk failure', async () => {
    vi.mocked(apiPost).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('権限が変更されました'));
    const csv = 'title\n' + Array.from({ length: 201 }, (_, i) => `件名${i}`).join('\n');
    await expect(runCsvImportBatchStandalone({ appId: '7', file: file(csv) }, status)).rejects.toThrow(/確定済み: 100件.*未処理: 101件/s);
    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(status).not.toHaveBeenCalledWith(expect.stringContaining('CSV取込完了'));
  });
});
