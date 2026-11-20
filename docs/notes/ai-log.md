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

## Phase 2
- **Công cụ:** Claude (claude.ai) như Phase 1. Đọc TICKET-02, viết lại `src/sim.js` theo thứ tự tick bắt buộc, tách bản đồ ra `src/maps.js`.
- **Quy trình:** (1) liệt kê mọi chỗ mơ hồ → `assumptions-phase2.md`; (2) viết spec + AC từng tính năng (`spec-phase2.md`); (3) mỗi tính năng ≥1 case headless (72 case); (4) phá thử 13 chỗ trong `sim.js` (mutation) để chắc case đỏ; (5) hồi quy Phase 1 ghi ở `regression-p1.md`.
- **Lần AI sai:** test lướt/bục nhảy đầu tiên cho thấy lướt lúc đang bay làm mất vận tốc dọc (đáp ngoài đảo) → sửa luật giữ vy. Vài mốc tick trong test viết sai 1 tick so với thứ tự xử lý → sửa test sau khi đối chiếu spec (không sửa code cho vừa test).
- **Token / chi phí:** *(tự điền số thật hoặc ghi "không biết")*.

## Phase 3
- **Công cụ:** Claude (claude.ai) như các Phase trước. Đọc TICKET-03, thêm mô hình dầu đèn vào `src/sim.js`, đổi luật thắng sang "sống tới bình minh".
- **Quy trình:** (1) ADR-003 + spec-phase3 (AC) + assumptions-phase3; (2) 99 case dùng chung cho `npm test` và `npm run proof`; (3) hồi quy Phase 2 ghi ở `regression-p2.md`; (4) mutation: phá luật dầu/ngưỡng 30/drain/ngưỡng thắng, case phải đỏ.
- **Lần AI sai:** hai mutant sống sót ban đầu (`fuel > ngưỡng` và nhánh hết recoil → chase) → thêm case `fuel_exactly_30_keeps_safe_zone` và siết test Tỏa Sáng khi drain. Một mutant tương đương (đèn đầy dầu không chọn được) được ghi ở ADR vì không thể quan sát.
- **Token / chi phí:** *(tự điền số thật hoặc ghi "không biết")*.
