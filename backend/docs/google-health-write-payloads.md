# Google Health API v4 — Write Payloads (for the Vaidya MCP write tools)

This is the ground-truth reference for the **write** path: the MCP server (per the
`vaidya-mcp-plan.md`) logs user-supplied data by POSTing to the Google Health API, which then
syncs back into Postgres via the Go ingestion path and surfaces in the app. **Nothing writes to
`data_points` directly except Go.**

All payload shapes below are taken from **real records in this user's account** (read back from
`payload_json` in the DB), so a write body is the same structure the API round-trips. The
`healthapi.Client` is read-only today — these writes are net-new.

## Endpoint & auth

- **Create:** `POST https://health.googleapis.com/v4/users/{user}/dataTypes/{dataType}/dataPoints`
  - `{user}` = the Google Health user id (`users.health_user_id` — the same id seen in the `name`
    field of stored payloads, e.g. `users/5007594416538393512/...`).
  - `{dataType}` = the kebab→path data type: `nutrition-log`, `hydration-log`, `weight`, etc.
  - Body = a single **DataPoint** (the JSON shapes below). Returns an `Operation`.
- **Update:** `PATCH …/dataPoints/{id}`. **Delete (batch):** `POST …/dataPoints:batchDelete`.
- **Auth:** `Authorization: Bearer <access_token>` where the token comes from the **Go internal
  token provider over the Unix socket** (Go is the sole token authority — never refresh in the MCP
  server). Scopes already granted at OAuth (`internal/oauth/google.go`):
  - nutrition + hydration → `…/auth/googlehealth.nutrition.writeonly`
  - weight / body metrics → `…/auth/googlehealth.health_metrics_and_measurements.writeonly`
  - activity → `…/auth/googlehealth.activity_and_fitness.writeonly`
  - sleep → `…/auth/googlehealth.sleep.writeonly`

## Common envelope (every DataPoint)

```jsonc
{
  // "name" is OMITTED on create (server assigns the id). Present only on read/patch.
  "dataSource": {
    "platform": "FITBIT",          // FitVibe-originated writes: confirm the right platform value;
    "recordingMethod": "MANUAL"    // MANUAL = user-entered (what Vaidya logs are)
  },
  "<unionKey>": { /* one of nutritionLog | hydrationLog | weight | … */ }
}
```

**Time members inside the union.** Session types (`nutrition-log`, `hydration-log`) carry an
`interval`; sample types (`weight`) carry a `sampleTime`. We supply UTC `startTime`/`endTime`
(RFC3339) and the matching `startUtcOffset`/`endUtcOffset` as `"<seconds>s"` (e.g. `"19800s"` for
IST). The API also echoes `civilStartTime`/`civilEndTime` (structured date+time); on **write** the
RFC3339 instants + offset are the authoritative inputs — let the API derive civil times, or send
them too if required. For a point-in-time log, use a short interval (the API rejects a zero-width
window; a 30–60s span is what the device emits — see the hydration example: 09:02:00→09:02:30Z).

---

## nutrition-log  (tool: `log_nutrition`)

Real record (DINNER, "Phulka", 280 kcal):

```jsonc
POST /v4/users/{user}/dataTypes/nutrition-log/dataPoints
{
  "dataSource": { "platform": "FITBIT", "recordingMethod": "MANUAL" },
  "nutritionLog": {
    "energy": { "kcal": 280, "userProvidedUnit": "KILOCALORIE" },
    "serving": { "amount": 4, "foodMeasurementUnitDisplayName": "pieces" },  // optional
    "interval": {
      "startTime": "2026-06-16T14:30:00Z",
      "endTime":   "2026-06-16T14:45:00Z",
      "startUtcOffset": "19800s",
      "endUtcOffset":   "19800s"
    },
    "mealType": "DINNER",                       // BREAKFAST | LUNCH | DINNER | SNACK | (UNSPECIFIED)
    "foodDisplayName": "Phulka",
    "totalCarbohydrate": { "grams": 60 },
    "totalFat":          { "grams": 2 },
    "nutrients": [                              // optional detailed macros/micros
      { "nutrient": "PROTEIN",       "quantity": { "grams": 12 } },
      { "nutrient": "DIETARY_FIBER", "quantity": { "grams": 4 } }
    ]
  }
}
```

Field notes:
- `energy.kcal` → the app's calories (read path: `value_sum`). `userProvidedUnit:"KILOCALORIE"`.
- `mealType` → promoted to `meal_type`/`enum_value_secondary`.
- `totalCarbohydrate.grams`/`totalFat.grams` → promoted columns `nutrition_carbs_grams`/`nutrition_fat_grams`.
- `nutrients[]` (`{nutrient, quantity:{grams}}`) → child rows `nutrition_log_nutrients(nutrient, grams)`.
  `PROTEIN` is read by the Today nutrition query; other nutrient enums (`DIETARY_FIBER`, `SODIUM`, …)
  are stored as-is.
- `foodDisplayName` → promoted `food_display_name`.

MCP tool inputs → payload: `calories`→`energy.kcal`; `carbs_g`/`fat_g`/`protein_g`→`totalCarbohydrate`/
`totalFat`/`nutrients[PROTEIN]`; `meal_type`; `food_name`→`foodDisplayName`; `when`→`interval`.

---

## hydration-log  (tool: `log_hydration`)

Real record (700 ml):

```jsonc
POST /v4/users/{user}/dataTypes/hydration-log/dataPoints
{
  "dataSource": { "platform": "FITBIT", "recordingMethod": "MANUAL" },
  "hydrationLog": {
    "interval": {
      "startTime": "2026-06-11T09:02:00Z",
      "endTime":   "2026-06-11T09:02:30Z",
      "startUtcOffset": "19800s",
      "endUtcOffset":   "19800s"
    },
    "amountConsumed": { "milliliters": 700, "userProvidedUnit": "MILLILITER" }
  }
}
```

Field notes:
- `amountConsumed.milliliters` is the volume (read path coerces `amountConsumed.milliliters`, with
  fallbacks `volume.*` / `volumeMilliliters` — `mapper.go:177`). `userProvidedUnit` ∈ `MILLILITER`,
  `LITER`, `FLUID_OUNCE`, etc. (echo what the user said; send `milliliters` as the canonical amount).

---

## weight  (tool: `log_weight`)

Sample type — uses `sampleTime`, not `interval`. The value is **grams** (`weightGrams`, an int):

```jsonc
POST /v4/users/{user}/dataTypes/weight/dataPoints
{
  "dataSource": { "platform": "FITBIT", "recordingMethod": "MANUAL" },
  "weight": {
    "sampleTime": { "physicalTime": "2026-06-19T07:00:00Z", "utcOffset": "19800s" },
    "weightGrams": 70000
  }
}
```

Field notes:
- `weightGrams` confirmed from a read fixture (`types_test.go:89` — `"weightGrams": 70000` = 70 kg).
- Sample time: send `sampleTime.physicalTime` (the true UTC instant) + `sampleTime.utcOffset`
  (CLAUDE.md convention — read `physicalTime`, not `civilTime`). MCP input `weight_kg` → `weightGrams =
  round(weight_kg*1000)`.

---

## Verified against a live write (2026-06-19/20)

A live `log_hydration` (250 ml, then 200 ml via the MCP tool) returned **HTTP 200 / `"done": true`**
and created real data points. Confirmed:
1. **`dataSource: {platform:"FITBIT", recordingMethod:"MANUAL"}` is accepted.** Google rewrites
   `platform` to `GOOGLE_WEB_API` on its side (it doesn't have to match a registered source) — send
   the envelope as-is.
2. **Civil times are derived by the API** from `startTime`/`endTime` (RFC3339) + the `*UtcOffset`.
   Do **not** send `civilStartTime`/`civilEndTime` on write — the API computes them.
3. **Token path:** the stored access token expires; refresh via the stored refresh token works
   non-interactively (no consent screen) and the granted scopes include `nutrition.writeonly`. In
   production the MCP server gets a fresh token from the Go internal token provider (Go refreshes +
   persists), so it never touches the refresh token itself.
4. A point-in-time log uses a short interval (we send a 30s span); a zero-width interval is rejected.

Still to watch (non-blocking): exact `mealType` / `userProvidedUnit` / `nutrient` / `exerciseType`
enum vocabularies beyond the ones seen in real data (`DINNER`, `KILOCALORIE`, `MILLILITER`,
`PROTEIN`, `DIETARY_FIBER`), and the sync-back latency (webhook vs. catch-up cron) before a write
shows on `/me/today`.

## Verification

Smoke test (MCP Part 5): one live `log_hydration` (smallest, lowest-risk) → 200/Operation from
Google → after a webhook or `cmd/fetchbackfill -user 1 -today`, the row appears in `data_points`
(`data_type='hydration-log'`, `recording_method='MANUAL'`) and on `/me/today`. Then `log_nutrition`,
then `log_weight`.
