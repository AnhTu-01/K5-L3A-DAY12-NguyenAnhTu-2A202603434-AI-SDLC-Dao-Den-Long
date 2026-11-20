# Test Contract v1.1 (thay đổi so với v1.0; bản đầy đủ trên lab board)
- `contract_version: "1.1"`; `tuning` = số chuẩn (thêm `dash_speed`, `dash_duration_s`, `dash_cooldown_s`, `night2_duration_s`, `night3_duration_s`).
- `--night 1|2|3` (khác → mã thoát ≠0). Tick 0: snapshot rồi event `night_start {night}`.
- Snapshot: thêm `night`, `wind {active, dir_deg}` (+ `warning`), `player.{vel, grounded, invuln, dash_cd_s, pulse_cd_s, charm_s}`, `motes[{id,pos,kind,ttl_s}]`, `drifters[{id,pos,state,stolen}]`, `charms[{id,pos,available,respawn_s}]`; Bóng Mực: `state` ∈ spawning/wander/chase/recoil/stunned (+ `state_ticks_left`); `state` toàn cục: playing/paused/won/lost.
- Scenario: `player.{invuln_ticks,dash_cd_ticks,pulse_cd_ticks,charm_ticks}`, `shades[].{state,state_ticks_left}`, `drifters`, `charms` (thay mặc định), `random_drifters`, `wind_enabled`.
- Input: thêm `dash`, `pause` (kích hoạt false→true).
- Event mới: `dash`, `charm_picked`, `drifter_steal`, `drifter_drop`, `night_start`, `paused`, `resumed`; `player_hit` do rơi có `lost`.
- Hiệu năng: một Đêm đầy đủ (≤21.600 tick) ≤30 s.
