package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/vishal-android-freak/fitvibe/internal/api"
	"github.com/vishal-android-freak/fitvibe/internal/config"
	"github.com/vishal-android-freak/fitvibe/internal/cron"
	"github.com/vishal-android-freak/fitvibe/internal/db"
	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/oauth"
	"github.com/vishal-android-freak/fitvibe/internal/webhooks"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	database, err := db.Open(cfg, logger)
	if err != nil {
		logger.Error("failed to open database", "error", err)
		os.Exit(1)
	}
	defer database.Close()

	userRepo := repositories.NewUserRepo(database.DB)
	syncStateRepo := repositories.NewSyncStateRepo(database.DB)
	webhookNotificationRepo := repositories.NewWebhookNotificationRepo(database.DB)

	oauthService := oauth.NewService(cfg, userRepo)

	dataPointRepo := repositories.NewDataPointRepo(database.DB)
	rollupRepo := repositories.NewRollupDataPointRepo(database.DB)

	verifier := webhooks.NewVerifier(cfg.WebhookSignatureCacheTTL)
	webhookHandler := webhooks.NewHandler(cfg, verifier, webhookNotificationRepo, logger)
	webhookProcessor := webhooks.NewProcessor(oauthService, userRepo, webhookNotificationRepo, dataPointRepo, logger)

	subscriberManager := webhooks.NewSubscriberManager(cfg, func(ctx context.Context) (string, error) {
		return "", fmt.Errorf("subscriber management requires an authorized user token")
	})
	adminHandler := api.NewAdminHandler(oauthService, userRepo, subscriberManager)

	scheduler := cron.NewScheduler(cfg, logger)
	if err := scheduler.Register(cfg.CronListSync, cron.NewListSyncer(cfg, oauthService, userRepo, syncStateRepo, dataPointRepo, logger)); err != nil {
		logger.Error("failed to register list sync cron", "error", err)
		os.Exit(1)
	}
	if err := scheduler.Register(cfg.CronIntradayRollup, cron.NewRollupSyncer(cfg, oauthService, userRepo, syncStateRepo, rollupRepo, logger, false)); err != nil {
		logger.Error("failed to register intraday rollup cron", "error", err)
		os.Exit(1)
	}
	if err := scheduler.Register(cfg.CronDailyRollup, cron.NewRollupSyncer(cfg, oauthService, userRepo, syncStateRepo, rollupRepo, logger, true)); err != nil {
		logger.Error("failed to register daily rollup cron", "error", err)
		os.Exit(1)
	}
	if err := scheduler.Register(cfg.CronProfileSettingsSync, cron.NewProfileSettingsSyncer(oauthService, userRepo, logger)); err != nil {
		logger.Error("failed to register profile settings sync cron", "error", err)
		os.Exit(1)
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.Timeout(30 * time.Second))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	r.Post(cfg.WebhookPath, webhookHandler.ServeHTTP)

	adminHandler.Register(r)

	r.Post("/auth/exchange", func(w http.ResponseWriter, r *http.Request) {
		var req oauth.ExchangeRequest
		if err := decodeJSON(r, &req); err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}

		resp, err := oauthService.Exchange(r.Context(), req)
		if err != nil {
			logger.Error("auth exchange failed", "error", err)
			respondError(w, http.StatusInternalServerError, fmt.Sprintf("exchange failed: %v", err))
			return
		}

		// Trigger historical backfill in the background.
		bf := cron.NewBackfillJob(cfg, oauthService, userRepo, syncStateRepo, dataPointRepo, logger, resp.UserID)
		go func() {
			ctx := context.Background()
			if err := bf.Run(ctx); err != nil {
				logger.Error("backfill failed", "user_id", resp.UserID, "error", err)
			}
		}()

		respondJSON(w, http.StatusOK, resp)
	})

	addr := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)
	server := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	processorCtx, cancelProcessor := context.WithCancel(context.Background())
	defer cancelProcessor()
	go func() {
		logger.Info("starting webhook processor")
		webhookProcessor.Start(processorCtx, 30*time.Second)
	}()

	scheduler.Start()
	defer scheduler.Stop()

	go func() {
		logger.Info("server starting", "addr", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down server")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("server shutdown error", "error", err)
	}
}

func decodeJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

func respondJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func respondError(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, map[string]string{"error": msg})
}
