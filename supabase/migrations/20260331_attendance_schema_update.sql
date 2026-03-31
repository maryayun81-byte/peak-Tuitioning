-- ==========================================================
-- UPDATE ATTENDANCE SCHEMA
-- Adds 'status' and 'week_number' to support advanced tracking.
-- ==========================================================

ALTER TABLE IF EXISTS attendance
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present',
ADD COLUMN IF NOT EXISTS week_number INTEGER,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Drop 'present' column if you no longer need the boolean field, 
-- or leave it for backward compatibility if other places use it.
-- ALTER TABLE attendance DROP COLUMN IF EXISTS present;
