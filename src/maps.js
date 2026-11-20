// Bản đồ chuẩn của 3 Đêm (TICKET-02, Phần 2). Góc đo từ +X, ngược chiều kim đồng hồ trên mặt XZ:
// (x, z) = (cx + r·cosθ, cz + r·sinθ).
import { WORLD } from './tuning.js';

const rad = (d) => (d * Math.PI) / 180;
const polar = (cx, cz, r, deg, y = 0) => [cx + r * Math.cos(rad(deg)), y, cz + r * Math.sin(rad(deg))];
const ring = (cx, cz, r, startDeg, stepDeg, count, y = 0) =>
  Array.from({ length: count }, (_, i) => polar(cx, cz, r, startDeg + i * stepDeg, y));

// ---- Bề mặt (surface): disc / ring (nửa z>0) / rect / ramp ----
export function surfaceContains(s, x, z) {
  switch (s.k) {
    case 'disc': return Math.hypot(x - s.cx, z - s.cz) <= s.r;
    case 'halfring': { const d = Math.hypot(x, z); return d >= s.r0 && d <= s.r1 && z > 0; }
    case 'rect': return x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1;
    case 'ramp': {
      const c = Math.cos(rad(s.a)), n = Math.sin(rad(s.a));
      const u = x * c + z * n, v = -x * n + z * c;
      return Math.abs(v) <= s.w / 2 && u >= s.u0 && u <= s.u1;
    }
    default: return false;
  }
}
export function surfaceHeight(s, x, z) {
  if (s.k !== 'ramp') return s.h;
  const u = x * Math.cos(rad(s.a)) + z * Math.sin(rad(s.a));
  return s.hHigh * (s.u1 - u) / (s.u1 - s.u0); // u1 = chân dốc (Y=0), u0 = đỉnh dốc
}

// Mặt đứng cao nhất không vượt quá ymax tại (x,z); null nếu là hư không.
export function surfaceBelow(night, x, z, ymax) {
  let best = null;
  for (const s of night.surfaces) {
    if (!surfaceContains(s, x, z)) continue;
    const h = surfaceHeight(s, x, z);
    if (h <= ymax && (best === null || h > best)) best = h;
  }
  return best;
}
// Có vật cản (vách/tháp/mép tầng) cao hơn chân y + bậc thềm tại (x,z) không?
export function blockedAt(night, x, z, y) {
  for (const s of night.surfaces) {
    if (surfaceContains(s, x, z) && surfaceHeight(s, x, z) > y + WORLD.step_tol) return true;
  }
  return false;
}

const night1 = {
  id: 1, name: 'Đảo Bến', durationKey: 'night1_duration_s',
  surfaces: [{ k: 'disc', cx: 0, cz: 0, r: 40, h: 0 }],
  start: { pos: [0, 0, 0], heading: 0 },
  lanterns: [
    ['L1', [0, 0, 25]], ['L2', [23.8, 0, 7.7]], ['L3', [14.7, 0, -20.2]],
    ['L4', [-14.7, 0, -20.2]], ['L5', [-23.8, 0, 7.7]],
  ].map(([id, pos]) => ({ id, pos })),
  moteSpots: [...ring(0, 0, 12, 0, 45, 8), ...ring(0, 0, 33, 0, 22.5, 16)],
  shadeSpots: ring(0, 0, 37, 15, 30, 12),
  shadeInterval: 480, shadeMax: 6, shadeSpeed: 4.0,
  pads: [], charms: [], drifterSpots: null, wind: false,
};

const night2 = {
  id: 2, name: 'Đảo Cau', durationKey: 'night2_duration_s',
  surfaces: [
    { k: 'disc', cx: 0, cz: 0, r: 28, h: 0 },
    { k: 'disc', cx: 70, cz: 0, r: 28, h: 0 },
    { k: 'rect', x0: 26, x1: 44, z0: -2, z1: 2, h: 0 },
  ],
  start: { pos: [0, 0, 0], heading: 0 },
  lanterns: [
    ['L1', [0, 0, 20]], ['L2', [17, 0, -10]], ['L3', [-17, 0, -10]],
    ['L4', [70, 0, 20]], ['L5', [87, 0, -10]], ['L6', [53, 0, -10]],
  ].map(([id, pos]) => ({ id, pos })),
  moteSpots: [
    ...ring(0, 0, 10, 0, 90, 4), ...ring(0, 0, 22, 0, 45, 8),
    ...ring(70, 0, 10, 0, 90, 4), ...ring(70, 0, 22, 0, 45, 8),
  ],
  shadeSpots: [...ring(0, 0, 26, 22.5, 45, 8), ...ring(70, 0, 26, 22.5, 45, 8)],
  shadeInterval: 420, shadeMax: 8, shadeSpeed: 4.0,
  pads: [
    { pos: [20, 0, 18], r: 1, vy: 14, vh: 24, target: [70, 0] },
    { pos: [50, 0, -18], r: 1, vy: 14, vh: 24, target: [0, 0] },
  ],
  charms: [{ id: 'C1', pos: [35, 0, 0] }],
  drifterSpots: [[10, 2, 10], [-10, 2, -10], [60, 2, 10], [80, 2, -10], [35, 2, 12], [35, 2, -12]],
  wind: false,
};

const night3 = {
  id: 3, name: 'Đảo Chuông', durationKey: 'night3_duration_s',
  surfaces: [
    { k: 'disc', cx: 0, cz: 0, r: 45, h: 0 },                 // tầng 0
    { k: 'halfring', r0: 12, r1: 24, h: 3 },                  // tầng 1 (z>0)
    { k: 'disc', cx: 0, cz: 0, r: 8, h: 6 },                  // tầng 2
    { k: 'disc', cx: 0, cz: 0, r: 2, h: 14 },                 // tháp chuông: vật cản cao 8 m trên tầng 2
    { k: 'ramp', a: 30, w: 3, u0: 24, u1: 30, hHigh: 3 },
    { k: 'ramp', a: 150, w: 3, u0: 24, u1: 30, hHigh: 3 },
  ],
  start: { pos: [0, 0, -30], heading: 0 }, // giả định: tâm đảo là tầng 2 + tháp nên không thể xuất phát ở (0,0,0)
  lanterns: [
    ['L1', [0, 6, 6]], ['L2', [18, 3, 10]], ['L3', [-18, 3, 10]], ['L4', [35, 0, -10]],
    ['L5', [-35, 0, -10]], ['L6', [20, 0, -35]], ['L7', [-20, 0, -35]],
  ].map(([id, pos]) => ({ id, pos })),
  moteSpots: [...ring(0, 0, 34, 0, 20, 18, 0), ...ring(0, 0, 18, 20, 20, 8, 3), ...ring(0, 0, 5, 45, 90, 4, 6)],
  shadeSpots: ring(0, 0, 43, 0, 22.5, 16),
  shadeInterval: 360, shadeMax: 10, shadeSpeed: WORLD.shade_night3_speed,
  pads: [{ pos: [0, 3, 13], r: 1, vy: 12, vh: 8, dir: [0, -1] }],
  charms: [{ id: 'C1', pos: [30, 0, 25] }, { id: 'C2', pos: [-30, 0, 25] }],
  drifterSpots: ring(0, 0, 30, 0, 45, 8, 2),
  wind: true,
};

export const NIGHTS = { 1: night1, 2: night2, 3: night3 };
