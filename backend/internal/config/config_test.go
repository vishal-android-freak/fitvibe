package config

import (
	"testing"
	"time"
)

func TestLoadFromDefaults(t *testing.T) {
	cfg, err := LoadFrom(map[string]string{
		"GOOGLE_CLIENT_ID":     "client-id",
		"GOOGLE_CLIENT_SECRET": "client-secret",
		"GOOGLE_REDIRECT_URI":  "com.fitvibe.app:/oauth2callback",
		"WEBHOOK_SECRET":       "secret",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.Port != "8080" {
		t.Errorf("expected default Port 8080, got %s", cfg.Port)
	}
	if cfg.Host != "0.0.0.0" {
		t.Errorf("expected default Host 0.0.0.0, got %s", cfg.Host)
	}
	if cfg.WebhookPath != "/webhooks/google-health" {
		t.Errorf("expected default WebhookPath, got %s", cfg.WebhookPath)
	}
	if cfg.TursoDatabaseURL != "fitvibe.db" {
		t.Errorf("expected default TursoDatabaseURL fitvibe.db, got %s", cfg.TursoDatabaseURL)
	}
	if cfg.WebhookSignatureCacheTTL != 24*time.Hour {
		t.Errorf("expected default WebhookSignatureCacheTTL 24h, got %v", cfg.WebhookSignatureCacheTTL)
	}
	if cfg.DefaultBackfillDays != 30 {
		t.Errorf("expected default DefaultBackfillDays 30, got %d", cfg.DefaultBackfillDays)
	}
	if cfg.SQLiteBusyTimeoutMs != 5000 {
		t.Errorf("expected default SQLiteBusyTimeoutMs 5000, got %d", cfg.SQLiteBusyTimeoutMs)
	}
}

func TestLoadFromCustomValues(t *testing.T) {
	cfg, err := LoadFrom(map[string]string{
		"PORT":                         "3000",
		"HOST":                         "127.0.0.1",
		"WEBHOOK_PATH":                 "/hooks",
		"WEBHOOK_SECRET":               "Bearer token",
		"GOOGLE_CLIENT_ID":             "gid",
		"GOOGLE_CLIENT_SECRET":         "gsecret",
		"GOOGLE_REDIRECT_URI":          "https://example.com/callback",
		"GOOGLE_PROJECT_NUMBER":        "12345",
		"TURSO_DATABASE_URL":           "file:test.db",
		"TURSO_ENCRYPTION_KEY":         "key",
		"WEBHOOK_SIGNATURE_CACHE_TTL":  "1h",
		"DEFAULT_BACKFILL_DAYS":        "7",
		"CRON_INTRADAY_ROLLUP":         "0 0 * * *",
		"CRON_DAILY_ROLLUP":            "0 1 * * *",
		"CRON_LIST_SYNC":               "0 2 * * *",
		"CRON_PROFILE_SETTINGS_SYNC":   "0 3 * * *",
		"SQLITE_BUSY_TIMEOUT_MS":       "10000",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.Port != "3000" {
		t.Errorf("expected Port 3000, got %s", cfg.Port)
	}
	if cfg.Host != "127.0.0.1" {
		t.Errorf("expected Host 127.0.0.1, got %s", cfg.Host)
	}
	if cfg.WebhookPath != "/hooks" {
		t.Errorf("expected WebhookPath /hooks, got %s", cfg.WebhookPath)
	}
	if cfg.GoogleProjectNumber != "12345" {
		t.Errorf("expected GoogleProjectNumber 12345, got %s", cfg.GoogleProjectNumber)
	}
	if cfg.TursoDatabaseURL != "file:test.db" {
		t.Errorf("expected TursoDatabaseURL file:test.db, got %s", cfg.TursoDatabaseURL)
	}
	if cfg.TursoEncryptionKey != "key" {
		t.Errorf("expected TursoEncryptionKey key, got %s", cfg.TursoEncryptionKey)
	}
	if cfg.WebhookSignatureCacheTTL != time.Hour {
		t.Errorf("expected WebhookSignatureCacheTTL 1h, got %v", cfg.WebhookSignatureCacheTTL)
	}
	if cfg.DefaultBackfillDays != 7 {
		t.Errorf("expected DefaultBackfillDays 7, got %d", cfg.DefaultBackfillDays)
	}
	if cfg.SQLiteBusyTimeoutMs != 10000 {
		t.Errorf("expected SQLiteBusyTimeoutMs 10000, got %d", cfg.SQLiteBusyTimeoutMs)
	}
}

func TestLoadFromMissingRequired(t *testing.T) {
	required := []string{
		"GOOGLE_CLIENT_ID",
		"GOOGLE_CLIENT_SECRET",
		"GOOGLE_REDIRECT_URI",
		"WEBHOOK_SECRET",
	}

	base := map[string]string{
		"GOOGLE_CLIENT_ID":     "id",
		"GOOGLE_CLIENT_SECRET": "secret",
		"GOOGLE_REDIRECT_URI":  "uri",
		"WEBHOOK_SECRET":       "whsecret",
	}

	for _, key := range required {
		env := make(map[string]string)
		for k, v := range base {
			env[k] = v
		}
		delete(env, key)

		_, err := LoadFrom(env)
		if err == nil {
			t.Errorf("expected error when %s is missing", key)
		}
	}
}
