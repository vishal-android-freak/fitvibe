# Setup Guide

This walks through running the full FitVibe stack locally. You can stop after step 4 for a working tracking app, and add Vaidya (steps 5–6) when you want the AI coach.

## Prerequisites

- **Go 1.25+**
- **Docker** (for local PostgreSQL) — or your own PostgreSQL 15+
- **Node 22+** and npm
- **Python 3.11+**
- A **Google Cloud project** with the Health API enabled and OAuth credentials
- A **Firebase project** (same Google project) for app auth

## 1. Google Cloud & Firebase

You need this once, and it's the only part that isn't a copy-paste.

1. **Create / pick a Google Cloud project** and enable the **Google Health API**.
2. **OAuth credentials** — create an OAuth client. Note the **client id** and **client secret**, and register your redirect URI (the app uses a custom scheme like `com.fitvibe.app:/oauth2callback`; the brokered web flow uses your backend's `/auth/callback`).
3. **Firebase** — in the same project, enable Firebase Authentication. Download:
   - the **Admin service-account JSON** (used by the backend and `vaidya-service` to mint/verify tokens) — keep it out of git,
   - `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) for the app.
4. **Webhooks** (optional, for real-time data) — you'll register a webhook subscriber pointing at your backend's public `POST /webhooks/google-health`. Use `go run ./cmd/webhooks` once the server is reachable.

> Keep every credential file out of git. The repo's `.gitignore` already excludes `.env` files; never commit service-account JSON.

## Run the whole stack with Docker (recommended)

The fastest path is the root `docker-compose.yml` — it builds and runs PostgreSQL, the Go backend, both Vaidya services, and Caddy (the reverse proxy) together.

```bash
cp .env.docker.example .env          # fill in your Google + Firebase values
# drop your secret files into ./config (see config/README.md):
#   config/firebase-service-account.json   ← Firebase Admin key
#   config/google-oauth.json               ← downloaded OAuth client (reference)
# ./config is mounted read-only into the containers at /config.

docker compose up -d --build          # whole stack
# ...or core only (no AI coach — needs no Pi login):
docker compose up -d --build postgres backend caddy
```

Everything is then reachable through Caddy on **http://localhost** with the same path routing the app expects:

- `/vaidya/*` → the Vaidya service (insights + chat WebSocket)
- everything else (`/me/*`, `/auth/*`, `/webhooks/*`, `/healthz`) → the Go backend

What the stack wires up for you:

- **PostgreSQL** with a persistent volume; on first init it provisions the least-privilege `vaidya_ro` role the MCP server uses (`deploy/db-init/`).
- **Backend** runs its migrations on startup and serves the internal token provider to the MCP server over a **shared Unix socket** (`token_sock` volume) — never a refresh token. (The backend refuses to bind tokens to a non-loopback TCP port, so the socket is the cross-container channel.)
- **vaidya-mcp** reads health data as `vaidya_ro` and reaches the token socket; **vaidya-service** owns the `vaidya_*` tables and reaches vaidya-mcp on the compose network.
- **Caddy** fronts the backend + Vaidya service. Leave `DOMAIN` empty for localhost/HTTP; set `DOMAIN=health.example.com` in `.env` for automatic HTTPS on a public server.

### The Vaidya coach needs your Pi login

Vaidya runs on the [Pi agent SDK](https://pi.dev), which authenticates with an OAuth login stored in `~/.pi/agent` on the **host**. Run `pi` once on the host and sign in to your model provider before starting the AI services.

`docker-compose.yml` bind-mounts your host `~/.pi/agent` **read-only at `/pi-host`**. On startup the `vaidya-service` entrypoint assembles a clean, container-local agent dir (`PI_CODING_AGENT_DIR=/app/.pi-agent`) from it: it copies the login (`auth.json`) and symlinks the installed `pi-mcp-adapter`, but writes a **minimal `settings.json` that loads only the MCP adapter**. (The host's other Pi packages can hang in a headless container, so they're intentionally not loaded — and your host `~/.pi/agent` is never written to.)

- If your agent dir isn't at `~/.pi/agent`, set `PI_AGENT_HOST_PATH` (an absolute path) in `.env`. **Docker Compose does not expand `~`** — use a full path, e.g. `PI_AGENT_HOST_PATH=/home/you/.pi/agent`.
- Pick the model with `VAIDYA_MODEL_PROVIDER` / `VAIDYA_MODEL_ID` in `.env` (e.g. `anthropic` / `claude-opus-4-8`, or `opencode-go` / `deepseek-v4-pro`). The provider you choose must be the one you logged into with `pi`.
- The MCP server uses headless-safe settings (`vaidya-service/mcp.docker.json`); you don't need to touch it.

**Skip the AI entirely:** the core tracking app needs no Pi login —
`docker compose up -d --build postgres backend caddy`.

> **Already running the old `backend/docker-compose.yml` Postgres?** Stop it first (`cd backend && docker compose down`) so the full stack can bind port 5432 — or change `HTTP_PORT`/the postgres port mapping if you want both.

### Verifying / troubleshooting the stack

```bash
docker compose ps                       # all services should be "healthy"
docker compose logs -f vaidya-service   # watch the coach
curl http://localhost/healthz           # backend via Caddy → {"status":"ok"}
```

| Symptom | Cause / fix |
|---------|-------------|
| `vaidya-service` unhealthy or chat hangs | No/expired Pi login — run `pi` on the host and re-`docker compose up -d vaidya-service`. |
| Chat hangs and the model never replies | The chosen provider is rate-limited or out of quota. Check `docker compose logs vaidya-service`; switch `VAIDYA_MODEL_*` to another provider you're logged into. |
| `vaidya-mcp` can't read data | The `vaidya_ro` role is provisioned only on a **fresh** DB volume. If you reused an old volume, run `vaidya-mcp/sql/role_provisioning.sql` once, or recreate with `docker compose down -v`. |

The sections below describe running each service **directly** (without Docker) for development.

## 2. PostgreSQL

The backend ships a docker-compose for local dev:

```bash
cd backend
docker compose up -d        # starts PostgreSQL; data persists in a named volume
```

This matches the default `DATABASE_URL` in the env examples (`postgres://fitvibe:fitvibe@localhost:5432/fitvibe`). To stop: `docker compose down`.

## 3. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in at least the **required** values:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `WEBHOOK_SECRET` (any strong string)
- `FIREBASE_PROJECT_ID` and `FIREBASE_CREDENTIALS_FILE` (path to your Admin service-account JSON) if you want app auth

Then run it (migrations apply automatically on startup):

```bash
go run ./cmd/server          # :8080
```

Authorize your first user and pull history:

```bash
go run ./cmd/authlink                 # prints the Google consent URL
# complete consent; exchange the code (the app does this, or POST /auth/exchange)
go run ./cmd/fetchbackfill -user 1    # backfill history
# narrower windows:  -today   |   -since 48h   |   -since 2026-06-15
```

Verify: `curl http://localhost:8080/healthz`.

## 4. Mobile app

```bash
cd appV2
cp .env.example .env
```

Set `EXPO_PUBLIC_API_BASE_URL` to your backend (e.g. `http://<your-machine-ip>:8080` so a device can reach it). Drop your `google-services.json` / `GoogleService-Info.plist` where `app.config.js` expects them (repo root by default, or point the `FITVIBE_GOOGLE_SERVICES_*` env vars at them).

```bash
npm install
npm run ios          # or: npm run android
```

This produces a **dev build** (not Expo Go) because of the native modules. Sign in with Google in the app — it brokers through your backend.

## 5. Vaidya MCP (optional)

The agent's tools. It needs a **read-only PostgreSQL role**.

```bash
cd vaidya-mcp
cp .env.example .env
```

Create the read-only role once (as a superuser), then set `DATABASE_URL_READONLY` in `.env` to that role's DSN:

```bash
psql "postgres://fitvibe:fitvibe@localhost:5432/fitvibe" -f sql/role_provisioning.sql
# then set a password for vaidya_ro and put its DSN in .env as DATABASE_URL_READONLY
```

Point it at the Go token provider so the write tools can reach Google Health — in `backend/.env` set `INTERNAL_TOKEN_ADDR=127.0.0.1:8091` (and a shared `INTERNAL_TOKEN_SECRET`), and in `vaidya-mcp/.env` set `GO_TOKEN_URL=http://127.0.0.1:8091` with the same secret.

```bash
python -m venv .venv && .venv/bin/pip install -e .
python -m vaidya_mcp.server          # http://127.0.0.1:8765/mcp
```

## 6. Vaidya service (optional)

The coach engine. It needs the model auth and the MCP server running.

```bash
cd vaidya-service
cp .env.example .env
```

- `DATABASE_URL` — the main DSN (it creates and owns the `vaidya_*` tables).
- Model auth — by default Pi uses Anthropic OAuth stored in `~/.pi/agent/auth.json`; authenticate Pi once on the machine.
- `.pi/mcp.json` already points at `http://127.0.0.1:8765/mcp`.

```bash
npm install
npm run dev          # :8090  (HTTP insights + chat WebSocket)
```

In the app, set `EXPO_PUBLIC_VAIDYA_BASE_URL` to this service (`http://<ip>:8090`). The Ask tab and Insights feed now light up.

## Production notes

- A reverse proxy (nginx / Caddy) can front the Go backend and `vaidya-service` at one origin; set the app's two base URLs equal in that case.
- Prefer the **Unix socket** form of the internal token provider in production (`INTERNAL_TOKEN_SOCKET` / `GO_TOKEN_SOCKET`).
- Use `sslmode=require` (or stricter) on your `DATABASE_URL`.
- The whole stack is designed to run on a small VPS or Raspberry Pi.

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Backend won't start: "GOOGLE_CLIENT_ID is required" | `.env` not filled in / not in the working directory. |
| Repository tests all skip | No PostgreSQL reachable at `TEST_DATABASE_URL` — start docker compose. |
| App can't reach backend from a device | `EXPO_PUBLIC_API_BASE_URL` points at `localhost` — use your machine's LAN IP. |
| Vaidya tools "not initialized" | The MCP server isn't running, or `.pi/mcp.json` URL is wrong. |
| MCP write tools fail to get a token | The Go internal token provider isn't enabled, or the `INTERNAL_TOKEN_SECRET` differs between services. |
