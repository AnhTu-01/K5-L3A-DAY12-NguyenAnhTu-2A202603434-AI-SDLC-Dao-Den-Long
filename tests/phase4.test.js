// TICKET-04 (Contract v1.3): bảng xếp hạng, đổi phím, cảnh benchmark, soak, contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './helpers.js';
import * as LB from '../src/leaderboard-core.js';
import * as lbDisk from '../src/leaderboard.js';
import * as KB from '../src/keybinds.js';
import { benchScenario, benchCamera, benchStats, BENCH } from '../src/bench-scene.js';
import { createGame, step, newInputState } from '../src/sim.js';
import { makeSoakInput } from '../src/soak-input.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-p4-'));
const entry = (name, score, at = '2026-11-20T10:00:00+07:00', won = 1) => ({ name, score, nights_won: won, achieved_at: at, seed: 5 });

// ---------- Bảng xếp hạng ----------
test('tên: 3–12 ký tự [A-Za-z0-9_]', () => {
  for (const ok of ['abc', 'Anh_Tu01', 'A'.repeat(12), '___', '123']) assert.equal(LB.validateName(ok), null, ok);
  for (const bad of ['ab', 'A'.repeat(13), 'có dấu', 'a b', 'a-b', '', 'ab!', null, 5]) assert.notEqual(LB.validateName(bad), null, String(bad));
});
test('mục hợp lệ cần nights_won 0–3, achieved_at ISO có múi giờ, seed nguyên', () => {
  assert.equal(LB.validateEntry(entry('abc', 0, '2026-11-20T10:00:00+07:00', 0)), null);
  assert.equal(LB.validateEntry(entry('abc', 10, '2026-11-20T03:00:00Z', 3)), null);
  assert.notEqual(LB.validateEntry(entry('abc', 10, '2026-11-20T10:00:00')), null, 'thiếu múi giờ');
  assert.notEqual(LB.validateEntry(entry('abc', 10, '2026-11-20T10:00:00+07:00', 4)), null);
  assert.notEqual(LB.validateEntry(entry('abc', -1)), null);
  assert.notEqual(LB.validateEntry({ ...entry('abc', 1), seed: 1.5 }), null);
});
test('nowIso trả ISO 8601 có múi giờ và qua được kiểm tra', () => {
  const s = LB.nowIso(new Date(2026, 10, 20, 16, 40, 5));
  assert.match(s, /^2026-11-20T16:40:05[+-]\d{2}:\d{2}$/);
  assert.equal(LB.validateEntry(entry('abc', 1, s)), null);
});
test('xếp theo score giảm dần; bằng điểm thì ai đạt trước đứng trên', () => {
  let e = [];
  e = LB.addEntry(e, entry('late', 500, '2026-11-20T12:00:00+07:00'));
  e = LB.addEntry(e, entry('top', 900, '2026-11-20T13:00:00+07:00'));
  e = LB.addEntry(e, entry('early', 500, '2026-11-20T09:00:00+07:00'));
  assert.deepEqual(e.map((x) => x.name), ['top', 'early', 'late']);
});
test('so sánh thời điểm theo múi giờ thật, không theo chuỗi', () => {
  // 10:00+07:00 = 03:00Z sớm hơn 05:00Z dù chuỗi "10" > "05"
  let e = LB.addEntry([], entry('aaa', 100, '2026-11-20T05:00:00Z'));
  e = LB.addEntry(e, entry('bbb', 100, '2026-11-20T10:00:00+07:00'));
  assert.deepEqual(e.map((x) => x.name), ['bbb', 'aaa']);
});
test('chỉ giữ top 10, mục điểm thấp nhất bị loại', () => {
  let e = [];
  for (let i = 1; i <= 12; i++) e = LB.addEntry(e, entry('p' + String(i).padStart(2, '0'), i * 10));
  assert.equal(e.length, 10);
  assert.equal(e[0].score, 120); assert.equal(e[9].score, 30);
});
test('thêm mục sai định dạng bị từ chối và không làm đổi bảng', () => {
  const e = LB.addEntry([], entry('abc', 5));
  assert.throws(() => LB.addEntry(e, entry('x', 5)));
  assert.equal(e.length, 1);
});
test('lưu trên đĩa: còn nguyên sau khi tải lại (tiến trình mới) và xuất đúng thứ tự', () => {
  const file = path.join(tmp, 'lb.json');
  lbDisk.add(entry('first', 100, '2026-11-20T09:00:00+07:00'), file);
  lbDisk.add(entry('second', 300, '2026-11-20T10:00:00+07:00', 2), file);
  const out = path.join(tmp, 'export.json');
  const r = spawnSync('node', ['server.js', '--export-leaderboard', out], { cwd: root, encoding: 'utf8', env: { ...process.env, DDL_LEADERBOARD: file } });
  assert.equal(r.status, 0, r.stderr);
  const got = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.deepEqual(Object.keys(got), ['entries']);
  assert.deepEqual(got.entries.map((x) => [x.name, x.score, x.nights_won]), [['second', 300, 2], ['first', 100, 1]]);
  for (const x of got.entries) assert.deepEqual(Object.keys(x).sort(), ['achieved_at', 'name', 'nights_won', 'score', 'seed']);
});
test('xuất khi chưa có dữ liệu → {"entries": []}; file hỏng không làm sập', () => {
  const out = path.join(tmp, 'empty.json');
  let r = spawnSync('node', ['server.js', '--export-leaderboard', out], { cwd: root, encoding: 'utf8', env: { ...process.env, DDL_LEADERBOARD: path.join(tmp, 'none.json') } });
  assert.equal(r.status, 0); assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), { entries: [] });
  const bad = path.join(tmp, 'bad.json'); fs.writeFileSync(bad, '{{{ không phải json');
  r = spawnSync('node', ['server.js', '--export-leaderboard', out], { cwd: root, encoding: 'utf8', env: { ...process.env, DDL_LEADERBOARD: bad } });
  assert.equal(r.status, 0); assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), { entries: [] });
  r = spawnSync('node', ['server.js', '--export-leaderboard'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(r.status, 0, 'thiếu đường dẫn → lỗi');
});
test('mục hỏng trong file bị bỏ, mục tốt còn lại vẫn đúng thứ tự', () => {
  assert.deepEqual(LB.sanitize([entry('good1', 5), { name: 'x' }, entry('good2', 9), null]).map((x) => x.name), ['good2', 'good1']);
});

// ---------- Đổi phím ----------
test('phím mặc định đủ 9 hành động, không trùng', () => {
  assert.equal(KB.ACTIONS.length, 9);
  for (const [a] of KB.ACTIONS) assert.ok(KB.DEFAULTS[a], a);
  assert.deepEqual(KB.conflicts(KB.DEFAULTS), {});
});
test('đổi phím hợp lệ; trùng phím bị từ chối kèm hành động đang giữ phím', () => {
  const ok = KB.rebind(KB.DEFAULTS, 'pulse', 'KeyG');
  assert.ok(ok.ok); assert.equal(ok.map.pulse, 'KeyG'); assert.equal(KB.DEFAULTS.pulse, 'KeyF', 'không sửa map gốc');
  const dup = KB.rebind(KB.DEFAULTS, 'pulse', 'KeyE');
  assert.equal(dup.ok, false); assert.equal(dup.with, 'interact');
  assert.equal(KB.rebind(KB.DEFAULTS, 'pulse', 'ShiftRight').with, 'dash', 'Shift trái/phải coi là một phím');
  assert.equal(KB.rebind(KB.DEFAULTS, 'jump', 'Enter').ok, false, 'phím cố định');
  assert.equal(KB.rebind(KB.DEFAULTS, 'jump', 'KeyR').ok, false);
  assert.equal(KB.rebind(KB.DEFAULTS, 'jump', 'Space').ok, true, 'gán lại chính phím của mình là được');
});
test('conflicts() báo mọi cặp trùng; sanitize quay về mặc định khi dữ liệu lưu bị trùng/hỏng', () => {
  const c = KB.conflicts({ ...KB.DEFAULTS, pulse: 'KeyE' });
  assert.deepEqual(c.pulse, ['interact']); assert.deepEqual(c.interact, ['pulse']);
  assert.deepEqual(KB.sanitize({ ...KB.DEFAULTS, pulse: 'KeyE' }), KB.DEFAULTS);
  assert.deepEqual(KB.sanitize(null), KB.DEFAULTS); assert.deepEqual(KB.sanitize('x'), KB.DEFAULTS);
  assert.equal(KB.sanitize({ pulse: 'KeyG' }).pulse, 'KeyG');
  assert.equal(KB.sanitize({ jump: 42 }).jump, 'Space');
});

// ---------- Cảnh benchmark ----------
test('cảnh bench: 200 Bóng wander + 100 đom đóm + L1–L3 sáng fuel 100, Mây ở (0,0,0)', () => {
  const g = createGame({ seed: 42, night: 1, scenario: benchScenario(42), bench: true });
  assert.equal(g.shades.length, 200); assert.equal(g.motes.length, 100);
  assert.ok(g.shades.every((s) => s.state === 'wander'));
  assert.deepEqual(g.lanterns.filter((l) => l.lit).map((l) => [l.id, l.fuelU / 60]), [['L1', 100], ['L2', 100], ['L3', 100]]);
  assert.deepEqual(g.player.pos, [0, 0, 0]);
  const R = Math.max(...g.shades.map((s) => Math.hypot(s.pos[0], s.pos[2])));
  assert.ok(R <= BENCH.islandR + 1e-9, 'trong đảo');
  assert.ok(Math.max(...g.shades.map((s) => Math.hypot(s.pos[0], s.pos[2]))) > 30, 'rải ra tới gần mép');
});
test('cảnh bench tất định theo seed, seed khác → vị trí khác', () => {
  assert.deepEqual(benchScenario(42), benchScenario(42));
  assert.notDeepEqual(benchScenario(42).shades[0].pos, benchScenario(43).shades[0].pos);
});
test('bench tắt: sinh thêm, sát thương, nhặt đom đóm, hao dầu, kết thúc Đêm; Bóng vẫn di chuyển', () => {
  const g = createGame({ seed: 42, night: 1, scenario: benchScenario(42), bench: true });
  const before = g.shades.map((s) => [...s.pos]);
  const inp = newInputState();
  for (let k = 0; k < 14500; k++) step(g, inp); // quá 240 s: bình thường đã hết Đêm
  assert.equal(g.state, 'playing'); assert.equal(g.player.flames, 3);
  assert.equal(g.shades.length, 200); assert.equal(g.motes.length, 100); assert.equal(g.score, 0);
  assert.deepEqual(g.lanterns.filter((l) => l.lit).map((l) => l.fuelU / 60), [100, 100, 100]);
  assert.ok(g.shades.some((s, i) => Math.hypot(s.pos[0] - before[i][0], s.pos[2] - before[i][2]) > 1), 'Bóng vẫn di chuyển');
});
test('bench=false (mặc định) không đổi luật: Đêm vẫn kết thúc ở bình minh', () => {
  const g = createGame({ seed: 1, night: 1 });
  const inp = newInputState(); let k = 0;
  while (g.state === 'playing' && k < 20000) { step(g, inp); k++; }
  assert.notEqual(g.state, 'playing');
});
test('camera bench: bắt đầu (30,15,0), 15 s một vòng, ngược chiều kim đồng hồ nhìn từ trên xuống', () => {
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  assert.ok(near(benchCamera(0).pos, [30, 15, 0]));
  assert.ok(near(benchCamera(15).pos, [30, 15, 0]));
  assert.ok(near(benchCamera(3.75).pos, [0, 15, 30]), 'phần tư vòng');
  assert.ok(near(benchCamera(7.5).pos, [-30, 15, 0]));
  for (const t of [0, 1, 4.2, 9]) assert.ok(Math.abs(Math.hypot(benchCamera(t).pos[0], benchCamera(t).pos[2]) - 30) < 1e-9);
  assert.deepEqual(benchCamera(2).look, [0, 0, 0]);
});
test('chỉ số bench đúng định nghĩa (avg_fps, p1_low, p95, frames)', () => {
  assert.deepEqual(benchStats([10, 10, 10, 10]), { frames: 4, avg_fps: 100, p1_low_fps: 100, frame_ms_p95: 10 });
  // 200 khung: 198 × 10 ms + 2 × 50 ms → k = ceil(2) = 2 giá trị lớn nhất → p1_low = 1000/50 = 20
  const dts = [...Array(198).fill(10), 50, 50];
  const s = benchStats(dts);
  assert.equal(s.frames, 200); assert.equal(s.p1_low_fps, 20); assert.equal(s.avg_fps, Math.round(1000 * 200 / 2080 * 10) / 10);
  assert.equal(s.frame_ms_p95, 10);
  // 1 khung: k = max(1, ceil(0.01)) = 1
  assert.equal(benchStats([20]).p1_low_fps, 50);
  // p95 của 1..100 ms là 95
  assert.equal(benchStats(Array.from({ length: 100 }, (_, i) => i + 1)).frame_ms_p95, 95);
});

// ---------- Soak ----------
test('soak: cùng seed → cùng kết quả, 0 crash, đủ khóa, mã thoát 0', () => {
  const run = () => {
    const f = path.join(tmp, 'soak-' + Math.random().toString(36).slice(2) + '.json');
    const r = spawnSync('node', ['scripts/soak.js', '--seed', '7', '--nights', '6', '--out', f], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  };
  const a = run(), b = run();
  assert.deepEqual(Object.keys(a), ['nights', 'crashes', 'results', 'mem_start_mb', 'mem_end_mb', 'duration_s']);
  assert.equal(a.nights, 6); assert.equal(a.crashes, 0); assert.equal(a.results.length, 6);
  assert.ok(a.results.every((x) => x === 'won' || x === 'lost'));
  assert.deepEqual(a.results, b.results);
  assert.ok(a.mem_end_mb <= 1.2 * a.mem_start_mb, `${a.mem_end_mb} vs ${a.mem_start_mb}`);
});
test('soak: tham số sai → mã thoát khác 0', () => {
  assert.notEqual(spawnSync('node', ['scripts/soak.js', '--seed', '7', '--nights', '0', '--out', path.join(tmp, 'x.json')], { cwd: root }).status, 0);
  assert.notEqual(spawnSync('node', ['scripts/soak.js', '--seed', '7', '--nights', '3'], { cwd: root }).status, 0);
  assert.notEqual(spawnSync('node', ['scripts/soak.js', '--seed', 'abc', '--nights', '3', '--out', path.join(tmp, 'y.json')], { cwd: root }).status, 0);
});
test('bench.js: thiếu --out hoặc --duration sai → mã thoát khác 0', () => {
  assert.notEqual(spawnSync('node', ['scripts/bench.js', '--seed', '42', '--duration', '5'], { cwd: root }).status, 0);
  assert.notEqual(spawnSync('node', ['scripts/bench.js', '--duration', 'x', '--out', path.join(tmp, 'b.json')], { cwd: root }).status, 0);
});

test('soak input: tần suất 5%/3%/2%/10% và đổi hướng mỗi 30 tick', () => {
  const feed = makeSoakInput(7), inp = newInputState(), N = 200000, c = { jump: 0, dash: 0, pulse: 0, interact: 0 };
  let changes = 0, prev = null, dirs = 0;
  for (let k = 0; k < N; k++) {
    feed(k, inp);
    for (const a of Object.keys(c)) if (inp[a]) c[a]++;
    const key = inp.move.join(',');
    if (prev !== null && key !== prev) { changes++; assert.equal(k % 30, 0, 'chỉ đổi hướng ở bội số của 30'); }
    prev = key; if (k % 30 === 0) dirs++;
    assert.ok(Math.abs(Math.hypot(...inp.move) - 1) < 1e-9);
  }
  for (const [a, p] of [['jump', 0.05], ['dash', 0.03], ['pulse', 0.02], ['interact', 0.10]]) assert.ok(Math.abs(c[a] / N - p) < 0.004, `${a}: ${c[a] / N}`);
  assert.ok(changes > dirs * 0.99);
  const f2 = makeSoakInput(7), i2 = newInputState(); f2(0, i2); const f3 = makeSoakInput(7), i3 = newInputState(); f3(0, i3);
  assert.deepEqual(i2, i3, 'tất định theo seed');
});
test('benchStats: k = ceil(1% N) với N không chia hết', () => {
  const dts = [...Array(247).fill(10), 50, 40, 30]; // N=250 → k=3 → trung bình 40 ms → 25 FPS
  assert.equal(benchStats(dts).p1_low_fps, 25);
});
