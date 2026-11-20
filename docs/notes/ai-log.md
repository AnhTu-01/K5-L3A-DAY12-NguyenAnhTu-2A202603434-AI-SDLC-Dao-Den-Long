# Nhật ký dùng AI

## Phase 1
- **Công cụ:** Claude (giao diện chat, claude.ai) làm trợ lý kỹ thuật: đọc PRD-0, đề xuất kiến trúc, viết mã, tự chạy test trong môi trường sandbox rồi gửi lại cho tôi chạy trên máy.
- **Quy trình:** (1) tách yêu cầu bắt buộc khỏi chỗ mơ hồ → `assumptions.md`; (2) viết kịch bản kiểm chứng (`tests/cases.js`) song song với luật game; (3) tách `src/sim.js` (không phụ thuộc đồ họa) khỏi `web/main.js`; (4) chạy test + sinh bằng chứng bằng `npm run proof`.
- **Kiểm tra độ nhạy của test:** cố ý phá 5 chỗ trong `sim.js` (sai tốc độ trục X, bỏ giới hạn mang, bỏ safe_radius, bỏ rơi đom đóm, bỏ bất tử) → test đỏ đúng chỗ, rồi khôi phục. Mục đích: chắc chắn test không "luôn đạt".
- **Lần AI sai / điều cần cẩn thận:**
  - Lần chạy test đầu tiên `node --test tests/` báo lỗi vì Node 22 coi thư mục là module → đổi thành glob `tests/*.test.js`.
  - Cảnh 3D ban đầu quá tối so với "đêm ấm áp" → chỉnh ánh sáng sau khi xem ảnh chụp.
- **Token / chi phí ước tính:** *(tự điền số thật của bạn từ công cụ đang dùng; để trống nếu không biết, không bịa)*.
- **Cách tiết kiệm:** giữ AGENTS.md ngắn; viết kịch bản kiểm chứng trước khi sửa luật; chạy `npm test` (rẻ) thay vì nhờ agent "tự xác nhận".
