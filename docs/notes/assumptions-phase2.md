# Giả định Phase 2 (chỗ TICKET-02 còn mơ hồ)
Hằng số ngoài contract nằm ở `WORLD` trong `src/tuning.js`. Nếu TA/Lab Coach làm rõ khác, sửa một chỗ rồi chạy `npm test`.

| # | Chỗ mơ hồ | Giả định | Lý do |
|---|---|---|---|
| 1 | Hệ góc | θ đo từ +X ngược chiều kim đồng hồ nhìn từ trên xuống: (x,z)=(r·cosθ, r·sinθ) | Ticket nói "từ +X, ngược chiều kim đồng hồ trên mặt XZ"; khớp tầng 1 nằm ở z>0 với các góc 20°–160° |
| 2 | Vị trí xuất phát Đêm 2, 3 | Đêm 2: (0,0,0); Đêm 3: (0,0,−30) | Tâm đảo Đêm 3 là tầng 2 + tháp nên không thể đặt Mây ở (0,0,0) |
| 3 | Bóng Mực: `spawning`, `wander` | spawning 30 tick (đứng yên, vô hại, vẫn bị Tỏa Sáng); wander 2 m/s đổi hướng ngẫu nhiên mỗi 120 tick; phát hiện/bỏ đuổi đo trên mặt XZ | Ticket chỉ nêu tên trạng thái và ngưỡng 12/18 m |
| 4 | Trạng thái mặc định của Bóng trong scenario | `chase` nếu không ghi `state` | Giữ hành vi Phase 1 (Bóng trong scenario đuổi ngay) |
| 5 | Độ cao Bóng Mực | `pos[1]` = mặt đất dưới chân; tâm 3D của Bóng = pos[1]+0.8 (cùng quy ước tâm Mây) để đo Tỏa Sáng; chạm so chênh cao chân–chân ≤1.5 | Ticket đo "chênh cao" nhưng không nói điểm đo |
| 6 | Bóng Mực di chuyển trên địa hình | Đi trên mặt đất, không rơi khỏi đảo, bị vách chặn (trượt theo trục), không tìm đường nên có thể kẹt dưới vách tầng | Ticket không yêu cầu tìm đường |
| 7 | Điểm sinh Bóng hợp lệ | Cách Mây ≥15 m (áp dụng cả Đêm 2–3), nằm ngoài vùng an toàn của đèn đã sáng, không trùng Bóng khác (<1 m) | Ticket nêu ≥15 m cho Đêm 1; "hết điểm hợp lệ thì bỏ lượt" |
| 8 | Tối đa đom đóm 30 | Đếm **mọi** đom đóm đang trên đảo (cả loại rơi) | Cách đọc đơn giản nhất của "trần 30" |
| 9 | Điểm sinh đom đóm 20 lúc đầu | Chọn 20 trong các điểm chuẩn bằng PRNG (xáo trộn từng phần); điểm "trống" = chưa có đom đóm gắn với điểm đó | Ticket: "20 điểm khác nhau" |
| 10 | Gió Lạc: điểm sương, lượn idle, độ cao | Điểm sương cố định mỗi Đêm (6 điểm Đêm 2, 8 điểm Đêm 3, y=2); idle lượn vòng bán kính 6 m ở 2 m/s; chase bay theo độ cao Mây+1; flee bay ra xa theo mặt phẳng XZ; không bị địa hình chặn; cướp chỉ xét XZ ≤1.2 | Ticket không nêu |
| 11 | Gió Lạc chạm khi mang 0 | Không cướp, không đổi trạng thái | "cướp min(3, đang mang)" = 0 thì chẳng có gì để cướp, và "mỗi con chỉ cướp 1 lần" |
| 12 | Gió mạnh | Cơn k bắt đầu tại sim_tick 1800·k (k≥1), kéo dài 300 tick; báo trước từ 1800·k−120; hướng rút bằng PRNG lúc bắt đầu báo trước; cộng thêm 2 m/s vào vận tốc ngang (cả khi đang bị bục bắn, đang lướt) | Ticket: "mỗi 30 s … 5 s … báo trước 2 s" |
| 13 | `player.invuln` trong snapshot | boolean (còn bất tử hay không) | Các trường hồi chiêu có hậu tố `_s` còn `invuln` thì không |
| 14 | Lướt và bục nhảy | Vận tốc phóng giữ nguyên tới khi chạm đất; lướt tạm thay vận tốc ngang rồi trả lại vận tốc phóng; lướt đóng băng chuyển động dọc rồi tiếp tục với vy cũ | Ticket: "vẫn được lướt", "giữ nguyên độ cao" |
| 15 | Bùa Gió và hồi chiêu | Lướt khi có bùa không đặt hồi chiêu (dash_cd_s giữ 0) | "Lướt không hồi chiêu" |
| 16 | Tạm dừng khi đang bật | Input `pause` false→true đảo trạng thái; tick lúc tiếp tục chạy luôn mô phỏng; các nút khác bấm trong lúc dừng bị bỏ | "xử lý pause trước; nếu vừa tạm dừng thì dừng bước" |
| 17 | `end.ticks` | Tick tường (gồm cả tick tạm dừng) | `--ticks` đếm bước chạy |
| 18 | Nhảy/leo | Bậc thềm ≤0.5 m bước lên được (để đi dốc), cao hơn là vách; mặt đứng được tính theo độ cao chân | Cần để dốc đi lên được còn mép tầng thì không |
| 19 | Vị trí đom đóm rơi do Gió Lạc thả | Tại chỗ Gió Lạc, hạ xuống mặt đất bên dưới; nếu là hư không thì rơi ở độ cao của Mây | Ticket: "tại chỗ" |
| 20 | Đom đóm rơi do ngã khỏi đảo | Mất hẳn (không rơi ra) | Ticket: "mất toàn bộ đom đóm" |
