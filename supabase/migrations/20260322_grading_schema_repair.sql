-- Grading System Schema Repair & Reconciliation
-- Ensures that grading_systems and grading_scales are correctly structured.

-- 1. Ensure grading_systems exists with the correct columns
CREATE TABLE IF NOT EXISTS grading_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(curriculum_id, subject_id, class_id, name)
);

-- Add is_overall if it was missing from the initial migration
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grading_systems' AND column_name='is_overall') THEN
    ALTER TABLE grading_systems ADD COLUMN is_overall BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 2. Ensure grading_scales exists
CREATE TABLE IF NOT EXISTS grading_scales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grading_system_id UUID NOT NULL REFERENCES grading_systems(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  min_score NUMERIC(5,2) NOT NULL,
  max_score NUMERIC(5,2) NOT NULL,
  points INTEGER,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT score_range_check CHECK (min_score <= max_score)
);

-- 3. Enable RLS
ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;

-- 4. Idempotent RLS Policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "All can view grading systems" ON grading_systems;
    DROP POLICY IF EXISTS "Admin manages grading systems" ON grading_systems;
    DROP POLICY IF EXISTS "All can view grading scales" ON grading_scales;
    DROP POLICY IF EXISTS "Admin manages grading scales" ON grading_scales;
END $$;

CREATE POLICY "All can view grading systems" ON grading_systems FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages grading systems" ON grading_systems FOR ALL USING (auth_role() = 'admin');

CREATE POLICY "All can view grading scales" ON grading_scales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages grading scales" ON grading_scales FOR ALL USING (auth_role() = 'admin');

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_gs_curriculum_v2 ON grading_systems(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_gs_subject_v2 ON grading_systems(subject_id);
CREATE INDEX IF NOT EXISTS idx_scales_system_v2 ON grading_scales(grading_system_id);

-- 6. Trigger for schema cache refresh
NOTIFY pgrst, 'reload schema';
