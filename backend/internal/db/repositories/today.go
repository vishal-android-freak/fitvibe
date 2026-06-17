package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// TodayRepo reads "today" rollups for the Today screen — today's step total,
// the latest heart-rate sample, and today's nutrition/energy/hydration totals.
//
// "Today" is the user's LOCAL civil day (civil_start_date), so points are
// attributed to the date the user experienced them, not the UTC instant.
type TodayRepo struct {
	db *sql.DB
}

func NewTodayRepo(db *sql.DB) *TodayRepo {
	return &TodayRepo{db: db}
}

// LatestSample is the most recent reading of a sample metric (e.g. heart rate).
type LatestSample struct {
	Value         float64
	At            time.Time // sample instant (UTC)
	OffsetSeconds int       // local UTC offset for rendering wall-clock
}

// DaySummary is the live activity snapshot for a local day.
type DaySummary struct {
	Steps           int
	LatestHeartRate *LatestSample // nil if no sample today
}

// NutritionTotals are today's logged intake + energy expenditure, all in the
// user's local day.
type NutritionTotals struct {
	CaloriesEaten int     // sum of nutrition-log energy.kcal
	CaloriesBurnt int     // sum of active-energy-burned kcal
	CarbsGrams    float64 // sum of nutrition-log totalCarbohydrate.grams
	FatGrams      float64 // sum of nutrition-log totalFat.grams
	ProteinGrams  float64 // sum of nutrition_log_nutrients where nutrient='PROTEIN'
	HydrationML   float64 // sum of hydration-log amountConsumed.milliliters
	// LastUpdated is the most recent of any contributing entry today (nil if none).
	LastUpdated *LatestSample
}

// DaySummary returns today's step total and latest heart-rate sample for the
// user's local civil day `localDate` (format "2006-01-02").
func (r *TodayRepo) DaySummary(ctx context.Context, userID int64, localDate string) (*DaySummary, error) {
	var out DaySummary

	// Steps: sum the per-interval value_count for the local day, but only from
	// the Fitbit wearable. The phone also reports steps via Health Connect
	// (platform = HEALTH_CONNECT, device formFactor = PHONE) over OVERLAPPING
	// time windows, so summing every source double-counts (e.g. 2083 wearable +
	// 1138 phone = 3221, while Google shows ~the wearable's 2083). Exclude the
	// Health Connect / phone source so our total matches the watch.
	err := r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(value_count), 0)
		FROM data_points
		WHERE user_id = ? AND data_type = 'steps' AND date(civil_start_date) = ?
		  AND COALESCE(platform, '') != 'HEALTH_CONNECT'
		  AND COALESCE(device_form_factor, '') != 'PHONE'`,
		userID, localDate).Scan(&out.Steps)
	if err != nil {
		return nil, fmt.Errorf("sum today steps: %w", err)
	}

	// Latest heart-rate sample (any time, most recent — a "current" reading).
	var hr float64
	var at time.Time
	var off sql.NullInt64
	err = r.db.QueryRowContext(ctx, `
		SELECT value_avg, sample_time, COALESCE(start_utc_offset_seconds, 0)
		FROM data_points
		WHERE user_id = ? AND data_type = 'heart-rate' AND value_avg IS NOT NULL AND sample_time IS NOT NULL
		ORDER BY sample_time DESC
		LIMIT 1`, userID).Scan(&hr, &at, &off)
	switch {
	case err == sql.ErrNoRows:
		// no HR samples — leave nil
	case err != nil:
		return nil, fmt.Errorf("latest heart rate: %w", err)
	default:
		out.LatestHeartRate = &LatestSample{Value: hr, At: at, OffsetSeconds: int(off.Int64)}
	}

	return &out, nil
}

// NutritionToday returns today's intake/energy/hydration totals for the user's
// local civil day `localDate`.
func (r *TodayRepo) NutritionToday(ctx context.Context, userID int64, localDate string) (*NutritionTotals, error) {
	var out NutritionTotals

	// Nutrition log: calories (energy.kcal), carbs, fat — top-level in payload.
	// value_sum holds energy.kcal (the mapper's headline scalar for nutrition-log).
	err := r.db.QueryRowContext(ctx, `
		SELECT
			COALESCE(SUM(value_sum), 0),
			COALESCE(SUM(json_extract(payload_json, '$.nutritionLog.totalCarbohydrate.grams')), 0),
			COALESCE(SUM(json_extract(payload_json, '$.nutritionLog.totalFat.grams')), 0)
		FROM data_points
		WHERE user_id = ? AND data_type = 'nutrition-log' AND date(civil_start_date) = ?`,
		userID, localDate).Scan(&out.CaloriesEaten, &out.CarbsGrams, &out.FatGrams)
	if err != nil {
		return nil, fmt.Errorf("nutrition totals: %w", err)
	}

	// Protein lives in the nutrients child table.
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(n.grams), 0)
		FROM nutrition_log_nutrients n
		JOIN data_points d ON d.id = n.data_point_id
		WHERE d.user_id = ? AND d.data_type = 'nutrition-log'
		  AND date(d.civil_start_date) = ? AND n.nutrient = 'PROTEIN'`,
		userID, localDate).Scan(&out.ProteinGrams)
	if err != nil {
		return nil, fmt.Errorf("protein total: %w", err)
	}

	// Active energy burned: kcal per interval point. ROUND so fractional kcal
	// don't truncate (e.g. 41.8 → 42, not 41).
	err = r.db.QueryRowContext(ctx, `
		SELECT CAST(ROUND(COALESCE(SUM(json_extract(payload_json, '$.activeEnergyBurned.kcal')), 0)) AS INTEGER)
		FROM data_points
		WHERE user_id = ? AND data_type = 'active-energy-burned' AND date(civil_start_date) = ?`,
		userID, localDate).Scan(&out.CaloriesBurnt)
	if err != nil {
		return nil, fmt.Errorf("calories burnt: %w", err)
	}

	// Hydration: amountConsumed.milliliters (value_sum holds it).
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(value_sum), 0)
		FROM data_points
		WHERE user_id = ? AND data_type = 'hydration-log' AND date(civil_start_date) = ?`,
		userID, localDate).Scan(&out.HydrationML)
	if err != nil {
		return nil, fmt.Errorf("hydration total: %w", err)
	}

	// Most recent contributing entry today, across all nutrition/energy/hydration
	// sources — drives the "as of" stamp. COALESCE loses the column's TIMESTAMP
	// affinity so the driver returns the value as a string; scan into a string
	// and parse, rather than directly into time.Time (which fails).
	var atStr string
	var off sql.NullInt64
	err = r.db.QueryRowContext(ctx, `
		SELECT COALESCE(start_time, sample_time), COALESCE(start_utc_offset_seconds, 0)
		FROM data_points
		WHERE user_id = ?
		  AND data_type IN ('nutrition-log', 'active-energy-burned', 'hydration-log')
		  AND date(civil_start_date) = ?
		  AND COALESCE(start_time, sample_time) IS NOT NULL
		ORDER BY COALESCE(start_time, sample_time) DESC
		LIMIT 1`, userID, localDate).Scan(&atStr, &off)
	switch {
	case err == sql.ErrNoRows:
		// nothing logged today — leave nil
	case err != nil:
		return nil, fmt.Errorf("nutrition last-updated: %w", err)
	default:
		if at := parseStoredTime(atStr); !at.IsZero() {
			out.LastUpdated = &LatestSample{At: at, OffsetSeconds: int(off.Int64)}
		}
	}

	return &out, nil
}

// parseStoredTime parses a stored timestamp string (the driver returns COALESCE
// results as strings, losing TIMESTAMP affinity), tolerating both RFC3339 and
// the space-separated SQLite form. Returns the zero time if unparseable.
func parseStoredTime(s string) time.Time {
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339, "2006-01-02 15:04:05Z07:00", "2006-01-02 15:04:05"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t
		}
	}
	return time.Time{}
}
