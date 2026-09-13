import { describe, expect, it } from 'vitest';
import { inspectRecordQuality, readQualityFields, selectQualityFields, qualityRecordPath, qualityReportCsv, reportCsv } from '../../src/tabs/record-quality';
import { parseCsvText } from '../../src/tabs/record-csv-import';

const props = { title: { type: 'SINGLE_LINE_TEXT', label: '件名' }, amount: { type: 'NUMBER', label: '金額' }, tags: { type: 'CHECK_BOX' }, users: { type: 'USER_SELECT' }, file: { type: 'FILE' }, table: { type: 'SUBTABLE', fields: { child: { type: 'SINGLE_LINE_TEXT' } } } };
const cell = (type: string, value: unknown) => ({ type, value });
const record = (id: number, title: string | null, amount = '1') => ({ $id: cell('__ID__', String(id)), title: cell('SINGLE_LINE_TEXT', title), amount: cell('NUMBER', amount) });
const options = { trimText: false, ignoreCase: false };
const inspect = (records: any[], codes = ['title'], opts = options) => inspectRecordQuality(records, selectQualityFields(props, codes), opts);

describe('record quality checks', () => {
  it('offers named top-level supported fields and validates the composite selection', () => {
    expect(readQualityFields(props).map(field => field.code)).toEqual(['title', 'amount', 'tags', 'users']);
    expect(() => selectQualityFields(props, [])).toThrow(/1〜5/);
    expect(() => selectQualityFields(props, ['title', 'title'])).toThrow(/1〜5/);
    expect(() => selectQualityFields(props, ['file'])).toThrow(/使えない/);
    expect(() => selectQualityFields(props, ['title', 'amount', 'tags', 'users', 'file', 'table'])).toThrow(/1〜5/);
  });
  it('finds composite duplicates without merging values containing delimiters', () => {
    const result = inspect([record(1, 'A', '1'), record(2, 'A', '2'), record(3, 'A', '1')], ['title', 'amount']);
    expect(result).toMatchObject({ total: 3, duplicateGroups: 1, duplicateRecords: 2 });
    expect(result.findings.map(item => item.recordId)).toEqual(['1', '3']);
    const fields = [{ code: 'a', label: 'A', type: 'SINGLE_LINE_TEXT' }, { code: 'b', label: 'B', type: 'SINGLE_LINE_TEXT' }];
    expect(inspectRecordQuality([{ $id: cell('__ID__', '1'), a: cell('SINGLE_LINE_TEXT', 'x|y'), b: cell('SINGLE_LINE_TEXT', 'z') }, { $id: cell('__ID__', '2'), a: cell('SINGLE_LINE_TEXT', 'x'), b: cell('SINGLE_LINE_TEXT', 'y|z') }], fields, options).duplicateGroups).toBe(0);
  });
  it('only normalizes text when selected and retains original values for the report', () => {
    const records = [record(1, ' AbC '), record(2, 'abc')];
    expect(inspect(records).duplicateGroups).toBe(0);
    const normalized = inspect(records, ['title'], { trimText: true, ignoreCase: true });
    expect(normalized.duplicateGroups).toBe(1);
    expect(normalized.findings[0].values).toEqual([' AbC ']);
  });
  it('treats empty strings/null as empty and absent/type-mismatched values as unavailable', () => {
    const records: any[] = [record(1, ''), record(2, null), { $id: cell('__ID__', '3') }, { $id: cell('__ID__', '4'), title: cell('NUMBER', '1') }, { $id: cell('__ID__', '5'), title: cell('SINGLE_LINE_TEXT', undefined) }];
    expect(inspect(records)).toMatchObject({ duplicateGroups: 0, emptyRecords: 2, unavailableRecords: 3 });
    expect(inspect([record(1, '   ')], ['title'], { trimText: true, ignoreCase: false }).emptyRecords).toBe(1);
    expect(inspect([record(1, '   ')]).emptyRecords).toBe(0);
  });
  it('compares equivalent decimals without rounding adjacent large integers', () => {
    const result = inspect(['9007199254740992', '9007199254740993', '+001.2300', '123e-2', '-0.000', '0'].map((value, i) => record(i + 1, 'A', value)), ['amount']);
    expect(result).toMatchObject({ duplicateGroups: 2, duplicateRecords: 4, emptyRecords: 0 });
    expect(result.findings.map(item => item.recordId)).toEqual(['3', '4', '5', '6']);
  });
  it('compares selections as sets and users by code, with unavailable array items distinguished', () => {
    const records = [
      { $id: cell('__ID__', '1'), tags: cell('CHECK_BOX', ['B', 'A']), users: cell('USER_SELECT', [{ code: 'alice', name: 'A' }]) },
      { $id: cell('__ID__', '2'), tags: cell('CHECK_BOX', ['A', 'B']), users: cell('USER_SELECT', [{ code: 'alice', name: '別の表示名' }]) },
      { $id: cell('__ID__', '3'), tags: cell('CHECK_BOX', []), users: cell('USER_SELECT', [{ name: 'コードなし' }]) }
    ];
    expect(inspect(records, ['tags', 'users'])).toMatchObject({ duplicateGroups: 1, emptyRecords: 1, unavailableRecords: 1 });
  });
  it('counts zero records and rejects a missing record ID rather than producing broken links', () => {
    expect(inspect([]).total).toBe(0);
    expect(() => inspect([{ title: cell('SINGLE_LINE_TEXT', 'A') }])).toThrow(/レコードID/);
  });
  it('keeps all findings past the screen preview limit and groups across 10,000 records', () => {
    const result = inspect(Array.from({ length: 10001 }, (_, i) => record(i + 1, i === 10000 ? '0' : String(i))));
    expect(result).toMatchObject({ total: 10001, duplicateGroups: 1, duplicateRecords: 2 });
    expect(result.findings[1].recordId).toBe('10001');
  });
  it('creates normal/guest links without interpolating unchecked IDs', () => {
    expect(qualityRecordPath('7', '9', '123')).toBe('/k/guest/9/7/show#record=123');
    expect(qualityRecordPath('7', '', '123')).toBe('/k/7/show#record=123');
    expect(qualityRecordPath('7', '../', '123')).toBe('');
    expect(qualityRecordPath('7', '', 'javascript:alert(1)')).toBe('');
  });
  it('exports scope/partial failures and prevents formula execution in human-readable CSV', () => {
    const report = inspect([record(1, '=1+1'), record(2, '=1+1')]);
    const csv = qualityReportCsv([{ appId: '7', report }, { appId: '8', error: '=HYPERLINK("bad")' }], '9', 'https://example.cybozu.com', options, 'title != ""');
    const rows = parseCsvText(csv.replace(/^\uFEFF/, ''));
    expect(rows[1][6]).toContain('条件: title != ""');
    expect(rows[2][3]).toBe('https://example.cybozu.com/k/guest/9/7/show#record=1');
    expect(rows[2][7]).toBe("'=1+1");
    expect(rows[4][1]).toBe('エラー');
    expect(rows[4][6]).toMatch(/^'/);
    expect(reportCsv([['\t=evil', '+123', '@bad', 'a,"b"\n次']])).toContain("'\t=evil");
  });
});
