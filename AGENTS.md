# AGENTS.md – Đảo Đèn Lồng

Game 3D (Three.js) + lõi mô phỏng headless bằng JavaScript (Node 22). Giữ file này ngắn; chỉ thêm dòng khi agent sai lặp lại.

## Lệnh
- Cài: `npm install` · Chạy game: `npm start` (http://localhost:8080)
- Test: `npm test` · Bằng chứng: `npm run proof` (ghi docs/proof/phase1/) · Sinh contract: `npm run contract`
- Headless: `node src/headless.js --seed 1 --night 1 --ticks 600 --out /tmp/o.jsonl [--scenario f] [--inputs f]`

## Kiến trúc (một nguồn sự thật)
- `src/sim.js` = toàn bộ luật game, tất định, 60 tick/s. **Không** import Three.js/DOM ở đây.
- `src/tuning.js` = mọi con số; `game.contract.json` sinh từ nó (`npm run contract`), `tests/contract.test.js` kiểm tra khớp.
- `src/headless.js` = CLI theo Test Contract. `web/main.js` chỉ vẽ + đọc phím, gọi `step()` của sim.
- Kịch bản kiểm chứng ở `tests/cases.js`, dùng chung cho `npm test` và `npm run proof`.

## Quy tắc
1. Đọc Test Contract trong `docs/notes/` trước khi đổi output headless. Tọa độ làm tròn 3 số lẻ; dòng cuối là `end`.
2. Tính tất định: chỉ dùng `g.rng` (mulberry32) cho ngẫu nhiên; **không** `Math.random`, `Date.now` trong `src/sim.js`.
3. Đổi luật hoặc con số → sửa `src/tuning.js`, chạy `npm run contract`, cập nhật test + `docs/notes/assumptions.md`.
4. Không tắt/xóa test để cho xanh. Test cũ sai do yêu cầu mới: sửa hoặc bỏ **kèm lý do** trong `docs/notes/`.
5. Bằng chứng chỉ sinh bằng `npm run proof`; không sửa tay file trong `docs/proof/`.
6. Sáng tạo (hiệu ứng, thực thể phụ) chỉ ở `web/` hoặc phải tắt khi headless; không được đổi output headless.
7. Không commit `.env`, API key. Không force-push sau khi đã gắn tag. Commit nhỏ, thông điệp rõ.

## Lỗi AI đã gặp (cập nhật khi lặp lại)
- Chưa có. Ghi vào đây khi agent sai lặp lại lần thứ hai.
