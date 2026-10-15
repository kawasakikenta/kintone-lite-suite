import { describe, expect, it } from 'vitest';
import { findReferencedFieldCodes } from '../../src/tabs/design-xlsx';

describe('findReferencedFieldCodes', () => {
  it('日本語コードは別のコードの一部としては参照扱いにしない', () => {
    const codes = ['金額', '合計金額', '税込金額'];
    expect(findReferencedFieldCodes('合計金額 > 100', codes)).toEqual(['合計金額']);
    expect(findReferencedFieldCodes('金額 > 100 and 税込金額 < 5', codes)).toEqual(['金額', '税込金額']);
  });

  it('ASCII コードも単語境界で判定し、記号や括弧に隣接する参照は検出する', () => {
    const codes = ['amount', 'amount2', 'amt_total'];
    expect(findReferencedFieldCodes('amount2 > 1', codes)).toEqual(['amount2']);
    expect(findReferencedFieldCodes('(amount>1) and amt_total in ("a")', codes)).toEqual(['amount', 'amt_total']);
    expect(findReferencedFieldCodes('', codes)).toEqual([]);
    expect(findReferencedFieldCodes(null, codes)).toEqual([]);
  });

  it('正規表現の特殊文字を含むコードでも例外にならない', () => {
    expect(findReferencedFieldCodes('a.b = 1', ['a.b', 'a+b'])).toEqual(['a.b']);
  });
});
