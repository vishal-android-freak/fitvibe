# FitVibe Design System

A dark-first, vibrant design system for **FitVibe** — a health & fitness app that
collects Google Health data (populated by the user's Fitbit) and layers an **LLM
insights engine** on top to turn raw metrics into beautiful, plain-language
insights and answer questions about the user's health and fitness.

> **Tagline in use:** *Your data, finally making sense.*

---

## 1. Product context

FitVibe pulls every datapoint the **Google Health API** exposes — steps, distance,
heart rate, HRV, resting HR, sleep stages, SpO₂, respiratory rate, active zone
minutes, VO₂ max, exercise sessions, nutrition, hydration, weight, body fat, blood
glucose, even ECG — into a local store, then an AI layer surfaces trends, flags
anomalies, and lets the user **ask questions** ("How did I sleep last week?",
"Is my recovery improving?") and get answers backed by **generative UI** (live
charts, rings and metric tiles rendered inline in chat).

**Products represented**
- **FitVibe mobile app** (Expo / React Native) — *the* surface. Currently planned;
  this design system defines its visual language from the ground up. The UI kit in
  `ui_kits/app/` is the canonical recreation.
- *(Backend only)* A Go service on a Raspberry Pi ingests Google Health webhooks +
  cron syncs into a local Turso/SQLite DB and exposes REST APIs to the app. No UI.

### Sources reviewed
- `fitvibe/backend/PLAN.md` — full backend architecture, the **complete Google
  Health data-type catalog** (the metric vocabulary this DS is built around), DB
  schema, OAuth flow, webhook mechanics. *Primary domain source.*
- `fitvibe/FINDINGS.md`, `fitvibe/fitbit-ble-analysis.html` — Fitbit BLE
  reverse-engineering notes (how the watch talks to the phone). Context only.
- `fitvibe/decompile/`, `fitvibe/work/` — decompiled **Fitbit** Android app, used
  purely for protocol/API analysis. **Not** a UI source — its design was not copied.
- `fitvibe/android/` — empty (the Expo app has not been built yet).

> ⚠️ **There was no existing FitVibe frontend, brand, logo, or design** to extract.
> This system was **designed from scratch** against the product concept and the
> health-metric domain. Treat every visual decision here as a proposal open to
> iteration, not a recreation of shipped UI.

---

## 2. CONTENT FUNDAMENTALS — how FitVibe writes

**Voice:** a knowledgeable, encouraging training partner — never a clinician, never
a drill sergeant. Warm, plain-spoken, quietly confident. It celebrates progress
without hype and flags concerns without alarm.

- **Person:** Address the user as **"you" / "your"**. The AI refers to itself
  sparingly as **"FitVibe"** (not "I"), e.g. *"FitVibe noticed your HRV climbing."*
- **Casing:** Sentence case **everywhere** — buttons, titles, nav, headers.
  Never Title Case UI. SCREAMING labels only as tiny tracked-out eyebrows
  (`.fv-eyebrow`), e.g. `TODAY`, `THIS WEEK`.
- **Numbers lead.** Copy is built around the metric. Put the number first and big;
  the words explain it. *"54 bpm — your lowest resting heart rate this month."*
- **Insights are specific and causal.** Tie a change to a cause and a next action:
  *"Resting HR dropped 3 bpm and HRV rose 12% this week — your training load looks
  well matched to recovery. Consider a harder session tomorrow."*
- **Units:** lowercase, space before unit only for words (`8,240 steps`), no space
  for symbols where conventional (`72%`, `7h 12m`, `54 bpm`, `2.4 km`). Use thin
  thousands separators. Times as `7h 12m`, not `7.2 hours`.
- **Tone of flags:** calm, not scary. *"Hydration was low 3 days running"* — never
  *"WARNING"*. Medical-adjacent metrics (ECG, blood glucose, irregular rhythm) get
  neutral, non-diagnostic language and a "not medical advice" footnote.
- **Emoji:** **none.** FitVibe never uses emoji in product UI. Energy comes from
  color, motion and the rings — not emoji. (Metric *icons* are line icons, below.)
- **Encouragement, sparingly:** short, earned, specific. *"Best sleep this week."*
  Avoid generic cheerleading ("Great job!!"). One exclamation max, rarely.

**Examples**
- Empty state: *"No workouts yet today. Your rings are ready when you are."*
- Streak: *"6-day move streak. Keep it rolling."*
- Connect screen: *"Connect Google Health to bring your Fitbit data to life."*
- AI prompt suggestions: *"How's my recovery?" · "Compare my sleep to last week" ·
  "Why is my resting HR up?"*

---

## 3. VISUAL FOUNDATIONS

**The idea: *data as jewelry on dark.*** Deep ink canvas, metrics that glow.

### Color & mood
- **Dark-first.** Default theme is deep ink (`--ink-0 #05070B` → `--ink-1 #0B1120`),
  with layered surfaces (`--ink-2 #121A29` cards, `--ink-3 #1A2535` raised). A full
  **light theme** ships via `:root[data-theme="light"]`.
- **Signature accent:** vitality green `--green-400 #4ADE80` (the "go" color) +
  sky `--sky-400 #60A5FA`. The two combine through cyan into the **AI gradient**
  `--ai-gradient` (green → cyan → blue, 135°) — reserved for AI / insight moments.
- **Metric hues** form the data palette — each metric owns a color: heart `#FF5C7A`,
  sleep `#8B8CF9`, move/steps `#4ADE80`, oxygen `#38E0D8`, energy `#FFB020`,
  hydration `#43B0FF`, mind/HRV `#C792EA`, nutrition `#FF8A4C`. Charts and rings are
  always colored by their metric hue, never arbitrarily.
- **Imagery vibe:** cool, low-key, deep-space dark with neon-on-ink accents. No warm
  stock photography; FitVibe is screen-native, data-driven, not lifestyle-photo led.
- **Alt accent** `:root[data-accent="sunset"]` (coral→amber→pink) is provided as a
  theme variation.

### Type
- **Space Grotesk** — display + **all big metric numerals**, with **tabular lining
  figures** on (`.fv-stat`, `--feat-tabular`). Sporty, technical, great numbers.
- **Hanken Grotesk** — body, labels, UI text. Humanist, friendly, highly legible.
- **JetBrains Mono** — timestamps, raw data, code-ish detail.
- Tight tracking on display (`--tracking-tight -0.02em`); tracked-out uppercase
  eyebrows (`--tracking-caps 0.12em`) for section labels.

### Shape, borders, radii
- **Pillowy.** Cards 24px (`--radius-xl`), tiles 20px (`--radius-lg`), inputs/chips
  16px, pills 999px, hero sheets 32px.
- Borders are **hairlines** — a low-opacity inset ring (`--ring-hairline`) rather
  than hard 1px lines. The AI surface uses a **gradient border** (padding-box /
  border-box technique), not a solid stroke.

### Elevation, shadow & glow
- **Two shadow languages.** (1) *Soft dark elevation* — low-spread, dark, never
  harsh (`--shadow-sm…xl`), plus a subtle top inner-highlight (`--ring-card`).
  (2) *Colored glow* — metric-colored drop shadows on rings, accent buttons and AI
  cards (`--glow-accent`, `--glow-ai`, `--glow-ring`, `--glow-soft`). Glow = "this
  is alive / important". Ordinary surfaces never glow.

### Backgrounds
- The app field is deep ink + a **subtle radial vitality glow** (`--field-glow`):
  a faint green wash top-left, sky wash top-right. No busy patterns, no full-bleed
  photography, no heavy gradients across whole screens. Restraint on dark.

### Transparency & blur
- **Glass** (`--glass-bg` + `--glass-blur 18px`) is reserved for **sticky/floating
  chrome**: the bottom tab bar, sticky headers, sheets, and toolbars over content.
  Body content stays opaque for legibility. Don't blur static cards.

### Motion
- **Easing:** `--ease-out` (settle) is the default for most transitions;
  `--ease-spring` (gentle overshoot) for toggles and playful affordances.
- **Durations:** `--dur-fast 130ms` (press), `--dur-base 220ms` (hover/state),
  `--dur-slow 420ms` (ring fills, bar growth, entrances).
- **Signature:** rings and bars **animate up from empty** on load; the ring cap
  glows. Numbers can count up. Respect `prefers-reduced-motion` (show end-state).
- **Hover:** cards lift `translateY(-2px)`; ghost controls tint to `--accent-soft`.
- **Press:** buttons scale `0.97`, icon buttons `0.9`. Tactile, quick.

### Layout
- Mobile-first single column, **max ~440px** (`--max-content`), 20px side gutters.
- Fixed **glass bottom tab bar**; sticky glass header that condenses on scroll.
- Dense but breathing: tight metric grids (2-up tiles) with generous 16px gaps.

---

## 4. ICONOGRAPHY

- **System: [Lucide](https://lucide.dev)** — clean, consistent **1.75–2px stroke**,
  rounded line icons. Loaded from CDN (`unpkg.com/lucide`); see usage below.
  > ⚠️ **Substitution flag:** the codebase shipped **no icon assets** (no frontend
  > existed). Lucide was chosen as the closest fit for a modern, rounded, dark-first
  > health app. Swap freely if brand icons arrive.
- **Stroke, not fill.** Icons are line icons at ~2px to match the pillowy, airy
  feel. Filled glyphs only for tiny inline indicators (the AI **sparkle**).
- **Metric icons** (consistent mapping): `heart` (heart rate), `moon` (sleep),
  `footprints` (steps), `flame` (energy/calories), `droplet`/`glass-water`
  (hydration), `activity` (HRV/pulse), `wind` (respiratory/SpO₂), `dumbbell`
  (exercise), `utensils` (nutrition), `scale` (weight). Each rendered in its metric
  hue.
- **The AI sparkle** is the one bespoke glyph — a 4-point sparkle (in `InsightCard`
  / `ChatMessage`) on the AI gradient. It marks anything AI-generated.
- **Emoji are never used as icons.** No unicode-as-icon either, except `▲ ▼` for
  trend deltas in badges/tiles.

**Using Lucide (CDN):**
```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<i data-lucide="heart"></i>
<script>lucide.createIcons();</script>
```
Set `color` (inherits via `currentColor`) and `width/height` via CSS.

---

## 5. Index / manifest

**Foundations (root)**
- `styles.css` — the single entry point consumers link. `@import`s everything below.
- `tokens/colors.css` · `typography.css` · `spacing.css` · `effects.css` · `base.css`
- `assets/` — `logo-mark.svg`, `logo-wordmark.svg`, `app-icon.svg`

**Components** (`window.FitVibeDesignSystem_52b6f8.*`)
- `components/core/` — `Button`, `IconButton`, `Card`, `Badge`, `Chip`, `Avatar`, `Switch`
- `components/data/` — `ProgressRing`, `Sparkline`, `StatTile`, `BarChart`
- `components/ai/` — `InsightCard`, `ChatMessage`

**UI kit**
- `ui_kits/app/` — the FitVibe mobile app: onboarding/connect, today dashboard,
  metric detail, insights feed, Ask FitVibe chat, trends, profile. See its README.

**Design System tab cards**
- Foundations: `guidelines/*.card.html` (Brand, Type, Colors, Spacing)
- Components: each `components/<group>/*.card.html`

**Other**
- `SKILL.md` — Agent-Skills-compatible entry point.

---

## 6. Caveats
- Fonts are **Google Fonts** (Space Grotesk / Hanken Grotesk / JetBrains Mono),
  loaded via `@import` in `styles.css` — no binaries are bundled, so the compiler
  reports 0 `@font-face`. If FitVibe adopts brand fonts, drop the files in and add
  `@font-face` rules.
- Logo, app icon and the entire visual language are **original proposals** (no prior
  brand existed). Iterate freely.
