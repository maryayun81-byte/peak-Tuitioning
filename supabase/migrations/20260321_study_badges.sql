-- Study Badges & Achievements
-- Tracks earned badges for students (e.g., Weekly Mastery)

CREATE TABLE IF NOT EXISTS study_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL, -- e.g. 'weekly_mastery', 'consistency_king'
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE study_badges ENABLE ROW LEVEL SECURITY;

-- 1. Students can view their own badges
DROP POLICY IF EXISTS "Students view own badges" ON study_badges;
CREATE POLICY "Students view own badges" ON study_badges
  FOR SELECT USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

-- 2. Students can record their own badges
DROP POLICY IF EXISTS "Students record own badges" ON study_badges;
CREATE POLICY "Students record own badges" ON study_badges
  FOR INSERT WITH CHECK (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

-- 3. Parents can view their linked students' badges
DROP POLICY IF EXISTS "Parents view student badges" ON study_badges;
CREATE POLICY "Parents view student badges" ON study_badges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_links psl
      JOIN parents p ON psl.parent_id = p.id
      WHERE psl.student_id = study_badges.student_id
      AND p.user_id = auth.uid()
    )
  );

-- 4. Admins view all
DROP POLICY IF EXISTS "Admins manage all badges" ON study_badges;
CREATE POLICY "Admins manage all badges" ON study_badges
  FOR ALL USING (auth_role() = 'admin');

-- Add Index
CREATE INDEX IF NOT EXISTS idx_study_badges_student ON study_badges(student_id);

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
