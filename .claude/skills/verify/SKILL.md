---
name: verify
description: Chạy toàn bộ kiểm chứng của Đảo Đèn Lồng (test, headless, tất định) và lưu bằng chứng. Dùng trước khi báo "xong" hoặc gắn tag phase.
---

1. `npm test` – phải xanh toàn bộ (80+ test, gồm hiệu năng một Đêm ≤30 s và tất định cả 3 Đêm). Nếu đỏ: sửa code, không sửa test để cho xanh.
2. `npm run proof` – sinh `docs/proof/phase2/RESULTS.md` từ lần chạy headless thật; phải in "TẤT CẢ ĐẠT".
3. Đọc `RESULTS.md`: mục nào ghi CHƯA ĐẠT thì ghi trung thực vào `docs/notes/`, không giấu.
4. Chỉ sau đó mới commit bằng chứng và gắn tag `phase-N`.
5. Với tính năng mới: có ít nhất 1 case headless trong `tests/cases.js` + một dòng AC trong `docs/notes/spec-phase2.md`; thử phá luật (mutation) để chắc case đỏ.
6. Phần GUI (menu, HUD, âm thanh, FPS) kiểm bằng chơi thật, ghi trung thực vào `docs/proof/phase2/GUI.md`.
