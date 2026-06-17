package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// SleepRepo reads stored sleep sessions (data_points of type "sleep" plus their
// normalized sleep_stages / sleep_summary_stages child rows).
type SleepRepo struct {
	db *sql.DB
}

func NewSleepRepo(db *sql.DB) *SleepRepo {
	return &SleepRepo{db: db}
}

// SleepStageSegment is one contiguous stage block within the night.
type SleepStageSegment struct {
	StageType string
	Start     time.Time
	End       time.Time
	// OffsetSeconds is the local UTC offset for Start (e.g. 19800 for +05:30).
	OffsetSeconds int
}

// SleepStageSummary is the per-stage roll-up the device reports (minutes asleep
// in that stage + how many distinct times it was entered).
type SleepStageSummary struct {
	StageType string
	Minutes   int
	Count     int
}

// SleepNight is a single sleep session with its stages and summary.
type SleepNight struct {
	DataPointID   int64
	Start         time.Time // session start (UTC instant)
	End           time.Time // session end (UTC instant)
	OffsetSeconds int       // local UTC offset, for rendering wall-clock times
	Segments      []SleepStageSegment
	Summary       []SleepStageSummary
}

// LatestNight returns the most recent sleep session for a user, or nil if none.
func (r *SleepRepo) LatestNight(ctx context.Context, userID int64) (*SleepNight, error) {
	var night SleepNight
	var offset sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		SELECT id, start_time, end_time, COALESCE(start_utc_offset_seconds, end_utc_offset_seconds, 0)
		FROM data_points
		WHERE user_id = ? AND data_type = 'sleep' AND start_time IS NOT NULL AND end_time IS NOT NULL
		ORDER BY end_time DESC
		LIMIT 1`, userID).Scan(&night.DataPointID, &night.Start, &night.End, &offset)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query latest sleep night: %w", err)
	}
	night.OffsetSeconds = int(offset.Int64)

	segs, err := r.stages(ctx, night.DataPointID)
	if err != nil {
		return nil, err
	}
	night.Segments = segs

	summary, err := r.summary(ctx, night.DataPointID)
	if err != nil {
		return nil, err
	}
	night.Summary = summary

	return &night, nil
}

func (r *SleepRepo) stages(ctx context.Context, dpID int64) ([]SleepStageSegment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT stage_type, start_time, end_time, COALESCE(start_utc_offset_seconds, 0)
		FROM sleep_stages
		WHERE data_point_id = ?
		ORDER BY start_time`, dpID)
	if err != nil {
		return nil, fmt.Errorf("query sleep stages: %w", err)
	}
	defer rows.Close()

	var out []SleepStageSegment
	for rows.Next() {
		var s SleepStageSegment
		var off sql.NullInt64
		if err := rows.Scan(&s.StageType, &s.Start, &s.End, &off); err != nil {
			return nil, fmt.Errorf("scan sleep stage: %w", err)
		}
		s.OffsetSeconds = int(off.Int64)
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *SleepRepo) summary(ctx context.Context, dpID int64) ([]SleepStageSummary, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT stage_type, COALESCE(minutes, 0), COALESCE(count, 0)
		FROM sleep_summary_stages
		WHERE data_point_id = ?`, dpID)
	if err != nil {
		return nil, fmt.Errorf("query sleep summary: %w", err)
	}
	defer rows.Close()

	var out []SleepStageSummary
	for rows.Next() {
		var s SleepStageSummary
		if err := rows.Scan(&s.StageType, &s.Minutes, &s.Count); err != nil {
			return nil, fmt.Errorf("scan sleep summary: %w", err)
		}
		out = append(out, s)
	}
	return out, rows.Err()
}
