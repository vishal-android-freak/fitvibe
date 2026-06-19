"""Safety + behavior tests for the generic SQL tool. The validate() checks need
no DB; the run() check uses dev Postgres (skips without it)."""

from __future__ import annotations

import pytest

from vaidya_mcp import db, sqltool
from vaidya_mcp.config import Config


# --- validate(): pure, no DB ------------------------------------------------

@pytest.mark.parametrize(
    "sql",
    [
        "SELECT 1",
        "  select * from data_points where user_id = 1 limit 5",
        "WITH x AS (SELECT 1) SELECT * FROM x",
        "SELECT 1;",  # single trailing semicolon ok
        "/* comment */ SELECT count(*) FROM data_points",
    ],
)
def test_validate_allows_reads(sql):
    assert sqltool.validate(sql)


@pytest.mark.parametrize(
    "sql",
    [
        "INSERT INTO users VALUES (1)",
        "UPDATE data_points SET value_sum = 0",
        "DELETE FROM data_points",
        "DROP TABLE users",
        "TRUNCATE data_points",
        "SELECT 1; DROP TABLE users",  # second statement
        "SELECT 1; DELETE FROM users",
        "GRANT ALL ON users TO public",
        "",
        "   ",
        "-- just a comment",
        "ALTER TABLE users ADD COLUMN x int",
    ],
)
def test_validate_rejects_writes_and_multistmt(sql):
    with pytest.raises(sqltool.UnsafeQuery):
        sqltool.validate(sql)


# --- run(): needs DB --------------------------------------------------------

def _db_available() -> bool:
    try:
        cfg = Config.load()
        db.init_pool(cfg.database_url)
        return db.ping()
    except Exception:
        return False


@pytest.mark.skipif(not _db_available(), reason="no dev Postgres")
def test_run_returns_rows():
    out = sqltool.run("SELECT count(*) AS n FROM data_points WHERE user_id = 1")
    assert out["columns"] == ["n"]
    assert out["row_count"] == 1
    assert out["rows"][0]["n"] >= 0
    assert out["truncated"] is False


@pytest.mark.skipif(not _db_available(), reason="no dev Postgres")
def test_run_caps_rows():
    out = sqltool.run("SELECT id FROM data_points WHERE user_id = 1")
    assert out["row_count"] <= sqltool.MAX_ROWS
    # data_points has far more than 200 rows for user 1, so it should truncate.
    assert out["truncated"] is True


@pytest.mark.skipif(not _db_available(), reason="no dev Postgres")
def test_run_rejects_write_before_execution():
    with pytest.raises(sqltool.UnsafeQuery):
        sqltool.run("DELETE FROM data_points")
