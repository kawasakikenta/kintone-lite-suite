'use strict';

// ソース・テスト・ハーネス・ビルドスクリプトに、見えない文字（ゼロ幅文字・BOM・制御文字）と
// 双方向テキストの制御文字（RLO など）がそのまま入っていないことを確かめる。
// これらは画面やレビューでは見えず、コードの見た目と実際の動きを食い違わせる（Trojan Source）。
// 文字列や正規表現で必要なときは、エスケープ表記（バックスラッシュ + u + 4 桁の 16 進）で書く。
// 範囲は数値で持つ（このファイル自体にも、エスケープ表記を実際の文字に戻されてもよいように）。

const fs = require('fs');
const path = require('path');

const TOOL_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(TOOL_ROOT, '..', '..');
const TARGETS = [
  path.join(TOOL_ROOT, 'src'),
  path.join(TOOL_ROOT, 'tests'),
  path.join(TOOL_ROOT, 'scripts'),
  path.join(REPO_ROOT, 'tools', 'test-harness'),
  path.join(REPO_ROOT, 'scripts')
];
const SINGLE_FILES = ['build.js', 'thirdPartyNotices.js', 'rawTextPlugin.js'].map((name) => path.join(TOOL_ROOT, name));
const SKIP_DIRS = new Set(['node_modules', 'dist', 'outputs']);
const EXTENSIONS = /\.(ts|tsx|js|mjs|cjs|css|html|json|md)$/;

// [開始, 終了]（両端を含む）。タブ（0x09）・改行（0x0A）・復帰（0x0D）は許す。
const FORBIDDEN_RANGES = [
  [0x0000, 0x0008], [0x000B, 0x000C], [0x000E, 0x001F], [0x007F, 0x009F],
  [0x061C, 0x061C], [0x200B, 0x200F], [0x2028, 0x202E], [0x2060, 0x2064],
  [0x2066, 0x2069], [0xFEFF, 0xFEFF]
];

function isForbidden(codePoint) {
  return FORBIDDEN_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTENSIONS.test(entry.name)) out.push(full);
  }
  return out;
}

const files = [...TARGETS.flatMap((dir) => walk(dir)), ...SINGLE_FILES.filter((file) => fs.existsSync(file))];
const hits = [];
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const found = new Set();
    for (const ch of line) {
      const codePoint = ch.codePointAt(0);
      if (isForbidden(codePoint)) found.add('U+' + codePoint.toString(16).toUpperCase().padStart(4, '0'));
    }
    if (found.size) hits.push(`${path.relative(REPO_ROOT, file)}:${index + 1}: ${[...found].join(', ')}`);
  });
}

if (hits.length) {
  console.error('Invisible or bidirectional control characters must be written as escapes (backslash-u followed by 4 hex digits):');
  console.error(hits.join('\n'));
  process.exit(1);
}

console.log(`No invisible or bidirectional control characters found (${files.length} files).`);
