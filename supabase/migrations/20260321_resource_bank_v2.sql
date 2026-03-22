-- Add chapter and is_practice to resources table
-- Supports Resource Bank organization and specialized practice flows.

ALTER TABLE resources ADD COLUMN IF NOT EXISTS chapter TEXT DEFAULT 'General';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS is_practice BOOLEAN DEFAULT FALSE;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
