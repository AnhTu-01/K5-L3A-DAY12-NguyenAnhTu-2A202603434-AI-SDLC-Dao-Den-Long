import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TUNING } from '../src/tuning.js';

const contract = JSON.parse(fs.readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));

test('game.contract.json khớp src/tuning.js và có đủ khóa của contract v1.1', () => {
  assert.equal(contract.contract_version, '1.1');
  for (const k of ['team', 'build_cmd', 'run_cmd', 'headless_cmd', 'tuning']) assert.ok(contract[k] !== undefined, k);
  assert.deepEqual(contract.tuning, TUNING);
  assert.equal(contract.tuning.lantern_count_night1, 5);
  // số chuẩn TICKET-02 Phần 1
  const std = { player_speed: 6, carry_capacity: 10, lantern_cost: 10, pickup_radius: 1, interact_radius: 2, pulse_cost: 3, pulse_radius: 5, pulse_stun_s: 2, pulse_push_m: 4, pulse_cooldown_s: 3, safe_radius: 6, shade_speed: 4, shade_hit_radius: 1, invuln_s: 1.5, hit_drop_ratio: 0.5, flames: 3, dash_speed: 14, dash_duration_s: 0.2, dash_cooldown_s: 1.5, night1_duration_s: 300, night2_duration_s: 330, night3_duration_s: 360, fall_enabled: true };
  for (const [k, v] of Object.entries(std)) assert.equal(contract.tuning[k], v, 'tuning.' + k);
  assert.deepEqual(contract.tuning.score, { per_mote: 10, per_lantern: 100, per_stun: 5, per_second_left: 2, per_flame_left: 50 });
  const required = ['player_speed','carry_capacity','lantern_cost','lantern_count_night1','pickup_radius','interact_radius','pulse_cost','pulse_radius','night1_duration_s','night2_duration_s','night3_duration_s','dash_speed','dash_duration_s','dash_cooldown_s','flames','invuln_s','hit_drop_ratio','pulse_stun_s','pulse_push_m','pulse_cooldown_s','safe_radius','shade_speed','shade_hit_radius','fall_enabled','score'];
  for (const k of required) assert.ok(k in contract.tuning, 'thiếu tuning.' + k);
  for (const k of ['per_mote','per_lantern','per_stun','per_second_left','per_flame_left']) assert.ok(k in contract.tuning.score, 'thiếu score.' + k);
});
