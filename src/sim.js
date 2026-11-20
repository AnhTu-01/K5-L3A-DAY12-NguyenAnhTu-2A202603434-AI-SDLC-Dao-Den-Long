// Lõi mô phỏng Đảo Đèn Lồng: tất định, 60 tick/giây, không phụ thuộc đồ họa.
// Dùng chung cho chế độ headless (Node) và bản chơi trong trình duyệt.
import { TUNING, WORLD } from './tuning.js';

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

export class ScenarioError extends Error {}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist2d = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);

export function validateScenario(sc) {
  if (sc === null || typeof sc !== 'object' || Array.isArray(sc)) throw new ScenarioError('scenario phải là một object');
  const bad = (m) => { throw new ScenarioError('scenario: ' + m); };
  if (sc.player !== undefined) {
    const p = sc.player;
    if (p === null || typeof p !== 'object') bad('player phải là object');
    if (p.pos !== undefined && !isVec3(p.pos)) bad('player.pos phải là [x,y,z]');
    if (p.carried !== undefined && !(Number.isInteger(p.carried) && p.carried >= 0)) bad('player.carried phải là số nguyên >= 0');
    if (p.flames !== undefined && !(Number.isInteger(p.flames) && p.flames >= 0)) bad('player.flames phải là số nguyên >= 0');
  }
  for (const k of ['random_motes', 'random_shades']) {
    if (sc[k] !== undefined && typeof sc[k] !== 'boolean') bad(k + ' phải là boolean');
  }
  if (sc.motes !== undefined) {
    if (!Array.isArray(sc.motes)) bad('motes phải là mảng');
    for (const m of sc.motes) {
      const pos = Array.isArray(m) ? m : m && m.pos;
      if (!isVec3(pos)) bad('mỗi mote phải là [x,y,z] hoặc {pos:[x,y,z]}');
    }
  }
  if (sc.shades !== undefined) {
    if (!Array.isArray(sc.shades)) bad('shades phải là mảng');
    for (const s of sc.shades) {
      if (s === null || typeof s !== 'object' || !isVec3(s.pos)) bad('mỗi shade phải có pos [x,y,z]');
      if (s.id !== undefined && typeof s.id !== 'string') bad('shade.id phải là chuỗi');
    }
  }
  if (sc.lanterns !== undefined) {
    if (!Array.isArray(sc.lanterns)) bad('lanterns phải là mảng');
    for (const l of sc.lanterns) {
      if (l === null || typeof l !== 'object' || typeof l.id !== 'string') bad('mỗi lantern phải có id');
      if (l.pos !== undefined && !isVec3(l.pos)) bad('lantern.pos phải là [x,y,z]');
      if (l.deposited !== undefined && !(Number.isInteger(l.deposited) && l.deposited >= 0)) bad('lantern.deposited phải là số nguyên >= 0');
      if (l.lit !== undefined && typeof l.lit !== 'boolean') bad('lantern.lit phải là boolean');
    }
  }
  if (sc.time_left_s !== undefined && !(isNum(sc.time_left_s) && sc.time_left_s > 0)) bad('time_left_s phải là số > 0');
}

export function validateInputs(inp) {
  const bad = (m) => { throw new ScenarioError('inputs: ' + m); };
  if (inp === null || typeof inp !== 'object' || !Array.isArray(inp.frames)) bad('cần {"frames": [...]}');
  let last = -1;
  for (const f of inp.frames) {
    if (f === null || typeof f !== 'object') bad('mỗi frame phải là object');
    if (!Number.isInteger(f.tick) || f.tick < 0) bad('frame.tick phải là số nguyên >= 0');
    if (f.tick <= last) bad('tick của frame phải tăng nghiêm ngặt');
    last = f.tick;
    if (f.move !== undefined) {
      if (!Array.isArray(f.move) || f.move.length !== 2 || !f.move.every((v) => isNum(v) && v >= -1 && v <= 1)) bad('move phải là [x,z] trong [-1,1]');
    }
    if (f.cam_yaw_deg !== undefined && !isNum(f.cam_yaw_deg)) bad('cam_yaw_deg phải là số');
    for (const b of ['jump', 'interact', 'pulse']) {
      if (f[b] !== undefined && typeof f[b] !== 'boolean') bad(b + ' phải là boolean');
    }
  }
}

export function newInputState() {
  return { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false };
}

export function applyFrame(state, frame) {
  if (frame.move !== undefined) state.move = [frame.move[0], frame.move[1]];
  if (frame.cam_yaw_deg !== undefined) state.cam_yaw_deg = frame.cam_yaw_deg;
  for (const b of ['jump', 'interact', 'pulse']) if (frame[b] !== undefined) state[b] = frame[b];
}

export function createGame({ seed = 1, scenario = null, tuning = TUNING } = {}) {
  if (scenario) validateScenario(scenario);
  const sc = scenario || {};
  const T = tuning;
  const rng = mulberry32(seed);
  const toTicks = (s) => Math.round(s * TICK_RATE);

  const lanterns = [];
  for (let i = 0; i < T.lantern_count_night1; i++) {
    const th = (i * 2 * Math.PI) / T.lantern_count_night1;
    lanterns.push({
      id: 'L' + (i + 1),
      pos: [WORLD.lantern_ring_radius * Math.sin(th), 0, WORLD.lantern_ring_radius * Math.cos(th)],
      lit: false,
      deposited: 0,
    });
  }
  for (const u of sc.lanterns || []) {
    const l = lanterns.find((x) => x.id === u.id);
    if (!l) throw new ScenarioError('scenario: không có đèn ' + u.id);
    if (u.pos) l.pos = [...u.pos];
    if (u.deposited !== undefined) l.deposited = u.deposited;
    if (u.lit !== undefined) l.lit = u.lit;
    if (l.deposited >= T.lantern_cost) l.lit = true;
  }

  const p = sc.player || {};
  const g = {
    T, rng, seed,
    state: 'playing',
    sim_tick: 0,
    initialTicks: toTicks(sc.time_left_s !== undefined ? sc.time_left_s : T.night1_duration_s),
    score: 0,
    player: {
      pos: p.pos ? [...p.pos] : [0, 0, 0],
      vy: 0,
      carried: p.carried !== undefined ? p.carried : 0,
      flames: p.flames !== undefined ? p.flames : T.flames,
      invulnTicks: 0,
      pulseCdTicks: 0,
      heading: 0,
    },
    lanterns,
    motes: [],
    shades: [],
    nextMote: 1,
    nextShade: 1,
    randomMotes: sc.random_motes !== false,
    randomShades: sc.random_shades !== false,
    moteTimer: 0,
    shadeTimer: 0,
    prev: { jump: false, interact: false, pulse: false },
    events: [],
    lastEndReason: null,
  };

  if (sc.motes !== undefined) {
    for (const m of sc.motes) {
      const pos = Array.isArray(m) ? m : m.pos;
      g.motes.push({ id: 'M' + g.nextMote++, pos: [pos[0], 0, pos[2]] });
    }
  } else if (g.randomMotes) {
    for (let i = 0; i < WORLD.motes_target; i++) g.motes.push(randomMote(g));
  }
  if (sc.shades !== undefined) {
    for (const s of sc.shades) {
      const id = s.id !== undefined ? s.id : 'S' + g.nextShade++;
      if (s.id !== undefined) {
        const n = /^S(\d+)$/.exec(s.id);
        if (n) g.nextShade = Math.max(g.nextShade, Number(n[1]) + 1);
      }
      g.shades.push({ id, pos: [s.pos[0], WORLD.shade_height, s.pos[2]], state: 'chase', stunTicks: 0 });
    }
  }
  g.moteTimer = toTicks(WORLD.mote_respawn_s);
  g.shadeTimer = toTicks(WORLD.shade_first_spawn_s);
  return g;
}

function randomMote(g) {
  for (let tries = 0; ; tries++) {
    const r = Math.sqrt(g.rng()) * WORLD.mote_spawn_radius;
    const a = g.rng() * 2 * Math.PI;
    const x = r * Math.sin(a), z = r * Math.cos(a);
    if (tries > 20 || dist2d(x, z, g.player.pos[0], g.player.pos[2]) >= 3) {
      return { id: 'M' + g.nextMote++, pos: [x, 0, z] };
    }
  }
}

export function timeLeftTicks(g) { return g.initialTicks - g.sim_tick; }
export function timeLeftS(g) { return timeLeftTicks(g) / TICK_RATE; }

function emit(g, name, data) { g.events.push({ type: 'event', tick: g.sim_tick, name, data }); }

function pushOutOfSafe(g, s) {
  for (const l of g.lanterns) {
    if (!l.lit) continue;
    let dx = s.pos[0] - l.pos[0], dz = s.pos[2] - l.pos[2];
    const d = Math.hypot(dx, dz);
    if (d < g.T.safe_radius) {
      if (d < 1e-9) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
      s.pos[0] = l.pos[0] + dx * g.T.safe_radius;
      s.pos[2] = l.pos[2] + dz * g.T.safe_radius;
    }
  }
}

function clampIsland(pos) {
  const d = Math.hypot(pos[0], pos[2]);
  if (d > WORLD.island_radius) {
    pos[0] *= WORLD.island_radius / d;
    pos[2] *= WORLD.island_radius / d;
  }
}

// Một bước mô phỏng. `input` là trạng thái nút đang giữ (đã gộp frame). Trả về danh sách event của bước.
export function step(g, input) {
  g.events = [];
  if (g.state !== 'playing') return g.events;
  const T = g.T, P = g.player;
  g.sim_tick += 1; // sự kiện của bước này ghi tick = k+1

  const edge = (k) => input[k] && !g.prev[k];
  const jumpEdge = edge('jump'), interactEdge = edge('interact'), pulseEdge = edge('pulse');
  g.prev = { jump: !!input.jump, interact: !!input.interact, pulse: !!input.pulse };

  // 1. di chuyển người chơi
  const th = (input.cam_yaw_deg * Math.PI) / 180;
  let mx = input.move[0], mz = input.move[1];
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  const wx = mx * Math.cos(th) + mz * Math.sin(th);
  const wz = -mx * Math.sin(th) + mz * Math.cos(th);
  P.pos[0] += wx * T.player_speed * DT;
  P.pos[2] += wz * T.player_speed * DT;
  clampIsland(P.pos);
  if (Math.hypot(wx, wz) > 1e-6) P.heading = Math.atan2(wx, wz);
  if (jumpEdge && P.pos[1] <= 0) P.vy = WORLD.jump_speed;
  if (P.pos[1] > 0 || P.vy > 0) {
    P.vy -= WORLD.gravity * DT;
    P.pos[1] += P.vy * DT;
    if (P.pos[1] <= 0) { P.pos[1] = 0; P.vy = 0; }
  }
  if (P.invulnTicks > 0) P.invulnTicks -= 1;
  if (P.pulseCdTicks > 0) P.pulseCdTicks -= 1;

  // 2. nhặt đom đóm
  for (let i = 0; i < g.motes.length && P.carried < T.carry_capacity; ) {
    const m = g.motes[i];
    if (dist2d(m.pos[0], m.pos[2], P.pos[0], P.pos[2]) <= T.pickup_radius) {
      g.motes.splice(i, 1);
      P.carried += 1;
      g.score += T.score.per_mote;
      emit(g, 'mote_picked', { carried: P.carried });
    } else i++;
  }

  // 3. nạp đèn
  if (interactEdge && P.carried > 0) {
    let best = null, bd = Infinity;
    for (const l of g.lanterns) {
      if (l.lit) continue;
      const d = dist2d(l.pos[0], l.pos[2], P.pos[0], P.pos[2]);
      if (d <= T.interact_radius && d < bd) { best = l; bd = d; }
    }
    if (best) {
      const amount = Math.min(P.carried, T.lantern_cost - best.deposited);
      P.carried -= amount;
      best.deposited += amount;
      emit(g, 'deposit', { lantern_id: best.id, amount, deposited: best.deposited });
      if (best.deposited >= T.lantern_cost) {
        best.lit = true;
        g.score += T.score.per_lantern;
        emit(g, 'lantern_lit', { lantern_id: best.id });
      }
    }
  }

  // 4. tỏa sáng (pulse)
  if (pulseEdge && P.pulseCdTicks === 0 && P.carried >= T.pulse_cost) {
    P.carried -= T.pulse_cost;
    P.pulseCdTicks = Math.round(T.pulse_cooldown_s * TICK_RATE);
    const stunned = [];
    for (const s of g.shades) {
      if (dist2d(s.pos[0], s.pos[2], P.pos[0], P.pos[2]) <= T.pulse_radius) {
        s.state = 'stunned';
        s.stunTicks = Math.round(T.pulse_stun_s * TICK_RATE);
        let dx = s.pos[0] - P.pos[0], dz = s.pos[2] - P.pos[2];
        const d = Math.hypot(dx, dz);
        if (d < 1e-9) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
        s.pos[0] += dx * T.pulse_push_m;
        s.pos[2] += dz * T.pulse_push_m;
        clampIsland(s.pos);
        pushOutOfSafe(g, s);
        g.score += T.score.per_stun;
        stunned.push(s.id);
      }
    }
    emit(g, 'pulse', { stunned_ids: stunned });
  }

  // 5. Bóng Mực di chuyển, chạm người chơi
  for (const s of g.shades) {
    if (s.stunTicks > 0) {
      s.stunTicks -= 1;
      if (s.stunTicks === 0) s.state = 'chase';
    } else {
      const dx = P.pos[0] - s.pos[0], dz = P.pos[2] - s.pos[2];
      const d = Math.hypot(dx, dz);
      if (d > 1e-9) {
        const mv = Math.min(T.shade_speed * DT, d);
        s.pos[0] += (dx / d) * mv;
        s.pos[2] += (dz / d) * mv;
      }
    }
    pushOutOfSafe(g, s);
    if (s.state !== 'stunned' && P.invulnTicks === 0 && P.flames > 0 &&
        dist2d(s.pos[0], s.pos[2], P.pos[0], P.pos[2]) <= T.shade_hit_radius) {
      P.flames -= 1;
      P.invulnTicks = Math.round(T.invuln_s * TICK_RATE);
      const dropped = Math.floor(P.carried * T.hit_drop_ratio);
      P.carried -= dropped;
      for (let i = 0; i < dropped; i++) {
        const a = (i * 2 * Math.PI) / dropped;
        const pos = [P.pos[0] + WORLD.drop_ring_radius * Math.sin(a), 0, P.pos[2] + WORLD.drop_ring_radius * Math.cos(a)];
        clampIsland(pos);
        g.motes.push({ id: 'M' + g.nextMote++, pos });
      }
      emit(g, 'player_hit', { by: 'shade', flames: P.flames, dropped });
    }
  }

  // 6. sinh đom đóm / Bóng Mực ngẫu nhiên
  if (g.randomMotes) {
    g.moteTimer -= 1;
    if (g.moteTimer <= 0) {
      g.moteTimer = Math.round(WORLD.mote_respawn_s * TICK_RATE);
      if (g.motes.length < WORLD.motes_target) g.motes.push(randomMote(g));
    }
  }
  if (g.randomShades) {
    g.shadeTimer -= 1;
    if (g.shadeTimer <= 0) {
      g.shadeTimer = Math.round(WORLD.shade_spawn_interval_s * TICK_RATE);
      if (g.shades.length < WORLD.shade_max) {
        const a = g.rng() * 2 * Math.PI;
        const s = {
          id: 'S' + g.nextShade++,
          pos: [WORLD.shade_spawn_radius * Math.sin(a), WORLD.shade_height, WORLD.shade_spawn_radius * Math.cos(a)],
          state: 'chase', stunTicks: 0,
        };
        pushOutOfSafe(g, s);
        g.shades.push(s);
        emit(g, 'shade_spawned', { id: s.id });
      }
    }
  }

  // 7. kết thúc
  const tl = timeLeftTicks(g);
  if (g.lanterns.every((l) => l.lit)) {
    g.state = 'won';
    g.score += T.score.per_second_left * Math.floor(Math.max(tl, 0) / TICK_RATE) + T.score.per_flame_left * P.flames;
    emit(g, 'game_over', { result: 'won', reason: 'all_lit' });
  } else if (P.flames <= 0) {
    g.state = 'lost';
    emit(g, 'game_over', { result: 'lost', reason: 'no_flames' });
  } else if (tl <= 0) {
    g.state = 'lost';
    emit(g, 'game_over', { result: 'lost', reason: 'dawn' });
  }
  return g.events;
}

const r3 = (v) => Math.round(v * 1000) / 1000 + 0; // +0 chuẩn hóa -0
const rv = (a) => a.map(r3);

export function snapshot(g) {
  return {
    type: 'snapshot',
    tick: g.sim_tick,
    sim_tick: g.sim_tick,
    state: g.state,
    time_left_s: r3(timeLeftS(g)),
    score: g.score,
    player: { pos: rv(g.player.pos), flames: g.player.flames, carried: g.player.carried },
    lanterns: g.lanterns.map((l) => ({ id: l.id, pos: rv(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: g.shades.map((s) => ({ id: s.id, pos: rv(s.pos), state: s.state })),
    motes: g.motes.map((m) => ({ id: m.id, pos: rv(m.pos) })),
    motes_active: g.motes.length,
  };
}

export function roundEvent(e) { return e; }
