package cron

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/config"
	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/healthapi"
	"github.com/vishal-android-freak/fitvibe/internal/ingestion"
	"github.com/vishal-android-freak/fitvibe/internal/oauth"
)

// BackfillJob performs historical backfill for a single user.
type BackfillJob struct {
	cfg           *config.Config
	oauthService  *oauth.Service
	userRepo      *repositories.UserRepo
	syncStateRepo *repositories.SyncStateRepo
	dataPointRepo *repositories.DataPointRepo
	logger        *slog.Logger
	userID        int64
}

// NewBackfillJob creates a backfill job for a user.
func NewBackfillJob(
	cfg *config.Config,
	oauthService *oauth.Service,
	userRepo *repositories.UserRepo,
	syncStateRepo *repositories.SyncStateRepo,
	dataPointRepo *repositories.DataPointRepo,
	logger *slog.Logger,
	userID int64,
) *BackfillJob {
	return &BackfillJob{
		cfg:           cfg,
		oauthService:  oauthService,
		userRepo:      userRepo,
		syncStateRepo: syncStateRepo,
		dataPointRepo: dataPointRepo,
		logger:        logger,
		userID:        userID,
	}
}

// Name returns the job name.
func (b *BackfillJob) Name() string {
	return "backfill"
}

// Run executes the backfill for webhook-supported data types.
func (b *BackfillJob) Run(ctx context.Context) error {
	user, err := b.userRepo.GetByID(ctx, b.userID)
	if err != nil {
		return fmt.Errorf("lookup user: %w", err)
	}
	if user == nil {
		return fmt.Errorf("user %d not found", b.userID)
	}

	dataTypes := WebhookListDataTypes

	start := time.Now().UTC().Add(-time.Duration(b.cfg.DefaultBackfillDays) * 24 * time.Hour)
	end := time.Now().UTC()

	// Process data types concurrently to speed up backfill.
	// Use a shared rate-limited client so all workers stay under the Google
	// Health API quota of 300 requests/minute per user.
	const workers = 3
	sharedClient := healthapi.NewClient(b.oauthService.TokenProvider(user.ID))

	workCh := make(chan string, len(dataTypes))
	for _, dt := range dataTypes {
		workCh <- dt
	}
	close(workCh)

	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for dataType := range workCh {
				b.logger.Info("backfill data type starting", "user_id", user.ID, "data_type", dataType)
				if err := b.syncDataType(ctx, sharedClient, user.ID, dataType, start, end); err != nil {
					b.logger.Error("backfill data type failed",
						"user_id", user.ID,
						"data_type", dataType,
						"error", err)
				} else {
					b.logger.Info("backfill data type done", "user_id", user.ID, "data_type", dataType)
				}
			}
		}()
	}
	wg.Wait()

	if err := b.updateBodyMetrics(ctx, user.ID); err != nil {
		b.logger.Error("update body metrics failed", "user_id", user.ID, "error", err)
	}

	return nil
}

func (b *BackfillJob) updateBodyMetrics(ctx context.Context, userID int64) error {
	heightMeters, err := b.dataPointRepo.GetLatestValue(ctx, userID, "height")
	if err != nil {
		return fmt.Errorf("get latest height: %w", err)
	}
	weightGrams, err := b.dataPointRepo.GetLatestValue(ctx, userID, "weight")
	if err != nil {
		return fmt.Errorf("get latest weight: %w", err)
	}
	weightKg := weightGrams / 1000.0
	if heightMeters == 0 && weightKg == 0 {
		return nil
	}
	return b.userRepo.UpdateBodyMetrics(ctx, userID, heightMeters, weightKg)
}

func (b *BackfillJob) syncDataType(ctx context.Context, client *healthapi.Client, userID int64, dataType string, start, end time.Time) error {
	pageToken := ""
	for {
		resp, err := client.ListDataPoints(ctx, &healthapi.ListDataPointsRequest{
			DataType:  dataType,
			StartTime: start,
			EndTime:   end,
			PageToken: pageToken,
			PageSize:  100,
		})
		if err != nil {
			return fmt.Errorf("list data points: %w", err)
		}

		recs := make([]*repositories.DataPointRecord, 0, len(resp.DataPoints))
		for i := range resp.DataPoints {
			rec, err := ingestion.MapDataPoint(userID, dataType, "backfill", &resp.DataPoints[i], sql.NullInt64{})
			if err != nil {
				return fmt.Errorf("map data point: %w", err)
			}
			recs = append(recs, rec)
		}
		if len(recs) > 0 {
			if err := b.dataPointRepo.InsertMany(ctx, recs); err != nil {
				return fmt.Errorf("insert data points: %w", err)
			}
		}

		if resp.NextPageToken == "" {
			break
		}
		pageToken = resp.NextPageToken
	}

	rec := &repositories.SyncStateRecord{
		UserID:        userID,
		DataType:      dataType,
		Source:        "list",
		LastStartTime: sql.NullTime{Time: start, Valid: !start.IsZero()},
		LastEndTime:   sql.NullTime{Time: end, Valid: !end.IsZero()},
	}
	return b.syncStateRepo.Upsert(ctx, rec)
}
