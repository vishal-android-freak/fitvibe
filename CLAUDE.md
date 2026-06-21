# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Go backend for **FitVibe** that ingests **Google Health API v4** data into a **PostgreSQL** database, built to run on a small server / Raspberry Pi. It is a single-process server that:

- exchanges Google OAuth codes and manages per-user refresh tokens,
- backfills historical data on first login,
- receives real-time webhook notifications and processes them asynchronously,
- runs scheduled cron jobs to fill gaps (rollups, profile/settings, reconcile, catch-up),
- serves a screen-shaped read API to the mobile app (`/me/today`, `/me/sleep/last-night`).

The Go backend lives under `backend/`; the Expo/React Native app lives under `appV2/` (`appV1/` is the prior version).

> **Migration note:** the backend was moved off Turso/libSQL SQLite onto PostgreSQL (pgx). If you find any lingering SQLite/Turso/`?`-placeholder/`json_extract` code, it's stale — flag it.

> **Project documentation** lives in the root `docs/` folder (each doc is Markdown + an enriched HTML twin): architecture, per-service docs, data model, setup, and reference docs.

> **Calculations reference:** every derived metric/score/threshold in the app (sleep score + quality metrics, bands, Today aggregations, ingestion coercion, sync windows, client gauges) is documented with exact formulas, inputs, file refs, and validation in `docs/calculations.md` (and its `docs/calculations.html` twin). **It is a living document — update it whenever you add or change an algorithm** (there's a changelog section at the bottom).

## Commands

All commands run from `backend/`.

```bash
# Local dev PostgreSQL (required to run the server or DB-backed tests)
docker compose up -d            # start (data persists in a named volume)
docker compose down             # stop

# Build / run the server (loads .env from CWD; migrations apply on startup)
go build -o server-bin ./cmd/server
go run ./cmd/server

# Other entrypoints
go run ./cmd/authlink                       # print the Google OAuth consent URL
go run ./cmd/backfill                       # re-parse stored payloads (no re-fetch)
go run ./cmd/fetchbackfill -user 1          # re-fetch history from the API (all data types)
go run ./cmd/fetchbackfill -user 1 -today   # ...just today;  -since 48h / -since 2026-06-15
go run ./cmd/webhooks <cmd>                 # manage webhook subscriptions (service account)

# Tests — repository tests need PostgreSQL and skip without it.
go test ./...                                                  # non-DB tests (DB ones skip)
TEST_DATABASE_URL="postgres://fitvibe:fitvibe@localhost:5432/fitvibe?sslmode=disable" go test ./...
go test ./internal/ingestion/...                               # one package
go test ./internal/healthapi -run TestSetFilterQueryDaily      # one test
```

There is no separate lint step configured; use `go vet ./...` and `gofmt`. `cmd/backfill` vs `cmd/fetchbackfill`: the former re-runs the mapper over already-stored `payload_json` (recompute columns after mapper changes, no API calls); the latter re-fetches from Google. The fetching backfill is safe to run while the server is running (Postgres handles concurrent writers).

## Configuration

Config is loaded from environment variables via `internal/config` (struct tags on `Config`), with `.env` auto-loaded from CWD (or `FITVIBE_ENV_FILE`). Required: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `WEBHOOK_SECRET`, `DATABASE_URL` (a pgx/libpq DSN; defaults to the docker-compose instance). Pool sizing via `DB_MAX_CONNS`/`DB_MIN_CONNS`. See `backend/.env.example` for the full list including cron expressions.

## Architecture

### Layering and data flow

```
Google Health API ──┐
                     ├─► healthapi.Client ──► ingestion.MapDataPoint ──► repositories ──► PostgreSQL
OAuth tokens ────────┘         ▲                                              │
                               │                                              ▼
   webhooks (real-time) ───────┤                              today / sleep handlers ──► app
   cron jobs (gap-fill) ───────┘                              (read API: GET /me/today)
                                                              cmd/server wires everything
```

`cmd/server/main.go` is the composition root: it opens the DB, constructs every repository, the OAuth service, the webhook handler+processor, the cron scheduler with all jobs, the read-API handlers (`today`, `sleep`), and the Chi router. Read it first to understand wiring.

### Read API (backend-for-frontend)

The app's Today screen is served by a **single aggregate endpoint** `GET /me/today` (`internal/today`), which assembles the activity summary, nutrition totals, activity timeline, and last-night sleep **concurrently** (goroutines, one error path) into one response — collapsing what used to be four round trips. `GET /me/sleep/last-night` (`internal/sleep`) remains for the dedicated Sleep tab; its build logic (`sleep.Handler.LastNight`) is shared by both. Auth on these endpoints is currently a `?user_id=` query param (matching the admin handler) — there is no session/bearer middleware yet.

### Ingestion is the heart of the system

Every path that pulls data (backfill, cron list/reconcile/catchup, webhook processor) funnels DataPoints through **`ingestion.MapDataPoint`** (`internal/ingestion/mapper.go`). It:

1. classifies the data type via `healthapi.Category()` → `interval | sample | session | daily | food`,
2. stores the full raw API response in `payload_json` (lossless; column is `JSONB`),
3. extracts time coordinates (`DataPoint.DataPointTimeRange`) and common scalar values into typed columns (`value_count/sum/avg/min/max`, `enum_value`), plus a few **promoted** named columns for hot fields (`nutrition_carbs_grams`, `nutrition_fat_grams`, `meal_type`, `food_display_name`) so the read API queries columns, not JSON,
4. extracts normalized child rows (`internal/ingestion/children.go`) into side tables (sleep stages, exercise splits/events, nutrition nutrients, ECG waveforms, etc.).

When adding support for a new data type: add it to `Category()` in `healthapi/types.go`, add a `case` in `extractScalars` (and `extractChildren` if it has nested arrays), and — if it should be backfilled/caught-up — add it to the relevant data-type list in `internal/cron`.

`internal/ingestion.RemapPayload` re-runs mapping over already-stored `payload_json` without re-fetching — used by `cmd/backfill` to recompute extracted columns after mapper changes.

### Upsert / dedupe contract (important)

A data point's identity is `(user_id, data_type, sample_time, start_time, end_time)` — enforced by a `UNIQUE ... NULLS NOT DISTINCT` index (migration `002`), so rows whose NULL time columns match collide as intended (Postgres treats NULLs as distinct by default; `NULLS NOT DISTINCT` is the native replacement for the old SQLite `COALESCE(col,'')` trick). `DataPointRepo.InsertMany` uses `INSERT ... ON CONFLICT DO UPDATE ... RETURNING id` so the **row id is preserved** (child-table foreign keys stay valid) and is read back for child inserts in one statement. This is why **overlapping fetch windows are safe**: the catch-up syncer deliberately overlaps by `CATCHUP_LOOKBACK_HOURS`, relying on this dedupe. Same idea for rollups (`rollup_data_points`, inline `NULLS NOT DISTINCT` constraint).

### healthapi.Client

`internal/healthapi/client.go` is a typed v4 client. It is **rate-limited to ~250 req/min** (Google quota is 300/min per user) and retries 429/5xx with `Retry-After`-aware exponential backoff. `setFilterQuery` builds the per-category `filter` query string — the filter field path differs by category (`.interval.start_time`, `.sample_time.physical_time`, `.date`, sessions on `.interval.civil_start_time`) with special cases for `sleep` (filters on `end_time`) and `electrocardiogram` (only `>=`). It also guards against a **degenerate window**: when start/end format to the same string (same civil date for daily types, or a zero-width webhook interval), the upper bound is bumped so the API doesn't reject it with `INVALID_TIME_RANGE`. The API's per-type union response shape is handled by custom `UnmarshalJSON` on `DataPoint`/`RollupDataPoint`. Sample times: read `sampleTime.physicalTime` (the true UTC instant) and `sampleTime.utcOffset`, not `civilTime`.

### Webhooks: receive vs. process are decoupled

- **`webhooks.Handler`** (sync, on the request) verifies and queues. Verification handshake checks the `Authorization` header against `WEBHOOK_SECRET`. Real notifications are verified via **Tink ECDSA P-256** (`webhooks.Verifier`) against Google's public keyset, using the **`X-Healthapi-Signature`** header (confirmed from the live API). Payloads can be a single object or a batch array. Valid notifications are inserted into `webhook_notifications` with status `pending`; the handler does no fetching.
- **`webhooks.Processor`** (async, background goroutine started in `main`, polls every 30s) drains pending notifications: looks up the user by `health_user_id`, and for each interval either applies a `DELETE` (removes local points in the range) or fetches+stores via `fetchAndStore`. Failures get exponential-backoff retries (`scheduleRetry`, capped at 10 retries / 24h). The processor runs immediately on startup, not just on the first tick.

### OAuth & tokens

`oauth.Service` exchanges codes, fetches Google Health identity (`healthUserId` is the join key to webhooks), and persists tokens. **`Service.TokenProvider(userID)` returns the token function passed to every `healthapi.Client`** — it auto-refreshes when the access token is within 30s of expiry and persists rotated refresh tokens. Always obtain API tokens through this, never read `access_token` directly.

### Cron jobs (`internal/cron`)

Registered in `main` under configurable cron specs. Each implements the `Job` interface (`Name()`, `Run(ctx)`):

- **ListSyncer** — polls `cronOnlyDataTypes` (types with no webhook support, e.g. ECG, vo2-max, oxygen-saturation).
- **RollupSyncer** — intraday and daily rollups (one instance each).
- **ProfileSettingsSyncer** — refreshes user profile/settings.
- **ReconcileSyncer** — uses the `:reconcile` endpoint to detect upstream changes/deletes.
- **CatchupSyncer** — re-lists `WebhookListDataTypes` over a recent overlapping window to recover notifications missed during downtime.
- **BackfillJob** — historical backfill; triggered in a goroutine after a successful `/auth/exchange`, and exposed standalone via `cmd/fetchbackfill`. Fetches the **union** of `WebhookListDataTypes` + `cronOnlyDataTypes` (`backfillDataTypes()` — i.e. *everything* ingested, not just webhook types), concurrently (3 workers sharing one rate-limited client), skipping types that only support reconcile/rollup. Window defaults to `DefaultBackfillDays` but can be narrowed via `WithStart` (the `-today`/`-since` CLI flags).

`sync_state` tracks the last synced window per `(user_id, data_type, source)` so each syncer resumes where it left off. The two key data-type lists — `cronOnlyDataTypes` (`syncer.go`) and `WebhookListDataTypes` (`catchup_syncer.go`) — are the source of truth for which types each path handles.

### Database

`db.Open` (`internal/db/db.go`) opens a **pgx v5** pool (`pgxpool`) and exposes it as a `*sql.DB` via the pgx `stdlib` adapter, so the repository layer keeps using `database/sql` unchanged. It retries the initial connect (handles a just-started docker DB) and runs the embedded migrations. There are no session PRAGMAs — foreign keys are always enforced and concurrent writers are first-class (the whole reason for the SQLite→Postgres move).

Migrations are embedded SQL files in `internal/db/migrations/`, applied in lexical order on startup; they must be idempotent (`IF NOT EXISTS`). They are **PostgreSQL DDL** — identity PKs, `TIMESTAMPTZ`, `JSONB`, `NULLS NOT DISTINCT` unique indexes. Repository tests use `db.OpenTestDB` (`internal/db/testing.go`), which connects to `TEST_DATABASE_URL`, runs migrations into a fresh per-test schema, drops it on cleanup, and **skips the test** if no Postgres is reachable.

## Conventions

- Data type names are **kebab-case** throughout (`heart-rate`, `daily-resting-heart-rate`); `kebabToSnake` converts to the snake_case the API filter paths expect.
- Number/duration coercion is centralized in `healthapi.Number` and `healthapi.DurationSeconds` (the API returns some ints as strings, durations as `"600s"`); use these everywhere rather than ad-hoc parsing.
- Structured logging via `log/slog` JSON handler; pass key/value pairs.
- The full raw payload is always preserved in `payload_json` (JSONB), so new extracted/promoted columns can be backfilled from stored data via `cmd/backfill` without re-hitting the API.
- SQL is **PostgreSQL dialect**: `$1` placeholders (not `?`), `RETURNING id` (not `LastInsertId`), `ON CONFLICT DO UPDATE` (not `INSERT OR REPLACE`), real `time.Time` scans (no string-timestamp parsing). Prefer promoted columns over querying `payload_json` JSON paths.
- Times are stored as UTC instants in `TIMESTAMPTZ`; local wall-clock is rendered by applying the stored `*_utc_offset_seconds`. "Today" / local-day grouping keys on the `civil_start_date` DATE column, never on a raw instant.
