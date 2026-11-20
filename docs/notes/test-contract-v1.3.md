# Test Contract v1.3 (thay đổi so với v1.2)
- `contract_version "1.3"`; `game.contract.json` thêm `bench_cmd` (`node scripts/bench.js`) và `soak_cmd` (`node scripts/soak.js`); `run_cmd` = `node server.js`.
- Mọi yêu cầu v1.0–v1.2 giữ nguyên: luật, số liệu (`tuning`) và đầu ra headless **không đổi**. Cờ `bench` của `createGame` mặc định `false`.
- `<bench_cmd> --seed 42 --duration 30 --out bench.json` → `{contract_version, avg_fps, p1_low_fps, frame_ms_p95, frames, load_ms, peak_mem_mb, vsync_off, renderer, os}`.
- `<soak_cmd> --seed 7 --nights 10 --out soak.json` → `{nights, crashes, results, mem_start_mb, mem_end_mb, duration_s}`; mã thoát 0 khi crashes = 0 và mem_end ≤ 1.2 × mem_start.
- `<run_cmd> --export-leaderboard out.json` → `{"entries":[{name, score, nights_won, achieved_at, seed}, ...]}` đúng thứ tự.
