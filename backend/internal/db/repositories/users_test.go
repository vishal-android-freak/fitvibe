package repositories

import (
	"context"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/config"
	"github.com/vishal-android-freak/fitvibe/internal/db"
)

func newTestDB(t *testing.T) *db.DB {
	t.Helper()

	dir := t.TempDir()
	cfg := &config.Config{
		TursoDatabaseURL:    filepath.Join(dir, "test.db"),
		SQLiteBusyTimeoutMs: 5000,
		GoogleClientID:      "test",
		GoogleClientSecret:  "test",
		GoogleRedirectURI:   "test",
		WebhookSecret:       "test",
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	database, err := db.Open(cfg, logger)
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}

	t.Cleanup(func() {
		database.Close()
	})

	return database
}

func TestStoreTokens(t *testing.T) {
	database := newTestDB(t)
	repo := NewUserRepo(database.DB)
	ctx := context.Background()

	expiry := time.Now().UTC().Add(time.Hour).Truncate(time.Second)
	u, err := repo.StoreTokens(ctx, "google-1", "health-1", "user@example.com", "", "", "", 0, 0, "access-1", "refresh-1", expiry, "scopes")
	if err != nil {
		t.Fatalf("store tokens: %v", err)
	}
	if u.ID == 0 {
		t.Error("expected user ID to be set")
	}
	if u.AccessToken != "access-1" {
		t.Errorf("expected access token access-1, got %s", u.AccessToken)
	}
	if u.RefreshToken != "refresh-1" {
		t.Errorf("expected refresh token refresh-1, got %s", u.RefreshToken)
	}
	if !u.TokenExpiry.Equal(expiry) {
		t.Errorf("expected token expiry %v, got %v", expiry, u.TokenExpiry)
	}
}

func TestGetByHealthUserID(t *testing.T) {
	database := newTestDB(t)
	repo := NewUserRepo(database.DB)
	ctx := context.Background()

	expiry := time.Now().UTC().Add(time.Hour).Truncate(time.Second)
	if _, err := repo.StoreTokens(ctx, "google-2", "health-2", "user2@example.com", "", "", "", 0, 0, "access-2", "refresh-2", expiry, "scopes"); err != nil {
		t.Fatalf("store tokens: %v", err)
	}

	u, err := repo.GetByHealthUserID(ctx, "health-2")
	if err != nil {
		t.Fatalf("get user: %v", err)
	}
	if u == nil {
		t.Fatal("expected user, got nil")
	}
	if u.HealthUserID.String != "health-2" {
		t.Errorf("expected health user id health-2, got %s", u.HealthUserID.String)
	}
	if u.AccessToken != "access-2" {
		t.Errorf("expected access token access-2, got %s", u.AccessToken)
	}
}

func TestGetByHealthUserIDNotFound(t *testing.T) {
	database := newTestDB(t)
	repo := NewUserRepo(database.DB)
	ctx := context.Background()

	u, err := repo.GetByHealthUserID(ctx, "missing")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if u != nil {
		t.Error("expected nil user for missing id")
	}
}

func TestStoreTokensUpsert(t *testing.T) {
	database := newTestDB(t)
	repo := NewUserRepo(database.DB)
	ctx := context.Background()

	expiry1 := time.Now().UTC().Add(time.Hour).Truncate(time.Second)
	u1, err := repo.StoreTokens(ctx, "google-3", "health-3", "user3@example.com", "", "", "", 0, 0, "access-a", "refresh-a", expiry1, "scopes-a")
	if err != nil {
		t.Fatalf("first store: %v", err)
	}

	expiry2 := time.Now().UTC().Add(2 * time.Hour).Truncate(time.Second)
	u2, err := repo.StoreTokens(ctx, "google-3", "health-3", "user3@example.com", "", "", "", 0, 0, "access-b", "refresh-b", expiry2, "scopes-b")
	if err != nil {
		t.Fatalf("second store: %v", err)
	}

	if u1.ID != u2.ID {
		t.Errorf("expected same user id after upsert, got %d and %d", u1.ID, u2.ID)
	}
	if u2.AccessToken != "access-b" {
		t.Errorf("expected updated access token access-b, got %s", u2.AccessToken)
	}

	loaded, err := repo.GetByHealthUserID(ctx, "health-3")
	if err != nil {
		t.Fatalf("get user: %v", err)
	}
	if loaded.AccessToken != "access-b" {
		t.Errorf("expected loaded access token access-b, got %s", loaded.AccessToken)
	}
}

// Ensure os.Environ doesn't leak into tests (we don't use it here but keep for safety).
var _ = os.Environ
