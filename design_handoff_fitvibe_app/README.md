# Handoff: FitVibe Mobile App

## Overview
FitVibe is a **dark-first health & fitness app** that ingests a user's **Google Health data** (populated by their Fitbit) and layers an **LLM insights engine** on top — turning raw metrics into plain-language, causal insights and answering health questions with inline "generative UI" (charts, rings, tiles rendered in chat). Tagline: *"Your data, finally making sense."*

This package contains the full set of design references built so far:
- **Onboarding + Google sign-in/consent** flow
- The **main app**: four bottom-nav tabs — **Today, Sleep, Body, Insights** — plus the **Ask FitVibe** chat, all connected.

---

## About the Design Files
The files in this bundle are **design references implemented in HTML/React (via in-browser Babel)** — runnable prototypes showing the intended look, layout, copy, and behavior. **They are not production code to copy directly.**

Your task: **recreate these designs in the target mobile codebase** (the product is planned as **Expo / React Native**), using that environment's established patterns, navigation, and component libraries. If the codebase doesn't exist yet, scaffold a fresh Expo + React Native app (TypeScript, Expo Router, Reanimated for motion, `react-native-svg` for the charts/rings) and implement the designs there.

The prototypes use a small bespoke component library (the "FitVibe Design System") loaded from `_ds/`. **Recreate those components natively** — don't try to run the web bundle in RN. The design tokens (colors, type, spacing, motion) are the contract; they're documented in full below and in `_ds/.../tokens/*.css`.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, motion, and interactions. Recreate the UI faithfully using the token values below. Where a specific pixel value isn't in this README, read it from the referenced source `.jsx` file — the prototypes are the source of truth for exact measurements.

---

## How to run the prototypes
Open either HTML file in a browser (they need to be served from this folder so relative paths resolve — e.g. `npx serve` in the handoff root, then open the file):
- **`FitVibe Onboarding.html`** — welcome → Google sign-in → consent → connecting → success. Has a Tweaks panel (welcome style, consent layout, accent).
- **`FitVibe App.html`** — the full app. Bottom nav switches Today / Sleep / Body / Insights; the center **Ask** button and most AI cards open the chat.

> Note: the prototypes are scaled into a phone bezel (`PhoneFrame`) at a logical width of **402px** (iPhone 16 Pro). The bezel is a prototyping device only — don't recreate it in the app.

---

## Architecture (prototype source map)
All screens are plain React (no build step) under `app/`, composed from the design-system components on `window.FitVibeDesignSystem_52b6f8`.

```
app/
  AppShell.jsx        PhoneFrame + StatusBar + Scroll + SectionLabel + Icon (Lucide) helper
  AppRoot.jsx         FitVibeApp — owns bottom nav + tab switching + AI overlays (analysis, chat)
  data.jsx            shared mock data + fmtMin/Icon utilities

  WelcomeScreen.jsx   onboarding welcome (2 variants) + Spinner
  GoogleAuth.jsx      neutral Google account-picker + scopes consent sheet
  ConnectingScreen.jsx stepped sync loading state
  SuccessScreen.jsx   "all set" + rings
  Flow.jsx            onboarding state machine

  today/
    TodayScreen.jsx   TodayContent — header, hero carousel, AI insight, activity feed, sleep card
    hero.jsx          HeroCarousel — swipeable Readiness / Activity rings / Heart pages + dots
    genui.jsx         GaugeArc, SleepDurationCard, RecoverySignals, TrainingLoad (inline AI charts)
    aiDetail.jsx      AIAnalysisDetail (rich analysis view) + AskConversation (chat) + canned replies
    sleep.jsx         SleepCard — hypnogram (cityscape chart) + stage breakdown w/ typical-range marker
    widgets.jsx       (earlier editable-widget grid; not used in current Today, kept for reference)

  sleep/
    SleepScreen.jsx   SleepContent — day scroller, score hero, AI insight, hypnogram, vitals, schedule, weekly trend

  body/
    BodyScreen.jsx    BodyContent — segmented Vitals/Nutrition/Activity + floating "+" log button + toast
    sections.jsx      BodyVitals, BodyNutrition, BodyActivity
    logSheet.jsx      LogFab, LogMenu, LogSheet (food / workout / walk / water / weight)

  insights/
    InsightsScreen.jsx InsightsContent — spotlight, weekly recap, filter chips, recency-grouped feed
    insightCards.jsx   INSIGHTS data, mini-viz, provenance chips, feed card, WeeklyRecap
```

---

## Design-system components to recreate
These are the reusable primitives (in `_ds/.../_ds_bundle.js`; read it for exact internals). Recreate each as a native component:

| Component | Purpose | Key props |
|---|---|---|
| `Button` | Pillowy CTA; `variant="ai"` uses the AI gradient | `variant` (primary/ai), `size` (lg), `block`, `iconLeft/Right` |
| `Card` | Workhorse surface, 28px radius, soft elevation | `tone` (default/ai), `pad` |
| `Badge` | Tiny status/trend pill | `tone` (positive/…), `hue` (metric) |
| `Chip` | Filter / quick-prompt pill, fills accent when `selected` | `selected` |
| `Avatar` | Round avatar, gradient-initials fallback | `name`, `size`, `ring`, `src` |
| `Switch` | Settings toggle | `checked`, `onChange` |
| `IconButton` | Icon-only button | `label`, `variant` |
| `ProgressRing` | **Hero metric viz** — concentric rings, glowing caps | `value` (0–1) or `rings:[{value,hue}]`, `size`, `thickness`, `hue` |
| `Sparkline` | Tiny smooth trend line + gradient fill + end dot | `data`, `hue`, `width`, `height`, `fill`, `dot` |
| `StatTile` | Dense metric tile | `label`, `value`, `unit`, `hue`, `icon`, `delta`, `deltaDir`, `goal`, `spark` |
| `BarChart` | Weekly/daily bars; tallest bar glows | `data`, `labels`, `hue`, `height`, `goal`, `highlightMax` |
| `InsightCard` | **Signature AI surface** — gradient-bordered card + sparkle eyebrow | `eyebrow`, `title`, children |
| `ChatMessage` | Chat bubble; assistant = soft left + sparkle avatar, can host generative UI below text | `role`, `text`, children |

Icons: **Lucide** (1.75–2px stroke, rounded), colored by metric hue. The bespoke **AI sparkle** (`sparkles`) marks anything AI-generated. **No emoji** anywhere in product UI.

---

## Screens / Views

### A. Onboarding (`FitVibe Onboarding.html`)
Single welcome → Google handoff → consent → connecting → success. Full motion (entrance animations, sheet slide-up, ring fills).

1. **Welcome** — app icon/wordmark, headline, subcopy, a white **"Continue with Google"** button (multi-color G mark), a privacy line, and legal microcopy. Two variants exist (calm icon hero / "vital" animated rings hero).
2. **Google sign-in (account picker)** — a **neutral light sheet** (NOT FitVibe-dark, NOT a pixel-clone of Google) with an `accounts.google.com` URL bar, two demo accounts + "Use another account", and the standard "Google will share your name, email…" disclaimer. *In a real app this is the OS OAuth web flow — you do not build this screen; trigger the system Google OAuth.*
3. **Consent (scopes)** — "FitVibe wants to access your Google Health data" with grant toggles for: **Heart rate & HRV (required), Sleep stages, Steps & distance, Activity & energy, SpO₂ & respiratory, Weight & body composition, Nutrition & hydration**. Two layouts (flat checklist / grouped). Allow button reflects granted count.
4. **Connecting** — spinner + per-scope sync list that checks off one by one, progress bar.
5. **Success** — "You're all set, {name}." rings fill, connected-device chip, "Go to your dashboard" CTA.

### B. Today (`TodayContent`)
Purpose: a glanceable daily summary. Top→bottom:
- **Header** — time-based greeting ("Good morning, Maya") + date eyebrow + profile **Avatar** (top-right; profile lives here, not in the nav). Below it an **AI one-liner** in a gradient-bordered soft strip that changes with time of day.
- **Hero carousel** — swipeable (drag/scroll) with **dot indicators**: page 1 **Readiness** (86, "Ready to push") + 3 factor tiles; page 2 **Activity rings** (Move/Exercise/Active); page 3 **Heart** (resting HR + sparkline).
- **FitVibe insight** — `InsightCard`, tappable → opens the rich analysis.
- **Today's activity** — a unified **timeline feed** (single narrow left rail: icon stacked over time; connector line). Entries include logged items, tracked workouts, and **AI analysis cards** (gradient, "View full analysis") that open the rich analysis view.
- **Last night** — the `SleepCard` (hypnogram + stage breakdown).

### C. Sleep (`SleepContent`)
- **Day scroller** — title "Sleep" + calendar button; a row with `‹ ›` chevrons stepping through the last 7 nights (score/duration/vitals/schedule all update per night).
- **Score hero** — `GaugeArc` + big score, rating, duration, and bed–wake times (e.g. "84 · Good · 7h 12m").
- **FitVibe insight** — tappable → analysis.
- **Stages** — the **hypnogram** ("cityscape" stepped chart, lanes Awake/REM/Light/Deep top→bottom, hour axis) + stage breakdown bars (time + %) each with a **typical-range marker** + legend.
- **Overnight vitals** — 6 `StatTile`s: Resting HR, HRV, SpO₂, Respiratory rate, Skin temp variation, Restlessness.
- **Schedule** — Bedtime & Wake, actual vs target with deltas.
- **Last 7 nights** — `BarChart` of duration + 7-night average and ±consistency.

### D. Body (`BodyContent`)
Segmented control: **Vitals / Nutrition / Activity**. A floating **"+"** (AI-gradient FAB, bottom-right above nav) opens a **log menu** (food / workout / walk / water / weight); each opens a complete-looking bottom sheet that **confirms with a toast** (does not mutate the screen — wire to real persistence in production).
- **Vitals** (full catalog, grouped): *Heart & circulation* — Resting HR, HRV, Blood pressure, VO₂ max + an **ECG card** (mini waveform + "Normal sinus" badge); *Oxygen & respiration* — SpO₂, Respiratory rate; *Body* — Weight, Body fat, Body temp, Blood glucose. A calm **"not medical advice"** footnote on the medical-adjacent metrics.
- **Nutrition** — calorie budget (goal − food + exercise = remaining) with progress bar; **macro rings** (Protein/Carbs/Fat); Hydration + Fiber tiles; **micronutrient** bars (sugar, sodium, potassium, calcium, iron); today's meals list.
- **Activity** — Steps/Distance/Floors tiles; Active energy + Zone minutes; today's exercise sessions; weekly active-minutes `BarChart`.

### E. Insights (`InsightsContent`)
The AI feed. Every card visibly traces back to the **Google Health data points it was derived from** (a "Derived from" chip row).
- **Header** — "Derived from your Google Health data".
- **Spotlight** — gradient `InsightCard` "Insight of the week" with the `RecoverySignals` viz, provenance chips, and **source device + freshness** ("Fitbit Charge 6 · synced 4 min ago").
- **Weekly recap** — "Your week in review", 4 stats.
- **Filter chips** — All / Recovery / Sleep / Heart / Activity / Nutrition (filters the feed).
- **Recency-grouped feed** (New / This week / Earlier). Each card: a **type tag** (Trend / Correlation / Flag / Achievement / Recommendation / Comparison), optional **NEW** badge, timestamp, headline, causal body with **bolded metrics**, an **inline viz** (comparison bars / anomaly bars / streak dots / readiness ring / sparkline), the **provenance** row, and an **"Ask about this"** affordance + thumbs feedback.

### F. Ask FitVibe (`AskConversation`)
Full-screen chat overlay. Opened by the center **Ask** nav button (empty), by tapping any Insights card (seeded with a tailored question), or by an analysis reply chip. User bubbles (accent, right) + assistant bubbles (soft, left, sparkle avatar). Typing indicator, smart follow-up chips, working composer with AI-gradient send button. Replies are canned/contextual in the prototype — wire to the real LLM in production.

### G. AI Analysis detail (`AIAnalysisDetail`)
Rich full-screen view opened from AI cards: sparkle+timestamp header, headline, body with bolded metrics, bulleted recommendations, a follow-up question, **generative-UI blocks** (sleep → duration/score gauge + hypnogram + recovery signals; run → training-load bars + recovery signals), 👍/👎 feedback, **not-medical-advice disclaimer**, and smart-reply chips that continue into Ask FitVibe.

---

## Interactions & Behavior
- **Bottom nav (Option B):** Today · Sleep · **Ask** (center, AI-gradient circle) · Body · Insights. Today/Sleep/Body/Insights switch the active tab; **Ask** opens the chat overlay. Active tab tinted with `--accent`. **Profile is the header avatar**, not a tab.
- **Overlays** slide in from the right (`transform: translateX(100%) → 0`, `--dur-slow`, `--ease-out`), full-bleed, opaque, above the nav. Close returns to the tab.
- **Hero carousel:** horizontal scroll-snap + drag; dots animate (active dot widens, `--accent`).
- **Sheets** (consent, log, add): slide up from bottom (`translateY(101%) → 0`), with a scrim (`rgba(3,5,9,.5–.6)` + slight blur) and a grabber.
- **Rings & bars animate up from 0** on mount (`--dur-slow`); respect `prefers-reduced-motion` (show end-state). Press: buttons scale ~0.97; cards lift `translateY(-2px)` on hover.
- **Day scroller** clamps at "last night" (can't go future) and 7 nights back.
- **Logging** sheets confirm → toast; **do not** mutate data in the prototype.
- **Provenance** is core to Insights — preserve "Derived from {data points}" on every insight.

## State Management
- **Active tab** (`today|sleep|body|insights`) + overlay stack (`analysis` id, `chat` seed) — in the prototype this lives in `FitVibeApp` (`AppRoot.jsx`). In RN use your navigator (e.g. Expo Router tabs + modal routes).
- **Onboarding** is a small state machine: `welcome → google → connecting → success` with granted-scopes + chosen-account state (`Flow.jsx`).
- **Sleep** holds a selected-night index into a `NIGHTS` array.
- **Body** holds the active segment, open log-sheet kind, and a transient toast.
- **Insights** holds the active category filter.
- **Chat** holds the message list + typing flag.
- **Real data:** all numbers are mock. In production, fetch from your Google Health sync layer; insights/analyses/chat come from the LLM service. Keep the **provenance** (which data points fed each insight) in the insight payload.

---

## Design Tokens
Dark-first. The **active accent in the current design is `aurora`** (set `data-accent="aurora"` on the root) — violet + cyan, AI-forward. Default (no attribute) is the Vital green+blue scheme; `sunset` (coral+amber) also ships. Full source: `_ds/fitvibe-design-system-52b6f8ef-be7b-44cb-b853-421279a40443/tokens/`.

### Typography
- **Display & sans:** **Sora** (geometric, sporty, tabular figures). Used for all UI text and big metric numerals.
- **Mono:** **JetBrains Mono** (timestamps, raw data).
- Weights: 300/400/500/600/700/800. Big metric numbers use 700 with tabular figures.
- Scale (px): 2xs 11 · xs 12 · sm 13 · **base 15** · md 17 · lg 20 · xl 24 · 2xl 30 · 3xl 38 · 4xl 48 · 5xl 60 · 6xl 76.
- Line heights: none 1 · tight 1.12 · snug 1.3 · normal 1.5 · relaxed 1.65.
- Tracking: tight −0.015em (display) · caps 0.14em (uppercase eyebrows).

### Color (canonical + the `--hue-*` / `--text-*` aliases the screens use)
**Surfaces (dark):** bg-app `#0A0E1A` · bg-sunken `#070B14` · surface-card `#131A2B` · surface-raised `#1A2236` · surface-overlay `#0E1424`.
**Text:** primary/strong `#F8FAFC` · secondary `#94A3B8` · tertiary/faint `#64748B` · muted `#475569` · on-accent `#1a0b33` (aurora).
**Borders:** subtle `rgba(255,255,255,.07)` (`--ring-hairline`) · default `.11` (`--ring-card`) · strong `.18`.
**Metric hues** (charts/rings are always colored by metric):
- move/steps/recovery `#4ADE80` · heart `#FF5C7A` · sleep `#888CF9` · oxygen/SpO₂ `#38E0D8` · energy `#FFB020` · hydration `#4380FF` · nutrition `#FF844C` · mind/HRV `#C792EA` · sky `#60A5FA`.
**Accent (aurora active):** accent `#A78BFA` · hover `#C4B5FD` · press `#8B5CF6` · secondary `#22D3EE` · accent-soft `rgba(167,139,250,.15)`.
**Default accent (Vital):** `#4ADE80` green + `#60A5FA` blue.
**Status:** success/positive `#4ADE80` · warning `#FBBF24` · danger `#F43F5E` · info `#60A5FA`.
**AI gradient (the signature):** `linear-gradient(120deg, #A78BFA 0%, #22D3EE 50%, #67E8F9 100%)` (aurora) / default `#4ADE80 → #38E0D8 → #60A5FA`. Reserved for AI/insight moments only.
**Glass (sticky chrome only):** glass-bg `rgba(19,26,43,.66)` / bar `rgba(10,14,26,.72)`, blur 16px, border `rgba(255,255,255,.12)`. Don't blur static cards.
**Field glow** (app background wash): faint green top-left + blue top-right radial gradients over bg-app.

### Spacing & radii (4px grid)
- Space: 0,4,8,12,16,20,24,32,40,48,64,80,96.
- Radii: xs 8 · sm 12 · md 16 · lg 20 · **xl 28 (cards)** · 2xl 36 · pill 999.
- Controls: min hit target **44px** (sm 36 / md 44 / lg 52).
- Layout: app width **402px**, gutter 20, safe-top 59, safe-bottom 34.

### Shadows, glow & motion
- Elevation: xs `0 1px 2px rgba(0,0,0,.35)` … xl `0 30px 70px -18px rgba(0,0,0,.7)`. Inner top-light on raised cards: `inset 0 1px 0 rgba(255,255,255,.06)`.
- Glow (alive/important only — rings, accent buttons, AI cards): green `0 0 28px -4px rgba(74,222,128,.5)`, AI-glow `0 0 0 1px rgba(34,211,238,.35), 0 8px 40px -8px rgba(167,139,250,.5)`. Ordinary surfaces never glow.
- Motion easing: out `cubic-bezier(.22,1,.36,1)` (default), spring `cubic-bezier(.34,1.56,.64,1)` (toggles/playful), in-out `cubic-bezier(.65,0,.35,1)`. Durations: fast 140ms (press), base 220ms (hover/state), slow 380ms (ring fills, entrances).

---

## Content & voice (important — replicate in real copy)
- Warm, encouraging training partner; never clinical, never a drill sergeant. Refers to itself as **"FitVibe"**, addresses the user as **"you"**.
- **Sentence case everywhere** (buttons, titles, nav). Uppercase only as tiny tracked-out eyebrows.
- **Numbers lead**, big; words explain. Insights are **specific and causal** — tie a change to a cause and a next action.
- Units: `54 bpm`, `7h 12m`, `8,240 steps`, `72%`. Medical-adjacent metrics get neutral language + a "not medical advice" note.
- **No emoji** in product UI (only `▲ ▼` for trend deltas).

## Assets
- `assets/app-icon.svg`, `assets/logo-mark.svg`, `assets/logo-wordmark.svg` — original FitVibe marks (proposals; iterate freely).
- Icons: **Lucide** (use `lucide-react-native` in RN). The Google "G" in onboarding is a generic multi-color stand-in (the real OAuth flow is system-provided).
- Fonts: **Sora** + **JetBrains Mono** (Google Fonts) — bundle them in the app.

## Files
- `FitVibe Onboarding.html` — onboarding/sign-in/consent prototype (+ `app/WelcomeScreen.jsx`, `GoogleAuth.jsx`, `ConnectingScreen.jsx`, `SuccessScreen.jsx`, `Flow.jsx`).
- `FitVibe App.html` — full app prototype (+ everything under `app/today`, `app/sleep`, `app/body`, `app/insights`, plus `app/AppRoot.jsx`, `app/AppShell.jsx`, `app/data.jsx`).
- `_ds/fitvibe-design-system-52b6f8ef-be7b-44cb-b853-421279a40443/` — the design system: `tokens/*.css` (the token contract), `styles.css`, `_ds_bundle.js` (component implementations to recreate), `readme.md` (full design-system guide).
- `tweaks-panel.jsx` — prototyping-only tweak panel (ignore for the app).

> Build order suggestion: tokens & core components first (Button, Card, Badge, Chip, StatTile, ProgressRing, Sparkline, BarChart, InsightCard, ChatMessage) → app shell + bottom nav → Today → Sleep → Body → Insights → Ask FitVibe & analysis → onboarding. Wire real Google Health data and the LLM service behind the same component contracts.
