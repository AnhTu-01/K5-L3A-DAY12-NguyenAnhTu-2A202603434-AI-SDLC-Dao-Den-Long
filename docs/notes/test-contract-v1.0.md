# Test Contract v1.0 (tóm tắt để agent đọc – nguyên văn nằm ở PRD-0 trên lab board)

- `headless_cmd --seed <int> --night 1 [--scenario f] [--inputs f] --ticks <int> --out f.jsonl [--snapshot-every 10]`
- 60 tick/s cố định. Dừng khi đủ `--ticks` hoặc game kết thúc; thoát mã 0. Lỗi → mã ≠ 0 + stderr; scenario/inputs sai định dạng → mã 2.
- Đơn vị mét, Y hướng lên, mặt đất Y=0, người chơi xuất phát (0,0,0).
- Snapshot tick 0 = sau dựng scenario, trước input. Bước k đọc input tick k, sinh trạng thái k+1; sự kiện ghi tick = k+1.
- `time_left_s = thời lượng − bước/60`. Khoảng cách đo trên mặt phẳng XZ, "trong bán kính" nghĩa là ≤.
- Input: move [x,z] trong [-1,1] (chuẩn hóa nếu dài >1), `x' = x·cosθ + z·sinθ`, `z' = −x·sinθ + z·cosθ`; jump/interact/pulse kích hoạt khi false→true; frame chỉ đổi trường có mặt; tick tăng nghiêm ngặt.
- Output JSONL: `snapshot` (mỗi N tick từ 0), `event` (mote_picked, deposit, lantern_lit, pulse, player_hit, shade_spawned, game_over), dòng cuối `end`. Tọa độ làm tròn 3 số lẻ. Tất định theo (seed, scenario, inputs).
- Dựng scenario không phát sự kiện, không cộng điểm.
