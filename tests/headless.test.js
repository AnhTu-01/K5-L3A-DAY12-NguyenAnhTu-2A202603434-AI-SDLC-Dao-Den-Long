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
    const r = runHeadless({ seed: c.seed, ticks: c.ticks, scenario: c.scenario, inputs: c.inputs });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.lines.at(-1).type, 'end', 'dòng cuối phải là end');
    const v = c.check(r.lines);
    assert.ok(v.ok, v.detail);
  });
}

test('tất định: cùng seed + scenario + inputs cho output giống hệt (cả id tự sinh)', () => {
  const c = cases.find((x) => x.name === 'random_world_spawns');
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
  ];
  for (const inputs of bads) {
    const r = runHeadless({ seed: 1, ticks: 10, inputs });
    assert.equal(r.status, 2, JSON.stringify(inputs));
    assert.ok(r.stderr.length > 0);
  }
});

test('scenario sai định dạng -> mã thoát 2', () => {
  for (const scenario of [{ player: { pos: [0, 0] } }, { lanterns: [{ id: 'L9' }] }, { motes: 5 }, { time_left_s: -1 }]) {
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
