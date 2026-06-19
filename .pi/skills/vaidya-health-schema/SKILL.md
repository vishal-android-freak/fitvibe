---
name: vaidya-health-schema
description: The exact FitVibe PostgreSQL schema (tables, columns, kebab-case data_type values, JSONB payload shapes, civil-date conventions) for writing accurate read-only SQL with the query_health_db MCP tool. Load this BEFORE writing any SQL against the health database.
---

# FitVibe health database — schema for query_health_db

Use this when answering a data question that the dedicated tools
(`get_today_summary`, `get_sleep`, `get_nutrition`, `get_readiness`,
`get_metric_trend`) don't cover, via the **`query_health_db`** tool.

## Rules for writing SQL here

1. **Read-only.** Only a single `SELECT` / `WITH … SELECT`. Writes are rejected and
   impossible (read-only DB role). No `;`-chained statements.
2. **Always filter by `user_id`.** Every per-user table has a `user_id` column. Scope
   every query to the caller's user.
3. **Group local days on `civil_start_date` (a DATE), never on a raw timestamp.**
   Instants are UTC in `TIMESTAMPTZ`; wall-clock = instant + `*_utc_offset_seconds`.
4. **`data_type` is kebab-case** (`'heart-rate'`, `'daily-resting-heart-rate'`). Use the
   exact strings in `references/schema.md`.
5. **Prefer the typed/promoted columns** (`value_avg`, `value_sum`, `value_count`,
   `nutrition_carbs_grams`, …) over digging into `payload_json`. Reach into the JSONB
   only for fields that aren't promoted (the doc lists which).
6. Results cap at 200 rows — aggregate (`SUM`/`AVG`/`GROUP BY`) rather than dumping rows.

## The single most important table: `data_points`

One row per ingested measurement/session. Key columns:

- `user_id BIGINT`, `data_type TEXT` (kebab-case), `data_point_category TEXT`
  (`interval|sample|session|daily|food`)
- Times: `sample_time`, `start_time`, `end_time` (TIMESTAMPTZ, UTC);
  `civil_start_date`, `civil_end_date` (DATE — **group local days on these**);
  `start_utc_offset_seconds`, `end_utc_offset_seconds`
- Scalars: `value_count` (int), `value_sum`, `value_avg`, `value_min`, `value_max` (float),
  `enum_value`, `enum_value_secondary`
- Promoted nutrition: `nutrition_carbs_grams`, `nutrition_fat_grams`, `meal_type`,
  `food_display_name`
- `payload_json JSONB` — the full raw API record (use for un-promoted fields)
- `is_nap BOOLEAN` (sleep only)

Which scalar holds the value depends on `data_type` — see `references/schema.md`
(e.g. steps→`value_count`, distance/energy→`value_sum`, daily-RHR/HRV→`value_avg`).

## Worked examples

```sql
-- Average resting HR over the last 30 local days
SELECT civil_start_date, value_avg AS rhr
FROM data_points
WHERE user_id = 1 AND data_type = 'daily-resting-heart-rate'
  AND civil_start_date >= CURRENT_DATE - 30
ORDER BY civil_start_date;

-- Total steps per day this week (exclude phone + Health Connect to avoid double-count)
SELECT civil_start_date, SUM(value_count) AS steps
FROM data_points
WHERE user_id = 1 AND data_type = 'steps'
  AND COALESCE(platform,'') <> 'HEALTH_CONNECT'
  AND COALESCE(device_form_factor,'') <> 'PHONE'
  AND civil_start_date >= CURRENT_DATE - 7
GROUP BY civil_start_date ORDER BY civil_start_date;

-- Deep+REM minutes for the most recent non-nap sleep
SELECT s.stage_type, s.minutes
FROM sleep_summary_stages s
JOIN data_points d ON d.id = s.data_point_id
WHERE d.user_id = 1 AND d.data_type = 'sleep' AND COALESCE(d.is_nap,false) = false
ORDER BY d.end_time DESC, s.minutes DESC LIMIT 6;

-- A field that isn't promoted: deep-sleep RMSSD from the HRV payload
SELECT civil_start_date,
       (payload_json->'dailyHeartRateVariability'
         ->>'deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds')::float AS deep_rmssd
FROM data_points
WHERE user_id = 1 AND data_type = 'daily-heart-rate-variability'
ORDER BY civil_start_date DESC LIMIT 14;
```

## Full reference

`references/schema.md` has every table, the per-`data_type` value-column mapping, the
live `data_type` list with row counts, and the JSONB payload shapes worth knowing.
Read it before writing non-trivial SQL.
