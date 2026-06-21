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

// Cron-only data types (no webhook support).
// Excludes food/food-measurement-unit because they only support filtering by
// display_name/language_code, not by time range.
var cronOnlyDataTypes = []string{
	"active-energy-burned",
	"active-minutes",
	"core-body-temperature",
	"daily-vo2-max",
	"electrocardiogram",
	"irregular-rhythm-notification",
	"oxygen-saturation",
	"swim-lengths-data",
	"vo2-max",
}

// ListSyncer polls cron-only data types for all users.
type ListSyncer struct {
	cfg           *config.Config
	oauthService  *oauth.Service
	userRepo      *repositories.UserRepo
	syncStateRepo *repositories.SyncStateRepo
	dataPointRepo *repositories.DataPointRepo
	logger        *slog.Logger
}

// NewListSyncer creates a new list syncer.
func NewListSyncer(
	cfg *config.Config,
	oauthService *oauth.Service,
	userRepo *repositories.UserRepo,
	syncStateRepo *repositories.SyncStateRepo,
	dataPointRepo *repositories.DataPointRepo,
	logger *slog.Logger,
) *ListSyncer {
	return &ListSyncer{
		cfg:           cfg,
		oauthService:  oauthService,
		userRepo:      userRepo,
		syncStateRepo: syncStateRepo,
		dataPointRepo: dataPointRepo,
		logger:        logger,
	}
}

// Name returns the job name.
func (s *ListSyncer) Name() string {
	return "cron-list-sync"
}

// Run syncs all cron-only data types for all users.
func (s *ListSyncer) Run(ctx context.Context) error {
	users, err := s.listUsers(ctx)
	if err != nil {
		return err
	}

	for _, user := range users {
		for _, dataType := range cronOnlyDataTypes {
			if err := s.syncDataType(ctx, user, dataType); err != nil {
				s.logger.Error("sync data type failed",
					"user_id", user.ID,
					"data_type", dataType,
					"error", err)
			}
		}
	}
	return nil
}

func (s *ListSyncer) syncDataType(ctx context.Context, user *repositories.User, dataType string) error {
	state, err := s.syncStateRepo.Get(ctx, user.ID, dataType, "list")
	if err != nil {
		return fmt.Errorf("get sync state: %w", err)
	}

	start, end := s.syncWindow(state)
	// Nothing new to fetch since the last run — and a non-positive window would
	// be rejected by the API (INVALID_TIME_RANGE). Skip quietly.
	if !start.Before(end) {
		return nil
	}
	client := healthapi.NewClient(s.oauthService.TokenProvider(user.ID))

	err = paginateAndStore(ctx, s.dataPointRepo, user.ID, dataType, "cron_list", func(pageToken string) (page, error) {
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

	if err := s.updateSyncState(ctx, state, user.ID, dataType, start, end, ""); err != nil {
		return fmt.Errorf("update sync state: %w", err)
	}
	return nil
}

func (s *ListSyncer) syncWindow(state *repositories.SyncStateRecord) (time.Time, time.Time) {
	end := time.Now().UTC()
	var start time.Time

	if state == nil || !state.LastEndTime.Valid {
		start = end.Add(-time.Duration(s.cfg.DefaultBackfillDays) * 24 * time.Hour)
	} else {
		start = state.LastEndTime.Time
	}

	return start, end
}

func (s *ListSyncer) updateSyncState(ctx context.Context, state *repositories.SyncStateRecord, userID int64, dataType string, start, end time.Time, cursor string) error {
	rec := &repositories.SyncStateRecord{
		UserID:   userID,
		DataType: dataType,
		Source:   "list",
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

func (s *ListSyncer) listUsers(ctx context.Context) ([]*repositories.User, error) {
	return s.userRepo.List(ctx)
}
