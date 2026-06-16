package webhooks

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/healthapi"
	"github.com/vishal-android-freak/fitvibe/internal/ingestion"
	"github.com/vishal-android-freak/fitvibe/internal/oauth"
)

// Processor polls and processes queued webhook notifications asynchronously.
type Processor struct {
	oauthService *oauth.Service
	userRepo     *repositories.UserRepo
	webhookRepo  *repositories.WebhookNotificationRepo
	dataPointRepo *repositories.DataPointRepo
	logger       *slog.Logger
	batchSize    int
}

// NewProcessor creates a new async webhook processor.
func NewProcessor(
	oauthService *oauth.Service,
	userRepo *repositories.UserRepo,
	webhookRepo *repositories.WebhookNotificationRepo,
	dataPointRepo *repositories.DataPointRepo,
	logger *slog.Logger,
) *Processor {
	return &Processor{
		oauthService:  oauthService,
		userRepo:      userRepo,
		webhookRepo:   webhookRepo,
		dataPointRepo: dataPointRepo,
		logger:        logger,
		batchSize:     10,
	}
}

// Start begins the background polling loop. It blocks until the context is cancelled.
func (p *Processor) Start(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		if err := p.ProcessBatch(ctx); err != nil {
			p.logger.Error("webhook batch processing error", "error", err)
		}

		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// ProcessBatch processes one batch of pending notifications.
func (p *Processor) ProcessBatch(ctx context.Context) error {
	notifications, err := p.webhookRepo.GetPending(ctx, p.batchSize)
	if err != nil {
		return fmt.Errorf("fetch pending notifications: %w", err)
	}
	if len(notifications) == 0 {
		return nil
	}

	for _, n := range notifications {
		if err := p.process(ctx, n); err != nil {
			p.logger.Error("process notification failed",
				"notification_id", n.ID,
				"health_user_id", n.HealthUserID,
				"data_type", n.DataType,
				"error", err)
			p.scheduleRetry(ctx, n, err)
		}
	}

	return nil
}

func (p *Processor) process(ctx context.Context, n *repositories.WebhookNotificationRecord) error {
	user, err := p.userRepo.GetByHealthUserID(ctx, n.HealthUserID)
	if err != nil {
		return fmt.Errorf("lookup user: %w", err)
	}
	if user == nil {
		return fmt.Errorf("user not found for health_user_id %s", n.HealthUserID)
	}

	payloads, err := parseNotificationPayload(n.NotificationJSON)
	if err != nil {
		return fmt.Errorf("parse notification: %w", err)
	}

	client := healthapi.NewClient(p.oauthService.TokenProvider(user.ID))
	webhookID := sql.NullInt64{Int64: n.ID, Valid: true}

	for _, payload := range payloads {
		for _, interval := range payload.Data.Intervals {
			start, end, err := intervalBounds(interval)
			if err != nil {
				return fmt.Errorf("interval bounds: %w", err)
			}
			if start.IsZero() || end.IsZero() {
				continue
			}

			dataType := payload.Data.DataType
			if dataType == "" {
				dataType = n.DataType
			}

			if err := p.fetchAndStore(ctx, client, user.ID, dataType, start, end, webhookID); err != nil {
				return fmt.Errorf("fetch and store %s: %w", dataType, err)
			}
		}
	}

	return p.webhookRepo.MarkProcessed(ctx, n.ID)
}

func (p *Processor) fetchAndStore(ctx context.Context, client *healthapi.Client, userID int64, dataType string, start, end time.Time, webhookID sql.NullInt64) error {
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
			rec, err := ingestion.MapDataPoint(userID, dataType, "webhook", &resp.DataPoints[i], webhookID)
			if err != nil {
				return fmt.Errorf("map data point: %w", err)
			}
			recs = append(recs, rec)
		}

		if len(recs) > 0 {
			if err := p.dataPointRepo.InsertMany(ctx, recs); err != nil {
				return fmt.Errorf("insert data points: %w", err)
			}
		}

		if resp.NextPageToken == "" {
			break
		}
		pageToken = resp.NextPageToken
	}
	return nil
}

func (p *Processor) scheduleRetry(ctx context.Context, n *repositories.WebhookNotificationRecord, err error) {
	if n.RetryCount >= 10 {
		_ = p.webhookRepo.MarkFailed(ctx, n.ID, err.Error(), time.Time{})
		return
	}

	delay := time.Duration(1<<min(n.RetryCount, 6)) * time.Minute
	if delay > 24*time.Hour {
		delay = 24 * time.Hour
	}
	nextRetry := time.Now().UTC().Add(delay)
	_ = p.webhookRepo.MarkFailed(ctx, n.ID, err.Error(), nextRetry)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func parseNotificationPayload(raw string) ([]notificationPayload, error) {
	// Google sends notifications as either a single object or a batch array.
	var single notificationPayload
	if err := json.Unmarshal([]byte(raw), &single); err == nil && single.Data.HealthUserID != "" {
		return []notificationPayload{single}, nil
	}

	var batch []notificationPayload
	if err := json.Unmarshal([]byte(raw), &batch); err != nil {
		return nil, err
	}
	return batch, nil
}

func intervalBounds(i notificationInterval) (time.Time, time.Time, error) {
	// Prefer physical time interval (RFC3339 with Z).
	if i.PhysicalTimeInterval.StartTime != "" {
		start, err := time.Parse(time.RFC3339, i.PhysicalTimeInterval.StartTime)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
		end, err := time.Parse(time.RFC3339, i.PhysicalTimeInterval.EndTime)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
		return start, end, nil
	}

	// Fall back to civil ISO 8601 interval (no timezone).
	if i.CivilIso8601TimeInterval.StartTime != "" {
		start, err := time.Parse("2006-01-02T15:04:05.999999999", i.CivilIso8601TimeInterval.StartTime)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
		end, err := time.Parse("2006-01-02T15:04:05.999999999", i.CivilIso8601TimeInterval.EndTime)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
		return start, end, nil
	}

	return time.Time{}, time.Time{}, nil
}
