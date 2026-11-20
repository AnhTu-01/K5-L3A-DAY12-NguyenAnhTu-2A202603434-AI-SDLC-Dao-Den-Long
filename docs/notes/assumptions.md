# Giả định Phase 1 (chỗ PRD-0 còn mơ hồ)

Các con số nằm ở `src/tuning.js` (khai trong `game.contract.json`). Phần còn lại là hằng số `WORLD`.

| # | Chỗ mơ hồ | Giả định của tôi | Lý do |
|---|---|---|---|
| 1 | "Ánh sáng" tốn khi tỏa sáng | Tốn `pulse_cost`=1 đom đóm đang mang; không đủ thì không tỏa sáng được (không có event) | Đom đóm là tài nguyên ánh sáng duy nhất trong PRD |
| 2 | Nạp đèn | Nhấn interact trong `interact_radius`: nạp tối đa phần còn thiếu (`lantern_cost`=3) từ đom đóm đang mang vào đèn chưa sáng gần nhất; đủ thì sáng | PRD: "nạp ánh sáng vào đèn để thắp" |
| 3 | `safe_radius` áp dụng cho đèn nào | Chỉ **đèn đã sáng**; Bóng Mực bị đẩy ra khỏi vòng | "Bóng Mực sợ những chiếc đèn" + đèn sáng mới có ánh sáng |
| 4 | Bóng Mực bị chạm/choáng | Choáng `pulse_stun_s`=3s (đứng yên, không gây sát thương), bị đẩy `pulse_push_m`=3m ra xa người chơi, sau đó đuổi lại | Contract có `pulse_stun_s`, `pulse_push_m` |
| 5 | Mất máu | Máu = số "ngọn lửa" (`flames`=3). Bị chạm: −1 lửa, bất tử `invuln_s`=1.5s, rơi `floor(carried × hit_drop_ratio)` đom đóm (đặt lại thành đom đóm trên mặt đất, vòng bán kính 2.5m) | Contract có `flames`, `invuln_s`, `hit_drop_ratio` |
| 6 | Rơi khỏi đảo | `fall_enabled=false`: mép đảo (bán kính 40m) là tường vô hình, không bị phạt | Giữ Phase 1 gọn; khai `false` đúng contract |
| 7 | Vị trí 5 đèn | Vòng tròn bán kính 25m quanh tâm, L1 tại (0,0,25), các đèn cách đều 72° | Khớp ví dụ scenario (L1 ở (0,0,25)) |
| 8 | Thế giới ngẫu nhiên | 20 đom đóm ngẫu nhiên (bán kính ≤36m); mỗi 4s thêm 1 nếu <20. Bóng Mực đầu tiên ở 6s, rồi mỗi 12s, tối đa 4, xuất hiện ở mép đảo (bán kính 38m) | Ví dụ snapshot trong contract có ~19–20 đom đóm |
| 9 | Điểm | +10/đom đóm nhặt, +100/đèn thắp, +25/Bóng Mực bị choáng, khi thắng: +1/giây còn lại (làm tròn xuống) và +50/ngọn lửa còn | Contract có `score.*`; thưởng chỉ khi thắng |
| 10 | Thứ tự trong một bước | di chuyển → nhặt đom đóm → nạp đèn → tỏa sáng → Bóng Mực di chuyển/chạm → sinh ngẫu nhiên → kiểm tra thắng/thua (thắng ưu tiên hơn thua) | Cần thứ tự cố định để tất định |
| 11 | Snapshot cuối | Thêm 1 snapshot ở tick cuối nếu tick đó không chia hết cho `--snapshot-every` | Để người đọc luôn thấy trạng thái cuối |
| 12 | Nhảy | Có nhảy (độ cao ~1.2m), chỉ hiển thị; khoảng cách tính trên mặt phẳng XZ nên nhảy không né được Bóng Mực | Contract: đo khoảng cách theo XZ |
| 13 | Bóng Mực chạm khi đang choáng | Không gây sát thương | Choáng = vô hiệu |
