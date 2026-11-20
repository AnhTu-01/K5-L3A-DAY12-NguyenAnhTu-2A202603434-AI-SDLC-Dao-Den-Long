# Hồi quy Phase 1 với số chuẩn v1.1
DoD: "Mọi test ẩn Phase 1 vẫn đạt khi chạy với số chuẩn". Test Phase 1 của tôi được **giữ nguyên ý nghĩa**, chỉ đổi con số khi số chuẩn đổi. Không test nào bị xóa hay làm yếu đi. Các case được gắn `[P1→v1.1]` trong `tests/cases.js`.

| Case | Thay đổi | Lý do (theo TICKET-02) |
|---|---|---|
| carry_capacity | 5 → 10 | Sức chứa chuẩn 10 |
| deposit_and_light, deposit_partial | Đèn tốn 10 (trước 3); điểm +10/đom đóm **nạp** + 100/đèn | Chi phí thắp 10; "+10 mỗi đom đóm nạp" |
| pickup_mote | Nhặt không còn cộng điểm; đo ở tick 40 (≤1.0 m) | Điểm tính khi nạp; pickup_radius 1.0 |
| interact_out_of_range | Bán kính 2.5 → 2.0 (thử 2.5 m: từ chối; 2.0 m: nhận) | interact_radius chuẩn 2.0 |
| shade_chases_and_hits | Tốc độ 4.0; rơi floor(4/2)=2 | shade_speed chuẩn; luật rơi giữ nguyên |
| invulnerability_window | Bất tử 90 tick (trước 1.5 s = 90 tick) | Cùng giá trị, nay tính bằng tick |
| pulse_* | Chi phí 3, bán kính 5, choáng 120 tick, đẩy 4 m (trong 15 tick), hồi 180 tick, +5 điểm | Số chuẩn Tỏa Sáng |
| safe_radius | 4 → 6 m; thêm kiểm tra Bóng ở trong lúc thắp | Vùng an toàn chuẩn |
| win_all_lit | Điểm = 100 + 100 + 2×giây + 50×lửa | Điểm chuẩn hóa |
| random_world | Đom đóm 20 tại 20 điểm khác nhau; Bóng sinh tick 300 (2 con) thay vì 6 s | Lịch sinh chuẩn |
| Vị trí 5 đèn | Từ vòng bán kính 25 → tọa độ chuẩn Đêm 1 | Bản đồ chuẩn |
| Rơi khỏi đảo | Phase 1 chặn bằng tường vô hình; nay Y<−10 rơi thật | `fall_enabled: true` chuẩn |
| Đom đóm rơi do bị đánh | Nay có TTL 480 tick và nằm vành 1.5–2.5 m | Luật mới |

Các hành vi **không đổi**: chuẩn hóa vector di chuyển, công thức camera, nhảy, kích hoạt theo cạnh false→true, tick/snapshot/sự kiện (thêm `night_start` ở tick 0 theo contract v1.1), tất định, mã thoát 2 cho đầu vào sai.
