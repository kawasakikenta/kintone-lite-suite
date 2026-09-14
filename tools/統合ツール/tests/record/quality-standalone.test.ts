import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, fetchRecordsByQuery } from '../../src/api';
import { downloadBlob } from '../../src/utils';
import { loadJSZipLite } from '../../src/jszipLoader';
import { runRecordQualityStandalone, runLoadQualityFieldsStandalone, runCsvTemplateStandalone } from '../../src/tabs/record-quality-standalone';
import { buildCsvImportTemplate } from '../../src/tabs/record-template';
import { parseCsvText, planCsvImport } from '../../src/tabs/record-csv-import';
vi.mock('../../src/api', async original => ({ ...await original<typeof import('../../src/api')>(), apiGet: vi.fn(), fetchRecordsByQuery: vi.fn() }));
vi.mock('../../src/utils', async original => ({ ...await original<typeof import('../../src/utils')>(), downloadBlob: vi.fn() }));
vi.mock('../../src/jszipLoader', () => ({ loadJSZipLite: vi.fn() }));
class FakeZip {
  static files = new Map<string, string>();
  file(name: string, content: string) { FakeZip.files.set(name, content); return this; }
  async generateAsync() { return new Blob(['zip']); }
}
const props = { title: { type: 'SINGLE_LINE_TEXT', label: '件名', required: true, defaultValue: '初期値', minLength: '1' }, priority: { type: 'DROP_DOWN', options: { 低: { index: '1' }, 高: { index: '0' } } } };
const options = { appIdsText: '7,8', guestId: '9', codes: ['title'], query: 'order by title asc', trimText: false, ignoreCase: false };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiGet).mockReset().mockResolvedValue({ properties: props });
  vi.mocked(fetchRecordsByQuery).mockReset().mockResolvedValue({ records: [], mode: 'cursor' });
  vi.mocked(loadJSZipLite).mockResolvedValue(FakeZip as any);
  FakeZip.files.clear();
});

describe('quality inspection and CSV templates from API settings', () => {
  it('loads field labels in the user language from the first app', async () => {
    expect(await runLoadQualityFieldsStandalone(options)).toHaveLength(2);
    expect(apiGet).toHaveBeenCalledWith('/k/guest/9/v1', '/app/form/fields.json', { app: '7', lang: 'user' });
  });
  it('revalidates each schema and fetches only selected fields plus ID with the original query', async () => {
    await runRecordQualityStandalone(options, vi.fn());
    expect(apiGet).toHaveBeenCalledTimes(2);
    expect(fetchRecordsByQuery).toHaveBeenCalledWith('/k/guest/9/v1', '8', options.query, expect.objectContaining({ fields: ['$id', 'title'] }));
  });
  it('retains per-app failures and continues after retrieval or schema errors', async () => {
    vi.mocked(fetchRecordsByQuery).mockRejectedValueOnce(new Error('権限不足'));
    const result = await runRecordQualityStandalone(options, vi.fn());
    expect(result[0].error).toBe('権限不足');
    expect(result[1].report?.total).toBe(0);
    vi.mocked(apiGet).mockResolvedValueOnce({ properties: {} });
    vi.mocked(fetchRecordsByQuery).mockClear();
    expect((await runRecordQualityStandalone(options, vi.fn()))[0].error).toContain('使えない');
    expect(fetchRecordsByQuery).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid connection values before any API call', async () => {
    await expect(runRecordQualityStandalone({ ...options, guestId: '../' }, vi.fn())).rejects.toThrow(/ゲストID/);
    await expect(runCsvTemplateStandalone({ appIdsText: '', guestId: '' }, vi.fn())).rejects.toThrow(/対象アプリ/);
    expect(apiGet).not.toHaveBeenCalled();
  });
  it('generates a header-only template compatible with the importer and ordered choice guide', () => {
    const template = buildCsvImportTemplate(props);
    expect(template.csv).toBe('\uFEFFtitle,priority\r\n');
    expect(planCsvImport(parseCsvText(template.csv.replace(/^\uFEFF/, '') + '案件A,高'), props).issueCount).toBe(0);
    const guide = parseCsvText(template.guideCsv.replace(/^\uFEFF/, ''));
    expect(guide[1]).toEqual(['title', '件名', 'SINGLE_LINE_TEXT', '必須', '', '"初期値"', '[]', '最小文字数: 1']);
    expect(guide[2][6]).toBe('["高","低"]');
    expect(template.readme).toContain('初期値を使う項目は列を削除');
    expect(template.readme.split('\r\n')[0]).toBe('【使い方】');
    expect(template.readme).toContain('【同梱ファイル】');
    expect(template.readme).toContain('【注意】');
  });
  it('excludes tables/files/computed/lookup-copy/unknown fields using the importer rules', () => {
    const schema = { ...props, copied: { type: 'SINGLE_LINE_TEXT' }, lookup: { type: 'SINGLE_LINE_TEXT', lookup: { fieldMappings: [{ field: 'copied' }] } }, auto: { type: 'SINGLE_LINE_TEXT', expression: '1' }, table: { type: 'SUBTABLE' }, file: { type: 'FILE' }, newType: { type: 'UNKNOWN' } };
    const template = buildCsvImportTemplate(schema);
    expect(template.csv).toBe('\uFEFFtitle,priority,lookup\r\n');
    expect(template.excludedCsv).toContain('ルックアップのコピー先');
    expect(template.excludedCsv).toContain('UNKNOWN');
    expect(() => buildCsvImportTemplate({ file: { type: 'FILE' } })).toThrow(/対応するフィールド/);
  });
  it('keeps exact unusual field codes while escaping guide formula cells', () => {
    const template = buildCsvImportTemplate({ '=code': { type: 'SINGLE_LINE_TEXT', label: '=1+1' }, 'a,b': { type: 'NUMBER' } });
    expect(parseCsvText(template.csv.replace(/^\uFEFF/, ''))[0]).toEqual(['=code', 'a,b']);
    expect(parseCsvText(template.guideCsv.replace(/^\uFEFF/, ''))[1][1]).toBe("'=1+1");
  });
  it('includes types/default settings as explanatory values, never as sample records', () => {
    const template = buildCsvImportTemplate({ users: { type: 'USER_SELECT', defaultValue: [{ code: 'LOGINUSER()', type: 'FUNCTION' }] }, date: { type: 'DATE', defaultNowValue: true }, tags: { type: 'MULTI_SELECT', options: { 'a,b': { index: '0' } } } });
    expect(template.guideCsv).toContain('LOGINUSER()');
    expect(template.guideCsv).toContain('現在の日付・日時');
    expect(template.guideCsv).toContain('カンマを含む選択肢');
    expect(parseCsvText(template.csv.replace(/^\uFEFF/, ''))).toHaveLength(1);
  });
  it('packages all apps separately and records partial failures in the ZIP manifest', async () => {
    vi.mocked(apiGet).mockRejectedValueOnce(new Error('設定権限なし'));
    const result = await runCsvTemplateStandalone(options, vi.fn());
    expect(result.warning).toContain('失敗 1アプリ');
    expect([...FakeZip.files.keys()]).toEqual(['app_8/import.csv', 'app_8/fields.csv', 'app_8/excluded.csv', 'app_8/README.txt', 'manifest.json']);
    expect(JSON.parse(FakeZip.files.get('manifest.json')!).failures).toEqual(['App 7: 設定権限なし']);
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(fetchRecordsByQuery).not.toHaveBeenCalled();
    expect(apiGet).toHaveBeenCalledWith('/k/guest/9/v1', '/app/form/fields.json', { app: '8' });
  });
  it('avoids saving empty ZIPs if no app succeeds', async () => {
    vi.mocked(apiGet).mockRejectedValue(new Error('拒否'));
    await expect(runCsvTemplateStandalone(options, vi.fn())).rejects.toThrow(/作成できません/);
    expect(loadJSZipLite).not.toHaveBeenCalled();
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});
