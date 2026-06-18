-- Promote Google's nap flag (sleep payload metadata.nap = true for naps, absent
-- for the main/overnight sleep) to a column so the read API can distinguish a
-- nap from a proper night without digging the JSON. NULL/false = main sleep.
ALTER TABLE data_points ADD COLUMN IF NOT EXISTS is_nap BOOLEAN;
