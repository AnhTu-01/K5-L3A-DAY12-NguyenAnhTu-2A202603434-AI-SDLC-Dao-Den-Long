// Máy chủ tĩnh tối giản + API bảng xếp hạng. Dùng chung cho server.js và scripts/bench.js.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import * as lb from './src/leaderboard.js';

const root = path.dirname(new URL(import.meta.url).pathname);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.mp3': 'audio/mpeg', '.png': 'image/png' };

function resolve(url) {
  const p = decodeURIComponent(url.split('?')[0]);
  if (p === '/' || p === '/index.html') return path.join(root, 'web', 'index.html');
  if (p === '/vendor/three.module.js') return path.join(root, 'node_modules', 'three', 'build', 'three.module.js');
  if (p.startsWith('/src/') || p.startsWith('/web/')) return path.join(root, p);
  return null;
}

function readBody(req, limit = 1 << 20) {
  return new Promise((ok, bad) => {
    let n = 0; const chunks = [];
    req.on('data', (c) => { n += c.length; if (n > limit) { bad(new Error('quá lớn')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')));
    req.on('error', bad);
  });
}
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

export function createAppServer({ onBench } = {}) {
  return http.createServer(async (req, res) => {
    const url = req.url.split('?')[0];
    try {
      if (url === '/api/leaderboard' && req.method === 'GET') return json(res, 200, { entries: lb.load() });
      if (url === '/api/leaderboard' && req.method === 'POST') {
        try { return json(res, 200, { entries: lb.add(JSON.parse(await readBody(req))) }); } catch (e) { return json(res, 400, { error: e.message }); }
      }
      if (url === '/__bench' && req.method === 'POST' && onBench) {
        onBench(JSON.parse(await readBody(req))); return json(res, 200, { ok: true });
      }
    } catch (e) { return json(res, 500, { error: e.message }); }
    const file = resolve(req.url);
    if (!file || !file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}
