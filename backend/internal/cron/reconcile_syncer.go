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

// ReconcileDataTypes are data types that support reconcile but not list, or
// where a merged stream is preferred over raw source data.
var ReconcileDataTypes = []string{
	"floors",
}

// ReconcileSyncer polls reconciled data for data types that don't support list.
type ReconcileSyncer struct {
	cfg           *config.Config
	oauthService  *oauth.Service
	userRepo      *repositories.UserRepo
	syncStateRepo *repositories.SyncStateRepo
	dataPointRepo *repositories.DataPointRepo
	logger        *slog.Logger
}

// NewReconcileSyncer creates a new reconcile syncer.
func NewReconcileSyncer(
	cfg *config.Config,
	oauthService *oauth.Service,
	userRepo *repositories.UserRepo,
	syncStateRepo *repositories.SyncStateRepo,
	dataPointRepo *repositories.DataPointRepo,
	logger *slog.Logger,
) *ReconcileSyncer {
	return &ReconcileSyncer{
		cfg:           cfg,
		oauthService:  oauthService,
		userRepo:      userRepo,
		syncStateRepo: syncStateRepo,
		dataPointRepo: dataPointRepo,
		logger:        logger,
	}
}

// Name returns the job name.
func (s *ReconcileSyncer) Name() string {
	return "cron-reconcile-sync"
}

// Run syncs all reconcile-only data types for all users.
func (s *ReconcileSyncer) Run(ctx context.Context) error {
	users, err := s.listUsers(ctx)
	if err != nil {
		return err
	}

	for _, user := range users {
		for _, dataType := range ReconcileDataTypes {
			if err := s.syncDataType(ctx, user, dataType); err != nil {
				s.logger.Error("reconcile sync data type failed",
					"user_id", user.ID,
					"data_type", dataType,
					"error", err)
			}
		}
	}
	return nil
}

func (s *ReconcileSyncer) syncDataType(ctx context.Context, user *repositories.User, dataType string) error {
	state, err := s.syncStateRepo.Get(ctx, user.ID, dataType, "reconcile")
	if err != nil {
		return fmt.Errorf("get sync state: %w", err)
	}

	start, end := s.syncWindow(state)
	client := healthapi.NewClient(s.oauthService.TokenProvider(user.ID))

	err = paginateAndStore(ctx, s.dataPointRepo, user.ID, dataType, "cron_reconcile", func(pageToken string) (page, error) {
		resp, err := client.ReconcileDataPoints(ctx, &healthapi.ReconcileDataPointsRequest{
			DataType:  dataType,
			StartTime: start,
			EndTime:   end,
			PageToken: pageToken,
			PageSize:  100,
		})
		if err != nil {
			return page{}, fmt.Errorf("reconcile data points: %w", err)
		}
		return page{points: resp.DataPoints, next: resp.NextPageToken}, nil
	})
	if err != nil {
		return err
	}

	if err := s.updateSyncState(ctx, state, user.ID, dataType, start, end, ""); err != nil {
		return fmt.Errorf("update sync state: %w", err)
	}
	return nil
}

func (s *ReconcileSyncer) syncWindow(state *repositories.SyncStateRecord) (time.Time, time.Time) {
	end := time.Now().UTC()
	var start time.Time

	if state == nil || !state.LastEndTime.Valid {
		start = end.Add(-time.Duration(s.cfg.DefaultBackfillDays) * 24 * time.Hour)
	} else {
		start = state.LastEndTime.Time
	}

	return start, end
}

func (s *ReconcileSyncer) updateSyncState(ctx context.Context, state *repositories.SyncStateRecord, userID int64, dataType string, start, end time.Time, cursor string) error {
	rec := &repositories.SyncStateRecord{
		UserID:   userID,
		DataType: dataType,
		Source:   "reconcile",
	}
	if state != nil {
		rec.ID = state.ID
	}

	rec.LastStartTime = sql.NullTime{Time: start, Valid: !start.IsZero()}
	rec.LastEndTime = sql.NullTime{Time: end, Valid: !end.IsZero()}
	if cursor != "" {
		rec.Cursor = sql.NullString{String: cursor, Valid: true}
	}

	return s.syncStateRepo.Upsert(ctx, rec)
}

func (s *ReconcileSyncer) listUsers(ctx context.Context) ([]*repositories.User, error) {
	return s.userRepo.List(ctx)
}
