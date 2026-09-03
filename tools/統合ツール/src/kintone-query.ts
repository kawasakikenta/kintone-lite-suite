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
