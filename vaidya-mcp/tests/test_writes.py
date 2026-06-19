"""Unit tests for the write payload builders + the write call path.

Payload-builder tests are pure (no DB/network) by stubbing the offset lookup.
The write_data_point test mocks both the token fetch and the Google POST so it
runs offline.
"""

from __future__ import annotations

import datetime as dt

import pytest

from vaidya_mcp import google
from vaidya_mcp.config import Config


@pytest.fixture(autouse=True)
def _stub_offset(monkeypatch):
    # Pin offset + health_user_id so builders don't need a DB.
    monkeypatch.setattr(google, "_latest_offset_seconds", lambda uid: 19800)
    monkeypatch.setattr(google, "_health_user_id", lambda uid: "hu-123")


WHEN = dt.datetime(2026, 6, 20, 12, 0, 0, tzinfo=dt.timezone.utc)


def test_hydration_payload():
    body = google.build_hydration(1, 250, WHEN)
    h = body["hydrationLog"]
    assert h["amountConsumed"] == {"milliliters": 250, "userProvidedUnit": "MILLILITER"}
    assert h["interval"]["startTime"] == "2026-06-20T12:00:00Z"
    assert h["interval"]["startUtcOffset"] == "19800s"
    assert h["interval"]["endTime"] == "2026-06-20T12:00:30Z"  # 30s span


def test_nutrition_payload_partial():
    body = google.build_nutrition(1, 280, 60, 2, 12, "dinner", "Phulka", WHEN)
    n = body["nutritionLog"]
    assert n["energy"] == {"kcal": 280, "userProvidedUnit": "KILOCALORIE"}
    assert n["mealType"] == "DINNER"  # upper-cased
    assert n["foodDisplayName"] == "Phulka"
    assert n["totalCarbohydrate"] == {"grams": 60}
    assert n["totalFat"] == {"grams": 2}
    assert n["nutrients"] == [{"nutrient": "PROTEIN", "quantity": {"grams": 12}}]


def test_nutrition_payload_omits_missing():
    body = google.build_nutrition(1, None, None, None, None, None, None, WHEN)
    n = body["nutritionLog"]
    assert "energy" not in n and "nutrients" not in n and "mealType" not in n
    assert "interval" in n  # always present


def test_weight_payload_grams():
    body = google.build_weight(1, 70.5, WHEN)
    w = body["weight"]
    assert w["weightGrams"] == 70500
    assert w["sampleTime"] == {"physicalTime": "2026-06-20T12:00:00Z", "utcOffset": "19800s"}


def test_body_fat_payload():
    body = google.build_body_fat(1, 18.5, WHEN)
    assert body["bodyFat"]["percentage"] == 18.5


def test_height_payload_meters():
    body = google.build_height(1, 178, WHEN)
    assert body["height"]["heightMeters"] == 1.78


def test_exercise_payload():
    start = WHEN
    # build_exercise takes distance in METERS (the tool converts km→m); 5200 m.
    body = google.build_exercise(1, "running", start, 1800, 320, 5200, "Evening run")
    ex = body["exercise"]
    assert ex["exerciseType"] == "RUNNING"
    assert ex["activeDuration"] == "1800s"
    assert ex["interval"]["endTime"] == "2026-06-20T12:30:00Z"
    assert ex["metricsSummary"] == {"caloriesKcal": 320, "distanceMillimeters": 5200000}
    assert ex["displayName"] == "Evening run"


def test_sleep_payload():
    start = dt.datetime(2026, 6, 19, 22, 0, 0, tzinfo=dt.timezone.utc)
    end = dt.datetime(2026, 6, 20, 6, 0, 0, tzinfo=dt.timezone.utc)
    body = google.build_sleep(1, start, end, 420)
    s = body["sleep"]
    assert s["interval"]["startTime"] == "2026-06-19T22:00:00Z"
    assert s["summary"] == {"minutesAsleep": 420}


def test_write_data_point_mocked(monkeypatch):
    """write_data_point: token fetched from the provider, POST to Google, parses
    the returned data point name. Both calls mocked → offline."""
    monkeypatch.setattr(google, "_token_for", lambda cfg, uid, guid: "fake-token")

    captured = {}

    class FakeResp:
        status_code = 200

        def json(self):
            return {"response": {"name": "users/hu-123/dataTypes/hydration-log/dataPoints/999"}}

    class FakeClient:
        def __init__(self, **kw):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def post(self, url, headers, json):
            captured["url"] = url
            captured["json"] = json
            captured["auth"] = headers["Authorization"]
            return FakeResp()

    monkeypatch.setattr(google.httpx, "Client", FakeClient)

    cfg = Config(
        database_url="x", go_token_socket="", go_token_url="http://x",
        internal_token_secret="s", google_ha_base="https://health.googleapis.com/v4",
    )
    body = google.build_hydration(1, 250, WHEN)
    out = google.write_data_point(cfg, 1, "hydration-log", body)
    assert out["ok"] is True
    assert out["name"].endswith("dataPoints/999")
    assert captured["auth"] == "Bearer fake-token"
    assert captured["url"].endswith("/users/hu-123/dataTypes/hydration-log/dataPoints")
    assert captured["json"]["dataSource"] == {"platform": "FITBIT", "recordingMethod": "MANUAL"}


def test_write_data_point_error(monkeypatch):
    monkeypatch.setattr(google, "_token_for", lambda cfg, uid, guid: "fake-token")

    class FakeResp:
        status_code = 403
        text = "forbidden"

        def json(self):
            return {}

    class FakeClient:
        def __init__(self, **kw):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def post(self, url, headers, json):
            return FakeResp()

    monkeypatch.setattr(google.httpx, "Client", FakeClient)
    cfg = Config("x", "", "http://x", "s", "https://health.googleapis.com/v4")
    out = google.write_data_point(cfg, 1, "weight", google.build_weight(1, 70, WHEN))
    assert out["ok"] is False
    assert "403" in out["error"]
