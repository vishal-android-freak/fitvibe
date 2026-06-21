# FitVibe — Backend (Go)

The Go ingestion engine and read API: Google OAuth + tokens, the ingestion pipeline, real-time webhooks, cron gap-fill, and the screen-shaped read API the app consumes. The heart of the system.

> **Full documentation:** [`../docs/backend.md`](../docs/backend.md) · architecture: [`../docs/architecture.md`](../docs/architecture.md) · schema: [`../docs/data-model.md`](../docs/data-model.md) · formulas: [`../docs/calculations.md`](../docs/calculations.md)

## Quick start

```bash
cp .env.example .env       # fill in Google OAuth + WEBHOOK_SECRET (see the file)
docker compose up -d       # local PostgreSQL (migrations apply on server start)
go run ./cmd/server        # :8080
```

Authorize a user and backfill:

```bash
go run ./cmd/authlink                  # prints the Google consent URL
go run ./cmd/fetchbackfill -user 1     # backfill history (-today / -since 48h also work)
```

## Entrypoints

| Command | Purpose |
|---------|---------|
| `cmd/server` | The HTTP server (composition root; read `cmd/server/main.go` first). |
| `cmd/authlink` | Print the Google OAuth consent URL. |
| `cmd/fetchbackfill` | Re-fetch history from the Health API (`-user`, `-today`, `-since`). |
| `cmd/backfill` | Re-parse stored payloads through the current mapper (no API calls). |
| `cmd/webhooks` | Manage Google Health webhook subscriptions. |

## Tests

Repository tests need PostgreSQL and skip without it:

```bash
docker compose up -d
TEST_DATABASE_URL="postgres://fitvibe:fitvibe@localhost:5432/fitvibe?sslmode=disable" go test ./...
```

## Configuration

Environment-driven (`.env` auto-loaded). Required: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `WEBHOOK_SECRET`. See [`.env.example`](.env.example) for the full annotated list and [`../docs/setup.md`](../docs/setup.md) for the end-to-end setup.
