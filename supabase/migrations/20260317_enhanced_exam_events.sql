-- ENHANCED EXAM EVENTS SYSTEM
-- Adds granular targeting, start/end dates, and expanded statuses.

-- 1. Update status check constraint
-- First drop existing constraint if possible, but standard ALTER TABLE is easier for status updates if we just replace it.
ALTER TABLE exam_events DROP CONSTRAINT IF EXISTS exam_events_status_check;

-- 2. Add new columns and ensure curriculum_id exists
ALTER TABLE exam_events 
ADD COLUMN IF NOT EXISTS curriculum_id UUID REFERENCES curriculums(id),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS target_class_ids UUID[] DEFAULT '{}';

-- 2b. Ensure curriculum_id is nullable (it will be by default with ADD COLUMN, but just in case)
ALTER TABLE exam_events ALTER COLUMN curriculum_id DROP NOT NULL;

-- 3. Re-add status constraint with new values
-- Values: 'upcoming', 'active', 'closed', 'cancelled', 'ended', 'generated', 'published'
-- Note: status already exists from previous migration but we need to ensure all new ones are allowed.
DO $$ 
BEGIN
    ALTER TABLE exam_events 
    ADD CONSTRAINT exam_events_status_check 
    CHECK (status IN ('upcoming', 'active', 'closed', 'cancelled', 'ended', 'generated', 'published'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 4. RLS Refresh (Admin manages all, but ensuring selection is open for filtering)
-- Existing policies:
-- "All authenticated can view exam events" ON exam_events FOR SELECT USING (auth.uid() IS NOT NULL);
-- "Admin manages exam events" ON exam_events FOR ALL USING (auth_role() = 'admin');

-- Refresh schema for PostgREST
NOTIFY pgrst, 'reload schema';
