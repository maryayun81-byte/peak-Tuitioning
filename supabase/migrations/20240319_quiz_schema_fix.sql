-- Add missing columns to quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS instructions TEXT,
ADD COLUMN IF NOT EXISTS time_limit INTEGER;

-- Ensure passing_score logic is aligned (we use pass_mark_percentage in schema logic)
-- No changes needed if we just map in frontend, but good to have the column for clarity if needed.
-- But since pass_mark_percentage is already there, we will just use it.

COMMENT ON COLUMN quizzes.instructions IS 'Special rules or guidelines for the quiz';
COMMENT ON COLUMN quizzes.time_limit IS 'Time limit in minutes (replaces or supplements duration_minutes)';
