#!/usr/bin/env node
// Benchmark (TICKET-04 §1): node scripts/bench.js --seed 42 --duration 30 --out bench.json
// Mở Chrome/Chromium cửa sổ 1280×720 (tắt vsync + khóa 60 FPS bằng cờ dòng lệnh) tới ?bench=1, chờ trang gửi kết quả về, ghi bench.json rồi thoát mã 0.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createAppServer } from '../server-lib.js';

function fail(msg, code = 1) { process.stderr.write(msg + '\n'); process.exit(code); }
const a = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i], v = process.argv[i + 1];
  if (!k.startsWith('--') || v === undefined || v.startsWith('--')) fail('cách dùng: bench.js --seed N --duration S --out file');
  a[k.slice(2)] = v;
}
const num = (k, d) => { if (a[k] === undefined) return d; if (!/^\d+$/.test(a[k])) fail(`--${k} phải là số nguyên dương`); return Number(a[k]); };
const seed = num('seed', 42), duration = num('duration', 30);
if (duration < 1) fail('--duration phải >= 1');
if (!a.out) fail('thiếu --out');

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const c = {
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
    win32: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  }[process.platform] || [];
  return c.find((p) => fs.existsSync(p)) || null;
}

const launchEpoch = Date.now();
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-bench-'));
let chrome = null, peakKb = 0, sampler = null, finished = false;

// RSS cao nhất của cây tiến trình Chrome (gồm mọi tiến trình mang --user-data-dir của lần chạy này). Windows: không đo → null.
function sampleRss() {
  if (process.platform === 'win32') return;
  try {
    const out = execFileSync('ps', ['-A', '-o', 'rss=,command='], { encoding: 'utf8', maxBuffer: 1 << 24 });
    let sum = 0;
    for (const line of out.split('\n')) if (line.includes(profile)) sum += Number(line.trim().split(/\s+/)[0]) || 0;
    if (sum > peakKb) peakKb = sum;
  } catch (e) { /* bỏ qua */ }
}
function cleanup() {
  if (sampler) clearInterval(sampler);
  try { if (chrome) chrome.kill(); } catch (e) { /* đã thoát */ }
  if (process.platform !== 'win32') { try { execFileSync('pkill', ['-f', profile]); } catch (e) { /* không còn tiến trình */ } }
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* bỏ qua */ }
}

const server = createAppServer({
  onBench(r) {
    if (finished) return;
    finished = true;
    sampleRss();
    const out = {
      contract_version: '1.3',
      avg_fps: r.avg_fps, p1_low_fps: r.p1_low_fps, frame_ms_p95: r.frame_ms_p95, frames: r.frames,
      load_ms: Math.max(0, Math.round(r.first_frame_epoch - launchEpoch)),
      peak_mem_mb: peakKb > 0 ? Math.round(peakKb / 1024) : null,
      vsync_off: !process.env.BENCH_KEEP_VSYNC,
      renderer: r.renderer,
      os: `${os.type()} ${os.release()} ${os.arch()} · ${os.cpus()[0] ? os.cpus()[0].model : 'cpu?'} · ${Math.round(os.totalmem() / 2 ** 30)} GB RAM`,
    };
    fs.writeFileSync(a.out, JSON.stringify(out, null, 2) + '\n');
    process.stdout.write(JSON.stringify(out) + '\n');
    cleanup(); server.close(); process.exit(0);
  },
});
server.listen(Number(process.env.PORT) || 0, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}/?bench=1&seed=${seed}&duration=${duration}`;
  const bin = findChrome();
  if (!bin || process.env.BENCH_MANUAL) {
    process.stderr.write(`Mở thủ công bằng Chrome (cửa sổ 1280×720): ${url}\n`);
    return; // máy chủ vẫn chờ trang gửi kết quả
  }
  const args = ['--user-data-dir=' + profile, '--window-size=1280,720', '--window-position=0,0', '--no-first-run', '--no-default-browser-check',
    '--disable-gpu-vsync', '--disable-frame-rate-limit', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
  if (process.env.BENCH_KEEP_VSYNC) args.splice(args.indexOf('--disable-gpu-vsync'), 2);
  if (process.env.BENCH_EXTRA_ARGS) args.push(...process.env.BENCH_EXTRA_ARGS.split(' ').filter(Boolean));
  args.push(url);
  chrome = spawn(bin, args, { stdio: 'ignore' });
  chrome.on('error', (e) => { cleanup(); fail('không chạy được Chrome: ' + e.message); });
  sampler = setInterval(sampleRss, 500);
});
setTimeout(() => { cleanup(); fail('quá thời gian chờ benchmark (không nhận được kết quả)'); }, (duration + 90) * 1000).unref?.();
process.on('SIGINT', () => { cleanup(); process.exit(130); });
