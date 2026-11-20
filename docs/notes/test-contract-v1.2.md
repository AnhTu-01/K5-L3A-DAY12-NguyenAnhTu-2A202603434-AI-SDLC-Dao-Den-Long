# Test Contract v1.2 (thay đổi so với v1.1)
`contract_version "1.2"`; tuning thêm `fuel_max 100, fuel_decay_per_s 1.0, fuel_per_mote 10, relight_cost 5, win_ratio 0.6, drain_per_s 5, low_fuel_threshold 30, capacity_max 20`; `night1/2/3_duration_s = 240/270/300`.
Snapshot: `lanterns[].{fuel (1 chữ số thập phân; đèn tắt = 0), ever_lit, relit_count}`, `player.capacity`, `shades[].{state ∈ …+drain, target_lantern_id}`.
Scenario: `lanterns[].{lit, fuel, ever_lit}` (lit:true không fuel → 100), `player.successful_lights`, `shades[].target_lantern_id`.
Event: `refuel {lantern_id, amount, fuel}`, `lantern_out {lantern_id}`, `fuel_drain {lantern_id, shade_id, fuel}` (mỗi 60 tick), `lantern_lit.relight`; `game_over.reason ∈ {dawn_survived, dawn, no_flames}`.
