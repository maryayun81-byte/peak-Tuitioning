-- [MIGRATION] Add Workbook Mode and refined gamification support

-- 1. Add is_workbook flag to assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_workbook BOOLEAN DEFAULT FALSE;

-- 2. Add description/instruction support for assignments if missing (for the "illustrations/images" part)
-- (Already exists in most schemas as 'description' or 'instructions')

-- 3. Ensure students table has XP column (already exists based on code)

-- 4. Create an index for faster grading lookups
CREATE INDEX IF NOT EXISTS idx_submissions_status_assignment ON submissions(status, assignment_id);
