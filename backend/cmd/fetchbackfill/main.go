// Command fetchbackfill triggers the historical fetching backfill for a user —
// the same BackfillJob that normally runs in-process after an OAuth exchange.
// Unlike cmd/backfill (which only re-parses stored payloads), this re-fetches
// WebhookListDataTypes from the Google Health API over DEFAULT_BACKFILL_DAYS.
//
// The server must NOT be running (it holds the SQLite lock).
//
// Usage:
//
//	go run ./cmd/fetchbackfill -user 1
package main

import (
	"context"
	"flag"
	"log/slog"
	"os"

	"github.com/vishal-android-freak/fitvibe/internal/config"
	"github.com/vishal-android-freak/fitvibe/internal/cron"
	"github.com/vishal-android-freak/fitvibe/internal/db"
	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/oauth"
)

func main() {
	userID := flag.Int64("user", 1, "user id to backfill")
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

	userRepo := repositories.NewUserRepo(database.DB)
	syncStateRepo := repositories.NewSyncStateRepo(database.DB)
	dataPointRepo := repositories.NewDataPointRepo(database.DB)
	oauthService := oauth.NewService(cfg, userRepo)

	job := cron.NewBackfillJob(cfg, oauthService, userRepo, syncStateRepo, dataPointRepo, logger, *userID)

	logger.Info("starting fetch backfill", "user_id", *userID, "days", cfg.DefaultBackfillDays)
	if err := job.Run(context.Background()); err != nil {
		logger.Error("backfill failed", "error", err)
		os.Exit(1)
	}
	logger.Info("backfill complete", "user_id", *userID)
}
