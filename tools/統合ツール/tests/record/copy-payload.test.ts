import { describe, it, expect } from 'vitest';
import { buildCopyRecordPayloads, parseCsvText, validateCsvImportHeader } from '../../src/tabs/record-standalone';

// レコードコピーの payload は本番アプリへ POST される。システム項目・ファイルの除外と
// サブテーブル行に id を含めないことは kintone REST の制約なので回帰を固定する。

describe('buildCopyRecordPayloads', () => {
  const record = {
    $id: { type: '__ID__', value: '10' },
    $revision: { type: '__REVISION__', value: '3' },
    レコード番号: { type: 'RECORD_NUMBER', value: '10' },
    作成者: { type: 'CREATOR', value: { code: 'u' } },
    title: { type: 'SINGLE_LINE_TEXT', value: 'hello' },
    total: { type: 'CALC', value: '100' },
    attach: { type: 'FILE', value: [{ fileKey: 'k', name: 'a.pdf' }] },
    table: {
      type: 'SUBTABLE',
      value: [{
        id: '55',
        value: {
          item: { type: 'SINGLE_LINE_TEXT', value: 'row' },
          rowFile: { type: 'FILE', value: [{ fileKey: 'k2' }] },
          rowCalc: { type: 'CALC', value: '1' }
        }
      }]
    }
  };

  it('drops system, calc and file fields and strips subtable row ids', () => {
    const plan = buildCopyRecordPayloads([record]);
    expect(plan.records).toEqual([{
      title: { value: 'hello' },
      table: { value: [{ value: { item: { value: 'row' } } }] }
    }]);
    expect(plan.droppedFields).toEqual([]);
  });

  it('drops fields the target app does not have (or has with another type) and reports them', () => {
    const targetProps = {
      title: { type: 'SINGLE_LINE_TEXT', code: 'title' },
      table: { type: 'SUBTABLE', code: 'table', fields: { other: { type: 'SINGLE_LINE_TEXT' } } }
    };
    const plan = buildCopyRecordPayloads([{ ...record, extra: { type: 'NUMBER', value: '1' }, title: { type: 'MULTI_LINE_TEXT', value: 'x' } }], targetProps);
    expect(plan.records).toEqual([{ table: { value: [{ value: {} }] } }]);
    expect(plan.droppedFields).toEqual(['extra', 'table.item', 'title(型不一致)']);
  });
});

describe('parseCsvText', () => {
  it('handles quoted cells with commas, escaped quotes and CRLF', () => {
    expect(parseCsvText('a,b\r\n"x,y","say ""hi"""\n')).toEqual([['a', 'b'], ['x,y', 'say "hi"']]);
  });

  it('keeps newlines inside quoted cells', () => {
    expect(parseCsvText('a\n"line1\nline2"')).toEqual([['a'], ['line1\nline2']]);
  });
});

describe('validateCsvImportHeader', () => {
  const props = { title: { type: 'SINGLE_LINE_TEXT' }, attach: { type: 'FILE' } };
  it('rejects $id, unknown codes and unsupported types', () => {
    expect(() => validateCsvImportHeader(['$id'], props)).toThrow(/システムフィールド/);
    expect(() => validateCsvImportHeader(['nope'], props)).toThrow(/存在しないフィールドコード.*nope/);
    expect(() => validateCsvImportHeader(['attach'], props)).toThrow(/非対応.*attach\(FILE\)/);
    expect(() => validateCsvImportHeader(['title', ''], props)).not.toThrow();
  });
});
