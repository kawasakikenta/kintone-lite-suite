const fs = require('fs');
const path = require('path');
const targets = process.argv.slice(2);
let count = 0;
for (const p of targets) {
  if (!fs.existsSync(p)) continue;
  const body = fs.readFileSync(p, 'utf8');
  const lines = body.split(/\r?\n/);
  while (lines.length && /^\s*\/\/\s*@ts-nocheck\b/.test(lines[0])) {
    lines.shift();
    count += 1;
  }
  fs.writeFileSync(p, lines.join('\n'), 'utf8');
}
console.log('removed @ts-nocheck headers:', count);
