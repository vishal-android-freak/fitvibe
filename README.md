# FitVibe Backend

Go backend for FitVibe that ingests Google Health API data into a local Turso/libSQL SQLite database. Built for deployment on a Raspberry Pi.

## Features

- Google OAuth 2.0 exchange and refresh token management
- Local Turso (libSQL) SQLite database with migrations
- Historical backfill of Google Health data points on first login
- Webhook notification handling with signature verification
- Cron-based sync for list, rollup, and profile/settings data
- REST API endpoints for OAuth exchange and admin operations

## Tech Stack

- Go 1.22+
- Turso/libSQL SQLite (`turso.tech/database/tursogo`)
- Chi router
- Google OAuth2 / Health API v4

## Project Structure

```
backend/
├── cmd/
│   ├── authlink/       # Generates OAuth consent URL
│   └── server/         # HTTP server entrypoint
├── internal/
│   ├── api/            # Admin HTTP handlers
│   ├── config/         # Environment config loader
│   ├── cron/           # Scheduled sync jobs
│   ├── db/             # Database connection & migrations
│   ├── db/repositories # Data access layer
│   ├── healthapi/      # Typed Google Health API client
│   ├── ingestion/      # Data point mapping
│   ├── oauth/          # OAuth service
│   └── webhooks/       # Webhook handler & processor
├── .env.example
├── go.mod
└── go.sum
```

## Getting Started

1. Copy the example environment file and fill in your credentials:

   ```bash
   cd backend
   cp .env.example .env
   ```

2. Build and run the server:

   ```bash
   go build -o server-bin ./cmd/server
   ./server-bin
   ```

3. Generate an OAuth link and authorize:

   ```bash
   go run ./cmd/authlink
   ```

4. Exchange the authorization code:

   ```bash
   curl -X POST http://localhost:8080/auth/exchange \
     -H "Content-Type: application/json" \
     -d '{"code":"YOUR_CODE","redirect_uri":"https://fitvibe.naarang.com/oa/c"}'
   ```

## Environment Variables

See `backend/.env.example` for all required variables.

## License

Private — for FitVibe use only.
