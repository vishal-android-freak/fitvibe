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

from . import db, formatting, queries, sqltool
from .config import Config
from .localdate import local_date

mcp = FastMCP("vaidya")

_cfg: Config | None = None


def _ensure_started() -> None:
    """Lazily load config + open the DB pool on first use."""
    global _cfg
    if _cfg is None:
        _cfg = Config.load()
        db.init_pool(_cfg.database_url)


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


def main() -> None:
    mcp.run()  # stdio transport by default


if __name__ == "__main__":
    main()
