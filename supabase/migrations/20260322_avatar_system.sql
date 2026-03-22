-- Add avatar_metadata to profiles to support the Avatar Studio
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_metadata JSONB DEFAULT '{}'::jsonb;

-- Update RLS if needed (profiles is already editable by the user themselves)
-- Policy "Users update own profile" already exists and covers this column.

-- Add a column to study_goals to track if it's "achieved" (distinct from completed if needed, 
-- but I'll use is_completed which already exists)

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
