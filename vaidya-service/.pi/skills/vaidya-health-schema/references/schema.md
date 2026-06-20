# FitVibe health DB — full reference

Source of truth: `backend/internal/db/migrations/001_initial_schema.sql` (+ `002`–`005`).
PostgreSQL. All instants are UTC `TIMESTAMPTZ`; local days key on `civil_start_date` (DATE).

## Tables

### `users` (one row per user)
`id BIGINT PK`, `google_user_id TEXT` (= Firebase uid), `health_user_id TEXT`,
`email`, `google_display_name`, `google_picture`, `google_gender`,
`height_meters DOUBLE`, `weight_kg DOUBLE`, `age INT` (no birth_date),
`distance_unit`, `weight_unit`, `height_unit`, `temperature_unit`, `time_zone TEXT`,
`utc_offset TEXT`, `target_bed_minutes INT`, `target_wake_minutes INT`,
`created_at`, `updated_at`. **Tokens are BYTEA — never select or expose them.**

### `data_points` (the main measurement table — see SKILL.md for the column list)
Indexed on `(user_id, data_type, start_time)`, `(…, sample_time)`,
`(…, civil_start_date)`, `(…, enum_value)`. `payload_json` is JSONB.

### Child tables (FK `data_point_id → data_points.id`, `ON DELETE CASCADE`)
- `sleep_stages(start_time, end_time, stage_type, *_utc_offset_seconds)` — per-segment hypnogram. `stage_type` ∈ `DEEP, REM, LIGHT, AWAKE`.
- `sleep_summary_stages(stage_type, minutes, count)` — per-night totals per stage.
- `sleep_out_of_bed_segments(start_time, end_time, …)`
- `exercise_splits(start_time, end_time, active_duration_seconds, split_type, metrics_summary_json)`
- `exercise_events(event_time, event_type, event_utc_offset_seconds)`
- `nutrition_log_nutrients(nutrient TEXT, grams DOUBLE)` — e.g. `nutrient='PROTEIN'`, `'DIETARY_FIBER'`, `'SODIUM'`.
- `daily_heart_rate_zones(zone_type, min_bpm, max_bpm)`
- `active_minutes_by_level(activity_level, minutes)`
- `irregular_rhythm_alert_windows(start_time, end_time, positive BOOL, heart_beats_json)`
- `electrocardiogram_waveforms(result_classification, beats_per_minute_avg, sampling_frequency_hertz, …)`

### `health_data_records` (clean per-day metric surface — handy for trends)
`user_id`, `record_date DATE`, `metric_name TEXT`, `metric_value DOUBLE`,
`metric_unit TEXT`, `source`, `data_type`. UNIQUE `(user_id, record_date, metric_name, source)`.

### `rollup_data_points` (pre-aggregated rollups)
Aggregate columns are `count_sum`, `count_avg`, `count_min`, `count_max`,
`distance_meters_sum`, `energy_kcal_sum`, `duration_seconds_sum` —
**NOT `value_*`** (those are on `data_points`). Plus `rollup_kind`, `window_size`,
`civil_start_date`, `data_type`.

### `food_items` (food catalog) — `food_id`, `display_name`, `brand`, `nutrients_json`, …

## Which scalar column holds the value, by data_type

| data_type | column | unit |
|---|---|---|
| `steps` | `value_count` | count (filter out `platform='HEALTH_CONNECT'`, `device_form_factor='PHONE'`) |
| `floors`, `active-zone-minutes` | `value_count` | count / minutes |
| `distance` | `value_sum` | meters |
| `active-energy-burned`, `total-calories` | `value_sum` | kcal |
| `heart-rate` | `value_avg`/`value_min`/`value_max` | bpm (very high row count — aggregate!) |
| `daily-resting-heart-rate` | `value_avg` | bpm |
| `daily-heart-rate-variability` | `value_avg` | ms (also deep-RMSSD in payload, below) |
| `daily-oxygen-saturation`, `oxygen-saturation` | `value_avg` | % |
| `daily-respiratory-rate`, `respiratory-rate-sleep-summary` | `value_avg` | breaths/min |
| `weight` | `value_avg` (or `payload_json->'weight'->>'weightGrams'`) | kg / grams |
| `vo2-max`, `run-vo2-max`, `daily-vo2-max` | `value_avg` | ml/kg/min |
| `nutrition-log` | `value_sum` = kcal; `nutrition_carbs_grams`, `nutrition_fat_grams`, `meal_type`, `food_display_name` promoted; protein via `nutrition_log_nutrients` | |
| `hydration-log` | `value_sum` | ml |
| `sleep` | use `sleep_summary_stages` / `sleep_stages`; `payload_json->'sleep'->'summary'->>'minutesAsleep'` | |

## Live `data_type` values present (with row counts, ~Jun 2026)

Use these EXACT strings. High-volume types (heart-rate especially) must be aggregated:

```
heart-rate                        404621   time-in-heart-rate-zone    15784
active-energy-burned                9093   oxygen-saturation           5458
steps                               2780   active-minutes              2119
distance                            1950   heart-rate-variability       877
sedentary-period                     233   swim-lengths-data            226
active-zone-minutes                  130   nutrition-log                 67
daily-heart-rate-zones                32   respiratory-rate-sleep-summary 17
sleep                                 13   daily-resting-heart-rate      11
daily-sleep-temperature-derivations   10   daily-respiratory-rate        10
daily-heart-rate-variability          10   daily-oxygen-saturation        9
hydration-log                          7   weight                         5
exercise                               2   height                         1
```
(Other types from the canonical list may appear as more data syncs:
`blood-glucose, body-fat, body-temperature, blood-pressure, floors, total-calories,
altitude, calories-in-heart-rate-zone, activity-level, electrocardiogram,
irregular-rhythm-notification, vo2-max, run-vo2-max`.)

## JSONB payload shapes worth knowing (un-promoted fields)

- HRV deep-sleep RMSSD (the readiness driver):
  `payload_json->'dailyHeartRateVariability'->>'deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds'` (float)
  Also `averageHeartRateVariabilityMilliseconds`, `nonRemHeartRateBeatsPerMinute`, `entropy`.
- Sleep summary: `payload_json->'sleep'->'summary'->>'minutesAsleep'` / `'minutesInSleepPeriod'`.
- Skin-temp delta: `payload_json->'dailySleepTemperatureDerivations'->>'nightlyTemperatureCelsius'`
  minus `'baselineTemperatureCelsius'` (filter out the string `'NaN'`).
- Nutrition: `payload_json->'nutritionLog'->'energy'->>'kcal'`, `->'mealType'`,
  `->'totalCarbohydrate'->>'grams'`, `->'nutrients'` (array of `{nutrient, quantity:{grams}}`).
- Hydration: `payload_json->'hydrationLog'->'amountConsumed'->>'milliliters'`.
- Weight: `payload_json->'weight'->>'weightGrams'`.

## Time/zone conventions

- Group local days on `civil_start_date` (sleep often keys on `civil_end_date` — the wake day).
- Wall-clock = UTC instant + `start_utc_offset_seconds` (e.g. `19800` = +05:30 IST).
- "Today" = the user's local civil date (latest known offset applied to now()).
