# Hồi quy Phase 1–2 với luật Phase 3 (không test nào bị skip; mỗi thay đổi có lý do)
| Case (tests/cases.js) | Thay đổi | Lý do (TICKET-03) |
|---|---|---|
| `win_all_lit` | **Thay thế** bằng `no_early_win` (đủ đèn mà còn giờ → game tiếp tục) | "Không còn thắng sớm" |
| `win_on_timeout_tick` | **Thay thế** bằng `win_dawn_survived`, `dawn_threshold_*`, `no_flames_at_dawn_tick` | Thắng chỉ ở bình minh; ngưỡng 3/5, 4/6, 5/7 |
| `deposit_and_light` | Điểm 200 → 150; thêm kiểm tra relight:false, fuel 100, sức chứa 12 | +5/đom đóm nạp, +100 thắp đầu, sức chứa tăng dần |
| `deposit_partial` | Điểm 10 → 5 | +5/đom đóm nạp |
| `tick_model`, `maps_night*_standard` | Thời lượng 300/330/360 → 240/270/300 | Thời gian Đêm mới |
| `shade_cap_night1` | Chạy 18.000 → 14.400 tick (một Đêm) | Đêm 1 = 240 s |
| `contract.test.js` | Số chuẩn mới + khóa tuning mới; `per_second_left=0` | Contract v1.2 |
| Các case còn lại (di chuyển, lướt, Bùa Gió, bục nhảy, rơi, Gió Lạc, gió, tạm dừng, Bóng Mực, Tỏa Sáng +5…) | **Không đổi** | Luật không bị ticket thay thế |
Đã chạy lại toàn bộ: `npm test` xanh (108+ test); các case gắn nhãn `[P2→v1.2]` trong `tests/cases.js` là những case trên.
