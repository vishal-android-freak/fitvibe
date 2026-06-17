package db

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
)

// testCounter makes each test schema name unique within a process run.
var testCounter int

// OpenTestDB connects to a Postgres test database and applies migrations into a
// fresh, uniquely-named schema (dropped on test cleanup) so tests are isolated
// and can run in parallel. It returns nil when no Postgres is reachable — the
// caller should t.Skip in that case — so the suite still runs where there's no DB.
//
// Connection comes from TEST_DATABASE_URL, defaulting to the local docker
// compose instance.
func OpenTestDB(t *testing.T) *DB {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://fitvibe:fitvibe@localhost:5432/fitvibe?sslmode=disable"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	poolCfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil
	}

	// Unique schema per test; route this pool's sessions to it via search_path.
	testCounter++
	schema := fmt.Sprintf("test_%d_%d", os.Getpid(), testCounter)
	poolCfg.ConnConfig.RuntimeParams["search_path"] = schema

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil
	}

	// Drop first in case a previous run was killed before its cleanup ran and a
	// pid was reused, then create fresh.
	if _, err := pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %q CASCADE", schema)); err != nil {
		pool.Close()
		return nil
	}
	if _, err := pool.Exec(ctx, fmt.Sprintf("CREATE SCHEMA %q", schema)); err != nil {
		pool.Close()
		return nil
	}

	d := &DB{DB: stdlib.OpenDBFromPool(pool), cfg: nil, pool: pool}
	if err := d.Migrate(); err != nil {
		// Best-effort cleanup, then fail the test loudly — a migration error is
		// a real bug, not a "no DB" skip.
		dropSchema(pool, schema)
		d.Close()
		t.Fatalf("apply migrations to test schema: %v", err)
		return nil
	}

	t.Cleanup(func() { dropSchema(pool, schema) })
	return d
}

func dropSchema(pool *pgxpool.Pool, schema string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, _ = pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %q CASCADE", schema))
}
