# vaidya-mcp

The MCP server behind FitVibe's **Vaidya** AI coach. It keeps DB credentials and
Google tokens out of the LLM/Pi context: Pi (the Vaidya engine) only ever sees a
tool surface.

- **Reads** Postgres directly via a **read-only role** (the `get_*` tools mirror the
  Go `today`/`sleep`/`body` repositories so the numbers match the app).
- **Writes** (nutrition/hydration/weight logging — coming next) go to the **Google
  Health API**, using a fresh access token fetched from the Go internal token
  provider (Go stays the sole token authority). Nothing writes to `data_points`
  except the Go ingestion server.
- **Transport:** stdio. The Vaidya host spawns this as a child process.

See `../vaidya-mcp-plan.md` for the full design and `../backend/docs/google-health-write-payloads.md`
for the write request shapes.

## Setup

```bash
uv venv --python 3.14
uv pip install -e ".[dev]"
cp .env.example .env          # set DATABASE_URL_READONLY (read-only role), token provider
```

Provision the read-only role once (superuser): `psql -f sql/role_provisioning.sql`
(edit the password first). For local dev you can point `DATABASE_URL_READONLY` at the
existing `fitvibe` role, but provision `vaidya_ro` before anything real.

## Run

```bash
python -m vaidya_mcp.server     # stdio MCP server
```

## Test

Needs a dev Postgres (`docker compose up -d` in `../backend`). Tests skip without one.

```bash
pytest -q
```

## Tools

| Tool | Kind | Source |
|------|------|--------|
| `ping` | read | DB reachability |
| `get_today_summary(user_id)` | read | steps/distance/floors/active-energy/AZM for the local day |
| `get_nutrition(user_id, date?)` | read | calories + carbs/fat/protein + hydration |
| `get_sleep(user_id)` | read | latest main sleep + stage breakdown |
| `query_health_db(sql)` | read | generic read-only SQL escape hatch (single SELECT/WITH, read-only txn, 200-row cap). Pair with the `vaidya-health-schema` skill so the LLM writes accurate SQL. |
| `get_readiness` / `get_metric_trend` | read | _planned_ |
| `log_hydration(user_id, milliliters, when?)` | write | water/fluid intake |
| `log_nutrition(user_id, calories?, carbs_g?, fat_g?, protein_g?, meal_type?, food_name?, when?)` | write | a meal/food |
| `log_weight(user_id, weight_kg, when?)` | write | body weight |
| `log_body_fat(user_id, percent, when?)` | write | body-fat % |
| `log_height(user_id, height_cm, when?)` | write | height |
| `log_exercise(user_id, exercise_type, start, duration_minutes, calories?, distance_km?, display_name?)` | write | a workout |
| `log_sleep(user_id, start, end, minutes_asleep?)` | write | a sleep session (usually device-recorded) |

Writes go to the Google Health API (the 7 manually-loggable v4 types) using a
fresh token from the Go provider; data syncs back into Postgres via Go ingestion.
Verified end-to-end (live `log_hydration` returned 200 + created a data point).
