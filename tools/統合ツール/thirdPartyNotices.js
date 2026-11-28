'use strict';

const fs = require('fs');
const path = require('path');

/**
 * 配布物（tools/*.js）へ同梱した npm パッケージのライセンス表記を作る。
 * 同梱物の多くは配布ファイルに著作権コメントを持たないため、ビルドの際に各パッケージの LICENSE の全文を前置する。
 * ER図の HTML へ `?raw` で埋め込むライブラリ（src/tabs/er-libraries.ts）は、そちらで表記を付けるので対象外。
 */

const LICENSE_FILE_NAMES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'license'];

/**
 * esbuild の metafile の入力から、同梱した npm パッケージを集める（`raw-text:` などプラグインの名前空間の入力は除く）。
 * 戻り値は node_modules からの位置。入れ子のパッケージは `a/node_modules/b` の形で、a とは別に数える。
 */
function bundledPackages(metafile) {
  const names = new Set();
  for (const input of Object.keys(metafile?.inputs || {})) {
    if (/^[a-z-]+:/i.test(input)) continue;
    const match = input.replace(/\\/g, '/')
      .match(/(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*)\//);
    if (match) names.add(match[1]);
  }
  return [...names].sort();
}

/** 1 パッケージ分の表記（名前・版・ライセンス名と LICENSE の全文）。LICENSE が無ければビルドを止める。 */
function packageNotice(name, rootDir) {
  const dir = path.join(rootDir, 'node_modules', ...name.split('/'));
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const file = LICENSE_FILE_NAMES.map((fileName) => path.join(dir, fileName)).find((candidate) => fs.existsSync(candidate));
  if (!file) throw new Error(`[build] ${name}: LICENSE ファイルが見つからないため、配布物にライセンス表記を入れられません`);
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n').trim();
  return `${pkg.name || name} ${pkg.version} (${pkg.license || 'license unknown'})\n\n${text}`;
}

/** 配布物の先頭へ置く `/*! ... *\/` コメント。同梱したパッケージが無ければ空文字。 */
function thirdPartyNoticeComment(names, rootDir) {
  if (!names.length) return '';
  const body = names.map((name) => packageNotice(name, rootDir)).join('\n\n---\n\n');
  return `/*!\nThird-party software bundled in this file:\n\n${body.replace(/\*\//g, '* /')}\n*/\n`;
}

module.exports = { bundledPackages, thirdPartyNoticeComment };
