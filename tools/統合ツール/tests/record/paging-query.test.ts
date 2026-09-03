import { describe, it, expect } from 'vitest';
import {
  hasOrderByClause,
  hasPagingClause,
  buildPagedRecordsQuery,
  buildKeysetRecordsQuery
} from '../../src/tabs/record';

// レコード一括取得（バックアップ / CSV / アプリ間コピー）はこれらのクエリ生成で
// ページングする。limit/offset の取り違えや order by 欠落は取りこぼし・重複の原因に
// なるため、回帰を固定する。

describe('record paging clause detection', () => {
  it('detects order by (case-insensitive, extra spaces)', () => {
    expect(hasOrderByClause('status = "a" order by $id asc')).toBe(true);
    expect(hasOrderByClause('ORDER  BY 金額 desc')).toBe(true);
    expect(hasOrderByClause('status = "a"')).toBe(false);
    expect(hasOrderByClause('')).toBe(false);
  });

  it('ignores clause-like words inside quoted values, including escaped quotes', () => {
    expect(hasOrderByClause('memo like "order by amount"')).toBe(false);
    expect(hasPagingClause('memo = "limit 10 / offset 5"')).toBe(false);
    expect(hasPagingClause('memo = "say \\"limit 10\\"" and limit 20')).toBe(true);
  });

  it('detects limit/offset paging clauses', () => {
    expect(hasPagingClause('limit 100')).toBe(true);
    expect(hasPagingClause('offset 50')).toBe(true);
    expect(hasPagingClause('LIMIT 10 OFFSET 5')).toBe(true);
    expect(hasPagingClause('status = "x"')).toBe(false);
  });
});

describe('buildPagedRecordsQuery', () => {
  it('appends a default order by and limit/offset to a bare query', () => {
    expect(buildPagedRecordsQuery('status = "open"', 0)).toBe(
      'status = "open" order by $id asc limit 500 offset 0'
    );
  });

  it('uses the provided limit and offset', () => {
    expect(buildPagedRecordsQuery('', 1000, { limit: 200 })).toBe(
      'order by $id asc limit 200 offset 1000'
    );
  });

  it('does not duplicate order by when the query already has one', () => {
    const q = buildPagedRecordsQuery('order by 金額 desc', 0);
    expect(q).toBe('order by 金額 desc limit 500 offset 0');
    expect((q.match(/order\s+by/gi) || []).length).toBe(1);
  });

  it('omits order by when includeOrder is false', () => {
    expect(buildPagedRecordsQuery('status = "x"', 0, { includeOrder: false })).toBe(
      'status = "x" limit 500 offset 0'
    );
  });

  it('throws when the user query already contains limit/offset (paging conflict)', () => {
    expect(() => buildPagedRecordsQuery('limit 10', 0)).toThrow(/limit\/offset/);
    expect(() => buildPagedRecordsQuery('offset 5', 0)).toThrow();
  });

  it('coerces numeric-string limit/offset to numbers', () => {
    expect(buildPagedRecordsQuery('', '250' as any, { limit: '50' as any })).toBe(
      'order by $id asc limit 50 offset 250'
    );
  });
});

describe('buildKeysetRecordsQuery', () => {
  it('builds an $id keyset query for a bare base', () => {
    expect(buildKeysetRecordsQuery('', 0)).toBe('$id > 0 order by $id asc limit 500');
  });

  it('wraps a user condition and advances past the last id', () => {
    expect(buildKeysetRecordsQuery('status = "open"', 42, 100)).toBe(
      '(status = "open") and $id > 42 order by $id asc limit 100'
    );
  });

  it('returns null when the base query has its own order by (keyset incompatible)', () => {
    expect(buildKeysetRecordsQuery('order by 金額 desc', 10)).toBeNull();
  });

  it('throws when the base query already pages with limit/offset', () => {
    expect(() => buildKeysetRecordsQuery('limit 10', 0)).toThrow(/limit\/offset/);
  });

  it('coerces numeric-string last id / limit to numbers', () => {
    expect(buildKeysetRecordsQuery('', '42' as any, '100' as any)).toBe(
      '$id > 42 order by $id asc limit 100'
    );
  });
});
