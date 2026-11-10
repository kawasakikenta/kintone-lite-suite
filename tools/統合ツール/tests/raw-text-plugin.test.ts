import { describe, expect, it } from 'vitest';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawTextPlugin } from '../rawTextPlugin.js';

const toolDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function bundle(source: string): Promise<string> {
  const result = await build({
    stdin: { contents: source, resolveDir: toolDir, loader: 'js' },
    bundle: true,
    write: false,
    format: 'iife',
    logLevel: 'silent',
    plugins: [rawTextPlugin]
  });
  return result.outputFiles[0].text;
}

describe('rawTextPlugin（?raw でファイルを文字列として取り込む）', () => {
  it('ファイルの中身を文字列として取り込む', async () => {
    const output = await bundle("import text from 'dagre/LICENSE?raw'; globalThis.__raw = text;");
    const license = readFileSync(join(toolDir, 'node_modules/dagre/LICENSE'), 'utf8');
    expect(license.length).toBeGreaterThan(100);
    const firstLine = license.split('\n')[0];
    expect(output).toContain(firstLine);
  });

  it('生成物に、ビルドした場所（絶対パス）を残さない', async () => {
    const output = await bundle("import text from 'dagre/LICENSE?raw'; globalThis.__raw = text;");
    // esbuild が書く取り込み元のコメントは、ビルドした場所によらない相対パスになる
    expect(output).toContain('// raw-text:node_modules/dagre/LICENSE');
    expect(output).not.toContain(toolDir);
    expect(output).not.toContain(toolDir.replace(/\\/g, '/'));
  });

  it('コミット済みの ER図.js にも、取り込み元の絶対パスが残っていない', () => {
    const erBundle = readFileSync(join(toolDir, '..', 'ER図.js'), 'utf8');
    const origins = erBundle.match(/^\s*\/\/ raw-text:.*$/gm) || [];
    expect(origins.length).toBeGreaterThan(0);
    for (const origin of origins) expect(origin).toMatch(/\/\/ raw-text:node_modules\//);
  });

  it('見つからないファイルはビルドの失敗として知らせる', async () => {
    await expect(bundle("import text from './no-such-file.txt?raw'; globalThis.__raw = text;")).rejects.toThrow();
  });
});
