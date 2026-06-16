-- The table-level UNIQUE constraint on rollup_data_points includes nullable
-- columns (window_size, data_source_family, start_time, end_time). In SQLite a
-- UNIQUE constraint treats NULLs as distinct, so INSERT OR REPLACE never
-- collapsed rows that differed only by NULLs -> re-running rollup sync or the
-- backfill produced duplicate rollup rows.
--
-- Mirror the data_points approach: a COALESCE-based unique index so identical
-- coordinates (NULLs included) deduplicate correctly.

-- Collapse any existing duplicates first, keeping the most recently fetched row
-- (highest id) for each logical key.
DELETE FROM rollup_data_points
WHERE id NOT IN (
    SELECT MAX(id)
    FROM rollup_data_points
    GROUP BY
        user_id,
        data_type,
        rollup_kind,
        COALESCE(window_size, ''),
        COALESCE(data_source_family, ''),
        COALESCE(start_time, ''),
        COALESCE(end_time, '')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rollup_data_points_unique
ON rollup_data_points (
    user_id,
    data_type,
    rollup_kind,
    COALESCE(window_size, ''),
    COALESCE(data_source_family, ''),
    COALESCE(start_time, ''),
    COALESCE(end_time, '')
);
