-- Add locking columns to trivia_groups
ALTER TABLE trivia_groups 
ADD COLUMN IF NOT EXISTS attempt_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attempt_started_by UUID REFERENCES students(id);

-- Reset existing groups just in case
UPDATE trivia_groups SET attempt_started_at = NULL, attempt_started_by = NULL;
