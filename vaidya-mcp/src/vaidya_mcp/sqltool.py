"""Generic read-only SQL escape hatch for the LLM.

This is the highest-risk tool, so safety is layered and does NOT rely on the LLM
writing safe SQL:

  1. Role:        the MCP server connects as vaidya_ro, which has no write grants
                  at all — a write simply cannot execute.
  2. Statement:   we reject anything that isn't a single SELECT / WITH…SELECT, and
                  reject multiple statements (no ';' chaining).
  3. Transaction: every query runs in a READ ONLY transaction.
  4. Limits:      a statement_timeout and a hard row cap bound cost and output.

The LLM is expected to scope queries to the caller's user_id (every per-user
table has a user_id column); the schema skill spells this out. Because this is a
single-user personal build the blast radius is small, but the read-only +
single-SELECT guarantees hold regardless.
"""

from __future__ import annotations

import re
from typing import Any

from . import db

MAX_ROWS = 200
STATEMENT_TIMEOUT_MS = 5000

# A leading SELECT or WITH (CTE) is the only allowed shape. Comments stripped first.
_ALLOWED_START = re.compile(r"^\s*(select|with)\b", re.IGNORECASE)
# Statement-terminating semicolons that would allow a second statement. A single
# trailing ';' is fine; anything with SQL after it is rejected.
_MULTI_STMT = re.compile(r";\s*\S")
# Obvious write / DDL keywords as a coarse pre-filter (the role is the real guard).
_FORBIDDEN = re.compile(
    r"\b(insert|update|delete|truncate|drop|alter|create|grant|revoke|"
    r"copy|vacuum|reindex|comment|set\s+role|call|do)\b",
    re.IGNORECASE,
)


class UnsafeQuery(ValueError):
    """Raised when a query fails the read-only safety checks."""


def _strip_comments(sql: str) -> str:
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.DOTALL)  # block comments
    sql = re.sub(r"--[^\n]*", " ", sql)  # line comments
    return sql.strip()


def validate(sql: str) -> str:
    stripped = _strip_comments(sql)
    if not stripped:
        raise UnsafeQuery("empty query")
    if not _ALLOWED_START.match(stripped):
        raise UnsafeQuery("only SELECT / WITH queries are allowed")
    # Allow one optional trailing semicolon; reject a real second statement.
    if _MULTI_STMT.search(stripped):
        raise UnsafeQuery("multiple statements are not allowed")
    if _FORBIDDEN.search(stripped):
        raise UnsafeQuery("query contains a forbidden keyword (read-only only)")
    return stripped.rstrip(";")


def run(sql: str) -> dict[str, Any]:
    """Validate and run a read-only query. Returns {columns, rows, row_count,
    truncated}. Rows are dicts; values JSON-coerced to str where needed by the
    caller's serializer."""
    query = validate(sql)
    with db.connection() as conn:
        # Read-only transaction + timeout, belt-and-suspenders over the role.
        conn.execute(f"SET statement_timeout = {STATEMENT_TIMEOUT_MS}")
        conn.execute("SET TRANSACTION READ ONLY")
        with conn.cursor() as cur:
            cur.execute(query)
            cols = [d.name for d in cur.description] if cur.description else []
            rows = cur.fetchmany(MAX_ROWS + 1)
    truncated = len(rows) > MAX_ROWS
    rows = rows[:MAX_ROWS]
    return {
        "columns": cols,
        "rows": rows,
        "row_count": len(rows),
        "truncated": truncated,
    }
