# Giả định Phase 3 (chỗ TICKET-03 còn mơ hồ)
| # | Chỗ mơ hồ | Giả định | Lý do |
|---|---|---|---|
| 1 | Tốc độ Bóng `wander` đi tới đèn | 2 m/s (cùng tốc độ lang thang Phase 2) | Ticket không nêu |
| 2 | "đi về đèn tắt gần nhất như trước" | Phase 2 của tôi chỉ lang thang ngẫu nhiên; nay wander đi tới đèn tắt gần nhất, hết đèn tắt mới lang thang | Làm theo ticket |
| 3 | Ưu tiên khi drain thỏa cả `chase` và `wander` | `chase` (Mây ≤6 m, XZ) trước | Thứ tự liệt kê trong ticket |
| 4 | Khi chọn đèn để châm: đèn tắt vs. sáng chưa đầy | Gộp, chọn gần nhất; đèn tắt nhận `deposit`, đèn sáng nhận `refuel` | Ticket: "đèn nhận được" |
| 5 | Scenario `lanterns[].fuel` không kèm `lit` | `fuel>0` ⇒ `lit:true`; `lit:true` không `fuel` ⇒ 100 | Ticket chỉ nêu trường hợp sau |
| 6 | `ever_lit` trong scenario | Mặc định `true` nếu đèn đặt `lit:true`/`fuel>0`, ngược lại `false` | Đèn đã sáng thì đã từng sáng |
| 7 | `deposited` khi đèn đang sáng | Giữ giá trị lúc thắp (10 hoặc 5), về 0 khi tắt | Ticket: "deposited = 0" khi hết dầu |
| 8 | `fuel_drain` | Mỗi Bóng một event mỗi 60 tick kể từ lúc bắt đầu hút (tick thứ 60, 120…) | "ghi mỗi 60 tick khi đang hút" |
| 9 | Hút lên đèn của nhiều Bóng ở tick đèn tắt | Đèn tắt ở bước ngay sau bước 2; Bóng về `wander` ở bước di chuyển cùng tick | Thứ tự trong ticket |
| 10 | Điểm Tỏa Sáng drain | Tổng +15 (không +5+15) | "Tổng +15" |
| 11 | Đèn đầy dầu | fuel hao ở bước 2 trước tương tác, nên đèn vừa đầy tick này tick sau không còn đầy | Hệ quả thứ tự tick |
