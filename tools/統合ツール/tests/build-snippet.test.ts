import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

// scripts/build-snippet.js はビルドした tools/*.js をコンソール用・ブックマークレット用の文字列にする。
// 以前はコメントと空行を正規表現で消していたため、文字列の中の「/* … */」「// …」の行と空行まで消し、
// ER図.js に埋め込んだ dagre の本体（文字列）が約 10 万文字欠け、cytoscape のライセンス表記も消えていた。

const script = resolve(__dirname, '../../../scripts/build-snippet.js');
const dir = mkdtempSync(join(tmpdir(), 'kus-snippet-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const source = [
  '// ==========================================================================',
  '// sample.js  —  自動生成ファイル（手編集禁止）',
  '(() => {',
  "  var lib = '/**\\n * Copyright (c) Example. MIT License.\\n */\\n!function(){var a=\"/*\";var b=\"*/\";globalThis.__lib=a+b;}();';",
  '  var text = `first line',
  '',
  '// this line is part of the string, not a comment',
  '/* also part of the string */',
  'last line`;',
  '  globalThis.__out = { lib, text };',
  '})();',
  ''
].join('\r\n');

function run(mode: 'console' | 'bookmarklet'): string {
  const file = join(dir, 'sample.js');
  writeFileSync(file, source, 'utf8');
  return execFileSync(process.execPath, [script, file, mode], { encoding: 'utf8' }).replace(/\r?\n$/, '');
}

function evaluate(code: string): { lib: string; text: string } {
  const sandbox: any = {};
  new Function('globalThis', code)(sandbox);
  return sandbox.__out;
}

describe('build-snippet', () => {
  const expected = evaluate(source);

  it('keeps strings (embedded libraries, license notices, template text) unchanged in console mode', () => {
    const out = evaluate(run('console'));
    expect(out.lib).toBe(expected.lib);
    expect(out.lib).toContain('MIT License');
    expect(out.text).toBe(expected.text);
  });

  it('keeps the same program in bookmarklet mode', () => {
    const bookmarklet = run('bookmarklet');
    expect(bookmarklet.startsWith('javascript:')).toBe(true);
    const out = evaluate(decodeURIComponent(bookmarklet.slice('javascript:'.length)));
    expect(out).toEqual(expected);
  });
});
