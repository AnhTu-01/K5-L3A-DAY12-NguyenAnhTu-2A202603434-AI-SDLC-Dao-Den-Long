# Bằng chứng Phase 3 (Contract v1.2) (tự sinh, không sửa tay)

- Sinh bởi: `npm run proof` (scripts/proof.js)
- Commit lúc sinh: `(chưa commit)` · Node v22.23.4 · linux x64
- Mỗi dòng dưới đây chạy **chế độ headless thật** (`node src/headless.js ...`); scenario, inputs và output nằm cạnh trong `scenarios/`, `inputs/`, `outputs/`.

| # | Yêu cầu | Kịch bản | Kết quả | Chi tiết đo được |
|---|---|---|---|---|
| 1 | Nhân vật đi lại: move [0,1] đi về +Z đúng tốc độ player_speed (6 m/s) | `move_forward` (seed 1, 60 tick) | ĐẠT | z sau 60 tick = 6, mong đợi 6 |
| 2 | Vector di chuyển dài hơn 1 được chuẩn hóa về độ dài 1 | `move_diagonal_normalized` (seed 1, 60 tick) | ĐẠT | quãng đường = 6.001, x=4.243 z=4.243 |
| 3 | cam_yaw_deg=90 làm move [0,1] đi về +X (x' = z·sinθ) | `camera_yaw` (seed 1, 60 tick) | ĐẠT | pos = (6, 0) |
| 4 | Nhảy được (vận tốc 7, trọng lực −20: đỉnh ≈1.2 m) rồi chạm đất lại; không nhảy khi đang trên không | `jump` (seed 1, 120 tick) | ĐẠT | đỉnh 1.167 (mong đợi ≈1.225, nhảy lần 2 trên không không cộng thêm), cuối 0 |
| 5 | [P1→v1.1] Nhặt đom đóm trong pickup_radius=1.0: event mote_picked, carried +1. Điểm chỉ được cộng khi NẠP (+10/đom đóm), nên nhặt chưa có điểm | `pickup_mote` (seed 1, 120 tick) | ĐẠT | mote_picked=1, carried=1, score=0, tick=40 (z=4 → tick 40 vì ≤1.0 m) |
| 6 | Nhặt cần chênh cao chân–đom đóm ≤ 1.5 m: mote ở y=3 phía trên không nhặt được, mote ở y=1.2 thì được | `pickup_height_tolerance` (seed 1, 10 tick) | ĐẠT | carried=1, còn 1 mote ở y=3 |
| 7 | [P1→v1.1] Không mang quá carry_capacity = 10 | `carry_capacity` (seed 1, 30 tick) | ĐẠT | carried=10, motes còn=1 |
| 8 | [P2→v1.2] Nạp đủ lantern_cost=10 thì đèn sáng (fuel 100): deposit + lantern_lit(relight:false); điểm = 10×5 (đom đóm nạp) + 100 (thắp lần đầu); sức chứa +2 | `deposit_and_light` (seed 1, 30 tick) | ĐẠT | deposit={"lantern_id":"L1","amount":10,"deposited":10}, lit=L1, score=150 |
| 9 | [P2→v1.2] Nạp thiếu thì đèn chưa sáng, tiến độ được nhớ; +5 điểm mỗi đom đóm nạp | `deposit_partial` (seed 1, 30 tick) | ĐẠT | deposited=1, lit=false, score=5 |
| 10 | Nạp nhiều lần được, đèn nhớ tiến độ: đèn đã có 4, mang 8 → nạp min(8, còn thiếu 6) = 6, đèn sáng, còn 2 | `deposit_accumulates` (seed 1, 30 tick) | ĐẠT | deposit={"lantern_id":"L1","amount":6,"deposited":10}, carried=2 |
| 11 | [P1→v1.1] Đứng ngoài interact_radius = 2.0 thì không nạp được (2.5 m: không; 2.0 m: được) | `interact_out_of_range` (seed 1, 40 tick) | ĐẠT | deposit tại tick 31 (lần 1 ở 2.5 m bị từ chối) |
| 12 | Chỉ nạp vào MỘT đèn: đèn gần nhất; bằng nhau thì id nhỏ hơn | `interact_nearest_then_smaller_id` (seed 1, 10 tick) | ĐẠT | deposit vào L3 (L3 cách 0.5 m, gần nhất) |
| 13 | Hai đèn cách đều thì chọn id nhỏ hơn (L1) | `interact_tie_smaller_id` (seed 1, 10 tick) | ĐẠT | deposit vào L1 |
| 14 | Dựng scenario với đèn lit:true không phát sự kiện (ngoài night_start) và không cộng điểm | `setup_lit_no_score` (seed 1, 10 tick) | ĐẠT | L2.lit=true, score=0, event lạ=0 |
| 15 | [P1→v1.1] Bóng Mực (4 m/s) đuổi theo, chạm thì −1 Ngọn Lửa và rơi floor(4×0.5)=2 đom đóm | `shade_chases_and_hits` (seed 1, 400 tick) | ĐẠT | player_hit={"by":"shade","shade_id":"S1","flames":2,"dropped":2} tại tick 136 (9 m / 4 m/s ≈ 135 tick) |
| 16 | [P1→v1.1] Sau khi bị chạm Mây bất tử 90 tick: khoảng cách giữa hai lần bị chạm ≥ 90 tick | `invulnerability_window` (seed 1, 400 tick) | ĐẠT | số lần chạm=3, khoảng cách=90 tick |
| 17 | Bóng chạm lúc Mây bất tử không làm gì (không mất lửa, Bóng không recoil) | `invulnerable_shade_touch_noop` (seed 1, 60 tick) | ĐẠT | hit=0, shade=chase |
| 18 | Hết Ngọn Lửa thì thua: game_over lost/no_flames, end.state = lost | `lose_no_flames` (seed 1, 2000 tick) | ĐẠT | game_over={"result":"lost","reason":"no_flames"}, end={"type":"end","ticks":30,"state":"lost","score":0} |
| 19 | [P1→v1.1] Tỏa Sáng (3 đom đóm, bán kính 5 m): Bóng trong tầm choáng 120 tick và bị đẩy lùi tổng 4 m trong 15 tick; +5 điểm; Bóng ngoài tầm không bị ảnh hưởng | `pulse_stuns_and_pushes` (seed 1, 30 tick) | ĐẠT | pulse={"stunned_ids":["S1"],"repelled_ids":[],"dropped_ids":[]}, S1={"id":"S1","pos":[8,0,0],"state":"stunned","target_lantern_id":null,"state_ticks_left":91}, x@tick1=4.267, carried=0, score=5 |
| 20 | Tỏa Sáng đo khoảng cách 3D từ tâm (chân Mây + 0.8 m) tới Bóng: Bóng cách 4.9 m ngang nhưng thấp hơn Mây 3 m (3D > 5) không bị choáng | `pulse_range_is_3d` (seed 1, 3 tick) | ĐẠT | pulse={"stunned_ids":[],"repelled_ids":[],"dropped_ids":[]} |
| 21 | [P1→v1.1] Không đủ 3 đom đóm thì không tỏa sáng được (không event, không tốn) | `pulse_needs_light` (seed 1, 5 tick) | ĐẠT | số event pulse = 0 |
| 22 | [P1→v1.1] Tỏa Sáng hồi 3 s (180 tick) tính từ lúc kích hoạt | `pulse_cooldown` (seed 1, 400 tick) | ĐẠT | pulse tại tick 1,182 (tick 30 và 179 bị chặn, 181 được) |
| 23 | Tỏa Sáng lại làm mới choáng và đẩy lùi; mỗi lần +5 điểm kể cả con đang choáng; không giết Bóng Mực | `pulse_refreshes_stun` (seed 1, 250 tick) | ĐẠT | score=10, shade={"id":"S1","pos":[6.333,0,0],"state":"stunned","target_lantern_id":null,"state_ticks_left":61} |
| 24 | [P1→v1.1] Choáng hết sau 120 tick thì Bóng đuổi lại | `stun_wears_off` (seed 1, 150 tick) | ĐẠT | tick 120: stunned; tick 150: chase |
| 25 | [P1→v1.1] Bóng Mực ở ngoài bị chặn ở mép vùng an toàn 6 m quanh đèn đã thắp | `safe_radius` (seed 1, 600 tick) | ĐẠT | khoảng cách nhỏ nhất = 6.000, số lần chạm = 0 |
| 26 | Bóng đang ở trong vùng lúc đèn vừa thắp bị đẩy ra mép trong tối đa 30 tick và KHÔNG gây sát thương dù đang sát Mây | `safe_zone_ejects_inside_shade` (seed 1, 60 tick) | ĐẠT | khoảng cách tới đèn @5 = 1.400 (đang bị đẩy dần), @40 = 6.000, hit=0 |
| 27 | [P2→v1.2, THAY THẾ win_all_lit / win_on_timeout_tick] Không còn thắng sớm: thắp hết 5 đèn khi còn thời gian KHÔNG kết thúc Đêm | `no_early_win` (seed 1, 600 tick) | ĐẠT | end={"type":"end","ticks":600,"state":"playing","score":150}, game_over=0 |
| 28 | Thắng: sống tới bình minh với ≥ ceil(0.6×5)=3 đèn sáng; điểm = Σ(50+floor(fuel)) mỗi đèn sáng + 50×lửa; reason dawn_survived | `win_dawn_survived` (seed 1, 300 tick) | ĐẠT | game_over={"result":"won","reason":"dawn_survived"}, end={"type":"end","ticks":120,"state":"won","score":594}, mong đợi 594 |
| 29 | Ngưỡng thắng: Đêm 2 cần 4/6; 3 đèn thì thua (dawn), 4 đèn thì thắng | `dawn_threshold_per_night` (seed 1, 200 tick) | ĐẠT | 3/6 đèn: {"result":"lost","reason":"dawn"} |
| 30 | Đêm 2 với 4/6 đèn sáng lúc bình minh → thắng | `dawn_threshold_night2_win` (seed 1, 200 tick) | ĐẠT | 4/6 đèn: {"result":"won","reason":"dawn_survived"} |
| 31 | Đêm 3 cần 5/7: 4 đèn thua, tick bình minh tính cả đèn vừa hết dầu ở tick cuối | `dawn_threshold_night3` (seed 1, 200 tick) | ĐẠT | lantern_out={"type":"event","tick":60,"name":"lantern_out","data":{"lantern_id":"L5"}}, game_over={"type":"event","tick":60,"name":"game_over","data":{"result":"lost","reason":"dawn"}} (L5 hết dầu đúng tick 60 = bình minh → còn 4/7) |
| 32 | Hết Ngọn Lửa → luôn thua (no_flames) kể cả khi đủ đèn sáng | `no_flames_beats_win` (seed 1, 10 tick) | ĐẠT | game_over={"result":"lost","reason":"no_flames"} |
| 33 | Hết giờ (time_left_s) thì thua: game_over lost/dawn | `lose_dawn` (seed 1, 600 tick) | ĐẠT | game_over={"result":"lost","reason":"dawn"}, end={"type":"end","ticks":120,"state":"lost","score":0} |
| 34 | Mô hình tick: snapshot tick 0 trước input; --ticks N chạy đúng N bước; time_left_s = thời lượng − bước/60; sim_tick = tick khi không tạm dừng | `tick_model` (seed 1, 100 tick) | ĐẠT | tick0 z=0, end.ticks=100, time_left_s@100=238.333 |
| 35 | Đêm 1 ngẫu nhiên: 20 đom đóm ở 20 điểm khác nhau trong 24 điểm chuẩn; tại tick 300 sinh 2 Bóng Mực (S1,S2) ở trạng thái spawning | `random_world_night1` (seed 7, 320 tick) | ĐẠT | mote=20/20 điểm khác nhau, shade_spawned=[[300,"S1"],[300,"S2"]] |
| 36 | Đêm 1 — Đảo Bến: xuất phát (0,0,0); 5 đèn đúng tọa độ chuẩn; 240 s | `maps_night1_standard` (seed 1, 1 tick) | ĐẠT | đèn=0,0,25,23.8,0,7.7,14.7,0,-20.2,-14.7,0,-20.2,-23.8,0,7.7 |
| 37 | Đêm 2 — Đảo Cau: 6 đèn L1..L6 đúng tọa độ, 270 s, Bùa Gió C1 tại (35,0,0) | `maps_night2_standard` (seed 1, 1 tick) | ĐẠT | đèn=0,0,20,17,0,-10,-17,0,-10,70,0,20,87,0,-10,53,0,-10 |
| 38 | Đêm 3 — Đảo Chuông: 7 đèn (có đèn ở Y=6 và Y=3), 300 s, 2 Bùa Gió C1,C2, 20 đom đóm đặt trên các tầng 0/3/6 | `maps_night3_standard` (seed 3, 1 tick) | ĐẠT | đèn=0,6,6,18,3,10,-18,3,10,35,0,-10,-35,0,-10,20,0,-35,-20,0,-35, mote y=3,0,6 |
| 39 | Contract v1.1: snapshot có night, wind{active,dir_deg}, player.{vel,grounded,invuln,dash_cd_s,pulse_cd_s,charm_s}, motes{kind,ttl_s}, drifters, charms{id,available,respawn_s} | `snapshot_v11_fields` (seed 1, 2 tick) | ĐẠT | thiếu: không |
| 40 | Sinh đom đóm: tick 240, 480, … thêm 1 ở điểm trống nếu dưới 30; hết điểm trống (24 điểm Đêm 1) thì bỏ lượt | `mote_respawn_schedule` (seed 11, 1500 tick) | ĐẠT | mote@239=20, @240=21, @480=22, @960=24, @1200=24, điểm khác nhau=24 |
| 41 | Đom đóm rơi có TTL: mote dropped ttl_ticks=30 còn ở tick 29 và biến mất ở tick 30 | `mote_expiry_ttl` (seed 1, 40 tick) | ĐẠT | @29=1, @30=0 |
| 42 | Lướt: 14 m/s trong 12 tick (2.8 m) theo hướng đang quay mặt khi đứng yên; event dash; hồi 90 tick tính từ lúc bắt đầu | `dash_basic` (seed 1, 130 tick) | ĐẠT | z@12=2.8, dash tại tick 1,91 (tick 30 trong hồi chiêu bị bỏ, tick 90 được) |
| 43 | Lướt theo hướng đang di chuyển (move [1,0] → +X), không phải hướng quay mặt | `dash_direction_follows_move` (seed 1, 20 tick) | ĐẠT | pos@12 = (2.8, 0) |
| 44 | Lướt trên không giữ nguyên độ cao (không rơi trong lúc lướt) và không bất tử | `dash_air_keeps_height` (seed 1, 40 tick) | ĐẠT | y trong lướt = 0.861,0.861,0.861,0.861 |
| 45 | Bùa Gió: nhặt như đom đóm → charm_picked (600 tick); chạy 7.2 m/s; lướt không hồi chiêu (cần bấm lại; bấm khi đang lướt bị bỏ qua); hết hiệu lực sau 600 tick | `charm_pickup_speed_dash` (seed 1, 700 tick) | ĐẠT | charm={"charm_id":"C1","charm_ticks":600}, x@20=37.38, dash tại 31,44,301 (tick 37 bấm khi đang lướt bị bỏ qua) |
| 46 | Bùa Gió xuất hiện lại sau 2700 tick; nhặt lại khi đang còn hiệu lực thì làm mới 600 | `charm_respawn` (seed 1, 2800 tick) | ĐẠT | charm_picked=1, @2600 available=false respawn_s=1.683, @2800 available=true |
| 47 | Nhặt Bùa khi đang còn hiệu lực thì làm mới về 600 tick | `charm_refresh` (seed 1, 400 tick) | ĐẠT | charm_s@100 = 8.35 (600−100)/60=8.33 |
| 48 | Bục nhảy Đêm 2: chạm bục (20,0,18) bắn lên 14 m/s dọc + 24 m/s ngang về tâm đảo B, phím di chuyển không ghi đè, đáp trong đảo đích sau ≈1.4 s | `jump_pad_night2` (seed 1, 150 tick) | ĐẠT | vel@40=[22.581,4,-8.129], kết thúc tại [44.537,0,6.755] (cách tâm B 26.3 m), grounded=true |
| 49 | Bục nhảy ở đảo B (50,0,−18) bắn về tâm đảo A; vẫn lướt được trên không | `jump_pad_return` (seed 1, 150 tick) | ĐẠT | kết thúc [12.895,0,-4.28] |
| 50 | Cầu tre x∈[26,44], z∈[−2,2], không lan can: đi qua cầu được; lệch ra ngoài z>2 thì rơi | `bridge_walkable_no_rail` (seed 1, 400 tick) | ĐẠT | qua cầu, tại [46,0,0] |
| 51 | Rơi (Y<−10): đúng 1 lần −1 Ngọn Lửa, mất hết đom đóm (lost), chờ 60 tick rồi hồi sinh ở điểm xuất phát, vel 0, bất tử 90 tick | `fall_and_respawn` (seed 1, 300 tick) | ĐẠT | player_hit=[{"by":"fall","flames":2,"dropped":0,"lost":4}] tại 62; @F+59 y=-10.167; @F+60 pos=[0,0,0] invuln=true |
| 52 | Rơi bỏ qua bất tử: vẫn −1 Ngọn Lửa dù đang bất tử | `fall_ignores_invulnerability` (seed 1, 200 tick) | ĐẠT | player_hit={"by":"fall","flames":2,"dropped":0,"lost":0} |
| 53 | Rơi khi chỉ còn 1 Ngọn Lửa: thua ngay (no_flames), không hồi sinh | `fall_last_flame_loses` (seed 1, 400 tick) | ĐẠT | game_over={"result":"lost","reason":"no_flames"}, end={"type":"end","ticks":65,"state":"lost","score":0} |
| 54 | Trong 60 tick chờ hồi sinh: không bị chạm, không nhặt đom đóm | `fall_wait_untouchable` (seed 1, 200 tick) | ĐẠT | player_hit=[[62,"fall"]] |
| 55 | Dốc ở góc 30° (rộng 3 m, chân r=30 Y=0, đỉnh r=24 Y=3): đi lên dốc rồi lên tầng 1 (Y=3, grounded) | `night3_ramp_climb` (seed 1, 120 tick) | ĐẠT | y@40=1.5, cuối [16.455,3,9.5] |
| 56 | Mép tầng là vách đứng: từ tầng 0 đi vào tầng 2 (đĩa r=8 cao Y=6) bị chặn tại r=8; không leo được | `night3_cliff_is_wall` (seed 1, 400 tick) | ĐẠT | dừng tại [0,0,-8.1] |
| 57 | Bước ra khỏi mép tầng 1 thì rơi xuống tầng 0 (Y=0), không phải rơi khỏi đảo | `night3_step_off_falls_down` (seed 1, 120 tick) | ĐẠT | cuối [0,0,34] |
| 58 | Tháp chuông (trụ r=2, cao 8 m ở tâm tầng 2) chặn đường, không leo được | `night3_tower_blocks` (seed 1, 200 tick) | ĐẠT | dừng tại [0,6,2] |
| 59 | Bục nhảy Đêm 3 (0,3,13): vận tốc Y 12 + ngang 8 hướng −Z, giữ tới khi chạm đất → đáp lên tầng 2 (Y=6) | `night3_pad_to_tier2` (seed 1, 120 tick) | ĐẠT | đáp [0,6,2.067] |
| 60 | Gió mạnh Đêm 3: báo trước 2 s (tick 1680), cơn gió tick 1800–2099 (300 tick) theo hướng ngẫu nhiên đẩy 2 m/s (≈10 m trong 5 s); tắt được bằng wind_enabled:false | `wind_gust_night3` (seed 4, 2200 tick) | ĐẠT | báo trước@1700=true, active@1801=true, @2099=true, @2100=false, đi 10.00 m hướng 332.5° (dir_deg 332.509) |
| 61 | wind_enabled:false (hoặc Đêm 1, 2) → không có gió, người đứng yên không bị đẩy | `wind_disabled` (seed 4, 2000 tick) | ĐẠT | pos=[0,0,-30] |
| 62 | Bóng Mực dùng đúng tên trạng thái; wander→chase khi ≤12 m; chase→wander khi >18 m | `shade_fsm_detect_and_lose` (seed 1, 3 tick) | ĐẠT | trạng thái = {"S1":"chase","S2":"wander","S3":"wander"} |
| 63 | Bóng gây hit lùi 2 m trong 60 tick (recoil) rồi đuổi lại; hit làm rơi đom đóm dạng dropped (ttl 8 s) quanh Mây 1.5–2.5 m | `shade_recoil_after_hit` (seed 1, 70 tick) | ĐẠT | recoil@1=recoil, dịch 1.90 m, mote rơi=3 r=1.50,2.00,2.50 ttl=8 |
| 64 | Lịch sinh Đêm 1: 2 con tại tick 300, sau đó 1 con mỗi 480 tick (780, 1260…), id S1, S2, S3…; trạng thái ban đầu spawning | `shade_schedule_night1` (seed 2, 1300 tick) | ĐẠT | shade_spawned = [[300,"S1"],[300,"S2"],[780,"S3"],[1260,"S4"]] |
| 65 | Khoảng sinh Đêm 2 = 7 s (420 tick), Đêm 3 = 6 s (360 tick) | `shade_schedule_night2_night3` (seed 2, 800 tick) | ĐẠT | Đêm 2: [300,300,720] |
| 66 | Đêm 3: Bóng Mực sinh mỗi 360 tick (300, 660, …), nhanh 4.5 m/s | `shade_schedule_night3` (seed 2, 700 tick) | ĐẠT | Đêm 3: [300,300,660] |
| 67 | Tối đa 6 Bóng Mực ở Đêm 1 (chạy trọn một Đêm 14.400 tick) | `shade_cap_night1` (seed 5, 14400 tick) | ĐẠT | số Bóng lớn nhất = 6 |
| 68 | Đẩy lùi dừng khi gặp vật cản: Bóng bị đẩy về phía vách tầng 2 (Đêm 3) dừng ở r≥8 | `knockback_stops_at_wall` (seed 1, 40 tick) | ĐẠT | Bóng dừng ở r=8.100 |
| 69 | Gió Lạc: idle→chase khi Mây mang ≥5 đom đóm và ≤15 m; chạm (≤1.2 m) cướp min(3, đang mang) rồi flee 240 tick và biến mất cùng số đã cướp; không mất Ngọn Lửa; chỉ cướp 1 lần | `drifter_steals` (seed 1, 400 tick) | ĐẠT | steal=[[76,{"drifter_id":"D1","amount":3,"carried":3}]], D1@5=chase, cuối còn 0 Gió Lạc |
| 70 | Mang <5 đom đóm thì Gió Lạc không đuổi (idle lượn chậm 2 m/s); điều kiện mất thì về idle | `drifter_idle_below_threshold` (seed 1, 120 tick) | ĐẠT | D1: idle → idle, pos [13.714,2,1.274] |
| 71 | Bất tử của Mây không ngăn bị cướp | `drifter_steals_through_invuln` (seed 1, 20 tick) | ĐẠT | steal=[{"drifter_id":"D1","amount":3,"carried":3}] |
| 72 | Tỏa Sáng trúng Gió Lạc đang chase → flee, không cướp | `drifter_pulse_while_chase` (seed 1, 100 tick) | ĐẠT | D1={"id":"D1","pos":[4.583,1,0],"state":"flee","stolen":0} |
| 73 | Tỏa Sáng trúng Gió Lạc đang flee có mang đồ → thả lại toàn bộ (drifter_drop), thành đom đóm rơi, biến mất sau 120 tick; không cộng điểm per_stun | `drifter_pulse_drops_stolen` (seed 1, 130 tick) | ĐẠT | drop={"drifter_id":"D1","amount":3}, mote@60=3, @121=0 |
| 74 | Gió Lạc (Đêm 2/3): sinh tại tick 1200, 2400, …; tối đa 2; id D1, D2; Đêm 1 không có | `drifter_schedule` (seed 3, 3700 tick) | ĐẠT | @1100=0, @1200=1, @2400=2, @3600=2 |
| 75 | Đèn sáng hao 1.0 fuel/giây (1/60 mỗi tick); snapshot có fuel (1 chữ số thập phân), ever_lit, relit_count; đèn tắt fuel 0 | `fuel_decay_and_snapshot` (seed 1, 600 tick) | ĐẠT | L1={"id":"L1","pos":[0,0,25],"lit":true,"deposited":0,"fuel":90,"ever_lit":true,"relit_count":0}, L2={"id":"L2","pos":[23.8,0,7.7],"lit":false,"deposited":0,"fuel":0,"ever_lit":false,"relit_count":0} |
| 76 | Hết dầu (fuel ≤ 0): đèn tắt, deposited = 0, event lantern_out đúng tick, ever_lit giữ true | `lantern_out_at_zero` (seed 1, 100 tick) | ĐẠT | lantern_out=[60], @59={"id":"L1","pos":[0,0,25],"lit":true,"deposited":10,"fuel":0,"ever_lit":true,"relit_count":0}, @60={"id":"L1","pos":[0,0,25],"lit":false,"deposited":0,"fuel":0,"ever_lit":true,"relit_count":0} |
| 77 | Châm dầu: used = min(mang, ceil((100−fuel)/10)); fuel += 10×used (tối đa 100); +5 điểm mỗi đom đóm; event refuel; không đổi sức chứa | `refuel_lit_lantern` (seed 1, 5 tick) | ĐẠT | refuel={"lantern_id":"L1","amount":3,"fuel":70}, score=15 |
| 78 | Châm dầu không vượt 100 và chỉ dùng đủ số đom đóm cần (fuel 40 → cần ceil(60/10)=7 dù mang 9) | `refuel_caps_at_100` (seed 1, 5 tick) | ĐẠT | refuel={"lantern_id":"L1","amount":7,"fuel":100}, carried=2 |
| 79 | Chọn đèn khi tương tác chỉ xét đèn nhận được: đèn tắt hoặc sáng chưa đầy; gần nhất, bằng nhau id nhỏ | `refuel_selects_nearest_receivable` (seed 1, 5 tick) | ĐẠT | deposit=[{"lantern_id":"L2","amount":4,"deposited":4}], refuel=0 (L2 gần nhất 1 m, L3 1 m cũng thế nhưng id lớn hơn) |
| 80 | Đèn đã từng sáng (ever_lit) thắp lại chỉ cần 5 đom đóm; +40 điểm (không phải +100) + 5/đom đóm; lantern_lit relight:true; relit_count +1; sức chứa +2 | `relight_cost_5_and_points` (seed 1, 5 tick) | ĐẠT | lit={"lantern_id":"L1","relight":true}, score=65 |
| 81 | Đèn chưa từng sáng vẫn cần 10: nạp 5 chưa sáng | `never_lit_still_needs_10` (seed 1, 5 tick) | ĐẠT | L1={"id":"L1","pos":[0,0,25],"lit":false,"deposited":5,"fuel":0,"ever_lit":false,"relit_count":0} |
| 82 | Sức chứa = 10 + 2×successful_lights, tối đa 20; đèn đặt sẵn bằng scenario không tính | `capacity_grows_and_caps` (seed 1, 2 tick) | ĐẠT | capacity với đèn đặt sẵn = 10 |
| 83 | successful_lights=3 → 16; 9 → 20; 12 → vẫn 20 | `capacity_formula_scenario` (seed 1, 1 tick) | ĐẠT | capacity=16 |
| 84 | Sức chứa tối đa 20 (successful_lights=12) và giới hạn nhặt theo sức chứa mới (mang 16/16 không nhặt thêm) | `capacity_max_20` (seed 1, 5 tick) | ĐẠT | capacity=20, carried=20, mote còn 1 |
| 85 | Đèn fuel < 30 mất vùng an toàn: Bóng Mực vào được; đèn fuel 50 thì vẫn chặn | `low_fuel_loses_safe_zone` (seed 1, 400 tick) | ĐẠT | số lần bị chạm = 3 (Bóng vào vùng của đèn yếu) |
| 86 | Đúng 30 vẫn còn vùng an toàn (chỉ fuel < 30 mới mất): fuel 30.0 sau tick 1 → Bóng cách đèn 6.0 m bị giữ ở mép; sang tick 2 (29.98) thì vào được | `fuel_exactly_30_keeps_safe_zone` (seed 1, 3 tick) | ĐẠT | fuel@1=30, d@1=6.000, d@2=5.933 |
| 87 | Đèn fuel 50 (≥30) vẫn có vùng an toàn | `fuel_50_keeps_safe_zone` (seed 1, 400 tick) | ĐẠT | khoảng cách nhỏ nhất 6.00 |
| 88 | Bóng wander đi tới đèn sáng fuel<30 gần nhất (không phải đèn tắt gần hơn); target_lantern_id báo trong snapshot | `shade_wander_targets_weak_lantern` (seed 1, 120 tick) | ĐẠT | target=L1, pos=[13,0,30] (đèn tắt L2 gần hơn nhưng đèn yếu L1 được ưu tiên) |
| 89 | Không có đèn yếu thì đi về đèn tắt gần nhất | `shade_wander_goes_to_unlit_when_no_weak` (seed 1, 60 tick) | ĐẠT | target=L2 |
| 90 | Bóng wander tới đèn yếu (≤2 m) → drain (đứng yên, hút 5/s cộng với hao 1/s) → fuel_drain mỗi 60 tick → lantern_out → Bóng về wander; deposited=0 | `shade_drain_cycle` (seed 1, 1200 tick) | ĐẠT | drain tại tick 70, lantern_out tick 172, fuel_drain=1, sau đó wander |
| 91 | Hút 5 fuel/s mỗi con, nhiều con cộng dồn, đèn vẫn tự hao 1/s: 2 con + hao = 11/s | `drain_rate_and_stacking` (seed 1, 60 tick) | ĐẠT | fuel@60=14 (mong đợi 25−11=14), fuel_drain=2 (mỗi con 1 lần tại tick 60) |
| 92 | drain → chase khi Mây vào trong 6 m | `drain_to_chase_when_player_near` (seed 1, 3 tick) | ĐẠT | state=chase |
| 93 | Tỏa Sáng trúng Bóng đang drain: choáng, tổng +15 điểm (không phải +5); hết choáng thì về wander (không phải chase) | `drain_pulse_scores_15_and_returns_to_wander` (seed 1, 200 tick) | ĐẠT | score@1=15, state@1=stunned, @140=wander |
| 94 | drain → wander nếu cách đèn > 2 m (hoặc đèn không còn sáng / fuel ≥ 30) | `drain_to_wander_when_far_from_lantern` (seed 1, 3 tick) | ĐẠT | S1=wander, S2=wander |
| 95 | Đèn được châm dầu lên ≥30 lúc có Bóng trong vùng 6 m: bị đẩy ra mép trong ≤30 tick và không gây sát thương | `refuel_to_30_ejects_shades_no_damage` (seed 1, 60 tick) | ĐẠT | khoảng cách tới đèn @40=6.00, hit=0 |
| 96 | Hết Ngọn Lửa luôn thua (no_flames) trước khi xét bình minh, kể cả đủ đèn | `no_flames_at_dawn_tick` (seed 1, 200 tick) | ĐẠT | game_over={"type":"event","tick":1,"name":"game_over","data":{"result":"lost","reason":"no_flames"}} |
| 97 | Scenario đặt lit:true mà không có fuel → fuel mặc định 100; ever_lit tự = true | `scenario_lit_default_fuel_100` (seed 1, 1 tick) | ĐẠT | L1={"id":"L1","pos":[0,0,25],"lit":true,"deposited":0,"fuel":100,"ever_lit":true,"relit_count":0}, L2={"id":"L2","pos":[23.8,0,7.7],"lit":true,"deposited":0,"fuel":55,"ever_lit":true,"relit_count":0} |
| 98 | Contract v1.2: lantern.{fuel,ever_lit,relit_count}, player.capacity, shade.target_lantern_id, trạng thái drain hợp lệ | `snapshot_v12_fields` (seed 1, 2 tick) | ĐẠT | thiếu: không |
| 99 | Tạm dừng: tick vẫn tăng nhưng sim_tick, thời gian, hồi chiêu, spawn, TTL đứng yên; state "paused"; events paused/resumed; tiếp tục chạy bình thường sau đó | `pause_freezes_logic` (seed 1, 100 tick) | ĐẠT | @11 paused, @30 sim_tick=10 paused, paused tại 11, resumed tại 51, @60 sim_tick=20 |
| 100 | Tất định: cùng seed + scenario + inputs → output giống hệt | seed 7, 3000 tick, chạy 2 lần | ĐẠT | SHA-256 lần 1 = `5c5547dca9e9ec2c…`, lần 2 = `5c5547dca9e9ec2c…` |
| 101 | File inputs sai định dạng → mã thoát 2 | frames trùng tick | ĐẠT | mã thoát = 2, stderr: inputs: tick của frame phải tăng nghiêm ngặt |

## Chưa đạt / chưa kiểm chứng được

- Không có mục headless nào chưa đạt ở lần chạy này.
- Phần hiển thị 3D, HUD và cảm giác chơi **không** kiểm bằng headless: xem `docs/proof/phase3/GUI.md` (ghi chú chơi thử) để biết mục nào đã/chưa kiểm.
