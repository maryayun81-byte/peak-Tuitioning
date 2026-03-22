-- Grading System V3 Enhancements
-- 1. Add is_overall to grading_systems for transcript mean grade calculation
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS is_overall BOOLEAN DEFAULT false;

-- 2. Enhance exam_marks with grade and trace to the grading system used
ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS grading_system_id UUID REFERENCES grading_systems(id);

-- 3. Update existing marks (optional/best effort if needed, but usually marks are fresh)

-- 4. Re-enable RLS for safety (already enabled but good practice)
ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_marks ENABLE ROW LEVEL SECURITY;

-- 5. Refresh schema
NOTIFY pgrst, 'reload schema';
