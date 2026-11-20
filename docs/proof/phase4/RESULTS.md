# Bằng chứng Phase 4 (Contract v1.3)

Sinh bởi `npm run proof4` ngày 2026-11-20 trên Linux x64, Node v22.23.4. Không sửa tay.

| Yêu cầu | Cách đo | Kết quả đo | Kết luận |
|---|---|---|---|
| Soak: crashes = 0 | `node scripts/soak.js --seed 7 --nights 10 --out soak.json` | crashes = 0, 10 Đêm, kết quả lost/lost/lost/lost/lost/lost/lost/lost/lost/lost | ĐẠT |
| Soak: mem_end ≤ 1.2 × mem_start | cùng lệnh | 47 MB ≤ 1.2 × 45 = 54.0 MB | ĐẠT |
| Không rò rỉ heap JS | 20 Đêm khởi động rồi 200 Đêm nữa, đo heapUsed sau GC | 4.01 MB → 4.01 MB | ĐẠT |
| Bench: cảnh chuẩn (200 Bóng wander, 100 đom đóm, L1–L3 sáng fuel 100) | `createGame({seed:42, night:1, scenario: benchScenario(42), bench:true})` rồi 33 s mô phỏng | 200 Bóng, 100 đom đóm, đèn sáng L1:100 L2:100 L3:100; mô phỏng 33 s tốn 175 ms CPU | ĐẠT |
| Bảng xếp hạng: top 10, sắp xếp | thêm 12 mục | 10 mục, điểm 110,100,90,80,70,60,50,40,30,20 | ĐẠT |
| Bảng xếp hạng: lưu đĩa + lệnh xuất | `node server.js --export-leaderboard out.json` (tiến trình mới, đọc lại từ đĩa) | { "entries": [ { "name": "Proof_One", "score": 123, "nights_won": 1, "achieved_at": "2026-11-20T10:00:00+07:00", "seed": 1 } ] }  | ĐẠT |
| Contract v1.3 | `game.contract.json` | contract_version=1.3, bench_cmd="node scripts/bench.js", soak_cmd="node scripts/soak.js" | ĐẠT |
| Bench trên máy tác giả | `npm run bench` | chưa chạy (cần máy có GPU) | — |

**TẤT CẢ ĐẠT**

- Giao diện (đổi phím, chữ ≥18 px, giảm chuyển động, chỉ báo, màn bảng xếp hạng): xem [`a11y-check.md`](a11y-check.md) và [`GUI.md`](GUI.md).
- Hiệu năng thật (FPS) đo bằng `npm run bench` trên máy có GPU; bản trong sandbox dùng GPU phần mềm nên không có giá trị.
