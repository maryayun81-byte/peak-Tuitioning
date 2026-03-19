-- FIX: teacher_teaching_map schema
-- The original migration incorrectly referenced profiles(id) for teacher_id.
-- Teachers have their own UUID in the teachers table (not equal to profiles.id).
-- This migration drops and recreates the table with the correct foreign key.

-- Drop existing table (safe since onboarding hasn't worked yet)
DROP TABLE IF EXISTS teacher_teaching_map CASCADE;

-- Recreate with correct FK pointing to teachers(id)
CREATE TABLE teacher_teaching_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- Row Level Security
ALTER TABLE teacher_teaching_map ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own map (using teachers.user_id -> auth.uid())
DROP POLICY IF EXISTS "Teachers can manage own teaching map" ON teacher_teaching_map;
CREATE POLICY "Teachers can manage own teaching map"
ON teacher_teaching_map FOR ALL
USING (teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()));

-- Admins can view and manage all
DROP POLICY IF EXISTS "Admins can view all teaching maps" ON teacher_teaching_map;
CREATE POLICY "Admins can view all teaching maps"
ON teacher_teaching_map FOR ALL
USING (auth_role() = 'admin');

-- Grant permissions
GRANT ALL ON TABLE teacher_teaching_map TO authenticated;
GRANT ALL ON TABLE teacher_teaching_map TO service_role;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
