package repositories

import (
	"context"
	"database/sql"
	"testing"
	"time"
)

// TestRecentNights seeds a sleep session (with a stage summary) plus a couple of
// per-night vital data points keyed on the night's civil date, and asserts
// RecentNights joins them onto the night. Skips without a test Postgres.
func TestRecentNights(t *testing.T) {
	database := newTestDB(t)
	repo := NewSleepRepo(database.DB)
	dpRepo := NewDataPointRepo(database.DB)
	ctx := context.Background()
	userID := seedUser(t, database.DB, "hu-recent-nights")

	// A sleep night ending on civil date 2026-06-17 (local +05:30).
	const offset = 19800 // +05:30
	start := time.Date(2026, 6, 16, 22, 0, 0, 0, time.UTC)
	end := time.Date(2026, 6, 17, 6, 0, 0, 0, time.UTC)
	civil := time.Date(2026, 6, 17, 0, 0, 0, 0, time.UTC)

	night := &DataPointRecord{
		UserID:                userID,
		DataType:              "sleep",
		DataPointCategory:     "session",
		StartTime:             sql.NullTime{Time: start, Valid: true},
		EndTime:               sql.NullTime{Time: end, Valid: true},
		CivilEndDate:          sql.NullTime{Time: civil, Valid: true},
		StartUTCOffsetSeconds: sql.NullInt32{Int32: offset, Valid: true},
		PayloadJSON:           `{"sleep":{}}`,
		FetchedVia:            "test",
	}
	night.Children.SleepSummary = []SleepSummaryStageRow{
		{StageType: "DEEP", Minutes: sql.NullInt32{Int32: 90, Valid: true}, Count: sql.NullInt32{Int32: 3, Valid: true}},
		{StageType: "REM", Minutes: sql.NullInt32{Int32: 80, Valid: true}, Count: sql.NullInt32{Int32: 4, Valid: true}},
		{StageType: "LIGHT", Minutes: sql.NullInt32{Int32: 200, Valid: true}, Count: sql.NullInt32{Int32: 5, Valid: true}},
		{StageType: "AWAKE", Minutes: sql.NullInt32{Int32: 30, Valid: true}, Count: sql.NullInt32{Int32: 2, Valid: true}},
	}

	// Per-night vitals, keyed by civil_start_date = the night's civil date.
	vital := func(dataType string, avg float64) *DataPointRecord {
		return &DataPointRecord{
			UserID:            userID,
			DataType:          dataType,
			DataPointCategory: "daily",
			CivilStartDate:    sql.NullTime{Time: civil, Valid: true},
			ValueAvg:          sql.NullFloat64{Float64: avg, Valid: true},
			PayloadJSON:       `{}`,
			FetchedVia:        "test",
		}
	}
	skinTemp := &DataPointRecord{
		UserID:            userID,
		DataType:          "daily-sleep-temperature-derivations",
		DataPointCategory: "daily",
		CivilStartDate:    sql.NullTime{Time: civil, Valid: true},
		PayloadJSON:       `{"dailySleepTemperatureDerivations":{"nightlyTemperatureCelsius":36.2,"baselineTemperatureCelsius":36.5}}`,
		FetchedVia:        "test",
	}

	recs := []*DataPointRecord{
		night,
		vital("daily-resting-heart-rate", 54),
		vital("daily-heart-rate-variability", 42),
		vital("daily-oxygen-saturation", 97),
		vital("respiratory-rate-sleep-summary", 14.5),
		skinTemp,
	}
	if err := dpRepo.InsertMany(ctx, recs); err != nil {
		t.Fatalf("seed data points: %v", err)
	}

	nights, err := repo.RecentNights(ctx, userID, 14)
	if err != nil {
		t.Fatalf("recent nights: %v", err)
	}
	if len(nights) != 1 {
		t.Fatalf("expected 1 night, got %d", len(nights))
	}
	n := nights[0]

	if n.CivilDate != "2026-06-17" {
		t.Errorf("civil date: want 2026-06-17, got %s", n.CivilDate)
	}
	if n.OffsetSeconds != offset {
		t.Errorf("offset: want %d, got %d", offset, n.OffsetSeconds)
	}
	if n.AsleepMinutes != 90+80+200 {
		t.Errorf("asleep minutes: want 370, got %d", n.AsleepMinutes)
	}
	if len(n.Summary) != 4 {
		t.Errorf("expected 4 stage summary rows, got %d", len(n.Summary))
	}

	if !n.RestingHeartRate.Valid || n.RestingHeartRate.Float64 != 54 {
		t.Errorf("rhr: want 54, got %+v", n.RestingHeartRate)
	}
	if !n.HRV.Valid || n.HRV.Float64 != 42 {
		t.Errorf("hrv: want 42, got %+v", n.HRV)
	}
	if !n.SpO2.Valid || n.SpO2.Float64 != 97 {
		t.Errorf("spo2: want 97, got %+v", n.SpO2)
	}
	if !n.RespiratoryRate.Valid || n.RespiratoryRate.Float64 != 14.5 {
		t.Errorf("respiratory rate: want 14.5, got %+v", n.RespiratoryRate)
	}
	if !n.SkinTempDelta.Valid {
		t.Fatalf("skin temp delta: expected a value, got NULL")
	}
	if d := n.SkinTempDelta.Float64; d < -0.31 || d > -0.29 {
		t.Errorf("skin temp delta: want ~-0.3, got %v", d)
	}
}
