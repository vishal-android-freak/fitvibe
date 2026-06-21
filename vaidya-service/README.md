# FitVibe — Vaidya Service (Node)

The AI coach engine. Embeds the [Pi agent SDK](https://pi.dev) to power live chat over a WebSocket and cron-generated daily insights (today headline, per-sleep, end-of-day report). Owns the `vaidya_*` tables; reaches health data only through the [`vaidya-mcp`](../vaidya-mcp/) tool server.

> **Full documentation:** [`../docs/vaidya.md`](../docs/vaidya.md) · architecture: [`../docs/architecture.md`](../docs/architecture.md)

## Quick start

```bash
cp .env.example .env       # DATABASE_URL (it owns the vaidya_* tables) + model/Firebase
npm install
npm run dev                # :8090 — HTTP insights + chat WebSocket
```

Requires the MCP tool server running (see [`../vaidya-mcp/`](../vaidya-mcp/)) and Pi authenticated on the machine (Anthropic OAuth in `~/.pi/agent/auth.json`). `.pi/mcp.json` already points at `http://127.0.0.1:8765/mcp`.

## What it does

- **Chat** (`/vaidya/chat`, WebSocket) — streams the coach's response token-by-token plus generative-UI blocks; resumable via `?conversationId=`.
- **Insights** (cron) — `sleep-watch` (every 30m), `today-headline` (every 3h), `day-report` (nightly). Each is a replayable Pi session recorded in `vaidya_insights`.
- **HTTP** — `GET /vaidya/insights/{today,sleep,day}`, conversation history, and push-token registration (all Firebase-authed).

## Stack

Node 22 · TypeScript · `@earendil-works/pi-coding-agent` · Fastify · `ws` · `node-cron` · `pg` · `expo-server-sdk` · `firebase-admin`.

## Commands

```bash
npm run typecheck
npm test                   # vitest
npm run build && npm start # production
```

## Configuration

See [`.env.example`](.env.example): `DATABASE_URL` (required), `PORT` (8090), `VAIDYA_MODEL_PROVIDER` / `VAIDYA_MODEL_ID`, optional `FIREBASE_*`. Full setup in [`../docs/setup.md`](../docs/setup.md).
