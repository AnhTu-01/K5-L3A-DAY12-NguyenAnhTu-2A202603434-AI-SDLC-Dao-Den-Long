# Spec Phase 2 — "Ba hòn đảo" (TICKET-02, Contract v1.1)

Mỗi mục có **tiêu chí chấp nhận (AC)** kiểm được. Cột "Kiểm bằng" trỏ tới kịch bản headless trong `tests/cases.js` (chạy bằng `npm test`; bằng chứng ở `docs/proof/phase2/RESULTS.md`) hoặc ghi **GUI** nếu chỉ kiểm được khi chơi (ghi kết quả thật ở `docs/proof/phase2/GUI.md`).

## 1. Số liệu chuẩn (Phần 1)
| AC | Kiểm bằng |
|---|---|
| Mọi hằng số trong `src/tuning.js` = số chuẩn; `game.contract.json` khớp, `contract_version` = "1.1" | `tests/contract.test.js` |
| Chạy 6 m/s, chuẩn hóa chéo, góc camera | `move_forward`, `move_diagonal_normalized`, `camera_yaw` |
| Nhảy 7 m/s, g=−20, không nhảy trên không | `jump` |
| Sức chứa 10, nhặt ≤1.0 m XZ và chênh cao ≤1.5 m | `carry_capacity`, `pickup_mote`, `pickup_height_tolerance` |
| Đèn: 10 đom đóm, nạp nhiều lần, đèn nhớ tiến độ, bán kính 2.0, chọn đèn gần nhất/id nhỏ | `deposit_*`, `interact_*` |
| Vùng an toàn 6 m chặn Bóng ngoài; Bóng ở trong lúc đèn vừa thắp bị đẩy ra ≤30 tick và không gây sát thương | `safe_radius`, `safe_zone_ejects_inside_shade` |
| Tỏa Sáng 3 đom đóm / 5 m 3D từ chân+0.8 / hồi 3 s; choáng 120 tick; đẩy 4 m trong 15 tick; dừng khi gặp vật cản; làm mới; +5 điểm mỗi con mỗi lần | `pulse_*`, `stun_wears_off`, `knockback_stops_at_wall` |
| Bóng Mực 4.0 m/s (Đêm 3: 4.5), phát hiện 12 / bỏ đuổi 18, chạm ≤1.0 m + chênh cao ≤1.5, tối đa 1 hit/tick, recoil 2 m/60 tick, bất tử không bị trừ | `shade_*`, `invulnerable_shade_touch_noop`, `invulnerability_window` |
| Bị đánh: −1 lửa, rơi floor(carried/2) quanh Mây (r 1.5–2.5, tồn tại 480 tick), bất tử 90 tick | `shade_recoil_after_hit`, `shade_chases_and_hits`, `mote_expiry_ttl` |
| Rơi (Y<−10): đúng 1 lần, bỏ qua bất tử, mất hết đom đóm, chờ 60 tick không bị chạm, hồi sinh bất tử 90 tick; hết lửa thì thua ngay | `fall_*` |
| Thắng/thua đúng thứ tự (no_flames > thắng kể cả đúng tick hết giờ > dawn); điểm chuẩn | `win_*`, `no_flames_beats_win`, `lose_*` |
| Thứ tự tick bắt buộc (pause trước, đếm giảm, di chuyển, nhặt, tương tác, an toàn, Tỏa Sáng, di chuyển địch, chạm, sinh, thắng/thua, snapshot) | cài đặt `step()` trong `src/sim.js` (bước đánh số 1–12) + các case ở trên |

## 2. Bản đồ chuẩn (Phần 2)
| AC | Kiểm bằng |
|---|---|
| Đêm 1: tọa độ 5 đèn, 24 điểm đom đóm (20 điểm khác nhau lúc đầu), Bóng sinh tick 300 ×2 rồi mỗi 480 tick, tối đa 6 | `maps_night1_standard`, `random_world_night1`, `shade_schedule_night1`, `shade_cap_night1`, `mote_respawn_schedule` |
| Đêm 2: hai đảo r=28, cầu tre không lan can, 6 đèn, bục nhảy bắn sang đảo kia (đáp trong ≈1.4 s), Bóng mỗi 7 s tối đa 8 | `maps_night2_standard`, `bridge_walkable_no_rail`, `jump_pad_night2`, `jump_pad_return`, `shade_schedule_night2_night3` |
| Đêm 3: 3 tầng, vách đứng, 2 dốc 3 m, bục nhảy lên tầng 2, tháp không leo được, 7 đèn (Y 0/3/6), Bóng mỗi 6 s tối đa 10 | `maps_night3_standard`, `night3_*`, `shade_schedule_night3` |
| Gió mạnh Đêm 3: mỗi 30 s một cơn kéo dài 5 s, hướng ngẫu nhiên, đẩy 2 m/s, báo trước 2 s (cờ `wind.warning`; GUI: lá bay + âm thanh) | `wind_gust_night3`, `wind_disabled`; GUI |

## 3. Tính năng mới (Phần 3) — AC theo từng mục
**Lướt (14 m/s, 12 tick, hồi 90 tick từ lúc bắt đầu)**
- AC-D1 Hướng = hướng đang di chuyển; đứng yên thì hướng đang quay mặt. → `dash_direction_follows_move`, `dash_basic`
- AC-D2 Trong hồi chiêu bấm lại bị bỏ qua; sau 90 tick lướt lại được. → `dash_basic`
- AC-D3 Lướt trên không giữ nguyên độ cao; không bất tử. → `dash_air_keeps_height`
- AC-D4 Lướt trên không khi đang bị bục nhảy bắn vẫn được. → `jump_pad_return`

**Gió Lạc (idle → chase → flee → removed)**
- AC-G1 Sinh tick 1200, 2400…, tối đa 2, id D1, D2…; chỉ Đêm 2–3. → `drifter_schedule`
- AC-G2 idle→chase khi mang ≥5 và ≤15 m; mất điều kiện về idle. → `drifter_steals`, `drifter_idle_below_threshold`
- AC-G3 Chạm ≤1.2 m cướp min(3, đang mang), chỉ 1 lần, flee 240 tick rồi biến mất cùng số đã cướp. → `drifter_steals`
- AC-G4 Tỏa Sáng trúng lúc chase → flee, không cướp. → `drifter_pulse_while_chase`
- AC-G5 Tỏa Sáng trúng lúc flee có mang đồ → thả lại toàn bộ thành đom đóm rơi, biến mất sau 120 tick. → `drifter_pulse_drops_stolen`
- AC-G6 Không làm mất Ngọn Lửa; bất tử không ngăn cướp; vùng an toàn không chặn. → `drifter_steals`, `drifter_steals_through_invuln`

**Bùa Gió (C1, C2)**
- AC-B1 Nhặt theo luật đom đóm; hiệu lực 600 tick, nhặt lại làm mới. → `charm_pickup_speed_dash`, `charm_refresh`
- AC-B2 Chạy 7.2 m/s; Lướt không hồi chiêu nhưng vẫn cần bấm lại, bấm khi đang lướt bị bỏ qua, lướt vẫn 14 m/s trong 12 tick. → `charm_pickup_speed_dash`
- AC-B3 Xuất hiện lại sau 2700 tick. → `charm_respawn`

**Chuỗi 3 Đêm** (chỉ GUI) — AC-N1 Menu → giới thiệu Đêm (tên đảo + lời Ông Đăng) → chơi → kết quả → Đêm kế; AC-N2 thắng Đêm 3 hiện màn Bình Minh với tổng điểm = tổng điểm các Đêm đã thắng; AC-N3 thua thì chơi lại đúng Đêm đó.

**Tạm dừng** — AC-P1 Esc/P dừng hoàn toàn logic (tick tường vẫn tăng, `sim_tick`, thời gian, hồi chiêu, spawn, TTL đứng yên, state "paused"). → `pause_freezes_logic`. AC-P2 Menu tạm dừng có Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu (GUI).

**Cài đặt** (GUI) — AC-S1 âm lượng và độ nhạy chuột chỉnh được; AC-S2 giữ nguyên sau khi tải lại trang (localStorage, có try/catch).

**Âm thanh** (GUI) — AC-A1 nhạc nền đêm; AC-A2 có hiệu ứng cho: nhặt, thắp đèn, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s cuối; AC-A3 tắt được bằng âm lượng 0.

**HUD** (GUI) — AC-H1 Ngọn Lửa (trên trái); AC-H2 mm:ss (trên giữa) đỏ + nhấp nháy khi ≤30 s; AC-H3 đèn k/n và điểm (trên phải); AC-H4 thanh 10 ô đom đóm (dưới giữa); AC-H5 biểu tượng hồi chiêu Lướt và Tỏa Sáng (dưới phải); AC-H6 nhắc "E — Nạp ánh sáng (x/10)" khi ở gần đèn; AC-H7 mũi tên chỉ tới đèn chưa sáng gần nhất khi đèn ngoài màn hình.

**Bảng màu** (GUI) — AC-C1 các thành phần trong bảng màu chuẩn dùng đúng hex (sai lệch ≤10%/kênh) — tập trung ở `web/palette.js`; AC-C2 cường độ ánh sáng môi trường = 0.15 + 0.55 × (đèn sáng/tổng đèn).

**Hiệu năng** — AC-F1 headless một Đêm đầy đủ ≤30 s (`tests/headless.test.js`, thực đo ≈1 s); AC-F2 bản chơi ≥30 FPS trung bình ở 1280×720 (GUI: đo thật, ghi vào GUI.md).
