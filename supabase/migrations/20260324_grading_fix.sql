-- Grading System Schema Fix
-- Adds missing columns that were supposed to be in V2 but are missing in the current schema.

-- 1. Add class_id to grading_systems
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;

-- 2. Add is_default to grading_systems
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- 3. Add unique constraint to prevent duplicates for specific subject/class combinations
-- We'll use a unique index to handle existing duplicates if any (though unlikely if it was failing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gs_unique_combo ON grading_systems (curriculum_id, COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'), COALESCE(class_id, '00000000-0000-0000-0000-000000000000'), name);

-- 4. Refresh schema cache
NOTIFY pgrst, 'reload schema';
