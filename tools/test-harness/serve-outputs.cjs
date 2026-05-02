'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.resolve(__dirname, 'outputs');
const HARNESS_ROOT = path.resolve(__dirname);
const TOOLS_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8765;
const MIME = {
  '.html': 'text/html;charset=utf-8',
  '.json': 'application/json;charset=utf-8',
  '.md':   'text/plain;charset=utf-8',
  '.csv':  'text/plain;charset=utf-8',
  '.mmd':  'text/plain;charset=utf-8',
  '.js':   'text/javascript;charset=utf-8',
  '.css':  'text/css;charset=utf-8',
};

function resolveFile(rawPath) {
  const safe = path.normalize(rawPath).replace(/^[/\\]+/, '');
  // 1) /統合ツール.js は tools/統合ツール.js を返す
  if (safe === '統合ツール.js') {
    return path.resolve(TOOLS_ROOT, '統合ツール.js');
  }
  // 2) /suite-harness.html は test-harness 直下を返す
  if (safe === 'suite-harness.html') {
    return path.resolve(HARNESS_ROOT, 'suite-harness.html');
  }
  // 3) それ以外は outputs/ 配下
  return path.resolve(ROOT, safe || 'index.html');
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
}

http.createServer((req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const u = decodeURIComponent(url.parse(req.url).pathname);
  const file = resolveFile(u);
  // どの ROOT 配下にも入っていなければ拒否
  const allowed = file.startsWith(ROOT) || file.startsWith(HARNESS_ROOT) || file === path.resolve(TOOLS_ROOT, '統合ツール.js');
  if (!allowed) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) {
      console.log(`404 ${u} -> ${file} (${err.code})`);
      res.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' });
      return res.end('not found: ' + u);
    }
    console.log(`200 ${u} (${data.length}B)`);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`serving ${ROOT} on http://127.0.0.1:${PORT}`);
  console.log(`harness: http://127.0.0.1:${PORT}/suite-harness.html`);
});
