-- ============================================================
-- HOMESCHOOLING — Link assignments to learning sessions
-- Reuses the existing assignment/submission engine (§14).
-- ============================================================

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES learning_sessions(id) ON DELETE SET NULL;

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS week_id UUID REFERENCES homeschool_weeks(id) ON DELETE SET NULL;

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS program TEXT NOT NULL DEFAULT 'GROUP_TUITION'
  CHECK (program IN ('GROUP_TUITION', 'HOMESCHOOLING'));

CREATE INDEX IF NOT EXISTS idx_assignments_session ON assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_assignments_week ON assignments(week_id);
CREATE INDEX IF NOT EXISTS idx_assignments_program ON assignments(program);

-- ============================================================
-- RLS: homeschool students see published assignments linked
-- to their own enrollment sessions (alongside class-based rule)
-- ============================================================
CREATE POLICY "Student views linked homeschool assignments" ON assignments FOR SELECT USING (
  status = 'published'
  AND program = 'HOMESCHOOLING'
  AND session_id IN (
    SELECT ls.id FROM learning_sessions ls
    JOIN homeschool_enrollments he ON he.id = ls.enrollment_id
    WHERE he.student_id = get_my_student_id()
  )
);

-- Teachers assigned to the linked session can manage the assignment
-- even when they are not the recorded creator (e.g. admin-created).
CREATE POLICY "Teacher manages linked session assignments" ON assignments FOR ALL USING (
  auth_role() = 'teacher'
  AND session_id IN (
    SELECT id FROM learning_sessions WHERE teacher_id = get_my_teacher_id()
  )
);

-- Parents see published homeschool assignments linked to their child.
CREATE POLICY "Parent views child homeschool assignments" ON assignments FOR SELECT USING (
  status = 'published'
  AND program = 'HOMESCHOOLING'
  AND session_id IN (
    SELECT ls.id FROM learning_sessions ls
    JOIN homeschool_enrollments he ON he.id = ls.enrollment_id
    JOIN students s ON s.id = he.student_id
    WHERE s.parent_id = get_my_parent_id()
  )
);

-- ============================================================
-- RLS: teachers of linked sessions can review those submissions
-- ============================================================
CREATE POLICY "Teacher views linked session submissions" ON submissions FOR SELECT USING (
  assignment_id IN (
    SELECT a.id FROM assignments a
    JOIN learning_sessions ls ON ls.id = a.session_id
    WHERE ls.teacher_id = get_my_teacher_id()
  )
);

CREATE POLICY "Teacher updates linked session submissions" ON submissions FOR UPDATE USING (
  assignment_id IN (
    SELECT a.id FROM assignments a
    JOIN learning_sessions ls ON ls.id = a.session_id
    WHERE ls.teacher_id = get_my_teacher_id()
  )
);
