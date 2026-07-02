import { describe, it, expect } from 'vitest';
import { splitCsvListValue, coerceCsvImportValue } from '../../src/tabs/record';

// CSVインポートの複数値フィールド（チェックボックス・複数選択・ユーザー選択等）は
// splitCsvListValue で値を分解する。かつて入力値を捨てて常に空配列を返す退行があり、
// 複数値フィールドが黙って空でインポートされていたため、値が保持されることを固定する。

describe('splitCsvListValue', () => {
  it('splits comma-separated values and trims each item', () => {
    expect(splitCsvListValue('A, B ,C')).toEqual(['A', 'B', 'C']);
    expect(splitCsvListValue('選択肢1,選択肢2')).toEqual(['選択肢1', '選択肢2']);
  });

  it('returns a single-element array for a plain value', () => {
    expect(splitCsvListValue('A')).toEqual(['A']);
  });

  it('drops empty segments', () => {
    expect(splitCsvListValue('A,,B,')).toEqual(['A', 'B']);
  });

  it('returns an empty array for null/undefined/empty', () => {
    expect(splitCsvListValue(null)).toEqual([]);
    expect(splitCsvListValue(undefined)).toEqual([]);
    expect(splitCsvListValue('')).toEqual([]);
    expect(splitCsvListValue('   ')).toEqual([]);
  });

  it('stringifies non-string input', () => {
    expect(splitCsvListValue(123)).toEqual(['123']);
  });
});

describe('coerceCsvImportValue', () => {
  it('converts CHECK_BOX / MULTI_SELECT to string arrays', () => {
    expect(coerceCsvImportValue('A,B', { type: 'CHECK_BOX' })).toEqual(['A', 'B']);
    expect(coerceCsvImportValue('X', { type: 'MULTI_SELECT' })).toEqual(['X']);
  });

  it('converts USER/ORGANIZATION/GROUP_SELECT to {code} arrays', () => {
    expect(coerceCsvImportValue('user1, user2', { type: 'USER_SELECT' }))
      .toEqual([{ code: 'user1' }, { code: 'user2' }]);
    expect(coerceCsvImportValue('org1', { type: 'ORGANIZATION_SELECT' }))
      .toEqual([{ code: 'org1' }]);
    expect(coerceCsvImportValue('grp1', { type: 'GROUP_SELECT' }))
      .toEqual([{ code: 'grp1' }]);
  });

  it('trims NUMBER and passes through other types unchanged', () => {
    expect(coerceCsvImportValue(' 100 ', { type: 'NUMBER' })).toBe('100');
    expect(coerceCsvImportValue('text', { type: 'SINGLE_LINE_TEXT' })).toBe('text');
  });
});
