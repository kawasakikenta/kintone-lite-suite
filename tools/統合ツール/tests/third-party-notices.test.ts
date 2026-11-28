import { describe, expect, it } from 'vitest';
import { build } from 'esbuild';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawTextPlugin } from '../rawTextPlugin.js';
import { bundledPackages, thirdPartyNoticeComment } from '../thirdPartyNotices.js';

const toolDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('thirdPartyNotices（配布物へ同梱した npm パッケージのライセンス表記）', () => {
  it('設計書の Excel 出力が同梱する xlsx-js-style を見つけ、?raw で取り込んだ ER図のライブラリは数えない', async () => {
    const design = await build({
      absWorkingDir: toolDir,
      entryPoints: [join(toolDir, 'src/tabs/sheetLib.ts')],
      bundle: true,
      write: false,
      metafile: true,
      format: 'iife',
      logLevel: 'silent'
    });
    expect(bundledPackages(design.metafile)).toEqual(['xlsx-js-style']);

    const er = await build({
      absWorkingDir: toolDir,
      entryPoints: [join(toolDir, 'src/tabs/er-libraries.ts')],
      bundle: true,
      write: false,
      metafile: true,
      format: 'iife',
      logLevel: 'silent',
      plugins: [rawTextPlugin]
    });
    expect(bundledPackages(er.metafile)).toEqual([]);
  });

  it('パッケージごとに名前・版・ライセンス名と LICENSE の全文（Apache License 2.0 を含む）を入れ、コメントを途中で閉じない', () => {
    const comment = thirdPartyNoticeComment(['xlsx-js-style'], toolDir);
    const pkg = JSON.parse(readFileSync(join(toolDir, 'node_modules', 'xlsx-js-style', 'package.json'), 'utf8'));
    const license = readFileSync(join(toolDir, 'node_modules', 'xlsx-js-style', 'LICENSE'), 'utf8').replace(/\r\n?/g, '\n').trim();
    expect(comment).toContain(`xlsx-js-style ${pkg.version} (Apache-2.0)`);
    expect(comment).toContain(license);
    expect(comment).toContain('TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION');
    expect(comment).toContain('Copyright (C) 2012-present   SheetJS LLC');
    expect(comment.startsWith('/*!\n')).toBe(true);
    expect(comment.slice(3, -3)).not.toContain('*/');
    expect(thirdPartyNoticeComment([], toolDir)).toBe('');
  });

  it('LICENSE ファイルが無いパッケージは、表記を入れられないことを示して止める', () => {
    const root = mkdtempSync(join(tmpdir(), 'kls-notice-'));
    try {
      mkdirSync(join(root, 'node_modules', '@scope', 'no-license'), { recursive: true });
      writeFileSync(join(root, 'node_modules', '@scope', 'no-license', 'package.json'), JSON.stringify({ name: '@scope/no-license', version: '1.0.0', license: 'MIT' }));
      expect(() => thirdPartyNoticeComment(['@scope/no-license'], root)).toThrow(/@scope\/no-license: LICENSE/);
      writeFileSync(join(root, 'node_modules', '@scope', 'no-license', 'LICENSE.md'), 'MIT License\r\n\r\nCopyright (c) test */ end');
      const comment = thirdPartyNoticeComment(['@scope/no-license'], root);
      expect(comment).toContain('@scope/no-license 1.0.0 (MIT)\n\nMIT License\n\nCopyright (c) test * / end');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('入れ子の node_modules にあるパッケージも、外側のパッケージとは別に表記を入れる', () => {
    const metafile = {
      inputs: {
        'node_modules/outer/index.js': {},
        'node_modules/outer/node_modules/inner/dist/index.js': {},
        'node_modules\\outer\\node_modules\\@scope\\deep\\index.js': {},
        '../../node_modules/top/lib/a.js': {},
        'raw-text:node_modules/raw/file.js': {},
        'src/api.ts': {}
      }
    };
    expect(bundledPackages(metafile)).toEqual([
      'outer',
      'outer/node_modules/@scope/deep',
      'outer/node_modules/inner',
      'top'
    ]);

    const root = mkdtempSync(join(tmpdir(), 'kls-notice-nested-'));
    try {
      const inner = join(root, 'node_modules', 'outer', 'node_modules', 'inner');
      mkdirSync(inner, { recursive: true });
      writeFileSync(join(inner, 'package.json'), JSON.stringify({ name: 'inner', version: '2.3.4', license: 'ISC' }));
      writeFileSync(join(inner, 'LICENSE'), 'ISC License\n\nCopyright (c) inner');
      expect(thirdPartyNoticeComment(['outer/node_modules/inner'], root)).toContain('inner 2.3.4 (ISC)\n\nISC License\n\nCopyright (c) inner');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('配布物 設計書作成.js は、自動生成の注意書きの直後に xlsx-js-style のライセンスの全文を持つ（build.js の出力）', () => {
    const dist = readFileSync(join(toolDir, '..', '設計書作成.js'), 'utf8').replace(/\r\n?/g, '\n');
    const license = readFileSync(join(toolDir, 'node_modules', 'xlsx-js-style', 'LICENSE'), 'utf8').replace(/\r\n?/g, '\n').trim();
    const bannerEnd = dist.indexOf('// ==========================================================================\n/*!\nThird-party software bundled in this file:');
    expect(bannerEnd).toBeGreaterThan(0);
    expect(dist.slice(0, bannerEnd)).toContain('自動生成ファイル');
    expect(dist).toContain(`xlsx-js-style 1.2.0 (Apache-2.0)\n\n${license}`);
  });
});
