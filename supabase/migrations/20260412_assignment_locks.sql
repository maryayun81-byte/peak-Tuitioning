-- Add lock_after_deadline to assignments
-- This allows teachers to explicitly block submissions after the due date.

ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS lock_after_deadline BOOLEAN DEFAULT FALSE;

-- Ensure RLS is updated (though not strictly necessary as it's a new column)
-- Comments for documentation
COMMENT ON COLUMN assignments.lock_after_deadline IS 'If true, students cannot submit or edit submissions after the due_date has passed.';
