import { describe, expect, it } from 'vitest';
import { buildRecordCsvExport } from '../../src/tabs/record-csv-export';
import { buildRecordsCsvText } from '../../src/tabs/record-query';

const text = (value: unknown) => ({ type: 'SINGLE_LINE_TEXT', value });
const table = (value: any[]) => ({ type: 'SUBTABLE', value });
const row = (id: unknown, value: Record<string, any>) => ({ id, value });
const tableSchema = (fields: Record<string, any> = {}) => ({ type: 'SUBTABLE', fields });

describe('buildRecordCsvExport', () => {
  it('preserves the existing parent CSV when no subtable exists and does not require an ID', () => {
    const records = [{ name: text('a,b'), quantity: { type: 'NUMBER', value: 0 } }];
    const properties = { name: { type: 'SINGLE_LINE_TEXT' }, quantity: { type: 'NUMBER' } };
    expect(buildRecordCsvExport(records, properties)).toEqual({
      parentCsv: buildRecordsCsvText(records, ['name', 'quantity']), tables: [], warnings: []
    });
  });

  it('keeps parent rows and table counts while exporting each table separately without a Cartesian product', () => {
    const records = [
      { $id: text('10'), name: text('first'), Lines: table([row('101', { item: text('A') }), row('102', { item: text('B') })]), Notes: table([row('201', { note: text('x') })]) },
      { $id: text('20'), name: text('second'), Lines: table([row('103', { item: text('C') })]), Notes: table([row('202', { note: text('y') }), row('203', { note: text('z') })]) }
    ];
    const result = buildRecordCsvExport(records, {
      name: { type: 'SINGLE_LINE_TEXT' }, $id: { type: '__ID__' },
      Lines: tableSchema({ item: {} }), Notes: tableSchema({ note: {} })
    });
    expect(result.parentCsv).toBe('\uFEFF$id,name,Lines,Notes\n10,first,2行,1行\n20,second,1行,2行');
    expect(result.tables).toEqual([
      { fieldCode: 'Lines', fileName: 'tables/Lines.csv', rowCount: 3, csvText: '\uFEFF$id,$rowId,$rowIndex,item\n10,101,1,A\n10,102,2,B\n20,103,1,C' },
      { fieldCode: 'Notes', fileName: 'tables/Notes.csv', rowCount: 3, csvText: '\uFEFF$id,$rowId,$rowIndex,note\n10,201,1,x\n20,202,1,y\n20,203,2,z' }
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('emits header-only details for empty tables, including a completely empty record set', () => {
    const properties = { Lines: tableSchema({ item: {} }) };
    const empty = buildRecordCsvExport([], properties);
    expect(empty.parentCsv).toBe('\uFEFF$id,Lines');
    expect(empty.tables[0]).toMatchObject({ rowCount: 0, csvText: '\uFEFF$id,$rowId,$rowIndex,item' });
    const result = buildRecordCsvExport([{ $id: text('1'), Lines: table([]) }], properties);
    expect(result.parentCsv).toBe('\uFEFF$id,Lines\n1,0行');
    expect(result.tables).toEqual(empty.tables);
    expect(result.warnings).toEqual([]);
  });

  it('uses existing CSV quoting and conversion for zero, multiline text, selections, users and attachments', () => {
    const result = buildRecordCsvExport([{ $id: text('1'), Lines: table([row('9', {
      quantity: { type: 'NUMBER', value: 0 },
      note: text('a,"b"\r\nc'),
      choices: { type: 'MULTI_SELECT', value: ['A', 'B'] },
      users: { type: 'USER_SELECT', value: [{ code: 'u1' }, { name: 'User 2' }] },
      attachment: { type: 'FILE', value: [{ name: 'a,b.pdf', fileKey: 'private-key' }] }
    })]) }], { Lines: tableSchema({ quantity: {}, note: {}, choices: {}, users: {}, attachment: {} }) });
    expect(result.tables[0].csvText).toBe('\uFEFF$id,$rowId,$rowIndex,quantity,note,choices,users,attachment\n1,9,1,0,"a,""b""\r\nc","A,B","u1,User 2","a,b.pdf"');
    expect(result.tables[0].csvText).not.toContain('private-key');
  });

  it('extends child headers with every observed code after the schema columns', () => {
    const result = buildRecordCsvExport([
      { $id: text('1'), Lines: table([row('11', { known: text('K'), newOne: text('A') })]) },
      { $id: text('2'), Lines: table([row('22', { later: text('B'), known: text('L') })]) }
    ], { Lines: tableSchema({ known: {}, absent: {} }) });
    expect(result.tables[0].csvText).toBe('\uFEFF$id,$rowId,$rowIndex,known,absent,newOne,later\n1,11,1,K,,A,\n2,22,1,L,,,B');
  });

  it('includes tables observed in records even when the schema has not listed them', () => {
    const result = buildRecordCsvExport([{ $id: text('1'), name: text('parent'), NewTable: table([row('4', { newField: text('kept') })]) }], { name: {} });
    expect(result.parentCsv).toBe('\uFEFF$id,name,NewTable\n1,parent,1行');
    expect(result.tables[0]).toEqual({ fieldCode: 'NewTable', fileName: 'tables/NewTable.csv', rowCount: 1, csvText: '\uFEFF$id,$rowId,$rowIndex,newField\n1,4,1,kept' });
  });

  it.each([undefined, null, '', '   ', {}, Number.NaN])('rejects missing or unusable parent IDs (%j)', (id) => {
    expect(() => buildRecordCsvExport([{ $id: text(id), Lines: table([]) }], { Lines: tableSchema() }))
      .toThrow('レコードID（$id）がありません');
  });

  it('allows absent row IDs and maintains the per-parent one-based row index', () => {
    const result = buildRecordCsvExport([{ $id: text('1'), Lines: table([row(undefined, { item: text('A') }), row(null, { item: text('B') })]) }], { Lines: tableSchema({ item: {} }) });
    expect(result.tables[0].csvText).toBe('\uFEFF$id,$rowId,$rowIndex,item\n1,,1,A\n1,,2,B');
  });

  it('warns about unavailable table fields with parent ID and field code without calling them empty', () => {
    const result = buildRecordCsvExport([{ $id: text('1'), Lines: table([]) }, { $id: text('2') }], { Lines: tableSchema({ item: {} }) });
    expect(result.parentCsv).toBe('\uFEFF$id,Lines\n1,0行\n2,');
    expect(result.tables[0].rowCount).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('レコードID 2');
    expect(result.warnings[0]).toContain('テーブル Lines');
    expect(result.warnings[0]).toContain('空テーブルとは区別');
  });

  it('uses map keys for CSV codes and never repeats the parent ID column', () => {
    const result = buildRecordCsvExport([{ $id: text('1'), first: text('A'), second: text('B'), Lines: table([]) }], {
      first: { code: 'duplicate' }, second: { code: 'duplicate' }, $id: {}, Lines: tableSchema()
    });
    expect(result.parentCsv).toBe('\uFEFF$id,first,second,Lines\n1,A,B,0行');
  });

  it('treats missing tables named like object properties as unavailable fields', () => {
    const result = buildRecordCsvExport([{ $id: text('1') }], { constructor: tableSchema({ item: {} }) });
    expect(result.tables[0].rowCount).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('テーブル constructor');
  });

  it.each(['$id', '$rowId', '$rowIndex'])('rejects reserved child-column collisions (%s) instead of losing values', (code) => {
    expect(() => buildRecordCsvExport([{ $id: text('1'), Lines: table([row('2', { [code]: text('keep me') })]) }], { Lines: tableSchema() }))
      .toThrow('明細の識別列と重複');
  });

  it('produces safe distinct ZIP paths even for traversal names, reserved names and case collisions', () => {
    const codes = ['../明細', '..\\明細', '..', 'CON', 'A', 'a', 'a_2', 'A_2', 'x'.repeat(150), 'x'.repeat(151)];
    const properties = Object.fromEntries(codes.map((code) => [code, tableSchema()]));
    const result = buildRecordCsvExport([], properties);
    const names = result.tables.map((entry) => entry.fileName);
    expect(new Set(names.map((name) => name.toLowerCase())).size).toBe(codes.length);
    expect(names).toContain('tables/_CON.csv');
    expect(result.tables.map((entry) => entry.fieldCode)).toEqual(codes);
    for (const name of names) {
      expect(name.split('/')).toHaveLength(2);
      expect(name).toMatch(/^tables\/[^\\/:*?"<>|\u0000-\u001f]+\.csv$/);
      expect(name).not.toContain('../');
      expect(new TextEncoder().encode(name.split('/')[1]).length).toBeLessThan(255);
    }
  });

  it.each([
    { type: 'SINGLE_LINE_TEXT', value: 'not a table' },
    { type: 'SUBTABLE', value: null },
    { type: 'SUBTABLE', value: {} }
  ])('rejects invalid table values (%j) rather than silently discarding them', (field) => {
    expect(() => buildRecordCsvExport([{ $id: text('1'), Lines: field }], { Lines: tableSchema() })).toThrow('型または行データが不正');
  });

  it('rejects malformed detail rows with their parent and row position', () => {
    expect(() => buildRecordCsvExport([{ $id: text('1'), Lines: table([{ id: '2', value: null }]) }], { Lines: tableSchema() }))
      .toThrow('レコードID 1: テーブル Lines の1行目の値が不正');
  });
});
