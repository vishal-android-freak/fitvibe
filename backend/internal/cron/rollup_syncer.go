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

// RollupSyncer syncs hourly/daily rollups for all users.
type RollupSyncer struct {
	cfg           *config.Config
	oauthService  *oauth.Service
	userRepo      *repositories.UserRepo
	syncStateRepo *repositories.SyncStateRepo
	rollupRepo    *repositories.RollupDataPointRepo
	logger        *slog.Logger
	daily         bool
}

// NewRollupSyncer creates a rollup syncer. If daily is true it syncs dailyRollUp.
func NewRollupSyncer(
	cfg *config.Config,
	oauthService *oauth.Service,
	userRepo *repositories.UserRepo,
	syncStateRepo *repositories.SyncStateRepo,
	rollupRepo *repositories.RollupDataPointRepo,
	logger *slog.Logger,
	daily bool,
) *RollupSyncer {
	return &RollupSyncer{
		cfg:           cfg,
		oauthService:  oauthService,
		userRepo:      userRepo,
		syncStateRepo: syncStateRepo,
		rollupRepo:    rollupRepo,
		logger:        logger,
		daily:         daily,
	}
}

// Name returns the job name.
func (s *RollupSyncer) Name() string {
	if s.daily {
		return "daily-rollups"
	}
	return "intraday-rollups"
}

// Run syncs rollups for all users.
func (s *RollupSyncer) Run(ctx context.Context) error {
	users, err := s.userRepo.List(ctx)
	if err != nil {
		return err
	}

	for _, user := range users {
		for _, dataType := range rollupSupportedTypes {
			if err := s.syncDataType(ctx, user, dataType); err != nil {
				s.logger.Error("sync rollup failed",
					"user_id", user.ID,
					"data_type", dataType,
					"daily", s.daily,
					"error", err)
			}
		}
	}
	return nil
}

func (s *RollupSyncer) syncDataType(ctx context.Context, user *repositories.User, dataType string) error {
	source := "rollUp"
	windowSize := 3600 // 1 hour
	start := time.Now().UTC().Add(-2 * time.Hour).Truncate(time.Hour)
	end := start.Add(time.Hour)

	if s.daily {
		source = "dailyRollUp"
		windowSize = 1
		start = time.Now().UTC().Add(-48 * time.Hour).Truncate(24 * time.Hour)
		end = start.Add(24 * time.Hour)
	}

	client := healthapi.NewClient(s.oauthService.TokenProvider(user.ID))

	var resp *healthapi.RollupResponse
	var err error
	if s.daily {
		resp, err = client.DailyRollUp(ctx, &healthapi.RollupRequest{
			DataType:  dataType,
			StartTime: start,
			EndTime:   end,
			WindowSize: windowSize,
		})
	} else {
		resp, err = client.RollUp(ctx, &healthapi.RollupRequest{
			DataType:  dataType,
			StartTime: start,
			EndTime:   end,
			WindowSize: windowSize,
		})
	}
	if err != nil {
		return fmt.Errorf("rollup request: %w", err)
	}

	recs := make([]*repositories.RollupDataPointRecord, 0, len(resp.RollupDataPoints))
	for i := range resp.RollupDataPoints {
		rec, err := mapRollupDataPoint(user.ID, dataType, source, windowSize, &resp.RollupDataPoints[i])
		if err != nil {
			return fmt.Errorf("map rollup: %w", err)
		}
		recs = append(recs, rec)
	}

	if len(recs) > 0 {
		if err := s.rollupRepo.InsertMany(ctx, recs); err != nil {
			return fmt.Errorf("insert rollups: %w", err)
		}
	}

	return s.updateSyncState(ctx, user.ID, dataType, source, start, end)
}

func (s *RollupSyncer) updateSyncState(ctx context.Context, userID int64, dataType, source string, start, end time.Time) error {
	rec := &repositories.SyncStateRecord{
		UserID:        userID,
		DataType:      dataType,
		Source:        source,
		LastStartTime: sql.NullTime{Time: start, Valid: !start.IsZero()},
		LastEndTime:   sql.NullTime{Time: end, Valid: !end.IsZero()},
	}
	return s.syncStateRepo.Upsert(ctx, rec)
}

// rollupSupportedTypes lists data types that support rollup/dailyRollUp.
var rollupSupportedTypes = []string{
	"active-energy-burned", "active-minutes", "active-zone-minutes", "altitude",
	"blood-glucose", "body-fat", "calories-in-heart-rate-zone", "distance",
	"heart-rate", "hydration-log", "nutrition-log", "run-vo2-max",
	"sedentary-period", "steps", "swim-lengths-data", "time-in-heart-rate-zone",
	"total-calories", "weight",
}
