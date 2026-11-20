// Lõi mô phỏng Đảo Đèn Lồng (Contract v1.2: nhiên liệu đèn, thắng khi sống tới bình minh): tất định, 60 tick/giây, không phụ thuộc đồ họa.
// Dùng chung cho chế độ headless (Node) và bản chơi trong trình duyệt.
// Thứ tự xử lý một tick theo TICKET-02 (mỗi bước đánh số 1..12 trong step()).
import { TUNING, WORLD } from './tuning.js';
import { NIGHTS, surfaceBelow, blockedAt } from './maps.js';

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
const dist3d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);
const isNat = (v) => Number.isInteger(v) && v >= 0;
const toTicks = (s) => Math.round(s * TICK_RATE);
const idNum = (id) => { const m = /(\d+)$/.exec(id); return m ? Number(m[1]) : 0; };
const byId = (a, b) => idNum(a.id) - idNum(b.id);
const SHADE_STATES = ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'];
const DRIFTER_STATES = ['idle', 'chase', 'flee'];

export function validateScenario(sc) {
  if (sc === null || typeof sc !== 'object' || Array.isArray(sc)) throw new ScenarioError('scenario phải là một object');
  const bad = (m) => { throw new ScenarioError('scenario: ' + m); };
  if (sc.player !== undefined) {
    const p = sc.player;
    if (p === null || typeof p !== 'object') bad('player phải là object');
    if (p.pos !== undefined && !isVec3(p.pos)) bad('player.pos phải là [x,y,z]');
    for (const k of ['carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks', 'successful_lights']) {
      if (p[k] !== undefined && !isNat(p[k])) bad(`player.${k} phải là số nguyên >= 0`);
    }
  }
  for (const k of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) {
    if (sc[k] !== undefined && typeof sc[k] !== 'boolean') bad(k + ' phải là boolean');
  }
  if (sc.motes !== undefined) {
    if (!Array.isArray(sc.motes)) bad('motes phải là mảng');
    for (const m of sc.motes) {
      const pos = Array.isArray(m) ? m : m && m.pos;
      if (!isVec3(pos)) bad('mỗi mote phải là [x,y,z] hoặc {pos:[x,y,z]}');
      if (!Array.isArray(m) && m.ttl_ticks !== undefined && !isNat(m.ttl_ticks)) bad('mote.ttl_ticks phải là số nguyên >= 0');
    }
  }
  if (sc.shades !== undefined) {
    if (!Array.isArray(sc.shades)) bad('shades phải là mảng');
    for (const s of sc.shades) {
      if (s === null || typeof s !== 'object' || !isVec3(s.pos)) bad('mỗi shade phải có pos [x,y,z]');
      if (s.id !== undefined && typeof s.id !== 'string') bad('shade.id phải là chuỗi');
      if (s.state !== undefined && !SHADE_STATES.includes(s.state)) bad('shade.state phải là một trong ' + SHADE_STATES.join('/'));
      if (s.state_ticks_left !== undefined && !isNat(s.state_ticks_left)) bad('shade.state_ticks_left phải là số nguyên >= 0');
      if (s.target_lantern_id !== undefined && s.target_lantern_id !== null && typeof s.target_lantern_id !== 'string') bad('shade.target_lantern_id phải là chuỗi');
    }
  }
  if (sc.drifters !== undefined) {
    if (!Array.isArray(sc.drifters)) bad('drifters phải là mảng');
    for (const d of sc.drifters) {
      if (d === null || typeof d !== 'object' || !isVec3(d.pos)) bad('mỗi drifter phải có pos [x,y,z]');
      if (d.id !== undefined && typeof d.id !== 'string') bad('drifter.id phải là chuỗi');
      if (d.state !== undefined && !DRIFTER_STATES.includes(d.state)) bad('drifter.state phải là một trong ' + DRIFTER_STATES.join('/'));
      if (d.stolen !== undefined && !isNat(d.stolen)) bad('drifter.stolen phải là số nguyên >= 0');
      if (d.state_ticks_left !== undefined && !isNat(d.state_ticks_left)) bad('drifter.state_ticks_left phải là số nguyên >= 0');
    }
  }
  if (sc.charms !== undefined) {
    if (!Array.isArray(sc.charms)) bad('charms phải là mảng');
    for (const c of sc.charms) {
      if (c === null || typeof c !== 'object' || typeof c.id !== 'string') bad('mỗi charm phải có id');
      if (c.pos !== undefined && !isVec3(c.pos)) bad('charm.pos phải là [x,y,z]');
      if (c.available !== undefined && typeof c.available !== 'boolean') bad('charm.available phải là boolean');
      if (c.respawn_ticks !== undefined && !isNat(c.respawn_ticks)) bad('charm.respawn_ticks phải là số nguyên >= 0');
    }
  }
  if (sc.lanterns !== undefined) {
    if (!Array.isArray(sc.lanterns)) bad('lanterns phải là mảng');
    for (const l of sc.lanterns) {
      if (l === null || typeof l !== 'object' || typeof l.id !== 'string') bad('mỗi lantern phải có id');
      if (l.pos !== undefined && !isVec3(l.pos)) bad('lantern.pos phải là [x,y,z]');
      if (l.deposited !== undefined && !isNat(l.deposited)) bad('lantern.deposited phải là số nguyên >= 0');
      if (l.lit !== undefined && typeof l.lit !== 'boolean') bad('lantern.lit phải là boolean');
      if (l.fuel !== undefined && !(isNum(l.fuel) && l.fuel >= 0)) bad('lantern.fuel phải là số >= 0');
      if (l.ever_lit !== undefined && typeof l.ever_lit !== 'boolean') bad('lantern.ever_lit phải là boolean');
    }
  }
  if (sc.time_left_s !== undefined && !(isNum(sc.time_left_s) && sc.time_left_s > 0)) bad('time_left_s phải là số > 0');
}

const BUTTONS = ['jump', 'interact', 'pulse', 'dash', 'pause'];

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
    for (const b of BUTTONS) if (f[b] !== undefined && typeof f[b] !== 'boolean') bad(b + ' phải là boolean');
  }
}

export function newInputState() {
  return { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
}

export function applyFrame(state, frame) {
  if (frame.move !== undefined) state.move = [frame.move[0], frame.move[1]];
  if (frame.cam_yaw_deg !== undefined) state.cam_yaw_deg = frame.cam_yaw_deg;
  for (const b of BUTTONS) if (frame[b] !== undefined) state[b] = frame[b];
}

export function createGame({ seed = 1, night = 1, scenario = null, tuning = TUNING } = {}) {
  if (scenario) validateScenario(scenario);
  const N = NIGHTS[night];
  if (!N) throw new ScenarioError('night phải là 1, 2 hoặc 3');
  const sc = scenario || {};
  const T = tuning;
  const rng = mulberry32(seed);

  const FU = 60; // nhiên liệu tính theo đơn vị nguyên 1/60 để không sai số số thực
  const lanterns = N.lanterns.map((l) => ({ id: l.id, pos: [...l.pos], lit: false, deposited: 0, fuelU: 0, ever_lit: false, relit_count: 0, zone: false }));
  for (const u of sc.lanterns || []) {
    const l = lanterns.find((x) => x.id === u.id);
    if (!l) throw new ScenarioError('scenario: không có đèn ' + u.id);
    if (u.pos) l.pos = [...u.pos];
    if (u.deposited !== undefined) l.deposited = u.deposited;
    if (u.lit !== undefined) l.lit = u.lit;
    else if (u.fuel !== undefined) l.lit = u.fuel > 0;
    if (u.ever_lit !== undefined) l.ever_lit = u.ever_lit;
    if (l.deposited >= (l.ever_lit ? T.relight_cost : T.lantern_cost) && u.lit !== false) l.lit = true;
    if (l.lit) { l.fuelU = u.fuel !== undefined ? Math.round(u.fuel * FU) : T.fuel_max * FU; l.ever_lit = true; if (l.fuelU <= 0) l.lit = false; } else l.fuelU = 0;
  }

  for (const l of lanterns) l.zone = l.lit && l.fuelU >= T.low_fuel_threshold * FU;
  const p = sc.player || {};
  const start = p.pos ? [...p.pos] : [...N.start.pos];
  const g = {
    T, N, rng, seed, night,
    state: 'playing',
    tick: 0,        // tick tường (tăng cả khi tạm dừng)
    sim_tick: 0,    // tick mô phỏng (đứng yên khi tạm dừng)
    lightsDone: (sc.player && sc.player.successful_lights) || 0,
    initialTicks: toTicks(sc.time_left_s !== undefined ? sc.time_left_s : T[N.durationKey]),
    score: 0,
    player: {
      pos: start, vx: 0, vy: 0, vz: 0, grounded: false, launch: null,
      carried: p.carried !== undefined ? p.carried : 0,
      flames: p.flames !== undefined ? p.flames : T.flames,
      invuln: p.invuln_ticks || 0,
      dashCd: p.dash_cd_ticks || 0,
      dashTicks: 0, dashDir: [0, 0],
      pulseCd: p.pulse_cd_ticks || 0,
      charm: p.charm_ticks || 0,
      fallWait: 0, dashing: false,
      heading: N.start.heading,
    },
    lanterns,
    motes: [], shades: [], drifters: [], charms: [],
    nextMote: 1, nextShade: 1, nextDrifter: 1,
    randomMotes: sc.random_motes !== false,
    randomShades: sc.random_shades !== false,
    randomDrifters: sc.random_drifters !== false && !!N.drifterSpots,
    wind: { enabled: sc.wind_enabled !== undefined ? sc.wind_enabled : N.wind, active: false, warn: false, dir: 0 },
    prev: { jump: false, interact: false, pulse: false, dash: false, pause: false },
    events: [],
  };
  const P = g.player;
  const h0 = surfaceBelow(N, P.pos[0], P.pos[2], P.pos[1] + WORLD.step_tol);
  P.grounded = h0 !== null && Math.abs(P.pos[1] - h0) < 1e-6;

  // đom đóm
  if (sc.motes !== undefined) {
    for (const m of sc.motes) {
      const pos = Array.isArray(m) ? m : m.pos;
      const mote = { id: 'M' + g.nextMote++, pos: [...pos], kind: 'random', ttl: null, spot: -1 };
      if (!Array.isArray(m) && m.kind === 'dropped') mote.kind = 'dropped';
      if (!Array.isArray(m) && m.ttl_ticks !== undefined) { mote.kind = 'dropped'; mote.ttl = m.ttl_ticks; }
      g.motes.push(mote);
    }
  } else if (g.randomMotes) {
    const idx = N.moteSpots.map((_, i) => i);
    for (let i = 0; i < WORLD.motes_start; i++) {
      const j = i + Math.floor(rng() * (idx.length - i));
      [idx[i], idx[j]] = [idx[j], idx[i]];
      g.motes.push({ id: 'M' + g.nextMote++, pos: [...N.moteSpots[idx[i]]], kind: 'random', ttl: null, spot: idx[i] });
    }
  }
  // Bóng Mực
  for (const s of sc.shades || []) {
    const id = s.id !== undefined ? s.id : 'S' + g.nextShade++;
    const n = /^S(\d+)$/.exec(id);
    if (n) g.nextShade = Math.max(g.nextShade, Number(n[1]) + 1);
    const state = s.state !== undefined ? s.state : 'chase';
    const dflt = { spawning: WORLD.shade_spawning_ticks, recoil: WORLD.shade_recoil_ticks, stunned: toTicks(T.pulse_stun_s) }[state] || 0;
    const sh = newShade(id, s.pos, state, s.state_ticks_left !== undefined ? s.state_ticks_left : dflt);
    if (s.target_lantern_id) { sh.target = s.target_lantern_id; sh.sticky = true; }
    if (state === 'drain' && !sh.target) { const nl = nearestLantern(lanterns, s.pos, (l) => l.lit); sh.target = nl ? nl.id : null; }
    const gy = surfaceBelow(N, s.pos[0], s.pos[2], s.pos[1] + WORLD.step_tol);
    sh.pos[1] = gy !== null ? gy : s.pos[1];
    g.shades.push(sh);
  }
  g.shades.sort(byId);
  // Gió Lạc
  for (const d of sc.drifters || []) {
    const id = d.id !== undefined ? d.id : 'D' + g.nextDrifter++;
    const n = /^D(\d+)$/.exec(id);
    if (n) g.nextDrifter = Math.max(g.nextDrifter, Number(n[1]) + 1);
    const state = d.state || 'idle';
    g.drifters.push({
      id, pos: [...d.pos], state, stolen: d.stolen || 0,
      ticks: d.state_ticks_left !== undefined ? d.state_ticks_left : (state === 'flee' ? WORLD.drifter_flee_ticks : 0),
      heading: 0,
    });
  }
  g.drifters.sort(byId);
  // Bùa Gió
  if (sc.charms !== undefined) {
    for (const c of sc.charms) {
      const base = N.charms.find((x) => x.id === c.id);
      const pos = c.pos || (base && base.pos);
      if (!pos) throw new ScenarioError('scenario: charm ' + c.id + ' cần pos');
      g.charms.push({ id: c.id, pos: [...pos], available: c.available !== false, respawn: c.respawn_ticks || 0 });
    }
  } else {
    for (const c of N.charms) g.charms.push({ id: c.id, pos: [...c.pos], available: true, respawn: 0 });
  }
  g.charms.sort(byId);
  g.events.push({ type: 'event', tick: 0, name: 'night_start', data: { night } });
  return g;
}

function newShade(id, pos, state, stateTicks) {
  return {
    id, pos: [pos[0], pos[1], pos[2]], state, ticks: stateTicks,
    knock: 0, knockDir: [1, 0], recoilDir: [1, 0], eject: 0, wanderTicks: 0, wanderHeading: 0, target: null, sticky: false, drainTicks: 0,
  };
}

function nearestLantern(lanterns, pos, pred) {
  let best = null, bd = Infinity;
  for (const l of lanterns) { if (!pred(l)) continue; const d = dist2d(l.pos[0], l.pos[2], pos[0], pos[2]); if (d < bd) { best = l; bd = d; } } // bằng nhau: id nhỏ (duyệt trước) thắng
  return best;
}
export function capacity(g) { return Math.min(g.T.capacity_max, g.T.carry_capacity + 2 * g.lightsDone); }
const zoneOn = (g, l) => l.lit && l.fuelU >= g.T.low_fuel_threshold * 60;

export function timeLeftTicks(g) { return g.initialTicks - g.sim_tick; }
export function timeLeftS(g) { return timeLeftTicks(g) / TICK_RATE; }
function emit(g, name, data) { g.events.push({ type: 'event', tick: g.tick, name, data }); }

// Thử dịch chuyển (nx,nz) từ (px,pz) với trượt theo từng trục. ok(x,z) quyết định vị trí hợp lệ.
function slideMove(pos, nx, nz, ok) {
  const px = pos[0], pz = pos[2];
  if (ok(nx, nz)) { pos[0] = nx; pos[2] = nz; return true; }
  if (nx !== px && ok(nx, pz)) { pos[0] = nx; return true; }
  if (nz !== pz && ok(px, nz)) { pos[2] = nz; return true; }
  return false;
}

// Bóng Mực đứng được tại (x,z) nếu có mặt đất trong khoảng bậc thềm và không có vách.
function shadeStand(g, s, x, z) {
  const y = s.pos[1];
  const h = surfaceBelow(g.N, x, z, y + WORLD.step_tol);
  if (h === null || h < y - WORLD.step_tol) return null;
  if (blockedAt(g.N, x, z, y)) return null;
  return h;
}
function shadeMove(g, s, dx, dz) {
  const nx = s.pos[0] + dx, nz = s.pos[2] + dz;
  let h = null;
  const moved = slideMove(s.pos, nx, nz, (x, z) => { h = shadeStand(g, s, x, z); return h !== null; });
  if (moved) s.pos[1] = h;
  return moved;
}
function clampSafe(g, s) {
  if (s.eject > 0) return;
  for (const l of g.lanterns) {
    if (!zoneOn(g, l)) continue;
    let dx = s.pos[0] - l.pos[0], dz = s.pos[2] - l.pos[2];
    const d = Math.hypot(dx, dz);
    if (d < g.T.safe_radius) {
      if (d < 1e-9) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
      const nx = l.pos[0] + dx * g.T.safe_radius, nz = l.pos[2] + dz * g.T.safe_radius;
      const h = shadeStand(g, s, nx, nz);
      if (h !== null) { s.pos[0] = nx; s.pos[2] = nz; s.pos[1] = h; }
    }
  }
}
function awayDir(ax, az, bx, bz) { // hướng từ b ra xa a... (từ a tới b), trùng nhau -> +X
  const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
  return d < 1e-9 ? [1, 0] : [dx / d, dz / d];
}

function pickFree(g, spots, occupied) {
  const free = [];
  for (let i = 0; i < spots.length; i++) if (!occupied(i)) free.push(i);
  if (!free.length) return -1;
  return free[Math.floor(g.rng() * free.length)];
}

// Một bước mô phỏng. `input` là trạng thái nút đang giữ (đã gộp frame). Trả về danh sách event của bước.
export function step(g, input) {
  g.events = [];
  if (g.state === 'won' || g.state === 'lost') return g.events;
  const T = g.T, P = g.player, N = g.N;
  g.tick += 1; // sự kiện của bước này ghi tick = k+1

  const edge = (k) => !!input[k] && !g.prev[k];
  const jumpEdge = edge('jump'), interactEdge = edge('interact'), pulseEdge = edge('pulse');
  const dashEdge = edge('dash'), pauseEdge = edge('pause');
  g.prev = { jump: !!input.jump, interact: !!input.interact, pulse: !!input.pulse, dash: !!input.dash, pause: !!input.pause };

  // 1. đọc input: xử lý tạm dừng trước
  if (pauseEdge) {
    if (g.state === 'playing') { g.state = 'paused'; emit(g, 'paused', {}); return g.events; }
    g.state = 'playing'; emit(g, 'resumed', {});
  } else if (g.state === 'paused') return g.events;
  g.sim_tick += 1;
  const t = g.sim_tick;

  // 2. giảm bộ đếm
  if (P.invuln > 0) P.invuln -= 1;
  if (P.dashCd > 0) P.dashCd -= 1;
  if (P.pulseCd > 0) P.pulseCd -= 1;
  if (P.charm > 0) P.charm -= 1;
  for (const s of g.shades) {
    if (s.eject > 0) s.eject -= 1;
    if (s.state === 'spawning' || s.state === 'recoil' || s.state === 'stunned') {
      if (s.ticks > 0) s.ticks -= 1;
      if (s.ticks === 0) s.state = s.state === 'recoil' ? 'chase' : 'wander'; // hết choáng / hết spawning → wander
    }
  }
  for (const d of g.drifters) if (d.state === 'flee' && d.ticks > 0) d.ticks -= 1;
  for (let i = g.motes.length - 1; i >= 0; i--) {
    const m = g.motes[i];
    if (m.ttl !== null) { m.ttl -= 1; if (m.ttl <= 0) g.motes.splice(i, 1); }
  }
  for (const c of g.charms) if (!c.available && c.respawn > 0) { c.respawn -= 1; if (c.respawn === 0) c.available = true; }
  // nhiên liệu đèn: hao 1/s + bị hút 5/s mỗi Bóng đang drain; ngay sau đó đèn hết dầu tắt
  const drainers = new Map();
  for (const s of g.shades) if (s.state === 'drain' && s.target) { drainers.set(s.target, (drainers.get(s.target) || 0) + 1); }
  for (const l of g.lanterns) {
    if (!l.lit) continue;
    l.fuelU -= T.fuel_decay_per_s + T.drain_per_s * (drainers.get(l.id) || 0);
  }
  for (const s of g.shades) {
    if (s.state !== 'drain' || !s.target) continue;
    s.drainTicks += 1;
    if (s.drainTicks % 60 === 0) { const l = g.lanterns.find((x) => x.id === s.target); if (l) emit(g, 'fuel_drain', { lantern_id: l.id, shade_id: s.id, fuel: fu1(l.fuelU) }); }
  }
  for (const l of g.lanterns) {
    if (l.lit && l.fuelU <= 0) { l.lit = false; l.fuelU = 0; l.deposited = 0; emit(g, 'lantern_out', { lantern_id: l.id }); }
  }
  if (g.wind.enabled) {
    const per = WORLD.wind_period_ticks, k = Math.floor((t + WORLD.wind_warn_ticks) / per);
    const start = k * per;
    if (t + WORLD.wind_warn_ticks === start && k >= 1) { g.wind.dir = g.rng() * 2 * Math.PI; g.wind.warn = true; }
    g.wind.active = t >= per && t % per < WORLD.wind_duration_ticks;
    if (g.wind.active) g.wind.warn = false;
    else if (t % per === 0 || t % per >= WORLD.wind_duration_ticks) { if (t + WORLD.wind_warn_ticks < start || t >= start) g.wind.warn = false; }
  }
  if (P.fallWait > 0) {
    P.fallWait -= 1;
    if (P.fallWait === 0) { // hồi sinh
      P.pos = [...N.start.pos]; P.vx = P.vy = P.vz = 0; P.launch = null; P.dashTicks = 0;
      P.invuln = WORLD.fall_invuln_ticks; P.heading = N.start.heading;
      P.grounded = true;
    }
  }
  const alive = P.fallWait === 0;

  // 3. di chuyển Mây
  if (alive) movePlayer(g, input, jumpEdge, dashEdge);

  // 4. nhặt đom đóm và bùa
  if (alive) {
    for (let i = 0; i < g.motes.length && P.carried < capacity(g); ) {
      const m = g.motes[i];
      if (canReach(P, m.pos, T.pickup_radius)) {
        g.motes.splice(i, 1); P.carried += 1;
        emit(g, 'mote_picked', { carried: P.carried });
      } else i++;
    }
    for (const c of g.charms) {
      if (c.available && canReach(P, c.pos, T.pickup_radius)) {
        c.available = false; c.respawn = WORLD.charm_respawn_ticks; P.charm = WORLD.charm_ticks;
        emit(g, 'charm_picked', { charm_id: c.id, charm_ticks: P.charm });
      }
    }
  }

  // 5. tương tác với đèn: thắp (đèn tắt), thắp lại (ever_lit, 5 đom đóm) hoặc châm dầu (đèn sáng chưa đầy)
  if (alive && interactEdge && P.carried > 0) {
    let best = null, bd = Infinity;
    for (const l of g.lanterns) {
      if (l.lit && l.fuelU >= T.fuel_max * 60) continue; // đèn đầy dầu không được chọn
      const d = dist2d(l.pos[0], l.pos[2], P.pos[0], P.pos[2]);
      if (d <= T.interact_radius && d < bd) { best = l; bd = d; } // bằng nhau: id nhỏ (đã duyệt trước) thắng
    }
    if (best && best.lit) {
      const used = Math.min(P.carried, Math.ceil((T.fuel_max * 60 - best.fuelU) / (T.fuel_per_mote * 60)));
      P.carried -= used;
      best.fuelU = Math.min(T.fuel_max * 60, best.fuelU + T.fuel_per_mote * 60 * used);
      g.score += used * T.score.per_mote;
      emit(g, 'refuel', { lantern_id: best.id, amount: used, fuel: fu1(best.fuelU) });
    } else if (best) {
      const cost = best.ever_lit ? T.relight_cost : T.lantern_cost;
      const amount = Math.min(P.carried, cost - best.deposited);
      P.carried -= amount; best.deposited += amount;
      g.score += amount * T.score.per_mote;
      emit(g, 'deposit', { lantern_id: best.id, amount, deposited: best.deposited });
      if (best.deposited >= cost) {
        const relight = best.ever_lit;
        best.lit = true; best.fuelU = T.fuel_max * 60; best.ever_lit = true;
        if (relight) best.relit_count += 1;
        g.lightsDone += 1;
        g.score += relight ? T.score.per_relight : T.score.per_lantern;
        emit(g, 'lantern_lit', { lantern_id: best.id, relight });
      }
    }
  }

  // 6. vùng an toàn: đèn sáng và fuel ≥ 30 mới có vùng. Khi một đèn VỪA có lại vùng (thắp hoặc châm dầu lên ≥30),
  //    Bóng đang ở trong vùng bị đẩy ra tối đa 30 tick và không gây sát thương
  for (const l of g.lanterns) {
    const on = zoneOn(g, l);
    if (on && !l.zone) {
      for (const s of g.shades) {
        if (dist2d(s.pos[0], s.pos[2], l.pos[0], l.pos[2]) < T.safe_radius) { s.eject = WORLD.eject_ticks; s.ejectFrom = l.id; }
      }
    }
    l.zone = on;
  }

  // 7. Tỏa Sáng
  if (alive && pulseEdge && P.pulseCd === 0 && P.carried >= T.pulse_cost) {
    P.carried -= T.pulse_cost;
    P.pulseCd = toTicks(T.pulse_cooldown_s);
    const center = [P.pos[0], P.pos[1] + WORLD.pulse_center_up, P.pos[2]];
    const stunned = [], repelled = [], dropped = [];
    for (const s of g.shades) {
      if (dist3d([s.pos[0], s.pos[1] + WORLD.pulse_center_up, s.pos[2]], center) <= T.pulse_radius) {
        const wasDrain = s.state === 'drain';
        s.state = 'stunned'; s.ticks = toTicks(T.pulse_stun_s); s.target = null; s.sticky = false; s.drainTicks = 0;
        s.knock = WORLD.pulse_knock_ticks; s.eject = 0;
        s.knockDir = awayDir(P.pos[0], P.pos[2], s.pos[0], s.pos[2]);
        g.score += wasDrain ? T.score.per_drain_stun : T.score.per_stun;
        stunned.push(s.id);
      }
    }
    for (const d of g.drifters) {
      if (dist3d(d.pos, center) > T.pulse_radius) continue;
      if (d.state === 'chase') { d.state = 'flee'; d.ticks = WORLD.drifter_flee_ticks; d.stolen = 0; repelled.push(d.id); }
      else if (d.state === 'flee' && d.stolen > 0) {
        const gy = surfaceBelow(N, d.pos[0], d.pos[2], d.pos[1] + WORLD.step_tol);
        for (let i = 0; i < d.stolen; i++) {
          g.motes.push({ id: 'M' + g.nextMote++, pos: [d.pos[0], gy !== null ? gy : P.pos[1], d.pos[2]], kind: 'dropped', ttl: WORLD.drifter_drop_ttl_ticks, spot: -1 });
        }
        emit(g, 'drifter_drop', { drifter_id: d.id, amount: d.stolen });
        d.stolen = 0; dropped.push(d.id);
      }
    }
    emit(g, 'pulse', { stunned_ids: stunned, repelled_ids: repelled, dropped_ids: dropped });
  }

  // 8. di chuyển Bóng Mực và Gió Lạc
  for (const s of g.shades) moveShade(g, s);
  for (const d of g.drifters) moveDrifter(g, d);

  // 9. chạm: Gió Lạc cướp trước, rồi Bóng Mực gây hit (theo id tăng dần, tối đa 1 hit/tick)
  if (alive) {
    for (const d of g.drifters) {
      if ((d.state === 'idle' || d.state === 'chase') && P.carried > 0 &&
          dist2d(d.pos[0], d.pos[2], P.pos[0], P.pos[2]) <= WORLD.drifter_steal_radius) {
        const amount = Math.min(WORLD.drifter_steal_max, P.carried);
        P.carried -= amount; d.stolen = amount; d.state = 'flee'; d.ticks = WORLD.drifter_flee_ticks;
        emit(g, 'drifter_steal', { drifter_id: d.id, amount, carried: P.carried });
      }
    }
    if (P.invuln === 0) {
      for (const s of g.shades) {
        if ((s.state !== 'wander' && s.state !== 'chase') || s.eject > 0) continue;
        if (dist2d(s.pos[0], s.pos[2], P.pos[0], P.pos[2]) <= T.shade_hit_radius &&
            Math.abs(P.pos[1] - s.pos[1]) <= WORLD.height_tol) {
          P.flames -= 1; P.invuln = WORLD.hit_invuln_ticks;
          const n = Math.floor(P.carried * T.hit_drop_ratio);
          P.carried -= n;
          for (let i = 0; i < n; i++) {
            const a = (i * 2 * Math.PI) / n, r = n > 1 ? 1.5 + i / (n - 1) : 2;
            let x = P.pos[0] + r * Math.cos(a), z = P.pos[2] + r * Math.sin(a), y = null;
            y = surfaceBelow(N, x, z, P.pos[1] + WORLD.step_tol);
            if (y === null || blockedAt(N, x, z, P.pos[1])) { x = P.pos[0]; z = P.pos[2]; y = P.pos[1]; }
            g.motes.push({ id: 'M' + g.nextMote++, pos: [x, y, z], kind: 'dropped', ttl: WORLD.dropped_ttl_ticks, spot: -1 });
          }
          s.state = 'recoil'; s.ticks = WORLD.shade_recoil_ticks;
          s.recoilDir = awayDir(P.pos[0], P.pos[2], s.pos[0], s.pos[2]);
          { const m = WORLD.shade_recoil_m / WORLD.shade_recoil_ticks; shadeMove(g, s, s.recoilDir[0] * m, s.recoilDir[1] * m); } // bước lùi đầu tiên ngay tick bị đánh → đủ 60 bước
          emit(g, 'player_hit', { by: 'shade', shade_id: s.id, flames: P.flames, dropped: n });
          break;
        }
      }
    }
  }

  // 10. sinh theo lịch (thực thể mới chỉ tương tác được từ tick sau)
  if (g.randomMotes && t % WORLD.mote_respawn_ticks === 0 && g.motes.length < WORLD.motes_cap) {
    const i = pickFree(g, N.moteSpots, (k) => g.motes.some((m) => m.spot === k));
    if (i >= 0) g.motes.push({ id: 'M' + g.nextMote++, pos: [...N.moteSpots[i]], kind: 'random', ttl: null, spot: i });
  }
  if (g.randomShades && t >= WORLD.shade_first_spawn_tick && (t - WORLD.shade_first_spawn_tick) % N.shadeInterval === 0) {
    const count = t === WORLD.shade_first_spawn_tick ? 2 : 1;
    for (let c = 0; c < count && g.shades.length < N.shadeMax; c++) {
      const i = pickFree(g, N.shadeSpots, (k) => {
        const sp = N.shadeSpots[k];
        if (dist2d(sp[0], sp[2], P.pos[0], P.pos[2]) < WORLD.shade_spawn_min_dist) return true;
        if (g.lanterns.some((l) => zoneOn(g, l) && dist2d(sp[0], sp[2], l.pos[0], l.pos[2]) < T.safe_radius)) return true;
        return g.shades.some((s) => dist2d(s.pos[0], s.pos[2], sp[0], sp[2]) < 1);
      });
      if (i < 0) continue;
      const sp = N.shadeSpots[i];
      const s = newShade('S' + g.nextShade++, sp, 'spawning', WORLD.shade_spawning_ticks);
      g.shades.push(s);
      emit(g, 'shade_spawned', { id: s.id });
    }
  }
  if (g.randomDrifters && t % WORLD.drifter_period_ticks === 0 && g.drifters.length < WORLD.drifter_max) {
    const i = pickFree(g, N.drifterSpots, () => false);
    const sp = N.drifterSpots[i];
    g.drifters.push({ id: 'D' + g.nextDrifter++, pos: [...sp], state: 'idle', stolen: 0, ticks: 0, heading: g.rng() * 2 * Math.PI });
  }

  // 11. thắng / thua (sau mọi cập nhật của tick). Không còn thắng sớm: chỉ xét khi hết giờ (bình minh)
  const tl = timeLeftTicks(g);
  if (P.flames <= 0) {
    g.state = 'lost'; emit(g, 'game_over', { result: 'lost', reason: 'no_flames' });
  } else if (tl <= 0) {
    const litNow = g.lanterns.filter((l) => l.lit);
    if (litNow.length >= Math.ceil(T.win_ratio * g.lanterns.length)) {
      g.state = 'won';
      for (const l of litNow) g.score += T.score.per_lantern_dawn + Math.floor(l.fuelU / 60);
      g.score += T.score.per_flame_left * P.flames;
      emit(g, 'game_over', { result: 'won', reason: 'dawn_survived' });
    } else {
      g.state = 'lost'; emit(g, 'game_over', { result: 'lost', reason: 'dawn' });
    }
  }
  return g.events;
}

function canReach(P, pos, radius) {
  return dist2d(pos[0], pos[2], P.pos[0], P.pos[2]) <= radius && Math.abs(P.pos[1] - pos[1]) <= WORLD.height_tol;
}

function movePlayer(g, input, jumpEdge, dashEdge) {
  const T = g.T, P = g.player, N = g.N;
  const th = (input.cam_yaw_deg * Math.PI) / 180;
  let mx = input.move[0], mz = input.move[1];
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  const wx = mx * Math.cos(th) + mz * Math.sin(th);
  const wz = -mx * Math.sin(th) + mz * Math.cos(th);
  const moving = Math.hypot(wx, wz) > 1e-6;
  if (moving) P.heading = Math.atan2(wx, wz);

  // lướt
  if (dashEdge && P.dashTicks === 0 && (P.dashCd === 0 || P.charm > 0)) {
    P.dashDir = moving ? [wx / Math.hypot(wx, wz), wz / Math.hypot(wx, wz)] : [Math.sin(P.heading), Math.cos(P.heading)];
    P.dashTicks = P.charm > 0 ? WORLD.charm_dash_ticks : toTicks(T.dash_duration_s);
    if (P.charm === 0) P.dashCd = toTicks(T.dash_cooldown_s);
    emit(g, 'dash', {});
  }
  const dashing = P.dashTicks > 0;
  let vx, vz;
  if (dashing) { vx = P.dashDir[0] * T.dash_speed; vz = P.dashDir[1] * T.dash_speed; P.dashTicks -= 1; }
  else if (P.launch) { vx = P.launch[0]; vz = P.launch[1]; }
  else { const sp = P.charm > 0 ? WORLD.charm_speed : T.player_speed; vx = wx * sp; vz = wz * sp; }
  if (g.wind.active) { vx += Math.cos(g.wind.dir) * WORLD.wind_push; vz += Math.sin(g.wind.dir) * WORLD.wind_push; }
  if (jumpEdge && P.grounded && !P.launch) { P.vy = WORLD.jump_speed; P.grounded = false; }

  const oldY = P.pos[1];
  // đang lướt: giữ nguyên độ cao (đóng băng chuyển động dọc, giữ lại vy để tiếp tục sau khi lướt xong)
  if (!dashing && !P.grounded) { P.vy -= WORLD.gravity * DT; P.pos[1] += P.vy * DT; }
  P.dashing = dashing;
  slideMove(P.pos, P.pos[0] + vx * DT, P.pos[2] + vz * DT, (x, z) => !blockedAt(N, x, z, oldY));
  P.vx = vx; P.vz = vz;

  const [x, y, z] = P.pos;
  if (dashing && !P.grounded) { /* lướt trên không: chưa xét chạm đất */ }
  else if (P.grounded) {
    const h = surfaceBelow(N, x, z, y + WORLD.step_tol);
    if (h !== null && h >= y - WORLD.step_tol) { P.pos[1] = h; P.vy = 0; }
    else { P.grounded = false; P.vy = 0; }
  } else if (P.vy <= 0) {
    const h = surfaceBelow(N, x, z, oldY + WORLD.step_tol);
    if (h !== null && y <= h) { P.pos[1] = h; P.vy = 0; P.grounded = true; P.launch = null; }
  }
  // bục nhảy
  if (P.grounded) {
    for (const pad of N.pads) {
      if (dist2d(pad.pos[0], pad.pos[2], P.pos[0], P.pos[2]) <= pad.r && Math.abs(P.pos[1] - pad.pos[1]) <= WORLD.step_tol) {
        let d = pad.dir;
        if (!d) { d = [pad.target[0] - pad.pos[0], pad.target[1] - pad.pos[2]]; const l = Math.hypot(d[0], d[1]); d = [d[0] / l, d[1] / l]; }
        P.launch = [d[0] * pad.vh, d[1] * pad.vh]; P.vy = pad.vy; P.grounded = false;
        P.vx = P.launch[0]; P.vz = P.launch[1];
        break;
      }
    }
  }
  // rơi khỏi đảo
  if (g.T.fall_enabled && P.pos[1] < WORLD.void_y) {
    const lost = P.carried;
    P.flames -= 1; P.carried = 0; P.fallWait = WORLD.fall_wait_ticks;
    P.vx = P.vy = P.vz = 0; P.launch = null; P.dashTicks = 0;
    emit(g, 'player_hit', { by: 'fall', flames: P.flames, dropped: 0, lost });
  }
}

function moveShade(g, s) {
  const T = g.T, P = g.player;
  const speed = g.N.shadeSpeed;
  const dP = dist2d(s.pos[0], s.pos[2], P.pos[0], P.pos[2]);
  if (s.state === 'drain') { // drain → chase (Mây vào 6 m) | wander (đèn tắt / fuel ≥30 / cách đèn >2 m)
    const l = g.lanterns.find((x) => x.id === s.target);
    if (dP <= T.safe_radius) { s.state = 'chase'; s.target = null; s.drainTicks = 0; }
    else if (!l || !l.lit || l.fuelU >= T.low_fuel_threshold * 60 || dist2d(s.pos[0], s.pos[2], l.pos[0], l.pos[2]) > 2) { s.state = 'wander'; s.target = null; s.drainTicks = 0; }
  }
  if (s.state === 'stunned') {
    if (s.knock > 0) {
      const k = (T.pulse_push_m / WORLD.pulse_knock_ticks);
      shadeMove(g, s, s.knockDir[0] * k, s.knockDir[1] * k);
      s.knock -= 1;
    }
  } else if (s.eject > 0) {
    for (const l of g.lanterns) {
      if (l.id !== s.ejectFrom) continue;
      const d = dist2d(s.pos[0], s.pos[2], l.pos[0], l.pos[2]);
      if (d < T.safe_radius) {
        const dir = awayDir(l.pos[0], l.pos[2], s.pos[0], s.pos[2]);
        const m = Math.min(T.safe_radius - d, T.safe_radius / WORLD.eject_ticks);
        shadeMove(g, s, dir[0] * m, dir[1] * m);
      }
      if (dist2d(s.pos[0], s.pos[2], l.pos[0], l.pos[2]) >= T.safe_radius - 1e-9) s.eject = 0;
    }
  } else if (s.state === 'recoil') {
    const m = WORLD.shade_recoil_m / WORLD.shade_recoil_ticks;
    shadeMove(g, s, s.recoilDir[0] * m, s.recoilDir[1] * m);
  } else if (s.state === 'wander' || s.state === 'chase') {
    if (s.state === 'wander' && dP <= WORLD.shade_detect) { s.state = 'chase'; s.target = null; s.sticky = false; }
    else if (s.state === 'chase' && dP > WORLD.shade_lose) s.state = 'wander';
    if (s.state === 'chase') {
      const dx = P.pos[0] - s.pos[0], dz = P.pos[2] - s.pos[2], d = Math.hypot(dx, dz);
      if (d > 1e-9) { const m = Math.min(speed * DT, d); shadeMove(g, s, (dx / d) * m, (dz / d) * m); }
    } else {
      // wander: đi tới đèn sáng yếu (fuel <30) gần nhất, không có thì đèn tắt gần nhất, không có nữa thì lang thang
      const weakP = (l) => l.lit && l.fuelU < T.low_fuel_threshold * 60, offP = (l) => !l.lit;
      let tl = null;
      if (s.sticky) { tl = g.lanterns.find((x) => x.id === s.target); if (tl && !(weakP(tl) || offP(tl))) { tl = null; s.sticky = false; } }
      if (!tl) tl = nearestLantern(g.lanterns, s.pos, weakP) || nearestLantern(g.lanterns, s.pos, offP);
      s.target = tl ? tl.id : null;
      if (tl && weakP(tl) && dist2d(s.pos[0], s.pos[2], tl.pos[0], tl.pos[2]) <= 2) { s.state = 'drain'; s.drainTicks = 0; clampSafe(g, s); return; }
      if (tl) {
        const dx = tl.pos[0] - s.pos[0], dz = tl.pos[2] - s.pos[2], d = Math.hypot(dx, dz);
        if (d > 1e-9) { const m = Math.min(WORLD.shade_wander_speed * DT, d); shadeMove(g, s, (dx / d) * m, (dz / d) * m); }
      } else {
      if (s.wanderTicks <= 0) { s.wanderHeading = g.rng() * 2 * Math.PI; s.wanderTicks = WORLD.shade_wander_turn_ticks; }
      s.wanderTicks -= 1;
      const m = WORLD.shade_wander_speed * DT;
      if (!shadeMove(g, s, Math.cos(s.wanderHeading) * m, Math.sin(s.wanderHeading) * m)) s.wanderTicks = 0;
      }
    }
  }
  clampSafe(g, s);
}

function moveDrifter(g, d) {
  const P = g.player;
  if (d.state === 'idle' || d.state === 'chase') {
    const dP = dist2d(d.pos[0], d.pos[2], P.pos[0], P.pos[2]);
    const hunt = P.carried >= WORLD.drifter_chase_min_carry && dP <= WORLD.drifter_chase_dist;
    d.state = hunt ? 'chase' : 'idle';
  }
  if (d.state === 'idle') {
    d.pos[0] += Math.cos(d.heading) * WORLD.drifter_idle_speed * DT;
    d.pos[2] += Math.sin(d.heading) * WORLD.drifter_idle_speed * DT;
    d.heading += WORLD.drifter_idle_speed / WORLD.drifter_idle_radius * DT;
  } else if (d.state === 'chase') {
    const dx = P.pos[0] - d.pos[0], dz = P.pos[2] - d.pos[2], dist = Math.hypot(dx, dz);
    if (dist > 1e-9) {
      const m = Math.min(WORLD.drifter_speed * DT, dist);
      d.pos[0] += (dx / dist) * m; d.pos[2] += (dz / dist) * m;
    }
    d.pos[1] = P.pos[1] + 1;
  } else if (d.state === 'flee') {
    const dir = awayDir(P.pos[0], P.pos[2], d.pos[0], d.pos[2]);
    d.pos[0] += dir[0] * WORLD.drifter_speed * DT; d.pos[2] += dir[1] * WORLD.drifter_speed * DT;
    if (d.ticks === 0) d.state = 'removed';
  }
}

const fu1 = (u) => Math.round((u / 60) * 10) / 10;
const r3 = (v) => Math.round(v * 1000) / 1000 + 0; // +0 chuẩn hóa -0
const rv = (a) => a.map(r3);

export function snapshot(g) {
  const P = g.player;
  // dọn Gió Lạc đã biến mất (cùng số đã cướp) sau bước xử lý
  g.drifters = g.drifters.filter((d) => d.state !== 'removed');
  return {
    type: 'snapshot',
    tick: g.tick,
    sim_tick: g.sim_tick,
    state: g.state,
    night: g.night,
    time_left_s: r3(timeLeftS(g)),
    score: g.score,
    wind: { active: g.wind.active, dir_deg: r3((((g.wind.dir * 180) / Math.PI) % 360 + 360) % 360), warning: g.wind.warn },
    player: {
      pos: rv(P.pos), vel: rv([P.vx, P.dashing ? 0 : P.vy, P.vz]), grounded: P.grounded, invuln: P.invuln > 0,
      dash_cd_s: r3(P.dashCd / TICK_RATE), pulse_cd_s: r3(P.pulseCd / TICK_RATE), charm_s: r3(P.charm / TICK_RATE),
      flames: P.flames, carried: P.carried, capacity: capacity(g), falling: P.fallWait > 0,
    },
    lanterns: g.lanterns.map((l) => ({ id: l.id, pos: rv(l.pos), lit: l.lit, deposited: l.deposited, fuel: l.lit ? fu1(l.fuelU) : 0, ever_lit: l.ever_lit, relit_count: l.relit_count })),
    shades: g.shades.map((s) => ({ id: s.id, pos: rv(s.pos), state: s.state, target_lantern_id: s.target || null, state_ticks_left: ['spawning', 'recoil', 'stunned'].includes(s.state) ? s.ticks : 0 })),
    motes: g.motes.map((m) => ({ id: m.id, pos: rv(m.pos), kind: m.kind, ttl_s: m.ttl === null ? null : r3(m.ttl / TICK_RATE) })),
    motes_active: g.motes.length,
    drifters: g.drifters.map((d) => ({ id: d.id, pos: rv(d.pos), state: d.state, stolen: d.stolen })),
    charms: g.charms.map((c) => ({ id: c.id, pos: rv(c.pos), available: c.available, respawn_s: r3(c.respawn / TICK_RATE) })),
  };
}

export function roundEvent(e) { return e; }
