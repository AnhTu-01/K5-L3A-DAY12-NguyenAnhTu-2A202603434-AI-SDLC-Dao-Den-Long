import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TUNING } from '../src/tuning.js';

const contract = JSON.parse(fs.readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));

test('game.contract.json khớp src/tuning.js và có đủ khóa của contract v1.0', () => {
  assert.equal(contract.contract_version, '1.0');
  for (const k of ['team', 'build_cmd', 'run_cmd', 'headless_cmd', 'tuning']) assert.ok(contract[k] !== undefined, k);
  assert.deepEqual(contract.tuning, TUNING);
  assert.equal(contract.tuning.lantern_count_night1, 5);
  const required = ['player_speed','carry_capacity','lantern_cost','lantern_count_night1','pickup_radius','interact_radius','pulse_cost','pulse_radius','night1_duration_s','flames','invuln_s','hit_drop_ratio','pulse_stun_s','pulse_push_m','pulse_cooldown_s','safe_radius','shade_speed','shade_hit_radius','fall_enabled','score'];
  for (const k of required) assert.ok(k in contract.tuning, 'thiếu tuning.' + k);
  for (const k of ['per_mote','per_lantern','per_stun','per_second_left','per_flame_left']) assert.ok(k in contract.tuning.score, 'thiếu score.' + k);
});
