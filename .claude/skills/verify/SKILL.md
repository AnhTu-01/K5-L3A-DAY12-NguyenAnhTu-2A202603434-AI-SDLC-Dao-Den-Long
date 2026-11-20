---
name: verify
description: Chạy toàn bộ kiểm chứng của Đảo Đèn Lồng (test, headless, tất định) và lưu bằng chứng. Dùng trước khi báo "xong" hoặc gắn tag phase.
---

1. `npm test` – phải xanh toàn bộ (29+ test). Nếu đỏ: sửa code, không sửa test để cho xanh.
2. `npm run proof` – sinh `docs/proof/phase1/RESULTS.md` từ lần chạy headless thật; phải in "TẤT CẢ ĐẠT".
3. Đọc `RESULTS.md`: mục nào ghi CHƯA ĐẠT thì ghi trung thực vào `docs/notes/`, không giấu.
4. Chỉ sau đó mới commit bằng chứng và gắn tag `phase-N`.
