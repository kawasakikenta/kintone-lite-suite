'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = ['src'];
const FORBIDDEN = [
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'document.cookie'
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|mjs|cjs|css|html|md)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const hits = [];
for (const target of TARGETS) {
  const base = path.join(ROOT, target);
  if (!fs.existsSync(base)) continue;
  for (const file of walk(base)) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, idx) => {
      FORBIDDEN.forEach((token) => {
        if (line.includes(token)) {
          hits.push(`${path.relative(ROOT, file)}:${idx + 1}: ${token}`);
        }
      });
    });
  }
}

if (hits.length) {
  console.error('Browser storage APIs are not allowed in the integration tool:');
  console.error(hits.join('\n'));
  process.exit(1);
}

console.log('No browser storage API references found.');
