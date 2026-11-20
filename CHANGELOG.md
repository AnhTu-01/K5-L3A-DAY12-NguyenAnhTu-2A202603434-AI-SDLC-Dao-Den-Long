# Changelog

## Phase 3 — Contract v1.2 "Đèn cạn dầu" (BREAKING)
Thay đổi phá vỡ tương thích so với Phase 2 (v1.1):
- **Thắng:** không còn thắng sớm khi đủ đèn. Thắng = sống tới hết giờ với ≥ ceil(0.6×đèn) đèn sáng; `game_over.reason`: `dawn_survived` (thắng), `dawn` / `no_flames` (thua). `all_lit` **không còn phát**.
- **Thời lượng Đêm:** 300/330/360 s → **240/270/300 s** (`night*_duration_s`).
- **Đèn:** có nhiên liệu (`fuel` 0–100, hao 1/s). Hết dầu → tắt, `deposited=0`, event `lantern_out`. Đèn sáng nhận đom đóm để châm dầu (`refuel`) — trước đây không nhận. Thắp lại (đã từng sáng) tốn **5** thay vì 10.
- **Vùng an toàn:** mất khi `fuel < 30` (trước: luôn có khi đèn sáng). Bóng Mực có thể vào vùng của đèn yếu.
- **Bóng Mực:** thêm trạng thái `drain` (hút 5 fuel/s). `wander` đi tới đèn yếu/đèn tắt thay vì lang thang. Hết choáng/hết spawning → `wander` (trước: `chase`).
- **Sức chứa:** cố định 10 → `10 + 2×successful_lights` (tối đa 20).
- **Điểm:** +5/đom đóm nạp (trước +10); +100 thắp đầu, +40 thắp lại; Tỏa Sáng +5 (+15 nếu đang drain); thưởng bình minh `50+floor(fuel)` mỗi đèn sáng + 50/Ngọn Lửa; **bỏ** thưởng thời gian (`per_second_left=0`).
- **Contract:** `contract_version "1.2"`; tuning thêm `fuel_max, fuel_decay_per_s, fuel_per_mote, relight_cost, win_ratio, drain_per_s, low_fuel_threshold, capacity_max`; snapshot thêm `lanterns[].{fuel,ever_lit,relit_count}`, `player.capacity`, `shades[].target_lantern_id`; scenario thêm `lanterns[].{fuel,ever_lit}`, `player.successful_lights`, `shades[].target_lantern_id`; event mới `refuel`, `lantern_out`, `fuel_drain`; `lantern_lit.relight`.
- **Giao diện:** thanh dầu trên đèn, nhấp nháy 1 Hz khi fuel<30, HUD sức chứa x/cap, chế độ "Bảng màu dễ phân biệt" (lưu được).

## Phase 2 — Contract v1.1 "Ba hòn đảo"
Số liệu chuẩn, 3 bản đồ, lướt, Gió Lạc, Bùa Gió, gió, tạm dừng, rơi đảo.

## Phase 1 — Contract v1.0
Đêm 1, lõi headless, game 3D.
