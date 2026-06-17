package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"log/slog"
	"path"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"

	"github.com/vishal-android-freak/fitvibe/internal/config"
)

// DB wraps a *sql.DB with application-specific helpers.
type DB struct {
	*sql.DB
	cfg  *config.Config
	pool *pgxpool.Pool
}

// Open opens the PostgreSQL database and applies migrations.
//
// We use pgxpool for connection management and expose a *sql.DB via the pgx
// stdlib adapter so the repository layer keeps using database/sql unchanged.
// Foreign keys are always enforced and concurrent writers are first-class, so
// the per-connection PRAGMA dance the SQLite driver needed is gone.
func Open(cfg *config.Config, logger *slog.Logger) (*DB, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}
	if cfg.DBMaxConns > 0 {
		poolCfg.MaxConns = cfg.DBMaxConns
	}
	if cfg.DBMinConns > 0 {
		poolCfg.MinConns = cfg.DBMinConns
	}

	// Retry the initial connect so a just-started DB (e.g. docker compose up)
	// or a brief network blip doesn't crash startup.
	ctx := context.Background()
	var pool *pgxpool.Pool
	for attempt := 0; attempt < 10; attempt++ {
		pool, err = pgxpool.NewWithConfig(ctx, poolCfg)
		if err == nil {
			pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
			err = pool.Ping(pingCtx)
			cancel()
			if err == nil {
				break
			}
			pool.Close()
		}
		logger.Warn("database not ready, retrying", "attempt", attempt+1, "error", err)
		time.Sleep(time.Duration(attempt+1) * time.Second)
	}
	if err != nil {
		return nil, fmt.Errorf("connect database: %w", err)
	}

	d := &DB{DB: stdlib.OpenDBFromPool(pool), cfg: cfg, pool: pool}
	if err := d.Migrate(); err != nil {
		d.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}

	logger.Info("database opened", "host", poolCfg.ConnConfig.Host, "db", poolCfg.ConnConfig.Database)
	return d, nil
}

// Close closes the underlying database connection pool.
func (d *DB) Close() error {
	err := d.DB.Close()
	if d.pool != nil {
		d.pool.Close()
	}
	return err
}

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Migrate executes all embedded SQL migration files in lexical order.
func (d *DB) Migrate() error {
	files, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var names []string
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".sql") {
			names = append(names, f.Name())
		}
	}
	sort.Strings(names)

	for _, name := range names {
		b, err := migrationsFS.ReadFile(path.Join("migrations", name))
		if err != nil {
			return fmt.Errorf("read migration %s: %w", name, err)
		}
		if _, err := d.Exec(string(b)); err != nil {
			return fmt.Errorf("execute migration %s: %w", name, err)
		}
	}

	return nil
}
