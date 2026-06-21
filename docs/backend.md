# Backend (Go)

The Go backend is the heart of FitVibe: it owns Google OAuth and tokens, ingests all health data, and serves the screen-shaped read API to the app. It is a single process built to run on a small server or Raspberry Pi.

- **Source:** [`backend/`](../backend/)
- **Stack:** Go 1.25 · PostgreSQL via [pgx v5](https://github.com/jackc/pgx) · [Chi](https://github.com/go-chi/chi) router · Google OAuth2 / Health API v4 · Firebase Admin · [Tink](https://github.com/tink-crypto/tink-go) for token encryption · [robfig/cron](https://github.com/robfig/cron)
- **Composition root:** [`cmd/server/main.go`](../backend/cmd/server/main.go) — read it first; it wires every repository, the OAuth service, the webhook handler + processor, the cron scheduler, the read-API handlers, and the router.

## Entrypoints

| Command | Purpose |
|---------|---------|
| `cmd/server` | The HTTP server (composition root). Migrations apply on startup. |
| `cmd/authlink` | Print the Google OAuth consent URL. |
| `cmd/backfill` | Re-parse already-stored `payload_json` through the current mapper (recompute columns after a mapper change; **no** API calls). |
| `cmd/fetchbackfill` | Re-fetch history from the Health API. Flags: `-user N`, `-today`, `-since 48h` / `-since 2026-06-15`. |
| `cmd/webhooks` | Manage Google Health webhook subscriptions (service account). |

```bash
cd backend
docker compose up -d              # local PostgreSQL
go run ./cmd/server               # :8080, migrations auto-apply
go run ./cmd/fetchbackfill -user 1 -since 48h
```

## Ingestion — the heart of the system

Every path that pulls data (backfill, cron list/reconcile/catch-up, webhook processor) funnels DataPoints through **`ingestion.MapDataPoint`** ([`internal/ingestion/mapper.go`](../backend/internal/ingestion/mapper.go)). It:

1. **Classifies** the data type via `healthapi.Category()` → one of `interval | sample | session | daily | food`.
2. **Stores the full raw API response** in `payload_json` (lossless; JSONB).
3. **Extracts common scalars** into typed columns: `value_count/sum/avg/min/max`, `enum_value`, plus the time coordinates (`sample_time` or `start_time`/`end_time`) and `civil_start_date`.
4. **Promotes hot fields** to named columns so the read API queries columns, not JSON: `nutrition_carbs_grams`, `nutrition_fat_grams`, `meal_type`, `food_display_name`.
5. **Extracts nested arrays** into child tables ([`internal/ingestion/children.go`](../backend/internal/ingestion/children.go)): sleep stages, exercise splits/events, nutrition nutrients, ECG waveforms, irregular-rhythm windows, daily HR zones, active-minutes levels.

Because the raw payload is preserved, new extracted/promoted columns can be backfilled from stored data with `cmd/backfill` — no re-fetch needed.

```mermaid
flowchart LR
    api["Google Health API"] --> client["healthapi.Client"]
    tokens["OAuth tokens"] --> client
    client --> mapper["ingestion.MapDataPoint"]
    mapper --> repos["repositories"]
    repos --> db[("PostgreSQL")]
    mapper -.-> e1["payload_json (JSONB, lossless)"]
    mapper -.-> e2["typed scalar columns"]
    mapper -.-> e3["promoted hot columns"]
    mapper -.-> e4["child tables (stages, splits, …)"]
```

**Adding a new data type:** add it to `Category()` in [`healthapi/types.go`](../backend/internal/healthapi/types.go), add a `case` in `extractScalars` (and `extractChildren` if it has nested arrays), and add it to the relevant data-type list in `internal/cron` if it should be backfilled/caught-up.

## The read API (backend-for-frontend)

Authenticated with a **Firebase ID token** (`Authorization: Bearer <idToken>`; uid = Google user id). After OAuth the backend mints a Firebase custom token so the app signs in with no extra consent step.

| Endpoint | Purpose |
|----------|---------|
| `GET /me/today` | The whole Today screen in one response — assembled concurrently (see below). |
| `GET /me/sleep/last-night` | The most recent night (`204` if none). |
| `GET /me/sleep/nights?limit=14` | Recent nights (limit capped at 60). |
| `GET /me/sleep/schedule` · `PUT /me/sleep/schedule` | Read / set target bed & wake times. |
| `GET /me/body` | The whole Body tab — vitals, activity, body composition, nutrition. |
| `GET /me/profile` | Display profile (no tokens/scopes exposed). |

`GET /me/today` ([`internal/today`](../backend/internal/today/)) assembles the activity summary, nutrition totals, activity timeline, and last-night sleep **concurrently** (goroutines, one error path) into a single response — collapsing what used to be four round trips. The last-night sleep build logic is shared with the dedicated `GET /me/sleep/last-night` handler ([`internal/sleep`](../backend/internal/sleep/)).

Derived metrics are computed here from stored data:

- **Readiness** ([`internal/readiness`](../backend/internal/readiness/)) — a 0–100 score from HRV, resting HR, and recent sleep vs. the user's own baseline.
- **Sleep score + quality** ([`internal/sleep`](../backend/internal/sleep/)) — a 0–100 score plus quality metrics (time-to-sound-sleep, interruptions, sound sleep, disruptions) and age-banded typical stage ranges.

The exact formulas live in [calculations.md](calculations.md).

### Other routes

- **OAuth:** `POST /auth/exchange`, `GET /auth/start`, `GET /auth/callback`, `GET /auth/session` (the brokered + direct flows).
- **Webhooks:** `POST /webhooks/google-health` (configurable path).
- **Admin:** `*/admin/subscribers` for webhook subscription management.
- **Health:** `GET /healthz`.

## Webhooks — receive vs. process are decoupled

- **`webhooks.Handler`** (synchronous, on the request) verifies a notification and queues it. The verification handshake checks the `Authorization` header; real notifications are verified via **Tink ECDSA P-256** against Google's public keyset using the `X-Healthapi-Signature` header. Valid notifications are inserted into `webhook_notifications` with status `pending`. **No fetching happens on the request.**
- **`webhooks.Processor`** (background goroutine, polls every 30s) drains pending notifications: looks up the user by `health_user_id`, and for each interval either applies a `DELETE` (removes local points in the range) or fetches + stores via the ingestion pipeline. Failures get exponential-backoff retries (capped).

## Cron jobs

Registered in `main` under configurable cron specs ([`internal/cron`](../backend/internal/cron/)):

| Job | Default schedule | What it does |
|-----|------------------|--------------|
| **ListSyncer** | `0 */6 * * *` | Polls cron-only data types (no webhook support — ECG, vo2-max, oxygen-saturation, …). |
| **RollupSyncer** (intraday) | `0 * * * *` | Hourly rollups. |
| **RollupSyncer** (daily) | `10 0 * * *` | Daily rollups. |
| **ProfileSettingsSyncer** | `0 2 * * *` | Refreshes user profile / settings. |
| **ReconcileSyncer** | `0 3 * * *` | Uses the `:reconcile` endpoint to detect upstream changes/deletes. |
| **CatchupSyncer** | `0 */3 * * *` | Re-lists webhook-supported types over a recent overlapping window to recover notifications missed during downtime. |
| **BackfillJob** | (on signup / CLI) | Historical backfill of everything ingested. |

`sync_state` tracks the last synced window per `(user_id, data_type, source)` so each syncer resumes where it left off. The catch-up syncer deliberately overlaps its window by `CATCHUP_LOOKBACK_HOURS`, relying on the idempotent upsert (see [data-model.md](data-model.md)) so overlap is harmless.

## OAuth & tokens

`oauth.Service` exchanges codes, fetches the Google Health identity (`health_user_id` is the join key to webhooks), and persists tokens (encrypted at rest with Tink). **`Service.TokenProvider(userID)`** returns the token function passed to every `healthapi.Client`; it auto-refreshes when the access token is near expiry and persists rotated refresh tokens. Always obtain API tokens through this — never read `access_token` directly.

### Internal token provider

[`internal/internaltoken`](../backend/internal/internaltoken/) optionally serves **fresh Google access tokens** to the Vaidya MCP server so it can write to Google Health — without ever exposing refresh tokens. It binds to a **Unix socket** (prod/Pi) or a **loopback TCP addr** (dev), guarded by an optional bearer secret (`INTERNAL_TOKEN_SECRET`). The binding is the real boundary; the secret is defense-in-depth. Leave both the socket and addr empty to disable it entirely.

## The Health API client

[`internal/healthapi/client.go`](../backend/internal/healthapi/client.go) is a typed v4 client, rate-limited (~250 req/min vs. Google's 300/min per-user quota) with `Retry-After`-aware exponential backoff on 429/5xx. It builds the per-category `filter` query string (the field path differs by category) and guards against degenerate (zero-width) windows that the API would reject. Read sample times from `sampleTime.physicalTime` (the true UTC instant) and `sampleTime.utcOffset`, not `civilTime`.

## Database

[`db.Open`](../backend/internal/db/db.go) opens a pgx v5 pool and exposes it as `*sql.DB` via the stdlib adapter, so repositories keep using `database/sql`. It retries the initial connect (handles a just-started Docker DB) and runs the embedded migrations on startup. Migrations are PostgreSQL DDL in `internal/db/migrations/`, applied in lexical order, and must be idempotent. See [data-model.md](data-model.md).

## Configuration

Config loads from environment via [`internal/config`](../backend/internal/config/config.go); `.env` is auto-loaded from the working directory. See [`backend/.env.example`](../backend/.env.example) for the full annotated list.

**Required:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `WEBHOOK_SECRET`.
**Common optional:** `DATABASE_URL` (defaults to the docker-compose instance), `FIREBASE_PROJECT_ID` / `FIREBASE_CREDENTIALS_FILE`, the `INTERNAL_TOKEN_*` provider settings, `DEFAULT_BACKFILL_DAYS`, and the `CRON_*` schedules.

## Tests

Repository tests run against a real PostgreSQL (each test in its own throwaway schema) and **skip** when none is reachable:

```bash
docker compose up -d
TEST_DATABASE_URL="postgres://fitvibe:fitvibe@localhost:5432/fitvibe?sslmode=disable" go test ./...
go vet ./...
```

## Conventions

- Data-type names are **kebab-case** (`heart-rate`, `daily-resting-heart-rate`); `kebabToSnake` converts to the snake_case the API filter paths expect.
- Number/duration coercion is centralized in `healthapi.Number` / `healthapi.DurationSeconds` (the API returns some ints as strings and durations as `"600s"`).
- SQL is **PostgreSQL dialect**: `$1` placeholders, `RETURNING id`, `ON CONFLICT DO UPDATE`, real `time.Time` scans. Prefer promoted columns over querying JSON paths.
- Times are stored as UTC instants in `TIMESTAMPTZ`; local wall-clock is rendered from the stored `*_utc_offset_seconds`. "Today" keys on the `civil_start_date` DATE column.
