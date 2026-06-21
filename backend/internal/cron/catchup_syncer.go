package cron

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/config"
	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/healthapi"
	"github.com/vishal-android-freak/fitvibe/internal/oauth"
)

// WebhookListDataTypes are the webhook-supported data types that also support
// :list. These arrive in real time via webhooks; the catch-up syncer re-lists
// them on a schedule so any notification missed while the backend was offline
// is recovered. Used both here and by the initial backfill on signup.
//
// Excludes types that only support rollup/dailyRollup (no list) and
// activity-level (filter field path not documented/supported yet).
var WebhookListDataTypes = []string{
	"active-zone-minutes", "altitude", "blood-glucose", "body-fat",
	"daily-heart-rate-variability", "daily-heart-rate-zones",
	"daily-oxygen-saturation", "daily-respiratory-rate", "daily-resting-heart-rate",
	"daily-sleep-temperature-derivations", "distance", "exercise", "heart-rate",
	"heart-rate-variability", "height", "hydration-log", "nutrition-log",
	"respiratory-rate-sleep-summary", "run-vo2-max", "sedentary-period", "sleep", "steps",
	"time-in-heart-rate-zone", "weight",
}

// CatchupSyncer re-lists webhook-supported data types over a recent lookback
// window to recover any webhook notifications missed during downtime. It runs
// on its own sync_state source ("catchup") and overlaps the previous window by
// the configured lookback; the data_points unique index dedupes re-fetched
// points, so overlap is harmless and guarantees no boundary gaps.
type CatchupSyncer struct {
	cfg           *config.Config
	oauthService  *oauth.Service
	userRepo      *repositories.UserRepo
	syncStateRepo *repositories.SyncStateRepo
	dataPointRepo *repositories.DataPointRepo
	logger        *slog.Logger
}

// NewCatchupSyncer creates a new catch-up syncer.
func NewCatchupSyncer(
	cfg *config.Config,
	oauthService *oauth.Service,
	userRepo *repositories.UserRepo,
	syncStateRepo *repositories.SyncStateRepo,
	dataPointRepo *repositories.DataPointRepo,
	logger *slog.Logger,
) *CatchupSyncer {
	return &CatchupSyncer{
		cfg:           cfg,
		oauthService:  oauthService,
		userRepo:      userRepo,
		syncStateRepo: syncStateRepo,
		dataPointRepo: dataPointRepo,
		logger:        logger,
	}
}

// Name returns the job name.
func (s *CatchupSyncer) Name() string { return "webhook-catchup-sync" }

// Run re-lists webhook-supported data types for all users.
func (s *CatchupSyncer) Run(ctx context.Context) error {
	users, err := s.userRepo.List(ctx)
	if err != nil {
		return err
	}

	for _, user := range users {
		client := healthapi.NewClient(s.oauthService.TokenProvider(user.ID))
		for _, dataType := range WebhookListDataTypes {
			if err := s.syncDataType(ctx, client, user, dataType); err != nil {
				s.logger.Error("catchup sync data type failed",
					"user_id", user.ID,
					"data_type", dataType,
					"error", err)
			}
		}
	}
	return nil
}

func (s *CatchupSyncer) syncDataType(ctx context.Context, client *healthapi.Client, user *repositories.User, dataType string) error {
	state, err := s.syncStateRepo.Get(ctx, user.ID, dataType, "catchup")
	if err != nil {
		return fmt.Errorf("get sync state: %w", err)
	}

	start, end := s.syncWindow(state)

	err = paginateAndStore(ctx, s.dataPointRepo, user.ID, dataType, "cron_catchup", func(pageToken string) (page, error) {
		resp, err := client.ListDataPoints(ctx, &healthapi.ListDataPointsRequest{
			DataType:  dataType,
			StartTime: start,
			EndTime:   end,
			PageToken: pageToken,
			PageSize:  100,
		})
		if err != nil {
			return page{}, fmt.Errorf("list data points: %w", err)
		}
		return page{points: resp.DataPoints, next: resp.NextPageToken}, nil
	})
	if err != nil {
		return err
	}

	rec := &repositories.SyncStateRecord{
		UserID:        user.ID,
		DataType:      dataType,
		Source:        "catchup",
		LastStartTime: sql.NullTime{Time: start, Valid: !start.IsZero()},
		LastEndTime:   sql.NullTime{Time: end, Valid: !end.IsZero()},
	}
	if state != nil {
		rec.ID = state.ID
	}
	return s.syncStateRepo.Upsert(ctx, rec)
}

// syncWindow returns the catch-up window: from the configured lookback before
// now (default 48h) up to now. Using a fixed lookback every run — rather than
// strictly resuming from last_end_time — is what recovers webhooks missed
// during a multi-hour or multi-day outage. On a brand-new sync_state row it
// uses the full backfill window.
func (s *CatchupSyncer) syncWindow(state *repositories.SyncStateRecord) (time.Time, time.Time) {
	end := time.Now().UTC()
	lookback := time.Duration(s.cfg.CatchupLookbackHours) * time.Hour

	if state == nil || !state.LastEndTime.Valid {
		return end.Add(-time.Duration(s.cfg.DefaultBackfillDays) * 24 * time.Hour), end
	}
	return end.Add(-lookback), end
}
