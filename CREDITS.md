# Credits

- **Nhân vật, bối cảnh, tên gọi** (Mây, Bóng Mực, Đảo Đèn Lồng, ông Đăng): bản gốc của lab Day 12, VinUni AI20k.
- **three.js** r160 (MIT) – https://threejs.org – thư viện dựng hình 3D, cài qua npm và kèm trong bản Release (`node_modules/three/build/three.module.js`, giữ nguyên giấy phép).
- **Công cụ AI tạo nội dung:** Claude (Anthropic, qua giao diện chat claude.ai và môi trường chạy lệnh) viết phần lớn mã nguồn (`src/`, `web/`, `scripts/`, `tests/`) và tài liệu; tác giả giao việc theo từng ticket, chạy test/kiểm chứng trên máy, chơi thử và chịu trách nhiệm về kết quả. Chi tiết ở `docs/notes/ai-log.md`.
- **Asset:** không dùng model, ảnh, phông chữ hay tệp âm thanh bên ngoài.
  - Mọi hình 3D dựng từ hình khối cơ bản của three.js trong mã.
  - Âm thanh và nhạc nền được **tổng hợp tại chỗ bằng WebAudio** (`web/main.js`), không có tệp nhạc.
  - Giao diện dùng phông hệ thống (Trebuchet MS / system-ui).
  - Ảnh chụp trong `docs/screenshots/` là ảnh chụp màn hình chính game này.
