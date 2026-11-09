'use strict';

/**
 * Return only the syntactic portion of a kintone query.
 *
 * Clause-like text inside a quoted value is user data, not query syntax. Keep
 * the quote positions as spaces so words on either side cannot accidentally
 * become one token. Backslash escapes are consumed with the following
 * character, matching kintone's query-string escaping rules.
 */
export function querySyntaxText(query: unknown): string {
  const text = String(query || '');
  let syntax = '';
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '\\' && index + 1 < text.length) index++;
      else if (char === '"') quoted = false;
      syntax += ' ';
      continue;
    }
    if (char === '"') {
      quoted = true;
      syntax += ' ';
    } else {
      syntax += char;
    }
  }
  return syntax;
}

export function hasKintoneOrderByClause(query: unknown): boolean {
  return /\border\s+by\b/i.test(querySyntaxText(query));
}

export function hasKintonePagingClause(query: unknown): boolean {
  const syntax = querySyntaxText(query);
  return /\blimit\s+\d+/i.test(syntax) || /\boffset\s+\d+/i.test(syntax);
}

/** クエリの構文として読む語（フィールドコードではないもの）。 */
const QUERY_KEYWORDS: ReadonlySet<string> = new Set(['and', 'or', 'not', 'in', 'like', 'order', 'by', 'asc', 'desc', 'limit', 'offset']);
const NUMBER_TOKEN = /^[+-]?\d+(?:\.\d+)?$/;
/** 「語(…)」の形。関数呼び出し（LOGINUSER()・FROM_TODAY(5, DAYS)・IF(...) など）の名前と引数を取り除くために使う。 */
const CALL_PATTERN = /([^\s()=!<>,+\-*/&^;:%]+)\s*\(([^()]*)\)/g;
const QUERY_SPLIT = /[^\s()=!<>,]+/g;
const EXPRESSION_SPLIT = /[^\s()=!<>,+\-*/&^;:%]+/g;

function uniqueKnownTokens(text: string, split: RegExp, known: ReadonlySet<string>): string[] {
  const found = new Set<string>();
  for (const token of text.match(split) || []) {
    if (NUMBER_TOKEN.test(token) || QUERY_KEYWORDS.has(token.toLowerCase())) continue;
    if (known.has(token)) found.add(token);
  }
  return [...found];
}

/** 関数呼び出し（名前と引数）を空白にする。and / or / not / in の直後の括弧は、条件のまとまりなので残す。 */
function withoutFunctionCalls(syntax: string): string {
  let current = syntax;
  for (let pass = 0; pass < 8; pass++) {
    const next = current.replace(CALL_PATTERN, (match, name: string) => QUERY_KEYWORDS.has(name.toLowerCase()) ? match.replace(/\(/g, ' ').replace(/\)/g, ' ') : ' '.repeat(match.length));
    if (next === current) break;
    current = next;
  }
  return current;
}

/**
 * クエリ（一覧の絞り込み条件・並び順、レコード権限の条件など）が参照するフィールドコードを返す。
 *
 * 引用符の中の値・関数（LOGINUSER()・FROM_TODAY(1, DAYS) など）・演算子・数値・and / or / order by などの語を除き、
 * knownCodes（どちらかのアプリに実在するフィールドコード）と一致した語だけを参照とみなす。
 * 実在しない語は参照とみなさない（値の書き方の揺れで、正しい反映を止めないため）。
 */
export function extractQueryFieldCodes(query: unknown, knownCodes: ReadonlySet<string> | readonly string[]): string[] {
  const known = knownCodes instanceof Set ? knownCodes : new Set(knownCodes);
  if (!known.size) return [];
  return uniqueKnownTokens(withoutFunctionCalls(querySyntaxText(query)), QUERY_SPLIT, known);
}

/**
 * 計算式（計算フィールドの expression、文字列（1行）の自動計算）が参照するフィールドコードを返す。
 * 文字列リテラル・関数名（SUM・IF など）・数値・演算子を除き、knownCodes と一致した語だけを参照とみなす。
 */
export function extractExpressionFieldCodes(expression: unknown, knownCodes: ReadonlySet<string> | readonly string[]): string[] {
  const known = knownCodes instanceof Set ? knownCodes : new Set(knownCodes);
  if (!known.size) return [];
  const syntax = querySyntaxText(expression);
  // 関数名は、直後に括弧が続く語。引数のフィールドは残す（SUM(明細) の「明細」が参照）。
  const withoutNames = syntax.replace(/([^\s()=!<>,+\-*/&^;:%]+)(\s*\()/g, (_match, name: string, paren: string) => ' '.repeat(name.length) + paren);
  return uniqueKnownTokens(withoutNames, EXPRESSION_SPLIT, known);
}
