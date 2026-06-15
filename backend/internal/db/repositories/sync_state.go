package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// SyncStateRepo handles persistence for sync_state.
type SyncStateRepo struct {
	db *sql.DB
}

// NewSyncStateRepo creates a new SyncStateRepo.
func NewSyncStateRepo(db *sql.DB) *SyncStateRepo {
	return &SyncStateRepo{db: db}
}

// SyncStateRecord represents the sync state for a single (user, data_type, source).
type SyncStateRecord struct {
	ID            int64
	UserID        int64
	DataType      string
	Source        string
	LastStartTime sql.NullTime
	LastEndTime   sql.NullTime
	LastCivilDate sql.NullTime
	Cursor        sql.NullString
	UpdatedAt     time.Time
}

// Get returns the sync state for a user/data_type/source, or nil if not present.
func (r *SyncStateRepo) Get(ctx context.Context, userID int64, dataType, source string) (*SyncStateRecord, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, data_type, source, last_start_time, last_end_time, last_civil_date, cursor, updated_at
		FROM sync_state
		WHERE user_id = ? AND data_type = ? AND source = ?
	`, userID, dataType, source)

	s := &SyncStateRecord{}
	if err := row.Scan(&s.ID, &s.UserID, &s.DataType, &s.Source, &s.LastStartTime, &s.LastEndTime, &s.LastCivilDate, &s.Cursor, &s.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get sync state: %w", err)
	}
	return s, nil
}

// Upsert creates or updates a sync state record.
func (r *SyncStateRepo) Upsert(ctx context.Context, rec *SyncStateRecord) error {
	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO sync_state (
			user_id, data_type, source, last_start_time, last_end_time, last_civil_date, cursor, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id, data_type, source) DO UPDATE SET
			last_start_time = excluded.last_start_time,
			last_end_time = excluded.last_end_time,
			last_civil_date = excluded.last_civil_date,
			cursor = excluded.cursor,
			updated_at = excluded.updated_at
	`, rec.UserID, rec.DataType, rec.Source, rec.LastStartTime, rec.LastEndTime, rec.LastCivilDate, rec.Cursor, now)
	if err != nil {
		return fmt.Errorf("upsert sync state: %w", err)
	}
	return nil
}

// UpdateCursor updates just the cursor for an existing record.
func (r *SyncStateRepo) UpdateCursor(ctx context.Context, id int64, cursor string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE sync_state SET cursor = ?, updated_at = ? WHERE id = ?
	`, sql.NullString{String: cursor, Valid: cursor != ""}, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("update cursor: %w", err)
	}
	return nil
}

// Delete removes a sync state record.
func (r *SyncStateRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM sync_state WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete sync state: %w", err)
	}
	return nil
}
