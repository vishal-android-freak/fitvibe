package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
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
	"github.com/vishal-android-freak/fitvibe/internal/sleep"
	"github.com/vishal-android-freak/fitvibe/internal/today"
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
	authBroker := oauth.NewBroker(10 * time.Minute)

	dataPointRepo := repositories.NewDataPointRepo(database.DB)
	rollupRepo := repositories.NewRollupDataPointRepo(database.DB)
	sleepRepo := repositories.NewSleepRepo(database.DB)
	sleepHandler := sleep.NewHandler(sleepRepo, userRepo)
	todayRepo := repositories.NewTodayRepo(database.DB)
	todayHandler := today.NewHandler(todayRepo, database.DB)

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
	if err := scheduler.Register(cfg.CronReconcileSync, cron.NewReconcileSyncer(cfg, oauthService, userRepo, syncStateRepo, dataPointRepo, logger)); err != nil {
		logger.Error("failed to register reconcile sync cron", "error", err)
		os.Exit(1)
	}
	if err := scheduler.Register(cfg.CronCatchupSync, cron.NewCatchupSyncer(cfg, oauthService, userRepo, syncStateRepo, dataPointRepo, logger)); err != nil {
		logger.Error("failed to register webhook catchup sync cron", "error", err)
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
	sleepHandler.Register(r)
	todayHandler.Register(r)

	// startBackfill kicks off the historical backfill for a freshly exchanged
	// user in the background. Shared by the direct exchange and the brokered flow.
	startBackfill := func(userID int64) {
		bf := cron.NewBackfillJob(cfg, oauthService, userRepo, syncStateRepo, dataPointRepo, logger, userID)
		go func() {
			ctx := context.Background()
			if err := bf.Run(ctx); err != nil {
				logger.Error("backfill failed", "user_id", userID, "error", err)
			}
		}()
	}

	// Direct exchange: the app obtained the code itself and posts it here.
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

		startBackfill(resp.UserID)
		respondJSON(w, http.StatusOK, resp)
	})

	// Brokered flow — the backend is the OAuth redirect target:
	//   app → GET /auth/start → Google → GET /auth/callback → app deep link
	//       → GET /auth/session (redeem one-time token for identity)

	// /auth/start?redirect=fitvibe://oauthredirect
	// Records the app's deep link, then redirects the browser to Google consent
	// (using the backend's own GOOGLE_REDIRECT_URI as the OAuth redirect_uri).
	r.Get("/auth/start", func(w http.ResponseWriter, r *http.Request) {
		appRedirect := r.URL.Query().Get("redirect")
		if !isAllowedAppRedirect(appRedirect) {
			respondError(w, http.StatusBadRequest, "invalid or missing redirect")
			return
		}
		state, err := authBroker.StartAuth(appRedirect)
		if err != nil {
			logger.Error("auth start failed", "error", err)
			respondError(w, http.StatusInternalServerError, "failed to start auth")
			return
		}
		http.Redirect(w, r, oauthService.AuthURL(state), http.StatusFound)
	})

	// /auth/callback?code=&state=  — Google redirects here.
	// Exchanges the code, parks the result behind a one-time token, and deep-links
	// the browser back to the app.
	r.Get("/auth/callback", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		appRedirect, ok := authBroker.ResolveState(q.Get("state"))
		if !ok {
			respondError(w, http.StatusBadRequest, "unknown or expired state")
			return
		}
		// Deep-link back to the app with the given params. The state was already
		// validated above, so the app doesn't need it echoed back.
		redirectApp := func(params url.Values) {
			http.Redirect(w, r, appRedirect+"?"+params.Encode(), http.StatusFound)
		}
		fail := func(code string) { redirectApp(url.Values{"error": {code}}) }

		if oauthErr := q.Get("error"); oauthErr != "" {
			fail(oauthErr)
			return
		}
		code := q.Get("code")
		if code == "" {
			fail("missing_code")
			return
		}

		resp, err := oauthService.Exchange(r.Context(), oauth.ExchangeRequest{Code: code, RedirectURI: cfg.GoogleRedirectURI})
		if err != nil {
			logger.Error("brokered exchange failed", "error", err)
			fail("exchange_failed")
			return
		}

		token, err := authBroker.StashSession(resp)
		if err != nil {
			logger.Error("stash session failed", "error", err)
			fail("server_error")
			return
		}

		startBackfill(resp.UserID)
		redirectApp(url.Values{"token": {token}})
	})

	// /auth/session?token=  — the app redeems the one-time token for its identity.
	r.Get("/auth/session", func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		resp, ok := authBroker.RedeemSession(token)
		if !ok {
			respondError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}
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

// isAllowedAppRedirect guards the brokered flow against open-redirect abuse:
// the backend will only deep-link back into the FitVibe app's own scheme.
func isAllowedAppRedirect(redirect string) bool {
	return strings.HasPrefix(redirect, "fitvibe://")
}
