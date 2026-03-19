ALTER TABLE students 
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_xp_at DATE,
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_at DATE;

COMMENT ON COLUMN students.xp IS 'Cumulative experience points earned by the student';
COMMENT ON COLUMN students.last_login_xp_at IS 'The last date the student received a login XP bonus';
COMMENT ON COLUMN students.streak_count IS 'Number of consecutive days the student has been active';
COMMENT ON COLUMN students.last_active_at IS 'The last date the student was active';
