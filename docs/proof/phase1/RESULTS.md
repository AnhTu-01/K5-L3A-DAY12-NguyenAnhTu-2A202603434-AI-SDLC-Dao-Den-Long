# Bằng chứng Phase 1 (tự sinh, không sửa tay)

- Sinh bởi: `npm run proof` (scripts/proof.js)
- Commit lúc sinh: `(chưa commit)` · Node v22.15.1 · darwin x64
- Mỗi dòng dưới đây chạy **chế độ headless thật** (`node src/headless.js ...`); scenario, inputs và output nằm cạnh trong `scenarios/`, `inputs/`, `outputs/`.

| # | Yêu cầu | Kịch bản | Kết quả | Chi tiết đo được |
|---|---|---|---|---|
| 1 | Nhân vật đi lại: move [0,1] đi về +Z đúng tốc độ player_speed | `move_forward` (seed 1, 60 tick) | ĐẠT | z sau 60 tick = 6, mong đợi 6 |
| 2 | Vector di chuyển dài hơn 1 được chuẩn hóa về độ dài 1 | `move_diagonal_normalized` (seed 1, 60 tick) | ĐẠT | quãng đường = 6.001 (mong đợi 6), x=4.243 z=4.243 |
| 3 | cam_yaw_deg=90 làm move [0,1] đi về +X (x' = z·sinθ) | `camera_yaw` (seed 1, 60 tick) | ĐẠT | pos = (6, 0), mong đợi (6, 0) |
| 4 | Nhân vật nhảy được rồi chạm đất lại | `jump` (seed 1, 120 tick) | ĐẠT | độ cao tối đa 1.167, cuối 0 |
| 5 | Nhặt đom đóm trong pickup_radius, ghi event mote_picked và cộng điểm | `pickup_mote` (seed 1, 120 tick) | ĐẠT | mote_picked=1, carried=1, score=10, tick sự kiện=38 |
| 6 | Không mang quá carry_capacity đom đóm | `carry_capacity` (seed 1, 30 tick) | ĐẠT | carried=5, motes còn lại=1 |
| 7 | Nạp đủ lantern_cost thì đèn sáng: event deposit + lantern_lit, cộng điểm per_lantern | `deposit_and_light` (seed 1, 30 tick) | ĐẠT | deposit={"lantern_id":"L1","amount":3,"deposited":3}, lantern_lit=L1, score=100 |
| 8 | Nạp thiếu thì đèn chưa sáng, deposited được cộng dồn | `deposit_partial` (seed 1, 30 tick) | ĐẠT | deposited=1, lit=false |
| 9 | Đứng ngoài interact_radius thì không nạp được | `interact_out_of_range` (seed 1, 30 tick) | ĐẠT | số event deposit = 0 |
| 10 | Dựng scenario với đèn lit:true không phát sự kiện và không cộng điểm | `setup_lit_no_score` (seed 1, 10 tick) | ĐẠT | L2.lit=true, score=0 |
| 11 | Bóng Mực đuổi theo, chạm thì mất 1 ngọn lửa và đánh rơi hit_drop_ratio đom đóm | `shade_chases_and_hits` (seed 1, 400 tick) | ĐẠT | player_hit={"by":"shade","flames":2,"dropped":2} tại tick 155, rơi mong đợi 2 |
| 12 | Sau khi bị chạm có invuln_s giây bất tử: không bị chạm liên tiếp | `invulnerability_window` (seed 1, 300 tick) | ĐẠT | số lần chạm=3, khoảng cách giữa 2 lần=90 tick (tối thiểu 90) |
| 13 | Hết ngọn lửa thì thua: game_over lost/no_flames, end.state = lost | `lose_no_flames` (seed 1, 2000 tick) | ĐẠT | game_over={"result":"lost","reason":"no_flames"}, end={"type":"end","ticks":35,"state":"lost","score":0} |
| 14 | Tỏa sáng làm choáng Bóng Mực trong pulse_radius, đẩy lùi pulse_push_m, tốn pulse_cost, cộng per_stun | `pulse_stuns_and_pushes` (seed 1, 2 tick) | ĐẠT | pulse={"stunned_ids":["S1"]}, S1={"id":"S1","pos":[7,1,0],"state":"stunned"}, carried=1, score=25 |
| 15 | Không đủ ánh sáng (carried < pulse_cost) thì không tỏa sáng được | `pulse_needs_light` (seed 1, 5 tick) | ĐẠT | số event pulse = 0 |
| 16 | Tỏa sáng có hồi chiêu pulse_cooldown_s | `pulse_cooldown` (seed 1, 400 tick) | ĐẠT | pulse tại tick 1, 201 (lần ở tick 30 bị hồi chiêu chặn) |
| 17 | Choáng hết sau pulse_stun_s giây thì Bóng Mực đuổi lại | `stun_wears_off` (seed 1, 300 tick) | ĐẠT | tick 120: stunned; tick 300: chase |
| 18 | Bóng Mực không vào được bán kính safe_radius quanh đèn đã thắp | `safe_radius` (seed 1, 600 tick) | ĐẠT | khoảng cách nhỏ nhất tới đèn = 4.000 (safe_radius 4), số lần chạm = 0 |
| 19 | Thắp hết 5 đèn thì thắng: game_over won/all_lit, điểm thưởng thời gian và ngọn lửa | `win_all_lit` (seed 1, 30 tick) | ĐẠT | game_over={"result":"won","reason":"all_lit"}, end={"type":"end","ticks":1,"state":"won","score":299}, điểm mong đợi 299 |
| 20 | Hết giờ (time_left_s) thì thua: game_over lost/dawn | `lose_dawn` (seed 1, 600 tick) | ĐẠT | game_over={"result":"lost","reason":"dawn"}, end={"type":"end","ticks":120,"state":"lost","score":0} |
| 21 | Mô hình tick: snapshot tick 0 trước input; --ticks N chạy đúng N bước; time_left_s = thời lượng − bước/60 | `tick_model` (seed 1, 100 tick) | ĐẠT | tick0 z=0, end.ticks=100, time_left_s@100=298.333 |
| 22 | Chế độ ngẫu nhiên: đom đóm rải rác trên đảo, Bóng Mực xuất hiện dần (event shade_spawned) | `random_world_spawns` (seed 7, 1200 tick) | ĐẠT | đom đóm ban đầu=20, shade_spawned đầu tiên ở tick 360, tổng 2 |
| 23 | Tất định: cùng seed + scenario + inputs → output giống hệt | seed 7, 3000 tick, chạy 2 lần | ĐẠT | SHA-256 lần 1 = `ec24899781a77ee6…`, lần 2 = `ec24899781a77ee6…` |
| 24 | File inputs sai định dạng → mã thoát 2 | frames trùng tick | ĐẠT | mã thoát = 2, stderr: inputs: tick của frame phải tăng nghiêm ngặt |

## Chưa đạt / chưa kiểm chứng được

- Không có mục headless nào chưa đạt ở lần chạy này.
- Phần hiển thị 3D, HUD và cảm giác chơi **không** kiểm bằng headless: xem `docs/proof/phase1/GUI.md` (ghi chú chơi thử) để biết mục nào đã/chưa kiểm.
