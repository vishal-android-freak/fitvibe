-- User-set sleep schedule (the Google Health API does not expose the user's
-- bedtime/wake target, so we store it ourselves). Minutes since local midnight;
-- NULL means the user hasn't set that target.
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_bed_minutes  INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_wake_minutes INTEGER;
