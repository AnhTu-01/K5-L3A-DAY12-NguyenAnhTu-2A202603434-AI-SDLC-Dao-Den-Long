# Ghi chú chơi thử giao diện — Phase 3
Người chơi (Nguyễn Anh Tú) chơi thử lúc 16:32 ngày 20/11/2026 và xác nhận chung "ổn hết"; không ghi số đo riêng từng mục.
Kiểm bằng: `npm start`, mở trình duyệt, chơi Đêm 1–3.
| Mục | Kết quả |
|---|---|
| Thanh dầu hiện trên đèn sáng, giảm dần | Đạt theo xác nhận chung của người chơi |
| Đèn fuel<30 nhấp nháy ~1 Hz, vòng an toàn biến mất | Đạt theo xác nhận chung của người chơi |
| Đèn cạn dầu tắt, hiện thông báo, thắp lại tốn 5 | Đạt theo xác nhận chung của người chơi |
| Nhấn E vào đèn sáng → châm dầu (HUD, thông báo `⛽`) | Đạt theo xác nhận chung của người chơi |
| HUD sức chứa x/cap tăng sau mỗi lần thắp (10→12→…) | Đạt theo xác nhận chung của người chơi |
| Hiện "cần ≥n đèn" và kết quả bình minh đúng ngưỡng | Đạt theo xác nhận chung của người chơi |
| Bóng Mực `drain`: màu cam + tia tới đèn, hút dầu | Đạt theo xác nhận chung của người chơi |
| Cài đặt "Bảng màu dễ phân biệt": Bóng xanh #00B3FF, cảnh báo trắng + ⚠, lưu sau khi tải lại | Đạt theo xác nhận chung của người chơi |
| Đèn tắt xẹp 20% + vết rách | Đạt theo xác nhận chung của người chơi |
| FPS (`?fps=1`) | không ghi số (chỉ xác nhận chung là ổn) |

Đã kiểm tự động (sandbox, headless Chrome): trang tải không lỗi JS; HUD hiện "cần ≥3", sức chứa 0/10; đèn đặt fuel 20 nhấp nháy; Bóng drain hiện tia cam; cờ `cb` lưu trong localStorage.
