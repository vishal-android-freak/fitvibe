package readiness

import (
	"context"
	"database/sql"
	"strconv"
	"testing"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/db"
)

// realDays is this user's actual component series (Jun 8-18 2026), the same data
// the formula was fitted against. deepRMSSD is nil where no daily-HRV record
// exists (Jun 8). The labeled Google scores are 15→15, 16→86, 17→68, 18→77.
type day struct {
	date      string
	deepRMSSD *float64 // ms; nil = no HRV record
	rhr       float64  // bpm
	deepRem   float64  // deep+REM minutes
}

func f(v float64) *float64 { return &v }

var realDays = []day{
	{"2026-06-08", nil, 69, 193},
	{"2026-06-09", f(50.3), 63, 197}, // 9-13 use avg-HRV as a stand-in (no deepRMSSD stored)
	{"2026-06-10", f(43.1), 62, 64},
	{"2026-06-11", f(43.0), 64, 225},
	{"2026-06-12", f(48.3), 62, 240},
	{"2026-06-13", f(42.0), 62, 190},
	{"2026-06-14", f(44.15), 64, 134},
	{"2026-06-15", f(37.2), 65, 98},
	{"2026-06-16", f(52.8), 63, 156},
	{"2026-06-17", f(49.05), 61, 186},
	{"2026-06-18", f(56.2), 62, 214},
}

// TestComputeAgainstRealScores seeds the user's real component series and checks
// the readiness score reproduces the labeled Google scores within tolerance.
// Skips without a test Postgres.
func TestComputeAgainstRealScores(t *testing.T) {
	database := db.OpenTestDB(t)
	ctx := context.Background()
	userID := seedUser(t, database.DB)
	for _, d := range realDays {
		seedDay(t, database.DB, userID, d)
	}

	// asOf 2026-06-19 (today's HRV not landed) → scores the latest complete day,
	// Jun 18, whose labeled Google readiness was 77.
	got, err := Compute(ctx, database.DB, userID, "2026-06-19")
	if err != nil {
		t.Fatalf("Compute: %v", err)
	}
	if got.Value == nil {
		t.Fatal("expected a score, got nil (warm-up should be met with 10 HRV days)")
	}
	if got.Date != "2026-06-18" {
		t.Errorf("scored date = %s, want 2026-06-18 (the latest complete day)", got.Date)
	}
	const wantJun18 = 77
	if diff := abs(*got.Value - wantJun18); diff > 6 {
		t.Errorf("Jun 18 score = %d, want within ±6 of %d (diff %d)", *got.Value, wantJun18, diff)
	}
	if got.Band != "High" {
		t.Errorf("Jun 18 band = %q, want High", got.Band)
	}

	// Spot-check the crash day: as of Jun 15, score should reflect the HRV crash → Low.
	low, err := Compute(ctx, database.DB, userID, "2026-06-15")
	if err != nil {
		t.Fatalf("Compute Jun15: %v", err)
	}
	if low.Value == nil || *low.Value > 35 {
		t.Errorf("Jun 15 score = %v, want a low score (HRV crashed, labeled 15)", low.Value)
	}
}

// TestComputeWarmupGate returns no score before 7 HRV days exist.
func TestComputeWarmupGate(t *testing.T) {
	database := db.OpenTestDB(t)
	ctx := context.Background()
	userID := seedUser(t, database.DB)
	for _, d := range realDays[:4] { // only 3 HRV days (Jun 8 has none)
		seedDay(t, database.DB, userID, d)
	}
	got, err := Compute(ctx, database.DB, userID, "2026-06-19")
	if err != nil {
		t.Fatalf("Compute: %v", err)
	}
	if got.Value != nil {
		t.Errorf("expected nil score before warm-up, got %d", *got.Value)
	}
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func seedUser(t *testing.T, sdb *sql.DB) int64 {
	t.Helper()
	var id int64
	err := sdb.QueryRow(`
		INSERT INTO users (google_user_id, health_user_id, access_token, refresh_token, token_expiry, scopes)
		VALUES ($1, $2, '', '', now(), '') RETURNING id`,
		"g-readiness", "h-readiness").Scan(&id)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}
	return id
}

// seedDay inserts the HRV (with deepRMSSD in payload), RHR, and a sleep session
// with a DEEP+REM stage summary for one civil date.
func seedDay(t *testing.T, sdb *sql.DB, userID int64, d day) {
	t.Helper()
	date, _ := time.Parse("2006-01-02", d.date)

	// Daily rows get distinct sample_times so the (user,type,sample,start,end)
	// NULLS-NOT-DISTINCT unique index doesn't collide them.
	if d.deepRMSSD != nil {
		payload := `{"dailyHeartRateVariability":{"deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds":` +
			ftoa(*d.deepRMSSD) + `}}`
		mustExec(t, sdb, `
			INSERT INTO data_points (user_id, data_type, data_point_category, civil_start_date, sample_time, value_avg, payload_json, fetched_via)
			VALUES ($1, 'daily-heart-rate-variability', 'daily', $2, $3, $4, $5::jsonb, 'test')`,
			userID, date, date, *d.deepRMSSD, payload)
	}

	mustExec(t, sdb, `
		INSERT INTO data_points (user_id, data_type, data_point_category, civil_start_date, sample_time, value_avg, payload_json, fetched_via)
		VALUES ($1, 'daily-resting-heart-rate', 'daily', $2, $3, $4, '{}'::jsonb, 'test')`,
		userID, date, date, d.rhr)

	var sleepID int64
	err := sdb.QueryRow(`
		INSERT INTO data_points (user_id, data_type, data_point_category, civil_start_date, start_time, end_time, payload_json, fetched_via)
		VALUES ($1, 'sleep', 'session', $2, $3, $4, '{"sleep":{"summary":{"minutesAsleep":420}}}'::jsonb, 'test')
		RETURNING id`,
		userID, date, date.Add(-2*time.Hour), date.Add(6*time.Hour)).Scan(&sleepID)
	if err != nil {
		t.Fatalf("seed sleep: %v", err)
	}
	// Put all deep+rem minutes into DEEP for simplicity (the query sums DEEP+REM).
	mustExec(t, sdb, `
		INSERT INTO sleep_summary_stages (data_point_id, stage_type, minutes, count)
		VALUES ($1, 'DEEP', $2, 1)`, sleepID, int(d.deepRem))
}

func mustExec(t *testing.T, sdb *sql.DB, q string, args ...any) {
	t.Helper()
	if _, err := sdb.Exec(q, args...); err != nil {
		t.Fatalf("exec %q: %v", q, err)
	}
}

func ftoa(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}
