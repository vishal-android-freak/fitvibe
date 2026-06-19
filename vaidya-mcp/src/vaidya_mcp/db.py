"""Postgres access for the MCP read tools.

A single psycopg connection pool, opened against the READ-ONLY role. All tool
queries go through `fetchall` / `fetchone` here. The role has no write grants,
so a query that tries to mutate fails at the database — defense in depth on top
of "we only ever write SELECTs".
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None


def init_pool(dsn: str) -> None:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            dsn,
            min_size=1,
            max_size=4,
            open=False,
            kwargs={"row_factory": dict_row, "connect_timeout": 10},
        )
        _pool.open(wait=True, timeout=15)


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def _require_pool() -> ConnectionPool:
    if _pool is None:
        raise RuntimeError("db pool not initialized; call init_pool() first")
    return _pool


def fetchall(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with _require_pool().connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()


def fetchone(query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    with _require_pool().connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchone()


@contextmanager
def connection() -> Iterator[psycopg.Connection]:
    """Borrow a pooled connection for direct use (e.g. the generic SQL tool,
    which sets its own read-only transaction + timeout)."""
    with _require_pool().connection() as conn:
        yield conn


def ping() -> bool:
    row = fetchone("SELECT 1 AS ok")
    return bool(row and row.get("ok") == 1)
