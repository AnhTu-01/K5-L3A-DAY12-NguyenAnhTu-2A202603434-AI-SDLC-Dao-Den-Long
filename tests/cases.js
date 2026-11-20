// Các kịch bản kiểm chứng Phase 1. Dùng chung cho `npm test` và `npm run proof`.
// Mỗi case: yêu cầu (req), scenario, inputs, ticks -> check(lines) trả về {ok, detail}.
import { TUNING as T } from '../src/tuning.js';

const clean = { random_motes: false, random_shades: false, motes: [], shades: [] };
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;
const last = (lines, type) => [...lines].reverse().find((l) => l.type === type);
const events = (lines, name) => lines.filter((l) => l.type === 'event' && l.name === name);
const snap = (lines, tick) => lines.find((l) => l.type === 'snapshot' && l.tick === tick);
const res = (ok, detail) => ({ ok, detail });

export const cases = [
  {
    name: 'move_forward',
    req: 'Nhân vật đi lại: move [0,1] đi về +Z đúng tốc độ player_speed',
    seed: 1, ticks: 60,
    scenario: { ...clean },
    inputs: { frames: [{ tick: 0, move: [0, 1] }] },
    check: (L) => {
      const z = snap(L, 60).player.pos[2];
      return res(near(z, T.player_speed), `z sau 60 tick = ${z}, mong đợi ${T.player_speed}`);
    },
  },
  {
    name: 'move_diagonal_normalized',
    req: 'Vector di chuyển dài hơn 1 được chuẩn hóa về độ dài 1',
    seed: 1, ticks: 60,
    scenario: { ...clean },
    inputs: { frames: [{ tick: 0, move: [1, 1] }] },
    check: (L) => {
      const [x, , z] = snap(L, 60).player.pos;
      const d = Math.hypot(x, z);
      return res(near(d, T.player_speed, 0.02) && near(x, z, 0.01), `quãng đường = ${d.toFixed(3)} (mong đợi ${T.player_speed}), x=${x} z=${z}`);
    },
  },
  {
    name: 'camera_yaw',
    req: 'cam_yaw_deg=90 làm move [0,1] đi về +X (x\' = z·sinθ)',
    seed: 1, ticks: 60,
    scenario: { ...clean },
    inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }] },
    check: (L) => {
      const [x, , z] = snap(L, 60).player.pos;
      return res(near(x, T.player_speed) && near(z, 0, 0.02), `pos = (${x}, ${z}), mong đợi (${T.player_speed}, 0)`);
    },
  },
  {
    name: 'jump',
    req: 'Nhân vật nhảy được rồi chạm đất lại',
    seed: 1, ticks: 120,
    scenario: { ...clean },
    inputs: { frames: [{ tick: 0, jump: true }, { tick: 1, jump: false }] },
    check: (L) => {
      const maxY = Math.max(...L.filter((l) => l.type === 'snapshot').map((s) => s.player.pos[1]));
      const endY = last(L, 'snapshot').player.pos[1];
      return res(maxY > 0.5 && endY === 0, `độ cao tối đa ${maxY}, cuối ${endY}`);
    },
  },
  {
    name: 'pickup_mote',
    req: 'Nhặt đom đóm trong pickup_radius, ghi event mote_picked và cộng điểm',
    seed: 1, ticks: 120,
    scenario: { ...clean, motes: [[0, 0, 5]] },
    inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 60, move: [0, 0] }] },
    check: (L) => {
      const ev = events(L, 'mote_picked');
      const f = last(L, 'snapshot');
      return res(ev.length === 1 && ev[0].data.carried === 1 && f.score === T.score.per_mote && f.motes_active === 0,
        `mote_picked=${ev.length}, carried=${ev[0]?.data.carried}, score=${f.score}, tick sự kiện=${ev[0]?.tick}`);
    },
  },
  {
    name: 'carry_capacity',
    req: 'Không mang quá carry_capacity đom đóm',
    seed: 1, ticks: 30,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: T.carry_capacity }, motes: [[0, 0, 0.5]] },
    inputs: null,
    check: (L) => {
      const f = last(L, 'snapshot');
      return res(f.player.carried === T.carry_capacity && f.motes_active === 1 && events(L, 'mote_picked').length === 0,
        `carried=${f.player.carried}, motes còn lại=${f.motes_active}`);
    },
  },
  {
    name: 'deposit_and_light',
    req: 'Nạp đủ lantern_cost thì đèn sáng: event deposit + lantern_lit, cộng điểm per_lantern',
    seed: 1, ticks: 30,
    scenario: { ...clean, player: { pos: [0, 0, 24], carried: T.lantern_cost }, lanterns: [{ id: 'L1', pos: [0, 0, 25] }] },
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }] },
    check: (L) => {
      const d = events(L, 'deposit')[0], lit = events(L, 'lantern_lit')[0];
      const f = last(L, 'snapshot');
      return res(d && d.data.amount === T.lantern_cost && lit && lit.data.lantern_id === 'L1' && f.score === T.score.per_lantern && f.player.carried === 0,
        `deposit=${JSON.stringify(d?.data)}, lantern_lit=${lit ? lit.data.lantern_id : 'không'}, score=${f.score}`);
    },
  },
  {
    name: 'deposit_partial',
    req: 'Nạp thiếu thì đèn chưa sáng, deposited được cộng dồn',
    seed: 1, ticks: 30,
    scenario: { ...clean, player: { pos: [0, 0, 24], carried: 1 }, lanterns: [{ id: 'L1', pos: [0, 0, 25] }] },
    inputs: { frames: [{ tick: 0, interact: true }] },
    check: (L) => {
      const d = events(L, 'deposit')[0];
      const l1 = last(L, 'snapshot').lanterns.find((x) => x.id === 'L1');
      return res(d && d.data.deposited === 1 && !l1.lit && events(L, 'lantern_lit').length === 0, `deposited=${d?.data.deposited}, lit=${l1.lit}`);
    },
  },
  {
    name: 'interact_out_of_range',
    req: 'Đứng ngoài interact_radius thì không nạp được',
    seed: 1, ticks: 30,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 25] }] },
    inputs: { frames: [{ tick: 0, interact: true }] },
    check: (L) => res(events(L, 'deposit').length === 0, `số event deposit = ${events(L, 'deposit').length}`),
  },
  {
    name: 'setup_lit_no_score',
    req: 'Dựng scenario với đèn lit:true không phát sự kiện và không cộng điểm',
    seed: 1, ticks: 10,
    scenario: { ...clean, lanterns: [{ id: 'L2', lit: true }] },
    inputs: null,
    check: (L) => {
      const f = snap(L, 0), l2 = f.lanterns.find((x) => x.id === 'L2');
      return res(l2.lit && f.score === 0 && events(L, 'lantern_lit').length === 0, `L2.lit=${l2.lit}, score=${f.score}`);
    },
  },
  {
    name: 'shade_chases_and_hits',
    req: 'Bóng Mực đuổi theo, chạm thì mất 1 ngọn lửa và đánh rơi hit_drop_ratio đom đóm',
    seed: 1, ticks: 400,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 4, flames: 3 }, shades: [{ id: 'S1', pos: [10, 0, 0] }] },
    inputs: null,
    check: (L) => {
      const h = events(L, 'player_hit')[0];
      const expectedDrop = Math.floor(4 * T.hit_drop_ratio);
      return res(h && h.data.by === 'shade' && h.data.flames === 2 && h.data.dropped === expectedDrop,
        `player_hit=${JSON.stringify(h?.data)} tại tick ${h?.tick}, rơi mong đợi ${expectedDrop}`);
    },
  },
  {
    name: 'invulnerability_window',
    req: 'Sau khi bị chạm có invuln_s giây bất tử: không bị chạm liên tiếp',
    seed: 1, ticks: 300,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 0, flames: 3 }, shades: [{ id: 'S1', pos: [3, 0, 0] }] },
    inputs: null,
    check: (L) => {
      const hits = events(L, 'player_hit');
      const gap = hits.length >= 2 ? hits[1].tick - hits[0].tick : null;
      const need = Math.round(T.invuln_s * 60);
      return res(hits.length >= 2 && gap > need - 1, `số lần chạm=${hits.length}, khoảng cách giữa 2 lần=${gap} tick (tối thiểu ${need})`);
    },
  },
  {
    name: 'lose_no_flames',
    req: 'Hết ngọn lửa thì thua: game_over lost/no_flames, end.state = lost',
    seed: 1, ticks: 2000,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 0, flames: 1 }, shades: [{ id: 'S1', pos: [3, 0, 0] }] },
    inputs: null,
    check: (L) => {
      const g = events(L, 'game_over')[0], e = last(L, 'end');
      return res(g && g.data.result === 'lost' && g.data.reason === 'no_flames' && e.state === 'lost' && e.ticks < 2000,
        `game_over=${JSON.stringify(g?.data)}, end=${JSON.stringify(e)}`);
    },
  },
  {
    name: 'pulse_stuns_and_pushes',
    req: 'Tỏa sáng làm choáng Bóng Mực trong pulse_radius, đẩy lùi pulse_push_m, tốn pulse_cost, cộng per_stun',
    seed: 1, ticks: 2,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 2, flames: 3 }, shades: [{ id: 'S1', pos: [4, 0, 0] }, { id: 'S2', pos: [20, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    check: (L) => {
      const pe = events(L, 'pulse')[0], f = last(L, 'snapshot');
      const s1 = f.shades.find((s) => s.id === 'S1');
      return res(pe && JSON.stringify(pe.data.stunned_ids) === '["S1"]' && s1.state === 'stunned' && f.player.carried === 2 - T.pulse_cost && f.score === T.score.per_stun && s1.pos[0] > 4 + T.pulse_push_m - 0.2,
        `pulse=${JSON.stringify(pe?.data)}, S1=${JSON.stringify(s1)}, carried=${f.player.carried}, score=${f.score}`);
    },
  },
  {
    name: 'pulse_needs_light',
    req: 'Không đủ ánh sáng (carried < pulse_cost) thì không tỏa sáng được',
    seed: 1, ticks: 5,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 0, flames: 3 }, shades: [{ id: 'S1', pos: [4, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    check: (L) => res(events(L, 'pulse').length === 0, `số event pulse = ${events(L, 'pulse').length}`),
  },
  {
    name: 'pulse_cooldown',
    req: 'Tỏa sáng có hồi chiêu pulse_cooldown_s',
    seed: 1, ticks: 400,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 5, flames: 3 }, shades: [] },
    inputs: { frames: [
      { tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 30, pulse: true }, { tick: 31, pulse: false },
      { tick: 200, pulse: true }, { tick: 201, pulse: false } ] },
    check: (L) => {
      const ps = events(L, 'pulse');
      return res(ps.length === 2 && ps[0].tick === 1 && ps[1].tick === 201, `pulse tại tick ${ps.map((p) => p.tick).join(', ')} (lần ở tick 30 bị hồi chiêu chặn)`);
    },
  },
  {
    name: 'stun_wears_off',
    req: 'Choáng hết sau pulse_stun_s giây thì Bóng Mực đuổi lại',
    seed: 1, ticks: 300,
    scenario: { ...clean, player: { pos: [0, 0, 0], carried: 1, flames: 3 }, shades: [{ id: 'S1', pos: [4, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    check: (L) => {
      const mid = snap(L, 120).shades[0], fin = snap(L, 300).shades[0];
      return res(mid.state === 'stunned' && fin.state === 'chase', `tick 120: ${mid.state}; tick 300: ${fin.state}`);
    },
  },
  {
    name: 'safe_radius',
    req: 'Bóng Mực không vào được bán kính safe_radius quanh đèn đã thắp',
    seed: 1, ticks: 600,
    scenario: { ...clean, player: { pos: [0, 0, 25], carried: 0, flames: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 25], lit: true }], shades: [{ id: 'S1', pos: [15, 0, 25] }] },
    inputs: null,
    check: (L) => {
      let minD = Infinity;
      for (const s of L.filter((l) => l.type === 'snapshot')) {
        const sh = s.shades[0];
        minD = Math.min(minD, Math.hypot(sh.pos[0], sh.pos[2] - 25));
      }
      return res(minD >= T.safe_radius - 0.01 && events(L, 'player_hit').length === 0, `khoảng cách nhỏ nhất tới đèn = ${minD.toFixed(3)} (safe_radius ${T.safe_radius}), số lần chạm = ${events(L, 'player_hit').length}`);
    },
  },
  {
    name: 'win_all_lit',
    req: 'Thắp hết 5 đèn thì thắng: game_over won/all_lit, điểm thưởng thời gian và ngọn lửa',
    seed: 1, ticks: 30,
    scenario: { ...clean, player: { pos: [0, 0, 24], carried: 3, flames: 2 }, time_left_s: 100,
      lanterns: [{ id: 'L1', pos: [0, 0, 25] }, { id: 'L2', lit: true }, { id: 'L3', lit: true }, { id: 'L4', lit: true }, { id: 'L5', lit: true }] },
    inputs: { frames: [{ tick: 0, interact: true }] },
    check: (L) => {
      const g = events(L, 'game_over')[0], e = last(L, 'end');
      const expected = T.score.per_lantern + T.score.per_second_left * Math.floor((100 * 60 - 1) / 60) + T.score.per_flame_left * 2;
      return res(g && g.data.result === 'won' && g.data.reason === 'all_lit' && e.state === 'won' && e.ticks === 1 && e.score === expected,
        `game_over=${JSON.stringify(g?.data)}, end=${JSON.stringify(e)}, điểm mong đợi ${expected}`);
    },
  },
  {
    name: 'lose_dawn',
    req: 'Hết giờ (time_left_s) thì thua: game_over lost/dawn',
    seed: 1, ticks: 600,
    scenario: { ...clean, time_left_s: 2 },
    inputs: null,
    check: (L) => {
      const g = events(L, 'game_over')[0], e = last(L, 'end');
      return res(g && g.data.reason === 'dawn' && e.ticks === 120 && e.state === 'lost', `game_over=${JSON.stringify(g?.data)}, end=${JSON.stringify(e)}`);
    },
  },
  {
    name: 'tick_model',
    req: 'Mô hình tick: snapshot tick 0 trước input; --ticks N chạy đúng N bước; time_left_s = thời lượng − bước/60',
    seed: 1, ticks: 100,
    scenario: { ...clean, player: { pos: [0, 0, 0] } },
    inputs: { frames: [{ tick: 0, move: [0, 1] }] },
    check: (L) => {
      const s0 = snap(L, 0), e = last(L, 'end'), s100 = snap(L, 100);
      return res(s0.player.pos[2] === 0 && e.ticks === 100 && near(s100.time_left_s, T.night1_duration_s - 100 / 60, 0.001),
        `tick0 z=${s0.player.pos[2]}, end.ticks=${e.ticks}, time_left_s@100=${s100.time_left_s}`);
    },
  },
  {
    name: 'random_world_spawns',
    req: 'Chế độ ngẫu nhiên: đom đóm rải rác trên đảo, Bóng Mực xuất hiện dần (event shade_spawned)',
    seed: 7, ticks: 1200,
    scenario: null,
    inputs: null,
    check: (L) => {
      const s0 = snap(L, 0), sp = events(L, 'shade_spawned');
      return res(s0.motes_active === 20 && sp.length >= 1 && sp[0].tick === 360, `đom đóm ban đầu=${s0.motes_active}, shade_spawned đầu tiên ở tick ${sp[0]?.tick}, tổng ${sp.length}`);
    },
  },
];
