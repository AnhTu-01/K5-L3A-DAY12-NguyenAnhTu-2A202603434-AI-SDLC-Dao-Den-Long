// Bộ sinh input ngẫu nhiên cho soak test (TICKET-04 §2): mỗi 30 tick chọn lại hướng; mỗi tick xác suất 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác.
import { mulberry32 } from './sim.js';

export const SOAK_P = { jump: 0.05, dash: 0.03, pulse: 0.02, interact: 0.10, redirect_every: 30 };

export function makeSoakInput(nightSeed) {
  const rng = mulberry32((nightSeed ^ 0x5bd1e995) | 0); // tách khỏi PRNG của game
  let dir = [0, 0];
  return (k, input) => {
    if (k % SOAK_P.redirect_every === 0) { const ang = rng() * 2 * Math.PI; dir = [Math.cos(ang), Math.sin(ang)]; }
    input.move = dir; input.cam_yaw_deg = 0;
    input.jump = rng() < SOAK_P.jump; input.dash = rng() < SOAK_P.dash; input.pulse = rng() < SOAK_P.pulse; input.interact = rng() < SOAK_P.interact;
  };
}
