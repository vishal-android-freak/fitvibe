package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// WebhookNotificationRepo handles persistence for webhook_notifications.
type WebhookNotificationRepo struct {
	db *sql.DB
}

// NewWebhookNotificationRepo creates a new WebhookNotificationRepo.
func NewWebhookNotificationRepo(db *sql.DB) *WebhookNotificationRepo {
	return &WebhookNotificationRepo{db: db}
}

// WebhookNotificationRecord represents a queued webhook notification.
type WebhookNotificationRecord struct {
	ID                             int64
	HealthUserID                   string
	DataType                       string
	Operation                      string
	ClientProvidedSubscriptionName sql.NullString
	NotificationJSON               string
	SignatureHeader                sql.NullString
	ReceivedAt                     time.Time
	ProcessedAt                    sql.NullTime
	ProcessingStatus               string
	ProcessingError                sql.NullString
	RetryCount                     int
	NextRetryAt                    sql.NullTime
}

// Insert stores a new webhook notification and returns its ID.
func (r *WebhookNotificationRepo) Insert(ctx context.Context, rec *WebhookNotificationRecord) (int64, error) {
	now := time.Now().UTC()
	var id int64
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO webhook_notifications (
			health_user_id, data_type, operation, client_provided_subscription_name,
			notification_json, signature_header, received_at, processing_status, retry_count
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`, rec.HealthUserID, rec.DataType, rec.Operation, rec.ClientProvidedSubscriptionName,
		rec.NotificationJSON, rec.SignatureHeader, now, rec.ProcessingStatus, rec.RetryCount).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("insert webhook notification: %w", err)
	}
	return id, nil
}

// GetPending returns notifications ready to be processed, ordered by next_retry_at / received_at.
func (r *WebhookNotificationRepo) GetPending(ctx context.Context, limit int) ([]*WebhookNotificationRecord, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, health_user_id, data_type, operation, client_provided_subscription_name,
		       notification_json, signature_header, received_at, processed_at,
		       processing_status, processing_error, retry_count, next_retry_at
		FROM webhook_notifications
		WHERE processing_status = 'pending'
		  AND (next_retry_at IS NULL OR next_retry_at <= $1)
		ORDER BY received_at
		LIMIT $2
	`, time.Now().UTC(), limit)
	if err != nil {
		return nil, fmt.Errorf("query pending notifications: %w", err)
	}
	defer rows.Close()

	return r.scanRows(rows)
}

// GetByID returns a single notification by ID.
func (r *WebhookNotificationRepo) GetByID(ctx context.Context, id int64) (*WebhookNotificationRecord, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, health_user_id, data_type, operation, client_provided_subscription_name,
		       notification_json, signature_header, received_at, processed_at,
		       processing_status, processing_error, retry_count, next_retry_at
		FROM webhook_notifications
		WHERE id = $1
	`, id)

	rec := &WebhookNotificationRecord{}
	if err := r.scanRow(row, rec); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return rec, nil
}

// MarkProcessed updates a notification to processed status.
func (r *WebhookNotificationRepo) MarkProcessed(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE webhook_notifications
		SET processing_status = 'processed', processed_at = $1, processing_error = NULL, next_retry_at = NULL
		WHERE id = $2
	`, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("mark processed: %w", err)
	}
	return nil
}

// MarkFailed updates a notification to failed status with retry scheduling.
func (r *WebhookNotificationRepo) MarkFailed(ctx context.Context, id int64, errMsg string, nextRetryAt time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE webhook_notifications
		SET processing_status = 'failed', processing_error = $1, retry_count = retry_count + 1, next_retry_at = $2
		WHERE id = $3
	`, errMsg, sql.NullTime{Time: nextRetryAt, Valid: !nextRetryAt.IsZero()}, id)
	if err != nil {
		return fmt.Errorf("mark failed: %w", err)
	}
	return nil
}

// MarkIgnored updates a notification to ignored status.
func (r *WebhookNotificationRepo) MarkIgnored(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE webhook_notifications
		SET processing_status = 'ignored', processed_at = $1
		WHERE id = $2
	`, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("mark ignored: %w", err)
	}
	return nil
}

func (r *WebhookNotificationRepo) scanRows(rows *sql.Rows) ([]*WebhookNotificationRecord, error) {
	var out []*WebhookNotificationRecord
	for rows.Next() {
		rec := &WebhookNotificationRecord{}
		if err := r.scanRow(rows, rec); err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate rows: %w", err)
	}
	return out, nil
}

func (r *WebhookNotificationRepo) scanRow(scanner interface{ Scan(...interface{}) error }, rec *WebhookNotificationRecord) error {
	return scanner.Scan(
		&rec.ID, &rec.HealthUserID, &rec.DataType, &rec.Operation, &rec.ClientProvidedSubscriptionName,
		&rec.NotificationJSON, &rec.SignatureHeader, &rec.ReceivedAt, &rec.ProcessedAt,
		&rec.ProcessingStatus, &rec.ProcessingError, &rec.RetryCount, &rec.NextRetryAt,
	)
}
