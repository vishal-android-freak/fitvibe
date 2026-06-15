package oauth

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"path/filepath"
	"testing"
	"time"

	"github.com/vishal-android-freak/fitvibe/internal/config"
	"github.com/vishal-android-freak/fitvibe/internal/db"
	"github.com/vishal-android-freak/fitvibe/internal/db/repositories"
	"github.com/vishal-android-freak/fitvibe/internal/healthapi"
	"golang.org/x/oauth2"
)

type fakeTokenSource struct {
	exchangeFunc func(ctx context.Context, code, redirectURI string) (*oauth2.Token, error)
	refreshFunc  func(ctx context.Context, refreshToken string) (*oauth2.Token, error)
}

func (f *fakeTokenSource) Exchange(ctx context.Context, code, redirectURI string) (*oauth2.Token, error) {
	return f.exchangeFunc(ctx, code, redirectURI)
}

func (f *fakeTokenSource) Refresh(ctx context.Context, refreshToken string) (*oauth2.Token, error) {
	return f.refreshFunc(ctx, refreshToken)
}

func newTestRepo(t *testing.T) *repositories.UserRepo {
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
	t.Cleanup(func() { database.Close() })

	return repositories.NewUserRepo(database.DB)
}

func TestServiceExchange(t *testing.T) {
	repo := newTestRepo(t)
	ts := &fakeTokenSource{
		exchangeFunc: func(ctx context.Context, code, redirectURI string) (*oauth2.Token, error) {
			if code != "auth-code" {
				t.Errorf("expected code auth-code, got %s", code)
			}
			if redirectURI != "com.fitvibe.app:/oauth2callback" {
				t.Errorf("expected redirectURI com.fitvibe.app:/oauth2callback, got %s", redirectURI)
			}
			return &oauth2.Token{
				AccessToken:  "access-1",
				RefreshToken: "refresh-1",
				Expiry:       time.Now().Add(time.Hour),
			}, nil
		},
	}

	svc := &Service{tokens: ts, users: repo}
	svc.getIdentityFn = func(ctx context.Context, accessToken string) (*healthapi.IdentityResponse, error) {
		return &healthapi.IdentityResponse{HealthUserID: "health-1", LegacyUserID: "legacy-1"}, nil
	}
	resp, err := svc.Exchange(context.Background(), ExchangeRequest{
		Code:        "auth-code",
		RedirectURI: "com.fitvibe.app:/oauth2callback",
	})
	if err != nil {
		t.Fatalf("exchange: %v", err)
	}
	if resp.UserID == 0 {
		t.Error("expected user id to be set")
	}

	// Verify tokens were persisted.
	u, err := repo.GetByHealthUserID(context.Background(), resp.HealthUserID)
	if err != nil {
		t.Fatalf("get user: %v", err)
	}
	if u == nil {
		t.Fatal("expected user to exist")
	}
	if u.AccessToken != "access-1" {
		t.Errorf("expected access token access-1, got %s", u.AccessToken)
	}
	if u.RefreshToken != "refresh-1" {
		t.Errorf("expected refresh token refresh-1, got %s", u.RefreshToken)
	}
}

func TestServiceExchangeMissingRefreshToken(t *testing.T) {
	repo := newTestRepo(t)
	ts := &fakeTokenSource{
		exchangeFunc: func(ctx context.Context, code, redirectURI string) (*oauth2.Token, error) {
			return &oauth2.Token{
				AccessToken: "access-only",
			}, nil
		},
	}

	svc := &Service{tokens: ts, users: repo}
	svc.getIdentityFn = func(ctx context.Context, accessToken string) (*healthapi.IdentityResponse, error) {
		return nil, errors.New("identity should not be called")
	}
	_, err := svc.Exchange(context.Background(), ExchangeRequest{Code: "code"})
	if err == nil {
		t.Fatal("expected error when refresh token is missing")
	}
}

func TestServiceRefreshAccessToken(t *testing.T) {
	repo := newTestRepo(t)
	ctx := context.Background()

	// Seed a user.
	u, err := repo.StoreTokens(ctx, "google-1", "health-1", "user@example.com", "", "", "", 0, 0, "old-access", "old-refresh", time.Now().Add(-time.Hour), "scopes")
	if err != nil {
		t.Fatalf("store tokens: %v", err)
	}

	newExpiry := time.Now().Add(time.Hour).Truncate(time.Second)
	ts := &fakeTokenSource{
		refreshFunc: func(ctx context.Context, refreshToken string) (*oauth2.Token, error) {
			if refreshToken != "old-refresh" {
				t.Errorf("expected refresh token old-refresh, got %s", refreshToken)
			}
			return &oauth2.Token{
				AccessToken:  "new-access",
				RefreshToken: "new-refresh",
				Expiry:       newExpiry,
			}, nil
		},
	}

	svc := &Service{tokens: ts, users: repo}
	tok, err := svc.RefreshAccessToken(ctx, u)
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	if tok.AccessToken != "new-access" {
		t.Errorf("expected new access token new-access, got %s", tok.AccessToken)
	}

	// Verify persistence.
	loaded, err := repo.GetByHealthUserID(ctx, "health-1")
	if err != nil {
		t.Fatalf("get user: %v", err)
	}
	if loaded.AccessToken != "new-access" {
		t.Errorf("expected persisted access token new-access, got %s", loaded.AccessToken)
	}
	if loaded.RefreshToken != "new-refresh" {
		t.Errorf("expected persisted refresh token new-refresh, got %s", loaded.RefreshToken)
	}
}

func TestServiceRefreshAccessTokenKeepsOldRefresh(t *testing.T) {
	repo := newTestRepo(t)
	ctx := context.Background()

	u, err := repo.StoreTokens(ctx, "google-1", "health-1", "user@example.com", "", "", "", 0, 0, "old-access", "old-refresh", time.Now().Add(-time.Hour), "scopes")
	if err != nil {
		t.Fatalf("store tokens: %v", err)
	}

	ts := &fakeTokenSource{
		refreshFunc: func(ctx context.Context, refreshToken string) (*oauth2.Token, error) {
			return &oauth2.Token{
				AccessToken: "new-access",
				// Google did not rotate the refresh token.
				Expiry: time.Now().Add(time.Hour),
			}, nil
		},
	}

	svc := &Service{tokens: ts, users: repo}
	if _, err := svc.RefreshAccessToken(ctx, u); err != nil {
		t.Fatalf("refresh: %v", err)
	}

	loaded, err := repo.GetByHealthUserID(ctx, "health-1")
	if err != nil {
		t.Fatalf("get user: %v", err)
	}
	if loaded.RefreshToken != "old-refresh" {
		t.Errorf("expected old refresh token to be kept, got %s", loaded.RefreshToken)
	}
}

func TestServiceRefreshAccessTokenError(t *testing.T) {
	repo := newTestRepo(t)
	ctx := context.Background()

	u, err := repo.StoreTokens(ctx, "google-1", "health-1", "", "", "", "", 0, 0, "access", "refresh", time.Now().Add(-time.Hour), "scopes")
	if err != nil {
		t.Fatalf("store tokens: %v", err)
	}

	ts := &fakeTokenSource{
		refreshFunc: func(ctx context.Context, refreshToken string) (*oauth2.Token, error) {
			return nil, errors.New("google rejected refresh")
		},
	}

	svc := &Service{tokens: ts, users: repo}
	_, err = svc.RefreshAccessToken(ctx, u)
	if err == nil {
		t.Fatal("expected refresh error")
	}
}
