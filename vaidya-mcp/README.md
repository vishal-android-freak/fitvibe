# FitVibe — Vaidya MCP (Python)

The MCP tool server behind FitVibe's **Vaidya** AI coach. It keeps DB credentials and Google tokens out of the LLM context — the coach engine ([`vaidya-service`](../vaidya-service/)) only ever sees a tool surface.

- **Reads** Postgres through a dedicated **read-only role** (`vaidya_ro`); the `get_*` tools mirror the Go repositories so the numbers match the app.
- **Writes** (nutrition / hydration / weight / exercise / …) go to the **Google Health API** using a fresh access token fetched from the Go internal token provider (Go stays the sole token authority). Nothing writes to `data_points` except the Go ingestion server.
- **Transport:** FastMCP streamable-HTTP, served at `http://127.0.0.1:8765/mcp`.

> **Full documentation:** [`../docs/vaidya.md`](../docs/vaidya.md) · write payloads: [`../docs/google-health-write-payloads.md`](../docs/google-health-write-payloads.md) · architecture: [`../docs/architecture.md`](../docs/architecture.md)

## Quick start

```bash
cp .env.example .env                 # set DATABASE_URL_READONLY + token provider
python -m venv .venv && .venv/bin/pip install -e ".[dev]"
psql "$DATABASE_URL" -f sql/role_provisioning.sql   # create vaidya_ro (once, as superuser)
python -m vaidya_mcp.server          # http://127.0.0.1:8765/mcp
```

Provision the read-only role once as a superuser (edit the password in the SQL first). The MCP server reads health data only through `vaidya_ro`, which has `SELECT`-only access to the health tables and no write access anywhere.

## Tools

| Tool | Kind | Purpose |
|------|------|---------|
| `ping` | read | DB reachability |
| `get_today_summary(user_id)` | read | steps / distance / floors / active-energy / zone-minutes for the local day |
| `get_nutrition(user_id, date?)` | read | calories + carbs/fat/protein + hydration |
| `get_sleep(user_id)` | read | latest main sleep + stage breakdown |
| `query_health_db(sql)` | read | read-only SQL escape hatch (single `SELECT`/`WITH`, read-only txn, 200-row cap) |
| `log_hydration` / `log_nutrition` / `log_weight` / `log_body_fat` / `log_height` / `log_exercise` / `log_sleep` | write | the 7 manually-loggable Google Health v4 types |

Writes go to the Google Health API using a fresh token from the Go provider; the data syncs back into Postgres via Go ingestion on the next sync. The exact write JSON is documented in [`../docs/google-health-write-payloads.md`](../docs/google-health-write-payloads.md).

## Tests

Needs a dev Postgres (`docker compose up -d` in [`../backend`](../backend/)). Tests skip without one.

```bash
.venv/bin/pytest -q
```

## Configuration

See [`.env.example`](.env.example): `DATABASE_URL_READONLY` (required), `GO_TOKEN_SOCKET` **or** `GO_TOKEN_URL`, `INTERNAL_TOKEN_SECRET`, `GOOGLE_HA_BASE`. Full setup in [`../docs/setup.md`](../docs/setup.md).
