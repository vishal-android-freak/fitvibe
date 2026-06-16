package db

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"embed"
	"fmt"
	"log/slog"
	"path"
	"sort"
	"strings"

	tursogo "turso.tech/database/tursogo"

	"github.com/vishal-android-freak/fitvibe/internal/config"
)

// DB wraps a *sql.DB with application-specific helpers.
type DB struct {
	*sql.DB
	cfg *config.Config
}

// Open opens a local Turso (libSQL) database and applies migrations.
//
// The tursogo driver applies no per-connection PRAGMA defaults beyond busy
// timeout, and foreign-key enforcement defaults OFF (SQLite compatibility).
// Running PRAGMAs on the *sql.DB only configures whichever pooled connection
// served the call, leaving other connections with foreign_keys OFF — so
// ON DELETE CASCADE would silently not fire. We therefore wrap the driver's
// connector so the session PRAGMAs run on every new connection.
func Open(cfg *config.Config, logger *slog.Logger) (*DB, error) {
	connector, err := tursogo.NewConnector(cfg.TursoDatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	pragmas := []string{
		"PRAGMA foreign_keys = ON",
		fmt.Sprintf("PRAGMA busy_timeout = %d", cfg.SQLiteBusyTimeoutMs),
		"PRAGMA journal_mode = WAL",
	}
	if cfg.TursoEncryptionKey != "" {
		pragmas = append(pragmas, fmt.Sprintf("PRAGMA encryption_key = '%s'", cfg.TursoEncryptionKey))
	}

	db := sql.OpenDB(&pragmaConnector{inner: connector, pragmas: pragmas})

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	d := &DB{DB: db, cfg: cfg}
	if err := d.Migrate(); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}

	logger.Info("database opened", "url", cfg.TursoDatabaseURL)
	return d, nil
}

// pragmaConnector wraps a driver.Connector and runs a fixed set of PRAGMAs on
// every connection it hands out, so pool-wide session state is consistent.
type pragmaConnector struct {
	inner   driver.Connector
	pragmas []string
}

func (c *pragmaConnector) Connect(ctx context.Context) (driver.Conn, error) {
	conn, err := c.inner.Connect(ctx)
	if err != nil {
		return nil, err
	}
	execer, ok := conn.(driver.ExecerContext)
	if !ok {
		conn.Close()
		return nil, fmt.Errorf("turso connection does not support ExecerContext")
	}
	for _, p := range c.pragmas {
		if _, err := execer.ExecContext(ctx, p, nil); err != nil {
			conn.Close()
			return nil, fmt.Errorf("apply pragma %q: %w", p, err)
		}
	}
	return conn, nil
}

func (c *pragmaConnector) Driver() driver.Driver { return c.inner.Driver() }

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
