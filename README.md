# FitVibe

Health-tracking system that ingests **Google Health API v4** data and surfaces it in a mobile app. Two parts live in this repo:

- **`backend/`** — a Go server that exchanges Google OAuth, backfills history, ingests real-time webhooks, runs scheduled gap-fill crons, and serves the app's read API. Built to run on a Raspberry Pi / small server.
- **`appV2/`** — the Expo / React Native mobile app (the current app; `appV1/` is the prior version).

The repo root also holds an unrelated Fitbit BLE reverse-engineering effort (`work/`, `FINDINGS.md`) — research, not part of the product.

## Backend

### Features

- Google OAuth 2.0 code exchange and automatic refresh-token rotation
- **PostgreSQL** storage with embedded, idempotent migrations
- Historical backfill of all ingested data types (windowed: full, `-today`, or `-since`)
- Real-time webhook ingestion with Tink ECDSA signature verification, decoupled receive/process
- Cron gap-fill jobs (list, rollups, profile/settings, reconcile, catch-up)
- A unified, screen-shaped read API for the app (`GET /me/today`, `GET /me/sleep/last-night`)

### Tech stack

- Go 1.25
- **PostgreSQL** via **pgx v5** (`github.com/jackc/pgx/v5`)
- Chi router
- Google OAuth2 / Google Health API v4

### Architecture

Every path that pulls data (backfill, cron, webhook processor) funnels DataPoints through `ingestion.MapDataPoint`, which stores the lossless raw payload in `payload_json` (JSONB) and extracts typed scalar/child columns. Hot fields (nutrition carbs/fat, meal type, calories) are promoted to columns at ingestion so the read API does plain column reads, not JSON extraction. `cmd/server/main.go` is the composition root — read it first.

The app's Today screen is served by a single backend-for-frontend endpoint, `GET /me/today`, which assembles the activity summary, nutrition, timeline, and last-night sleep concurrently in one response.

### Project structure

```
backend/
├── cmd/
│   ├── authlink/        # Print the Google OAuth consent URL
│   ├── server/          # HTTP server entrypoint (composition root)
│   ├── backfill/        # Re-parse stored payloads through the current mapper
│   ├── fetchbackfill/   # Re-fetch history from the Health API (-today / -since)
│   └── webhooks/        # Manage webhook subscriptions (service account)
├── internal/
│   ├── api/             # Admin HTTP handlers
│   ├── config/          # Environment config loader
│   ├── cron/            # Scheduled sync jobs + historical backfill
│   ├── db/              # pgx connection, embedded migrations, test helper
│   ├── db/repositories/ # Data access layer
│   ├── healthapi/       # Typed Google Health API v4 client
│   ├── ingestion/       # DataPoint mapping + column/child extraction
│   ├── oauth/           # OAuth exchange & token provider
│   ├── sleep/           # Last-night sleep endpoint
│   ├── today/           # Unified GET /me/today aggregate
│   └── webhooks/        # Webhook handler & async processor
├── docs/                # Design references (Postgres migration, Vaidya coach)
├── docker-compose.yml   # Local dev PostgreSQL
└── .env.example
```

### Getting started

1. Start a local PostgreSQL (Docker):

   ```bash
   cd backend
   docker compose up -d
   ```

2. Copy the env file and fill in your Google credentials:

   ```bash
   cp .env.example .env
   # DATABASE_URL defaults to the docker compose instance
   ```

3. Build and run the server (migrations apply automatically on startup):

   ```bash
   go build -o server-bin ./cmd/server
   ./server-bin
   ```

4. Authorize a user — print the consent URL, then exchange the code:

   ```bash
   go run ./cmd/authlink

   curl -X POST http://localhost:8080/auth/exchange \
     -H "Content-Type: application/json" \
     -d '{"code":"YOUR_CODE","redirect_uri":"YOUR_REDIRECT_URI"}'
   ```

5. (Optional) Backfill history — everything, just today, or a recent window:

   ```bash
   go run ./cmd/fetchbackfill -user 1            # last DEFAULT_BACKFILL_DAYS
   go run ./cmd/fetchbackfill -user 1 -today     # just today (local civil day)
   go run ./cmd/fetchbackfill -user 1 -since 48h # last 48 hours
   ```

### Tests

Repository tests run against a real PostgreSQL (each test in its own throwaway schema) and **skip** when none is reachable:

```bash
docker compose up -d
TEST_DATABASE_URL="postgres://fitvibe:fitvibe@localhost:5432/fitvibe?sslmode=disable" go test ./...
```

### Configuration

Config loads from environment via `internal/config` (`.env` auto-loaded from CWD). Required: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `WEBHOOK_SECRET`, `DATABASE_URL`. See `backend/.env.example` for the full list including cron expressions and pool sizing.

## App (`appV2/`)

Expo / React Native. The Today tab consumes the unified `GET /me/today` endpoint via a single shared hook with pull-to-refresh. See `appV2/AGENTS.md` for app-specific conventions (it targets a pinned Expo version).

## Roadmap

- **Vaidya** — an AI health coach (the answer to Google's "Ask Coach"): a standalone Node.js/TypeScript service that embeds the **Pi agent SDK** as its engine, querying the shared PostgreSQL DB read-only via 5 SQL tools, with a curated wellness Pi Skill (in place of RAG) and runtime self-extension. Runtime model is Claude Opus 4.8 for now, switching to OpenCode Go/Zen later. Design + research: `backend/docs/vaidya-coach-research.html` (see the 2026-06-19 architecture update at the top).

## License

Private — for FitVibe use only.
