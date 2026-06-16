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
	PayloadJSON            string
	FetchedVia             string
	WebhookNotificationID  sql.NullInt64

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
	HealthRecords  []HealthDataRow
}

// IsEmpty reports whether the data point produced no normalized child rows.
func (c DataPointChildren) IsEmpty() bool {
	return len(c.SleepStages) == 0 && len(c.SleepSummary) == 0 && len(c.SleepOutOfBed) == 0 &&
		len(c.ExerciseEvents) == 0 && len(c.ExerciseSplits) == 0 && len(c.Nutrients) == 0 &&
		len(c.DailyHRZones) == 0 && len(c.ActiveMinutes) == 0 && len(c.HealthRecords) == 0
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
	res, err := r.db.ExecContext(ctx, `
		INSERT INTO data_points (
			user_id, data_type, data_point_category,
			data_source_family, recording_method, platform, device_name, device_form_factor, application_package_name,
			data_source_json, google_data_point_name, resource_id,
			sample_time, start_time, end_time, civil_start_time, civil_end_time, civil_start_date, civil_end_date,
			start_utc_offset_seconds, end_utc_offset_seconds,
			value_count, value_sum, value_avg, value_min, value_max,
			enum_value, enum_value_secondary,
			payload_json, fetched_via, webhook_notification_id
		) VALUES (
			?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
		)
	`, rec.UserID, rec.DataType, rec.DataPointCategory,
		rec.DataSourceFamily, rec.RecordingMethod, rec.Platform, rec.DeviceName, rec.DeviceFormFactor, rec.ApplicationPackageName,
		rec.DataSourceJSON, rec.GoogleDataPointName, rec.ResourceID,
		rec.SampleTime, rec.StartTime, rec.EndTime, rec.CivilStartTime, rec.CivilEndTime, rec.CivilStartDate, rec.CivilEndDate,
		rec.StartUTCOffsetSeconds, rec.EndUTCOffsetSeconds,
		rec.ValueCount, rec.ValueSum, rec.ValueAvg, rec.ValueMin, rec.ValueMax,
		rec.EnumValue, rec.EnumValueSecondary,
		rec.PayloadJSON, rec.FetchedVia, rec.WebhookNotificationID)
	if err != nil {
		return 0, fmt.Errorf("insert data point: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("last insert id: %w", err)
	}
	return id, nil
}

// InsertMany stores multiple data points and their normalized child rows in a
// single transaction.
//
// The parent row is upserted with INSERT ... ON CONFLICT DO UPDATE keyed on the
// COALESCE unique index (user_id, data_type, sample_time, start_time, end_time).
// Unlike INSERT OR REPLACE, ON CONFLICT DO UPDATE keeps the SAME rowid, so the
// data point's id is stable across re-ingestion and backfills. Child rows are
// then cleared by that stable id and re-inserted, which makes the whole
// operation idempotent — running it repeatedly never produces duplicate parent
// or child rows, and does not depend on ON DELETE CASCADE / foreign_keys being
// enabled on the connection.
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
			payload_json, fetched_via, webhook_notification_id
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (user_id, data_type, COALESCE(sample_time, ''), COALESCE(start_time, ''), COALESCE(end_time, ''))
		DO UPDATE SET
			data_point_category = excluded.data_point_category,
			data_source_family = excluded.data_source_family,
			recording_method = excluded.recording_method,
			platform = excluded.platform,
			device_name = excluded.device_name,
			device_form_factor = excluded.device_form_factor,
			application_package_name = excluded.application_package_name,
			data_source_json = excluded.data_source_json,
			google_data_point_name = excluded.google_data_point_name,
			resource_id = excluded.resource_id,
			civil_start_time = excluded.civil_start_time,
			civil_end_time = excluded.civil_end_time,
			civil_start_date = excluded.civil_start_date,
			civil_end_date = excluded.civil_end_date,
			start_utc_offset_seconds = excluded.start_utc_offset_seconds,
			end_utc_offset_seconds = excluded.end_utc_offset_seconds,
			value_count = excluded.value_count,
			value_sum = excluded.value_sum,
			value_avg = excluded.value_avg,
			value_min = excluded.value_min,
			value_max = excluded.value_max,
			enum_value = excluded.enum_value,
			enum_value_secondary = excluded.enum_value_secondary,
			payload_json = excluded.payload_json,
			fetched_via = excluded.fetched_via,
			webhook_notification_id = excluded.webhook_notification_id
	`)
	if err != nil {
		return fmt.Errorf("prepare stmt: %w", err)
	}
	defer stmt.Close()

	idStmt, err := tx.PrepareContext(ctx, `
		SELECT id FROM data_points
		WHERE user_id = ? AND data_type = ?
		  AND COALESCE(sample_time, '') = COALESCE(?, '')
		  AND COALESCE(start_time, '') = COALESCE(?, '')
		  AND COALESCE(end_time, '') = COALESCE(?, '')
	`)
	if err != nil {
		return fmt.Errorf("prepare id stmt: %w", err)
	}
	defer idStmt.Close()

	for _, rec := range recs {
		if _, err := stmt.ExecContext(ctx,
			rec.UserID, rec.DataType, rec.DataPointCategory,
			rec.DataSourceFamily, rec.RecordingMethod, rec.Platform, rec.DeviceName, rec.DeviceFormFactor, rec.ApplicationPackageName,
			rec.DataSourceJSON, rec.GoogleDataPointName, rec.ResourceID,
			rec.SampleTime, rec.StartTime, rec.EndTime, rec.CivilStartTime, rec.CivilEndTime, rec.CivilStartDate, rec.CivilEndDate,
			rec.StartUTCOffsetSeconds, rec.EndUTCOffsetSeconds,
			rec.ValueCount, rec.ValueSum, rec.ValueAvg, rec.ValueMin, rec.ValueMax,
			rec.EnumValue, rec.EnumValueSecondary,
			rec.PayloadJSON, rec.FetchedVia, rec.WebhookNotificationID); err != nil {
			return fmt.Errorf("upsert data point: %w", err)
		}

		// The vast majority of points (e.g. heart-rate samples) have no child
		// rows. Skip the id-resolution query and child handling entirely for
		// them. This is safe for re-parse backfills: the same immutable payload
		// always yields the same children, so a point that produces none now
		// never had any to clear.
		if rec.Children.IsEmpty() {
			continue
		}

		var dpID int64
		if err := idStmt.QueryRowContext(ctx, rec.UserID, rec.DataType, rec.SampleTime, rec.StartTime, rec.EndTime).Scan(&dpID); err != nil {
			return fmt.Errorf("resolve data point id: %w", err)
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
	"daily_heart_rate_zones", "active_minutes_by_level", "health_data_records",
}

// insertChildren clears and re-writes the normalized child rows for a data
// point. Callers should skip it when DataPointChildren.IsEmpty().
func insertChildren(ctx context.Context, tx *sql.Tx, userID, dpID int64, c *DataPointChildren) error {
	if c == nil {
		return nil
	}

	for _, t := range childTables {
		if _, err := tx.ExecContext(ctx, "DELETE FROM "+t+" WHERE data_point_id = ?", dpID); err != nil {
			return fmt.Errorf("clear %s: %w", t, err)
		}
	}

	for _, s := range c.SleepStages {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO sleep_stages (data_point_id, start_time, end_time, start_utc_offset_seconds, end_utc_offset_seconds, stage_type, create_time, update_time)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			dpID, s.StartTime, s.EndTime, s.StartUTCOffsetSeconds, s.EndUTCOffsetSeconds, s.StageType, s.CreateTime, s.UpdateTime); err != nil {
			return fmt.Errorf("insert sleep_stage: %w", err)
		}
	}
	for _, s := range c.SleepSummary {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO sleep_summary_stages (data_point_id, stage_type, minutes, count)
			VALUES (?, ?, ?, ?)`,
			dpID, s.StageType, s.Minutes, s.Count); err != nil {
			return fmt.Errorf("insert sleep_summary_stage: %w", err)
		}
	}
	for _, s := range c.SleepOutOfBed {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO sleep_out_of_bed_segments (data_point_id, start_time, end_time, start_utc_offset_seconds, end_utc_offset_seconds)
			VALUES (?, ?, ?, ?, ?)`,
			dpID, s.StartTime, s.EndTime, s.StartUTCOffsetSeconds, s.EndUTCOffsetSeconds); err != nil {
			return fmt.Errorf("insert sleep_out_of_bed: %w", err)
		}
	}
	for _, e := range c.ExerciseEvents {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO exercise_events (data_point_id, event_time, event_utc_offset_seconds, event_type)
			VALUES (?, ?, ?, ?)`,
			dpID, e.EventTime, e.EventUTCOffsetSeconds, e.EventType); err != nil {
			return fmt.Errorf("insert exercise_event: %w", err)
		}
	}
	for _, s := range c.ExerciseSplits {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO exercise_splits (data_point_id, start_time, end_time, active_duration_seconds, split_type, metrics_summary_json)
			VALUES (?, ?, ?, ?, ?, ?)`,
			dpID, s.StartTime, s.EndTime, s.ActiveDurationSeconds, s.SplitType, s.MetricsSummaryJSON); err != nil {
			return fmt.Errorf("insert exercise_split: %w", err)
		}
	}
	for _, n := range c.Nutrients {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO nutrition_log_nutrients (data_point_id, nutrient, grams)
			VALUES (?, ?, ?)`,
			dpID, n.Nutrient, n.Grams); err != nil {
			return fmt.Errorf("insert nutrient: %w", err)
		}
	}
	for _, z := range c.DailyHRZones {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO daily_heart_rate_zones (data_point_id, zone_type, min_bpm, max_bpm)
			VALUES (?, ?, ?, ?)`,
			dpID, z.ZoneType, z.MinBPM, z.MaxBPM); err != nil {
			return fmt.Errorf("insert daily_hr_zone: %w", err)
		}
	}
	for _, a := range c.ActiveMinutes {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO active_minutes_by_level (data_point_id, activity_level, minutes)
			VALUES (?, ?, ?)`,
			dpID, a.ActivityLevel, a.Minutes); err != nil {
			return fmt.Errorf("insert active_minutes: %w", err)
		}
	}
	for _, h := range c.HealthRecords {
		if _, err := tx.ExecContext(ctx, `
			INSERT OR REPLACE INTO health_data_records
				(user_id, data_point_id, record_date, metric_name, metric_value, metric_unit, metric_metadata_json, source, data_type)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			userID, dpID, h.RecordDate, h.MetricName, h.MetricValue, h.MetricUnit, h.MetadataJSON, h.Source, h.DataType); err != nil {
			return fmt.Errorf("insert health_data_record: %w", err)
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
		WHERE user_id = ? AND data_type = ?
		  AND COALESCE(sample_time, start_time) >= ?
		  AND COALESCE(sample_time, start_time) < ?
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
		WHERE user_id = ? AND google_data_point_name = ?
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
		WHERE user_id = ? AND data_type = ? AND (value_avg IS NOT NULL OR value_sum IS NOT NULL)
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
