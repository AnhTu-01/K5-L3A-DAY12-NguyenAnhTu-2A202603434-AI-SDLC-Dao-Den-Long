# Giả định Phase 4 (chỗ TICKET-04 còn mơ hồ)
| # | Chỗ mơ hồ | Giả định | Lý do / hệ quả |
|---|---|---|---|
| 1 | `<bench_cmd>` cho game chạy trên web | `node scripts/bench.js` mở Chrome 1280×720, trang tự đo và gửi kết quả về máy chủ cục bộ | Ticket cho phép bản web (ghi `peak_mem_mb` giải thích). Tôi đo RSS tổng của các tiến trình Chrome bằng `ps` nên có số, không ghi null (trừ Windows) |
| 2 | Tắt vsync | Cờ `--disable-gpu-vsync --disable-frame-rate-limit`; `vsync_off` ghi theo cờ, không kiểm chứng được từ trang | Trình duyệt không cho trang tự tắt vsync. Ghi rõ trong README |
| 3 | `load_ms` | Từ lúc `bench.js` gọi spawn Chrome tới khung hình đầu của cảnh bench (đồng hồ epoch) | "từ lúc tiến trình bắt đầu" |
| 4 | Camera "ngược chiều kim đồng hồ nhìn từ trên xuống" | `(x,z) = (30cosθ, 30sinθ)` với θ tăng; (30,15,0) → (0,15,30) sau 1/4 vòng | Dự án dùng quy ước `x=r·cosθ, z=r·sinθ` từ Phase 2. Nếu chiều bị đảo thì chỉ cần đổi dấu `sin` trong `benchCamera` (có test khóa) |
| 5 | Bóng wander trong bench có chuyển `chase` khi gần Mây | Có: luật phát hiện (12 m) vẫn chạy; sát thương tắt nên chúng chỉ xúm quanh Mây | "Bóng Mực vẫn di chuyển theo luật wander bình thường"; chỉ liệt kê sát thương là tắt |
| 6 | Vị trí 200 Bóng / 100 đom đóm "rải đều" | Rải đều theo diện tích trong đĩa bán kính 38 m (r = R√u), PRNG seed 42, mặt đất y=0 | Đảo Đêm 1 là đĩa bán kính 40 m |
| 7 | "Đêm thứ i dùng seed 7+i" | i bắt đầu từ 0 (Đêm đầu dùng đúng `--seed`) | Cách đọc tự nhiên của `--seed` |
| 8 | Input soak "chọn lại hướng" | Góc đều trong [0,2π), `move` là vector đơn vị, `cam_yaw_deg = 0` | Không có nút nhấn giữ nào ngoài 4 nút bấm ngẫu nhiên mỗi tick |
| 9 | "kết thúc hoặc hết thời lượng chuẩn" | Chạy tới khi `state` là won/lost; luật bình minh luôn kết thúc Đêm đúng thời lượng chuẩn nên không cần giới hạn riêng | Có chốt an toàn 200.000 tick |
| 10 | `mem_start_mb` "sau khi tải xong Đêm đầu" | Đo sau khi Đêm đầu **chạy xong** (JIT đã khởi động), sau 2 lần GC cưỡng bức | Đo ngay sau `createGame` đã cho 41 MB → 66 MB (1,6×), và sau Đêm đầu 48 → 77 MB, vì trình biên dịch tối ưu TurboFan khởi động giữa chừng, không phải rò rỉ: heap JS giữ phẳng 4,0 MB sau 200 Đêm (xem `docs/proof/phase4/RESULTS.md`) |
| 11 | Soak với `--no-opt` | `scripts/soak.js` tự chạy lại chính nó với `node --no-opt` | Với JIT mặc định RSS nhảy ~30 MB do bộ nhớ trình biên dịch (đo 48→77 MB; với `--no-opt` 44→46 MB). Ghi rõ để không bị coi là giấu rò rỉ; bằng chứng không-rò-rỉ là heapUsed phẳng |
| 12 | Kết quả soak toàn "lost" | Input ngẫu nhiên không thể thắp đủ đèn; ngưỡng đạt chỉ xét crash và bộ nhớ | Ví dụ trong ticket có cả "won" nhưng đó chỉ là minh họa định dạng |
| 13 | Bảng xếp hạng "lưu trên đĩa" cho game web | Máy chủ Node ghi `data/leaderboard.json` (ghi nguyên tử); bản web tĩnh không có máy chủ rơi về `localStorage` | `run_cmd` đổi sang `node server.js` để `--export-leaderboard` hoạt động |
| 14 | Tên có dấu tiếng Việt | Không hỗ trợ (điểm cộng, không bắt buộc) | Để quy tắc `[A-Za-z0-9_]` đơn giản, có test |
| 15 | `score` của mục xếp hạng khi thua | Tổng điểm các Đêm đã thắng (Đêm thua không tính), `nights_won` = số Đêm đã thắng trong lượt chơi | Đúng định nghĩa ticket |
| 16 | `seed` của mục xếp hạng | Seed của Đêm 1 trong lượt chơi (các Đêm sau dùng seed theo thời gian) | Ticket chỉ yêu cầu lưu một `seed` |
| 17 | Hòa điểm: "ai đạt trước đứng trên" | So `achieved_at` theo thời điểm thật (Date.parse, tính múi giờ); vẫn bằng thì giữ thứ tự thêm vào | Test có ca múi giờ khác nhau |
| 18 | "Rung camera, chớp màn hình" | Game từ Phase 1–3 chưa có; thêm rung camera 0,3 s và chớp trắng 0,12 s khi Mây bị chạm (để cài đặt "giảm chuyển động" có nghĩa), tắt cùng nhấp nháy khi bật | Cài đặt phải tắt được cái gì đó thật |
| 19 | Phím tạm dừng `P` | Bỏ `P` phụ, chỉ còn một phím tạm dừng (mặc định Esc) | Mọi hành động gán đúng 1 phím để phát hiện trùng đơn giản |
| 20 | Phím cố định | `←` `→` (camera), `Enter`, `R` không gán được và không đổi được | Để menu và khởi động lại luôn dùng được |
| 21 | Shift trái/phải | Coi là một phím (chuẩn hóa) | Giữ hành vi cũ: cả hai Shift đều lướt |
| 22 | "Chỉ báo Bóng Mực xuất hiện" | Chip chữ + mũi tên đỏ ở mép màn hình chỉ tới Bóng mới sinh trong 4 giây (tối đa 4 mũi tên) | Hiển thị cho mọi Bóng mới, không phải mọi Bóng |
| 23 | Cỡ chữ 18 px | Mọi phần tử có chữ ≥18 px ở 1280×720 (đã quét bằng trình duyệt thật; chữ `#fps` chỉ hiện khi bật `?fps=1`, là công cụ gỡ lỗi nên loại) | `a11y-check.md` |
