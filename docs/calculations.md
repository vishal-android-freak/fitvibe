# Calculations & Methodology Reference

> This is the Markdown twin of [`calculations.html`](calculations.html) — the same content, styled for GitHub.

Every derived metric, score, threshold, and non-trivial transformation in FitVibe — what it computes, the exact formula, the inputs, where it lives in the code, and how well it was validated against ground truth.

This is a **living document**. When an algorithm is added or changed, update it here (see the [changelog](#changelog)). The aim is that anyone — or any future AI agent — can understand and reproduce a number without reverse-engineering the source.

_Last updated **2026-06-18** · Backend `internal/sleep`, `internal/today`, `internal/ingestion`, `internal/healthapi`, `internal/cron` · App `appV2/src`_

---

## Introduction

FitVibe ingests Google Health API v4 data into PostgreSQL and serves screen-shaped read APIs to the mobile app. Most numbers the user sees are **derived** — the API rarely hands us a finished metric. This document records how each one is produced.

Two recurring principles drive the methodology:

- **Lossless raw, derived columns.** The full API payload is always stored in `payload_json` (JSONB), so any derived column can be recomputed without re-fetching.
- **Validate against ground truth, label honestly.** Where a Google metric is reverse-engineered, it is compared against real app values and stated plainly whether it matches **EXACT**, **APPROX**, is a **PROXY**, or cannot be computed (**NOT POSSIBLE**).

---

## Conventions & units

| Concept | Convention |
| --- | --- |
| Time storage | UTC instants in `TIMESTAMPTZ`; local wall-clock rendered by applying `*_utc_offset_seconds`. |
| Local day | Grouped on the `civil_start_date` / `civil_end_date` DATE column, never a raw instant. |
| Night labelling | **Important:** the Google app labels a night by the **wake morning**; our `civil_start_date` is the **bed evening**. App "Jun 18" = our row `2026-06-17`. |
| Data-type names | kebab-case throughout (`heart-rate`, `daily-resting-heart-rate`). |
| Number coercion | Centralized in `healthapi.Number` / `DurationSeconds` (the API returns some ints as strings and durations as `"600s"`). |
| Minutes-since-midnight | Clock values stored/derived as `hour*60 + minute` in local time; normalized to `[0,1440)`. |

---

## Validation philosophy

The sleep metrics were reverse-engineered and then checked against **9 real nights** of this user's Google Health values (bed-dates Jun 9–17 2026). That comparison is what lets us label each metric exact / approximate / proxy rather than guessing. The same approach should be used whenever a new derived metric claims to mirror an external app.

> **Why ground-truth fitting matters.** A formula that looks reasonable can still be wrong. Fitting against real values turned up that our Deep+REM _overcounts_ Google's "sound sleep" on some nights and undercounts on others (so it can't be a parity metric), and that the interruptions rule matches Google to the minute. Neither was obvious a priori.

---

## Sleep score (0–100) — CALIBRATED

`internal/sleep/score.go` · `computeSleepScore()`

A composite score modeled on Fitbit/Google's published **50 / 25 / 25** split (Duration / Composition / Restoration), then calibrated to this user's real scores. Bands mirror Fitbit/Google exactly.

#### Composite formula

```
composite = 0.50 · durationSub(asleepMin)
          + 0.25 · restorativeSub(deepMin + remMin)
          + 0.25 · interruptionsSub(wasoMin, fullAwakenings)

score = round( clamp( 0.8110 · composite + 4.10 , 0 , 100 ) )
```

#### Sub-scores (each 0–100)

| Sub-score | Weight | Curve | Inputs |
| --- | --- | --- | --- |
| Duration | 50% | `clamp(asleepMin / 480 · 100, 0, 100)` — full at 8h | device `MinutesAsleep` |
| Restorative | 25% | `clamp((deep+rem) / 180 · 100, 0, 100)` — target 90+90 min | Deep+REM summary minutes |
| Interruptions | 25% | `wasoPart + 20·awkFrac`; `wasoPart = 80` if WASO ≤ 20 min else `clamp(80 − (waso−20)/70·80, 0, 80)`; `awkFrac = {0,1: 1.0; 2: 0.75; 3: 0.5; 4+: 0.0}` | mid-sleep WASO min + full-awakening count |

> **The affine layer (`0.8110·x + 4.10`) is load-bearing.** A pure weighted average overshoots this user's long nights by 14+ points (Google compresses the top end via age/gender targets). The affine reproduces that compression. It is calibrated to **one user** and will drift for other users/ages — which is why this ships as _FitVibe's own score with Google-standard bands_, not a reproduction of Google's number.

#### Bands

| Band | Range |
| --- | --- |
| Excellent | 90–100 |
| Good | 80–89 |
| Fair | 60–79 |
| Poor | below 60 |

_Mirrors Fitbit/Google exactly (Garmin matches). Typical user averages 72–83._

#### Fit against 9 real nights

RMSE 1.56, MAE 1.33, max error 3 points. Every night within ±3; 7 of 9 within ±2.

| App date | Asleep | Deep+REM | Google | FitVibe | Δ |
| --- | --- | --- | --- | --- | --- |
| Jun 18 | 365 | 186 | 76 | 75 | −1 |
| Jun 17 | 384 | 156 | 76 | 74 | −2 |
| Jun 16 | 418 | 98 | 72 | 70 | −2 |
| Jun 15 | 412 | 134 | 73 | 74 | +1 |
| Jun 14 | 454 | 190 | 84 | 83 | −1 |
| Jun 13 | 534 | 240 | 85 | 85 | 0 |
| Jun 12 | 496 | 225 | 86 | 85 | −1 |
| Jun 11 | 232 | 64 | 50 | 51 | +1 |
| Jun 10 | 549 | 197 | 82 | 85 | +3 |

_The Restoration 25% is borrowed from Fitbit's published split, not learned: 6 of 9 nights had zero interruptions, so that pillar is essentially unconstrained by this data. We substitute our (exact) interruptions metric for Fitbit's HR-based restoration, which the v4 API doesn't expose._

---

## Readiness score (0–100) — CALIBRATED

`internal/readiness/score.go` (planned) · drives the Today-tab center ring

Google/Fitbit's Readiness is a Premium 0–100 score from **exactly three inputs** — HRV, resting heart rate, recent sleep — each compared to the user's **personal rolling baseline** (not population norms). The composite is not exposed by any API, so we recompute it from the raw components. Bands mirror Google: **Low 0–29, Moderate 30–64, High 65–100**.

#### Inputs (per civil date D, same-day alignment)

| Component | Source | Field |
| --- | --- | --- |
| HRV (primary) | `daily-heart-rate-variability` | `deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds` (deep-sleep RMSSD — **not** the average-HRV field) |
| Resting HR | `daily-resting-heart-rate` | `value_avg` (bpm; lower is better) |
| Sleep | `sleep` summary stages | Deep + REM minutes |

> **Alignment confirmed empirically.** The score shown on the morning of date D uses the daily-HRV/RHR record dated **D itself** (overnight metrics, same civil date). Validated by correlation: under same-day alignment, `corr(score, deepRMSSD)=+0.95`, `corr(score, RHR)=−0.74`, `corr(score, deep+rem)=+0.80`; under D−1 alignment every correlation collapses to noise (≈0). A live score therefore **lags ~1 day** until the night's HRV record lands (it is computed later in the day from the prior night).

#### Formula

```
// per-component z-score vs the user's TRAILING baseline (days < D, ≥3 needed),
// computed from mean and population SD; clamped to [−3, +3].
zHRV   =  z(deepRMSSD_D    ; baseline)        // higher = better
zRHR   = −z(restingHR_D    ; baseline)        // sign-flipped: lower = better
zSleep =  z(deepRemMin_D   ; baseline)

Z      = 0.8·zHRV + 0.2·zRHR + 0.0·zSleep     // HRV ≫ RHR ≫ sleep
score  = round( 100 / (1 + exp(−(0.8·Z + 0))) )   // logistic squash
```

_Warm-up gate: needs ≥7 nights (≥3h each) for a baseline, ~30 days for it to stabilize. Before then the score is suppressed/labeled provisional. The baseline excludes today (uses days strictly before D) — this reproduces Google's adaptive "yesterday's peak raises the bar" behavior._

#### Bands

| Band | Range |
| --- | --- |
| High | 65–100 |
| Moderate | 30–64 |
| Low | 0–29 |

_Mirrors Google/Fitbit exactly._

#### Fit against 4 real scores (Jun 2026)

RMSE 3.78; every score within ±6. The weights (HRV 0.8 / RHR 0.2 / Sleep 0.0) were grid-searched against these four labeled days.

| Date shown | deepRMSSD | RHR | Deep+REM | Google | FitVibe | Δ |
| --- | --- | --- | --- | --- | --- | --- |
| Jun 18 | 56.2 | 62 | 214 | 77 | 83 | +6 |
| Jun 17 | 49.1 | 61 | 186 | 68 | 68 | 0 |
| Jun 16 | 52.8 | 63 | 156 | 86 | 81 | −5 |
| Jun 15 | 37.2 | 65 | 98 | 15 | 15 | 0 |

> **Honest limits.** This is _FitVibe's own score with Google-standard bands_, calibrated to one user over only 4 labeled days. Leave-one-out errors run 6–13 points, so the exact constants are soft — the _structure_ (same-day alignment, deep-sleep RMSSD, z-vs-baseline, logistic, HRV-dominant) is what's validated, not the precise weights. Earlier attempts **failed** (RMSE ~55) because they used average-HRV instead of deep-sleep RMSSD and a too-short, unstable baseline. Expect the weights to firm up as ~30 days accrue; they are kept config-tunable. The Sleep weight fitting to 0 is consistent across attempts — for this user, cardiac recovery (HRV+RHR) dominates and sleep architecture barely moves the score.

---

## Sleep-quality metrics

`internal/sleep/quality.go`

The Google Health "Sleep quality" card metrics, derived from the per-segment stage timeline (`sleep_stages`: stage_type / start / end). Validated against the same 9 nights.

| Metric | Verdict | Rule |
| --- | --- | --- |
| **Interruptions** (`computeInterruptions`) | EXACT | AWAKE/AWAKE_IN_BED/OUT_OF_BED segments of duration **≥ 5 min** occurring **strictly between** sleep onset (first asleep segment) and final wake (last asleep segment). Returns total minutes + count (= full awakenings). Matched the app to the minute on all 9 nights (22m/1→23m/1, 5m/1→6m/1, all zeros). |
| **Time to sound sleep** (`computeTimeToSoundSleep`) | ±2–3 min | Minutes from sleep onset to the start of the **first DEEP or REM** segment. Returns `(0, false)` if the night never reaches deep/REM. Reads a touch later than Google (which counts "steady light with calm HR" onset we can't detect), but within ±2–3 min across all nights. |
| **Restorative** (Deep + REM) (`computeSoundSleep`) | PROXY | Sum of DEEP + REM summary minutes. **Deliberately not labelled "sound sleep"** — see caveat. Diverges from Google's value by −48…+36 min, both directions. |
| **Sleep disruptions** (tick timeline) (`computeDisruptions`) | STAGE-BASED | A tick per AWAKE stretch occurring mid-sleep, positioned at its local wall-clock minute (`at`) with its duration (`minutes`, min 1). This is a stage-based "where was the night choppy" signal — **not** Google's movement-based restlessness. |
| **Restlessness** (minutes value) | NOT POSSIBLE | Google's restlessness is a 60-second accelerometer (toss-and-turn) classification the v4 API never returns. Tested against every field we store — nothing correlates. We surface the disruptions timeline instead, honestly labelled. |

> **Why "Restorative", not "Sound sleep".** Google's sound sleep = Deep + REM + steady-low-HR Light, _minus_ Deep/REM epochs with elevated/variable HR — a per-30s HR-steadiness gate that is proprietary and undocumented. Our Deep+REM is therefore the wrong set on both ends. A documented HR reimplementation could only _add_ steady-light minutes (never subtract restless deep/REM), so it would make over-count nights worse. We relabel to "Restorative · Deep + REM" (= Whoop's definition) and never claim parity.

_Sources: Google Health Help `answer/14236513` & `answer/14236712`; the 5-minute "memorable awakening" threshold is from the same literature Google cites._

---

## Typical-for-age in-range bands

`internal/sleep/bands.go` · `bandsByAge()`

"Typical for your age" bands for the quality gauges. Google ships shaded age/gender bands but publishes no numbers; these are reconstructed from the public literature it cites (NSF 2017 consensus, Ohayon 2004, Boulos 2019). Same four age buckets as `typicalByAge`. **No gender split** (small effect, age not always known → would over-claim). Three-state verdict: In range / Pay attention / Out of range.

| Metric | <18 | 18–44 | 45–64 | 65+ |
| --- | --- | --- | --- | --- |
| Time to sound sleep — green ≤ (min) | 18 | 20 | 25 | 30 |
| …amber ≤ (min) | 28 | 30 | 35 | 40 |
| Interruptions WASO — green ≤ (min) | 20 | 20 | 25 | 30 |
| …amber ≤ (min) | 40 | 40 | 45 | 50 |
| Full awakenings — green ≤ (count) | 1 | 1 | 1 | 2 |
| Restorative (Deep+REM) — green fraction of asleep | 0.42–0.52 | 0.35–0.50 | 0.30–0.42 | 0.25–0.38 |
| Sleep efficiency — green ≥ (%) | 85 | 85 | 83 | 80 |

> **Interruptions is NOT "must be 0".** One memorable awakening and ~20 min WASO is normal/healthy (NSF 2017). The earlier placeholder that required zero interruptions was wrong and has been replaced.

_High confidence: interruptions/WASO & efficiency floors (NSF 2017, same ≥5-min definition Google uses). Medium: exact per-bucket minute cuts for latency & the restorative band (Google publishes no tables; the 45–64 bucket is interpolated)._

---

## Stage totals, efficiency & typical mix

`internal/sleep/handler.go`, `typical.go`

#### Efficiency — NOT SHOWN

```
efficiency% = round( asleep / total · 100 )      // 0 if total ≤ 0
```

Where `asleep` and `total` prefer the device's authoritative `MinutesAsleep` / `MinutesInSleepPeriod`, falling back to summed stage minutes only when absent.

> **Computed but no longer displayed (dropped 2026-06-18).** The Fitbit-sourced payload gives no real "time in bed" — `minutesToFallAsleep` and `minutesAfterWakeUp` are hard-zero, so `minutesInSleepPeriod` ≈ the onset→wake span. The result is `asleep / sleep-period` ≈ 98–99% every normal night, with almost no variation, so it carried no signal and was removed from the Sleep-quality card. The field is still emitted in the API and still feeds the score's duration term indirectly and the `ratingFor` bucket, but is not rendered as a gauge. To compute a _true_ clinical efficiency we'd need a time-in-bed the device doesn't provide.

#### Stage canonicalization

`DEEP→Deep`, `REM→REM`, `LIGHT|SLEEPING→Light`, `AWAKE|AWAKE_IN_BED|OUT_OF_BED→Awake`, others skipped. Asleep = Deep + REM + Light (excludes Awake).

#### Stage totals & percentages

Prefers the device per-stage summary; falls back to summing the chronological segments. `percent = round(stageMin / total · 100)`. Stable order: Deep → REM → Light → Awake.

#### Typical stage mix by age (`typicalByAge`) — fraction of time in bed

| Stage | <18 | 18–44 | 45–64 | 65+ |
| --- | --- | --- | --- | --- |
| Deep | 0.22 | 0.18 | 0.13 | 0.08 |
| REM | 0.23 | 0.23 | 0.21 | 0.18 |
| Light | 0.50 | 0.54 | 0.59 | 0.66 |
| Awake | 0.05 | 0.05 | 0.07 | 0.08 |

_Polysomnography norms (Sleep Foundation; Ohayon 2004). Deep declines ~2%/decade; the hypnogram draws a "typical for your age" marker on each stage bar from these._

---

## Recent-nights query

`internal/db/repositories/sleep.go` · `RecentNights()`

- **One session per civil date.** `SELECT DISTINCT ON (civil_date) … ORDER BY civil_date DESC, (end_time − start_time) DESC` keeps the **longest** session, so a nap + main sleep on the same day collapse to one entry. _(Side effect: short naps don't appear separately.)_
- **Vitals by scalar subquery, not LEFT JOIN.** A vital type can have several rows per civil date (e.g. `respiratory-rate-sleep-summary`); a join would fan each night into duplicates. Each vital is `AVG(value_avg)` for that `civil_start_date`: RHR, HRV, SpO₂, respiratory rate.
- **Skin-temp delta with NaN guard.** `AVG(nightlyTemperatureCelsius − baselineTemperatureCelsius)` from the payload, excluding rows where either is the string `'NaN'` (the baseline is NaN before the 30-day baseline establishes; a NaN delta would otherwise render as garbage like −15372).
- Loads the per-segment stage timeline per night so the derived quality/score metrics work for history, not just last-night.

---

## Today: steps · heart rate · nutrition

`internal/db/repositories/today.go`, `internal/today/handler.go`

#### Today's local date

Computed in the user's zone from the most recent known UTC offset: `now.In(localZone).Format("2006-01-02")`, falling back to UTC.

#### Steps (source de-duplication)

```
SUM(value_count)  WHERE data_type='steps' AND civil_start_date = today
                  AND platform != 'HEALTH_CONNECT'
                  AND device_form_factor != 'PHONE'
```

The phone double-counts steps over windows that overlap the wearable; excluding Health Connect / phone sources keeps the wearable total (≈2083 instead of an inflated ≈3221).

#### Latest heart rate

Most recent `heart-rate` sample by `sample_time` (the "current" reading), with its UTC offset for rendering.

#### Nutrition totals (conditional aggregation, single query)

| Field | Source → column |
| --- | --- |
| Calories eaten | `SUM(value_sum) FILTER (data_type='nutrition-log')` |
| Calories burnt | `round(SUM(value_sum) FILTER (data_type='active-energy-burned'))` |
| Carbs / Fat (g) | promoted columns `nutrition_carbs_grams` / `nutrition_fat_grams` |
| Protein (g) | `SUM(grams)` from `nutrition_log_nutrients` where `nutrient='PROTEIN'` (child-table join) |
| Hydration (ml) | `SUM(value_sum) FILTER (data_type='hydration-log')` |
| Last updated | most recent `start_time|sample_time` across the three nutrition data types |

_The aggregate `GET /me/today` assembles activity, nutrition, timeline and last-night sleep concurrently into one response._

---

## Number & duration coercion

`internal/healthapi/types.go`

- `Number(v)` → float64 from float / int / numeric-string (the API returns some ints as strings, e.g. `"46"`).
- `DurationSeconds(v)` → seconds from a protobuf duration string like `"600s"` / `"19800s"` (strips the `s`, parses; 0 if unparseable). Used for UTC offsets, exercise split durations, time-in-zone, active minutes.

_Always use these rather than ad-hoc parsing._

---

## Scalar extraction & unit conversions

`internal/ingestion/mapper.go`

`MapDataPoint` classifies the type via `Category()`, stores the raw payload, extracts time coordinates + common scalars (`value_count/sum/avg/min/max`, `enum_value`) and a few promoted columns. Notable unit conversions:

| Data type | Field → column | Conversion |
| --- | --- | --- |
| distance / altitude / height / weight | meters or millimeters / grams or milligrams → `value_sum`/`value_avg` | `mm/1000`, `mg/1000` when the milli-field is used |
| heart-rate | `beatsPerMinute` → `value_avg` | direct (bpm); `motionContext` → `enum_value_secondary` |
| heart-rate-variability | `rootMeanSquareOfSuccessiveDifferencesMilliseconds` → `value_avg` | RMSSD (ms) |
| time-in-heart-rate-zone | `timeInZone` or `…Minutes` → `value_sum` | `DurationSeconds`, or `minutes·60` (seconds) |
| nutrition-log | `energy.kcal` → `value_sum`; `totalCarbohydrate.grams`/`totalFat.grams` → promoted; `mealType`, `foodDisplayName` → promoted | direct |
| hydration-log | `amountConsumed.milliliters` → `value_sum` | ml |
| daily-* vitals | bpm / ms / % / °C / ml·kg⁻¹·min⁻¹ → `value_avg` | direct |

_When adding a data type: add it to `Category()`, a case in `extractScalars` (and `extractChildren` if nested), and the relevant cron data-type list. `RemapPayload` recomputes columns from stored JSON without re-fetching._

---

## Child-row derivations

`internal/ingestion/children.go`

- **Sleep stages** → `sleep_stages` (start/end/offset/type) from `stages[]`; per-stage `sleep_summary_stages` (type/minutes/count) from `summary.stagesSummary[]`.
- **Nutrition nutrients** → grams from `quantity.grams` or `grams`, keyed by nutrient name (PROTEIN, …).
- **Exercise** → events (type/time/offset) + splits (type/start/end, `activeDuration` via `DurationSeconds`, metrics JSON).
- **Active minutes by level** → minutes from `minutes`, or `durationMillis/60000`, or `DurationSeconds(duration)/60`.
- **Health-record projection** → one normalized row per `(date, metric, source)` with a value picked `value_sum → value_avg → value_count`; reingestion overwrites rather than duplicates.

---

## Health API filtering, rate limit & retry

`internal/healthapi/client.go`

#### Per-category filter field paths

| Category | Filter member | Time format |
| --- | --- | --- |
| interval | `.interval.start_time` | RFC3339 |
| sample | `.sample_time.physical_time` | RFC3339 |
| daily | `.date` | `YYYY-MM-DD` |
| session | `.interval.civil_start_time` | civil datetime |
| sleep _(special)_ | `.interval.end_time` | RFC3339 |
| electrocardiogram _(special)_ | `.interval.start_time` (≥ only) | RFC3339 |

#### Degenerate-window bump

When start/end format to the same string (same civil date for daily types, or a zero-width webhook interval), the upper bound is bumped — `+1 day` for civil-date format, else `+1 second` — so the API doesn't reject it with `INVALID_TIME_RANGE`.

#### Rate limiting & retries

- Limiter: **250 req/min**, burst 5 (Google quota is 300/min per user — leaves a buffer; shared across goroutines).
- Retries 429 / 5xx up to 5 attempts: `Retry-After` header if present, else exponential `min(2^attempt s, 30 s)`. Other 4xx fail immediately.

---

## Cron sync windows

`internal/cron/`

| Syncer | Window |
| --- | --- |
| Catch-up | First run: last `DefaultBackfillDays`. After: fixed `CATCHUP_LOOKBACK_HOURS` (default 48h) back from now — **deliberately overlaps** the last window; dedup via the unique index recovers webhooks missed during downtime. |
| Reconcile | First run: backfill days. After: resumes from the exact `last_end` (no overlap) and uses the `:reconcile` endpoint to detect upstream changes/deletes. |
| Rollup (intraday) | `now − 2h` truncated to the hour → +1h (a settled hourly bucket). |
| Rollup (daily) | `now − 48h` truncated to the day → +1 day (a settled daily bucket). |

_Overlapping windows are safe because of the upsert/dedupe contract (`INSERT … ON CONFLICT DO UPDATE … RETURNING id` with a `NULLS NOT DISTINCT` unique index), which preserves row ids so child FKs stay valid._

---

## App formatters

`appV2/src/screens/sleep/data.ts`, `src/data/mock.ts`, `src/data/today.ts`

| Function | Does | Note |
| --- | --- | --- |
| `clk(c)` | minutes-since-midnight → "11:24 PM" | uppercase, zero-padded |
| `fmtH(min)` | minutes → "7h 12m" | zero-padded minutes |
| `fmtClock(min)` (mock.ts) | minutes → "11:10pm" / "8am" | **differs from `clk`**: lowercase, drops `:00` |
| `fmtMin(min)` (mock.ts) | minutes → "7h 12m" | same output as `fmtH` |
| `clockDeltaMinutes(a,t)` | signed clock difference wrapped to `[−720,+720]` | shortest direction on a 24h circle |
| `delta(a,t)` | "+1h 54m" / "−25m" / "on time" | — |
| `fmtStampClock(s)` (today.ts) | RFC3339 instant + `offsetSeconds` → local 12h clock | renders in the reading's own zone |

> **Known duplication.** The two clock formatters produce _different_ text by design (Today screen uses lowercase "11:10pm"; Sleep uses "11:24 PM"). They are intentionally not unified — changing either changes rendered copy.

#### Buckets & hues

- `ratingFor(eff)`: ≥92 Great · ≥87 Good · else Fair (efficiency→rating; distinct from the sleep _score_).
- `scoreBandHue(label)`: Excellent→green, Good→accent, Fair→amber, Poor→red.

---

## Sleep-quality gauges & verdicts

`appV2/src/screens/sleep/SleepQualityCard.tsx`

- **Rows shown:** Time to sound sleep, Restorative (Deep+REM), Interruptions, and the disruptions timeline. (Efficiency was dropped — see the Efficiency note above.)
- **Three-state verdict.** Lower-is-better metrics: `in` if ≤ greenMax, `amber` if ≤ amberMax, else `out`. Higher-is-better (restorative): green floor. Interruptions takes `worst(wasoVerdict, awakeVerdict)` (out > amber > in).
- **Track scaling.** Lower-is-better fills against `amberMax · 1.4` (40% headroom); the dashed band runs `[0, greenMax/(amberMax·1.4)]`. Restorative scales against `asleep · 0.6` and converts the fraction band to minutes (`fraction · asleep`).
- **Disruptions timeline.** Night span `((wake − onset + 1440) mod 1440) || 1440` (handles past-midnight); each tick at `((at − onset + 1440) mod 1440) / span`.

#### Vitals grid deltas

`VitalsGrid.tsx`

Window = trailing 7 nights from the selected index. Delta = `current − mean(prior)`, shown only if `|diff| ≥ (digits ? 0.05 : 0.5)` (noise floor). When the selected night's vital is null, falls back to the window average (labelled "avg"). Color: good if `(diff > 0) === higherIsBetter`.

---

## Chart geometry

`appV2/src/components/data/`

| Component | Key math |
| --- | --- |
| ProgressRing | `r = cx − stroke/2 − i·(stroke+gap)`; `circ = 2πr`; `strokeDashoffset = circ·(1 − value)`. |
| GaugeArc (270°) | `SWEEP=270`, `START=−135`; point `(cx + r·sin θ, cx − r·cos θ)`; `arcLen = 2πr·SWEEP/360`; offset `arcLen·(1 − value)`. |
| Sparkline | scale to `[pad, h−pad]` by `(v − min)/(max − min || 1)`; smooth via Catmull-Rom → cubic Bézier (control points at ±⅙ of the neighbor delta). |
| BarChart | `max = max(data, goal) || 1`; bar `pct = max(0.02, d/max)`; tooltip centered at `((selected+0.5)/n)·100%` with `translateX(−50%)`. |
| Hypnogram | 4 lanes (Awake/REM/Light/Deep), `laneH = plotH/4`; `x = plotL + (offset/total)·plotW`; hour ticks every 2h that sit ≥8 min from the edges. |
| CalorieBudget | `remaining = goal − food + exercise`; bar `eatenPct = food/(goal+exercise)·100`. |
| useAnimatedFraction | shared value eases 0→target over `durSlow` (380ms, easeOut); jumps when reduced-motion. |

---

## Caveats & limits (read before trusting a number)

- **Sleep score** is calibrated to one user; its affine constants will drift for other users/ages. It's FitVibe's own score on Google-standard bands, not a reproduction of Google's number.
- **Restorative (Deep+REM)** is a proxy, not Google's sound sleep — diverges ±30–48 min, both directions. Never relabel it "sound sleep".
- **Restlessness minutes** are not computable from the v4 API (no movement signal). Only the stage-based disruptions timeline is honest.
- **Time to sound sleep** runs ~2–3 min later than Google (no steady-light-with-calm-HR onset detection).
- **In-range bands** are population age norms, not Google's exact (undisclosed) tables, and not personalized by gender.
- **Recent-nights** shows one session per civil date (longest); naps on a main-sleep day don't appear separately.
- **Readiness** (Today hero) is not yet computed — the page currently shows a fixed placeholder. See the readiness research note.
- **Sleep efficiency** is computed but **not displayed** — it's ≈98–99% every night (no real time-in-bed from the device), so it carries no signal.
- **Steps** exclude phone/Health-Connect sources to avoid double-counting against the wearable.

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-19 | Added the **Readiness score (0–100)** section. Reverse-engineered + fitted to 4 real Google readiness scores (Jun 15–18): same-day alignment confirmed by correlation (deepRMSSD +0.95, RHR −0.74, deep+rem +0.80; D−1 alignment is noise), z-score-vs-trailing-baseline + logistic squash, weights HRV 0.8 / RHR 0.2 / Sleep 0.0, RMSE 3.78 (all within ±6). Key fix vs the earlier failed attempt (RMSE ~55): use `deepSleepRMSSD` not average HRV. Honest-labelled CALIBRATED (4 points, one user; structure validated, exact weights soft). |
| 2026-06-18 | Dropped the Sleep-efficiency row from the quality card (≈98–99% every night, no signal — device gives no real time-in-bed). Reworded the per-night insight to lead with duration + stage composition instead of efficiency. Reduced the quality-card value font size. |
| 2026-06-18 | Initial document. Covers sleep score (calibrated, ±3 vs 9 real nights), sleep-quality metrics (interruptions exact, time-to-sound-sleep ±2–3min, restorative proxy, disruptions timeline, restlessness not-possible), typical-for-age bands, stage totals/efficiency/typical mix, recent-nights query, Today aggregations, ingestion coercion/extraction/children, Health API filtering/rate-limit/retry, cron windows, and the full app-side formatter/gauge/geometry inventory. |

_**How to update:** when you add or change a calculation, edit the relevant section (quote the new constants/curve and cite `file`), refresh the validation table if you have ground truth, and add a changelog row. Keep the honest-labelling discipline: state exact / approx / proxy / not-possible._
