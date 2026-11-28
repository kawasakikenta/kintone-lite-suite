'use strict';

/**
 * 設計書の表のセル・文の部品。Markdown と HTML の設計書で同じ内容・同じ言葉を出すため、
 * 文字列と「コード表記」（フィールドコードなど。Markdown は `…`、HTML は <code>）だけを区別して持つ。
 * エスケープはしない（出力する形式の側で行う）。
 */
export type DesignInline = string | { readonly code: string };

/** 部品を並べた文。設定の値（JSON）から作られることはないよう、クラスのインスタンスで区別する。 */
export class DesignRichText {
  readonly parts: readonly DesignInline[];
  constructor(parts: readonly DesignInline[]) {
    this.parts = parts;
  }
}

/** 表の 1 つのセル。DesignRichText 以外の値は、そのまま文字列にして出す（null・undefined は空）。 */
export type DesignCell = unknown;

/** 表の見出しと行。行が無ければ表を出さない。 */
export interface DesignTable {
  headers: readonly string[];
  rows: DesignCell[][];
}

export function richText(...parts: DesignInline[]): DesignRichText {
  return new DesignRichText(parts);
}

/** コード表記の部品。テンプレート文字列（`${value}`）と同じ規則で文字列にする。 */
export function codeOf(value: unknown): { code: string } {
  return { code: `${value}` };
}

export function isRichText(value: unknown): value is DesignRichText {
  return value instanceof DesignRichText;
}

/** 部品の並びを区切り文字でつなぐ。 */
export function joinRich(items: ReadonlyArray<readonly DesignInline[]>, separator: string): DesignRichText {
  const parts: DesignInline[] = [];
  items.forEach((item, index) => {
    if (index) parts.push(separator);
    parts.push(...item);
  });
  return new DesignRichText(parts);
}

/**
 * 配列の各要素を部品の並びにしてつなぐ。`list.map(fn).join(separator)` と同じく、配列の穴（欠けた要素）は空の要素として区切りだけを入れる。
 */
export function mapJoinRich<T>(list: readonly T[], fn: (item: T, index: number) => DesignInline[], separator: string): DesignRichText {
  const items: DesignInline[][] = [];
  for (let index = 0; index < list.length; index += 1) items.push(index in list ? fn(list[index], index) : []);
  return joinRich(items, separator);
}

/** Markdown の文字列にする（コードは `…`。表のセルのエスケープは呼び出し側）。DesignRichText 以外はそのまま返す。 */
export function richToMarkdown(value: DesignCell): unknown {
  if (!isRichText(value)) return value;
  return value.parts.map((part) => (typeof part === 'string' ? part : `\`${part.code}\``)).join('');
}

/** 書式を除いた文字列（検索・空の判定に使う）。 */
export function richToPlainText(value: DesignCell): string {
  if (isRichText(value)) return value.parts.map((part) => (typeof part === 'string' ? part : part.code)).join('');
  return String(value ?? '');
}
