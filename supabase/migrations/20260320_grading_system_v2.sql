-- Grading System V2 Infrastructure
-- Supports relational grading scales and CBC standards.

-- 1. Drop the legacy grading systems table
-- WARNING: This clears old grading configurations to ensure a clean migration 
-- to the new structured system.
DROP TABLE IF EXISTS grading_systems CASCADE;

-- 2. Create the new grading_systems table
CREATE TABLE grading_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(curriculum_id, subject_id, class_id, name)
);

-- 3. Create the grading_scales table
CREATE TABLE grading_scales (
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

-- 4. Enable RLS
ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS Policies
CREATE POLICY "All can view grading systems" ON grading_systems FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages grading systems" ON grading_systems FOR ALL USING (auth_role() = 'admin');

CREATE POLICY "All can view grading scales" ON grading_scales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages grading scales" ON grading_scales FOR ALL USING (auth_role() = 'admin');

-- 6. Indexes for performance
CREATE INDEX idx_gs_curriculum ON grading_systems(curriculum_id);
CREATE INDEX idx_gs_subject ON grading_systems(subject_id);
CREATE INDEX idx_scales_system ON grading_scales(grading_system_id);

-- Refresh schema
NOTIFY pgrst, 'reload schema';
