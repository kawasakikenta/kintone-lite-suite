import { describe, it, expect, vi } from 'vitest';
import {
  buildCursorRecordsQuery,
  buildRecordsCsvText,
  csvEscape,
  describeBatchWriteFailure,
  extractRecordCsvValue,
  neutralizeCsvFormula,
  uniqueZipEntryName,
  writeInChunks
} from '../../src/tabs/record-query';

// lite 版レコード管理（CSV出力 / 取込 / コピー / バックアップ）が共有する純粋ヘルパー。
// 部分成功の報告と CSV の引用規則はデータ破損に直結するため回帰を固定する。

describe('neutralizeCsvFormula', () => {
  it('prepends apostrophe for formula-start characters', () => {
    expect(neutralizeCsvFormula('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(neutralizeCsvFormula('+81-3-1234')).toBe("'+81-3-1234");
    expect(neutralizeCsvFormula('@user')).toBe("'@user");
    expect(neutralizeCsvFormula('-5円')).toBe("'-5円");
  });

  it('does not neutralize pure numeric strings', () => {
    expect(neutralizeCsvFormula('-5')).toBe('-5');
    expect(neutralizeCsvFormula('+3.14')).toBe('+3.14');
    expect(neutralizeCsvFormula('-1.2e5')).toBe('-1.2e5');
  });

  it('handles leading whitespace as formula trigger', () => {
    expect(neutralizeCsvFormula(' =1')).toBe("' =1");
  });

  it('handles tab/CR/LF start', () => {
    expect(neutralizeCsvFormula('\t=evil')).toBe("'\t=evil");
    expect(neutralizeCsvFormula('\r\ndata')).toBe("'\r\ndata");
  });

  it('leaves empty string and normal strings unchanged', () => {
    expect(neutralizeCsvFormula('')).toBe('');
    expect(neutralizeCsvFormula('hello')).toBe('hello');
    expect(neutralizeCsvFormula('123')).toBe('123');
  });
});

describe('csv helpers', () => {
  it('quotes values containing comma, quote, LF or CR', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
    expect(csvEscape('line1\r\nline2')).toBe('"line1\r\nline2"');
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape(null)).toBe('');
  });

  it('flattens multi-value and structured field types', () => {
    const rec = {
      users: { type: 'USER_SELECT', value: [{ code: 'u1', name: 'User 1' }, { name: 'only name' }] },
      tags: { type: 'CHECK_BOX', value: ['A', 'B'] },
      files: { type: 'FILE', value: [{ name: 'a.pdf', fileKey: 'k' }] },
      table: { type: 'SUBTABLE', value: [{ id: '1', value: {} }, { id: '2', value: {} }] },
      text: { type: 'SINGLE_LINE_TEXT', value: 'hello' },
      empty: { type: 'NUMBER', value: null }
    };
    expect(extractRecordCsvValue(rec, 'users')).toBe('u1,only name');
    expect(extractRecordCsvValue(rec, 'tags')).toBe('A,B');
    expect(extractRecordCsvValue(rec, 'files')).toBe('a.pdf');
    expect(extractRecordCsvValue(rec, 'table')).toBe('2行');
    expect(extractRecordCsvValue(rec, 'text')).toBe('hello');
    expect(extractRecordCsvValue(rec, 'empty')).toBe('');
    expect(extractRecordCsvValue(rec, 'missing')).toBe('');
  });

  it('builds a BOM-prefixed CSV with a header row', () => {
    const text = buildRecordsCsvText([{ a: { type: 'SINGLE_LINE_TEXT', value: 'x,y' } }], ['a', 'b']);
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text.slice(1)).toBe('a,b\n"x,y",');
  });

  it('neutralizes formula characters in data cells', () => {
    const rec = {
      formula: { type: 'SINGLE_LINE_TEXT', value: '=SUM(A1)' },
      phone:   { type: 'SINGLE_LINE_TEXT', value: '+81-3-1234' },
      negnum:  { type: 'NUMBER', value: '-5' },
      negtext: { type: 'SINGLE_LINE_TEXT', value: '-5円' },
      atuser:  { type: 'SINGLE_LINE_TEXT', value: '@user' },
      normal:  { type: 'SINGLE_LINE_TEXT', value: 'hello' },
      empty:   { type: 'SINGLE_LINE_TEXT', value: '' }
    };
    const text = buildRecordsCsvText([rec], ['formula', 'phone', 'negnum', 'negtext', 'atuser', 'normal', 'empty']);
    const lines = text.slice(1).split('\n');
    // header row: plain column names, no formula chars
    expect(lines[0]).toBe('formula,phone,negnum,negtext,atuser,normal,empty');
    // data row: formula-start cells get apostrophe; pure number (-5) does not
    expect(lines[1]).toBe("'=SUM(A1),'+81-3-1234,-5,'-5円,'@user,hello,");
  });

  it('neutralizes formula characters in header cells', () => {
    const text = buildRecordsCsvText([], ['=id', '+count', 'normal']);
    expect(text.slice(1)).toBe("'=id,'+count,normal");
  });

  it('properly escapes value after adding apostrophe when value contains comma', () => {
    const rec = { x: { type: 'SINGLE_LINE_TEXT', value: '=sum,hello' } };
    const text = buildRecordsCsvText([rec], ['x']);
    // apostrophe prepended, then quoted because of comma
    expect(text.slice(1)).toBe("x\n\"'=sum,hello\"");
  });

  it('neutralizes tab-started values and does not double-quote unless also containing comma/quote/newline', () => {
    const rec = { t: { type: 'SINGLE_LINE_TEXT', value: '\t=evil' } };
    const text = buildRecordsCsvText([rec], ['t']);
    // apostrophe prepended; tab alone does not trigger csvEscape quoting
    expect(text.slice(1)).toBe("t\n'\t=evil");
  });
});

describe('buildCursorRecordsQuery', () => {
  it('keeps the user order by and rejects limit/offset', () => {
    expect(buildCursorRecordsQuery('  status = "a" order by 金額 desc ')).toBe('status = "a" order by 金額 desc');
    expect(() => buildCursorRecordsQuery('order by $id limit 10')).toThrow(/limit\/offset/);
  });
});

describe('uniqueZipEntryName', () => {
  it('suffixes duplicates before the extension', () => {
    const used = new Set<string>();
    expect(uniqueZipEntryName(used, 'app.js')).toBe('app.js');
    expect(uniqueZipEntryName(used, 'app.js')).toBe('app_2.js');
    expect(uniqueZipEntryName(used, 'app.js')).toBe('app_3.js');
    expect(uniqueZipEntryName(used, 'noext')).toBe('noext');
    expect(uniqueZipEntryName(used, 'noext')).toBe('noext_2');
  });
});

describe('writeInChunks', () => {
  it('writes in 100-record chunks and reports progress', async () => {
    const items = Array.from({ length: 250 }, (_, i) => i);
    const chunks: number[] = [];
    const progress: number[] = [];
    const done = await writeInChunks(items, 'テスト', async (chunk) => { chunks.push(chunk.length); }, (d) => progress.push(d));
    expect(done).toBe(250);
    expect(chunks).toEqual([100, 100, 50]);
    expect(progress).toEqual([100, 200, 250]);
  });

  it('surfaces how many records were committed before a failure', async () => {
    const items = Array.from({ length: 250 }, (_, i) => i);
    const write = vi.fn(async (_chunk: number[], index: number) => {
      if (index === 1) throw new Error('GAIA_XX: 権限がありません');
    });
    await expect(writeInChunks(items, 'CSV取込', write)).rejects.toMatchObject({
      message: expect.stringContaining('確定済み: 100件 / 失敗チャンク: 101～200件目 / 未処理: 150件（全250件）'),
      partial: { done: 100, from: 101, to: 200, total: 250 }
    });
    expect(write).toHaveBeenCalledTimes(2);
  });

  it('formats a failure description with the original reason', () => {
    const text = describeBatchWriteFailure('コピー', { done: 0, from: 1, to: 100, total: 100 }, new Error('boom'));
    expect(text).toContain('コピーが途中で失敗しました。');
    expect(text).toContain('原因: boom');
  });
});
