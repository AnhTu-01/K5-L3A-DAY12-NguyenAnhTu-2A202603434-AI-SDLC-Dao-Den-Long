# Retro — Đảo Đèn Lồng (Day 12, AI SDLC)
**Nguyễn Anh Tú — sinh viên L3A, làm một mình với Claude (claude.ai).** 4 phase trong một buổi lab 4 giờ.

## Evaluation của 4 phase
| Phase | Nội dung | Evaluation / điểm |
|---|---|---|
| 1 | Lõi tất định + headless + game 3D (Đêm 1) | _(điền điểm/nhận xét từ bảng lab)_ |
| 2 | Ba hòn đảo, lướt, Gió Lạc, gió, rơi đảo (Contract v1.1) | _(điền)_ |
| 3 | Đèn có dầu, luật sống tới bình minh (v1.2) | _(điền)_ |
| 4 | Benchmark, soak, bảng xếp hạng, dễ tiếp cận, phát hành (v1.3) | _(điền)_ |
Số liệu tự đo của tôi (không phải điểm chấm): `npm test` 133 test đạt; soak 10 Đêm 0 crash, heap JS phẳng 4,0 MB sau 200 Đêm; bench trên máy tôi _(điền từ bench.json)_.

## Điều gì hiệu quả
- **Một nguồn sự thật cho luật:** `src/sim.js` chạy ở cả headless (Node) lẫn game 3D, nên mọi test headless cũng là test của game thật. Tách luật khỏi đồ họa là quyết định đúng nhất của dự án.
- **`tests/cases.js` dùng chung cho `npm test` và `npm run proof`:** bằng chứng nộp bài là kết quả chạy thật, không viết tay.
- **Thử phá code (mutation) bằng tay:** mỗi phase bẻ cố ý vài chỗ trong luật rồi xem test có đỏ không. Phase 3 phát hiện 2 test "xanh giả" (ngưỡng `fuel ≥ 30`, nhánh hết recoil) và Phase 4 phát hiện test thiếu cho `ceil(1% N)` và tần suất input soak — đều bổ sung test rồi bẻ lại để chắc nó đỏ.
- **Làm từng ticket thành: giả định → spec/AC → test → code → bằng chứng → hồi quy:** các file `assumptions-phaseN.md`, `spec-phaseN.md`, `regression-pN.md` giúp ticket sau (đổi luật) biết test nào phải đổi và vì sao, không có test nào bị skip âm thầm.

## Điều gì kém hiệu quả
- **Viết test trước khi đọc kỹ thứ tự tick:** Phase 2 sai vài mốc tick (sự kiện ghi tick k+1) → phải sửa test (không sửa code cho vừa).
- **Gửi cho tôi một đống lệnh dài để dán vào Terminal:** heredoc nhiều lần không chạy, mất thời gian. Sau đó tôi chuyển sang gửi file hoàn chỉnh trong zip và lệnh ngắn từng dòng.
- **Hỏi "lab đã chạy bao lâu" nhiều lần mà không có đáp án:** mốc 2h30/4h chỉ biết tương đối; lần sau nên ghi giờ bắt đầu ngay từ đầu.

## Những lần AI sai và cách phát hiện
1. **Lướt giữa lúc bay (Phase 2):** lướt làm mất vận tốc dọc → Mây rơi sớm khỏi bục nhảy. Phát hiện bằng test `jump_pad_*` đỏ khi đáp ngoài đảo; sửa luật giữ `vy`, không sửa test.
2. **Phục hồi (recoil) thiếu 1 bước:** Bóng lùi 59 chứ không phải 60 tick — test đo quãng đường phát hiện.
3. **Test xanh giả ở Phase 3:** ngưỡng `fuel ≥ 30` và nhánh "hết recoil → chase" chưa có test bắt; phát hiện nhờ mutation (bẻ code mà test vẫn xanh).
4. **RSS soak tăng 1,6×:** tưởng rò rỉ; đo `heapUsed` thì phẳng, nguyên nhân là bộ nhớ trình biên dịch TurboFan. Tôi ghi rõ giả định thay vì chỉnh ngưỡng (`assumptions-phase4.md` #10–11).
5. **Màn hình Cài đặt tràn khung (Phase 4):** nhìn ảnh chụp trình duyệt thật mới thấy phần đầu bị cắt; sửa bố cục. Lập luận "test xanh" không thay được việc nhìn.
6. **Test hỏng do tôi tự gõ sai tay** (heredoc Python không chạy, grep còn `_(điền)_`) — kiểm tra lại bằng `grep -c` mới phát hiện, chứ không tin việc "lệnh đã dán".

## Harness nào giúp nhiều nhất
- **`AGENTS.md`** ngắn (phạm vi hiện tại + các bẫy đã gặp theo phase): mỗi lần AI quay lại làm việc không phải dò lại; các dòng "bẫy" (mốc tick, `vy` khi lướt, fuel là số nguyên 1/60) chính là bài học từ các lần AI sai.
- **Skill `verify` + hook Stop chạy `npm test`:** chặn việc báo "xong" khi test đỏ.
- **CI** chạy lại test trên máy sạch.
- Ít hữu ích hơn tôi nghĩ: ghi chú dài; chỉ những dòng khiến AI tránh được một lỗi cụ thể mới đáng giữ.

## Token / chi phí AI và cách tiết kiệm
- Tổng token và chi phí: _(điền số thật từ phần sử dụng của claude.ai, hoặc ghi "không biết" — tôi không đo được từ trong cuộc trò chuyện nên không bịa số)_.
- Cách tiết kiệm đã dùng: giữ `AGENTS.md` ngắn; viết kịch bản kiểm chứng (rẻ, chạy bằng `npm test`) thay vì nhờ AI "tự xác nhận"; gửi cả zip hoàn chỉnh thay vì dán từng đoạn mã qua lại; tái dùng một bộ case cho cả test và proof; không sinh lại tài liệu khi luật không đổi.

## Nếu làm lại
- Ghi **giờ bắt đầu lab** và đặt nhắc 2h30/4h ngay từ đầu.
- Viết **bộ benchmark và soak sớm** (từ Phase 2) để thấy chi phí của 200 thực thể và bộ nhớ trước khi dồn vào Phase 4.
- Làm **cài đặt dễ tiếp cận (phím, cỡ chữ) từ Phase 1** thay vì thêm sau: đổi phím và chữ ≥ 18 px phải sửa gần như toàn bộ HUD.
- Quay video demo **ngay sau Phase 3** khi mọi thứ còn tươi, thay vì để cuối.
