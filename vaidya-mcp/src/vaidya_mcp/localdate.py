"""User local civil date, mirroring the Go read API (today/handler.go:186-196):
take the most recent known UTC offset from the user's data points and apply it
to now(). Falls back to UTC when no offset is known.
"""

from __future__ import annotations

import datetime as dt

from . import db


def local_date(user_id: int) -> str:
    row = db.fetchone(
        """
        SELECT start_utc_offset_seconds AS off
        FROM data_points
        WHERE user_id = %s AND start_utc_offset_seconds IS NOT NULL
        ORDER BY COALESCE(start_time, sample_time) DESC
        LIMIT 1
        """,
        (user_id,),
    )
    offset = int(row["off"]) if row and row.get("off") is not None else 0
    now_local = dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=offset)
    return now_local.strftime("%Y-%m-%d")
