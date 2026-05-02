'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.resolve(__dirname, 'outputs');
const PORT = Number(process.env.PORT) || 8765;
const MIME = {
  '.html': 'text/html;charset=utf-8',
  '.json': 'application/json;charset=utf-8',
  '.md':   'text/plain;charset=utf-8',
  '.csv':  'text/plain;charset=utf-8',
  '.mmd':  'text/plain;charset=utf-8',
};

http.createServer((req, res) => {
  const u = decodeURIComponent(url.parse(req.url).pathname);
  const safe = path.normalize(u).replace(/^[/\\]+/, '');
  const file = path.resolve(ROOT, safe || 'diff-report.html');
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
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
});
