"""Google Health API write client for the MCP write tools.

Tokens come from the Go internal token provider (Go is the sole token authority —
we never refresh here). The provider listens on a Unix socket (prod/Pi) or a
loopback TCP port (dev); GO_TOKEN_SOCKET wins when set, else GO_TOKEN_URL.

Writable data types (Google Health v4 — only manually-logged data is writable):
  nutrition-log, hydration-log, weight, body-fat, height, exercise, sleep.

Every write is POST /v4/users/{health_user_id}/dataTypes/{dataType}/dataPoints
with the union envelope proven against the live API (see
backend/docs/google-health-write-payloads.md). Civil times are derived by the
API from RFC3339 + offset, so we send only the instants + offset.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

import httpx

from . import db
from .config import Config


# ---- token provider ---------------------------------------------------------

def _token_for(cfg: Config, user_id: int | None, google_user_id: str | None) -> str:
    """Fetch a fresh Google access token from the Go provider."""
    params = {}
    if user_id is not None:
        params["user_id"] = str(user_id)
    elif google_user_id:
        params["google_user_id"] = google_user_id
    else:
        raise ValueError("user_id or google_user_id required")

    headers = {}
    if cfg.internal_token_secret:
        headers["Authorization"] = f"Bearer {cfg.internal_token_secret}"

    # Socket vs TCP differ only in transport + base URL (the host is ignored for
    # a UDS transport, so any URL works there). The request is otherwise identical.
    if cfg.go_token_socket:
        client = httpx.Client(transport=httpx.HTTPTransport(uds=cfg.go_token_socket), timeout=15)
        url = "http://localhost/google-token"
    else:
        client = httpx.Client(timeout=15)
        url = f"{cfg.go_token_url}/google-token"

    with client as c:
        r = c.get(url, params=params, headers=headers)
    r.raise_for_status()
    return r.json()["access_token"]


# ---- health_user_id lookup (the API path key) -------------------------------

def _health_user_id(user_id: int) -> str:
    row = db.fetchone("SELECT health_user_id FROM users WHERE id = %s", (user_id,))
    if not row or not row.get("health_user_id"):
        raise ValueError(f"no health_user_id for user {user_id}")
    return row["health_user_id"]


def _latest_offset_seconds(user_id: int) -> int:
    row = db.fetchone(
        """
        SELECT start_utc_offset_seconds AS off FROM data_points
        WHERE user_id = %s AND start_utc_offset_seconds IS NOT NULL
        ORDER BY COALESCE(start_time, sample_time) DESC LIMIT 1
        """,
        (user_id,),
    )
    return int(row["off"]) if row and row.get("off") is not None else 0


# ---- time helpers -----------------------------------------------------------

def _now_utc() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0)


def _rfc(t: dt.datetime) -> str:
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def _interval(when: dt.datetime, offset: int, span_seconds: int = 30) -> dict[str, Any]:
    off = f"{offset}s"
    return {
        "startTime": _rfc(when),
        "endTime": _rfc(when + dt.timedelta(seconds=span_seconds)),
        "startUtcOffset": off,
        "endUtcOffset": off,
    }


def _sample_time(when: dt.datetime, offset: int) -> dict[str, Any]:
    return {"physicalTime": _rfc(when), "utcOffset": f"{offset}s"}


_SOURCE = {"platform": "FITBIT", "recordingMethod": "MANUAL"}


# ---- the write call ---------------------------------------------------------

def write_data_point(
    cfg: Config, user_id: int, data_type: str, body_union: dict[str, Any]
) -> dict[str, Any]:
    """POST one DataPoint to Google. body_union is the typed union object, e.g.
    {"hydrationLog": {...}}. Returns {"ok", "name"} or {"ok": False, "error"}."""
    token = _token_for(cfg, user_id, None)
    hu = _health_user_id(user_id)
    payload = {"dataSource": dict(_SOURCE), **body_union}
    url = f"{cfg.google_ha_base}/users/{hu}/dataTypes/{data_type}/dataPoints"
    try:
        with httpx.Client(timeout=30) as c:
            r = c.post(
                url,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=payload,
            )
    except httpx.HTTPError as e:
        return {"ok": False, "error": f"network error: {e}"}
    if r.status_code != 200:
        return {"ok": False, "error": f"google returned {r.status_code}: {r.text[:400]}"}
    name = ""
    try:
        name = r.json().get("response", {}).get("name", "")
    except Exception:
        pass
    return {"ok": True, "name": name}


# ---- payload builders (one per writable type) -------------------------------

def build_nutrition(
    user_id: int,
    calories: float | None,
    carbs_g: float | None,
    fat_g: float | None,
    protein_g: float | None,
    meal_type: str | None,
    food_name: str | None,
    when: dt.datetime | None,
) -> dict[str, Any]:
    offset = _latest_offset_seconds(user_id)
    log: dict[str, Any] = {"interval": _interval(when or _now_utc(), offset)}
    if calories is not None:
        log["energy"] = {"kcal": calories, "userProvidedUnit": "KILOCALORIE"}
    if meal_type:
        log["mealType"] = meal_type.upper()
    if food_name:
        log["foodDisplayName"] = food_name
    if carbs_g is not None:
        log["totalCarbohydrate"] = {"grams": carbs_g}
    if fat_g is not None:
        log["totalFat"] = {"grams": fat_g}
    nutrients = []
    if protein_g is not None:
        nutrients.append({"nutrient": "PROTEIN", "quantity": {"grams": protein_g}})
    if nutrients:
        log["nutrients"] = nutrients
    return {"nutritionLog": log}


def build_hydration(user_id: int, milliliters: float, when: dt.datetime | None) -> dict[str, Any]:
    offset = _latest_offset_seconds(user_id)
    return {
        "hydrationLog": {
            "interval": _interval(when or _now_utc(), offset),
            "amountConsumed": {"milliliters": milliliters, "userProvidedUnit": "MILLILITER"},
        }
    }


def build_weight(user_id: int, weight_kg: float, when: dt.datetime | None) -> dict[str, Any]:
    offset = _latest_offset_seconds(user_id)
    return {
        "weight": {
            "sampleTime": _sample_time(when or _now_utc(), offset),
            "weightGrams": round(weight_kg * 1000),
        }
    }


def build_body_fat(user_id: int, percent: float, when: dt.datetime | None) -> dict[str, Any]:
    offset = _latest_offset_seconds(user_id)
    return {
        "bodyFat": {
            "sampleTime": _sample_time(when or _now_utc(), offset),
            "percentage": percent,
        }
    }


def build_height(user_id: int, height_cm: float, when: dt.datetime | None) -> dict[str, Any]:
    offset = _latest_offset_seconds(user_id)
    return {
        "height": {
            "sampleTime": _sample_time(when or _now_utc(), offset),
            "heightMeters": round(height_cm / 100, 4),
        }
    }


def build_exercise(
    user_id: int,
    exercise_type: str,
    start: dt.datetime,
    duration_seconds: int,
    calories: float | None,
    distance_meters: float | None,
    display_name: str | None,
) -> dict[str, Any]:
    offset = _latest_offset_seconds(user_id)
    off = f"{offset}s"
    ex: dict[str, Any] = {
        "interval": {
            "startTime": _rfc(start),
            "endTime": _rfc(start + dt.timedelta(seconds=duration_seconds)),
            "startUtcOffset": off,
            "endUtcOffset": off,
        },
        "exerciseType": exercise_type.upper(),
        "activeDuration": f"{duration_seconds}s",
    }
    if display_name:
        ex["displayName"] = display_name
    metrics: dict[str, Any] = {}
    if calories is not None:
        metrics["caloriesKcal"] = calories
    if distance_meters is not None:
        metrics["distanceMillimeters"] = round(distance_meters * 1000)
    if metrics:
        ex["metricsSummary"] = metrics
    return {"exercise": ex}


def build_sleep(
    user_id: int,
    start: dt.datetime,
    end: dt.datetime,
    minutes_asleep: int | None,
) -> dict[str, Any]:
    offset = _latest_offset_seconds(user_id)
    off = f"{offset}s"
    slp: dict[str, Any] = {
        "interval": {
            "startTime": _rfc(start),
            "endTime": _rfc(end),
            "startUtcOffset": off,
            "endUtcOffset": off,
        }
    }
    if minutes_asleep is not None:
        slp["summary"] = {"minutesAsleep": minutes_asleep}
    return {"sleep": slp}
