# Contributing to FitVibe

Thanks for your interest in contributing! FitVibe is a multi-service monorepo; this guide covers how to get each service running and the conventions we follow.

## Repository layout

| Path | Service | Language |
|------|---------|----------|
| `backend/` | Ingestion engine + read API | Go 1.25 |
| `appV2/` | Mobile app | TypeScript / Expo |
| `vaidya-service/` | AI coach engine | TypeScript / Node 22 |
| `vaidya-mcp/` | Agent tools (MCP) | Python 3.11 |
| `docs/` | Project documentation (Markdown + HTML) | — |

Each service has its own `README.md` with a quick start and a link into `docs/`.

## Before you start

- Open an issue to discuss substantial changes before sending a large PR.
- Never commit secrets. Every service ships a `.env.example`; copy it to `.env` (gitignored) and fill in your own values. Real Firebase service-account JSON, Google credentials, and `.env` files must stay out of git.

## Development setup

See [`docs/setup.md`](docs/setup.md) for the full environment setup (Google Cloud, Firebase, PostgreSQL). In brief:

```bash
# PostgreSQL (shared by every service) — from backend/
cd backend && docker compose up -d
```

### Backend (Go)

```bash
cd backend
go build ./...
go vet ./...
gofmt -l .                         # should print nothing

# Tests. Repository tests need PostgreSQL and skip without it.
go test ./...                                                          # non-DB tests
TEST_DATABASE_URL="postgres://fitvibe:fitvibe@localhost:5432/fitvibe?sslmode=disable" go test ./...
```

### Mobile app (Expo / RN)

```bash
cd appV2
npm install
npx tsc --noEmit                   # typecheck
npm run ios                        # or android — a dev build, not Expo Go
```

### Vaidya service (Node / TS)

```bash
cd vaidya-service
npm install
npm run typecheck
npm test                           # vitest
```

### Vaidya MCP (Python)

```bash
cd vaidya-mcp
python -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/pytest -q
```

## Conventions

- **Go** — `gofmt` + `go vet` clean. SQL is PostgreSQL dialect (`$1` placeholders, `RETURNING id`, `ON CONFLICT`). Data-type names are kebab-case. See `backend/CLAUDE.md` for the deeper conventions.
- **TypeScript** — keep `tsc --noEmit` clean. Match the surrounding style.
- **Python** — keep it `ruff`/`black`-clean and Pythonic.
- **Commits** — clear, present-tense subject lines; group related changes. Branch off `main`.
- **Keep the docs current.** If you change an algorithm, update [`docs/calculations.md`](docs/calculations.md) (and its HTML twin). If you change the schema, update [`docs/data-model.md`](docs/data-model.md).

## Tests must pass

Before opening a PR, make sure the affected service builds and its tests pass. The repository tests for the backend and MCP need a running PostgreSQL; the app and Vaidya service must at least typecheck.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
