# Fitvibe Backend — Implementation Plan

## 1. Goal

Build a Go backend that runs on a Raspberry Pi and persists Google Health API data into a local Turso (libSQL) SQLite database. Data ingestion happens via:

1. **Webhooks** for Google Health data types that support real-time notifications.
2. **Cron jobs** for data types/sources that do not support webhooks, plus aggregation/rollup data.

An Expo mobile app will later initiate a Google OAuth flow and hand the offline authorization code to the backend, which exchanges it for access/refresh tokens and stores them. The backend will expose REST APIs that the app uses to fetch stored health data. The backend is also responsible for ingestion, persistence, and later AI-agent writes via an MCP server.

## 2. High-level architecture

```
┌──────────────┐      OAuth code      ┌──────────────────────┐
│  Expo app    │ ───────────────────► │  fitvibe backend     │
└──────────────┘                      │  (Raspberry Pi / Go) │
                                      │                      │
                                      │  ┌──────────────┐    │
                                      │  │ OAuth/token  │    │
                                      │  │ service      │    │
                                      │  └──────────────┘    │
                                      │  ┌──────────────┐    │
┌──────────────────┐  HTTPS POST     │  │ Webhook      │    │
│ Google Health    │ ───────────────►│  │ receiver     │    │
│ Webhooks         │                 │  └──────────────┘    │
└──────────────────┘                 │  ┌──────────────┐    │
                                      │  │ Cron/sync    │    │
                                      │  │ service      │    │
                                      │  └──────────────┘    │
                                      │  ┌──────────────┐    │
                                      │  │ Local Turso  │    │
                                      │  │ store        │    │
                                      │  └──────────────┘    │
                                      └──────────────────────┘
```

## 3. Research summary

### 3.1 Google Health API basics

- Base URL: `https://health.googleapis.com/v4`
- Auth: Google OAuth 2.0 (authorization code flow → access + refresh tokens).
- Rate limits (defaults):
  - 86.4M requests/day per project (~1,000 QPS sustained).
  - 120,000 requests/minute per project (~2,000 QPS burst).
  - 300 requests/minute per user (5 QPS per user).
- All Health API scopes are **Restricted scopes** and require app verification for >100 users.

### 3.2 Scopes

All scopes are prefixed with `https://www.googleapis.com/auth/googlehealth`.

| Scope suffix | Covers |
|--------------|--------|
| `.activity_and_fitness.readonly` | Activity/fitness read |
| `.activity_and_fitness.writeonly` | Activity/fitness write |
| `.health_metrics_and_measurements.readonly` | Health metrics read |
| `.health_metrics_and_measurements.writeonly` | Health metrics write |
| `.nutrition.readonly` | Nutrition read |
| `.nutrition.writeonly` | Nutrition write |
| `.sleep.readonly` | Sleep read |
| `.sleep.writeonly` | Sleep write |
| `.ecg.readonly` | ECG read |
| `.irn.readonly` | Irregular Rhythm Notifications read |
| `.location.readonly` | GPS location during exercise read |
| `.profile.readonly` | Profile read |
| `.profile.writeonly` | Profile write |
| `.settings.readonly` | Settings read |
| `.settings.writeonly` | Settings write |

**Chosen scope strategy**: Request read+write for all health and profile scopes. The mobile app will read directly from Google Health, but write scopes are required now so a future AI agent (via MCP) can write data back to Google Health without forcing users through a new consent flow.

### 3.3 Data types and webhook support

The table below maps every data type to its record type, available operations, scope, and whether it is supported by webhooks.

| Data type (endpoint kebab) | Record type | Operations | Scope | Webhook supported? |
|----------------------------|-------------|------------|-------|--------------------|
| `active-energy-burned` | Interval | list, reconcile, rollup, dailyRollup | activity_and_fitness | **No** |
| `active-minutes` | Interval | list, reconcile, rollup, dailyRollup | activity_and_fitness | **No** |
| `active-zone-minutes` | Interval | list, reconcile, rollup, dailyRollup | activity_and_fitness | **Yes** |
| `activity-level` | Daily | list, reconcile | activity_and_fitness | **Yes** |
| `altitude` | Interval | list, reconcile, rollup, dailyRollup | activity_and_fitness | **Yes** |
| `blood-glucose` | Sample | list, get, reconcile, rollup, dailyRollup | health_metrics | **Yes** |
| `body-fat` | Sample | list, get, reconcile, rollup, dailyRollup, create, update, batchDelete | health_metrics | **Yes** |
| `calories-in-heart-rate-zone` | Interval | rollup, dailyRollup | activity_and_fitness | **Yes** |
| `core-body-temperature` | Sample | list, get, reconcile, rollup, dailyRollup | health_metrics | **No** |
| `daily-heart-rate-variability` | Daily | list, reconcile | health_metrics | **Yes** |
| `daily-heart-rate-zones` | Daily | list, reconcile | health_metrics | **Yes** |
| `daily-oxygen-saturation` | Daily | list, reconcile | health_metrics | **Yes** |
| `daily-respiratory-rate` | Daily | list, reconcile | health_metrics | **Yes** |
| `daily-resting-heart-rate` | Daily | list, reconcile | health_metrics | **Yes** |
| `daily-sleep-temperature-derivations` | Daily | list, reconcile | health_metrics | **Yes** |
| `daily-vo2-max` | Daily | list, reconcile | activity_and_fitness | **No** |
| `distance` | Interval | list, reconcile, rollup, dailyRollup | activity_and_fitness | **Yes** |
| `electrocardiogram` | Session | list | ecg | **No** |
| `exercise` | Session | list, get, reconcile, create, update, batchDelete | activity_and_fitness | **Yes** |
| `floors` | Interval | reconcile, rollup, dailyRollup | activity_and_fitness | **Yes** |
| `food` | Food | list, get | nutrition | **No** |
| `food-measurement-unit` | Food | list, get | nutrition | **No** |
| `heart-rate` | Sample | list, reconcile, rollup, dailyRollup | health_metrics | **Yes** |
| `heart-rate-variability` | Sample | list, reconcile | health_metrics | **Yes** |
| `height` | Sample | list, get, reconcile, create, update, batchDelete | health_metrics | **Yes** |
| `hydration-log` | Session | list, get, reconcile, rollup, dailyRollup, create, update, batchDelete | nutrition | **Yes** |
| `irregular-rhythm-notification` | Session | list | irn | **No** |
| `nutrition-log` | Session | list, get, reconcile, rollup, dailyRollup, create, update, batchDelete | nutrition | **Yes** |
| `oxygen-saturation` | Sample | list, reconcile | health_metrics | **No** |
| `respiratory-rate-sleep-summary` | Sample | list, reconcile | health_metrics | **Yes** |
| `run-vo2-max` | Sample | list, reconcile, rollup, dailyRollup | activity_and_fitness | **Yes** |
| `sedentary-period` | Interval | list, reconcile, rollup, dailyRollup | activity_and_fitness | **Yes** |
| `sleep` | Session | list, get, reconcile, create, update, batchDelete | sleep | **Yes** |
| `steps` | Interval | list, reconcile, rollup, dailyRollup | activity_and_fitness | **Yes** |
| `swim-lengths-data` | Interval | list, reconcile, rollup, dailyRollup | activity_and_fitness | **No** |
| `time-in-heart-rate-zone` | Interval | list, reconcile, rollup, dailyRollup | activity_and_fitness | **Yes** |
| `total-calories` | Interval | rollup, dailyRollup | activity_and_fitness | **Yes** |
| `vo2-max` | Sample | list, reconcile | activity_and_fitness | **No** |
| `weight` | Sample | list, get, reconcile, rollup, dailyRollup, create, update, batchDelete | health_metrics | **Yes** |

**Webhook-supported data types (from docs):**

Active Zone Minutes, Activity Level, Altitude, Blood Glucose, Body Fat, Calories In Heart Rate Zone, Daily Heart Rate Variability, Daily Heart Rate Zones, Daily Oxygen Saturation, Daily Respiratory Rate, Daily Resting Heart Rate, Daily Sleep Temperature Derivations, Distance, Exercise, Floors, Heart Rate, Heart Rate Variability, Height, Hydration Log, Nutrition Log, Respiratory Rate Sleep Summary, Run Vo2 Max, Sedentary Period, Sleep, Steps, Time In Heart Rate Zone, Total Calories, Weight.

**Data types NOT supported by webhooks (cron-only):**

- `active-energy-burned`
- `active-minutes`
- `core-body-temperature`
- `daily-vo2-max`
- `electrocardiogram`
- `food`
- `food-measurement-unit`
- `irregular-rhythm-notification`
- `oxygen-saturation`
- `swim-lengths-data`
- `vo2-max`

### 3.4 Aggregation endpoints

Two rollup endpoints exist for supported data types:

- **`:rollUp`** — physical-time aggregation over a window size in seconds.
- **`:dailyRollUp`** — civil-time aggregation over `windowSizeDays` (default 1).

Both are POST requests. Range limits:
- `calories-in-heart-rate-zone`, `heart-rate`, `active-minutes`, `total-calories`: max 14 days.
- All other rollup types: max 90 days.

### 3.5 Webhook mechanics

- Subscriber resource: `projects/{project-number}/subscribers/{subscriber-id}`.
- Endpoint must be HTTPS TLS 1.2+, publicly reachable.
- Verification handshake on create/update:
  1. `POST` with `Authorization` header → respond `200/201`.
  2. `POST` without `Authorization` → respond `401/403`.
  3. Both request bodies are `{"type": "verification"}`.
- Notification payload:
  ```json
  {
    "data": {
      "version": "1",
      "clientProvidedSubscriptionName": "...",
      "healthUserId": "...",
      "operation": "UPSERT" | "DELETE",
      "dataType": "steps",
      "intervals": [
        {
          "physicalTimeInterval": { "startTime": "...", "endTime": "..." },
          "civilDateTimeInterval": { "startDateTime": {...}, "endDateTime": {...} },
          "civilIso8601TimeInterval": { "startTime": "...", "endTime": "..." }
        }
      ]
    }
  }
  ```
- Endpoint must respond `204 No Content` immediately; process async.
- Retries for non-204 up to 7 days with exponential backoff.
- Signature verification: `GOOGLE-HEALTH-API-SIGNATURE` header with Tink ECDSA P-256.

> **Important**: The webhook payload contains only metadata — `healthUserId`, `dataType`, `operation`, and time `intervals`. It does **not** contain the actual data values (steps, heart rate, etc.). The backend must call `GET /v4/users/me/dataTypes/{dataType}/dataPoints:list` for the notified interval to fetch the real data points.
>
> **Special case**: Historical `electrocardiogram` data may not include timezone offsets. Ingestion code must tolerate `NULL` `start_utc_offset_seconds` / `end_utc_offset_seconds` for ECG records.

### 3.6 Other useful endpoints

- `GET /v4/users/me/identity` → `{ legacyUserId, healthUserId }`. Store during onboarding.
- `GET /v4/users/me/profile` → profile data (requires `profile.readonly`).
- `GET /v4/users/me/settings` → user settings (requires `settings.readonly`).
- `GET /v4/users/me/dataTypes/{dt}/dataPoints:list` → raw data points.
- `GET /v4/users/me/dataTypes/{dt}/dataPoints:reconcile` → reconciled stream by source family.
- `GET /v4/users/me/pairedDevices:list` → paired Fitbit/Pixel devices.

## 4. Database schema design (Turso / SQLite)

Design principles:

- The database is a single local Turso (libSQL) SQLite file on the Raspberry Pi. No cloud sync.
- One `users` table for OAuth tokens and identity mapping.
- One `webhook_notifications` table for audit/retry/dedup of every incoming webhook.
- One `sync_state` table to track last successful fetch time per user per data type per source.
- One `data_points` table storing raw data points from `list`/`reconcile` as JSON blobs, with common indexed fields extracted for querying.
- Child tables for complex/array data (sleep stages, exercise splits/events, nutrition nutrients, heart rate zones, etc.).
- Separate lookup tables for time-less resources (`food`, `foodMeasurementUnit`).
- One `rollup_data_points` table storing rollups/daily rollups as JSON blobs, with indexed dimensions.
- One `health_data_records` table as a normalized query view for common daily metrics.

### 4.1 `users`

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Google identifiers
    google_user_id TEXT UNIQUE,            -- Google account sub (from ID token if available)
    health_user_id TEXT UNIQUE,            -- from /users/me/identity
    legacy_user_id TEXT,                   -- from /users/me/identity
    email TEXT,

    -- OAuth tokens (encrypt at application level before storing)
    access_token BLOB NOT NULL,
    refresh_token BLOB NOT NULL,
    token_expiry TIMESTAMP NOT NULL,
    scopes TEXT NOT NULL,                  -- space-separated granted scopes

    -- Profile cache
    display_name TEXT,
    date_of_birth DATE,
    gender TEXT,
    height_meters REAL,
    weight_kg REAL,
    profile_json TEXT,
    profile_updated_at TIMESTAMP,

    -- Settings
    settings_json TEXT,
    settings_updated_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_health_user_id ON users(health_user_id);
CREATE INDEX idx_users_google_user_id ON users(google_user_id);
```

### 4.2 `webhook_notifications`

This table also acts as the durable job queue. Workers poll `processing_status = 'pending'` and process notifications asynchronously.

```sql
CREATE TABLE webhook_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    health_user_id TEXT NOT NULL,
    data_type TEXT NOT NULL,
    operation TEXT NOT NULL,               -- UPSERT | DELETE
    client_provided_subscription_name TEXT,
    notification_json TEXT NOT NULL,
    signature_header TEXT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processing_status TEXT DEFAULT 'pending', -- pending | processing | processed | failed | ignored
    processing_error TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP,
    UNIQUE(health_user_id, data_type, operation, received_at, client_provided_subscription_name)
);
CREATE INDEX idx_webhook_notifications_user_type_status ON webhook_notifications(health_user_id, data_type, processing_status);
CREATE INDEX idx_webhook_notifications_pending_retry ON webhook_notifications(processing_status, next_retry_at);
CREATE INDEX idx_webhook_notifications_received_at ON webhook_notifications(received_at);
```

### 4.3 `sync_state`

```sql
CREATE TABLE sync_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL,               -- kebab-case data type
    source TEXT NOT NULL DEFAULT 'list',   -- list | reconcile | rollup | dailyRollup | profile | settings | devices
    last_start_time TIMESTAMP,             -- last interval/sample physical start fetched
    last_end_time TIMESTAMP,
    last_civil_date DATE,                  -- for daily summaries / dailyRollup
    cursor TEXT,                           -- nextPageToken if pagination is mid-flight
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, data_type, source)
);
CREATE INDEX idx_sync_state_user ON sync_state(user_id);
```

### 4.4 `data_points`

Stores raw points from `list`, `reconcile`, `get`, plus cron-fetched data. The full payload is kept as JSON; common fields are extracted for filtering and child tables handle arrays/complex sessions.

```sql
CREATE TABLE data_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL,
    data_point_category TEXT NOT NULL,     -- interval | sample | session | daily | food

    -- Data source
    data_source_family TEXT,               -- google-wearables | google-sources | all-sources | unknown
    recording_method TEXT,                 -- PASSIVELY_MEASURED | ACTIVELY_MEASURED | DERIVED | UNKNOWN
    platform TEXT,                         -- FITBIT | GOOGLE_WEB_API | etc.
    device_name TEXT,
    device_form_factor TEXT,
    application_package_name TEXT,
    data_source_json TEXT,                 -- full DataSource object

    -- Resource identity
    google_data_point_name TEXT,           -- resource name from API, if present
    resource_id TEXT,                      -- for food / foodMeasurementUnit / identifiable points

    -- Time dimensions (populated according to category)
    sample_time TIMESTAMP,                 -- ObservationSampleTime physicalTime
    start_time TIMESTAMP,                  -- interval/session physical start
    end_time TIMESTAMP,                    -- interval/session physical end
    civil_start_time TEXT,                 -- full ISO-8601 civil datetime
    civil_end_time TEXT,                   -- full ISO-8601 civil datetime
    civil_start_date DATE,
    civil_end_date DATE,
    start_utc_offset_seconds INTEGER,      -- separate from end offset (DST)
    end_utc_offset_seconds INTEGER,

    -- Extracted scalar fields (nullable, populated when applicable)
    value_count INTEGER,                   -- steps count, floors count, etc.
    value_sum REAL,
    value_avg REAL,
    value_min REAL,
    value_max REAL,

    -- Contextual enums that appear across many types
    enum_value TEXT,                       -- heartRateZone, activityLevelType, exerciseType, sleepType, etc.
    enum_value_secondary TEXT,             -- measurementMethod, mealType, measurementTiming, specimen, etc.

    -- Full payload
    payload_json TEXT NOT NULL,

    -- Sync bookkeeping
    fetched_via TEXT NOT NULL,             -- webhook | cron_list | cron_reconcile | manual
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    webhook_notification_id INTEGER REFERENCES webhook_notifications(id)
);
CREATE INDEX idx_data_points_user_type_time ON data_points(user_id, data_type, start_time);
CREATE INDEX idx_data_points_user_type_sample ON data_points(user_id, data_type, sample_time);
CREATE INDEX idx_data_points_user_type_civil ON data_points(user_id, data_type, civil_start_date);
CREATE INDEX idx_data_points_google_name ON data_points(user_id, google_data_point_name);
CREATE INDEX idx_data_points_resource_id ON data_points(user_id, resource_id);
CREATE INDEX idx_data_points_enum ON data_points(user_id, data_type, enum_value);
CREATE INDEX idx_data_points_fetched_at ON data_points(fetched_at);
```

### 4.5 Child tables for complex / array data

Sleep stages, exercise events/splits, nutrition nutrients, and similar arrays are stored in dedicated child tables for queryability while the parent `payload_json` retains the full API response.

```sql
-- Sleep ------------------------------------------------------------------
CREATE TABLE sleep_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_point_id INTEGER NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    start_utc_offset_seconds INTEGER,
    end_utc_offset_seconds INTEGER,
    stage_type TEXT NOT NULL,              -- AWAKE | LIGHT | DEEP | REM | ASLEEP | RESTLESS
    create_time TIMESTAMP,
    update_time TIMESTAMP
);
CREATE INDEX idx_sleep_stages_dp ON sleep_stages(data_point_id);
CREATE INDEX idx_sleep_stages_time ON sleep_stages(start_time, end_time);

CREATE TABLE sleep_out_of_bed_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_point_id INTEGER NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    start_utc_offset_seconds INTEGER,
    end_utc_offset_seconds INTEGER
);
CREATE INDEX idx_sleep_oob_dp ON sleep_out_of_bed_segments(data_point_id);

CREATE TABLE sleep_summary_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_point_id INTEGER NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    stage_type TEXT NOT NULL,
    minutes INTEGER,
    count INTEGER
);
CREATE INDEX idx_sleep_summary_stages_dp ON sleep_summary_stages(data_point_id);

-- Exercise ---------------------------------------------------------------
CREATE TABLE exercise_splits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_point_id INTEGER NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    active_duration_seconds REAL,
    split_type TEXT,
    metrics_summary_json TEXT
);
CREATE INDEX idx_exercise_splits_dp ON exercise_splits(data_point_id);

CREATE TABLE exercise_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_point_id INTEGER NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    event_time TIMESTAMP,
    event_utc_offset_seconds INTEGER,
    event_type TEXT                          -- START | STOP | PAUSE | RESUME | AUTO_PAUSE | AUTO_RESUME
);
CREATE INDEX idx_exercise_events_dp ON exercise_events(data_point_id);

-- Nutrition / Hydration --------------------------------------------------
CREATE TABLE nutrition_log_nutrients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_point_id INTEGER NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    nutrient TEXT NOT NULL,
    grams REAL
);
CREATE INDEX idx_nutrients_dp ON nutrition_log_nutrients(data_point_id);
CREATE INDEX idx_nutrients_name ON nutrition_log_nutrients(data_point_id, nutrient);

-- Daily heart rate zones -------------------------------------------------
CREATE TABLE daily_heart_rate_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_point_id INTEGER NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    zone_type TEXT NOT NULL,
    min_bpm INTEGER,
    max_bpm INTEGER
);
CREATE INDEX idx_daily_hrz_dp ON daily_heart_rate_zones(data_point_id);

-- Active minutes by activity level ---------------------------------------
CREATE TABLE active_minutes_by_level (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_point_id INTEGER NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    activity_level TEXT NOT NULL,
    minutes INTEGER
);
CREATE INDEX idx_active_minutes_level_dp ON active_minutes_by_level(data_point_id);

-- Irregular rhythm notification alert windows ----------------------------
CREATE TABLE irregular_rhythm_alert_windows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_point_id INTEGER NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    positive BOOLEAN,
    heart_beats_json TEXT
);
CREATE INDEX idx_irn_windows_dp ON irregular_rhythm_alert_windows(data_point_id);

-- Electrocardiogram waveform metadata ------------------------------------
CREATE TABLE electrocardiogram_waveforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_point_id INTEGER NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    result_classification TEXT,
    beats_per_minute_avg INTEGER,
    sampling_frequency_hertz INTEGER,
    millivolts_scaling_factor INTEGER,
    lead_number INTEGER,
    waveform_samples_json TEXT              -- large; consider BLOB if needed
);
CREATE INDEX idx_ecg_waveforms_dp ON electrocardiogram_waveforms(data_point_id);

-- Food lookup tables (no time dimension) ---------------------------------
CREATE TABLE food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_id TEXT UNIQUE NOT NULL,
    display_name TEXT,
    brand TEXT,
    access_level TEXT,
    description TEXT,
    language_code TEXT,
    meal_type TEXT,
    nutrients_json TEXT,
    default_serving_json TEXT,
    servings_json TEXT,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_food_items_id ON food_items(food_id);

CREATE TABLE food_measurement_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id TEXT UNIQUE NOT NULL,
    display_name TEXT,
    plural_display_name TEXT,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_food_units_id ON food_measurement_units(unit_id);
```

### 4.6 `rollup_data_points`

```sql
CREATE TABLE rollup_data_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL,
    rollup_kind TEXT NOT NULL,             -- rollUp | dailyRollUp
    window_size TEXT,                      -- e.g. "3600s" or "1d"
    data_source_family TEXT,

    start_time TIMESTAMP,
    end_time TIMESTAMP,
    civil_start_date DATE,
    civil_end_date DATE,

    -- Extracted aggregates (nullable)
    count_sum INTEGER,
    count_avg REAL,
    count_min INTEGER,
    count_max INTEGER,
    distance_meters_sum REAL,
    energy_kcal_sum REAL,
    duration_seconds_sum INTEGER,

    -- Dimensions for queryable rollups
    heart_rate_zone_type TEXT,
    activity_level TEXT,
    exercise_type TEXT,
    swim_stroke_type TEXT,
    nutrient TEXT,

    payload_json TEXT NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, data_type, rollup_kind, window_size, data_source_family, start_time, end_time)
);
CREATE INDEX idx_rollup_user_type_kind_time ON rollup_data_points(user_id, data_type, rollup_kind, start_time);
CREATE INDEX idx_rollup_user_type_kind_civil ON rollup_data_points(user_id, data_type, rollup_kind, civil_start_date);
```

### 4.7 Data-type → schema mapping notes

| Data type | Category | Time field used | Child table(s) | Key extracted fields |
|-----------|----------|-----------------|----------------|----------------------|
| `steps` | Interval | `start_time`/`end_time` | — | `value_count` |
| `distance` | Interval | `start_time`/`end_time` | — | `value_sum` (millimeters) |
| `altitude` | Interval | `start_time`/`end_time` | — | `value_sum` (gainMillimeters) |
| `floors` | Interval | `start_time`/`end_time` | — | `value_count` |
| `heart-rate` | Sample | `sample_time` | — | `value_avg` (beatsPerMinute), `enum_value_secondary` = motionContext/sensorLocation |
| `sleep` | Session | `start_time`/`end_time` | `sleep_stages`, `sleep_out_of_bed_segments`, `sleep_summary_stages` | `enum_value` = sleep type, summary minutes stored in `health_data_records` |
| `exercise` | Session | `start_time`/`end_time` | `exercise_splits`, `exercise_events` | `enum_value` = exerciseType, metricsSummary JSON in payload |
| `weight` | Sample | `sample_time` | — | `value_avg` (weightGrams) |
| `body-fat` | Sample | `sample_time` | — | `value_avg` (percentage) |
| `blood-glucose` | Sample | `sample_time` | — | `value_avg`, `enum_value_secondary` = mealType/measurementTiming/specimen |
| `active-zone-minutes` | Interval | `start_time`/`end_time` | — | `value_count`, `enum_value` = heartRateZone |
| `time-in-heart-rate-zone` | Interval | `start_time`/`end_time` | — | `enum_value` = heartRateZoneType |
| `activity-level` | Daily | `civil_start_date` | — | `enum_value` = activityLevelType |
| `daily-heart-rate-zones` | Daily | `civil_start_date` | `daily_heart_rate_zones` | zones array |
| `active-minutes` | Interval | `start_time`/`end_time` | `active_minutes_by_level` | per-level minutes |
| `nutrition-log` | Session | `start_time`/`end_time` | `nutrition_log_nutrients` | mealType, nutrients |
| `hydration-log` | Session | `start_time`/`end_time` | — | `value_sum` (milliliters) |
| `electrocardiogram` | Session | `start_time`/`end_time` | `electrocardiogram_waveforms` | resultClassification, beatsPerMinuteAvg |
| `irregular-rhythm-notification` | Session | `start_time`/`end_time` | `irregular_rhythm_alert_windows` | alertWindows |
| `food` | Food | — | `food_items` | no time; lookup resource |
| `food-measurement-unit` | Food | — | `food_measurement_units` | no time; lookup resource |

### 4.8 `health_data_records` (normalized query table)

```sql
CREATE TABLE health_data_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_point_id INTEGER REFERENCES data_points(id) ON DELETE SET NULL,
    record_date DATE NOT NULL,
    metric_name TEXT NOT NULL,             -- steps_count, distance_meters, deep_sleep_minutes, etc.
    metric_value REAL NOT NULL,
    metric_unit TEXT,                      -- count, meters, kcal, minutes, bpm, etc.
    metric_metadata_json TEXT,             -- zone type, activity level, etc.
    source TEXT NOT NULL,                  -- webhook | cron_list | dailyRollup | etc.
    data_type TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, record_date, metric_name, source)
);
CREATE INDEX idx_health_records_user_date ON health_data_records(user_id, record_date);
CREATE INDEX idx_health_records_metric ON health_data_records(user_id, metric_name);
CREATE INDEX idx_health_records_dp ON health_data_records(data_point_id);
```

## 5. Backend module structure (planned)

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # entry point
├── internal/
│   ├── config/
│   │   └── config.go            # env vars, flags
│   ├── db/
│   │   ├── db.go                # Turso/libSQL connection + migrations
│   │   ├── migrations/          # .sql migration files
│   │   ├── models.go            # Go structs for DB rows
│   │   └── repositories/        # per-entity query/write helpers
│   ├── oauth/
│   │   ├── google.go            # token exchange, refresh
│   │   └── middleware.go        # token injector for outbound calls
│   ├── healthapi/
│   │   ├── client.go            # HTTP client for health.googleapis.com
│   │   ├── types.go             # request/response structs
│   │   ├── datapoints.go        # list/reconcile/get/patch/batchDelete helpers
│   │   ├── rollup.go            # rollUp / dailyRollUp helpers
│   │   ├── profile.go           # identity/profile/settings helpers
│   │   └── devices.go           # paired devices helpers
│   ├── webhooks/
│   │   ├── handler.go           # HTTP handler + verification handshake
│   │   ├── verifier.go          # signature verification with Tink
│   │   ├── subscriber.go        # create/list/update/delete subscribers
│   │   └── processor.go         # async notification processor
│   ├── cron/
│   │   ├── scheduler.go         # cron registration
│   │   ├── syncer.go            # generic data sync orchestrator
│   │   └── rollup_syncer.go     # aggregation sync orchestrator
│   ├── api/
│   │   ├── server.go            # HTTP router setup
│   │   ├── auth.go              # OAuth endpoints used by Expo app
│   │   ├── data.go              # query endpoints for the Expo app
│   │   └── admin.go             # manual trigger / status endpoints
│   └── crypto/
│       └── token.go             # application-level AES encryption for tokens
├── PLAN.md
├── go.mod
└── go.sum
```

## 6. Webhook implementation plan

### 6.1 Endpoint

- `POST /webhooks/google-health`
- Configurable via `WEBHOOK_PATH` / `WEBHOOK_SECRET` env vars.

### 6.2 Verification handshake

When Google calls with `{"type": "verification"}`:
- If `Authorization` header matches configured secret → return `200 OK`.
- If missing/invalid → return `401 Unauthorized`.

### 6.3 Signature verification

- Fetch public keyset from `https://www.gstatic.com/googlehealthapi/webhooks/webhooks_public_keyset.json`.
- Use Tink `PublicKeyVerify` (Go Tink library) to validate `GOOGLE-HEALTH-API-SIGNATURE` against raw request body.
- Cache keyset; refresh if key ID not found.

### 6.4 Notification handling

1. Respond `204 No Content` immediately.
2. Persist the notification in `webhook_notifications` with `processing_status = 'pending'`.
3. Background workers poll the table and process notifications asynchronously. This survives backend restarts.
4. Processor:
   - Look up `users` by `healthUserId`.
   - For each interval in the notification, call `list` for that data type using the **exact notified physical time interval** and the user's access token (refreshing if needed).
   - Insert fetched data points into `data_points`.
   - Update `sync_state.last_end_time`.
   - Mark notification as `processed`, or `failed` with retry scheduling on error.

### 6.5 Deduplication and retries

- Use `health_user_id` + `data_type` + `operation` + `received_at` + `client_provided_subscription_name` as a soft unique constraint to avoid processing the exact same notification twice.
- Fetching by interval range naturally dedupes data points via `google_data_point_name` and/or time window overlaps.
- Failed notifications are retried with exponential backoff up to a max retry count, then moved to a dead-letter state (`failed`).

### 6.6 Subscriber management

Provide admin endpoints (or startup config) to create/update the Google Health subscriber:

- `POST /admin/subscribers` — create subscriber with AUTOMATIC policy for all webhook-supported types.
- `GET /admin/subscribers` — list.
- `PATCH /admin/subscribers/:id` — update endpoint URI or secret.
- `DELETE /admin/subscribers/:id` — delete.

Subscriber config (automatic policy recommended):

```json
{
  "endpointUri": "https://<your-pi>/webhooks/google-health",
  "subscriberConfigs": [
    {
      "dataTypes": ["steps", "distance", "altitude", "floors", ...],
      "subscriptionCreatePolicy": "AUTOMATIC"
    }
  ],
  "endpointAuthorization": {
    "secret": "Bearer <WEBHOOK_SECRET>"
  }
}
```

## 7. Cron implementation plan

### 7.1 Cron data sources

Data types without webhook support must be polled on a schedule:

| Data type | Frequency | Operation(s) |
|-----------|-----------|--------------|
| `active-energy-burned` | Hourly / daily | `list` + `dailyRollUp` |
| `active-minutes` | Hourly / daily | `list` + `dailyRollUp` |
| `core-body-temperature` | Hourly | `list` |
| `daily-vo2-max` | Daily | `list` |
| `electrocardiogram` | Daily | `list` |
| `food` | Daily | `list` |
| `food-measurement-unit` | Daily | `list` |
| `irregular-rhythm-notification` | Daily | `list` |
| `oxygen-saturation` | Hourly | `list` |
| `swim-lengths-data` | Hourly | `list` + `dailyRollUp` |
| `vo2-max` | Daily | `list` |

### 7.2 Aggregation cron

Even for webhook-supported data types, rollups are **not** delivered via webhook. Run aggregation jobs:

- `:rollUp` every hour/day for intraday aggregates.
- `:dailyRollUp` once per day for previous-day summaries.

All schedules are configurable via environment variables. Defaults:

| Job | Default cron | Env var | Description |
|-----|--------------|---------|-------------|
| `intraday-rollups` | `0 * * * *` | `CRON_INTRADAY_ROLLUP` | Hourly rollups for previous hour for all rollup-supported types. |
| `daily-rollups` | `10 0 * * *` | `CRON_DAILY_ROLLUP` | Daily rollups for yesterday for all dailyRollup-supported types. |
| `cron-list-sync` | `0 */6 * * *` | `CRON_LIST_SYNC` | Fetch cron-only data types for the last 6–24 hours. |
| `profile-settings-sync` | `0 2 * * *` | `CRON_PROFILE_SETTINGS_SYNC` | Refresh profile and settings. |

### 7.3 Sync window logic

For each `(user_id, data_type, source)`:

- Read `sync_state.last_start_time` / `last_end_time`.
- If empty (new user), fetch last `DEFAULT_BACKFILL_DAYS` days by default (default 30).
- Request data from `last_end_time` to now, respecting API max range (90 days / 14 days).
- Paginate through `nextPageToken`.
- Insert into `data_points` / `rollup_data_points`.
- Update `sync_state`.
- For rollups, use civil dates aligned to window boundaries.

On first OAuth exchange, a background backfill job is automatically queued for the new user.

### 7.4 Token refresh during cron

- Before every outbound API call, check token expiry.
- If expired, refresh via `https://oauth2.googleapis.com/token` and update DB.
- Encrypt tokens at rest.

## 8. OAuth/token flow plan

### 8.1 Expo app responsibilities

1. Initiate Google OAuth authorization request with all required Health scopes, using `access_type=offline` and `prompt=consent` so a refresh token is returned.
2. Redirect URI should be the Expo app scheme (e.g., `com.fitvibe.app:/oauth2callback`).
3. On success, send the authorization `code` to backend `POST /auth/exchange`.
4. The Expo app fetches health data through backend REST APIs (to be built later); it does not call Google Health directly.

### 8.2 Backend `/auth/exchange`

Request:

```json
{
  "code": "...",
  "redirect_uri": "com.fitvibe.app:/oauth2callback"
}
```

Backend actions:

1. Exchange code with Google OAuth token endpoint.
2. Validate ID token / obtain `google_user_id` if present.
3. Call `GET /v4/users/me/identity` with access token to get `healthUserId`.
4. Encrypt access + refresh tokens.
5. Insert/update `users` row.
6. Trigger an initial backfill job for the user.
7. Return `{ user_id, health_user_id, google_user_id }`.

### 8.3 Token refresh

- `internal/oauth/google.go` implements `RefreshAccessToken(ctx, user)`.
- Use for every outbound Health API call.
- Persist new access token and expiry.

### 8.4 Token encryption

- Use AES-256-GCM with a key from `TOKEN_ENCRYPTION_KEY` env var.
- Store ciphertext + nonce in DB.

## 9. Planned HTTP routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/healthz` | Health check |
| POST | `/webhooks/google-health` | Receive Google Health webhooks |
| POST | `/auth/exchange` | Exchange OAuth code for tokens |
| POST | `/auth/refresh` | Force refresh a user's token |
| GET | `/users/me` | Current user's cached profile |
| GET | `/v1/data/:dataType` | Query stored raw data points for the app |
| GET | `/v1/rollup/:dataType` | Query stored rollup data for the app |
| GET | `/v1/summary/:metric` | Query normalized daily summary for the app |
| POST | `/admin/subscribers` | Create webhook subscriber |
| GET | `/admin/subscribers` | List subscribers |
| PATCH | `/admin/subscribers/:id` | Update subscriber |
| DELETE | `/admin/subscribers/:id` | Delete subscriber |
| POST | `/admin/sync` | Trigger manual sync for a user |
| POST | `/admin/backfill` | Trigger historical backfill |
| GET | `/admin/sync-status` | View sync state |

## 10. Environment variables

```bash
# Server
PORT=8080
HOST=0.0.0.0
WEBHOOK_PATH=/webhooks/google-health
WEBHOOK_SECRET=Bearer super-secret

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=com.fitvibe.app:/oauth2callback

# Google Cloud project number (for subscriber APIs)
GOOGLE_PROJECT_NUMBER=...

# Turso / SQLite (local-only, no cloud sync)
TURSO_DATABASE_URL=file:/var/lib/fitvibe/fitvibe.db
# TURSO_SYNC_REMOTE_URL=...  # intentionally left empty; local-only
# TURSO_SYNC_AUTH_TOKEN=...    # intentionally left empty; local-only
SQLITE_BUSY_TIMEOUT_MS=5000

# Security
TOKEN_ENCRYPTION_KEY=32-byte-base64
WEBHOOK_SIGNATURE_CACHE_TTL=24h

# Sync
DEFAULT_BACKFILL_DAYS=30
CRON_INTRADAY_ROLLUP="0 * * * *"
CRON_DAILY_ROLLUP="10 0 * * *"
CRON_LIST_SYNC="0 */6 * * *"
CRON_PROFILE_SETTINGS_SYNC="0 2 * * *"

# Webhook exposure (dev)
# Use Cloudflare tunnel or ngrok to expose HTTPS URL to Google.
# Example: CLOUDFLARE_TUNNEL_URL=https://fitvibe.yourdomain.com
```

## 11. Implementation phases

### Phase 1 — Foundation

- [x] Set up Go module, structured packages, and configuration loader.
- [x] Add Turso/libSQL Go driver (`tursogo`) in local-only mode and migration runner.
- [x] Configure local Turso/libSQL database encryption at rest (tokens protected by DB encryption, no separate app-level encryption).
- [x] Implement Google OAuth code exchange and token refresh.

### Phase 2 — Database & models

- [x] Write migration files for all tables.
- [x] Rely on libSQL database encryption for the local Turso database file.
- [x] Enable libSQL/SQLite features: foreign keys, WAL journal mode. Use triggers and views where helpful.
- [x] Set `PRAGMA journal_mode = 'wal'` and `PRAGMA busy_timeout` for concurrent webhook + cron writes.
- [x] Implement DB models and CRUD helpers. Add `users`, `sync_state`, `webhook_notifications` repositories.
- [x] Add `users`, `sync_state`, `webhook_notifications` repositories.

### Phase 3 — Google Health API client

- [x] Build typed HTTP client for `health.googleapis.com/v4`.
- [x] Implement `list`, `reconcile`, `get`, `rollUp`, `dailyRollUp`.
- [x] Implement `getIdentity`, `getProfile`, `getSettings`.
- [x] Implement pagination and rate-limit backoff.

### Phase 4 — Webhooks

- [x] Implement verification handshake handler.
- [x] Implement signature verification with Tink.
- [x] Implement async notification processor.
- [x] Implement subscriber management admin endpoints.

### Phase 5 — Cron sync

- [x] Add cron scheduler.
- [x] Implement generic list-sync job for cron-only data types.
- [x] Implement rollup/daily-rollup sync jobs.
- [x] Implement profile/settings sync job.
- [x] Implement backfill job triggered on new user signup.
- [x] Configure incremental backfill and cron sync for local Turso.

### Phase 6 — API surface

- [ ] Wire HTTP router (stdlib `net/http` or `chi`).
- [ ] Add `/auth/exchange`, `/auth/refresh`, `/users/me`.
- [ ] Add query endpoints for the Expo app (`/v1/data/:dataType`, `/v1/rollup/:dataType`, `/v1/summary/:metric`).
- [ ] Add admin endpoints.
- [ ] Add `/healthz` and structured logging.

### Phase 7 — Hardening

- [ ] Add request logging, panic recovery, timeouts.
- [ ] Add idempotent webhook processing and dead-letter handling.
- [ ] Add metrics/health endpoints.
- [ ] Write tests for critical paths.

### Phase 8 — Raspberry Pi deployment

- [ ] Build Linux ARM64 binary.
- [ ] Add systemd service file.
- [ ] Expose webhook endpoint via Cloudflare tunnel or ngrok (recommended for home Pi).
- [ ] Document webhook tunneling setup.

## 12. Decisions made

| Question | Decision |
|----------|----------|
| Turso driver | `tursogo` or `libsql-go`, local libSQL file only. No cloud sync. |
| Mobile client | Expo app; backend will expose query APIs for the app to fetch stored data. |
| OAuth scopes | Read+write for all health and profile scopes, so a future AI agent (MCP) can write without re-consent. |
| OAuth flow | Expo app obtains offline authorization code and sends it to backend `/auth/exchange`. |
| Webhook queue | SQLite-backed durable job queue (`webhook_notifications` table). |
| Webhook fetch strategy | Fetch exact notified interval via `list`. |
| Rollups | Pre-computed and stored via cron. |
| Write operations | Deferred to a future AI agent via MCP. |
| Webhook exposure | Cloudflare tunnel / ngrok. |
| Cron schedule | Customizable via environment variables. |
| Backfill | Automatic on first OAuth exchange. |
| Token storage | Plaintext columns protected by libSQL database encryption at rest (`TURSO_ENCRYPTION_KEY`). |
| Encryption key management | Via `TURSO_ENCRYPTION_KEY` env var for libSQL DB encryption. |
| Normalization | Keep normalized `health_data_records` table. |
| DB encryption at rest | libSQL database encryption (`TURSO_ENCRYPTION_KEY`) for the local .db file. |
| Concurrent writes | WAL mode + busy timeout for webhook + cron goroutines. |
| Child table population | Triggers auto-populate child tables on `data_points` INSERT. |
| Rollup precomputation | Materialized views or explicit rollup tables maintained by cron jobs. |
| Text search | FTS5 (libSQL/SQLite built-in) for food/nutrition queries. |
| AI insights | Vector search deferred; consider `sqlite-vec` extension if needed later. |
| Sync optimization | Backfill on signup + incremental cron sync for local Turso. |

## 13. Remaining open questions

1. **App query API design**: Which query shapes does the Expo app need first? Date-range data points, daily summaries, or both?
2. **MCP server scope**: Which write operations should the future AI agent MCP server support first?

## 14. References

- Google Health API overview: https://developers.google.com/health/about
- Webhooks: https://developers.google.com/health/webhooks
- Data types: https://developers.google.com/health/data-types
- Endpoints guide: https://developers.google.com/health/endpoints
- Scopes: https://developers.google.com/health/scopes
- OAuth setup: https://developers.google.com/health/setup
- Rate limits: https://developers.google.com/health/rate-limits
- REST reference: https://developers.google.com/health/reference/rest

