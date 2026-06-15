-- Unique index to support upserts for data_points.
-- A data point is uniquely identified by user, type, and its time coordinates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_data_points_unique
ON data_points (
    user_id,
    data_type,
    COALESCE(sample_time, ''),
    COALESCE(start_time, ''),
    COALESCE(end_time, '')
);
