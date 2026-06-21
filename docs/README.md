# FitVibe Documentation

Complete documentation for the FitVibe platform. Every document is available as **Markdown** (this folder, renders on GitHub) and as an **enriched HTML** version (`*.html` in this folder — styled, with diagrams, ideal offline or for sharing).

## Start here

- **[Architecture](architecture.md)** — how the four services fit together, the data flow, and the trust boundaries. Read this first.
- **[Setup guide](setup.md)** — get the whole stack running locally: Google Cloud, Firebase, PostgreSQL, and each service.

## Per-service deep dives

- **[Backend](backend.md)** — the Go ingestion engine + read API: OAuth, the ingestion pipeline, webhooks, cron gap-fill, and the screen-shaped endpoints.
- **[Data model](data-model.md)** — the PostgreSQL schema: `data_points`, rollups, child tables, the upsert/dedupe contract.
- **[Mobile app](app.md)** — the Expo / React Native app: navigation, screens, the data layer, auth, and generative-UI rendering.
- **[Vaidya AI coach](vaidya.md)** — the agent service (`vaidya-service`) and its tools (`vaidya-mcp`): the chat protocol, nightly insights, generative blocks, and the MCP tool surface.

## Reference

- **[Calculations & methodology](calculations.md)** — the exact formula, inputs, and validation for every derived metric and score (readiness, sleep score, quality metrics, baselines).
- **[Vaidya design & research](vaidya-research.md)** — the research and architectural decisions behind the AI coach.
- **[Google Health write payloads](google-health-write-payloads.md)** — the ground-truth Google Health API v4 write JSON used by the MCP write tools.

## Conventions used across these docs

- **Data-type names are kebab-case** (`heart-rate`, `daily-resting-heart-rate`) — matching the Google Health API and the codebase.
- **Times** are stored as UTC instants; local wall-clock is rendered by applying a stored UTC offset. "Today" / per-day grouping keys on a civil-date column, never a raw instant.
- **Code references** point at real files (e.g. `backend/internal/ingestion/mapper.go`) so you can jump from doc to source.

> These docs describe the system as it is in the code. If you change behavior, please update the relevant doc (and its `.html` twin) in the same PR.
