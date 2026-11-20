# AGENTS.md – Đảo Đèn Lồng

Game 3D (Three.js) + lõi mô phỏng headless bằng JavaScript (Node 22). Giữ file này ngắn; chỉ thêm dòng khi agent sai lặp lại.

## Lệnh
- Cài: `npm install` · Chạy game: `npm start` (http://localhost:8080)
- Test: `npm test` · Bằng chứng: `npm run proof` (ghi docs/proof/phase2/) · Sinh contract: `npm run contract`
- Headless: `node src/headless.js --seed 1 --night 1|2|3 --ticks 600 --out /tmp/o.jsonl [--scenario f] [--inputs f]`

## Kiến trúc (một nguồn sự thật)
- `src/sim.js` = toàn bộ luật game (3 Đêm, lướt, Gió Lạc, Bùa Gió, gió, tạm dừng, rơi đảo), tất định, 60 tick/s. **Không** import Three.js/DOM ở đây.
- `src/maps.js` = bản đồ chuẩn 3 Đêm (bề mặt, tầng, dốc, bục nhảy, điểm sinh, đèn). `web/` chỉ dựng hình từ đây.
- `src/tuning.js` = mọi con số; `game.contract.json` sinh từ nó (`npm run contract`), `tests/contract.test.js` kiểm tra khớp.
- `src/headless.js` = CLI theo Test Contract. `web/main.js` chỉ vẽ + đọc phím, gọi `step()` của sim.
- Kịch bản kiểm chứng ở `tests/cases.js`, dùng chung cho `npm test` và `npm run proof`.

## Quy tắc
0. Phạm vi hiện tại = Contract v1.3 (xem `docs/notes/test-contract-v1.3.md`, `spec-phase4.md`, `assumptions-phase4.md`; luật giữ nguyên v1.2: `spec-phase3.md`, `adr-003-fuel-and-dawn.md`). **Số chuẩn trong `src/tuning.js` không được tự đổi; đầu ra headless không được đổi.**
1. Đọc Test Contract trong `docs/notes/` trước khi đổi output headless. Tọa độ làm tròn 3 số lẻ; dòng cuối là `end`.
2. Tính tất định: chỉ dùng `g.rng` (mulberry32) cho ngẫu nhiên; **không** `Math.random`, `Date.now` trong `src/sim.js`.
3. Đổi luật hoặc con số → sửa `src/tuning.js`, chạy `npm run contract`, cập nhật test + `docs/notes/assumptions.md`.
4. Không tắt/xóa test để cho xanh. Test cũ sai do yêu cầu mới: sửa hoặc bỏ **kèm lý do** trong `docs/notes/`.
5. Bằng chứng chỉ sinh bằng `npm run proof`; không sửa tay file trong `docs/proof/`.
6. Sáng tạo (hiệu ứng, thực thể phụ) chỉ ở `web/` hoặc phải tắt khi headless; không được đổi output headless.
7. Không commit `.env`, API key. Không force-push sau khi đã gắn tag. Commit nhỏ, thông điệp rõ.

## Lỗi AI đã gặp (cập nhật khi lặp lại)
- Phase 2: viết test dùng sai mốc tick (sự kiện ghi tick = bước k+1; Bóng recoil/choáng đếm ở bước 2 của tick sau). Khi viết test thời gian, đối chiếu với thứ tự tick bắt buộc trong spec trước.
- Phase 2: khi lướt giữa lúc bay (bục nhảy) từng làm mất vận tốc dọc → rơi sớm; đã sửa thành giữ vy cũ. Mọi thay đổi vật lý phải kèm case `jump_pad_*`.
- Chưa có lặp lại lần thứ hai nào khác.
- Phase 3: dầu đèn là số nguyên đơn vị 1/60 (`fuelU`) — không dùng số thực để so `fuel<30`. Đèn đầy dầu gần như không tương tác được (hao dầu chạy trước tương tác). Mọi luật thắng/thua nằm ở bước 11, `no_flames` xét trước.
- Phase 4: cờ `bench` của `createGame` mặc định `false` và chỉ tắt thứ ticket liệt kê; mọi thay đổi ở `sim.js` phải giữ `tests/headless.test.js` (tất định) xanh. RSS soak bị nhiễu bởi JIT: dùng `heapUsed` để kết luận rò rỉ, không chỉnh ngưỡng. Mọi chữ giao diện ≥ 18 px (`calc(Npx * var(--k))`). Phím gán qua `src/keybinds.js`, không gõ cứng `KeyW`... trong `web/main.js`.
