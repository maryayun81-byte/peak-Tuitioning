-- ADD FINALIZED STATUS TO EXAM EVENTS
-- This adds the new "finalized" status that allows teachers to record marks while active/closed mean different things.

-- First drop existing constraint
ALTER TABLE exam_events DROP CONSTRAINT IF EXISTS exam_events_status_check;

-- Add updated constraint with 'finalized'
ALTER TABLE exam_events 
ADD CONSTRAINT exam_events_status_check 
CHECK (status IN ('upcoming', 'active', 'finalized', 'closed', 'cancelled', 'ended', 'generated', 'published'));

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
