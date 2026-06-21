// Package readiness computes FitVibe's 0-100 readiness score for the Today-tab
// center ring. It mirrors Google/Fitbit's three-input model (HRV, resting heart
// rate, recent sleep), each scored against the user's own trailing baseline,
// blended HRV-dominant and squashed through a logistic into 0-100.
//
// The exact formula, its empirical fit, and the honest limits are documented in
// backend/docs/calculations-methodology.html (Readiness section). The weights
// and shape constants live here as named vars so they stay easy to retune as
// more labeled days accrue.
package readiness

import (
	"context"
	"database/sql"
	"math"
)

// Tunable formula constants (see calculations-methodology.html). HRV ≫ RHR ≫
// sleep was fitted to this user's real scores (RMSE 3.78); kept named so a
// refit over ~30 days is a one-line change.
var (
	weightHRV   = 0.8
	weightRHR   = 0.2
	weightSleep = 0.0
	logisticK   = 0.8 // squash steepness
	logisticB   = 0.0 // squash bias
	zClamp      = 3.0 // clamp z-scores to ±3
	minBaseline = 3   // need ≥3 prior days for a baseline component
	warmupDays  = 7   // need ≥7 days of HRV history before showing a score
)

// Score is the readiness result for one civil date.
type Score struct {
	// Value is the 0-100 readiness score; nil when not enough history to compute
	// (warm-up not met, or no day with a complete component set).
	Value *int `json:"value"`
	// Band is "High" | "Moderate" | "Low", or "" when Value is nil.
	Band string `json:"band"`
	// Date is the civil date the score actually reflects (may lag the requested
	// date by a day, since a night's HRV record lands later — Google does the
	// same). Empty when Value is nil.
	Date string `json:"date,omitempty"`
	// Calibrated is false until the baseline has ~30 days behind it; the score is
	// still shown, but the client may flag it as still settling.
	Calibrated bool `json:"calibrated"`
	// Components is the per-input breakdown for the requested score, for the ring's
	// factor tiles / debugging. nil when Value is nil.
	Components *Components `json:"components,omitempty"`
}

// Components is the raw + z-scored inputs behind a score.
type Components struct {
	HRVDeepRMSSD *float64 `json:"hrvDeepRmssd"` // ms
	RestingHR    *float64 `json:"restingHr"`    // bpm
	DeepRemMin   *float64 `json:"deepRemMin"`   // minutes
	ZHRV         float64  `json:"zHrv"`
	ZRHR         float64  `json:"zRhr"` // already sign-flipped (lower RHR = better)
	ZSleep       float64  `json:"zSleep"`
}

// dayPoint is one civil date's component values (any may be absent).
type dayPoint struct {
	date    string
	hrv     sql.NullFloat64
	rhr     sql.NullFloat64
	deepRem sql.NullFloat64
}

// Compute returns the readiness score for the user as of the given civil date.
// It loads the trailing component series once, then scores the most recent date
// (≤ asOf) that has a complete HRV+RHR+sleep set — so the lag where today's HRV
// hasn't landed yet shows yesterday's score rather than nothing.
func Compute(ctx context.Context, db *sql.DB, userID int64, asOf string) (Score, error) {
	series, err := loadSeries(ctx, db, userID, asOf)
	if err != nil {
		return Score{}, err
	}
	// Warm-up gate: need enough HRV history at all.
	hrvDays := 0
	for _, p := range series {
		if p.hrv.Valid {
			hrvDays++
		}
	}
	if hrvDays < warmupDays {
		return Score{}, nil // not enough history; ring shows a provisional/empty state
	}

	// Find the most recent date with a complete component set to actually score.
	target := -1
	for i := len(series) - 1; i >= 0; i-- {
		if series[i].hrv.Valid && series[i].rhr.Valid && series[i].deepRem.Valid {
			target = i
			break
		}
	}
	if target < 0 {
		return Score{}, nil
	}

	prior := series[:target] // strictly-before days for the baseline (adaptive)
	hrvMean, hrvSD, hrvOK := baseline(prior, func(p dayPoint) sql.NullFloat64 { return p.hrv })
	rhrMean, rhrSD, rhrOK := baseline(prior, func(p dayPoint) sql.NullFloat64 { return p.rhr })
	slpMean, slpSD, slpOK := baseline(prior, func(p dayPoint) sql.NullFloat64 { return p.deepRem })

	t := series[target]
	comp := &Components{}
	if t.hrv.Valid {
		v := t.hrv.Float64
		comp.HRVDeepRMSSD = &v
	}
	if t.rhr.Valid {
		v := t.rhr.Float64
		comp.RestingHR = &v
	}
	if t.deepRem.Valid {
		v := t.deepRem.Float64
		comp.DeepRemMin = &v
	}
	if hrvOK {
		comp.ZHRV = z(t.hrv.Float64, hrvMean, hrvSD, false)
	}
	if rhrOK {
		comp.ZRHR = z(t.rhr.Float64, rhrMean, rhrSD, true) // lower RHR is better → flip
	}
	if slpOK {
		comp.ZSleep = z(t.deepRem.Float64, slpMean, slpSD, false)
	}

	Z := weightHRV*comp.ZHRV + weightRHR*comp.ZRHR + weightSleep*comp.ZSleep
	score := int(math.Round(100 / (1 + math.Exp(-(logisticK*Z + logisticB)))))
	if score < 0 {
		score = 0
	} else if score > 100 {
		score = 100
	}

	return Score{
		Value:      &score,
		Band:       band(score),
		Date:       t.date,
		Calibrated: len(prior) >= 30,
		Components: comp,
	}, nil
}

// band maps a score to Google/Fitbit's three readiness bands.
func band(score int) string {
	switch {
	case score >= 65:
		return "High"
	case score >= 30:
		return "Moderate"
	default:
		return "Low"
	}
}

// z is the clamped z-score; flip negates it (so "lower is better" metrics like
// resting HR contribute positively when below baseline).
func z(v, mean, sd float64, flip bool) float64 {
	if sd == 0 {
		sd = 1
	}
	zz := (v - mean) / sd
	if flip {
		zz = -zz
	}
	return math.Max(-zClamp, math.Min(zClamp, zz))
}

// baseline returns the mean and population SD of a component over the prior days
// that have it, or ok=false when there are too few.
func baseline(prior []dayPoint, pick func(dayPoint) sql.NullFloat64) (mean, sd float64, ok bool) {
	var xs []float64
	for _, p := range prior {
		if v := pick(p); v.Valid {
			xs = append(xs, v.Float64)
		}
	}
	if len(xs) < minBaseline {
		return 0, 0, false
	}
	var sum float64
	for _, x := range xs {
		sum += x
	}
	mean = sum / float64(len(xs))
	var ss float64
	for _, x := range xs {
		d := x - mean
		ss += d * d
	}
	sd = math.Sqrt(ss / float64(len(xs))) // population SD (matches the fit)
	return mean, sd, true
}

// loadSeries loads the per-civil-date component series up to and including asOf,
// ordered oldest→newest. Each component is read from its own data_type and
// joined on civil_start_date. A 60-day window is plenty for a 30-day baseline.
func loadSeries(ctx context.Context, db *sql.DB, userID int64, asOf string) ([]dayPoint, error) {
	const q = `
WITH hrv AS (
  SELECT civil_start_date AS d,
         (payload_json->'dailyHeartRateVariability'->>'deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds')::float AS v
  FROM data_points
  WHERE user_id = $1 AND data_type = 'daily-heart-rate-variability'
    AND civil_start_date IS NOT NULL AND civil_start_date <= $2::date
    AND civil_start_date >= $2::date - 60
    AND payload_json->'dailyHeartRateVariability'->>'deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds' IS NOT NULL
),
rhr AS (
  SELECT civil_start_date AS d, AVG(value_avg) AS v
  FROM data_points
  WHERE user_id = $1 AND data_type = 'daily-resting-heart-rate'
    AND value_avg IS NOT NULL AND civil_start_date IS NOT NULL
    AND civil_start_date <= $2::date AND civil_start_date >= $2::date - 60
  GROUP BY civil_start_date
),
slp AS (
  SELECT d.civil_start_date AS d, SUM(s.minutes)::float AS v
  FROM data_points d
  JOIN sleep_summary_stages s ON s.data_point_id = d.id
  WHERE d.user_id = $1 AND d.data_type = 'sleep' AND COALESCE(d.is_nap, false) = false
    AND s.stage_type IN ('DEEP', 'REM')
    AND d.civil_start_date IS NOT NULL
    AND d.civil_start_date <= $2::date AND d.civil_start_date >= $2::date - 60
  GROUP BY d.civil_start_date
),
days AS (
  SELECT d FROM hrv UNION SELECT d FROM rhr UNION SELECT d FROM slp
)
SELECT days.d::text, hrv.v, rhr.v, slp.v
FROM days
LEFT JOIN hrv ON hrv.d = days.d
LEFT JOIN rhr ON rhr.d = days.d
LEFT JOIN slp ON slp.d = days.d
ORDER BY days.d`

	rows, err := db.QueryContext(ctx, q, userID, asOf)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []dayPoint
	for rows.Next() {
		var p dayPoint
		if err := rows.Scan(&p.date, &p.hrv, &p.rhr, &p.deepRem); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
