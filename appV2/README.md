# FitVibe — Mobile App (Expo / React Native)

The FitVibe client: Today, Sleep, Body, Insights, and the Ask Vaidya chat. Fed by the Go backend's read API and the Vaidya coach.

> **Full documentation:** [`../docs/app.md`](../docs/app.md) · architecture: [`../docs/architecture.md`](../docs/architecture.md)

## Quick start

```bash
cp .env.example .env       # point EXPO_PUBLIC_API_BASE_URL at your backend
npm install
npm run ios                # or: npm run android
```

> **A dev/standalone build is required — not Expo Go.** The app uses native modules (Firebase, Skia, image pickers, notifications). `app.config.js` wires the Google services files and trims Android ABIs for faster EAS dev builds.

## Stack

Expo SDK 56 · React Native 0.85 · React 19 · expo-router (file-based nav) · react-native-firebase (auth) · @shopify/react-native-skia · reanimated · lucide-react-native · Sora + JetBrains Mono.

## Configuration

Copy [`.env.example`](.env.example) to `.env`:

- `EXPO_PUBLIC_API_BASE_URL` — the Go backend (default `http://localhost:8080`).
- `EXPO_PUBLIC_VAIDYA_BASE_URL` — the Vaidya service (default `http://localhost:8090`).

`EXPO_PUBLIC_*` vars are inlined at build time. The backend brokers Google OAuth, so no Google client id ships in the app. Full setup (Firebase service files, etc.) is in [`../docs/setup.md`](../docs/setup.md).

> See [`AGENTS.md`](AGENTS.md) — this app targets a pinned Expo version; read the versioned docs before changing native config.
