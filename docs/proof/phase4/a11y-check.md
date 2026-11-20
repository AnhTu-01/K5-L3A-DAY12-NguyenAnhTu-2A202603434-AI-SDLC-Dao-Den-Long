# Kiểm tra giao diện Phase 4 (chạy bằng Chrome thật, 1280×720, tự động trong sandbox)
Công cụ: playwright + Google Chrome (WebGL phần mềm). Đây là kiểm tra chức năng; cảm giác chơi và FPS thật cần người chơi (`GUI.md`).

| Mục | Cách kiểm | Kết quả |
|---|---|---|
| Đổi phím: trùng bị từ chối | Cài đặt → bấm nút "Tỏa Sáng" → nhấn `E` | Hiện "⚠ Trùng phím E với "Tương tác (nạp / châm dầu)" — chọn phím khác"; phím không đổi |
| Đổi phím hợp lệ + lưu | Nhấn `G`; tải lại trang | `settings.keys.pulse = "KeyG"` còn sau reload |
| Khôi phục mặc định | Bấm "Khôi phục mặc định" | `pulse` về `KeyF` |
| Giảm chuyển động / chữ lớn lưu | Bật 2 ô, tải lại | `rm=true`, `big=true`; cỡ chữ chip 22,5 px (= 18 × 1,25) |
| Chữ ≥ 18 px | Quét mọi phần tử có chữ đang hiển thị (menu, cài đặt, bảng xếp hạng, đang chơi) | Không còn phần tử nào < 18 px (trừ `#fps` gỡ lỗi) |
| Chỉ báo 10 s cuối, đèn fuel<30 | Ép trạng thái trong game | Chip "⚠ 4 giây cuối!", "⚠ Đèn L1 sắp hết dầu (18)" hiện đúng (ảnh `docs/screenshots/play.png`) |
| Bảng xếp hạng | Thua Đêm 1 → Lưu điểm → nhập `ab` rồi `Anh_Tu01` | `ab` bị từ chối "Tên phải dài 3–12 ký tự…"; `Anh_Tu01` lưu, hiện trong bảng và ghi vào file `leaderboard.json` đúng 5 trường |
| Không lỗi JS | Lắng nghe `pageerror`/`console.error` | 0 lỗi |
Chưa tự kiểm: rung camera/chớp màn hình khi bị chạm (cần chơi thật), mũi tên mép cho Bóng mới sinh ngoài màn hình.
