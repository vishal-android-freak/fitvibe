// Command fetchbackfill triggers the historical fetching backfill for a user —
// the same BackfillJob that normally runs in-process after an OAuth exchange.
// Unlike cmd/backfill (which only re-parses stored payloads), this re-fetches
// every ingested data type from the Google Health API. By default it covers the
// last DEFAULT_BACKFILL_DAYS; narrow the window with -today or -since to pull
// just recent data (and avoid re-fetching weeks of high-volume heart-rate).
//
// Safe to run while the server is running — Postgres handles the concurrent
// writers (no single-writer lock).
//
// Usage:
//
//	go run ./cmd/fetchbackfill -user 1            # last DEFAULT_BACKFILL_DAYS
//	go run ./cmd/fetchbackfill -user 1 -today     # just today (local civil day)
//	go run ./cmd/fetchbackfill -user 1 -since 48h # last 48 hours
//	go run ./cmd/fetchbackfill -user 1 -since 2026-06-15  # since a date
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/config"
	"github.com/vishal-android-freak/fitvibe/internal/cron"
	"github.com/vishal-android-freak/fitvibe/internal/db"
	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/oauth"
)

func main() {
	userID := flag.Int64("user", 1, "user id to backfill")
	today := flag.Bool("today", false, "backfill only today (from local midnight)")
	since := flag.String("since", "", "backfill since a Go duration (e.g. 48h) or a date (YYYY-MM-DD); overrides the default window")
	flag.Parse()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config", "error", err)
		os.Exit(1)
	}

	start, err := resolveStart(*today, *since)
	if err != nil {
		logger.Error("invalid window", "error", err)
		os.Exit(1)
	}

	database, err := db.Open(cfg, logger)
	if err != nil {
		logger.Error("open database", "error", err)
		os.Exit(1)
	}
	defer database.Close()

	userRepo := repositories.NewUserRepo(database.DB)
	syncStateRepo := repositories.NewSyncStateRepo(database.DB)
	dataPointRepo := repositories.NewDataPointRepo(database.DB)
	oauthService := oauth.NewService(cfg, userRepo)

	job := cron.NewBackfillJob(cfg, oauthService, userRepo, syncStateRepo, dataPointRepo, logger, *userID)
	if !start.IsZero() {
		job.WithStart(start)
		logger.Info("starting fetch backfill", "user_id", *userID, "since", start.Format(time.RFC3339))
	} else {
		logger.Info("starting fetch backfill", "user_id", *userID, "days", cfg.DefaultBackfillDays)
	}

	if err := job.Run(context.Background()); err != nil {
		logger.Error("backfill failed", "error", err)
		os.Exit(1)
	}
	logger.Info("backfill complete", "user_id", *userID)
}

// resolveStart turns the -today / -since flags into a window start (UTC). A zero
// time means "use the default DEFAULT_BACKFILL_DAYS window".
func resolveStart(today bool, since string) (time.Time, error) {
	if today {
		// Local midnight today, in UTC. Start a touch earlier so the full local
		// civil day is captured regardless of timezone offset handling downstream.
		now := time.Now()
		midnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		return midnight.UTC(), nil
	}
	if since == "" {
		return time.Time{}, nil
	}
	// Try a Go duration first (e.g. "48h", "30m").
	if d, err := time.ParseDuration(since); err == nil {
		return time.Now().UTC().Add(-d), nil
	}
	// Then a date (YYYY-MM-DD).
	if t, err := time.ParseInLocation("2006-01-02", since, time.Local); err == nil {
		return t.UTC(), nil
	}
	return time.Time{}, fmt.Errorf("-since %q is neither a duration (e.g. 48h) nor a date (YYYY-MM-DD)", since)
}
