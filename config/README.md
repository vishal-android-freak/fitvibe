# config/ — secret files for the Docker stack

This folder is mounted **read-only** into the containers at `/config` by
`docker-compose.yml`. Put your credential files here; nothing in this folder is
committed except this README (see `.gitignore`).

## Files to place here

| File | Used by | Purpose |
|------|---------|---------|
| `firebase-service-account.json` | backend, vaidya-service | Firebase Admin service-account JSON. The backend mints custom tokens after Google OAuth and verifies the app's ID tokens with it; vaidya-service verifies ID tokens on its HTTP endpoints. Download from Firebase console → Project settings → Service accounts → Generate new private key. |
| `google-oauth.json` | reference | The OAuth client JSON you download from Google Cloud (APIs & Services → Credentials). The backend reads the client id/secret/redirect from **env vars**, not this file — copy the values into your root `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`). Keeping the JSON here is just so the source of truth lives with the other secrets. |

## How the stack reads them

In your root `.env` (copied from `.env.docker.example`):

```
FIREBASE_CREDENTIALS_FILE=/config/firebase-service-account.json
GOOGLE_CLIENT_ID=...        # from google-oauth.json
GOOGLE_CLIENT_SECRET=...    # from google-oauth.json
GOOGLE_REDIRECT_URI=...
```

The folder is mounted read-only, so the containers can read but never modify
your secrets. Keep real keys out of git — this `.gitignore` enforces it.
