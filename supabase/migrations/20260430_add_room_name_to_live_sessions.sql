-- Ensure live_sessions table has all required columns for the new Studio engine
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS room_name TEXT;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS duration_mins INTEGER DEFAULT 60;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'subject';

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_live_sessions_room_name ON live_sessions(room_name);
