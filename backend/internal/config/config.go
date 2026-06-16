package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	// Server
	Port string `env:"PORT" envDefault:"8080"`
	Host string `env:"HOST" envDefault:"0.0.0.0"`

	// Webhook
	WebhookPath   string `env:"WEBHOOK_PATH" envDefault:"/webhooks/google-health"`
	WebhookSecret string `env:"WEBHOOK_SECRET,required"`

	// Google OAuth
	GoogleClientID     string `env:"GOOGLE_CLIENT_ID,required"`
	GoogleClientSecret string `env:"GOOGLE_CLIENT_SECRET,required"`
	GoogleRedirectURI  string `env:"GOOGLE_REDIRECT_URI,required"`
	GoogleProjectNumber string `env:"GOOGLE_PROJECT_NUMBER"`

	// Turso / SQLite (local-only)
	TursoDatabaseURL string `env:"TURSO_DATABASE_URL" envDefault:"fitvibe.db"`

	// Security
	TursoEncryptionKey      string        `env:"TURSO_ENCRYPTION_KEY"`
	WebhookSignatureCacheTTL time.Duration `env:"WEBHOOK_SIGNATURE_CACHE_TTL" envDefault:"24h"`

	// Sync
	DefaultBackfillDays           int           `env:"DEFAULT_BACKFILL_DAYS" envDefault:"30"`
	CronIntradayRollup            string        `env:"CRON_INTRADAY_ROLLUP" envDefault:"0 * * * *"`
	CronDailyRollup               string        `env:"CRON_DAILY_ROLLUP" envDefault:"10 0 * * *"`
	CronListSync                  string        `env:"CRON_LIST_SYNC" envDefault:"0 */6 * * *"`
	CronProfileSettingsSync       string        `env:"CRON_PROFILE_SETTINGS_SYNC" envDefault:"0 2 * * *"`
	CronReconcileSync             string        `env:"CRON_RECONCILE_SYNC" envDefault:"0 3 * * *"`
	SQLiteBusyTimeoutMs           int           `env:"SQLITE_BUSY_TIMEOUT_MS" envDefault:"5000"`
}

// Load reads configuration from environment variables. It optionally loads a
// .env file first when FITVIBE_ENV_FILE is set or a .env file exists in the
// current working directory.
func Load() (*Config, error) {
	_ = godotenv.Load(os.Getenv("FITVIBE_ENV_FILE"))
	_ = godotenv.Load()

	envMap := make(map[string]string)
	for _, e := range os.Environ() {
		parts := strings.SplitN(e, "=", 2)
		if len(parts) == 2 {
			envMap[parts[0]] = parts[1]
		}
	}

	return loadFromEnv(envMap)
}

// LoadFrom parses configuration from the provided map. It is useful in tests.
func LoadFrom(envMap map[string]string) (*Config, error) {
	return loadFromEnv(envMap)
}

func loadFromEnv(envMap map[string]string) (*Config, error) {
	cfg := &Config{}
	if err := env.ParseWithOptions(cfg, env.Options{Environment: envMap}); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) validate() error {
	if c.GoogleClientID == "" {
		return fmt.Errorf("GOOGLE_CLIENT_ID is required")
	}
	if c.GoogleClientSecret == "" {
		return fmt.Errorf("GOOGLE_CLIENT_SECRET is required")
	}
	if c.GoogleRedirectURI == "" {
		return fmt.Errorf("GOOGLE_REDIRECT_URI is required")
	}
	if c.WebhookSecret == "" {
		return fmt.Errorf("WEBHOOK_SECRET is required")
	}
	return nil
}
