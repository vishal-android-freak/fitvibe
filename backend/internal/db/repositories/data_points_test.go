package repositories

import (
	"context"
	"database/sql"
	"testing"
	"time"
)

func TestInsertManyAndGetLatestValue(t *testing.T) {
	database := newTestDB(t)
	userRepo := NewUserRepo(database.DB)
	repo := NewDataPointRepo(database.DB)
	ctx := context.Background()

	u, err := userRepo.StoreTokens(ctx, "google-1", "health-1", "user@example.com", "", "", "", 0, 0, "access", "refresh", time.Now().Add(time.Hour), "scopes")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	recs := []*DataPointRecord{
		{
			UserID:      u.ID,
			DataType:    "heart-rate",
			SampleTime:  sql.NullTime{Time: time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC), Valid: true},
			ValueAvg:    sql.NullFloat64{Float64: 70, Valid: true},
			PayloadJSON: `{"heartRate":{"beatsPerMinute":"70"}}`,
			FetchedVia:  "test",
		},
		{
			UserID:      u.ID,
			DataType:    "heart-rate",
			SampleTime:  sql.NullTime{Time: time.Date(2026, 6, 15, 11, 0, 0, 0, time.UTC), Valid: true},
			ValueAvg:    sql.NullFloat64{Float64: 75, Valid: true},
			PayloadJSON: `{"heartRate":{"beatsPerMinute":"75"}}`,
			FetchedVia:  "test",
		},
	}

	if err := repo.InsertMany(ctx, recs); err != nil {
		t.Fatalf("insert many: %v", err)
	}

	val, err := repo.GetLatestValue(ctx, u.ID, "heart-rate")
	if err != nil {
		t.Fatalf("get latest value: %v", err)
	}
	if val != 75 {
		t.Errorf("latest value = %v, want 75", val)
	}
}

func TestInsertManyUpsert(t *testing.T) {
	database := newTestDB(t)
	userRepo := NewUserRepo(database.DB)
	repo := NewDataPointRepo(database.DB)
	ctx := context.Background()

	u, err := userRepo.StoreTokens(ctx, "google-2", "health-2", "user2@example.com", "", "", "", 0, 0, "access", "refresh", time.Now().Add(time.Hour), "scopes")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	rec := &DataPointRecord{
		UserID:      u.ID,
		DataType:    "active-energy-burned",
		StartTime:   sql.NullTime{Time: time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC), Valid: true},
		EndTime:     sql.NullTime{Time: time.Date(2026, 6, 15, 10, 1, 0, 0, time.UTC), Valid: true},
		ValueSum:    sql.NullFloat64{Float64: 100, Valid: true},
		PayloadJSON: `{"activeEnergyBurned":{"kcal":100}}`,
		FetchedVia:  "test",
	}

	if err := repo.InsertMany(ctx, []*DataPointRecord{rec}); err != nil {
		t.Fatalf("first insert: %v", err)
	}

	rec.ValueSum = sql.NullFloat64{Float64: 200, Valid: true}
	rec.PayloadJSON = `{"activeEnergyBurned":{"kcal":200}}`
	if err := repo.InsertMany(ctx, []*DataPointRecord{rec}); err != nil {
		t.Fatalf("second insert: %v", err)
	}

	val, err := repo.GetLatestValue(ctx, u.ID, "active-energy-burned")
	if err != nil {
		t.Fatalf("get latest: %v", err)
	}
	if val != 200 {
		t.Errorf("upserted value = %v, want 200", val)
	}
}
