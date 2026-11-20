// Cảnh benchmark chuẩn (TICKET-04 §1): Đêm 1, 200 Bóng Mực wander rải đều theo seed, 100 đom đóm, đèn L1–L3 sáng fuel 100,
// Mây đứng yên (0,0,0). Dùng chung cho trình duyệt (web/main.js) và test. Không đổi luật/headless.
import { mulberry32 } from './sim.js';
import { NIGHTS } from './maps.js';

export const BENCH = { shades: 200, motes: 100, islandR: 38, camRadius: 30, camHeight: 15, camPeriodS: 15, warmupS: 3 };

// Camera: góc 0° tại (30,15,0), ngược chiều kim đồng hồ khi nhìn từ trên xuống (x=r·cosθ, z=r·sinθ tăng θ theo quy ước của dự án)
export function benchCamera(tSeconds) {
  const a = (tSeconds / BENCH.camPeriodS) * 2 * Math.PI;
  return { pos: [BENCH.camRadius * Math.cos(a), BENCH.camHeight, BENCH.camRadius * Math.sin(a)], look: [0, 0, 0] };
}

export function benchScenario(seed) {
  const rng = mulberry32(seed);
  const disc = () => { const r = BENCH.islandR * Math.sqrt(rng()), a = rng() * 2 * Math.PI; return [r * Math.cos(a), 0, r * Math.sin(a)]; };
  const shades = Array.from({ length: BENCH.shades }, (_, i) => ({ id: 'S' + (i + 1), pos: disc(), state: 'wander' }));
  const motes = Array.from({ length: BENCH.motes }, () => disc());
  const ids = NIGHTS[1].lanterns.map((l) => l.id).slice(0, 3);
  return {
    player: { pos: [0, 0, 0] },
    lanterns: ids.map((id) => ({ id, lit: true, fuel: 100 })),
    shades, motes,
    random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false,
  };
}

// Chỉ số theo định nghĩa của ticket. dts: mảng thời gian từng khung (ms) trong khoảng đo
export function benchStats(dts) {
  const n = dts.length, sum = dts.reduce((a, b) => a + b, 0);
  const sorted = [...dts].sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil(0.01 * n));
  const worst = sorted.slice(0, k).reduce((a, b) => a + b, 0) / k;
  const asc = [...dts].sort((a, b) => a - b);
  const p95 = asc[Math.min(n - 1, Math.ceil(0.95 * n) - 1)];
  const r1 = (x) => Math.round(x * 10) / 10;
  return { frames: n, avg_fps: r1(1000 * n / sum), p1_low_fps: r1(1000 / worst), frame_ms_p95: r1(p95) };
}
