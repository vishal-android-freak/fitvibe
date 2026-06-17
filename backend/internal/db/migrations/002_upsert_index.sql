-- Unique index to support upserts for data_points.
-- A data point is uniquely identified by user, type, and its time coordinates.
-- NULLS NOT DISTINCT makes two rows with the same (user, type) and matching
-- NULL time columns collide as intended (Postgres treats NULLs as distinct by
-- default) — the clean replacement for SQLite's COALESCE(col,'') trick.
CREATE UNIQUE INDEX IF NOT EXISTS idx_data_points_unique
ON data_points (
    user_id,
    data_type,
    sample_time,
    start_time,
    end_time
) NULLS NOT DISTINCT;
