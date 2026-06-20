/**
 * Postgres access for the Vaidya service. This service OWNS the vaidya_* tables
 * (read+write) and reads `users` for identity. (Health-data reads go through the
 * MCP server, not this pool.) Tables are created on startup via
 * CREATE TABLE IF NOT EXISTS — the service owns them, not the Go migrator.
 */

import pg from "pg";

let pool: pg.Pool | null = null;

export function initDb(connectionString: string): void {
  if (!pool) pool = new pg.Pool({ connectionString, max: 5 });
}

export function db(): pg.Pool {
  if (!pool) throw new Error("db pool not initialized");
  return pool;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Create the vaidya_* tables this service owns. Idempotent. */
export async function ensureTables(): Promise<void> {
  await db().query(`
    CREATE TABLE IF NOT EXISTS vaidya_insights (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,                 -- 'sleep' | 'today_insight' | 'day_insight'
      civil_date DATE NOT NULL,           -- the local day the insight is about
      sleep_data_point_id BIGINT,         -- for per-sleep insights (which session)
      pi_session_id TEXT NOT NULL,        -- replay content via the Pi SDK
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // One insight per (user, type, day[, sleep session]). NULLS NOT DISTINCT so a
  // null sleep_data_point_id (today/day insights) still collides on re-run.
  await db().query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vaidya_insights_unique
      ON vaidya_insights (user_id, type, civil_date, sleep_data_point_id)
      NULLS NOT DISTINCT;
  `);
  await db().query(`
    CREATE INDEX IF NOT EXISTS idx_vaidya_insights_lookup
      ON vaidya_insights (user_id, type, civil_date DESC);
  `);
}

/** Resolve a Firebase/Google uid to the internal user id. */
export async function userIdByGoogleUserId(googleUserId: string): Promise<number | null> {
  const r = await db().query<{ id: string }>(
    `SELECT id FROM users WHERE google_user_id = $1`,
    [googleUserId],
  );
  return r.rows[0] ? Number(r.rows[0].id) : null;
}

/** All users with stored health data (for the crons to iterate). */
export async function activeUserIds(): Promise<number[]> {
  const r = await db().query<{ id: string }>(
    `SELECT DISTINCT u.id FROM users u
     WHERE EXISTS (SELECT 1 FROM data_points d WHERE d.user_id = u.id)
     ORDER BY u.id`,
  );
  return r.rows.map((row) => Number(row.id));
}

/** Sleep sessions (incl. naps) whose local civil end-date is the given day, for
 *  the sleep-watch cron. Returns the data_point ids. */
export async function sleepSessionsForDate(userId: number, civilDate: string): Promise<number[]> {
  const r = await db().query<{ id: string }>(
    `SELECT id FROM data_points
     WHERE user_id = $1 AND data_type = 'sleep'
       AND start_time IS NOT NULL AND end_time IS NOT NULL
       AND COALESCE(civil_end_date, date(end_time)) = $2::date
     ORDER BY end_time`,
    [userId, civilDate],
  );
  return r.rows.map((row) => Number(row.id));
}

/** The user's current local civil date via the latest data-point offset
 *  (mirrors the Go read API / MCP localdate). Falls back to UTC. */
export async function localDate(userId: number): Promise<string> {
  const r = await db().query<{ off: number | null }>(
    `SELECT start_utc_offset_seconds AS off FROM data_points
     WHERE user_id = $1 AND start_utc_offset_seconds IS NOT NULL
     ORDER BY COALESCE(start_time, sample_time) DESC LIMIT 1`,
    [userId],
  );
  const offset = r.rows[0]?.off ?? 0;
  const now = new Date(Date.now() + offset * 1000);
  return now.toISOString().slice(0, 10);
}
