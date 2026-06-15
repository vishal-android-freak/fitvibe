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

// InsertMany stores multiple data points in a single transaction.
func (r *DataPointRepo) InsertMany(ctx context.Context, recs []*DataPointRecord) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT OR REPLACE INTO data_points (
			user_id, data_type, data_point_category,
			data_source_family, recording_method, platform, device_name, device_form_factor, application_package_name,
			data_source_json, google_data_point_name, resource_id,
			sample_time, start_time, end_time, civil_start_time, civil_end_time, civil_start_date, civil_end_date,
			start_utc_offset_seconds, end_utc_offset_seconds,
			value_count, value_sum, value_avg, value_min, value_max,
			enum_value, enum_value_secondary,
			payload_json, fetched_via, webhook_notification_id
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return fmt.Errorf("prepare stmt: %w", err)
	}
	defer stmt.Close()

	for _, rec := range recs {
		_, err := stmt.ExecContext(ctx,
			rec.UserID, rec.DataType, rec.DataPointCategory,
			rec.DataSourceFamily, rec.RecordingMethod, rec.Platform, rec.DeviceName, rec.DeviceFormFactor, rec.ApplicationPackageName,
			rec.DataSourceJSON, rec.GoogleDataPointName, rec.ResourceID,
			rec.SampleTime, rec.StartTime, rec.EndTime, rec.CivilStartTime, rec.CivilEndTime, rec.CivilStartDate, rec.CivilEndDate,
			rec.StartUTCOffsetSeconds, rec.EndUTCOffsetSeconds,
			rec.ValueCount, rec.ValueSum, rec.ValueAvg, rec.ValueMin, rec.ValueMax,
			rec.EnumValue, rec.EnumValueSecondary,
			rec.PayloadJSON, rec.FetchedVia, rec.WebhookNotificationID)
		if err != nil {
			return fmt.Errorf("insert data point: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
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
