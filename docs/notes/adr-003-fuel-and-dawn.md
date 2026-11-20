# ADR-003 — Đèn có nhiên liệu và luật "sống tới bình minh" (TICKET-03)

**Trạng thái:** chấp nhận · **Ngày:** 20/11/2026 · **Thay thế:** luật "đèn sáng là xong" và "thắng ngay khi tất cả đèn sáng" của Phase 1–2.

## Bối cảnh
Người chơi giỏi thắp hết đèn trong 2 phút rồi kết thúc, hết căng thẳng. Yêu cầu: đèn thắp rồi vẫn có thể tắt; mục tiêu là giữ đảo sáng tới bình minh.

## Quyết định 1 — Mô hình trạng thái đèn
Trước: `lit: bool` + `deposited` (một chiều: tắt → sáng, không bao giờ quay lại).
Sau: mỗi đèn có `lit`, `fuelU` (số nguyên, đơn vị 1/60), `deposited` (tiến độ khi tắt), `ever_lit`, `relit_count`, `zone` (đang có vùng an toàn hay chưa; chỉ để phát hiện lúc vùng *vừa có lại*).
- **Máy trạng thái:** `off(ever_lit=false) —10 đom đóm→ lit` · `lit —fuel≤0→ off(ever_lit=true, deposited=0)` · `off(ever_lit=true) —5 đom đóm→ lit (thắp lại)` · `lit —châm dầu→ lit` (fuel tăng, tối đa 100).
- **Vì sao số nguyên 1/60:** hao 1/s = 1 đơn vị mỗi tick, hút 5/s = 5 đơn vị mỗi tick, châm 10 = 600 đơn vị. Không có sai số số thực nên `fuel ≥ 30` và "tick đèn hết dầu" xác định chính xác và tất định. Chỉ làm tròn (1 chữ số) khi xuất snapshot/event.
- **Vùng an toàn** nay là hàm của (`lit` và `fuel ≥ 30`), không còn là thuộc tính của `lit`. `zone` lưu vòng trước để biết đèn *vừa* có lại vùng (thắp hoặc châm dầu lên ≥30) và đẩy Bóng Mực ra ≤30 tick, không sát thương (dùng lại cơ chế `eject` của Phase 2).
- **Thứ tự tick:** theo Ticket-02; bước 2 thêm trừ dầu (hao + hút) rồi đèn fuel ≤ 0 tắt ngay; bước 5 xử lý tương tác (thắp/thắp lại/châm); bước 6 cập nhật vùng; bước 11 xét thắng/thua sau mọi cập nhật.

## Quyết định 2 — Luật thắng
Trước: thắng ngay khi mọi đèn sáng. Sau: **không thắng sớm**; chỉ xét ở tick hết giờ: còn Ngọn Lửa và số đèn sáng ≥ `ceil(0.6 × tổng đèn)` (3/5, 4/6, 5/7) → `won / dawn_survived`; còn lại → `lost / dawn`. Hết Ngọn Lửa ở bất kỳ tick nào (kể cả tick bình minh) → `lost / no_flames`, xét trước. `all_lit` không còn được phát ra. Thưởng thời gian bị bỏ; thưởng bình minh theo từng đèn (50 + floor(fuel)) và theo Ngọn Lửa.

## Quyết định 3 — Bóng Mực hút dầu
Thêm trạng thái `drain`. `wander` có mục tiêu: đèn sáng yếu (fuel<30) gần nhất → không có thì đèn tắt gần nhất → không có thì lang thang ngẫu nhiên (Phase 2). Chỉ `wander` chọn mục tiêu; `chase` không đổi. Tới ≤2 m đèn yếu thì `drain`: đứng yên, hút 5/s mỗi con (cộng dồn). Chuyển trạng thái: `drain→chase` (Mây ≤6 m, xét trước), `drain→stunned` (Tỏa Sáng, tổng +15), `drain→wander` (đèn tắt / fuel ≥30 / cách đèn >2 m). Hết choáng và hết `spawning` đều về `wander` (trước đây về `chase`); hết `recoil` vẫn về `chase`.

## Quyết định 4 — Sức chứa và điểm
Sức chứa = min(20, 10 + 2×lần thắp thành công), tính cả thắp lại; đèn đặt bằng scenario không tính; đặt lại mỗi Đêm (vì mỗi Đêm tạo `createGame` mới). Điểm: +5 mỗi đom đóm nạp (thắp, thắp lại, châm dầu), +100 thắp lần đầu, +40 thắp lại, +5/+15 Tỏa Sáng, thưởng bình minh.

## Hệ quả / rủi ro
- Test cũ về "thắng khi đủ đèn", điểm, thời lượng, sức chứa phải đổi → `docs/notes/regression-p2.md` (không skip test nào).
- Đèn "đầy dầu" (fuel=100) gần như không tồn tại lúc tương tác: dầu hao ở bước 2 trước bước 5, nên ngay tick sau khi châm đầy fuel đã là 99.98. Quy tắc "đèn đầy dầu không được chọn" vẫn cài đặt đúng nhưng chỉ có tác dụng trong khoảnh khắc đó.
- Giả định mới (xem `assumptions-phase3.md`): tốc độ đi tới đèn của Bóng `wander`, ưu tiên `drain→chase` trước `drain→wander`.
