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
