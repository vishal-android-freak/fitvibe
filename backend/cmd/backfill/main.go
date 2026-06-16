// Command backfill re-parses every already-stored payload_json blob through the
// current ingestion logic, recomputing extracted scalar fields and populating
// the normalized child tables and health_data_records.
//
// It re-fetches NOTHING from Google: the raw API responses are already in
// data_points.payload_json / rollup_data_points.payload_json. Re-parsing is
// idempotent — each record keeps its original time coordinates, so the upsert
// on the unique index overwrites the row in place and child rows are
// cleared-and-reinserted. Running it repeatedly converges to the same state
// with no duplicates.
//
// Usage:
//
//	go run ./cmd/backfill            # re-parse data points and rollups
//	go run ./cmd/backfill -dry-run   # report counts without writing
package main

import (
	"context"
	"database/sql"
	"flag"
	"log/slog"
	"os"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/config"
	"github.com/vishal-android-freak/fitvibe/internal/cron"
	"github.com/vishal-android-freak/fitvibe/internal/db"
	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/ingestion"
)

func main() {
	dryRun := flag.Bool("dry-run", false, "report what would change without writing")
	batchSize := flag.Int("batch", 500, "number of records per write transaction")
	flag.Parse()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config", "error", err)
		os.Exit(1)
	}

	database, err := db.Open(cfg, logger)
	if err != nil {
		logger.Error("open database", "error", err)
		os.Exit(1)
	}
	defer database.Close()

	ctx := context.Background()
	dpRepo := repositories.NewDataPointRepo(database.DB)
	rollupRepo := repositories.NewRollupDataPointRepo(database.DB)

	start := time.Now()

	if err := reparseDataPoints(ctx, logger, dpRepo, *batchSize, *dryRun); err != nil {
		logger.Error("reparse data points failed", "error", err)
		os.Exit(1)
	}

	if err := reparseRollups(ctx, logger, rollupRepo, *batchSize, *dryRun); err != nil {
		logger.Error("reparse rollups failed", "error", err)
		os.Exit(1)
	}

	logger.Info("backfill complete", "elapsed", time.Since(start).String(), "dry_run", *dryRun)
}

func reparseDataPoints(ctx context.Context, logger *slog.Logger, repo *repositories.DataPointRepo, batchSize int, dryRun bool) error {
	total, err := repo.Count(ctx)
	if err != nil {
		return err
	}
	logger.Info("reparsing data points", "total", total)

	var (
		processed int64
		failed    int64
		batch     []*repositories.DataPointRecord
	)

	flush := func() error {
		if len(batch) == 0 || dryRun {
			batch = batch[:0]
			return nil
		}
		if err := repo.InsertMany(ctx, batch); err != nil {
			return err
		}
		batch = batch[:0]
		return nil
	}

	err = repo.IterateRaw(ctx, func(rp *repositories.RawDataPoint) error {
		fetchedVia := rp.FetchedVia
		if fetchedVia == "" {
			fetchedVia = "backfill"
		}
		rec, err := ingestion.RemapPayload(rp.UserID, rp.DataType, fetchedVia, rp.PayloadJSON, rp.WebhookNotificationID)
		if err != nil {
			failed++
			logger.Warn("reparse data point failed", "id", rp.ID, "data_type", rp.DataType, "error", err)
			return nil // skip, keep going
		}
		batch = append(batch, rec)
		processed++

		if len(batch) >= batchSize {
			if err := flush(); err != nil {
				return err
			}
			logger.Info("data points progress", "processed", processed, "total", total)
		}
		return nil
	})
	if err != nil {
		return err
	}
	if err := flush(); err != nil {
		return err
	}

	logger.Info("data points reparsed", "processed", processed, "failed", failed)
	return nil
}

func reparseRollups(ctx context.Context, logger *slog.Logger, repo *repositories.RollupDataPointRepo, batchSize int, dryRun bool) error {
	var (
		processed int64
		failed    int64
		batch     []*repositories.RollupDataPointRecord
	)

	flush := func() error {
		if len(batch) == 0 || dryRun {
			batch = batch[:0]
			return nil
		}
		if err := repo.InsertMany(ctx, batch); err != nil {
			return err
		}
		batch = batch[:0]
		return nil
	}

	err := repo.IterateRaw(ctx, func(rr *repositories.RawRollup) error {
		ws := ""
		if rr.WindowSize.Valid {
			ws = rr.WindowSize.String
		}
		rec, err := cron.RemapRollupPayload(rr.UserID, rr.DataType, rr.RollupKind, ws, rr.PayloadJSON)
		if err != nil {
			failed++
			logger.Warn("reparse rollup failed", "id", rr.ID, "data_type", rr.DataType, "error", err)
			return nil
		}
		rec.WindowSize = sql.NullString{String: ws, Valid: ws != ""}
		batch = append(batch, rec)
		processed++

		if len(batch) >= batchSize {
			if err := flush(); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	if err := flush(); err != nil {
		return err
	}

	logger.Info("rollups reparsed", "processed", processed, "failed", failed)
	return nil
}
