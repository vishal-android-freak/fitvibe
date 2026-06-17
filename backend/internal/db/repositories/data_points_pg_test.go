package repositories

import (
	"context"
	"database/sql"
	"testing"
	"time"
)

// seedUser inserts a minimal user row and returns its id, for FK-satisfying tests.
func seedUser(t *testing.T, db *sql.DB, healthUserID string) int64 {
	t.Helper()
	var id int64
	err := db.QueryRowContext(context.Background(), `
		INSERT INTO users (health_user_id, access_token, refresh_token, token_expiry, scopes)
		VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		healthUserID, []byte("a"), []byte("r"), time.Now().UTC().Add(time.Hour), "scope").Scan(&id)
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}
	return id
}

// TestUpsertDedup is the highest-risk behavior of the Postgres migration: the
// NULLS NOT DISTINCT unique index + ON CONFLICT must collapse two ingests of the
// same logical data point into ONE row (keeping a stable id), and re-clear +
// re-insert its child rows — not duplicate them.
func TestUpsertDedup(t *testing.T) {
	database := newTestDB(t)
	repo := NewDataPointRepo(database.DB)
	ctx := context.Background()
	userID := seedUser(t, database.DB, "hu-dedup")

	start := time.Date(2026, 6, 17, 23, 10, 0, 0, time.UTC)
	end := time.Date(2026, 6, 18, 6, 40, 0, 0, time.UTC)
	mk := func(stage string) *DataPointRecord {
		rec := &DataPointRecord{
			UserID:            userID,
			DataType:          "sleep",
			DataPointCategory: "session",
			StartTime:         sql.NullTime{Time: start, Valid: true},
			EndTime:           sql.NullTime{Time: end, Valid: true},
			PayloadJSON:       `{"sleep":{}}`,
			FetchedVia:        "test",
		}
		rec.Children.SleepStages = []SleepStageRow{
			{StartTime: start, EndTime: end, StageType: stage},
		}
		return rec
	}

	// Ingest twice with the SAME time coordinates (overlapping fetch windows).
	if err := repo.InsertMany(ctx, []*DataPointRecord{mk("DEEP")}); err != nil {
		t.Fatalf("first insert: %v", err)
	}
	var firstID int64
	if err := database.DB.QueryRowContext(ctx, `SELECT id FROM data_points WHERE user_id=$1 AND data_type='sleep'`, userID).Scan(&firstID); err != nil {
		t.Fatalf("read first id: %v", err)
	}

	if err := repo.InsertMany(ctx, []*DataPointRecord{mk("LIGHT")}); err != nil {
		t.Fatalf("second insert: %v", err)
	}

	// Exactly one parent row, same id (stable across re-ingest).
	var count, secondID int64
	if err := database.DB.QueryRowContext(ctx, `SELECT count(*), max(id) FROM data_points WHERE user_id=$1 AND data_type='sleep'`, userID).Scan(&count, &secondID); err != nil {
		t.Fatalf("count parents: %v", err)
	}
	if count != 1 {
		t.Errorf("expected 1 data_points row after re-ingest, got %d", count)
	}
	if secondID != firstID {
		t.Errorf("data point id changed across re-ingest: %d -> %d (child FKs would break)", firstID, secondID)
	}

	// Children re-cleared + re-inserted, not duplicated; reflects the latest payload.
	var childCount int64
	var stage string
	if err := database.DB.QueryRowContext(ctx, `SELECT count(*), max(stage_type) FROM sleep_stages WHERE data_point_id=$1`, firstID).Scan(&childCount, &stage); err != nil {
		t.Fatalf("count children: %v", err)
	}
	if childCount != 1 {
		t.Errorf("expected 1 sleep_stage after re-ingest, got %d (duplicated children)", childCount)
	}
	if stage != "LIGHT" {
		t.Errorf("expected child to reflect latest ingest (LIGHT), got %s", stage)
	}
}

// TestUpsertDedupNullTimes verifies NULLS NOT DISTINCT: two points with a NULL
// start_time but identical (user, type, sample_time) collapse to one row —
// the behavior SQLite got via COALESCE(col,'').
func TestUpsertDedupNullTimes(t *testing.T) {
	database := newTestDB(t)
	repo := NewDataPointRepo(database.DB)
	ctx := context.Background()
	userID := seedUser(t, database.DB, "hu-null")

	sample := time.Date(2026, 6, 17, 14, 52, 0, 0, time.UTC)
	mk := func() *DataPointRecord {
		return &DataPointRecord{
			UserID:            userID,
			DataType:          "heart-rate",
			DataPointCategory: "sample",
			SampleTime:        sql.NullTime{Time: sample, Valid: true},
			// StartTime / EndTime deliberately NULL
			ValueAvg:    sql.NullFloat64{Float64: 77, Valid: true},
			PayloadJSON: `{"heartRate":{}}`,
			FetchedVia:  "test",
		}
	}
	if err := repo.InsertMany(ctx, []*DataPointRecord{mk(), mk()}); err != nil {
		t.Fatalf("insert: %v", err)
	}
	var count int64
	if err := database.DB.QueryRowContext(ctx, `SELECT count(*) FROM data_points WHERE user_id=$1 AND data_type='heart-rate'`, userID).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Errorf("NULLS NOT DISTINCT failed: expected 1 row for same (user,type,sample_time) with NULL start/end, got %d", count)
	}
}
