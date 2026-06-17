-- Initial schema for PostgreSQL.
-- Identity PKs, TIMESTAMPTZ instants, JSONB payloads, BYTEA tokens.
-- Hot JSON fields are promoted to typed columns (populated at ingestion) so
-- queries are plain column reads, not json path extraction.

CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    google_user_id TEXT UNIQUE,
    health_user_id TEXT UNIQUE,
    legacy_user_id TEXT,
    email TEXT,
    google_display_name TEXT,
    google_picture TEXT,
    google_gender TEXT,
    height_meters DOUBLE PRECISION,
    weight_kg DOUBLE PRECISION,

    access_token BYTEA NOT NULL,
    refresh_token BYTEA NOT NULL,
    token_expiry TIMESTAMPTZ NOT NULL,
    scopes TEXT NOT NULL,

    age INTEGER,
    membership_start_date DATE,
    distance_unit TEXT,
    weight_unit TEXT,
    height_unit TEXT,
    temperature_unit TEXT,
    time_zone TEXT,
    language_locale TEXT,
    utc_offset TEXT,
    stride_length_walking_mm INTEGER,
    stride_length_running_mm INTEGER,
    profile_json TEXT,
    profile_updated_at TIMESTAMPTZ,

    settings_json TEXT,
    settings_updated_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_health_user_id ON users(health_user_id);
CREATE INDEX IF NOT EXISTS idx_users_google_user_id ON users(google_user_id);

CREATE TABLE IF NOT EXISTS webhook_notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    health_user_id TEXT NOT NULL,
    data_type TEXT NOT NULL,
    operation TEXT NOT NULL,
    client_provided_subscription_name TEXT,
    notification_json TEXT NOT NULL,
    signature_header TEXT,
    received_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    processing_status TEXT DEFAULT 'pending',
    processing_error TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    UNIQUE NULLS NOT DISTINCT (health_user_id, data_type, operation, received_at, client_provided_subscription_name)
);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_user_type_status ON webhook_notifications(health_user_id, data_type, processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_pending_retry ON webhook_notifications(processing_status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_received_at ON webhook_notifications(received_at);

CREATE TABLE IF NOT EXISTS sync_state (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'list',
    last_start_time TIMESTAMPTZ,
    last_end_time TIMESTAMPTZ,
    last_civil_date DATE,
    cursor TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, data_type, source)
);
CREATE INDEX IF NOT EXISTS idx_sync_state_user ON sync_state(user_id);

CREATE TABLE IF NOT EXISTS data_points (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL,
    data_point_category TEXT NOT NULL,

    data_source_family TEXT,
    recording_method TEXT,
    platform TEXT,
    device_name TEXT,
    device_form_factor TEXT,
    application_package_name TEXT,
    data_source_json TEXT,

    google_data_point_name TEXT,
    resource_id TEXT,

    sample_time TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    civil_start_time TEXT,
    civil_end_time TEXT,
    civil_start_date DATE,
    civil_end_date DATE,
    start_utc_offset_seconds INTEGER,
    end_utc_offset_seconds INTEGER,

    value_count INTEGER,
    value_sum DOUBLE PRECISION,
    value_avg DOUBLE PRECISION,
    value_min DOUBLE PRECISION,
    value_max DOUBLE PRECISION,

    enum_value TEXT,
    enum_value_secondary TEXT,

    -- Promoted from payload_json at ingestion (avoids query-time JSON extraction):
    nutrition_carbs_grams DOUBLE PRECISION, -- nutritionLog.totalCarbohydrate.grams
    nutrition_fat_grams DOUBLE PRECISION,    -- nutritionLog.totalFat.grams
    meal_type TEXT,                          -- nutritionLog.mealType
    food_display_name TEXT,                  -- nutritionLog.foodDisplayName

    payload_json JSONB NOT NULL,

    fetched_via TEXT NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT now(),
    webhook_notification_id BIGINT REFERENCES webhook_notifications(id)
);
CREATE INDEX IF NOT EXISTS idx_data_points_user_type_time ON data_points(user_id, data_type, start_time);
CREATE INDEX IF NOT EXISTS idx_data_points_user_type_sample ON data_points(user_id, data_type, sample_time);
CREATE INDEX IF NOT EXISTS idx_data_points_user_type_civil ON data_points(user_id, data_type, civil_start_date);
CREATE INDEX IF NOT EXISTS idx_data_points_google_name ON data_points(user_id, google_data_point_name);
CREATE INDEX IF NOT EXISTS idx_data_points_resource_id ON data_points(user_id, resource_id);
CREATE INDEX IF NOT EXISTS idx_data_points_enum ON data_points(user_id, data_type, enum_value);
CREATE INDEX IF NOT EXISTS idx_data_points_fetched_at ON data_points(fetched_at);

CREATE TABLE IF NOT EXISTS sleep_stages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_point_id BIGINT NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    start_utc_offset_seconds INTEGER,
    end_utc_offset_seconds INTEGER,
    stage_type TEXT NOT NULL,
    create_time TIMESTAMPTZ,
    update_time TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sleep_stages_dp ON sleep_stages(data_point_id);
CREATE INDEX IF NOT EXISTS idx_sleep_stages_time ON sleep_stages(start_time, end_time);

CREATE TABLE IF NOT EXISTS sleep_out_of_bed_segments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_point_id BIGINT NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    start_utc_offset_seconds INTEGER,
    end_utc_offset_seconds INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sleep_oob_dp ON sleep_out_of_bed_segments(data_point_id);

CREATE TABLE IF NOT EXISTS sleep_summary_stages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_point_id BIGINT NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    stage_type TEXT NOT NULL,
    minutes INTEGER,
    count INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sleep_summary_stages_dp ON sleep_summary_stages(data_point_id);

CREATE TABLE IF NOT EXISTS exercise_splits (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_point_id BIGINT NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    active_duration_seconds DOUBLE PRECISION,
    split_type TEXT,
    metrics_summary_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_exercise_splits_dp ON exercise_splits(data_point_id);

CREATE TABLE IF NOT EXISTS exercise_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_point_id BIGINT NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    event_time TIMESTAMPTZ,
    event_utc_offset_seconds INTEGER,
    event_type TEXT
);
CREATE INDEX IF NOT EXISTS idx_exercise_events_dp ON exercise_events(data_point_id);

CREATE TABLE IF NOT EXISTS nutrition_log_nutrients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_point_id BIGINT NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    nutrient TEXT NOT NULL,
    grams DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_nutrients_dp ON nutrition_log_nutrients(data_point_id);
CREATE INDEX IF NOT EXISTS idx_nutrients_name ON nutrition_log_nutrients(data_point_id, nutrient);

CREATE TABLE IF NOT EXISTS daily_heart_rate_zones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_point_id BIGINT NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    zone_type TEXT NOT NULL,
    min_bpm INTEGER,
    max_bpm INTEGER
);
CREATE INDEX IF NOT EXISTS idx_daily_hrz_dp ON daily_heart_rate_zones(data_point_id);

CREATE TABLE IF NOT EXISTS active_minutes_by_level (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_point_id BIGINT NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    activity_level TEXT NOT NULL,
    minutes INTEGER
);
CREATE INDEX IF NOT EXISTS idx_active_minutes_level_dp ON active_minutes_by_level(data_point_id);

CREATE TABLE IF NOT EXISTS irregular_rhythm_alert_windows (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_point_id BIGINT NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    positive BOOLEAN,
    heart_beats_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_irn_windows_dp ON irregular_rhythm_alert_windows(data_point_id);

CREATE TABLE IF NOT EXISTS electrocardiogram_waveforms (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_point_id BIGINT NOT NULL REFERENCES data_points(id) ON DELETE CASCADE,
    result_classification TEXT,
    beats_per_minute_avg INTEGER,
    sampling_frequency_hertz INTEGER,
    millivolts_scaling_factor INTEGER,
    lead_number INTEGER,
    waveform_samples_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_ecg_waveforms_dp ON electrocardiogram_waveforms(data_point_id);

CREATE TABLE IF NOT EXISTS food_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
    fetched_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_food_items_id ON food_items(food_id);

CREATE TABLE IF NOT EXISTS food_measurement_units (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unit_id TEXT UNIQUE NOT NULL,
    display_name TEXT,
    plural_display_name TEXT,
    fetched_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_food_units_id ON food_measurement_units(unit_id);

CREATE TABLE IF NOT EXISTS rollup_data_points (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL,
    rollup_kind TEXT NOT NULL,
    window_size TEXT,
    data_source_family TEXT,

    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    civil_start_date DATE,
    civil_end_date DATE,

    count_sum INTEGER,
    count_avg DOUBLE PRECISION,
    count_min INTEGER,
    count_max INTEGER,
    distance_meters_sum DOUBLE PRECISION,
    energy_kcal_sum DOUBLE PRECISION,
    duration_seconds_sum INTEGER,

    heart_rate_zone_type TEXT,
    activity_level TEXT,
    exercise_type TEXT,
    swim_stroke_type TEXT,
    nutrient TEXT,

    payload_json JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE NULLS NOT DISTINCT (user_id, data_type, rollup_kind, window_size, data_source_family, start_time, end_time)
);
CREATE INDEX IF NOT EXISTS idx_rollup_user_type_kind_time ON rollup_data_points(user_id, data_type, rollup_kind, start_time);
CREATE INDEX IF NOT EXISTS idx_rollup_user_type_kind_civil ON rollup_data_points(user_id, data_type, rollup_kind, civil_start_date);

CREATE TABLE IF NOT EXISTS health_data_records (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_point_id BIGINT REFERENCES data_points(id) ON DELETE SET NULL,
    record_date DATE NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    metric_unit TEXT,
    metric_metadata_json TEXT,
    source TEXT NOT NULL,
    data_type TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, record_date, metric_name, source)
);
CREATE INDEX IF NOT EXISTS idx_health_records_user_date ON health_data_records(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_health_records_metric ON health_data_records(user_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_health_records_dp ON health_data_records(data_point_id);
