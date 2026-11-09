import { describe, expect, it } from 'vitest';
import { extractExpressionFieldCodes, extractQueryFieldCodes } from '../src/kintone-query';

const KNOWN = ['status', 'region', 'amount', '顧客名', 'due', 'owner', 'DAYS', '明細', 'qty', 'price', 'in_stock'];

describe('extractQueryFieldCodes: クエリが参照するフィールドコード', () => {
  it('演算子の左のフィールドコードを取り出す', () => {
    expect(extractQueryFieldCodes('region = "東日本"', KNOWN)).toEqual(['region']);
    expect(extractQueryFieldCodes('amount > 1000 and status != "完了"', KNOWN)).toEqual(['amount', 'status']);
    expect(extractQueryFieldCodes('(amount >= 10) or (due <= 5)', KNOWN)).toEqual(['amount', 'due']);
    expect(extractQueryFieldCodes('顧客名 like "株式会社"', KNOWN)).toEqual(['顧客名']);
  });

  it('in / not in の一覧・order by の並び順（asc / desc）に使う語を読む', () => {
    expect(extractQueryFieldCodes('status not in ("完了", "保留")', KNOWN)).toEqual(['status']);
    expect(extractQueryFieldCodes('region in ("a", "b") order by amount desc, due asc', KNOWN)).toEqual(['region', 'amount', 'due']);
    expect(extractQueryFieldCodes('due desc, amount asc', KNOWN)).toEqual(['due', 'amount']);
  });

  it('引用符の中の値は参照にしない（フィールドコードと同じ語でも）', () => {
    expect(extractQueryFieldCodes('status = "region"', KNOWN)).toEqual(['status']);
    expect(extractQueryFieldCodes('status = "a \\" region \\" b"', KNOWN)).toEqual(['status']);
    expect(extractQueryFieldCodes('memo like "amount and due"', KNOWN)).toEqual([]);
  });

  it('関数（LOGINUSER()・TODAY()・FROM_TODAY(5, DAYS)）は参照にしない。関数の引数のうち語も読まない', () => {
    expect(extractQueryFieldCodes('owner in (LOGINUSER()) and due < TODAY()', KNOWN)).toEqual(['owner', 'due']);
    expect(extractQueryFieldCodes('due = FROM_TODAY(5, DAYS)', KNOWN)).toEqual(['due']);
    expect(extractQueryFieldCodes('owner = LOGINUSER()', KNOWN)).toEqual(['owner']);
  });

  it('実在しない語・数値・キーワードは参照にしない（既存の反映を止めない）', () => {
    expect(extractQueryFieldCodes('unknown_field = "x" and 123 > 5', KNOWN)).toEqual([]);
    expect(extractQueryFieldCodes('order by limit offset', KNOWN)).toEqual([]);
    expect(extractQueryFieldCodes('', KNOWN)).toEqual([]);
    expect(extractQueryFieldCodes(undefined, KNOWN)).toEqual([]);
    expect(extractQueryFieldCodes('region = "x"', [])).toEqual([]);
  });

  it('同じフィールドを何度使っても 1 つだけ返す。Set も受け付ける', () => {
    expect(extractQueryFieldCodes('region = "a" or region = "b"', new Set(KNOWN))).toEqual(['region']);
  });

  it('and / or のあとの括弧を関数と読み違えない', () => {
    expect(extractQueryFieldCodes('status = "x" and (region = "y" or (amount > 1))', KNOWN)).toEqual(['status', 'region', 'amount']);
    expect(extractQueryFieldCodes('not (status = "x")', KNOWN)).toEqual(['status']);
  });
});

describe('extractExpressionFieldCodes: 計算式が参照するフィールドコード', () => {
  it('四則演算・関数の引数のフィールドコードを取り出す', () => {
    expect(extractExpressionFieldCodes('amount * qty + price', KNOWN)).toEqual(['amount', 'qty', 'price']);
    expect(extractExpressionFieldCodes('SUM(明細) + ROUND(amount / 3, 0)', KNOWN)).toEqual(['明細', 'amount']);
    expect(extractExpressionFieldCodes('IF(amount > 100, qty, price)', KNOWN)).toEqual(['amount', 'qty', 'price']);
  });

  it('文字列リテラル・関数名・数値は参照にしない', () => {
    expect(extractExpressionFieldCodes('region & "-amount-" & status', KNOWN)).toEqual(['region', 'status']);
    expect(extractExpressionFieldCodes('IF(status = "region", 1, 2)', KNOWN)).toEqual(['status']);
    expect(extractExpressionFieldCodes('DATE_FORMAT(due, "yyyy-MM-dd", "Asia/Tokyo")', KNOWN)).toEqual(['due']);
    expect(extractExpressionFieldCodes('1.5 * 3 + 2', KNOWN)).toEqual([]);
  });

  it('関数と同じ名前のフィールドは、括弧が続かなければフィールドとして読む', () => {
    expect(extractExpressionFieldCodes('DAYS + 1', KNOWN)).toEqual(['DAYS']);
    expect(extractExpressionFieldCodes('DAYS(due, 1)', KNOWN)).toEqual(['due']);
  });

  it('実在しない語は参照にしない', () => {
    expect(extractExpressionFieldCodes('mystery * 2', KNOWN)).toEqual([]);
    expect(extractExpressionFieldCodes('', KNOWN)).toEqual([]);
    expect(extractExpressionFieldCodes('amount * 2', [])).toEqual([]);
  });
});
