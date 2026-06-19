"""Vaidya MCP server (FastMCP, stdio).

Read tools query Postgres directly via the read-only role; write tools (added
next) call the Google Health API using a token fetched from the Go provider.
The DB credentials and Google tokens live only in this process — never in the
Pi/LLM context.

Run:  python -m vaidya_mcp.server   (stdio transport, spawned by the Vaidya host)
"""

from __future__ import annotations

import datetime as dt
from decimal import Decimal
from typing import Any

from fastmcp import FastMCP

from . import db, formatting, google, queries, sqltool
from .config import Config
from .localdate import local_date

mcp = FastMCP("vaidya")

_cfg: Config | None = None


def _ensure_started() -> Config:
    """Lazily load config + open the DB pool on first use. Returns the config."""
    global _cfg
    if _cfg is None:
        _cfg = Config.load()
        db.init_pool(_cfg.database_url)
    return _cfg


def _parse_when(when: str | None) -> dt.datetime | None:
    """Parse an optional ISO-8601 instant; None means "now". Naive input is
    assumed UTC. Used by the write tools' optional `when` argument."""
    if not when:
        return None
    s = when.replace("Z", "+00:00")
    t = dt.datetime.fromisoformat(s)
    if t.tzinfo is None:
        t = t.replace(tzinfo=dt.timezone.utc)
    return t.astimezone(dt.timezone.utc).replace(microsecond=0)


@mcp.tool
def ping() -> str:
    """Health check: confirms the MCP server can reach Postgres (read-only role)."""
    _ensure_started()
    return "ok" if db.ping() else "db unreachable"


@mcp.tool
def get_today_summary(user_id: int) -> str:
    """Today's activity for a user: steps, distance, floors, active energy, and
    active-zone minutes, for their local civil day. Returns a one-line summary."""
    _ensure_started()
    date = local_date(user_id)
    return formatting.fmt_today(date, queries.day_activity(user_id, date))


@mcp.tool
def get_nutrition(user_id: int, date: str | None = None) -> str:
    """Calories, macros (carbs/fat/protein), and hydration for a user's day.
    `date` is YYYY-MM-DD; defaults to today (the user's local civil day)."""
    _ensure_started()
    d = date or local_date(user_id)
    return formatting.fmt_nutrition(d, queries.nutrition_day(user_id, d))


@mcp.tool
def get_sleep(user_id: int) -> str:
    """The user's most recent main sleep (prefers a full night over a nap):
    time asleep and the deep/REM/light/awake stage breakdown."""
    _ensure_started()
    return formatting.fmt_sleep(queries.latest_sleep(user_id))


def _jsonable(v: Any) -> Any:
    """Coerce Postgres types the JSON encoder can't handle (dates, Decimal)."""
    if isinstance(v, (dt.date, dt.datetime, dt.time)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return float(v)
    return v


@mcp.tool
def query_health_db(sql: str) -> dict[str, Any]:
    """Run a READ-ONLY SQL query against the FitVibe health database and return
    the rows. Use this for questions the dedicated tools (get_today_summary,
    get_sleep, get_nutrition, get_readiness, get_metric_trend) don't cover.

    SAFETY: only a single SELECT / WITH query is allowed; writes are impossible
    (the connection is a read-only role). Always filter by the user's user_id.
    Load the `vaidya-health-schema` skill FIRST so you use the exact table names,
    column names, and kebab-case data_type values — otherwise your SQL will be
    wrong. Results are capped at 200 rows.
    """
    _ensure_started()
    try:
        result = sqltool.run(sql)
    except sqltool.UnsafeQuery as e:
        return {"error": f"rejected: {e}", "columns": [], "rows": [], "row_count": 0}
    except Exception as e:  # surface DB errors back to the model to self-correct
        return {"error": f"query failed: {e}", "columns": [], "rows": [], "row_count": 0}
    result["rows"] = [{k: _jsonable(v) for k, v in row.items()} for row in result["rows"]]
    return result


# --- write tools (Google Health API) ---------------------------------------
# Only the 7 manually-loggable types are writable. Each fetches a fresh token
# from the Go provider, POSTs the proven payload, and returns a confirmation.
# Written data syncs back into Postgres via Go ingestion (mention the lag).

_SYNCED = "Logged to Google Health — it'll appear on your Today/Body screen after the next sync."


def _confirm(result: dict[str, Any], what: str) -> str:
    if not result.get("ok"):
        return f"Couldn't log {what}: {result.get('error', 'unknown error')}"
    return f"{what} logged. {_SYNCED}"


@mcp.tool
def log_hydration(user_id: int, milliliters: float, when: str | None = None) -> str:
    """Log water/fluid intake (in milliliters) for a user. `when` is an optional
    ISO-8601 instant; defaults to now."""
    cfg = _ensure_started()
    body = google.build_hydration(user_id, milliliters, _parse_when(when))
    return _confirm(google.write_data_point(cfg, user_id, "hydration-log", body), f"{int(milliliters)} ml water")


@mcp.tool
def log_nutrition(
    user_id: int,
    calories: float | None = None,
    carbs_g: float | None = None,
    fat_g: float | None = None,
    protein_g: float | None = None,
    meal_type: str | None = None,
    food_name: str | None = None,
    when: str | None = None,
) -> str:
    """Log a meal/food. Provide whatever is known: calories (kcal), macros in
    grams, meal_type (BREAKFAST|LUNCH|DINNER|SNACK), a food name, and an optional
    ISO-8601 `when` (defaults to now)."""
    cfg = _ensure_started()
    body = google.build_nutrition(
        user_id, calories, carbs_g, fat_g, protein_g, meal_type, food_name, _parse_when(when)
    )
    label = food_name or (meal_type.title() if meal_type else "meal")
    return _confirm(google.write_data_point(cfg, user_id, "nutrition-log", body), label)


@mcp.tool
def log_weight(user_id: int, weight_kg: float, when: str | None = None) -> str:
    """Log a body-weight measurement in kilograms. `when` optional (defaults to now)."""
    cfg = _ensure_started()
    body = google.build_weight(user_id, weight_kg, _parse_when(when))
    return _confirm(google.write_data_point(cfg, user_id, "weight", body), f"{weight_kg} kg")


@mcp.tool
def log_body_fat(user_id: int, percent: float, when: str | None = None) -> str:
    """Log a body-fat percentage measurement. `when` optional (defaults to now)."""
    cfg = _ensure_started()
    body = google.build_body_fat(user_id, percent, _parse_when(when))
    return _confirm(google.write_data_point(cfg, user_id, "body-fat", body), f"{percent}% body fat")


@mcp.tool
def log_height(user_id: int, height_cm: float, when: str | None = None) -> str:
    """Log a height measurement in centimeters. `when` optional (defaults to now)."""
    cfg = _ensure_started()
    body = google.build_height(user_id, height_cm, _parse_when(when))
    return _confirm(google.write_data_point(cfg, user_id, "height", body), f"{height_cm} cm")


@mcp.tool
def log_exercise(
    user_id: int,
    exercise_type: str,
    start: str,
    duration_minutes: int,
    calories: float | None = None,
    distance_km: float | None = None,
    display_name: str | None = None,
) -> str:
    """Log a workout session. `exercise_type` is an enum like RUNNING/WALKING/
    CYCLING; `start` is an ISO-8601 instant; `duration_minutes` the length.
    Optional calories (kcal), distance_km, and a display name."""
    cfg = _ensure_started()
    start_t = _parse_when(start)
    if start_t is None:
        return "Couldn't log workout: a start time is required."
    dist_m = distance_km * 1000 if distance_km is not None else None
    body = google.build_exercise(
        user_id, exercise_type, start_t, duration_minutes * 60, calories, dist_m, display_name
    )
    return _confirm(
        google.write_data_point(cfg, user_id, "exercise", body),
        display_name or exercise_type.title(),
    )


@mcp.tool
def log_sleep(user_id: int, start: str, end: str, minutes_asleep: int | None = None) -> str:
    """Log a sleep session. `start` and `end` are ISO-8601 instants; optional
    minutes_asleep. (Sleep is usually device-recorded — use only for manual
    entry.)"""
    cfg = _ensure_started()
    start_t, end_t = _parse_when(start), _parse_when(end)
    if start_t is None or end_t is None:
        return "Couldn't log sleep: start and end times are required."
    body = google.build_sleep(user_id, start_t, end_t, minutes_asleep)
    return _confirm(google.write_data_point(cfg, user_id, "sleep", body), "sleep session")


def main() -> None:
    mcp.run()  # stdio transport by default


if __name__ == "__main__":
    main()
