-- ==========================================================
-- Teacher Badge Awarding System
-- Extends study_badges so teachers can award achievement
-- badges to students in the classes/subjects they teach.
-- ==========================================================

-- 1. Extend study_badges with teacher-award metadata
ALTER TABLE study_badges
  ADD COLUMN IF NOT EXISTS awarded_by_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS awarded_reason TEXT;

-- 2. Allow teachers to award badges to students in their classes
DROP POLICY IF EXISTS "Teachers award badges to their students" ON study_badges;
CREATE POLICY "Teachers award badges to their students" ON study_badges
  FOR INSERT
  WITH CHECK (
    awarded_by_teacher_id = get_my_teacher_id()
    AND student_id IN (
      SELECT s.id FROM students s
      JOIN teacher_assignments ta ON ta.class_id = s.class_id
      WHERE ta.teacher_id = get_my_teacher_id()
    )
  );

-- 3. Allow teachers to view badges they awarded (for their own records)
DROP POLICY IF EXISTS "Teachers view badges they awarded" ON study_badges;
CREATE POLICY "Teachers view badges they awarded" ON study_badges
  FOR SELECT
  USING (awarded_by_teacher_id = get_my_teacher_id());

-- 4. Allow teachers to delete badges they awarded (undo mistakes)
DROP POLICY IF EXISTS "Teachers delete badges they awarded" ON study_badges;
CREATE POLICY "Teachers delete badges they awarded" ON study_badges
  FOR DELETE
  USING (awarded_by_teacher_id = get_my_teacher_id());

-- 5. RPC: Award a badge and give XP to the student atomically
CREATE OR REPLACE FUNCTION award_student_badge(
  p_student_id UUID,
  p_badge_type TEXT,
  p_awarded_by_teacher_id UUID,
  p_subject_id UUID DEFAULT NULL,
  p_class_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_xp_reward INT DEFAULT 50
)
RETURNS UUID AS $$
DECLARE
  new_badge_id UUID;
BEGIN
  -- Insert the badge
  INSERT INTO study_badges (
    student_id, badge_type, awarded_by_teacher_id,
    subject_id, class_id, awarded_reason, metadata
  )
  VALUES (
    p_student_id, p_badge_type, p_awarded_by_teacher_id,
    p_subject_id, p_class_id, p_reason,
    jsonb_build_object('xp_reward', p_xp_reward, 'awarded_by', p_awarded_by_teacher_id)
  )
  RETURNING id INTO new_badge_id;

  -- Award XP to the student
  UPDATE students
  SET xp = COALESCE(xp, 0) + p_xp_reward
  WHERE id = p_student_id;

  -- Create a notification for the student
  INSERT INTO notifications (user_id, title, body, type)
  SELECT
    s.user_id,
    '🏅 New Badge Earned!',
    'Your teacher awarded you the "' || p_badge_type || '" badge! +' || p_xp_reward || ' XP',
    'award'
  FROM students s
  WHERE s.id = p_student_id AND s.user_id IS NOT NULL;

  RETURN new_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reload schema
NOTIFY pgrst, 'reload schema';
