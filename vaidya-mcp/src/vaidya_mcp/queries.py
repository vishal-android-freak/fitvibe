"""Read queries for the MCP tools, mirroring the Go repositories so the numbers
match the app's /me/today and /me/sleep exactly. Each returns plain dicts; the
NL-summary formatting lives in formatting.py.

Source parity (Go):
  - day activity  -> internal/db/repositories/today.go:49-91, body.go:150-169
  - nutrition day -> today.go:95-156
  - sleep night   -> sleep.go:55-237
"""

from __future__ import annotations

from typing import Any

from . import db


def day_activity(user_id: int, civil_date: str) -> dict[str, Any]:
    """Steps / distance / floors / active energy / zone-minutes for a civil day.
    Mirrors body.go:150-169 — steps exclude phone + Health Connect to avoid
    double counting against the wearable."""
    row = db.fetchone(
        """
        SELECT
          COALESCE(SUM(value_count) FILTER (
            WHERE data_type='steps'
              AND COALESCE(platform,'') <> 'HEALTH_CONNECT'
              AND COALESCE(device_form_factor,'') <> 'PHONE'), 0) AS steps,
          COALESCE(SUM(value_sum) FILTER (WHERE data_type='distance'), 0) AS distance_m,
          COALESCE(SUM(value_count) FILTER (WHERE data_type='floors'), 0) AS floors,
          ROUND(COALESCE(SUM(value_sum) FILTER (WHERE data_type='active-energy-burned'), 0))::int AS active_kcal,
          COALESCE(SUM(value_count) FILTER (WHERE data_type='active-zone-minutes'), 0) AS zone_minutes
        FROM data_points
        WHERE user_id = %s AND civil_start_date = %s::date
          AND data_type IN ('steps','distance','floors','active-energy-burned','active-zone-minutes')
        """,
        (user_id, civil_date),
    )
    return row or {}


def nutrition_day(user_id: int, civil_date: str) -> dict[str, Any]:
    """Calories / carbs / fat / hydration for a civil day (today.go:95-156).
    Protein comes from the nutrient child table."""
    totals = db.fetchone(
        """
        SELECT
          ROUND(COALESCE(SUM(value_sum) FILTER (WHERE data_type='nutrition-log'), 0))::int AS calories,
          COALESCE(SUM(nutrition_carbs_grams) FILTER (WHERE data_type='nutrition-log'), 0) AS carbs_g,
          COALESCE(SUM(nutrition_fat_grams) FILTER (WHERE data_type='nutrition-log'), 0) AS fat_g,
          ROUND(COALESCE(SUM(value_sum) FILTER (WHERE data_type='active-energy-burned'), 0))::int AS burnt_kcal,
          COALESCE(SUM(value_sum) FILTER (WHERE data_type='hydration-log'), 0) AS hydration_ml
        FROM data_points
        WHERE user_id = %s AND civil_start_date = %s::date
          AND data_type IN ('nutrition-log','active-energy-burned','hydration-log')
        """,
        (user_id, civil_date),
    ) or {}
    protein = db.fetchone(
        """
        SELECT COALESCE(SUM(n.grams), 0) AS protein_g
        FROM nutrition_log_nutrients n
        JOIN data_points d ON d.id = n.data_point_id
        WHERE d.user_id = %s AND d.data_type = 'nutrition-log'
          AND d.civil_start_date = %s::date AND n.nutrient = 'PROTEIN'
        """,
        (user_id, civil_date),
    ) or {}
    totals["protein_g"] = protein.get("protein_g", 0)
    return totals


def latest_sleep(user_id: int) -> dict[str, Any] | None:
    """The most recent main (non-nap) sleep session + its stage summary
    (sleep.go:55-237). Prefers a full night over a nap, newest first."""
    night = db.fetchone(
        """
        SELECT id,
               start_time, end_time,
               COALESCE(start_utc_offset_seconds, end_utc_offset_seconds, 0) AS offset,
               (payload_json->'sleep'->'summary'->>'minutesAsleep')::int AS asleep_min
        FROM data_points
        WHERE user_id = %s AND data_type = 'sleep'
          AND start_time IS NOT NULL AND end_time IS NOT NULL
        ORDER BY COALESCE(is_nap, false) ASC, end_time DESC
        LIMIT 1
        """,
        (user_id,),
    )
    if not night:
        return None
    stages = db.fetchall(
        """
        SELECT stage_type, minutes
        FROM sleep_summary_stages
        WHERE data_point_id = %s
        ORDER BY minutes DESC
        """,
        (night["id"],),
    )
    night["stages"] = {s["stage_type"]: s["minutes"] for s in stages}
    return night
