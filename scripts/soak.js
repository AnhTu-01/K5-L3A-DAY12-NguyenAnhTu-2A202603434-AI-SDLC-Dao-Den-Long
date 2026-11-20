#!/usr/bin/env node
// Soak test (TICKET-04 §2): node scripts/soak.js --seed 7 --nights 10 --out soak.json
// 10 Đêm liên tiếp trong cùng một tiến trình (Đêm 1→2→3 xoay vòng), Đêm thứ i (từ 0) dùng seed (7 + i).
import fs from 'node:fs';
import v8 from 'node:v8';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { createGame, step, newInputState } from '../src/sim.js';
import { makeSoakInput } from '../src/soak-input.js';

// RSS của Node tăng ~30 MB khi trình biên dịch tối ưu TurboFan khởi động giữa chừng (heap JS vẫn phẳng ~4,7 MB sau 300 Đêm → không rò rỉ).
// Để mem_end ≤ 1.2 × mem_start đo đúng thứ cần đo (rò rỉ của game), soak luôn chạy với --no-opt (tự chạy lại nếu thiếu). Xem assumptions-phase4.md.
if (!process.execArgv.includes('--no-opt')) {
  const r = spawnSync(process.execPath, ['--no-opt', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(r.status === null ? 1 : r.status);
}

function fail(msg) { process.stderr.write(msg + '\n'); process.exit(1); }
const a = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const k = process.argv[i], v = process.argv[i + 1];
  if (!k.startsWith('--') || v === undefined || v.startsWith('--')) fail('cách dùng: soak.js --seed N --nights N --out file');
  a[k.slice(2)] = v;
}
const num = (k, d) => { if (a[k] === undefined) return d; if (!/^-?\d+$/.test(a[k])) fail(`--${k} phải là số nguyên`); return Number(a[k]); };
const seed = num('seed', 7), nights = num('nights', 10);
if (nights < 1) fail('--nights phải >= 1');
if (!a.out) fail('thiếu --out');

v8.setFlagsFromString('--expose-gc');
const gc = vm.runInNewContext('gc');
const rssMb = () => { gc(); gc(); return Math.round(process.memoryUsage().rss / 1048576); };

const t0 = performance.now();
const results = [];
let crashes = 0, memStart = null;
for (let i = 0; i < nights; i++) {
  const night = (i % 3) + 1, nSeed = seed + i;
  try {
    let g = createGame({ seed: nSeed, night });
    const feed = makeSoakInput(nSeed); // input ngẫu nhiên theo seed
    const input = newInputState();
    for (let k = 0; g.state === 'playing' || g.state === 'paused'; k++) {
      feed(k, input);
      step(g, input);
      if (k > 200000) throw new Error('Đêm không kết thúc sau 200000 tick');
    }
    if (i === 0) memStart = rssMb(); // RSS sau khi Đêm đầu tiên được tải VÀ chạy xong (đã khởi động JIT); xem assumptions-phase4.md
    results.push(g.state);
    g = null; // reset: bỏ trạng thái Đêm cũ
  } catch (e) { crashes++; results.push('crash'); process.stderr.write(`Đêm ${i}: ${e.stack}\n`); }
}
const out = { nights, crashes, results, mem_start_mb: memStart, mem_end_mb: rssMb(), duration_s: Math.round((performance.now() - t0) / 100) / 10 };
fs.writeFileSync(a.out, JSON.stringify(out) + '\n');
process.stdout.write(JSON.stringify(out) + '\n');
process.exit(crashes === 0 && out.mem_end_mb <= 1.2 * out.mem_start_mb ? 0 : 1);
