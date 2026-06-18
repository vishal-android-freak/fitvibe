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
	// The device's own summary minutes (Fitbit-authoritative). Null on rows
	// whose payload lacks them; callers fall back to summed stage minutes.
	MinutesAsleep        sql.NullInt64
	MinutesInSleepPeriod sql.NullInt64
}

// LatestNight returns the user's most recent MAIN (non-nap) sleep session, or
// nil if none. It prefers a proper night over a nap so the Today card and the
// Sleep-tab default never show a 30-minute nap as "last night"; it falls back to
// a nap only when there is no main sleep at all.
func (r *SleepRepo) LatestNight(ctx context.Context, userID int64) (*SleepNight, error) {
	var night SleepNight
	var offset sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		SELECT id, start_time, end_time, COALESCE(start_utc_offset_seconds, end_utc_offset_seconds, 0),
		       (payload_json->'sleep'->'summary'->>'minutesAsleep')::int,
		       (payload_json->'sleep'->'summary'->>'minutesInSleepPeriod')::int
		FROM data_points
		WHERE user_id = $1 AND data_type = 'sleep' AND start_time IS NOT NULL AND end_time IS NOT NULL
		ORDER BY COALESCE(is_nap, false) ASC, end_time DESC
		LIMIT 1`, userID).Scan(&night.DataPointID, &night.Start, &night.End, &offset,
		&night.MinutesAsleep, &night.MinutesInSleepPeriod)
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

// SleepNightDetail is a single past sleep night: its session bounds, the asleep
// minutes (deep+rem+light from the device summary), the per-stage summary, and
// the per-night vitals joined by the night's local civil date. Each vital is a
// NullFloat64 because a night may lack any given metric.
type SleepNightDetail struct {
	DataPointID   int64
	Start         time.Time // session start (UTC instant)
	End           time.Time // session end (UTC instant)
	OffsetSeconds int       // local UTC offset, for rendering wall-clock times
	CivilDate     string    // local civil date "2006-01-02" (civil_end_date or date(end_time))
	AsleepMinutes int       // deep + rem + light, summed from stages (fallback)

	// Device's own summary minutes (Fitbit-authoritative); null when the payload
	// lacks them. Preferred for duration + efficiency.
	MinutesAsleep        sql.NullInt64
	MinutesInSleepPeriod sql.NullInt64

	RestingHeartRate sql.NullFloat64 // daily-resting-heart-rate value_avg (bpm)
	HRV              sql.NullFloat64 // daily-heart-rate-variability value_avg (ms)
	SpO2             sql.NullFloat64 // daily-oxygen-saturation value_avg (percent)
	RespiratoryRate  sql.NullFloat64 // respiratory-rate-sleep-summary value_avg (breaths/min)
	SkinTempDelta    sql.NullFloat64 // nightly - baseline temp, celsius

	Segments []SleepStageSegment // chronological stage timeline (for derived metrics)
	Summary  []SleepStageSummary // per-stage minutes + counts
	Naps     []Nap               // naps recorded on the same civil date (hypnogram only)
}

// Nap is a same-day nap shown as an extra hypnogram on the night — just its
// timeline + duration/time, no score/quality (those are for the main sleep).
type Nap struct {
	Start         time.Time
	End           time.Time
	OffsetSeconds int
	AsleepMinutes int                 // device minutesAsleep (fallback to summed stages)
	Segments      []SleepStageSegment // stage timeline for the nap hypnogram
}

// RecentNights returns up to limit recent NIGHTS (one main/overnight sleep per
// civil date, most recent first), each with its per-night vitals and any naps
// recorded on the same date (attached as Naps — hypnogram only, no score). Naps
// are NOT separate entries; they ride along on their day's main sleep.
func (r *SleepRepo) RecentNights(ctx context.Context, userID int64, limit int) ([]SleepNightDetail, error) {
	if limit <= 0 {
		return nil, nil
	}
	rows, err := r.db.QueryContext(ctx, `
		WITH per_day AS (
			-- One main (non-nap) sleep per civil date: the longest. Naps are
			-- excluded here and attached separately below.
			SELECT DISTINCT ON (COALESCE(civil_end_date, date(end_time)))
			       id, start_time, end_time,
			       COALESCE(start_utc_offset_seconds, end_utc_offset_seconds, 0) AS offset_seconds,
			       COALESCE(civil_end_date, date(end_time)) AS civil_date,
			       (payload_json->'sleep'->'summary'->>'minutesAsleep')::int AS minutes_asleep,
			       (payload_json->'sleep'->'summary'->>'minutesInSleepPeriod')::int AS minutes_in_period
			FROM data_points
			WHERE user_id = $1 AND data_type = 'sleep'
			  AND start_time IS NOT NULL AND end_time IS NOT NULL
			  AND COALESCE(is_nap, false) = false
			ORDER BY COALESCE(civil_end_date, date(end_time)) DESC, (end_time - start_time) DESC
		),
		nights AS (
			SELECT * FROM per_day ORDER BY civil_date DESC LIMIT $2
		)
		-- Scalar subqueries (not LEFT JOINs): a vital type can have several rows
		-- per civil date (e.g. respiratory-rate-sleep-summary), and joining would
		-- fan each night into duplicate rows. Aggregate to one value per date.
		SELECT n.id, n.start_time, n.end_time, n.offset_seconds, n.civil_date,
		       n.minutes_asleep, n.minutes_in_period,
		       (SELECT AVG(value_avg) FROM data_points v
		          WHERE v.user_id = $1 AND v.data_type = 'daily-resting-heart-rate'
		            AND v.civil_start_date = n.civil_date) AS rhr,
		       (SELECT AVG(value_avg) FROM data_points v
		          WHERE v.user_id = $1 AND v.data_type = 'daily-heart-rate-variability'
		            AND v.civil_start_date = n.civil_date) AS hrv,
		       (SELECT AVG(value_avg) FROM data_points v
		          WHERE v.user_id = $1 AND v.data_type = 'daily-oxygen-saturation'
			    AND v.civil_start_date = n.civil_date) AS spo2,
		       (SELECT AVG(value_avg) FROM data_points v
		          WHERE v.user_id = $1 AND v.data_type = 'respiratory-rate-sleep-summary'
		            AND v.civil_start_date = n.civil_date) AS respiratory_rate,
		       (SELECT AVG((v.payload_json->'dailySleepTemperatureDerivations'->>'nightlyTemperatureCelsius')::float
		                 - (v.payload_json->'dailySleepTemperatureDerivations'->>'baselineTemperatureCelsius')::float)
		          FROM data_points v
		          WHERE v.user_id = $1 AND v.data_type = 'daily-sleep-temperature-derivations'
		            AND v.civil_start_date = n.civil_date
		            -- The baseline is "NaN" before the 30-day baseline is set; a NaN
		            -- delta otherwise renders as garbage. Exclude non-finite values.
		            AND v.payload_json->'dailySleepTemperatureDerivations'->>'nightlyTemperatureCelsius' <> 'NaN'
		            AND v.payload_json->'dailySleepTemperatureDerivations'->>'baselineTemperatureCelsius' <> 'NaN') AS skin_temp_delta
		FROM nights n
		ORDER BY n.civil_date DESC`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("query recent sleep nights: %w", err)
	}
	defer rows.Close()

	var out []SleepNightDetail
	for rows.Next() {
		var d SleepNightDetail
		var offset sql.NullInt64
		var civilDate time.Time
		if err := rows.Scan(&d.DataPointID, &d.Start, &d.End, &offset, &civilDate,
			&d.MinutesAsleep, &d.MinutesInSleepPeriod,
			&d.RestingHeartRate, &d.HRV, &d.SpO2, &d.RespiratoryRate, &d.SkinTempDelta); err != nil {
			return nil, fmt.Errorf("scan recent sleep night: %w", err)
		}
		d.OffsetSeconds = int(offset.Int64)
		d.CivilDate = civilDate.Format("2006-01-02")
		out = append(out, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recent sleep nights: %w", err)
	}

	// Stage summary + the chronological timeline (needed for derived sleep-quality
	// metrics: interruptions, time-to-sound-sleep, disruption ticks) per night.
	for i := range out {
		summary, err := r.summary(ctx, out[i].DataPointID)
		if err != nil {
			return nil, err
		}
		out[i].Summary = summary
		asleep := 0
		for _, s := range summary {
			switch s.StageType {
			case "DEEP", "REM", "LIGHT", "SLEEPING":
				asleep += s.Minutes
			}
		}
		out[i].AsleepMinutes = asleep

		segs, err := r.stages(ctx, out[i].DataPointID)
		if err != nil {
			return nil, err
		}
		out[i].Segments = segs

		naps, err := r.napsForDate(ctx, userID, out[i].CivilDate)
		if err != nil {
			return nil, err
		}
		out[i].Naps = naps
	}

	return out, nil
}

// napsForDate returns the naps recorded on a given local civil date (newest
// first), each with its stage timeline for the hypnogram. No score/quality.
func (r *SleepRepo) napsForDate(ctx context.Context, userID int64, civilDate string) ([]Nap, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, start_time, end_time,
		       COALESCE(start_utc_offset_seconds, end_utc_offset_seconds, 0),
		       (payload_json->'sleep'->'summary'->>'minutesAsleep')::int
		FROM data_points
		WHERE user_id = $1 AND data_type = 'sleep' AND is_nap = true
		  AND COALESCE(civil_end_date, date(end_time)) = $2::date
		  AND start_time IS NOT NULL AND end_time IS NOT NULL
		ORDER BY end_time DESC`, userID, civilDate)
	if err != nil {
		return nil, fmt.Errorf("query naps: %w", err)
	}
	defer rows.Close()

	var naps []Nap
	var ids []int64
	for rows.Next() {
		var n Nap
		var id int64
		var off sql.NullInt64
		var asleep sql.NullInt64
		if err := rows.Scan(&id, &n.Start, &n.End, &off, &asleep); err != nil {
			return nil, fmt.Errorf("scan nap: %w", err)
		}
		n.OffsetSeconds = int(off.Int64)
		n.AsleepMinutes = int(asleep.Int64)
		naps = append(naps, n)
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	// Attach each nap's stage timeline for the hypnogram.
	for i := range naps {
		segs, err := r.stages(ctx, ids[i])
		if err != nil {
			return nil, err
		}
		naps[i].Segments = segs
	}
	return naps, nil
}

func (r *SleepRepo) stages(ctx context.Context, dpID int64) ([]SleepStageSegment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT stage_type, start_time, end_time, COALESCE(start_utc_offset_seconds, 0)
		FROM sleep_stages
		WHERE data_point_id = $1
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
		WHERE data_point_id = $1`, dpID)
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
