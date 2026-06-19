"""Integration tests for the MCP read tools against a dev Postgres.

Skips when DATABASE_URL_READONLY is unset / unreachable. Uses FastMCP's in-memory
client so the tools run through the real MCP tool-call path (schema + dispatch),
not just direct function calls.
"""

from __future__ import annotations

import os

import pytest
from fastmcp import Client

from vaidya_mcp import db
from vaidya_mcp.config import Config


def _db_available() -> bool:
    try:
        cfg = Config.load()
    except Exception:
        return False
    try:
        db.init_pool(cfg.database_url)
        return db.ping()
    except Exception:
        return False


pytestmark = pytest.mark.skipif(not _db_available(), reason="no dev Postgres")


@pytest.fixture(scope="session", autouse=True)
def _close_pool():
    yield
    db.close_pool()


@pytest.fixture()
def client():
    # Import after the skip check so a missing DB doesn't error at import time.
    from vaidya_mcp.server import mcp

    return Client(mcp)


async def test_ping(client):
    async with client:
        result = await client.call_tool("ping", {})
    assert result.data == "ok"


async def test_tools_listed(client):
    async with client:
        tools = await client.list_tools()
    names = {t.name for t in tools}
    assert {"ping", "get_today_summary", "get_nutrition", "get_sleep"} <= names


async def test_today_summary_shape(client):
    async with client:
        result = await client.call_tool("get_today_summary", {"user_id": 1})
    # Don't pin exact numbers (live data); assert it's a sensible summary string.
    assert isinstance(result.data, str)
    assert "steps" in result.data.lower()


async def test_sleep_shape(client):
    async with client:
        result = await client.call_tool("get_sleep", {"user_id": 1})
    assert isinstance(result.data, str)
    assert "sleep" in result.data.lower()
