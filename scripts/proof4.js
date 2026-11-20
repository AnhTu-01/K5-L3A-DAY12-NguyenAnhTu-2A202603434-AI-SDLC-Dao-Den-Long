// Bằng chứng Phase 4 chạy được trên mọi máy (không cần GPU): soak, bảng xếp hạng, cảnh bench trong sim, contract. Ghi docs/proof/phase4/RESULTS.md.
// bench.json (đo hiệu năng thật) phải chạy bằng `npm run bench` trên máy có GPU; file này không bịa số đó.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createGame, step, newInputState } from '../src/sim.js';
import { benchScenario } from '../src/bench-scene.js';
import * as LB from '../src/leaderboard-core.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(root, 'docs', 'proof', 'phase4');
fs.mkdirSync(dir, { recursive: true });
const rows = [];
const add = (req, how, result, ok) => rows.push(`| ${req} | ${how} | ${result} | ${ok ? 'ĐẠT' : 'KHÔNG ĐẠT'} |`);
let all = true; const rec = (req, how, result, ok) => { add(req, how, result, ok); all = all && ok; };

// Soak
const soakOut = path.join(root, 'soak.json');
const t0 = Date.now();
const s = spawnSync('node', ['scripts/soak.js', '--seed', '7', '--nights', '10', '--out', soakOut], { cwd: root, encoding: 'utf8' });
const soak = JSON.parse(fs.readFileSync(soakOut, 'utf8'));
rec('Soak: crashes = 0', '`node scripts/soak.js --seed 7 --nights 10 --out soak.json`', `crashes = ${soak.crashes}, ${soak.nights} Đêm, kết quả ${soak.results.join('/')}`, soak.crashes === 0 && s.status === 0);
rec('Soak: mem_end ≤ 1.2 × mem_start', 'cùng lệnh', `${soak.mem_end_mb} MB ≤ 1.2 × ${soak.mem_start_mb} = ${(1.2 * soak.mem_start_mb).toFixed(1)} MB`, soak.mem_end_mb <= 1.2 * soak.mem_start_mb);

// Rò rỉ: heap JS qua nhiều Đêm (không bị nhiễu bởi bộ nhớ trình biên dịch)
spawnSync('node', ['scripts/soak.js', '--seed', '7', '--nights', '1', '--out', path.join(os.tmpdir(), 'x.json')], { cwd: root });
const heap = spawnSync('node', ['--expose-gc', '--no-opt', '-e', `
import('./src/sim.js').then(async (S) => { const { makeSoakInput } = await import('./src/soak-input.js'); const h = () => { gc(); gc(); return process.memoryUsage().heapUsed / 1048576; };
 const run = (i) => { const g = S.createGame({ seed: 7 + i, night: i % 3 + 1 }); const f = makeSoakInput(7 + i), inp = S.newInputState(); for (let k = 0; g.state === 'playing'; k++) { f(k, inp); S.step(g, inp); } };
 for (let i = 0; i < 20; i++) run(i); const a = h(); for (let i = 20; i < 220; i++) run(i); const b = h(); console.log(JSON.stringify({ a, b })); });`], { cwd: root, encoding: 'utf8' });
const hp = JSON.parse(heap.stdout.trim().split('\n').pop());
rec('Không rò rỉ heap JS', '20 Đêm khởi động rồi 200 Đêm nữa, đo heapUsed sau GC', `${hp.a.toFixed(2)} MB → ${hp.b.toFixed(2)} MB`, hp.b <= hp.a * 1.2 + 1);

// Cảnh bench trong sim
const g = createGame({ seed: 42, night: 1, scenario: benchScenario(42), bench: true });
const inp = newInputState(); const tb = Date.now(); for (let k = 0; k < 60 * 33; k++) step(g, inp); const msSim = Date.now() - tb;
rec('Bench: cảnh chuẩn (200 Bóng wander, 100 đom đóm, L1–L3 sáng fuel 100)', '`createGame({seed:42, night:1, scenario: benchScenario(42), bench:true})` rồi 33 s mô phỏng', `${g.shades.length} Bóng, ${g.motes.length} đom đóm, đèn sáng ${g.lanterns.filter((l) => l.lit).map((l) => l.id + ':' + l.fuelU / 60).join(' ')}; mô phỏng 33 s tốn ${msSim} ms CPU`, g.shades.length === 200 && g.motes.length === 100 && g.state === 'playing' && g.player.flames === 3);

// Bảng xếp hạng
let e = []; for (let i = 0; i < 12; i++) e = LB.addEntry(e, { name: 'Player' + i, score: i * 10, nights_won: i % 4, achieved_at: LB.nowIso(), seed: i });
rec('Bảng xếp hạng: top 10, sắp xếp', 'thêm 12 mục', `${e.length} mục, điểm ${e.map((x) => x.score).join(',')}`, e.length === 10 && e[0].score === 110);
const lbf = path.join(os.tmpdir(), 'lbproof.json'); fs.rmSync(lbf, { force: true });
spawnSync('node', ['-e', `import('./src/leaderboard.js').then(m => { m.add({ name: 'Proof_One', score: 123, nights_won: 1, achieved_at: '2026-11-20T10:00:00+07:00', seed: 1 }); })`], { cwd: root, env: { ...process.env, DDL_LEADERBOARD: lbf } });
const ex = path.join(dir, 'leaderboard-export-sample.json');
const r2 = spawnSync('node', ['server.js', '--export-leaderboard', ex], { cwd: root, env: { ...process.env, DDL_LEADERBOARD: lbf } });
rec('Bảng xếp hạng: lưu đĩa + lệnh xuất', '`node server.js --export-leaderboard out.json` (tiến trình mới, đọc lại từ đĩa)', fs.readFileSync(ex, 'utf8').replace(/\s+/g, ' '), r2.status === 0 && JSON.parse(fs.readFileSync(ex, 'utf8')).entries[0].name === 'Proof_One');

// Contract
const c = JSON.parse(fs.readFileSync(path.join(root, 'game.contract.json'), 'utf8'));
rec('Contract v1.3', '`game.contract.json`', `contract_version=${c.contract_version}, bench_cmd="${c.bench_cmd}", soak_cmd="${c.soak_cmd}"`, c.contract_version === '1.3' && !!c.bench_cmd && !!c.soak_cmd);

// bench.json (nếu đã chạy)
const bf = path.join(root, 'bench.json');
if (fs.existsSync(bf)) {
  const b = JSON.parse(fs.readFileSync(bf, 'utf8'));
  rows.push(`| Bench trên máy tác giả (tham khảo) | \`npm run bench\` → bench.json | avg_fps ${b.avg_fps}, p1_low ${b.p1_low_fps}, p95 ${b.frame_ms_p95} ms, load ${b.load_ms} ms, RAM ${b.peak_mem_mb}, vsync_off=${b.vsync_off}; ${b.os} | số tham khảo (máy chấm của giảng viên mới có giá trị) |`);
} else rows.push('| Bench trên máy tác giả | `npm run bench` | chưa chạy (cần máy có GPU) | — |');

const md = ['# Bằng chứng Phase 4 (Contract v1.3)', '', `Sinh bởi \`npm run proof4\` ngày ${new Date().toISOString().slice(0, 10)} trên ${os.type()} ${os.arch()}, Node ${process.version}. Không sửa tay.`, '',
  '| Yêu cầu | Cách đo | Kết quả đo | Kết luận |', '|---|---|---|---|', ...rows, '',
  all ? '**TẤT CẢ ĐẠT**' : '**CÓ MỤC KHÔNG ĐẠT**', '',
  '- Giao diện (đổi phím, chữ ≥18 px, giảm chuyển động, chỉ báo, màn bảng xếp hạng): xem [`a11y-check.md`](a11y-check.md) và [`GUI.md`](GUI.md).',
  '- Hiệu năng thật (FPS) đo bằng `npm run bench` trên máy có GPU; bản trong sandbox dùng GPU phần mềm nên không có giá trị.'].join('\n') + '\n';
fs.writeFileSync(path.join(dir, 'RESULTS.md'), md);
console.log(md);
process.exit(all ? 0 : 1);
