package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// BodyRepo reads the data behind the app's Body tab: vitals trends (RHR, HRV,
// SpO2, respiratory rate, skin-temp), body composition (weight, body-fat,
// height, VO2 max), daily activity rollups, exercise sessions, and the
// nutrient breakdown. It complements TodayRepo (single-day) with trend windows.
type BodyRepo struct {
	db *sql.DB
}

func NewBodyRepo(db *sql.DB) *BodyRepo {
	return &BodyRepo{db: db}
}

// TrendPoint is one dated value on a metric's trend line (local civil date).
type TrendPoint struct {
	Date  string  `json:"date"` // "2006-01-02"
	Value float64 `json:"value"`
}

// MetricSeries is a metric's latest value + its recent trend. Latest is the
// most recent point; Trend is oldest→newest over the requested window.
type MetricSeries struct {
	Latest *float64     `json:"latest"` // nil when no data
	At     string       `json:"at"`     // local date of the latest point
	Trend  []TrendPoint `json:"trend"`
}

// dailyAvgSeries pulls a daily metric's value_avg over the last `days`,
// one point per civil_start_date, oldest→newest. Used for the daily-* vitals.
func (r *BodyRepo) DailyAvgSeries(ctx context.Context, userID int64, dataType string, days int) (MetricSeries, error) {
	return r.series(ctx, `
		SELECT civil_start_date, value_avg
		FROM data_points
		WHERE user_id = $1 AND data_type = $2
		  AND value_avg IS NOT NULL AND civil_start_date IS NOT NULL
		  AND civil_start_date >= (CURRENT_DATE - $3::int)
		ORDER BY civil_start_date`, userID, dataType, days)
}

// sampleAvgSeries collapses a sample metric (e.g. weight) to one point per civil
// date — the daily average of its samples — over the last `days`.
func (r *BodyRepo) SampleAvgSeries(ctx context.Context, userID int64, dataType string, days int) (MetricSeries, error) {
	return r.series(ctx, `
		SELECT date(sample_time) AS d, AVG(value_avg)
		FROM data_points
		WHERE user_id = $1 AND data_type = $2
		  AND value_avg IS NOT NULL AND sample_time IS NOT NULL
		  AND sample_time >= (CURRENT_DATE - $3::int)
		GROUP BY date(sample_time)
		ORDER BY d`, userID, dataType, days)
}

// series runs a (date, value) query and assembles a MetricSeries.
func (r *BodyRepo) series(ctx context.Context, query string, args ...interface{}) (MetricSeries, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return MetricSeries{}, fmt.Errorf("body series query: %w", err)
	}
	defer rows.Close()

	var out MetricSeries
	for rows.Next() {
		var d time.Time
		var v float64
		if err := rows.Scan(&d, &v); err != nil {
			return MetricSeries{}, fmt.Errorf("scan body series: %w", err)
		}
		out.Trend = append(out.Trend, TrendPoint{Date: d.Format("2006-01-02"), Value: v})
	}
	if err := rows.Err(); err != nil {
		return MetricSeries{}, err
	}
	if n := len(out.Trend); n > 0 {
		last := out.Trend[n-1]
		v := last.Value
		out.Latest = &v
		out.At = last.Date
	}
	return out, rows.Err()
}

// SkinTempSeries returns the nightly skin-temperature DELTA (nightly − baseline,
// °C) over the window, one point per civil date, excluding non-finite values.
func (r *BodyRepo) SkinTempSeries(ctx context.Context, userID int64, days int) (MetricSeries, error) {
	return r.series(ctx, `
		SELECT civil_start_date,
		       ROUND(AVG((payload_json->'dailySleepTemperatureDerivations'->>'nightlyTemperatureCelsius')::float
		         - (payload_json->'dailySleepTemperatureDerivations'->>'baselineTemperatureCelsius')::float)::numeric, 2)
		FROM data_points
		WHERE user_id = $1 AND data_type = 'daily-sleep-temperature-derivations'
		  AND civil_start_date IS NOT NULL
		  AND civil_start_date >= (CURRENT_DATE - $2::int)
		  AND payload_json->'dailySleepTemperatureDerivations'->>'nightlyTemperatureCelsius' <> 'NaN'
		  AND payload_json->'dailySleepTemperatureDerivations'->>'baselineTemperatureCelsius' <> 'NaN'
		GROUP BY civil_start_date
		ORDER BY civil_start_date`, userID, days)
}

// LatestSampleValue returns the most recent value_avg of a sample metric (e.g.
// height), or (0,false) if none.
func (r *BodyRepo) LatestSampleValue(ctx context.Context, userID int64, dataType string) (float64, bool, error) {
	var v float64
	err := r.db.QueryRowContext(ctx, `
		SELECT value_avg FROM data_points
		WHERE user_id = $1 AND data_type = $2 AND value_avg IS NOT NULL
		ORDER BY COALESCE(sample_time, start_time, civil_start_date::timestamptz) DESC
		LIMIT 1`, userID, dataType).Scan(&v)
	if err == sql.ErrNoRows {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, fmt.Errorf("latest %s: %w", dataType, err)
	}
	return v, true, nil
}

// VO2MaxSeries returns VO2 max (ml/kg/min) over the window, preferring the daily
// type but falling back to run/instant samples, one point per civil date.
func (r *BodyRepo) VO2MaxSeries(ctx context.Context, userID int64, days int) (MetricSeries, error) {
	return r.series(ctx, `
		SELECT d, AVG(v) FROM (
			SELECT COALESCE(civil_start_date, date(sample_time)) AS d, value_avg AS v
			FROM data_points
			WHERE user_id = $1 AND data_type IN ('daily-vo2-max','vo2-max','run-vo2-max')
			  AND value_avg IS NOT NULL
			  AND COALESCE(civil_start_date, date(sample_time)) >= (CURRENT_DATE - $2::int)
		) s
		GROUP BY d ORDER BY d`, userID, days)
}

// ActivityDay is the activity rollup for one local day.
type ActivityDay struct {
	Steps       int
	DistanceM   float64
	Floors      int
	ActiveKcal  int
	ZoneMinutes int
}

// ActivityToday sums today's activity. Steps exclude the phone/Health-Connect
// source to avoid double-counting against the wearable (same rule as TodayRepo).
func (r *BodyRepo) ActivityToday(ctx context.Context, userID int64, localDate string) (ActivityDay, error) {
	var a ActivityDay
	err := r.db.QueryRowContext(ctx, `
		SELECT
			COALESCE(SUM(value_count) FILTER (WHERE data_type='steps'
				AND COALESCE(platform,'') <> 'HEALTH_CONNECT'
				AND COALESCE(device_form_factor,'') <> 'PHONE'), 0) AS steps,
			COALESCE(SUM(value_sum) FILTER (WHERE data_type='distance'), 0) AS distance_m,
			COALESCE(SUM(value_count) FILTER (WHERE data_type='floors'), 0) AS floors,
			ROUND(COALESCE(SUM(value_sum) FILTER (WHERE data_type='active-energy-burned'), 0))::int AS active_kcal,
			COALESCE(SUM(value_count) FILTER (WHERE data_type='active-zone-minutes'), 0) AS zone_minutes
		FROM data_points
		WHERE user_id = $1 AND civil_start_date = $2
		  AND data_type IN ('steps','distance','floors','active-energy-burned','active-zone-minutes')`,
		userID, localDate).Scan(&a.Steps, &a.DistanceM, &a.Floors, &a.ActiveKcal, &a.ZoneMinutes)
	if err != nil {
		return a, fmt.Errorf("activity today: %w", err)
	}
	return a, nil
}

// DailyActiveSeries returns a per-day sum of a metric over the window (for the
// weekly active-energy / zone-minute sparklines). col is value_sum or value_count.
func (r *BodyRepo) DailyActiveSeries(ctx context.Context, userID int64, dataType, col string, days int) ([]TrendPoint, error) {
	// col is a fixed internal string (value_sum/value_count), never user input.
	rows, err := r.db.QueryContext(ctx, `
		SELECT civil_start_date, COALESCE(SUM(`+col+`), 0)
		FROM data_points
		WHERE user_id = $1 AND data_type = $2 AND civil_start_date IS NOT NULL
		  AND civil_start_date >= (CURRENT_DATE - $3::int)
		GROUP BY civil_start_date ORDER BY civil_start_date`, userID, dataType, days)
	if err != nil {
		return nil, fmt.Errorf("daily active series: %w", err)
	}
	defer rows.Close()
	var out []TrendPoint
	for rows.Next() {
		var d time.Time
		var v float64
		if err := rows.Scan(&d, &v); err != nil {
			return nil, fmt.Errorf("scan daily active: %w", err)
		}
		out = append(out, TrendPoint{Date: d.Format("2006-01-02"), Value: v})
	}
	return out, rows.Err()
}

// ExerciseSession is one workout with its summary + per-zone time.
type ExerciseSession struct {
	Type          string
	At            time.Time
	OffsetSeconds int
	DurationSec   int
	Kcal          int
	Steps         int
	HRZones       []ZoneTime // time in each HR zone during the session window
}

// ZoneTime is seconds spent in a named HR zone.
type ZoneTime struct {
	Zone    string `json:"zone"`
	Seconds int    `json:"seconds"`
}

// RecentSessions returns the user's exercise sessions in the window (newest
// first), each with the time-in-HR-zone breakdown over the session's interval.
func (r *BodyRepo) RecentSessions(ctx context.Context, userID int64, days, limit int) ([]ExerciseSession, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT enum_value, start_time, COALESCE(start_utc_offset_seconds, 0),
		       EXTRACT(EPOCH FROM (end_time - start_time))::int,
		       COALESCE(value_sum, 0), COALESCE(value_count, 0)
		FROM data_points
		WHERE user_id = $1 AND data_type = 'exercise'
		  AND start_time IS NOT NULL AND end_time IS NOT NULL
		  AND start_time >= (CURRENT_DATE - $2::int)
		ORDER BY start_time DESC
		LIMIT $3`, userID, days, limit)
	if err != nil {
		return nil, fmt.Errorf("recent sessions: %w", err)
	}
	defer rows.Close()

	var out []ExerciseSession
	for rows.Next() {
		var s ExerciseSession
		var typ sql.NullString
		var off, dur, kcal, steps sql.NullInt64
		var at time.Time
		if err := rows.Scan(&typ, &at, &off, &dur, &kcal, &steps); err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		s.Type = typ.String
		s.At = at
		s.OffsetSeconds = int(off.Int64)
		s.DurationSec = int(dur.Int64)
		s.Kcal = int(kcal.Int64)
		s.Steps = int(steps.Int64)
		out = append(out, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Per-session HR-zone time: sum time-in-heart-rate-zone value_sum (seconds)
	// per zone over each session's interval.
	for i := range out {
		zr, err := r.db.QueryContext(ctx, `
			SELECT enum_value, COALESCE(SUM(value_sum), 0)
			FROM data_points
			WHERE user_id = $1 AND data_type = 'time-in-heart-rate-zone'
			  AND enum_value IS NOT NULL
			  AND start_time >= $2 AND start_time < $3
			GROUP BY enum_value ORDER BY enum_value`,
			userID, out[i].At, out[i].At.Add(time.Duration(out[i].DurationSec)*time.Second))
		if err != nil {
			return nil, fmt.Errorf("session hr zones: %w", err)
		}
		for zr.Next() {
			var z ZoneTime
			var secs float64
			if err := zr.Scan(&z.Zone, &secs); err != nil {
				zr.Close()
				return nil, fmt.Errorf("scan zone time: %w", err)
			}
			z.Seconds = int(secs)
			out[i].HRZones = append(out[i].HRZones, z)
		}
		zr.Close()
		if err := zr.Err(); err != nil {
			return nil, err
		}
	}
	return out, nil
}

// NutrientTotal is a day's total of one nutrient (grams), from logged foods.
type NutrientTotal struct {
	Nutrient string  `json:"nutrient"`
	Grams    float64 `json:"grams"`
}

// NutritionCalories is the day's calories-in/out plus the macro totals that
// live in promoted columns (carbs/fat) rather than the nutrients child table.
type NutritionCalories struct {
	CaloriesEaten int
	CaloriesBurnt int
	CarbsGrams    float64
	FatGrams      float64
}

// NutritionToday returns the local day's calories eaten (nutrition-log) and
// burnt (active-energy-burned), plus total carbs/fat (promoted columns — these
// are top-level payload fields, NOT entries in the nutrients[] array).
func (r *BodyRepo) NutritionToday(ctx context.Context, userID int64, localDate string) (NutritionCalories, error) {
	var c NutritionCalories
	err := r.db.QueryRowContext(ctx, `
		SELECT
			ROUND(COALESCE(SUM(value_sum) FILTER (WHERE data_type='nutrition-log'), 0))::int,
			ROUND(COALESCE(SUM(value_sum) FILTER (WHERE data_type='active-energy-burned'), 0))::int,
			COALESCE(SUM(nutrition_carbs_grams) FILTER (WHERE data_type='nutrition-log'), 0),
			COALESCE(SUM(nutrition_fat_grams) FILTER (WHERE data_type='nutrition-log'), 0)
		FROM data_points
		WHERE user_id = $1 AND civil_start_date = $2
		  AND data_type IN ('nutrition-log','active-energy-burned')`,
		userID, localDate).Scan(&c.CaloriesEaten, &c.CaloriesBurnt, &c.CarbsGrams, &c.FatGrams)
	if err != nil {
		return c, fmt.Errorf("body nutrition calories: %w", err)
	}
	return c, nil
}

// MealEntry is one logged food for the day.
type MealEntry struct {
	Name          string
	MealType      string // BREAKFAST | LUNCH | DINNER | SNACK | ""
	Kcal          int
	At            time.Time
	OffsetSeconds int
}

// MealsToday returns the day's logged foods (nutrition-log entries) in
// chronological order, each with its name, meal type, calories, and time.
func (r *BodyRepo) MealsToday(ctx context.Context, userID int64, localDate string) ([]MealEntry, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT COALESCE(food_display_name, 'Food'),
		       COALESCE(meal_type, ''),
		       ROUND(COALESCE(value_sum, 0))::int,
		       COALESCE(start_time, sample_time),
		       COALESCE(start_utc_offset_seconds, 0)
		FROM data_points
		WHERE user_id = $1 AND data_type = 'nutrition-log' AND civil_start_date = $2
		ORDER BY COALESCE(start_time, sample_time)`, userID, localDate)
	if err != nil {
		return nil, fmt.Errorf("meals today: %w", err)
	}
	defer rows.Close()
	var out []MealEntry
	for rows.Next() {
		var m MealEntry
		var at sql.NullTime
		var off sql.NullInt64
		if err := rows.Scan(&m.Name, &m.MealType, &m.Kcal, &at, &off); err != nil {
			return nil, fmt.Errorf("scan meal: %w", err)
		}
		m.At = at.Time
		m.OffsetSeconds = int(off.Int64)
		out = append(out, m)
	}
	return out, rows.Err()
}

// NutrientsToday sums each logged nutrient for the local day across all
// nutrition-log entries — the dynamic micronutrient list (protein, fiber,
// sodium, sugar, etc.). Only nutrients actually present in the day's foods
// appear; it grows as logging gets richer.
func (r *BodyRepo) NutrientsToday(ctx context.Context, userID int64, localDate string) ([]NutrientTotal, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT n.nutrient, COALESCE(SUM(n.grams), 0) AS grams
		FROM nutrition_log_nutrients n
		JOIN data_points d ON d.id = n.data_point_id
		WHERE d.user_id = $1 AND d.data_type = 'nutrition-log'
		  AND d.civil_start_date = $2 AND n.grams IS NOT NULL
		GROUP BY n.nutrient
		ORDER BY grams DESC`, userID, localDate)
	if err != nil {
		return nil, fmt.Errorf("nutrients today: %w", err)
	}
	defer rows.Close()
	var out []NutrientTotal
	for rows.Next() {
		var nt NutrientTotal
		if err := rows.Scan(&nt.Nutrient, &nt.Grams); err != nil {
			return nil, fmt.Errorf("scan nutrient total: %w", err)
		}
		out = append(out, nt)
	}
	return out, rows.Err()
}
