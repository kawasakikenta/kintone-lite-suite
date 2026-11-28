#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const [inputPath, mode = 'console'] = process.argv.slice(2);

if (!inputPath) {
  console.error('Usage: node scripts/build-snippet.js <input.js> [console|bookmarklet]');
  process.exit(1);
}

function resolveInputPath(input) {
  const direct = path.resolve(process.cwd(), input);
  if (fs.existsSync(direct)) return direct;

  return null;
}

const absPath = resolveInputPath(inputPath);
if (!absPath) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

const source = fs.readFileSync(absPath, 'utf8').trim();

if (!source) {
  console.error(`File is empty: ${inputPath}`);
  process.exit(1);
}

// コメントや空行は消さない。正規表現では文字列の中（埋め込んだライブラリの本体・ライセンス表記・テンプレートの文章）と
// 見分けられず、中身を壊すため。改行コードだけを LF にそろえる（テンプレートリテラルの値も LF として読まれるので変わらない）。
const oneLine = source.replace(/\r\n/g, '\n');

if (mode === 'bookmarklet') {
  const bookmarklet = `javascript:${encodeURIComponent(oneLine)}`;
  console.log(bookmarklet);
  process.exit(0);
}

if (mode !== 'console') {
  console.error(`Unknown mode: ${mode} (use "console" or "bookmarklet")`);
  process.exit(1);
}

console.log(oneLine);
