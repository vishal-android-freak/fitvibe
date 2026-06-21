package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// DataPointRepo handles persistence for data_points.
type DataPointRepo struct {
	db *sql.DB
}

// NewDataPointRepo creates a new DataPointRepo.
func NewDataPointRepo(db *sql.DB) *DataPointRepo {
	return &DataPointRepo{db: db}
}

// DataPointRecord represents a row to insert into data_points.
type DataPointRecord struct {
	ID                     int64
	UserID                 int64
	DataType               string
	DataPointCategory      string
	DataSourceFamily       sql.NullString
	RecordingMethod        sql.NullString
	Platform               sql.NullString
	DeviceName             sql.NullString
	DeviceFormFactor       sql.NullString
	ApplicationPackageName sql.NullString
	DataSourceJSON         sql.NullString
	GoogleDataPointName    sql.NullString
	ResourceID             sql.NullString
	SampleTime             sql.NullTime
	StartTime              sql.NullTime
	EndTime                sql.NullTime
	CivilStartTime         sql.NullString
	CivilEndTime           sql.NullString
	CivilStartDate         sql.NullTime
	CivilEndDate           sql.NullTime
	StartUTCOffsetSeconds  sql.NullInt32
	EndUTCOffsetSeconds    sql.NullInt32
	ValueCount             sql.NullInt32
	ValueSum               sql.NullFloat64
	ValueAvg               sql.NullFloat64
	ValueMin               sql.NullFloat64
	ValueMax               sql.NullFloat64
	EnumValue              sql.NullString
	EnumValueSecondary     sql.NullString

	// Promoted from payload_json at ingestion so queries read columns, not JSON.
	NutritionCarbsGrams sql.NullFloat64
	NutritionFatGrams   sql.NullFloat64
	MealType            sql.NullString
	FoodDisplayName     sql.NullString
	IsNap               sql.NullBool // sleep metadata.nap (true = nap, null/false = main sleep)

	PayloadJSON           string
	FetchedVia            string
	WebhookNotificationID sql.NullInt64

	// Children are normalized child-table rows derived from this data point.
	// They are inserted transactionally after the parent row, keyed on its id.
	Children DataPointChildren
}

// DataPointChildren holds the normalized rows derived from a single data point.
// Slices left empty are simply not written.
type DataPointChildren struct {
	SleepStages    []SleepStageRow
	SleepSummary   []SleepSummaryStageRow
	SleepOutOfBed  []SleepOutOfBedRow
	ExerciseEvents []ExerciseEventRow
	ExerciseSplits []ExerciseSplitRow
	Nutrients      []NutrientRow
	DailyHRZones   []DailyHRZoneRow
	ActiveMinutes  []ActiveMinutesRow
	EcgWaveforms   []EcgWaveformRow
	IrnWindows     []IrnWindowRow
	HealthRecords  []HealthDataRow
}

// IsEmpty reports whether the data point produced no normalized child rows.
func (c DataPointChildren) IsEmpty() bool {
	return len(c.SleepStages) == 0 && len(c.SleepSummary) == 0 && len(c.SleepOutOfBed) == 0 &&
		len(c.ExerciseEvents) == 0 && len(c.ExerciseSplits) == 0 && len(c.Nutrients) == 0 &&
		len(c.DailyHRZones) == 0 && len(c.ActiveMinutes) == 0 && len(c.EcgWaveforms) == 0 &&
		len(c.IrnWindows) == 0 && len(c.HealthRecords) == 0
}

// SleepStageRow is a sleep_stages child row.
type SleepStageRow struct {
	StartTime             time.Time
	EndTime               time.Time
	StartUTCOffsetSeconds sql.NullInt32
	EndUTCOffsetSeconds   sql.NullInt32
	StageType             string
	CreateTime            sql.NullTime
	UpdateTime            sql.NullTime
}

// SleepSummaryStageRow is a sleep_summary_stages child row.
type SleepSummaryStageRow struct {
	StageType string
	Minutes   sql.NullInt32
	Count     sql.NullInt32
}

// SleepOutOfBedRow is a sleep_out_of_bed_segments child row.
type SleepOutOfBedRow struct {
	StartTime             time.Time
	EndTime               time.Time
	StartUTCOffsetSeconds sql.NullInt32
	EndUTCOffsetSeconds   sql.NullInt32
}

// ExerciseEventRow is an exercise_events child row.
type ExerciseEventRow struct {
	EventTime             sql.NullTime
	EventUTCOffsetSeconds sql.NullInt32
	EventType             sql.NullString
}

// ExerciseSplitRow is an exercise_splits child row.
type ExerciseSplitRow struct {
	StartTime             sql.NullTime
	EndTime               sql.NullTime
	ActiveDurationSeconds sql.NullFloat64
	SplitType             sql.NullString
	MetricsSummaryJSON    sql.NullString
}

// NutrientRow is a nutrition_log_nutrients child row.
type NutrientRow struct {
	Nutrient string
	Grams    sql.NullFloat64
}

// DailyHRZoneRow is a daily_heart_rate_zones child row.
type DailyHRZoneRow struct {
	ZoneType string
	MinBPM   sql.NullInt32
	MaxBPM   sql.NullInt32
}

// ActiveMinutesRow is an active_minutes_by_level child row.
type ActiveMinutesRow struct {
	ActivityLevel string
	Minutes       sql.NullInt32
}

// EcgWaveformRow is an electrocardiogram_waveforms child row.
type EcgWaveformRow struct {
	ResultClassification    sql.NullString
	BeatsPerMinuteAvg       sql.NullInt32
	SamplingFrequencyHertz  sql.NullInt32
	MillivoltsScalingFactor sql.NullInt32
	LeadNumber              sql.NullInt32
	WaveformSamplesJSON     sql.NullString
}

// IrnWindowRow is an irregular_rhythm_alert_windows child row.
type IrnWindowRow struct {
	StartTime      sql.NullTime
	EndTime        sql.NullTime
	Positive       sql.NullBool
	HeartBeatsJSON sql.NullString
}

// HealthDataRow is a health_data_records normalized row.
type HealthDataRow struct {
	RecordDate   time.Time
	MetricName   string
	MetricValue  float64
	MetricUnit   sql.NullString
	MetadataJSON sql.NullString
	Source       string
	DataType     string
}

// Insert stores a single data point and returns its ID.
func (r *DataPointRepo) Insert(ctx context.Context, rec *DataPointRecord) (int64, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO data_points (
			user_id, data_type, data_point_category,
			data_source_family, recording_method, platform, device_name, device_form_factor, application_package_name,
			data_source_json, google_data_point_name, resource_id,
			sample_time, start_time, end_time, civil_start_time, civil_end_time, civil_start_date, civil_end_date,
			start_utc_offset_seconds, end_utc_offset_seconds,
			value_count, value_sum, value_avg, value_min, value_max,
			enum_value, enum_value_secondary,
			nutrition_carbs_grams, nutrition_fat_grams, meal_type, food_display_name, is_nap,
			payload_json, fetched_via, webhook_notification_id
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36
		)
		RETURNING id
	`, rec.UserID, rec.DataType, rec.DataPointCategory,
		rec.DataSourceFamily, rec.RecordingMethod, rec.Platform, rec.DeviceName, rec.DeviceFormFactor, rec.ApplicationPackageName,
		rec.DataSourceJSON, rec.GoogleDataPointName, rec.ResourceID,
		rec.SampleTime, rec.StartTime, rec.EndTime, rec.CivilStartTime, rec.CivilEndTime, rec.CivilStartDate, rec.CivilEndDate,
		rec.StartUTCOffsetSeconds, rec.EndUTCOffsetSeconds,
		rec.ValueCount, rec.ValueSum, rec.ValueAvg, rec.ValueMin, rec.ValueMax,
		rec.EnumValue, rec.EnumValueSecondary,
		rec.NutritionCarbsGrams, rec.NutritionFatGrams, rec.MealType, rec.FoodDisplayName, rec.IsNap,
		rec.PayloadJSON, rec.FetchedVia, rec.WebhookNotificationID).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("insert data point: %w", err)
	}
	return id, nil
}

// InsertMany stores multiple data points and their normalized child rows in a
// single transaction.
//
// The parent row is upserted with INSERT ... ON CONFLICT DO UPDATE keyed on the
// NULLS NOT DISTINCT unique index (user_id, data_type, sample_time, start_time,
// end_time). ON CONFLICT DO UPDATE keeps the SAME row, and RETURNING id yields
// its stable id whether the statement inserted or updated — so the data point's
// id is stable across re-ingestion and backfills. Child rows are then cleared by
// that stable id and re-inserted, which makes the whole operation idempotent —
// running it repeatedly never produces duplicate parent or child rows, and does
// not depend on ON DELETE CASCADE / foreign_keys being enabled on the connection.
func (r *DataPointRepo) InsertMany(ctx context.Context, recs []*DataPointRecord) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO data_points (
			user_id, data_type, data_point_category,
			data_source_family, recording_method, platform, device_name, device_form_factor, application_package_name,
			data_source_json, google_data_point_name, resource_id,
			sample_time, start_time, end_time, civil_start_time, civil_end_time, civil_start_date, civil_end_date,
			start_utc_offset_seconds, end_utc_offset_seconds,
			value_count, value_sum, value_avg, value_min, value_max,
			enum_value, enum_value_secondary,
			nutrition_carbs_grams, nutrition_fat_grams, meal_type, food_display_name, is_nap,
			payload_json, fetched_via, webhook_notification_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)
		ON CONFLICT (user_id, data_type, sample_time, start_time, end_time)
		DO UPDATE SET
			data_point_category = EXCLUDED.data_point_category,
			data_source_family = EXCLUDED.data_source_family,
			recording_method = EXCLUDED.recording_method,
			platform = EXCLUDED.platform,
			device_name = EXCLUDED.device_name,
			device_form_factor = EXCLUDED.device_form_factor,
			application_package_name = EXCLUDED.application_package_name,
			data_source_json = EXCLUDED.data_source_json,
			google_data_point_name = EXCLUDED.google_data_point_name,
			resource_id = EXCLUDED.resource_id,
			civil_start_time = EXCLUDED.civil_start_time,
			civil_end_time = EXCLUDED.civil_end_time,
			civil_start_date = EXCLUDED.civil_start_date,
			civil_end_date = EXCLUDED.civil_end_date,
			start_utc_offset_seconds = EXCLUDED.start_utc_offset_seconds,
			end_utc_offset_seconds = EXCLUDED.end_utc_offset_seconds,
			value_count = EXCLUDED.value_count,
			value_sum = EXCLUDED.value_sum,
			value_avg = EXCLUDED.value_avg,
			value_min = EXCLUDED.value_min,
			value_max = EXCLUDED.value_max,
			enum_value = EXCLUDED.enum_value,
			enum_value_secondary = EXCLUDED.enum_value_secondary,
			nutrition_carbs_grams = EXCLUDED.nutrition_carbs_grams,
			nutrition_fat_grams = EXCLUDED.nutrition_fat_grams,
			meal_type = EXCLUDED.meal_type,
			food_display_name = EXCLUDED.food_display_name,
			is_nap = EXCLUDED.is_nap,
			payload_json = EXCLUDED.payload_json,
			fetched_via = EXCLUDED.fetched_via,
			webhook_notification_id = EXCLUDED.webhook_notification_id
		RETURNING id
	`)
	if err != nil {
		return fmt.Errorf("prepare stmt: %w", err)
	}
	defer stmt.Close()

	for _, rec := range recs {
		// ON CONFLICT DO UPDATE reuses the same row, so RETURNING id yields the
		// stable id whether this was an insert or an update — preserving the
		// idempotency / stable-id behavior child rows depend on.
		var dpID int64
		if err := stmt.QueryRowContext(ctx,
			rec.UserID, rec.DataType, rec.DataPointCategory,
			rec.DataSourceFamily, rec.RecordingMethod, rec.Platform, rec.DeviceName, rec.DeviceFormFactor, rec.ApplicationPackageName,
			rec.DataSourceJSON, rec.GoogleDataPointName, rec.ResourceID,
			rec.SampleTime, rec.StartTime, rec.EndTime, rec.CivilStartTime, rec.CivilEndTime, rec.CivilStartDate, rec.CivilEndDate,
			rec.StartUTCOffsetSeconds, rec.EndUTCOffsetSeconds,
			rec.ValueCount, rec.ValueSum, rec.ValueAvg, rec.ValueMin, rec.ValueMax,
			rec.EnumValue, rec.EnumValueSecondary,
			rec.NutritionCarbsGrams, rec.NutritionFatGrams, rec.MealType, rec.FoodDisplayName, rec.IsNap,
			rec.PayloadJSON, rec.FetchedVia, rec.WebhookNotificationID).Scan(&dpID); err != nil {
			return fmt.Errorf("upsert data point: %w", err)
		}

		// The vast majority of points (e.g. heart-rate samples) have no child
		// rows. Skip child handling entirely for them. This is safe for re-parse
		// backfills: the same immutable payload always yields the same children,
		// so a point that produces none now never had any to clear.
		if rec.Children.IsEmpty() {
			continue
		}

		if err := insertChildren(ctx, tx, rec.UserID, dpID, &rec.Children); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}

// childTables are every table whose rows are owned by a data point. The parent
// is upserted with ON CONFLICT DO UPDATE, which reuses the rowid and so does
// NOT trigger ON DELETE CASCADE; clearing children here is therefore the
// load-bearing step that keeps re-ingestion idempotent (and health_data_records
// uses ON DELETE SET NULL, so it must be cleared explicitly too).
var childTables = []string{
	"sleep_stages", "sleep_summary_stages", "sleep_out_of_bed_segments",
	"exercise_events", "exercise_splits", "nutrition_log_nutrients",
	"daily_heart_rate_zones", "active_minutes_by_level",
	"electrocardiogram_waveforms", "irregular_rhythm_alert_windows", "health_data_records",
}

// insertChildren clears and re-writes the normalized child rows for a data
// point. Callers should skip it when DataPointChildren.IsEmpty().
func insertChildren(ctx context.Context, tx *sql.Tx, userID, dpID int64, c *DataPointChildren) error {
	if c == nil {
		return nil
	}

	for _, t := range childTables {
		if _, err := tx.ExecContext(ctx, "DELETE FROM "+t+" WHERE data_point_id = $1", dpID); err != nil {
			return fmt.Errorf("clear %s: %w", t, err)
		}
	}

	// Each child table is written by the same INSERT-per-row loop; insertChildRows
	// captures that loop once so each table only declares its SQL and the args for
	// one row. `label` names the table in any error.
	if err := insertChildRows(ctx, tx, "sleep_stage", c.SleepStages, `
		INSERT INTO sleep_stages (data_point_id, start_time, end_time, start_utc_offset_seconds, end_utc_offset_seconds, stage_type, create_time, update_time)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		func(s SleepStageRow) []any {
			return []any{dpID, s.StartTime, s.EndTime, s.StartUTCOffsetSeconds, s.EndUTCOffsetSeconds, s.StageType, s.CreateTime, s.UpdateTime}
		}); err != nil {
		return err
	}
	if err := insertChildRows(ctx, tx, "sleep_summary_stage", c.SleepSummary, `
		INSERT INTO sleep_summary_stages (data_point_id, stage_type, minutes, count)
		VALUES ($1, $2, $3, $4)`,
		func(s SleepSummaryStageRow) []any { return []any{dpID, s.StageType, s.Minutes, s.Count} }); err != nil {
		return err
	}
	if err := insertChildRows(ctx, tx, "sleep_out_of_bed", c.SleepOutOfBed, `
		INSERT INTO sleep_out_of_bed_segments (data_point_id, start_time, end_time, start_utc_offset_seconds, end_utc_offset_seconds)
		VALUES ($1, $2, $3, $4, $5)`,
		func(s SleepOutOfBedRow) []any {
			return []any{dpID, s.StartTime, s.EndTime, s.StartUTCOffsetSeconds, s.EndUTCOffsetSeconds}
		}); err != nil {
		return err
	}
	if err := insertChildRows(ctx, tx, "exercise_event", c.ExerciseEvents, `
		INSERT INTO exercise_events (data_point_id, event_time, event_utc_offset_seconds, event_type)
		VALUES ($1, $2, $3, $4)`,
		func(e ExerciseEventRow) []any { return []any{dpID, e.EventTime, e.EventUTCOffsetSeconds, e.EventType} }); err != nil {
		return err
	}
	if err := insertChildRows(ctx, tx, "exercise_split", c.ExerciseSplits, `
		INSERT INTO exercise_splits (data_point_id, start_time, end_time, active_duration_seconds, split_type, metrics_summary_json)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		func(s ExerciseSplitRow) []any {
			return []any{dpID, s.StartTime, s.EndTime, s.ActiveDurationSeconds, s.SplitType, s.MetricsSummaryJSON}
		}); err != nil {
		return err
	}
	if err := insertChildRows(ctx, tx, "nutrient", c.Nutrients, `
		INSERT INTO nutrition_log_nutrients (data_point_id, nutrient, grams)
		VALUES ($1, $2, $3)`,
		func(n NutrientRow) []any { return []any{dpID, n.Nutrient, n.Grams} }); err != nil {
		return err
	}
	if err := insertChildRows(ctx, tx, "daily_hr_zone", c.DailyHRZones, `
		INSERT INTO daily_heart_rate_zones (data_point_id, zone_type, min_bpm, max_bpm)
		VALUES ($1, $2, $3, $4)`,
		func(z DailyHRZoneRow) []any { return []any{dpID, z.ZoneType, z.MinBPM, z.MaxBPM} }); err != nil {
		return err
	}
	if err := insertChildRows(ctx, tx, "active_minutes", c.ActiveMinutes, `
		INSERT INTO active_minutes_by_level (data_point_id, activity_level, minutes)
		VALUES ($1, $2, $3)`,
		func(a ActiveMinutesRow) []any { return []any{dpID, a.ActivityLevel, a.Minutes} }); err != nil {
		return err
	}
	if err := insertChildRows(ctx, tx, "ecg_waveform", c.EcgWaveforms, `
		INSERT INTO electrocardiogram_waveforms
			(data_point_id, result_classification, beats_per_minute_avg, sampling_frequency_hertz, millivolts_scaling_factor, lead_number, waveform_samples_json)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		func(e EcgWaveformRow) []any {
			return []any{dpID, e.ResultClassification, e.BeatsPerMinuteAvg, e.SamplingFrequencyHertz, e.MillivoltsScalingFactor, e.LeadNumber, e.WaveformSamplesJSON}
		}); err != nil {
		return err
	}
	if err := insertChildRows(ctx, tx, "irn_window", c.IrnWindows, `
		INSERT INTO irregular_rhythm_alert_windows (data_point_id, start_time, end_time, positive, heart_beats_json)
		VALUES ($1, $2, $3, $4, $5)`,
		func(w IrnWindowRow) []any { return []any{dpID, w.StartTime, w.EndTime, w.Positive, w.HeartBeatsJSON} }); err != nil {
		return err
	}
	// health_data_records is keyed on (user_id, record_date, metric_name, source)
	// and upserts rather than relying on the DELETE above (ON DELETE SET NULL).
	if err := insertChildRows(ctx, tx, "health_data_record", c.HealthRecords, `
		INSERT INTO health_data_records
			(user_id, data_point_id, record_date, metric_name, metric_value, metric_unit, metric_metadata_json, source, data_type)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (user_id, record_date, metric_name, source) DO UPDATE SET
			data_point_id = EXCLUDED.data_point_id,
			metric_value = EXCLUDED.metric_value,
			metric_unit = EXCLUDED.metric_unit,
			metric_metadata_json = EXCLUDED.metric_metadata_json,
			data_type = EXCLUDED.data_type`,
		func(h HealthDataRow) []any {
			return []any{userID, dpID, h.RecordDate, h.MetricName, h.MetricValue, h.MetricUnit, h.MetadataJSON, h.Source, h.DataType}
		}); err != nil {
		return err
	}
	return nil
}

// insertChildRows runs `query` once per item, with the args produced by `args`.
// label names the row type in any error.
func insertChildRows[T any](ctx context.Context, tx *sql.Tx, label string, items []T, query string, args func(T) []any) error {
	for _, it := range items {
		if _, err := tx.ExecContext(ctx, query, args(it)...); err != nil {
			return fmt.Errorf("insert %s: %w", label, err)
		}
	}
	return nil
}

// DeleteByTimeRange removes data points for a user/data type whose primary
// time coordinate falls within [start, end). Used to apply webhook DELETE
// notifications. Child rows cascade-delete via ON DELETE CASCADE.
func (r *DataPointRepo) DeleteByTimeRange(ctx context.Context, userID int64, dataType string, start, end time.Time) (int64, error) {
	res, err := r.db.ExecContext(ctx, `
		DELETE FROM data_points
		WHERE user_id = $1 AND data_type = $2
		  AND COALESCE(sample_time, start_time) >= $3
		  AND COALESCE(sample_time, start_time) < $4
	`, userID, dataType, start.UTC(), end.UTC())
	if err != nil {
		return 0, fmt.Errorf("delete data points by range: %w", err)
	}
	n, _ := res.RowsAffected()
	return n, nil
}

// GetByName returns a data point by its google_data_point_name for a user.
func (r *DataPointRepo) GetByName(ctx context.Context, userID int64, name string) (*DataPointRecord, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, data_type, data_point_category,
		       google_data_point_name, payload_json, fetched_at
		FROM data_points
		WHERE user_id = $1 AND google_data_point_name = $2
	`, userID, name)

	rec := &DataPointRecord{}
	var fetchedAt time.Time
	if err := row.Scan(&rec.ID, &rec.UserID, &rec.DataType, &rec.DataPointCategory,
		&rec.GoogleDataPointName, &rec.PayloadJSON, &fetchedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get data point: %w", err)
	}
	return rec, nil
}

// RawDataPoint is a minimal projection used by the backfill re-parser.
type RawDataPoint struct {
	ID                    int64
	UserID                int64
	DataType              string
	FetchedVia            string
	PayloadJSON           string
	WebhookNotificationID sql.NullInt64
}

// IterateRaw streams every data point's raw payload to fn in id order. The
// callback must not retain the pointer past the call.
func (r *DataPointRepo) IterateRaw(ctx context.Context, fn func(*RawDataPoint) error) error {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, data_type, fetched_via, payload_json, webhook_notification_id
		FROM data_points ORDER BY id
	`)
	if err != nil {
		return fmt.Errorf("query data points: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var rp RawDataPoint
		if err := rows.Scan(&rp.ID, &rp.UserID, &rp.DataType, &rp.FetchedVia, &rp.PayloadJSON, &rp.WebhookNotificationID); err != nil {
			return fmt.Errorf("scan data point: %w", err)
		}
		if err := fn(&rp); err != nil {
			return err
		}
	}
	return rows.Err()
}

// Count returns the total number of data points.
func (r *DataPointRepo) Count(ctx context.Context) (int64, error) {
	var n int64
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM data_points`).Scan(&n); err != nil {
		return 0, err
	}
	return n, nil
}

// GetLatestValue returns the most recent value_avg/value_sum for a user and data type.
func (r *DataPointRepo) GetLatestValue(ctx context.Context, userID int64, dataType string) (float64, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT COALESCE(value_avg, value_sum, 0)
		FROM data_points
		WHERE user_id = $1 AND data_type = $2 AND (value_avg IS NOT NULL OR value_sum IS NOT NULL)
		ORDER BY COALESCE(sample_time, start_time) DESC
		LIMIT 1
	`, userID, dataType)

	var value float64
	if err := row.Scan(&value); err != nil {
		if err == sql.ErrNoRows {
			return 0, nil
		}
		return 0, fmt.Errorf("get latest value: %w", err)
	}
	return value, nil
}
