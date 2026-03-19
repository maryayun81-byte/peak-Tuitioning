-- TEACHER ONBOARDING SYSTEM V2
-- This migration updates the profiles table and creates a structured mapping for teacher preferences.

-- 1. Update Profiles Table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_onboarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE;

-- 2. Create Teacher Teaching Mapping Table (Hierarchical: Subject -> Classes)
CREATE TABLE IF NOT EXISTS teacher_teaching_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- 3. Row Level Security
ALTER TABLE teacher_teaching_map ENABLE ROW LEVEL SECURITY;

-- 4. Policies for teacher_teaching_map
DROP POLICY IF EXISTS "Teachers can manage own teaching map" ON teacher_teaching_map;
CREATE POLICY "Teachers can manage own teaching map" 
ON teacher_teaching_map FOR ALL 
USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all teaching maps" ON teacher_teaching_map;
CREATE POLICY "Admins can view all teaching maps" 
ON teacher_teaching_map FOR SELECT 
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 5. Helper Function for cleaner auth role (Ensures consistency)
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT (COALESCE(auth.jwt() -> 'user_metadata', auth.jwt() -> 'app_metadata') ->> 'role')::text;
$$ LANGUAGE sql STABLE;

-- 6. Grant Permissions
GRANT ALL ON TABLE teacher_teaching_map TO authenticated;
GRANT ALL ON TABLE teacher_teaching_map TO service_role;

-- 7. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
