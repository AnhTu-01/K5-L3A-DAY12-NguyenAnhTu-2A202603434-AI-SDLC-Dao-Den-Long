// Máy chủ tĩnh tối giản (không thêm phụ thuộc): phục vụ web/, src/ và three.js từ node_modules.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';

const root = path.dirname(new URL(import.meta.url).pathname);
const PORT = Number(process.env.PORT) || 8080;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.mp3': 'audio/mpeg', '.png': 'image/png' };

function resolve(url) {
  const p = decodeURIComponent(url.split('?')[0]);
  if (p === '/' || p === '/index.html') return path.join(root, 'web', 'index.html');
  if (p === '/vendor/three.module.js') return path.join(root, 'node_modules', 'three', 'build', 'three.module.js');
  if (p.startsWith('/src/')) return path.join(root, p);
  if (p.startsWith('/web/')) return path.join(root, p);
  return null;
}

http.createServer((req, res) => {
  const file = resolve(req.url);
  if (!file || !file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Đảo Đèn Lồng đang chạy: ${url}  (Ctrl+C để dừng)`);
  if (process.env.NO_OPEN !== '1') {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} ${url}`, () => {});
  }
});
