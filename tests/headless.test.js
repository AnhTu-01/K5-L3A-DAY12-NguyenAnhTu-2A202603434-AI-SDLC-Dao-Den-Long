import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { cases } from './cases.js';
import { runHeadless, root } from './helpers.js';


for (const c of cases) {
  test(`${c.name}: ${c.req}`, () => {
    const r = runHeadless({ seed: c.seed, ticks: c.ticks, scenario: c.scenario, inputs: c.inputs, every: c.every, night: c.night || 1 });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.lines.at(-1).type, 'end', 'dòng cuối phải là end');
    const v = c.check(r.lines);
    assert.ok(v.ok, v.detail);
  });
}

test('tất định: cùng seed + scenario + inputs cho output giống hệt (cả id tự sinh)', () => {
  const c = cases.find((x) => x.name === 'random_world_night1');
  const a = runHeadless({ seed: 7, ticks: 3000, scenario: c.scenario, inputs: { frames: [{ tick: 0, move: [1, 1] }, { tick: 500, move: [-1, 0], interact: true }] } });
  const b = runHeadless({ seed: 7, ticks: 3000, scenario: c.scenario, inputs: { frames: [{ tick: 0, move: [1, 1] }, { tick: 500, move: [-1, 0], interact: true }] } });
  assert.equal(a.raw, b.raw);
  const other = runHeadless({ seed: 8, ticks: 3000, scenario: c.scenario });
  assert.notEqual(a.raw, other.raw, 'seed khác phải cho thế giới khác');
});

test('snapshot-every điều khiển tần suất snapshot, bắt đầu từ tick 0', () => {
  const r = runHeadless({ seed: 1, ticks: 100, every: 25, scenario: { random_motes: false, random_shades: false } });
  const ticks = r.lines.filter((l) => l.type === 'snapshot').map((l) => l.tick);
  assert.deepEqual(ticks, [0, 25, 50, 75, 100]);
});

test('file inputs sai định dạng -> mã thoát 2', () => {
  const bads = [
    { frames: [{ tick: 5, move: [0, 1] }, { tick: 5, move: [0, 0] }] },
    { frames: [{ tick: 0, move: [2, 0] }] },
    { frames: 'x' },
    { frames: [{ tick: 'a' }] },
    { frames: [{ tick: 0, dash: 1 }] },
    { frames: [{ tick: 0, pause: 'yes' }] },
  ];
  for (const inputs of bads) {
    const r = runHeadless({ seed: 1, ticks: 10, inputs });
    assert.equal(r.status, 2, JSON.stringify(inputs));
    assert.ok(r.stderr.length > 0);
  }
});

test('scenario sai định dạng -> mã thoát 2', () => {
  for (const scenario of [{ player: { pos: [0, 0] } }, { lanterns: [{ id: 'L9' }] }, { motes: 5 }, { time_left_s: -1 }, { shades: [{ pos: [0, 0, 0], state: 'angry' }] }, { drifters: [{ pos: [0, 0, 0], state: 'x' }] }, { charms: [{ pos: [0, 0, 0] }] }, { wind_enabled: 'yes' }, { player: { charm_ticks: -1 } }]) {
    const r = runHeadless({ seed: 1, ticks: 10, scenario });
    assert.equal(r.status, 2, JSON.stringify(scenario));
  }
});

test('thiếu --ticks hoặc --out -> mã thoát khác 0', () => {
  const r = spawnSync('node', ['src/headless.js', '--seed', '1', '--night', '1'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
});

test('tọa độ làm tròn tối đa 3 chữ số thập phân', () => {
  const r = runHeadless({ seed: 3, ticks: 200, inputs: { frames: [{ tick: 0, move: [0.3, 0.7], cam_yaw_deg: 33 }] } });
  const bad = r.raw.match(/\d+\.\d{4,}/g);
  assert.equal(bad, null, 'còn số thập phân dài: ' + bad);
});

test('--night chỉ nhận 1, 2, 3 (mã thoát khác 0 với giá trị khác)', () => {
  for (const night of ['0', '4', 'x']) {
    const r = spawnSync('node', ['src/headless.js', '--seed', '1', '--night', night, '--ticks', '1', '--out', path.join(os.tmpdir(), 'n.jsonl')], { cwd: root, encoding: 'utf8' });
    assert.notEqual(r.status, 0, night);
  }
});

test('hiệu năng: chạy headless trọn một Đêm đầy đủ (21.600 tick) trong ≤ 30 giây', () => {
  for (const night of [1, 2, 3]) {
    const t0 = Date.now();
    const r = runHeadless({ seed: 9, ticks: 21600, night, scenario: { player: { flames: 999 } } });
    const dt = (Date.now() - t0) / 1000;
    assert.equal(r.status, 0, r.stderr);
    assert.ok(dt <= 30, `Đêm ${night} mất ${dt}s`);
    assert.ok(r.lines.at(-1).ticks <= 21600);
  }
});

test('tất định trên cả 3 Đêm (cùng seed → output giống hệt)', () => {
  for (const night of [1, 2, 3]) {
    const f = { frames: [{ tick: 0, move: [1, 1] }, { tick: 400, move: [-1, 0], dash: true }, { tick: 401, dash: false }, { tick: 900, pulse: true, interact: true }] };
    const a = runHeadless({ seed: 5, ticks: 4000, night, inputs: f, scenario: { player: { flames: 99, carried: 9 } } });
    const b = runHeadless({ seed: 5, ticks: 4000, night, inputs: f, scenario: { player: { flames: 99, carried: 9 } } });
    assert.equal(a.raw, b.raw, 'Đêm ' + night);
  }
});
