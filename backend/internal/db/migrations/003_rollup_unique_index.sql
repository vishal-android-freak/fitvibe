-- (PostgreSQL) The rollup_data_points uniqueness is now enforced inline in
-- 001_initial_schema.sql via a UNIQUE NULLS NOT DISTINCT constraint, which is
-- the native equivalent of the old SQLite COALESCE(col,'') unique index.
--
-- On the original SQLite schema this migration also ran a one-time DELETE to
-- collapse pre-existing duplicate rollup rows. On a fresh Postgres database
-- there is nothing to collapse, so this file is intentionally a no-op kept only
-- to preserve migration ordering.
SELECT 1;
