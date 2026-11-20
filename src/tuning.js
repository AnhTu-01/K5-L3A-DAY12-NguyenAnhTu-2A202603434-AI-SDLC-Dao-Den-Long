// Mọi con số cân bằng của Đêm 1. game.contract.json (khối "tuning") phải khớp file này
// (tests/contract.test.js kiểm tra).
export const TUNING = {
  player_speed: 6,
  carry_capacity: 5,
  lantern_cost: 3,
  lantern_count_night1: 5,
  pickup_radius: 1.2,
  interact_radius: 2.5,
  pulse_cost: 1,
  pulse_radius: 6,
  night1_duration_s: 300,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 3,
  pulse_push_m: 3,
  pulse_cooldown_s: 2,
  safe_radius: 4,
  shade_speed: 3.5,
  shade_hit_radius: 1,
  fall_enabled: false,
  score: { per_mote: 10, per_lantern: 100, per_stun: 25, per_second_left: 1, per_flame_left: 50 },
};

// Hằng số của game không nằm trong contract (giả định, xem docs/notes/assumptions.md)
export const WORLD = {
  island_radius: 40,
  lantern_ring_radius: 25,
  motes_target: 20,
  mote_spawn_radius: 36,
  mote_respawn_s: 4,
  shade_first_spawn_s: 6,
  shade_spawn_interval_s: 12,
  shade_max: 4,
  shade_spawn_radius: 38,
  shade_height: 1,
  jump_speed: 7,
  gravity: 20,
  drop_ring_radius: 2.5,
};
