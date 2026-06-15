package db

import (
	"database/sql"
	"embed"
	"fmt"
	"log/slog"
	"path"
	"sort"
	"strings"

	_ "turso.tech/database/tursogo"

	"github.com/vishal-android-freak/fitvibe/internal/config"
)

// DB wraps a *sql.DB with application-specific helpers.
type DB struct {
	*sql.DB
	cfg *config.Config
}

// Open opens a local Turso (libSQL) database and applies migrations.
func Open(cfg *config.Config, logger *slog.Logger) (*DB, error) {
	db, err := sql.Open("turso", cfg.TursoDatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	d := &DB{DB: db, cfg: cfg}
	if err := d.applyPragmas(); err != nil {
		return nil, fmt.Errorf("apply pragmas: %w", err)
	}

	if err := d.Migrate(); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}

	logger.Info("database opened", "url", cfg.TursoDatabaseURL)
	return d, nil
}

func (d *DB) applyPragmas() error {
	pragmas := []string{
		"PRAGMA foreign_keys = ON",
		fmt.Sprintf("PRAGMA busy_timeout = %d", d.cfg.SQLiteBusyTimeoutMs),
		"PRAGMA journal_mode = WAL",
	}

	if d.cfg.TursoEncryptionKey != "" {
		pragmas = append(pragmas, fmt.Sprintf("PRAGMA encryption_key = '%s'", d.cfg.TursoEncryptionKey))
	}

	for _, p := range pragmas {
		if _, err := d.Exec(p); err != nil {
			return fmt.Errorf("%s: %w", p, err)
		}
	}
	return nil
}

// Close closes the underlying database connection.
func (d *DB) Close() error {
	return d.DB.Close()
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
