# Đảo Đèn Lồng

> **Video demo:** _(sẽ cập nhật ở Phase 4: Release `v1.0.0` hoặc `docs/demo/demo.mp4`)_
> Bài Day 12 – AI SDLC · Nguyễn Anh Tú · MSSV 2A202603434 · Lớp L3A · **Phase 1 / Test Contract v1.0**

Game 3D góc nhìn thứ ba: Mây, người giữ đèn nhỏ tuổi, nhặt đom đóm để thắp lại 5 Đèn Lồng Lớn trên đảo giữa biển mây và né Bóng Mực trong sương đen.

## Cài đặt và chạy (3 lệnh, cần Node 22+)

```bash
git clone https://github.com/AnhTu-01/K5-L3A-DAY12-NguyenAnhTu-2A202603434-AI-SDLC-Dao-Den-Long.git && cd K5-L3A-DAY12-NguyenAnhTu-2A202603434-AI-SDLC-Dao-Den-Long
npm install
npm start          # mở http://localhost:8080 (tự mở trình duyệt; đặt NO_OPEN=1 để tắt)
```

## Điều khiển

| Phím | Việc |
|---|---|
| `W A S D` | Di chuyển (theo hướng camera) |
| `←` `→` hoặc kéo chuột | Xoay camera |
| `Space` | Nhảy |
| `E` | Nạp đom đóm vào đèn lồng gần nhất (đứng trong 2.5 m) |
| `F` | Tỏa sáng: xua Bóng Mực trong 6 m, tốn 1 đom đóm, hồi 2 giây |
| `R` | Chơi lại (sau khi thắng/thua hoặc bất cứ lúc nào) |

## Luật chơi và cách tính điểm

- Nhặt đom đóm bằng cách đi lại gần (1.2 m), mang tối đa 5. Nạp 3 đom đóm vào một đèn thì đèn sáng. **Thắp đủ 5 đèn = thắng.**
- Mất hết 3 ngọn lửa, hoặc hết 5 phút (trời sáng) = thua. Bị Bóng Mực chạm: mất 1 lửa, rơi một nửa số đom đóm đang mang, bất tử 1.5 giây.
- Vòng sáng quanh đèn **đã thắp** (4 m): Bóng Mực không vào được.
- Điểm: **+10** mỗi đom đóm nhặt · **+100** mỗi đèn thắp · **+25** mỗi Bóng Mực bị choáng · khi thắng: **+1** mỗi giây còn lại và **+50** mỗi ngọn lửa còn.

## Chế độ headless (Test Contract v1.0)

```bash
node src/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl [--scenario sc.json] [--inputs in.json] [--snapshot-every 10]
```

Khai báo ở [`game.contract.json`](game.contract.json). Logic nằm ở `src/sim.js`, không cần GPU/cửa sổ. Lỗi → mã thoát khác 0 (file scenario/inputs sai → mã 2).

Về `tuning` trong contract: mọi số đều là số game thật sự dùng (`src/tuning.js`). `fall_enabled: false` vì game **không có** phạt rơi khỏi đảo (mép đảo là tường vô hình), nên sự kiện `player_hit` với `by:"fall"` không bao giờ xuất hiện. `safe_radius` áp dụng cho đèn **đã sáng**. Chi tiết các giả định: [`docs/notes/assumptions.md`](docs/notes/assumptions.md).

## Kiểm chứng

```bash
npm test          # 29 test: luật game, headless, tất định, mã thoát lỗi, contract khớp tuning
npm run proof     # chạy từng kịch bản qua headless thật, ghi docs/proof/phase1/RESULTS.md
```

- Bằng chứng: [`docs/proof/phase1/RESULTS.md`](docs/proof/phase1/RESULTS.md) (bảng yêu cầu → kịch bản → kết quả đo; kèm scenario/inputs/output JSONL).
- Phần hiển thị 3D và HUD: [`docs/proof/phase1/GUI.md`](docs/proof/phase1/GUI.md).
- CI chạy `npm test` mỗi lần push (`.github/workflows/test.yml`).

## Sáng tạo của tôi

- **Đom đóm hộ đèn:** mỗi khi một đèn được thắp, vài đốm sáng nhỏ bay vòng quanh đèn đó. Chỉ là hiệu ứng hiển thị trong `web/main.js`.
- **Bằng chứng phần cũ vẫn đúng:** hiệu ứng nằm ngoài `src/sim.js` và không được `src/headless.js` nạp, nên output headless không đổi; `npm test` (gồm kiểm tra tất định) vẫn xanh.

## Cấu trúc

```
src/sim.js  src/tuning.js  src/headless.js   lõi game, con số, CLI headless
web/ server.js                                bản chơi 3D (Three.js) + máy chủ tĩnh
tests/ scripts/proof.js                       kịch bản kiểm chứng, sinh bằng chứng
docs/notes  docs/proof                        giả định, nhật ký AI, bằng chứng
AGENTS.md  .claude/                           harness AI (hướng dẫn, skill, hook)
```

Giấy phép: MIT ([LICENSE](LICENSE)). Nguồn asset: [CREDITS.md](CREDITS.md).
