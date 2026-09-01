import { describe, it, expect, vi } from 'vitest';
import {
  buildCursorRecordsQuery,
  buildRecordsCsvText,
  csvEscape,
  describeBatchWriteFailure,
  extractRecordCsvValue,
  uniqueZipEntryName,
  writeInChunks
} from '../../src/tabs/record-query';

// lite 版レコード管理（CSV出力 / 取込 / コピー / バックアップ）が共有する純粋ヘルパー。
// 部分成功の報告と CSV の引用規則はデータ破損に直結するため回帰を固定する。

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
