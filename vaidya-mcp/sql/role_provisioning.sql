-- Vaidya MCP read-only role. Run ONCE by a Postgres superuser/owner.
--
-- The MCP server connects as this role. It can SELECT the health tables the read
-- tools need, and has NO INSERT/UPDATE/DELETE anywhere — Vaidya's writes go to
-- the Google Health API, never to Postgres (only the Go server writes data).
--
-- Replace the password before running. Then point DATABASE_URL_READONLY at it.

-- 1. The role.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vaidya_ro') THEN
    CREATE ROLE vaidya_ro LOGIN PASSWORD 'CHANGE_ME';
  END IF;
END
$$;

-- 2. Connect + schema usage (adjust db/schema names if different).
GRANT CONNECT ON DATABASE fitvibe TO vaidya_ro;
GRANT USAGE ON SCHEMA public TO vaidya_ro;

-- 3. SELECT on exactly the tables the read tools query. No write grants.
GRANT SELECT ON
  users,
  data_points,
  rollup_data_points,
  health_data_records,
  sleep_stages,
  sleep_summary_stages,
  nutrition_log_nutrients,
  food_items,
  daily_heart_rate_zones,
  active_minutes_by_level
TO vaidya_ro;

-- 4. Defense in depth: make sure the role can never write, even if a future
--    GRANT slips in. (Revoke is a no-op if nothing was granted.)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM vaidya_ro;

-- Note: when new health tables are added, extend the GRANT SELECT list above.
-- The role intentionally has no default-privilege grant, so new tables are
-- inaccessible until explicitly granted — fail closed.
