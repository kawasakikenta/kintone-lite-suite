'use strict';

/**
 * 差分の選択・修正（reflect/selection*.ts）で使う、JSON Pointer と設定オブジェクトの操作。DOM 非依存。
 * 設定のキーにはフィールドコードや一覧名などの利用者定義の名前が入るため、prototype を汚さないよう
 * 読み書きはすべて自身のプロパティだけを対象にする（`__proto__` という名前でも壊れない）。
 */

export const own = (target: object, key: string): boolean => Object.prototype.hasOwnProperty.call(target, key);
export const isPlainObject = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);

/** JSON をたどって作る深いコピー（undefined のプロパティは落ちる）。 */
export function cloneJson<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

/** 並び順に依存しない比較（キー順だけが違うオブジェクトは同じ）。 */
export function stableJson(value: unknown): string {
  const sort = (input: any): any => Array.isArray(input) ? input.map(sort) : isPlainObject(input)
    ? Object.fromEntries(Object.keys(input).sort().map(key => [key, sort(input[key])])) : input;
  return JSON.stringify(sort(value)) ?? 'undefined';
}

export const sameValue = (a: unknown, b: unknown): boolean => stableJson(a) === stableJson(b);

export const escapePointerToken = (token: string): string => token.replace(/~/g, '~0').replace(/\//g, '~1');
export const unescapePointerToken = (token: string): string => token.replace(/~1/g, '/').replace(/~0/g, '~');

export function pointerOf(tokens: readonly string[]): string {
  return tokens.map(token => `/${escapePointerToken(token)}`).join('');
}

export function parsePointer(pointer: string): string[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) throw new Error(`JSON Pointer の形式が不正です: ${pointer}`);
  return pointer.slice(1).split('/').map(unescapePointerToken);
}

export function setOwn(target: Record<string, any>, key: string, value: unknown): void {
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
}

export function getAt(root: any, tokens: readonly string[]): any {
  let current = root;
  for (const token of tokens) {
    if (!isPlainObject(current) || !own(current, token)) return undefined;
    current = current[token];
  }
  return current;
}

/** tokens の場所に value を置く。途中のオブジェクトが無ければ作る。 */
export function setAt(root: any, tokens: readonly string[], value: unknown): void {
  if (!tokens.length) throw new Error('ルートは置き換えられません。');
  let current = root;
  for (const token of tokens.slice(0, -1)) {
    if (!isPlainObject(current[token]) || !own(current, token)) setOwn(current, token, {});
    current = current[token];
  }
  setOwn(current, tokens[tokens.length - 1], value);
}

export function deleteAt(root: any, tokens: readonly string[]): void {
  if (!tokens.length) return;
  const parent = getAt(root, tokens.slice(0, -1));
  if (isPlainObject(parent)) delete parent[tokens[tokens.length - 1]];
}

/** pointer が scope と同じ、または scope の内側か。 */
export function pointerWithin(pointer: string, scope: string): boolean {
  return pointer === scope || pointer.startsWith(`${scope}/`);
}
