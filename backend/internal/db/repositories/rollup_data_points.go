package repositories

import (
	"context"
	"database/sql"
	"fmt"
)

// RollupDataPointRepo handles persistence for rollup_data_points.
type RollupDataPointRepo struct {
	db *sql.DB
}

// NewRollupDataPointRepo creates a new RollupDataPointRepo.
func NewRollupDataPointRepo(db *sql.DB) *RollupDataPointRepo {
	return &RollupDataPointRepo{db: db}
}

// RollupDataPointRecord represents a row to insert into rollup_data_points.
type RollupDataPointRecord struct {
	ID                 int64
	UserID             int64
	DataType           string
	RollupKind         string
	WindowSize         sql.NullString
	DataSourceFamily   sql.NullString
	StartTime          sql.NullTime
	EndTime            sql.NullTime
	CivilStartDate     sql.NullTime
	CivilEndDate       sql.NullTime
	CountSum           sql.NullInt32
	CountAvg           sql.NullFloat64
	CountMin           sql.NullInt32
	CountMax           sql.NullInt32
	DistanceMetersSum  sql.NullFloat64
	EnergyKcalSum      sql.NullFloat64
	DurationSecondsSum sql.NullInt32
	HeartRateZoneType  sql.NullString
	ActivityLevel      sql.NullString
	ExerciseType       sql.NullString
	SwimStrokeType     sql.NullString
	Nutrient           sql.NullString
	PayloadJSON        string
}

// RawRollup is a minimal projection used by the backfill re-parser.
type RawRollup struct {
	ID          int64
	UserID      int64
	DataType    string
	RollupKind  string
	WindowSize  sql.NullString
	PayloadJSON string
}

// IterateRaw streams every rollup's raw payload to fn in id order.
func (r *RollupDataPointRepo) IterateRaw(ctx context.Context, fn func(*RawRollup) error) error {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, data_type, rollup_kind, window_size, payload_json
		FROM rollup_data_points ORDER BY id
	`)
	if err != nil {
		return fmt.Errorf("query rollups: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var rr RawRollup
		if err := rows.Scan(&rr.ID, &rr.UserID, &rr.DataType, &rr.RollupKind, &rr.WindowSize, &rr.PayloadJSON); err != nil {
			return fmt.Errorf("scan rollup: %w", err)
		}
		if err := fn(&rr); err != nil {
			return err
		}
	}
	return rows.Err()
}

// InsertMany stores rollup records in a transaction.
func (r *RollupDataPointRepo) InsertMany(ctx context.Context, recs []*RollupDataPointRecord) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO rollup_data_points (
			user_id, data_type, rollup_kind, window_size, data_source_family,
			start_time, end_time, civil_start_date, civil_end_date,
			count_sum, count_avg, count_min, count_max,
			distance_meters_sum, energy_kcal_sum, duration_seconds_sum,
			heart_rate_zone_type, activity_level, exercise_type, swim_stroke_type, nutrient,
			payload_json
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
		ON CONFLICT (user_id, data_type, rollup_kind, window_size, data_source_family, start_time, end_time)
		DO UPDATE SET
			civil_start_date = EXCLUDED.civil_start_date,
			civil_end_date = EXCLUDED.civil_end_date,
			count_sum = EXCLUDED.count_sum,
			count_avg = EXCLUDED.count_avg,
			count_min = EXCLUDED.count_min,
			count_max = EXCLUDED.count_max,
			distance_meters_sum = EXCLUDED.distance_meters_sum,
			energy_kcal_sum = EXCLUDED.energy_kcal_sum,
			duration_seconds_sum = EXCLUDED.duration_seconds_sum,
			heart_rate_zone_type = EXCLUDED.heart_rate_zone_type,
			activity_level = EXCLUDED.activity_level,
			exercise_type = EXCLUDED.exercise_type,
			swim_stroke_type = EXCLUDED.swim_stroke_type,
			nutrient = EXCLUDED.nutrient,
			payload_json = EXCLUDED.payload_json
	`)
	if err != nil {
		return fmt.Errorf("prepare stmt: %w", err)
	}
	defer stmt.Close()

	for _, rec := range recs {
		_, err := stmt.ExecContext(ctx,
			rec.UserID, rec.DataType, rec.RollupKind, rec.WindowSize, rec.DataSourceFamily,
			rec.StartTime, rec.EndTime, rec.CivilStartDate, rec.CivilEndDate,
			rec.CountSum, rec.CountAvg, rec.CountMin, rec.CountMax,
			rec.DistanceMetersSum, rec.EnergyKcalSum, rec.DurationSecondsSum,
			rec.HeartRateZoneType, rec.ActivityLevel, rec.ExerciseType, rec.SwimStrokeType, rec.Nutrient,
			rec.PayloadJSON)
		if err != nil {
			return fmt.Errorf("insert rollup: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}
