# Spec Phase 4 — "Bình minh: phát hành" (acceptance criteria)
| AC | Yêu cầu | Kiểm bằng |
|---|---|---|
| AC-B1 | Cảnh bench: 200 Bóng wander + 100 đom đóm + L1–L3 sáng fuel 100, Mây (0,0,0) | test "cảnh bench…", `proof4` |
| AC-B2 | Bench tắt sinh thêm/sát thương/nhặt/hao dầu/kết thúc Đêm, Bóng vẫn di chuyển | test "bench tắt…" (14.500 tick) |
| AC-B3 | Camera bán kính 30, cao 15, 15 s/vòng, bắt đầu (30,15,0), ngược chiều kim đồng hồ | test "camera bench" |
| AC-B4 | Chỉ số avg_fps, p1_low (k = max(1, ceil(1% N))), p95, frames theo định nghĩa | test "chỉ số bench", "k = ceil" |
| AC-B5 | `bench.json` đủ trường, thoát mã 0; tham số sai → mã khác 0 | `scripts/bench.js` (chạy thật trong sandbox), test mã thoát |
| AC-S1 | Soak 10 Đêm 1 tiến trình, seed 7+i, input theo xác suất, đủ khóa JSON | test "soak…", "soak input" |
| AC-S2 | crashes = 0 và mem_end ≤ 1.2 × mem_start; không rò rỉ heap | `proof4` |
| AC-L1 | Tên 3–12 `[A-Za-z0-9_]`; mục có name/score/nights_won/achieved_at (ISO có múi giờ)/seed | test "tên", "mục hợp lệ" |
| AC-L2 | Top 10; score giảm dần; hòa → đạt trước đứng trên | test "xếp theo score", "múi giờ", "top 10" |
| AC-L3 | Lưu đĩa, còn sau khi tắt mở; xuất `{"entries":[…]}` | test "lưu trên đĩa", "xuất khi chưa có dữ liệu" |
| AC-L4 | Màn Bảng xếp hạng từ menu; nhập tên sau Bình Minh / sau khi thua | `a11y-check.md` (chạy trình duyệt thật), `GUI.md` |
| AC-A1 | Đổi 9 hành động; trùng phím bị báo; khôi phục mặc định; lưu | test "đổi phím", "conflicts"; trình duyệt thật |
| AC-A2 | Chỉ báo: Bóng mới + mũi tên mép, gió sắp thổi, 10 s cuối, fuel<30 | `a11y-check.md` |
| AC-A3 | Giảm chuyển động: tắt rung camera, chớp màn hình (và nhấp nháy) | `a11y-check.md` |
| AC-A4 | Chữ ≥ 18 px ở 1280×720; chữ lớn ×1,25 | quét DOM trong `a11y-check.md` |
| AC-P1 | Clone sạch → ≤ 3 lệnh → chơi được; README đủ mục; CHANGELOG 4 phase; CREDITS; LICENSE | `README.md`; thử bản Release giải nén |
| AC-P2 | Release v1.0.0 có bản chạy được | `npm run release` (đã thử: giải nén, `node server.js`, 200 OK) |
| AC-C1 | Contract v1.3 | test contract |
| AC-R1 | Retro 1–2 trang; video demo < 5 phút | `docs/retro.md`, `docs/demo/` |
| AC-X1 | Test Phase 1–3 vẫn đạt | `npm test` (toàn bộ) |
