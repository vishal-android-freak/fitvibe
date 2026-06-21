# Mobile App (Expo / React Native)

The FitVibe app is the client for the whole platform — five surfaces fed by the backend's read API and the Vaidya coach.

- **Source:** [`appV2/`](../appV2/)
- **Stack:** Expo SDK 56 · React Native 0.85 · React 19 · [expo-router](https://docs.expo.dev/router/introduction/) (file-based nav) · [react-native-firebase](https://rnfirebase.io) (auth) · [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/) (canvas) · [reanimated](https://docs.swmansion.com/react-native-reanimated/) · [lucide-react-native](https://lucide.dev) (icons) · Sora + JetBrains Mono fonts

> **Build requirement:** the app uses native modules (Firebase, Skia, image pickers, notifications, keyboard-controller), so it needs a **dev/standalone build** — it will not run in Expo Go. `app.config.js` wires the Google services files and trims Android ABIs for faster EAS dev/preview builds.

## Navigation

File-based routing under [`appV2/app/`](../appV2/app/):

```
app/
├── _layout.tsx          root: AuthProvider, fonts, KeyboardProvider, notification routing
├── index.tsx            auth gate / welcome
├── oauthredirect.tsx    OAuth deep-link callback
├── (tabs)/
│   ├── _layout.tsx      tab shell + custom glass BottomNav + auth guard
│   ├── index.tsx        → Today
│   ├── sleep.tsx        → Sleep
│   ├── body.tsx         → Body
│   └── insights.tsx     → Insights
├── ask.tsx              → Ask Vaidya chat (pushed modal, not a real tab)
├── history.tsx          conversation history (modal)
└── analysis/[id].tsx    insight detail (modal)
```

The bottom nav has five items; the center **Ask** item isn't a tab — it pushes the `/ask` chat modal.

## The five surfaces

| Screen | Source | Shows |
|--------|--------|-------|
| **Today** | `src/screens/today/` | A hero carousel (Readiness, Nutrition), a Vaidya headline insight, the activity timeline, and a last-night sleep summary. |
| **Sleep** | `src/screens/sleep/` | Sleep score, stage breakdown (hypnogram), quality metrics, vitals, naps, trends, and the sleep schedule editor. |
| **Body** | `src/screens/body/` | Vitals (RHR, HRV, SpO₂, respiratory rate, skin temp, VO₂max) with baselines, activity, body composition, and nutrition. |
| **Insights** | `src/screens/insights/` | The nightly Vaidya day-report feed, rendered as generative-UI blocks. |
| **Ask Vaidya** | `src/screens/ask/` | Live chat with the coach over a WebSocket — streamed text + generative blocks, with image/file attachments. |

### Today screen — one request, many sections

Every section of the Today screen reads from a single shared hook, `useToday()` ([`src/data/today.ts`](../appV2/src/data/today.ts)), which makes **one** `GET /me/today` request. A module-level store dedupes concurrent loads (only one request in flight) and feeds all sections — no prop-threading and no four-way round trip.

The hero carousel ([`src/screens/today/hero/`](../appV2/src/screens/today/hero/)) holds the **Readiness** page (the 0–100 score ring + steps/heart/sleep factor tiles) and the **Nutrition** page (calories eaten vs. burned, macros, hydration).

## Authentication

Sign-in is brokered by the backend so no Google client secret ships in the app:

```
1. User taps "Sign in with Google"
2. App opens WebBrowser → backend /auth/start?redirect=fitvibe://oauthredirect
3. Backend runs the Google OAuth dance, mints a Firebase custom token,
   and deep-links back: fitvibe://oauthredirect?token=<one-time>
4. App redeems it (GET /auth/session?token=) → { firebase_token }
5. signInWithCustomToken(firebase_token) → Firebase is now the source of truth
6. Every API call attaches the Firebase ID token as Authorization: Bearer <idToken>
```

See [`src/auth/`](../appV2/src/auth/). On a `401`, the API client force-refreshes the ID token and retries once.

## Data layer

[`src/data/`](../appV2/src/data/):

- **`api.ts`** — the HTTP client: a 12s timeout (RN's fetch has none), `401` → token-refresh-and-retry, normalized network errors, and the Firebase bearer header.
- **`useResource.tsx`** — a generic per-user data hook: shows a spinner only on first load, keeps stale data on refresh, surfaces an error only when there's nothing to show, and registers with the screen's refresh bus.
- **`today.ts`** — the shared Today store + `useToday()`.
- **`refresh.tsx`** — a `RefreshScope` per screen; each data hook registers its `reload` so pull-to-refresh refetches everything in parallel. (Data hooks must render *inside* the screen to register.)
- **`vaidya.ts`** — the Vaidya client: insight pulls over HTTP, conversation history, and the chat WebSocket.

## Ask Vaidya — the chat

The chat opens a WebSocket to `vaidya-service` ([`src/data/vaidya.ts`](../appV2/src/data/vaidya.ts) `openChat()`; the Firebase ID token is a query param because RN WebSockets can't reliably set headers). The server streams typed frames:

| Frame | Effect in the UI |
|-------|------------------|
| `{ type: 'ready', conversationId }` | Session id (for resume). |
| `{ type: 'token', delta }` | Appended to the current assistant bubble's text. |
| `{ type: 'tool', name }` | A tool started — **closes the current text bubble** so following text starts a new bubble (mirrors how Pi splits a turn) and keeps the working indicator up. |
| `{ type: 'block', block }` | A generative-UI block appended to the turn. |
| `{ type: 'done' }` | Turn complete; the working indicator clears. |
| `{ type: 'error', message }` | Surfaced inline. |

Attachments (`{ kind: 'image' \| 'text', mimeType, data: base64 }`) are sent with the message — images are shown to the model natively, text files appended to the prompt. Resuming a conversation loads prior messages over HTTP, then opens the socket with `?conversationId=`.

## Generative UI

Vaidya emits typed **GenerativeBlock**s ([`src/data/blocks.ts`](../appV2/src/data/blocks.ts)); the app renders them with [`BlockRenderer`](../appV2/src/components/ai/BlockRenderer.tsx):

- **Composite cards** — `today_headline`, `sleep_insight`, `day_summary`, `insight_card`.
- **Primitives** — `hypnogram`, `sparkline`, `bars`, `ring`, `stat_tile`, `stat_tile_grid`, `readiness_card`, `recovery_signals`, `streak_dots`, `micro_bars`, `badge`.
- **Escape hatch** — `canvas`, drawn with Skia from a small draw-op vocabulary (rect, circle, line, path, text, image, gradient, group).

A `SafeBlock` error boundary isolates a broken block so its siblings still render. Hue token names (e.g. `"sleep"`, `"heart"`) are resolved to hex via the shared theme `resolveHue()`. Assistant prose is rendered by a dependency-free `MarkdownText` (markdown-it pulls Node stdlib that RN lacks).

## Theme

[`src/theme/tokens.ts`](../appV2/src/theme/tokens.ts) is the design system — a dark-first palette with an aurora accent (violet + cyan) reserved for AI/insight moments, per-metric hues (sleep, heart, move, oxygen, energy, hydration, nutrition, mind), Sora (display/sans) + JetBrains Mono (mono) type, a 4px spacing grid, and radius/contrast tokens tuned for legibility on dark cards.

## Notifications

Push is **opt-in** ([`src/data/notifications.ts`](../appV2/src/data/notifications.ts)); `expo-notifications` is lazy-imported so the app degrades gracefully if the native module is absent. On opt-in the Expo token is registered with `vaidya-service` (`POST /vaidya/push/register`). Tapping a notification deep-links to the relevant tab by its `data.tab` (today / sleep / insights), handled cold-start and warm.

## Configuration

Copy [`appV2/.env.example`](../appV2/.env.example) to `.env`:

- `EXPO_PUBLIC_API_BASE_URL` — the Go backend (default `http://localhost:8080`).
- `EXPO_PUBLIC_VAIDYA_BASE_URL` — the Vaidya service (default `http://localhost:8090`; in production a proxy fronts both at one origin, so set them equal).

`EXPO_PUBLIC_*` vars are inlined into the bundle at build time. The backend brokers OAuth, so **no Google client id ships in the app**.

## Useful commands

```bash
cd appV2
npm install
npx tsc --noEmit          # typecheck
npm run ios               # dev build (or: npm run android)
```
