package cron

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"strings"
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

	// startOverride, when non-zero, replaces the default
	// (now - DefaultBackfillDays) window start — e.g. to backfill just today.
	startOverride time.Time
}

// WithStart overrides the backfill window start (default is
// now - DefaultBackfillDays). Returns the job for chaining.
func (b *BackfillJob) WithStart(start time.Time) *BackfillJob {
	b.startOverride = start
	return b
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

	dataTypes := backfillDataTypes()

	end := time.Now().UTC()
	start := end.Add(-time.Duration(b.cfg.DefaultBackfillDays) * 24 * time.Hour)
	if !b.startOverride.IsZero() {
		start = b.startOverride.UTC()
	}

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

// isUnsupportedListAction reports whether the error is the API's
// "List is not supported for data type" 400 — those types only allow
// reconcile/rollup and are filled by those crons instead.
func isUnsupportedListAction(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "UNSUPPORTED_DATA_TYPE_ACTION") ||
		strings.Contains(msg, "List is not supported for data type")
}

// backfillDataTypes is every data type the historical backfill pulls: the
// webhook-supported list PLUS the cron-only types (ECG, vo2-max, SpO2,
// active-energy-burned, …) that webhooks never deliver. Deduped, preserving a
// stable order. Types that don't support `list` (only reconcile/rollup) are
// skipped gracefully at fetch time rather than excluded here, so the list stays
// the simple union of "everything we ingest".
func backfillDataTypes() []string {
	seen := make(map[string]bool, len(WebhookListDataTypes)+len(cronOnlyDataTypes))
	out := make([]string, 0, len(WebhookListDataTypes)+len(cronOnlyDataTypes))
	for _, dt := range WebhookListDataTypes {
		if !seen[dt] {
			seen[dt] = true
			out = append(out, dt)
		}
	}
	for _, dt := range cronOnlyDataTypes {
		if !seen[dt] {
			seen[dt] = true
			out = append(out, dt)
		}
	}
	return out
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
			// Some types (e.g. floors, irregular-rhythm) only support
			// reconcile/rollup, not list. Skip those quietly rather than failing
			// the whole type — they're recovered by the rollup/reconcile crons.
			if isUnsupportedListAction(err) {
				b.logger.Info("backfill skipping unsupported list data type", "data_type", dataType)
				return nil
			}
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
