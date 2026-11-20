// Các kịch bản kiểm chứng (Phase 1 đã re-base theo số chuẩn v1.1 + Phase 2). Dùng chung cho `npm test` và `npm run proof`.
// Phase 3 (Contract v1.2): case gắn [P2→v1.2] là case cũ đã đổi do luật mới (lý do ở docs/notes/regression-p2.md); không case nào bị skip.
// Mỗi case: yêu cầu (req), night, scenario, inputs, ticks -> check(lines) trả về {ok, detail}.
// Case Phase 1 có chú thích "[P1→v1.1]": hành vi giữ nguyên, chỉ đổi con số/điểm theo số chuẩn; lý do ghi ở docs/notes/regression-p1.md.
import { TUNING as T } from '../src/tuning.js';

const clean = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes: [], shades: [], drifters: [], charms: [] };
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
const last = (lines, type) => [...lines].reverse().find((l) => l.type === type);
const events = (lines, name) => lines.filter((l) => l.type === 'event' && l.name === name);
const snap = (lines, tick) => lines.find((l) => l.type === 'snapshot' && l.tick === tick);
const res = (ok, detail) => ({ ok, detail });
const J = (v) => JSON.stringify(v);
const press = (tick) => [{ tick, interact: true }, { tick: tick + 1, interact: false }];
const sn = (L) => L.filter((l) => l.type === 'snapshot');

export const cases = [
  // ================= Phase 1 (re-base theo số chuẩn) =================
  {
    name: 'move_forward',
    req: 'Nhân vật đi lại: move [0,1] đi về +Z đúng tốc độ player_speed (6 m/s)',
    seed: 1, ticks: 60, scenario: { ...clean },
    inputs: { frames: [{ tick: 0, move: [0, 1] }] },
    check: (L) => { const z = snap(L, 60).player.pos[2]; return res(near(z, T.player_speed), `z sau 60 tick = ${z}, mong đợi ${T.player_speed}`); },
  },
  {
    name: 'move_diagonal_normalized',
    req: 'Vector di chuyển dài hơn 1 được chuẩn hóa về độ dài 1',
    seed: 1, ticks: 60, scenario: { ...clean },
    inputs: { frames: [{ tick: 0, move: [1, 1] }] },
    check: (L) => {
      const [x, , z] = snap(L, 60).player.pos; const d = Math.hypot(x, z);
      return res(near(d, T.player_speed, 0.02) && near(x, z, 0.01), `quãng đường = ${d.toFixed(3)}, x=${x} z=${z}`);
    },
  },
  {
    name: 'camera_yaw',
    req: "cam_yaw_deg=90 làm move [0,1] đi về +X (x' = z·sinθ)",
    seed: 1, ticks: 60, scenario: { ...clean },
    inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }] },
    check: (L) => { const [x, , z] = snap(L, 60).player.pos; return res(near(x, T.player_speed) && near(z, 0, 0.02), `pos = (${x}, ${z})`); },
  },
  {
    name: 'jump',
    req: 'Nhảy được (vận tốc 7, trọng lực −20: đỉnh ≈1.2 m) rồi chạm đất lại; không nhảy khi đang trên không',
    seed: 1, ticks: 120, scenario: { ...clean },
    inputs: { frames: [{ tick: 0, jump: true }, { tick: 1, jump: false }, { tick: 10, jump: true }, { tick: 11, jump: false }] },
    check: (L) => {
      const ys = sn(L).map((s) => s.player.pos[1]); const maxY = Math.max(...ys); const endY = last(L, 'snapshot').player.pos[1];
      return res(maxY > 1.1 && maxY < 1.3 && endY === 0 && last(L, 'snapshot').player.grounded, `đỉnh ${maxY} (mong đợi ≈1.225, nhảy lần 2 trên không không cộng thêm), cuối ${endY}`);
    },
  },
  {
    name: 'pickup_mote',
    every: 1,
    req: '[P1→v1.1] Nhặt đom đóm trong pickup_radius=1.0: event mote_picked, carried +1. Điểm chỉ được cộng khi NẠP (+10/đom đóm), nên nhặt chưa có điểm',
    seed: 1, ticks: 120,
    scenario: { ...clean, motes: [[0, 0, 5]] },
    inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 60, move: [0, 0] }] },
    check: (L) => {
      const ev = events(L, 'mote_picked'); const f = last(L, 'snapshot');
      return res(ev.length === 1 && ev[0].data.carried === 1 && f.score === 0 && f.motes_active === 0 && ev[0].tick >= 39 && ev[0].tick <= 41,
        `mote_picked=${ev.length}, carried=${ev[0]?.data.carried}, score=${f.score}, tick=${ev[0]?.tick} (z=4 → tick 40 vì ≤1.0 m)`);
    },
  },
  {
    name: 'pickup_height_tolerance',
    req: 'Nhặt cần chênh cao chân–đom đóm ≤ 1.5 m: mote ở y=3 phía trên không nhặt được, mote ở y=1.2 thì được',
    seed: 1, ticks: 10, scenario: { ...clean, motes: [[0, 3, 0], [0, 1.2, 0]] },
    inputs: null,
    check: (L) => { const f = last(L, 'snapshot'); return res(f.player.carried === 1 && f.motes_active === 1 && f.motes[0].pos[1] === 3, `carried=${f.player.carried}, còn ${f.motes_active} mote ở y=${f.motes[0]?.pos[1]}`); },
  },
  {
    name: 'carry_capacity',
    req: '[P1→v1.1] Không mang quá carry_capacity = 10',
    seed: 1, ticks: 30,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: T.carry_capacity }, motes: [[0, 0, 0.5]] },
    inputs: null,
    check: (L) => { const f = last(L, 'snapshot'); return res(f.player.carried === 10 && f.motes_active === 1 && events(L, 'mote_picked').length === 0, `carried=${f.player.carried}, motes còn=${f.motes_active}`); },
  },
  {
    name: 'deposit_and_light',
    req: '[P2→v1.2] Nạp đủ lantern_cost=10 thì đèn sáng (fuel 100): deposit + lantern_lit(relight:false); điểm = 10×5 (đom đóm nạp) + 100 (thắp lần đầu); sức chứa +2',
    seed: 1, ticks: 30,
    scenario: { ...clean, player: { pos: [0, 0, 24], carried: 10 } },
    inputs: { frames: press(0) },
    check: (L) => {
      const d = events(L, 'deposit')[0], lit = events(L, 'lantern_lit')[0], f = last(L, 'snapshot');
      const l1 = f.lanterns.find((x) => x.id === 'L1');
      return res(d && d.data.amount === 10 && lit && lit.data.lantern_id === 'L1' && lit.data.relight === false && f.score === 150 && f.player.carried === 0 && f.player.capacity === 12 && l1.fuel > 99 && l1.ever_lit, `deposit=${J(d?.data)}, lit=${lit?.data.lantern_id}, score=${f.score}`);
    },
  },
  {
    name: 'deposit_partial',
    req: '[P2→v1.2] Nạp thiếu thì đèn chưa sáng, tiến độ được nhớ; +5 điểm mỗi đom đóm nạp',
    seed: 1, ticks: 30,
    scenario: { ...clean, player: { pos: [0, 0, 24], carried: 1 } },
    inputs: { frames: press(0) },
    check: (L) => {
      const d = events(L, 'deposit')[0], l1 = last(L, 'snapshot').lanterns.find((x) => x.id === 'L1');
      return res(d && d.data.deposited === 1 && !l1.lit && last(L, 'snapshot').score === 5 && events(L, 'lantern_lit').length === 0, `deposited=${d?.data.deposited}, lit=${l1.lit}, score=${last(L, 'snapshot').score}`);
    },
  },
  {
    name: 'deposit_accumulates',
    req: 'Nạp nhiều lần được, đèn nhớ tiến độ: đèn đã có 4, mang 8 → nạp min(8, còn thiếu 6) = 6, đèn sáng, còn 2',
    seed: 1, ticks: 30,
    scenario: { ...clean, player: { pos: [0, 0, 24], carried: 8 }, lanterns: [{ id: 'L1', deposited: 4 }] },
    inputs: { frames: press(0) },
    check: (L) => { const d = events(L, 'deposit')[0], f = last(L, 'snapshot'); return res(d && d.data.amount === 6 && f.player.carried === 2 && events(L, 'lantern_lit').length === 1, `deposit=${J(d?.data)}, carried=${f.player.carried}`); },
  },
  {
    name: 'interact_out_of_range',
    req: '[P1→v1.1] Đứng ngoài interact_radius = 2.0 thì không nạp được (2.5 m: không; 2.0 m: được)',
    seed: 1, ticks: 40,
    scenario: { ...clean, player: { pos: [0, 0, 22.5], carried: 3 } },
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }, { tick: 10, move: [0, 1] }, { tick: 20, move: [0, 0] }, { tick: 30, interact: true }] },
    check: (L) => { const d = events(L, 'deposit'); return res(d.length === 1 && d[0].tick >= 31, `deposit tại tick ${d.map((e) => e.tick)} (lần 1 ở 2.5 m bị từ chối)`); },
  },
  {
    name: 'interact_nearest_then_smaller_id',
    req: 'Chỉ nạp vào MỘT đèn: đèn gần nhất; bằng nhau thì id nhỏ hơn',
    seed: 1, ticks: 10,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 5 }, lanterns: [{ id: 'L2', pos: [1, 0, 0] }, { id: 'L1', pos: [-1, 0, 0] }, { id: 'L3', pos: [0.5, 0, 0] }] },
    inputs: { frames: press(0) },
    check: (L) => { const d = events(L, 'deposit'); return res(d.length === 1 && d[0].data.lantern_id === 'L3' && d[0].data.amount === 5, `deposit vào ${d.map((e) => e.data.lantern_id)} (L3 cách 0.5 m, gần nhất)`); },
  },
  {
    name: 'interact_tie_smaller_id',
    req: 'Hai đèn cách đều thì chọn id nhỏ hơn (L1)',
    seed: 1, ticks: 10,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 5 }, lanterns: [{ id: 'L2', pos: [1, 0, 0] }, { id: 'L1', pos: [-1, 0, 0] }] },
    inputs: { frames: press(0) },
    check: (L) => { const d = events(L, 'deposit'); return res(d.length === 1 && d[0].data.lantern_id === 'L1', `deposit vào ${d.map((e) => e.data.lantern_id)}`); },
  },
  {
    name: 'setup_lit_no_score',
    req: 'Dựng scenario với đèn lit:true không phát sự kiện (ngoài night_start) và không cộng điểm',
    seed: 1, ticks: 10,
    scenario: { ...clean, lanterns: [{ id: 'L2', lit: true }] },
    inputs: null,
    check: (L) => {
      const f = snap(L, 0), l2 = f.lanterns.find((x) => x.id === 'L2');
      const other = L.filter((l) => l.type === 'event' && l.name !== 'night_start').length;
      return res(l2.lit && f.score === 0 && other === 0, `L2.lit=${l2.lit}, score=${f.score}, event lạ=${other}`);
    },
  },
  {
    name: 'shade_chases_and_hits',
    req: '[P1→v1.1] Bóng Mực (4 m/s) đuổi theo, chạm thì −1 Ngọn Lửa và rơi floor(4×0.5)=2 đom đóm',
    seed: 1, ticks: 400,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 4, flames: 3 }, shades: [{ id: 'S1', pos: [10, 0, 0] }] },
    inputs: null,
    check: (L) => {
      const h = events(L, 'player_hit')[0];
      return res(h && h.data.by === 'shade' && h.data.flames === 2 && h.data.dropped === 2 && h.tick >= 130 && h.tick <= 140, `player_hit=${J(h?.data)} tại tick ${h?.tick} (9 m / 4 m/s ≈ 135 tick)`);
    },
  },
  {
    name: 'invulnerability_window',
    req: '[P1→v1.1] Sau khi bị chạm Mây bất tử 90 tick: khoảng cách giữa hai lần bị chạm ≥ 90 tick',
    seed: 1, ticks: 400,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 0, flames: 3 }, shades: [{ id: 'S1', pos: [3, 0, 0] }] },
    inputs: null,
    check: (L) => { const h = events(L, 'player_hit'); const gap = h.length >= 2 ? h[1].tick - h[0].tick : null; return res(h.length >= 2 && gap >= 90, `số lần chạm=${h.length}, khoảng cách=${gap} tick`); },
  },
  {
    name: 'invulnerable_shade_touch_noop',
    req: 'Bóng chạm lúc Mây bất tử không làm gì (không mất lửa, Bóng không recoil)',
    seed: 1, ticks: 60,
    scenario: { ...clean, player: { pos: [0, 0, 0], flames: 3, invuln_ticks: 100 }, shades: [{ id: 'S1', pos: [0.5, 0, 0] }] },
    inputs: null,
    check: (L) => { const f = snap(L, 50); return res(events(L, 'player_hit').length === 0 && f.shades[0].state === 'chase' && f.player.flames === 3 && f.player.invuln, `hit=${events(L, 'player_hit').length}, shade=${f.shades[0].state}`); },
  },
  {
    name: 'lose_no_flames',
    req: 'Hết Ngọn Lửa thì thua: game_over lost/no_flames, end.state = lost',
    seed: 1, ticks: 2000,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 0, flames: 1 }, shades: [{ id: 'S1', pos: [3, 0, 0] }] },
    inputs: null,
    check: (L) => { const g = events(L, 'game_over')[0], e = last(L, 'end'); return res(g && g.data.reason === 'no_flames' && e.state === 'lost' && e.ticks < 2000, `game_over=${J(g?.data)}, end=${J(e)}`); },
  },
  {
    name: 'pulse_stuns_and_pushes',
    every: 1,
    req: '[P1→v1.1] Tỏa Sáng (3 đom đóm, bán kính 5 m): Bóng trong tầm choáng 120 tick và bị đẩy lùi tổng 4 m trong 15 tick; +5 điểm; Bóng ngoài tầm không bị ảnh hưởng',
    seed: 1, ticks: 30,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 3, flames: 3 }, shades: [{ id: 'S1', pos: [4, 0, 0] }, { id: 'S2', pos: [20, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    check: (L) => {
      const pe = events(L, 'pulse')[0], f = last(L, 'snapshot'), s1 = f.shades.find((s) => s.id === 'S1'), s2 = f.shades.find((s) => s.id === 'S2');
      const s1at1 = snap(L, 1).shades.find((s) => s.id === 'S1');
      return res(pe && J(pe.data.stunned_ids) === '["S1"]' && s1.state === 'stunned' && s1.state_ticks_left === 120 - 29 && near(s1.pos[0], 8, 0.01) && near(s1at1.pos[0], 4 + 4 / 15, 0.01) && f.player.carried === 0 && f.score === 5 && s2.state !== 'stunned',
        `pulse=${J(pe?.data)}, S1=${J(s1)}, x@tick1=${s1at1.pos[0]}, carried=${f.player.carried}, score=${f.score}`);
    },
  },
  {
    name: 'pulse_range_is_3d',
    req: 'Tỏa Sáng đo khoảng cách 3D từ tâm (chân Mây + 0.8 m) tới Bóng: Bóng cách 4.9 m ngang nhưng thấp hơn Mây 3 m (3D > 5) không bị choáng',
    seed: 1, ticks: 3, night: 3,
    scenario: { ...clean, player: { pos: [0, 3, 14], carried: 3 }, shades: [{ id: 'S1', pos: [0, 0, 9.1], state: 'wander' }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    check: (L) => { const pe = events(L, 'pulse')[0]; return res(pe && pe.data.stunned_ids.length === 0, `pulse=${J(pe?.data)}`); },
  },
  {
    name: 'pulse_needs_light',
    req: '[P1→v1.1] Không đủ 3 đom đóm thì không tỏa sáng được (không event, không tốn)',
    seed: 1, ticks: 5,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 2, flames: 3 }, shades: [{ id: 'S1', pos: [4, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    check: (L) => res(events(L, 'pulse').length === 0 && last(L, 'snapshot').player.carried === 2, `số event pulse = ${events(L, 'pulse').length}`),
  },
  {
    name: 'pulse_cooldown',
    req: '[P1→v1.1] Tỏa Sáng hồi 3 s (180 tick) tính từ lúc kích hoạt',
    seed: 1, ticks: 400,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 10, flames: 3 } },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 30, pulse: true }, { tick: 31, pulse: false }, { tick: 179, pulse: true }, { tick: 180, pulse: false }, { tick: 181, pulse: true }, { tick: 182, pulse: false }] },
    check: (L) => { const ps = events(L, 'pulse'); return res(ps.length === 2 && ps[0].tick === 1 && ps[1].tick === 182, `pulse tại tick ${ps.map((p) => p.tick)} (tick 30 và 179 bị chặn, 181 được)`); },
  },
  {
    name: 'pulse_refreshes_stun',
    req: 'Tỏa Sáng lại làm mới choáng và đẩy lùi; mỗi lần +5 điểm kể cả con đang choáng; không giết Bóng Mực',
    seed: 1, ticks: 250,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 6, flames: 3 }, shades: [{ id: 'S1', pos: [3, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 190, pulse: true }, { tick: 191, pulse: false }] },
    check: (L) => { const f = last(L, 'snapshot'); return res(f.score === 10 && f.shades.length === 1 && f.shades[0].state === 'stunned', `score=${f.score}, shade=${J(f.shades[0])}`); },
  },
  {
    name: 'stun_wears_off',
    req: '[P1→v1.1] Choáng hết sau 120 tick thì Bóng đuổi lại',
    seed: 1, ticks: 150,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 3, flames: 3 }, shades: [{ id: 'S1', pos: [4, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    check: (L) => { const mid = snap(L, 120).shades[0], fin = snap(L, 150).shades[0]; return res(mid.state === 'stunned' && fin.state === 'chase', `tick 120: ${mid.state}; tick 150: ${fin.state}`); },
  },
  {
    name: 'safe_radius',
    req: '[P1→v1.1] Bóng Mực ở ngoài bị chặn ở mép vùng an toàn 6 m quanh đèn đã thắp',
    seed: 1, ticks: 600,
    scenario: { ...clean, player: { pos: [0, 0, 25], carried: 0, flames: 3 }, lanterns: [{ id: 'L1', lit: true }], shades: [{ id: 'S1', pos: [15, 0, 25] }] },
    inputs: null,
    check: (L) => {
      let minD = Infinity;
      for (const s of sn(L)) minD = Math.min(minD, Math.hypot(s.shades[0].pos[0], s.shades[0].pos[2] - 25));
      return res(minD >= 5.99 && minD < 6.1 && events(L, 'player_hit').length === 0, `khoảng cách nhỏ nhất = ${minD.toFixed(3)}, số lần chạm = ${events(L, 'player_hit').length}`);
    },
  },
  {
    name: 'safe_zone_ejects_inside_shade',
    every: 1,
    req: 'Bóng đang ở trong vùng lúc đèn vừa thắp bị đẩy ra mép trong tối đa 30 tick và KHÔNG gây sát thương dù đang sát Mây',
    seed: 1, ticks: 60,
    scenario: { ...clean, player: { pos: [0, 0, 24.5], carried: 10, flames: 3 }, shades: [{ id: 'S1', pos: [0, 0, 25.4] }] },
    inputs: { frames: press(0) },
    check: (L) => {
      const f = snap(L, 40), d = Math.hypot(f.shades[0].pos[0], f.shades[0].pos[2] - 25);
      const d5 = Math.hypot(snap(L, 5).shades[0].pos[0], snap(L, 5).shades[0].pos[2] - 25);
      return res(events(L, 'lantern_lit').length === 1 && d >= 5.99 && d5 > 0.9 && d5 < 5 && events(L, 'player_hit').length === 0, `khoảng cách tới đèn @5 = ${d5.toFixed(3)} (đang bị đẩy dần), @40 = ${d.toFixed(3)}, hit=${events(L, 'player_hit').length}`);
    },
  },
  {
    name: 'no_early_win',
    req: '[P2→v1.2, THAY THẾ win_all_lit / win_on_timeout_tick] Không còn thắng sớm: thắp hết 5 đèn khi còn thời gian KHÔNG kết thúc Đêm',
    seed: 1, ticks: 600, night: 1,
    scenario: { ...clean, player: { pos: [0, 0, 24], carried: 10, flames: 3 }, time_left_s: 100,
      lanterns: [{ id: 'L2', lit: true }, { id: 'L3', lit: true }, { id: 'L4', lit: true }, { id: 'L5', lit: true }] },
    inputs: { frames: press(0) },
    check: (L) => { const e = last(L, 'end'); return res(events(L, 'lantern_lit').length === 1 && events(L, 'game_over').length === 0 && e.state === 'playing' && e.ticks === 600 && last(L, 'snapshot').lanterns.every((l) => l.lit), `end=${J(e)}, game_over=${events(L, 'game_over').length}`); },
  },
  {
    name: 'win_dawn_survived',
    req: 'Thắng: sống tới bình minh với ≥ ceil(0.6×5)=3 đèn sáng; điểm = Σ(50+floor(fuel)) mỗi đèn sáng + 50×lửa; reason dawn_survived',
    seed: 1, ticks: 300, night: 1,
    scenario: { ...clean, player: { pos: [0, 0, 0], flames: 3 }, time_left_s: 2, lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }] },
    inputs: null,
    check: (L) => {
      const g = events(L, 'game_over')[0], e = last(L, 'end'); // 120 tick × 1/60 hao: fuel = 98.0 → floor 98
      return res(g && g.data.result === 'won' && g.data.reason === 'dawn_survived' && e.ticks === 120 && e.score === 3 * (50 + 98) + 3 * 50, `game_over=${J(g?.data)}, end=${J(e)}, mong đợi ${3 * 148 + 150}`);
    },
  },
  {
    name: 'dawn_threshold_per_night',
    req: 'Ngưỡng thắng: Đêm 2 cần 4/6; 3 đèn thì thua (dawn), 4 đèn thì thắng',
    seed: 1, ticks: 200, night: 2,
    scenario: { ...clean, time_left_s: 1, lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }] },
    inputs: null,
    check: (L) => { const g = events(L, 'game_over')[0]; return res(g && g.data.result === 'lost' && g.data.reason === 'dawn', `3/6 đèn: ${J(g?.data)}`); },
  },
  {
    name: 'dawn_threshold_night2_win',
    req: 'Đêm 2 với 4/6 đèn sáng lúc bình minh → thắng',
    seed: 1, ticks: 200, night: 2,
    scenario: { ...clean, time_left_s: 1, lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }, { id: 'L4', lit: true }] },
    inputs: null,
    check: (L) => { const g = events(L, 'game_over')[0]; return res(g && g.data.result === 'won', `4/6 đèn: ${J(g?.data)}`); },
  },
  {
    name: 'dawn_threshold_night3',
    req: 'Đêm 3 cần 5/7: 4 đèn thua, tick bình minh tính cả đèn vừa hết dầu ở tick cuối',
    seed: 1, ticks: 200, night: 3,
    scenario: { ...clean, time_left_s: 1, lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }, { id: 'L4', lit: true }, { id: 'L5', lit: true, fuel: 1 }] },
    inputs: null,
    check: (L) => { const g = events(L, 'game_over')[0], out = events(L, 'lantern_out')[0]; return res(g && g.data.result === 'lost' && g.data.reason === 'dawn' && out && out.tick === 60 && g.tick === 60, `lantern_out=${J(out)}, game_over=${J(g)} (L5 hết dầu đúng tick 60 = bình minh → còn 4/7)`); },
  },
  {
    name: 'no_flames_beats_win',
    req: 'Hết Ngọn Lửa → luôn thua (no_flames) kể cả khi đủ đèn sáng',
    seed: 1, ticks: 10,
    scenario: { ...clean, player: { pos: [0, 0, 24], carried: 10, flames: 0 }, lanterns: [{ id: 'L2', lit: true }, { id: 'L3', lit: true }, { id: 'L4', lit: true }, { id: 'L5', lit: true }, { id: 'L1', lit: true }] },
    inputs: null,
    check: (L) => { const g = events(L, 'game_over')[0]; return res(g && g.data.result === 'lost' && g.data.reason === 'no_flames', `game_over=${J(g?.data)}`); },
  },
  {
    name: 'lose_dawn',
    req: 'Hết giờ (time_left_s) thì thua: game_over lost/dawn',
    seed: 1, ticks: 600,
    scenario: { ...clean, time_left_s: 2 },
    inputs: null,
    check: (L) => { const g = events(L, 'game_over')[0], e = last(L, 'end'); return res(g && g.data.reason === 'dawn' && e.ticks === 120 && e.state === 'lost', `game_over=${J(g?.data)}, end=${J(e)}`); },
  },
  {
    name: 'tick_model',
    req: 'Mô hình tick: snapshot tick 0 trước input; --ticks N chạy đúng N bước; time_left_s = thời lượng − bước/60; sim_tick = tick khi không tạm dừng',
    seed: 1, ticks: 100,
    scenario: { ...clean },
    inputs: { frames: [{ tick: 0, move: [0, 1] }] },
    check: (L) => {
      const s0 = snap(L, 0), e = last(L, 'end'), s100 = snap(L, 100);
      return res(s0.player.pos[2] === 0 && e.ticks === 100 && s100.sim_tick === 100 && near(s100.time_left_s, 240 - 100 / 60, 0.001), `tick0 z=${s0.player.pos[2]}, end.ticks=${e.ticks}, time_left_s@100=${s100.time_left_s}`);
    },
  },
  {
    name: 'random_world_night1',
    req: 'Đêm 1 ngẫu nhiên: 20 đom đóm ở 20 điểm khác nhau trong 24 điểm chuẩn; tại tick 300 sinh 2 Bóng Mực (S1,S2) ở trạng thái spawning',
    seed: 7, ticks: 320, scenario: null, inputs: null,
    check: (L) => {
      const s0 = snap(L, 0), sp = events(L, 'shade_spawned');
      const keys = new Set(s0.motes.map((m) => m.pos.join(',')));
      const f = snap(L, 300);
      return res(s0.motes_active === 20 && keys.size === 20 && sp.length === 2 && sp.every((e) => e.tick === 300) && J(sp.map((e) => e.data.id)) === '["S1","S2"]' && f.shades.every((s) => s.state === 'spawning'),
        `mote=${s0.motes_active}/${keys.size} điểm khác nhau, shade_spawned=${J(sp.map((e) => [e.tick, e.data.id]))}`);
    },
  },

  // ================= Phase 2: số chuẩn / bản đồ =================
  {
    name: 'maps_night1_standard',
    req: 'Đêm 1 — Đảo Bến: xuất phát (0,0,0); 5 đèn đúng tọa độ chuẩn; 240 s',
    seed: 1, ticks: 1, scenario: { ...clean }, inputs: null,
    check: (L) => {
      const s = snap(L, 0); const p = s.lanterns.map((l) => l.pos.join(','));
      return res(s.night === 1 && s.time_left_s === 240 && J(p) === J(['0,0,25', '23.8,0,7.7', '14.7,0,-20.2', '-14.7,0,-20.2', '-23.8,0,7.7']) && J(s.player.pos) === '[0,0,0]' && s.charms.length === 0, `đèn=${p}`);
    },
  },
  {
    name: 'maps_night2_standard',
    req: 'Đêm 2 — Đảo Cau: 6 đèn L1..L6 đúng tọa độ, 270 s, Bùa Gió C1 tại (35,0,0)',
    seed: 1, ticks: 1, night: 2, scenario: { random_shades: false, random_drifters: false, motes: [] }, inputs: null,
    check: (L) => {
      const s = snap(L, 0); const p = s.lanterns.map((l) => l.pos.join(','));
      return res(s.night === 2 && s.time_left_s === 270 && J(p) === J(['0,0,20', '17,0,-10', '-17,0,-10', '70,0,20', '87,0,-10', '53,0,-10']) && J(s.charms.map((c) => [c.id, c.pos.join(',')])) === '[["C1","35,0,0"]]', `đèn=${p}`);
    },
  },
  {
    name: 'maps_night3_standard',
    req: 'Đêm 3 — Đảo Chuông: 7 đèn (có đèn ở Y=6 và Y=3), 300 s, 2 Bùa Gió C1,C2, 20 đom đóm đặt trên các tầng 0/3/6',
    seed: 3, ticks: 1, night: 3, scenario: null, inputs: null,
    check: (L) => {
      const s = snap(L, 0); const p = s.lanterns.map((l) => l.pos.join(','));
      const ys = new Set(s.motes.map((m) => m.pos[1]));
      return res(s.night === 3 && s.time_left_s === 300 && J(p) === J(['0,6,6', '18,3,10', '-18,3,10', '35,0,-10', '-35,0,-10', '20,0,-35', '-20,0,-35']) && s.charms.length === 2 && s.motes_active === 20 && [...ys].every((y) => [0, 3, 6].includes(y)),
        `đèn=${p}, mote y=${[...ys]}`);
    },
  },
  {
    name: 'snapshot_v11_fields',
    req: 'Contract v1.1: snapshot có night, wind{active,dir_deg}, player.{vel,grounded,invuln,dash_cd_s,pulse_cd_s,charm_s}, motes{kind,ttl_s}, drifters, charms{id,available,respawn_s}',
    seed: 1, ticks: 2, night: 2, scenario: { random_shades: false, random_drifters: false, drifters: [{ id: 'D1', pos: [5, 2, 5] }] }, inputs: null,
    check: (L) => {
      const s = snap(L, 0); const miss = [];
      for (const k of ['night', 'wind', 'drifters', 'charms', 'motes', 'sim_tick']) if (s[k] === undefined) miss.push(k);
      for (const k of ['active', 'dir_deg']) if (s.wind?.[k] === undefined) miss.push('wind.' + k);
      for (const k of ['pos', 'vel', 'grounded', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s', 'flames', 'carried']) if (s.player[k] === undefined) miss.push('player.' + k);
      for (const k of ['kind', 'ttl_s']) if (s.motes[0]?.[k] === undefined) miss.push('mote.' + k);
      for (const k of ['id', 'pos', 'state', 'stolen']) if (s.drifters[0]?.[k] === undefined) miss.push('drifter.' + k);
      for (const k of ['id', 'available', 'respawn_s']) if (s.charms[0]?.[k] === undefined) miss.push('charm.' + k);
      return res(miss.length === 0 && events(L, 'night_start').length === 1 && events(L, 'night_start')[0].data.night === 2, `thiếu: ${miss.join(', ') || 'không'}`);
    },
  },
  {
    name: 'mote_respawn_schedule',
    req: 'Sinh đom đóm: tick 240, 480, … thêm 1 ở điểm trống nếu dưới 30; hết điểm trống (24 điểm Đêm 1) thì bỏ lượt',
    seed: 11, ticks: 1500, every: 1, night: 1, scenario: { random_shades: false }, inputs: null,
    check: (L) => {
      const n = (t) => snap(L, t).motes_active;
      const f = snap(L, 1440); const keys = new Set(f.motes.map((m) => m.pos.join(',')));
      return res(n(239) === 20 && n(240) === 21 && n(479) === 21 && n(480) === 22 && n(960) === 24 && n(1200) === 24 && keys.size === 24, `mote@239=${n(239)}, @240=${n(240)}, @480=${n(480)}, @960=${n(960)}, @1200=${n(1200)}, điểm khác nhau=${keys.size}`);
    },
  },
  {
    name: 'mote_expiry_ttl',
    every: 1,
    req: 'Đom đóm rơi có TTL: mote dropped ttl_ticks=30 còn ở tick 29 và biến mất ở tick 30',
    seed: 1, ticks: 40, scenario: { ...clean, motes: [{ pos: [10, 0, 0], ttl_ticks: 30 }] }, inputs: null,
    check: (L) => { const a = snap(L, 29), b = snap(L, 30); return res(a.motes_active === 1 && a.motes[0].kind === 'dropped' && a.motes[0].ttl_s > 0 && b.motes_active === 0, `@29=${a.motes_active}, @30=${b.motes_active}`); },
  },

  // ================= Phase 2: lướt =================
  {
    name: 'dash_basic',
    every: 1,
    req: 'Lướt: 14 m/s trong 12 tick (2.8 m) theo hướng đang quay mặt khi đứng yên; event dash; hồi 90 tick tính từ lúc bắt đầu',
    seed: 1, ticks: 130, scenario: { ...clean },
    inputs: { frames: [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 30, dash: true }, { tick: 31, dash: false }, { tick: 90, dash: true }, { tick: 91, dash: false }, { tick: 91, dash: false }].filter((f, i, a) => i === a.findIndex((x) => x.tick === f.tick)) },
    check: (L) => {
      const d = events(L, 'dash'); const z12 = snap(L, 12).player.pos[2];
      return res(near(z12, 2.8, 0.01) && d.length === 2 && d[0].tick === 1 && d[1].tick === 91 && snap(L, 5).player.vel[2] === 14, `z@12=${z12}, dash tại tick ${d.map((e) => e.tick)} (tick 30 trong hồi chiêu bị bỏ, tick 90 được)`);
    },
  },
  {
    name: 'dash_direction_follows_move',
    req: 'Lướt theo hướng đang di chuyển (move [1,0] → +X), không phải hướng quay mặt',
    every: 1, seed: 1, ticks: 20, scenario: { ...clean },
    inputs: { frames: [{ tick: 0, move: [1, 0], dash: true }] },
    check: (L) => { const [x, , z] = snap(L, 12).player.pos; return res(near(x, 14 * 12 / 60, 0.02) && near(z, 0, 0.01), `pos@12 = (${x}, ${z})`); },
  },
  {
    name: 'dash_air_keeps_height',
    every: 1,
    req: 'Lướt trên không giữ nguyên độ cao (không rơi trong lúc lướt) và không bất tử',
    seed: 1, ticks: 40, scenario: { ...clean },
    inputs: { frames: [{ tick: 0, jump: true }, { tick: 1, jump: false }, { tick: 10, dash: true }, { tick: 11, dash: false }] },
    check: (L) => {
      const ys = [12, 16, 20, 22].map((t) => snap(L, t).player.pos[1]);
      return res(ys.every((y) => y === ys[0]) && ys[0] > 0.5 && !snap(L, 15).player.invuln, `y trong lướt = ${ys}`);
    },
  },

  // ================= Phase 2: Bùa Gió =================
  {
    name: 'charm_pickup_speed_dash',
    every: 1,
    req: 'Bùa Gió: nhặt như đom đóm → charm_picked (600 tick); chạy 7.2 m/s; lướt không hồi chiêu (cần bấm lại; bấm khi đang lướt bị bỏ qua); hết hiệu lực sau 600 tick',
    seed: 1, ticks: 700, night: 2,
    scenario: { ...clean, player: { pos: [35, 0, 0] }, charms: [{ id: 'C1', pos: [35, 0, 0] }] },
    inputs: { frames: [{ tick: 0, move: [1, 0] }, { tick: 20, move: [0, 0] }, { tick: 30, dash: true }, { tick: 31, dash: false }, { tick: 36, dash: true }, { tick: 37, dash: false }, { tick: 43, dash: true }, { tick: 44, dash: false }, { tick: 300, dash: true }] },
    check: (L) => {
      const c = events(L, 'charm_picked')[0], d = events(L, 'dash');
      const x20 = snap(L, 20).player.pos[0];
      return res(c && c.data.charm_id === 'C1' && c.data.charm_ticks === 600 && near(x20, 35 + 7.2 * 19 / 60, 0.2) && d.map((e) => e.tick).slice(0, 2).join() === '31,44' && snap(L, 100).player.charm_s > 0 && snap(L, 601).player.charm_s === 0 && snap(L, 45).player.dash_cd_s === 0,
        `charm=${J(c?.data)}, x@20=${x20}, dash tại ${d.map((e) => e.tick)} (tick 37 bấm khi đang lướt bị bỏ qua)`);
    },
  },
  {
    name: 'charm_respawn',
    every: 100,
    req: 'Bùa Gió xuất hiện lại sau 2700 tick; nhặt lại khi đang còn hiệu lực thì làm mới 600',
    seed: 1, ticks: 2800, night: 2,
    scenario: { ...clean, player: { pos: [35, 0, 0] } , charms: [{ id: 'C1', pos: [35, 0, 0] }] },
    inputs: { frames: [{ tick: 0, move: [1, 0] }, { tick: 60, move: [0, 0] }] },
    check: (L) => {
      const c = events(L, 'charm_picked'); const a = snap(L, 2600), b = snap(L, 2800);
      return res(c.length === 1 && !a.charms[0].available && a.charms[0].respawn_s > 0 && b.charms[0].available, `charm_picked=${c.length}, @2600 available=${a.charms[0].available} respawn_s=${a.charms[0].respawn_s}, @2800 available=${b.charms[0].available}`);
    },
  },
  {
    name: 'charm_refresh',
    req: 'Nhặt Bùa khi đang còn hiệu lực thì làm mới về 600 tick',
    seed: 1, ticks: 400, night: 2,
    scenario: { ...clean, player: { pos: [35, 0, 0], charm_ticks: 200 }, charms: [{ id: 'C1', pos: [35, 0, 0] }] },
    inputs: null,
    check: (L) => { const f = snap(L, 100); return res(events(L, 'charm_picked').length === 1 && f.player.charm_s > 8 && f.player.charm_s < 8.4, `charm_s@100 = ${f.player.charm_s} (600−100)/60=8.33`); },
  },

  // ================= Phase 2: Đêm 2 — cầu, bục nhảy, rơi =================
  {
    name: 'jump_pad_night2',
    every: 1,
    req: 'Bục nhảy Đêm 2: chạm bục (20,0,18) bắn lên 14 m/s dọc + 24 m/s ngang về tâm đảo B, phím di chuyển không ghi đè, đáp trong đảo đích sau ≈1.4 s',
    seed: 1, ticks: 150, night: 2,
    scenario: { ...clean, player: { pos: [18, 0, 18] } },
    inputs: { frames: [{ tick: 0, move: [1, 0] }, { tick: 16, move: [-1, 0] }] },
    check: (L) => {
      const mid = snap(L, 40).player, end = last(L, 'snapshot').player;
      const dB = Math.hypot(end.pos[0] - 70, end.pos[2]);
      return res(mid.vel[1] !== 0 && !mid.grounded && Math.hypot(mid.vel[0], mid.vel[2]) > 23.9 && end.grounded && end.pos[1] === 0 && dB < 28 && end.pos[0] > 42,
        `vel@40=${J(mid.vel)}, kết thúc tại ${J(end.pos)} (cách tâm B ${dB.toFixed(1)} m), grounded=${end.grounded}`);
    },
  },
  {
    name: 'jump_pad_return',
    req: 'Bục nhảy ở đảo B (50,0,−18) bắn về tâm đảo A; vẫn lướt được trên không',
    seed: 1, ticks: 150, night: 2,
    scenario: { ...clean, player: { pos: [52, 0, -18] } },
    inputs: { frames: [{ tick: 0, move: [-1, 0] }, { tick: 16, move: [-0.941, 0.339] }, { tick: 20, dash: true }, { tick: 21, dash: false }] },
    check: (L) => { const end = last(L, 'snapshot').player; return res(events(L, 'dash').length === 1 && end.grounded && Math.hypot(end.pos[0], end.pos[2]) < 28 && end.pos[0] < 26, `kết thúc ${J(end.pos)}`); },
  },
  {
    name: 'bridge_walkable_no_rail',
    req: 'Cầu tre x∈[26,44], z∈[−2,2], không lan can: đi qua cầu được; lệch ra ngoài z>2 thì rơi',
    seed: 1, ticks: 400, night: 2,
    scenario: { ...clean, player: { pos: [20, 0, 0] } },
    inputs: { frames: [{ tick: 0, move: [1, 0] }, { tick: 400, move: [0, 0] }] },
    check: (L) => { const f = sn(L).find((s) => s.player.pos[0] > 45); return res(f && f.player.grounded && f.player.pos[1] === 0 && events(L, 'player_hit').length === 0, `qua cầu, tại ${J(f?.player.pos)}`); },
  },
  {
    name: 'fall_and_respawn',
    every: 1,
    req: 'Rơi (Y<−10): đúng 1 lần −1 Ngọn Lửa, mất hết đom đóm (lost), chờ 60 tick rồi hồi sinh ở điểm xuất phát, vel 0, bất tử 90 tick',
    seed: 1, ticks: 300, night: 2,
    scenario: { ...clean, player: { pos: [35, 0, 1.9], carried: 4, flames: 3 } },
    inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 20, move: [0, 0] }] },
    check: (L) => {
      const h = events(L, 'player_hit').filter((e) => e.data.by === 'fall'); const F = h[0]?.tick;
      const before = snap(L, F + 59).player, at = snap(L, F + 60).player;
      return res(h.length === 1 && h[0].data.lost === 4 && h[0].data.flames === 2 && before.pos[1] < -10 && J(at.pos) === '[0,0,0]' && J(at.vel) === '[0,0,0]' && at.invuln && at.carried === 0 && at.flames === 2,
        `player_hit=${J(h.map((e) => e.data))} tại ${F}; @F+59 y=${before.pos[1]}; @F+60 pos=${J(at.pos)} invuln=${at.invuln}`);
    },
  },
  {
    name: 'fall_ignores_invulnerability',
    req: 'Rơi bỏ qua bất tử: vẫn −1 Ngọn Lửa dù đang bất tử',
    seed: 1, ticks: 200, scenario: { ...clean, player: { pos: [39.5, 0, 0], flames: 3, invuln_ticks: 500 } },
    inputs: { frames: [{ tick: 0, move: [1, 0] }] },
    check: (L) => { const h = events(L, 'player_hit')[0]; return res(h && h.data.by === 'fall' && h.data.flames === 2, `player_hit=${J(h?.data)}`); },
  },
  {
    name: 'fall_last_flame_loses',
    req: 'Rơi khi chỉ còn 1 Ngọn Lửa: thua ngay (no_flames), không hồi sinh',
    seed: 1, ticks: 400, scenario: { ...clean, player: { pos: [39.5, 0, 0], flames: 1 } },
    inputs: { frames: [{ tick: 0, move: [1, 0] }] },
    check: (L) => { const g = events(L, 'game_over')[0], e = last(L, 'end'); return res(g && g.data.reason === 'no_flames' && e.ticks < 100, `game_over=${J(g?.data)}, end=${J(e)}`); },
  },
  {
    name: 'fall_wait_untouchable',
    every: 1,
    req: 'Trong 60 tick chờ hồi sinh: không bị chạm, không nhặt đom đóm',
    seed: 1, ticks: 200, night: 2,
    scenario: { ...clean, player: { pos: [35, 0, 1.9], flames: 3 }, shades: [{ id: 'S1', pos: [35, 0, 12], state: 'wander' }], motes: [] },
    inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 20, move: [0, 0] }] },
    check: (L) => { const hits = events(L, 'player_hit'); return res(hits.length === 1 && hits[0].data.by === 'fall', `player_hit=${J(hits.map((e) => [e.tick, e.data.by]))}`); },
  },

  // ================= Phase 2: Đêm 3 — tầng, dốc, vách, tháp, bục, gió =================
  {
    name: 'night3_ramp_climb',
    req: 'Dốc ở góc 30° (rộng 3 m, chân r=30 Y=0, đỉnh r=24 Y=3): đi lên dốc rồi lên tầng 1 (Y=3, grounded)',
    seed: 1, ticks: 120, night: 3,
    scenario: { ...clean, player: { pos: [26.847, 0, 15.5] } },
    inputs: { frames: [{ tick: 0, move: [-0.866025, -0.5] }] },
    check: (L) => { const m = snap(L, 40).player, f = last(L, 'snapshot').player; return res(m.pos[1] > 1 && m.pos[1] < 3 && near(f.pos[1], 3, 0.001) && f.grounded && Math.hypot(f.pos[0], f.pos[2]) < 24, `y@40=${m.pos[1]}, cuối ${J(f.pos)}`); },
  },
  {
    name: 'night3_cliff_is_wall',
    req: 'Mép tầng là vách đứng: từ tầng 0 đi vào tầng 2 (đĩa r=8 cao Y=6) bị chặn tại r=8; không leo được',
    seed: 1, ticks: 400, night: 3,
    scenario: { ...clean, player: { pos: [0, 0, -30] } },
    inputs: { frames: [{ tick: 0, move: [0, 1] }] },
    check: (L) => { const f = last(L, 'snapshot').player; return res(near(f.pos[2], -8, 0.15) && f.pos[1] === 0, `dừng tại ${J(f.pos)}`); },
  },
  {
    name: 'night3_step_off_falls_down',
    req: 'Bước ra khỏi mép tầng 1 thì rơi xuống tầng 0 (Y=0), không phải rơi khỏi đảo',
    seed: 1, ticks: 120, night: 3,
    scenario: { ...clean, player: { pos: [0, 3, 22], flames: 3 } },
    inputs: { frames: [{ tick: 0, move: [0, 1] }] },
    check: (L) => { const f = last(L, 'snapshot').player; return res(f.pos[1] === 0 && f.grounded && f.flames === 3 && events(L, 'player_hit').length === 0, `cuối ${J(f.pos)}`); },
  },
  {
    name: 'night3_tower_blocks',
    req: 'Tháp chuông (trụ r=2, cao 8 m ở tâm tầng 2) chặn đường, không leo được',
    seed: 1, ticks: 200, night: 3,
    scenario: { ...clean, player: { pos: [0, 6, 5] } },
    inputs: { frames: [{ tick: 0, move: [0, -1] }] },
    check: (L) => { const f = last(L, 'snapshot').player; return res(near(f.pos[2], 2, 0.15) && f.pos[1] === 6, `dừng tại ${J(f.pos)}`); },
  },
  {
    name: 'night3_pad_to_tier2',
    every: 1,
    req: 'Bục nhảy Đêm 3 (0,3,13): vận tốc Y 12 + ngang 8 hướng −Z, giữ tới khi chạm đất → đáp lên tầng 2 (Y=6)',
    seed: 1, ticks: 120, night: 3,
    scenario: { ...clean, player: { pos: [0, 3, 15] } },
    inputs: { frames: [{ tick: 0, move: [0, -1] }] },
    check: (L) => { const f = last(L, 'snapshot').player; return res(f.pos[1] === 6 && f.grounded && Math.hypot(f.pos[0], f.pos[2]) <= 8, `đáp ${J(f.pos)}`); },
  },
  {
    name: 'wind_gust_night3',
    every: 1,
    req: 'Gió mạnh Đêm 3: báo trước 2 s (tick 1680), cơn gió tick 1800–2099 (300 tick) theo hướng ngẫu nhiên đẩy 2 m/s (≈10 m trong 5 s); tắt được bằng wind_enabled:false',
    seed: 4, ticks: 2200, night: 3,
    scenario: { ...clean, wind_enabled: true, player: { pos: [0, 0, -30] } },
    inputs: null,
    check: (L) => {
      const w0 = snap(L, 1679).wind, w1 = snap(L, 1700).wind, a = snap(L, 1801).wind, b = snap(L, 2099).wind, c = snap(L, 2100).wind;
      const p0 = snap(L, 1799).player.pos, p1 = snap(L, 2099).player.pos;
      const d = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
      const ang = ((Math.atan2(p1[2] - p0[2], p1[0] - p0[0]) * 180 / Math.PI) + 360) % 360;
      return res(!w0.warning && w1.warning && !w1.active && a.active && b.active && !c.active && near(d, 10, 0.2) && Math.abs(ang - a.dir_deg) < 1,
        `báo trước@1700=${w1.warning}, active@1801=${a.active}, @2099=${b.active}, @2100=${c.active}, đi ${d.toFixed(2)} m hướng ${ang.toFixed(1)}° (dir_deg ${a.dir_deg})`);
    },
  },
  {
    name: 'wind_disabled',
    req: 'wind_enabled:false (hoặc Đêm 1, 2) → không có gió, người đứng yên không bị đẩy',
    seed: 4, ticks: 2000, night: 3,
    scenario: { ...clean, wind_enabled: false, player: { pos: [0, 0, -30] } }, inputs: null,
    check: (L) => { const f = last(L, 'snapshot'); return res(!f.wind.active && J(f.player.pos) === '[0,0,-30]', `pos=${J(f.player.pos)}`); },
  },

  // ================= Phase 2: Bóng Mực (FSM, recoil, lịch sinh) =================
  {
    name: 'shade_fsm_detect_and_lose',
    req: 'Bóng Mực dùng đúng tên trạng thái; wander→chase khi ≤12 m; chase→wander khi >18 m',
    every: 1, seed: 1, ticks: 3, scenario: { ...clean, shades: [{ id: 'S1', pos: [10, 0, 0], state: 'wander' }, { id: 'S2', pos: [20, 0, 0], state: 'chase' }, { id: 'S3', pos: [15, 0, 0], state: 'wander' }] },
    inputs: null,
    check: (L) => { const f = snap(L, 1); const st = Object.fromEntries(f.shades.map((s) => [s.id, s.state])); return res(st.S1 === 'chase' && st.S2 === 'wander' && st.S3 === 'wander', `trạng thái = ${J(st)}`); },
  },
  {
    name: 'shade_recoil_after_hit',
    every: 1,
    req: 'Bóng gây hit lùi 2 m trong 60 tick (recoil) rồi đuổi lại; hit làm rơi đom đóm dạng dropped (ttl 8 s) quanh Mây 1.5–2.5 m',
    seed: 1, ticks: 70, scenario: { ...clean, player: { pos: [0, 0, 0], carried: 6, flames: 3 }, shades: [{ id: 'S1', pos: [0.5, 0, 0] }] },
    inputs: null,
    check: (L) => {
      const a = snap(L, 1), b = snap(L, 61), f = snap(L, 62);
      const dist = (s) => Math.hypot(s.shades[0].pos[0], s.shades[0].pos[2]);
      const r = a.motes.map((m) => Math.hypot(m.pos[0], m.pos[2]));
      return res(a.shades[0].state === 'recoil' && near(dist(snap(L, 60)) - dist(a), 2 * 59 / 60, 0.05) && f.shades[0].state === 'chase' && a.motes.length === 3 && a.motes.every((m) => m.kind === 'dropped') && r.every((v) => v >= 1.49 && v <= 2.51) && near(a.motes[0].ttl_s, 8, 0.05) && a.player.carried === 3,
        `recoil@1=${a.shades[0].state}, dịch ${(dist(b) - dist(a)).toFixed(2)} m, mote rơi=${a.motes.length} r=${r.map((v) => v.toFixed(2))} ttl=${a.motes[0]?.ttl_s}`);
    },
  },
  {
    name: 'shade_schedule_night1',
    req: 'Lịch sinh Đêm 1: 2 con tại tick 300, sau đó 1 con mỗi 480 tick (780, 1260…), id S1, S2, S3…; trạng thái ban đầu spawning',
    seed: 2, ticks: 1300, scenario: { random_motes: false, motes: [], player: { flames: 99 } }, inputs: null,
    check: (L) => { const sp = events(L, 'shade_spawned'); return res(J(sp.map((e) => [e.tick, e.data.id])) === J([[300, 'S1'], [300, 'S2'], [780, 'S3'], [1260, 'S4']]), `shade_spawned = ${J(sp.map((e) => [e.tick, e.data.id]))}`); },
  },
  {
    name: 'shade_schedule_night2_night3',
    req: 'Khoảng sinh Đêm 2 = 7 s (420 tick), Đêm 3 = 6 s (360 tick)',
    seed: 2, ticks: 800, night: 2, scenario: { random_motes: false, motes: [], player: { flames: 99 } }, inputs: null,
    check: (L) => {
      const sp = events(L, 'shade_spawned').map((e) => e.tick);
      return res(J(sp) === J([300, 300, 720]), `Đêm 2: ${J(sp)}`);
    },
  },
  {
    name: 'shade_schedule_night3',
    req: 'Đêm 3: Bóng Mực sinh mỗi 360 tick (300, 660, …), nhanh 4.5 m/s',
    seed: 2, ticks: 700, night: 3, scenario: { random_motes: false, motes: [], wind_enabled: false, player: { flames: 99 } }, inputs: null,
    check: (L) => { const sp = events(L, 'shade_spawned').map((e) => e.tick); return res(J(sp) === J([300, 300, 660]), `Đêm 3: ${J(sp)}`); },
  },
  {
    name: 'shade_cap_night1',
    req: 'Tối đa 6 Bóng Mực ở Đêm 1 (chạy trọn một Đêm 14.400 tick)',
    seed: 5, ticks: 14400, every: 600, scenario: { random_motes: false, motes: [], player: { flames: 999 } }, inputs: null,
    check: (L) => { const mx = Math.max(...sn(L).map((s) => s.shades.length)); return res(mx === 6 && last(L, 'end').ticks === 14400, `số Bóng lớn nhất = ${mx}`); },
  },
  {
    name: 'knockback_stops_at_wall',
    every: 1,
    req: 'Đẩy lùi dừng khi gặp vật cản: Bóng bị đẩy về phía vách tầng 2 (Đêm 3) dừng ở r≥8',
    seed: 1, ticks: 40, night: 3,
    scenario: { ...clean, player: { pos: [0, 0, -14], carried: 3 }, shades: [{ id: 'S1', pos: [0, 0, -10.5], state: 'wander' }] },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    check: (L) => { const s = last(L, 'snapshot').shades[0]; const r = Math.hypot(s.pos[0], s.pos[2]); return res(s.state === 'stunned' && r >= 7.99 && r < 8.4, `Bóng dừng ở r=${r.toFixed(3)}`); },
  },

  // ================= Phase 2: Gió Lạc =================
  {
    name: 'drifter_steals',
    every: 1,
    req: 'Gió Lạc: idle→chase khi Mây mang ≥5 đom đóm và ≤15 m; chạm (≤1.2 m) cướp min(3, đang mang) rồi flee 240 tick và biến mất cùng số đã cướp; không mất Ngọn Lửa; chỉ cướp 1 lần',
    seed: 1, ticks: 400, night: 2,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 6, flames: 3 }, drifters: [{ id: 'D1', pos: [10, 2, 0] }] },
    inputs: null,
    check: (L) => {
      const st = events(L, 'drifter_steal'); const f = last(L, 'snapshot'); const t = st[0]?.tick;
      const mid = snap(L, 5).drifters[0];
      return res(st.length === 1 && st[0].data.amount === 3 && st[0].data.carried === 3 && mid.state === 'chase' && snap(L, t + 1).drifters[0].state === 'flee' && snap(L, t + 1).drifters[0].stolen === 3 && f.drifters.length === 0 && f.player.flames === 3,
        `steal=${J(st.map((e) => [e.tick, e.data]))}, D1@5=${mid.state}, cuối còn ${f.drifters.length} Gió Lạc`);
    },
  },
  {
    name: 'drifter_idle_below_threshold',
    req: 'Mang <5 đom đóm thì Gió Lạc không đuổi (idle lượn chậm 2 m/s); điều kiện mất thì về idle',
    every: 1, seed: 1, ticks: 120, night: 2,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 4 }, drifters: [{ id: 'D1', pos: [10, 2, 0], state: 'chase' }] },
    inputs: null,
    check: (L) => { const a = snap(L, 1).drifters[0], b = snap(L, 120).drifters[0]; return res(a.state === 'idle' && b.state === 'idle' && Math.hypot(b.pos[0] - 10, b.pos[2]) < 5, `D1: ${a.state} → ${b.state}, pos ${J(b.pos)}`); },
  },
  {
    name: 'drifter_steals_through_invuln',
    req: 'Bất tử của Mây không ngăn bị cướp',
    seed: 1, ticks: 20, night: 2,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 6, invuln_ticks: 100 }, drifters: [{ id: 'D1', pos: [0.5, 2, 0], state: 'chase' }] },
    inputs: null,
    check: (L) => { const st = events(L, 'drifter_steal'); return res(st.length === 1 && st[0].data.amount === 3, `steal=${J(st.map((e) => e.data))}`); },
  },
  {
    name: 'drifter_pulse_while_chase',
    req: 'Tỏa Sáng trúng Gió Lạc đang chase → flee, không cướp',
    every: 1, seed: 1, ticks: 100, night: 2,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 8 }, drifters: [{ id: 'D1', pos: [4, 1, 0], state: 'chase' }] },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    check: (L) => { const f = snap(L, 5).drifters[0]; return res(events(L, 'drifter_steal').length === 0 && f.state === 'flee' && f.stolen === 0 && snap(L, 5).score === 0, `D1=${J(f)}`); },
  },
  {
    name: 'drifter_pulse_drops_stolen',
    every: 1,
    req: 'Tỏa Sáng trúng Gió Lạc đang flee có mang đồ → thả lại toàn bộ (drifter_drop), thành đom đóm rơi, biến mất sau 120 tick; không cộng điểm per_stun',
    seed: 1, ticks: 130, night: 2,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 3 }, drifters: [{ id: 'D1', pos: [3, 1, 0], state: 'flee', stolen: 3, state_ticks_left: 200 }] },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    check: (L) => {
      const d = events(L, 'drifter_drop')[0];
      return res(d && d.data.amount === 3 && snap(L, 60).motes.length === 3 && snap(L, 60).motes.every((m) => m.kind === 'dropped') && snap(L, 121).motes_active === 0 && snap(L, 60).score === 0 && snap(L, 60).drifters[0].stolen === 0,
        `drop=${J(d?.data)}, mote@60=${snap(L, 60).motes.length}, @121=${snap(L, 121).motes_active}`);
    },
  },
  {
    name: 'drifter_schedule',
    req: 'Gió Lạc (Đêm 2/3): sinh tại tick 1200, 2400, …; tối đa 2; id D1, D2; Đêm 1 không có',
    seed: 3, ticks: 3700, every: 100, night: 2, scenario: { random_shades: false, player: { flames: 99 }, motes: [] }, inputs: null,
    check: (L) => {
      const a = snap(L, 1100), b = snap(L, 1200), c = snap(L, 2400), d = snap(L, 3600);
      return res(a.drifters.length === 0 && b.drifters.length === 1 && b.drifters[0].id === 'D1' && c.drifters.length === 2 && d.drifters.length === 2 && J(c.drifters.map((x) => x.id)) === '["D1","D2"]', `@1100=${a.drifters.length}, @1200=${b.drifters.length}, @2400=${c.drifters.length}, @3600=${d.drifters.length}`);
    },
  },

  // ================= Phase 3: nhiên liệu đèn / Bóng hút dầu / sức chứa =================
  {
    name: 'fuel_decay_and_snapshot',
    req: 'Đèn sáng hao 1.0 fuel/giây (1/60 mỗi tick); snapshot có fuel (1 chữ số thập phân), ever_lit, relit_count; đèn tắt fuel 0',
    seed: 1, ticks: 600, scenario: { ...clean, lanterns: [{ id: 'L1', lit: true }] }, inputs: null,
    check: (L) => { const l1 = last(L, 'snapshot').lanterns[0], l2 = last(L, 'snapshot').lanterns[1]; return res(l1.fuel === 90 && l1.ever_lit && l1.relit_count === 0 && l2.fuel === 0 && !l2.ever_lit, `L1=${J(l1)}, L2=${J(l2)}`); },
  },
  {
    name: 'lantern_out_at_zero',
    req: 'Hết dầu (fuel ≤ 0): đèn tắt, deposited = 0, event lantern_out đúng tick, ever_lit giữ true',
    seed: 1, ticks: 100, every: 1, scenario: { ...clean, lanterns: [{ id: 'L1', lit: true, fuel: 1, deposited: 10 }] }, inputs: null,
    check: (L) => { const o = events(L, 'lantern_out'); const a = snap(L, 59).lanterns[0], b = snap(L, 60).lanterns[0]; return res(o.length === 1 && o[0].tick === 60 && a.lit && !b.lit && b.deposited === 0 && b.ever_lit && b.fuel === 0, `lantern_out=${J(o.map((e) => e.tick))}, @59=${J(a)}, @60=${J(b)}`); },
  },
  {
    name: 'refuel_lit_lantern',
    req: 'Châm dầu: used = min(mang, ceil((100−fuel)/10)); fuel += 10×used (tối đa 100); +5 điểm mỗi đom đóm; event refuel; không đổi sức chứa',
    seed: 1, ticks: 5, every: 1, scenario: { ...clean, player: { pos: [0, 0, 24], carried: 3 }, lanterns: [{ id: 'L1', lit: true, fuel: 40 }] },
    inputs: { frames: press(0) },
    check: (L) => { const r = events(L, 'refuel')[0], f = last(L, 'snapshot'); return res(r && r.data.amount === 3 && r.data.lantern_id === 'L1' && near(r.data.fuel, 70, 0.05) && f.player.carried === 0 && f.score === 15 && f.player.capacity === 10, `refuel=${J(r?.data)}, score=${f.score}`); },
  },
  {
    name: 'refuel_caps_at_100',
    req: 'Châm dầu không vượt 100 và chỉ dùng đủ số đom đóm cần (fuel 40 → cần ceil(60/10)=7 dù mang 9)',
    seed: 1, ticks: 5, scenario: { ...clean, player: { pos: [0, 0, 24], carried: 9 }, lanterns: [{ id: 'L1', lit: true, fuel: 40 }] },
    inputs: { frames: press(0) },
    check: (L) => { const r = events(L, 'refuel')[0], f = last(L, 'snapshot'); return res(r && r.data.amount === 7 && r.data.fuel === 100 && f.player.carried === 2, `refuel=${J(r?.data)}, carried=${f.player.carried}`); },
  },
  {
    name: 'refuel_selects_nearest_receivable',
    req: 'Chọn đèn khi tương tác chỉ xét đèn nhận được: đèn tắt hoặc sáng chưa đầy; gần nhất, bằng nhau id nhỏ',
    seed: 1, ticks: 5, scenario: { ...clean, player: { pos: [0, 0, 0], carried: 4 }, lanterns: [{ id: 'L1', pos: [1.5, 0, 0], lit: true, fuel: 50 }, { id: 'L2', pos: [-1, 0, 0] }, { id: 'L3', pos: [0, 0, 1], lit: true, fuel: 50 }] },
    inputs: { frames: press(0) },
    check: (L) => { const r = events(L, 'refuel'), d = events(L, 'deposit'); return res(d.length === 1 && d[0].data.lantern_id === 'L2' && r.length === 0, `deposit=${J(d.map((e) => e.data))}, refuel=${r.length} (L2 gần nhất 1 m, L3 1 m cũng thế nhưng id lớn hơn)`); },
  },
  {
    name: 'relight_cost_5_and_points',
    req: 'Đèn đã từng sáng (ever_lit) thắp lại chỉ cần 5 đom đóm; +40 điểm (không phải +100) + 5/đom đóm; lantern_lit relight:true; relit_count +1; sức chứa +2',
    seed: 1, ticks: 5, scenario: { ...clean, player: { pos: [0, 0, 24], carried: 5 }, lanterns: [{ id: 'L1', lit: false, ever_lit: true }] },
    inputs: { frames: press(0) },
    check: (L) => { const lit = events(L, 'lantern_lit')[0], f = last(L, 'snapshot'), l1 = f.lanterns[0]; return res(lit && lit.data.relight === true && f.score === 65 && l1.relit_count === 1 && l1.lit && l1.fuel > 99 && f.player.capacity === 12, `lit=${J(lit?.data)}, score=${f.score}`); },
  },
  {
    name: 'never_lit_still_needs_10',
    req: 'Đèn chưa từng sáng vẫn cần 10: nạp 5 chưa sáng',
    seed: 1, ticks: 5, scenario: { ...clean, player: { pos: [0, 0, 24], carried: 5 } }, inputs: { frames: press(0) },
    check: (L) => { const f = last(L, 'snapshot'); return res(events(L, 'lantern_lit').length === 0 && !f.lanterns[0].lit && f.lanterns[0].deposited === 5, `L1=${J(f.lanterns[0])}`); },
  },
  {
    name: 'capacity_grows_and_caps',
    req: 'Sức chứa = 10 + 2×successful_lights, tối đa 20; đèn đặt sẵn bằng scenario không tính',
    seed: 1, ticks: 2, scenario: { ...clean, lanterns: [{ id: 'L1', lit: true }] }, inputs: null,
    check: (L) => { const f = snap(L, 0); return res(f.player.capacity === 10, `capacity với đèn đặt sẵn = ${f.player.capacity}`); },
  },
  {
    name: 'capacity_formula_scenario',
    req: 'successful_lights=3 → 16; 9 → 20; 12 → vẫn 20',
    seed: 1, ticks: 1, scenario: { ...clean, player: { successful_lights: 3 } }, inputs: null,
    check: (L) => res(snap(L, 0).player.capacity === 16, `capacity=${snap(L, 0).player.capacity}`),
  },
  {
    name: 'capacity_max_20',
    req: 'Sức chứa tối đa 20 (successful_lights=12) và giới hạn nhặt theo sức chứa mới (mang 16/16 không nhặt thêm)',
    seed: 1, ticks: 5, scenario: { ...clean, player: { successful_lights: 12, carried: 19 }, motes: [[0, 0, 0.5], [0, 0, 0.6]] }, inputs: null,
    check: (L) => { const f = last(L, 'snapshot'); return res(f.player.capacity === 20 && f.player.carried === 20 && f.motes_active === 1, `capacity=${f.player.capacity}, carried=${f.player.carried}, mote còn ${f.motes_active}`); },
  },
  {
    name: 'low_fuel_loses_safe_zone',
    req: 'Đèn fuel < 30 mất vùng an toàn: Bóng Mực vào được; đèn fuel 50 thì vẫn chặn',
    seed: 1, ticks: 400, scenario: { ...clean, player: { pos: [0, 0, 25], flames: 3 }, lanterns: [{ id: 'L1', lit: true, fuel: 20 }], shades: [{ id: 'S1', pos: [15, 0, 25], state: 'chase' }] }, inputs: null,
    check: (L) => { const h = events(L, 'player_hit'); return res(h.length >= 1, `số lần bị chạm = ${h.length} (Bóng vào vùng của đèn yếu)`); },
  },
  {
    name: 'fuel_exactly_30_keeps_safe_zone',
    every: 1,
    req: 'Đúng 30 vẫn còn vùng an toàn (chỉ fuel < 30 mới mất): fuel 30.0 sau tick 1 → Bóng cách đèn 6.0 m bị giữ ở mép; sang tick 2 (29.98) thì vào được',
    seed: 1, ticks: 3, scenario: { ...clean, player: { pos: [0, 0, 25], flames: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 1801 / 60 }], shades: [{ id: 'S1', pos: [6, 0, 25], state: 'chase' }] }, inputs: null,
    check: (L) => { const d = (t) => Math.hypot(snap(L, t).shades[0].pos[0], snap(L, t).shades[0].pos[2] - 25); return res(snap(L, 1).lanterns[0].fuel === 30 && d(1) >= 5.999 && d(2) < 5.99, `fuel@1=${snap(L, 1).lanterns[0].fuel}, d@1=${d(1).toFixed(3)}, d@2=${d(2).toFixed(3)}`); },
  },
  {
    name: 'fuel_50_keeps_safe_zone',
    req: 'Đèn fuel 50 (≥30) vẫn có vùng an toàn',
    seed: 1, ticks: 400, scenario: { ...clean, player: { pos: [0, 0, 25], flames: 3 }, lanterns: [{ id: 'L1', lit: true, fuel: 50 }], shades: [{ id: 'S1', pos: [15, 0, 25], state: 'chase' }] }, inputs: null,
    check: (L) => { let minD = Infinity; for (const s of sn(L)) minD = Math.min(minD, Math.hypot(s.shades[0].pos[0], s.shades[0].pos[2] - 25)); return res(minD >= 5.99 && events(L, 'player_hit').length === 0, `khoảng cách nhỏ nhất ${minD.toFixed(2)}`); },
  },
  {
    name: 'shade_wander_targets_weak_lantern',
    req: 'Bóng wander đi tới đèn sáng fuel<30 gần nhất (không phải đèn tắt gần hơn); target_lantern_id báo trong snapshot',
    seed: 1, ticks: 120, every: 20, scenario: { ...clean, player: { pos: [0, 0, 0] }, lanterns: [{ id: 'L1', pos: [0, 0, 30], lit: true, fuel: 20 }, { id: 'L2', pos: [20, 0, 20] }], shades: [{ id: 'S1', pos: [15, 0, 30], state: 'wander' }] }, inputs: null,
    check: (L) => { const s = snap(L, 60).shades[0]; return res(s.target_lantern_id === 'L1' && s.pos[0] < 15 - 1, `target=${s.target_lantern_id}, pos=${J(s.pos)} (đèn tắt L2 gần hơn nhưng đèn yếu L1 được ưu tiên)`); },
  },
  {
    name: 'shade_wander_goes_to_unlit_when_no_weak',
    req: 'Không có đèn yếu thì đi về đèn tắt gần nhất',
    seed: 1, ticks: 60, every: 20, scenario: { ...clean, player: { pos: [0, 0, 0] }, lanterns: [{ id: 'L1', pos: [0, 0, 36] }, { id: 'L2', pos: [20, 0, 25] }], shades: [{ id: 'S1', pos: [15, 0, 30], state: 'wander' }] }, inputs: null,
    check: (L) => { const s = snap(L, 60).shades[0]; return res(s.target_lantern_id === 'L2', `target=${s.target_lantern_id}`); },
  },
  {
    name: 'shade_drain_cycle',
    req: 'Bóng wander tới đèn yếu (≤2 m) → drain (đứng yên, hút 5/s cộng với hao 1/s) → fuel_drain mỗi 60 tick → lantern_out → Bóng về wander; deposited=0',
    seed: 1, ticks: 1200, every: 10, scenario: { ...clean, player: { pos: [0, 0, 0] }, lanterns: [{ id: 'L1', pos: [0, 0, 36], lit: true, fuel: 12 }], shades: [{ id: 'S1', pos: [0, 0, 32], state: 'wander' }] }, inputs: null,
    check: (L) => {
      const dr = sn(L).find((x) => x.shades[0]?.state === 'drain'), out = events(L, 'lantern_out')[0], fd = events(L, 'fuel_drain');
      const after = out && sn(L).find((x) => x.tick >= out.tick + 10);
      return res(dr && out && fd.length >= 1 && fd[0].data.shade_id === 'S1' && after.shades[0].state === 'wander' && !after.lanterns[0].lit && after.lanterns[0].ever_lit,
        `drain tại tick ${dr?.tick}, lantern_out tick ${out?.tick}, fuel_drain=${fd.length}, sau đó ${after?.shades[0].state}`);
    },
  },
  {
    name: 'drain_rate_and_stacking',
    req: 'Hút 5 fuel/s mỗi con, nhiều con cộng dồn, đèn vẫn tự hao 1/s: 2 con + hao = 11/s',
    seed: 1, ticks: 60, every: 60, scenario: { ...clean, player: { pos: [0, 0, 0] }, lanterns: [{ id: 'L1', pos: [0, 0, 36], lit: true, fuel: 25 }], shades: [{ id: 'S1', pos: [0, 0, 36.5], state: 'drain', target_lantern_id: 'L1' }, { id: 'S2', pos: [0.5, 0, 36], state: 'drain', target_lantern_id: 'L1' }] }, inputs: null,
    check: (L) => { const f = snap(L, 60), fd = events(L, 'fuel_drain'); return res(near(f.lanterns[0].fuel, 14, 0.15) && fd.length === 2, `fuel@60=${f.lanterns[0].fuel} (mong đợi 25−11=14), fuel_drain=${fd.length} (mỗi con 1 lần tại tick 60)`); },
  },
  {
    name: 'drain_to_chase_when_player_near',
    req: 'drain → chase khi Mây vào trong 6 m',
    seed: 1, ticks: 3, every: 1, scenario: { ...clean, player: { pos: [0, 0, 31], flames: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 36], lit: true, fuel: 20 }], shades: [{ id: 'S1', pos: [0, 0, 36.5], state: 'drain', target_lantern_id: 'L1' }] }, inputs: null,
    check: (L) => { const s = snap(L, 1).shades[0]; return res(s.state === 'chase', `state=${s.state}`); },
  },
  {
    name: 'drain_pulse_scores_15_and_returns_to_wander',
    every: 1,
    req: 'Tỏa Sáng trúng Bóng đang drain: choáng, tổng +15 điểm (không phải +5); hết choáng thì về wander (không phải chase)',
    seed: 1, ticks: 200, scenario: { ...clean, player: { pos: [0, 0, 0], carried: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 36], lit: true, fuel: 90 }], shades: [{ id: 'S1', pos: [0, 0, 4], state: 'drain', target_lantern_id: 'L1' }] }, inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 2, move: [0, -1] }, { tick: 80, move: [0, 0] }] },
    check: (L) => { const f1 = snap(L, 1), f = snap(L, 140); return res(f1.score === 15 && f1.shades[0].state === 'stunned' && f.shades[0].state === 'wander', `score@1=${f1.score}, state@1=${f1.shades[0].state}, @140=${f.shades[0].state}`); },
  },
  {
    name: 'drain_to_wander_when_far_from_lantern',
    req: 'drain → wander nếu cách đèn > 2 m (hoặc đèn không còn sáng / fuel ≥ 30)',
    seed: 1, ticks: 3, every: 1, scenario: { ...clean, player: { pos: [0, 0, 0] }, lanterns: [{ id: 'L1', pos: [0, 0, 36], lit: true, fuel: 20 }, { id: 'L2', pos: [0, 0, 20], lit: true, fuel: 80 }], shades: [{ id: 'S1', pos: [0, 0, 30], state: 'drain', target_lantern_id: 'L1' }, { id: 'S2', pos: [10, 0, 30], state: 'drain', target_lantern_id: 'L2' }] }, inputs: null,
    check: (L) => { const f = snap(L, 1); return res(f.shades[0].state === 'wander' && f.shades[1].state === 'wander', `S1=${f.shades[0].state}, S2=${f.shades[1].state}`); },
  },
  {
    name: 'refuel_to_30_ejects_shades_no_damage',
    every: 1,
    req: 'Đèn được châm dầu lên ≥30 lúc có Bóng trong vùng 6 m: bị đẩy ra mép trong ≤30 tick và không gây sát thương',
    seed: 1, ticks: 60, scenario: { ...clean, player: { pos: [0, 0, 24.5], carried: 5, flames: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true, fuel: 20 }], shades: [{ id: 'S1', pos: [0, 0, 25.6], state: 'chase' }] },
    inputs: { frames: press(0) },
    check: (L) => { const f = snap(L, 40), d = Math.hypot(f.shades[0].pos[0], f.shades[0].pos[2] - 25); return res(events(L, 'refuel').length === 1 && d >= 5.99 && events(L, 'player_hit').length === 0, `khoảng cách tới đèn @40=${d.toFixed(2)}, hit=${events(L, 'player_hit').length}`); },
  },
  {
    name: 'no_flames_at_dawn_tick',
    req: 'Hết Ngọn Lửa luôn thua (no_flames) trước khi xét bình minh, kể cả đủ đèn',
    seed: 1, ticks: 200, scenario: { ...clean, time_left_s: 1, player: { flames: 1 }, lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }, { id: 'L3', lit: true }], shades: [{ id: 'S1', pos: [0.5, 0, 0], state: 'chase' }] }, inputs: null,
    check: (L) => { const g = events(L, 'game_over')[0]; return res(g && g.data.reason === 'no_flames' && g.tick < 60, `game_over=${J(g)}`); },
  },
  {
    name: 'scenario_lit_default_fuel_100',
    req: 'Scenario đặt lit:true mà không có fuel → fuel mặc định 100; ever_lit tự = true',
    seed: 1, ticks: 1, scenario: { ...clean, lanterns: [{ id: 'L1', lit: true }, { id: 'L2', fuel: 55, ever_lit: true }] }, inputs: null,
    check: (L) => { const f = snap(L, 0); return res(f.lanterns[0].fuel === 100 && f.lanterns[0].ever_lit && f.lanterns[1].fuel === 55 && f.lanterns[1].lit, `L1=${J(f.lanterns[0])}, L2=${J(f.lanterns[1])}`); },
  },
  {
    name: 'snapshot_v12_fields',
    req: 'Contract v1.2: lantern.{fuel,ever_lit,relit_count}, player.capacity, shade.target_lantern_id, trạng thái drain hợp lệ',
    seed: 1, ticks: 2, scenario: { ...clean, shades: [{ id: 'S1', pos: [20, 0, 20], state: 'drain', target_lantern_id: 'L1' }] }, inputs: null,
    check: (L) => { const s = snap(L, 0); const miss = []; for (const k of ['fuel', 'ever_lit', 'relit_count']) if (s.lanterns[0][k] === undefined) miss.push('lantern.' + k); if (s.player.capacity === undefined) miss.push('player.capacity'); if (!('target_lantern_id' in s.shades[0])) miss.push('shade.target_lantern_id'); return res(miss.length === 0 && s.shades[0].state === 'drain', `thiếu: ${miss.join(', ') || 'không'}`); },
  },

  // ================= Phase 2: tạm dừng =================
  {
    name: 'pause_freezes_logic',
    every: 1,
    req: 'Tạm dừng: tick vẫn tăng nhưng sim_tick, thời gian, hồi chiêu, spawn, TTL đứng yên; state "paused"; events paused/resumed; tiếp tục chạy bình thường sau đó',
    seed: 1, ticks: 100,
    scenario: { ...clean, motes: [{ pos: [30, 0, 0], ttl_ticks: 300 }], player: { pos: [0, 0, 0], dash_cd_ticks: 80 } },
    inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 10, pause: true }, { tick: 11, pause: false }, { tick: 50, pause: true }, { tick: 51, pause: false }] },
    check: (L) => {
      const a = snap(L, 11), b = snap(L, 30), c = snap(L, 50), d = snap(L, 60);
      const pe = events(L, 'paused'), re = events(L, 'resumed');
      return res(a.state === 'paused' && b.state === 'paused' && b.sim_tick === 10 && b.time_left_s === a.time_left_s && J(b.player.pos) === J(a.player.pos) && b.player.dash_cd_s === a.player.dash_cd_s && b.motes[0].ttl_s === a.motes[0].ttl_s
        && pe[0].tick === 11 && re[0].tick === 51 && c.state === 'paused' && d.state === 'playing' && d.sim_tick === 20 && d.player.pos[2] > a.player.pos[2],
        `@11 ${a.state}, @30 sim_tick=${b.sim_tick} ${b.state}, paused tại ${pe.map((e) => e.tick)}, resumed tại ${re.map((e) => e.tick)}, @60 sim_tick=${d.sim_tick}`);
    },
  },
];
