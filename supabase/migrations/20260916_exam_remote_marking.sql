-- ============================================================
-- PHASE A: remote exam-script marking
-- Photo intake (admin) → teacher marking workspace → recorded exam marks,
-- for tuition centers AND homeschool enrollments.
-- Apply in Supabase Dashboard > SQL Editor (or `supabase db push`).
-- ============================================================

-- 1. Link marking assignments to exam events.
-- A script-marking assignment is a workbook assignment whose marks also
-- flow into exam_marks on save/return.
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS exam_event_id UUID REFERENCES exam_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_exam_event ON assignments(exam_event_id);

-- 2. Scope exam events: tuition centers AND homeschool enrollments.
ALTER TABLE exam_events
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'tuition';

DO $$
BEGIN
  ALTER TABLE exam_events
    ADD CONSTRAINT exam_events_scope_check CHECK (scope IN ('tuition', 'homeschool'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE exam_events
  ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES homeschool_enrollments(id) ON DELETE CASCADE;

-- Homeschool events carry an enrollment instead of a tuition event.
ALTER TABLE exam_events ALTER COLUMN tuition_event_id DROP NOT NULL;

DO $$
BEGIN
  ALTER TABLE exam_events
    ADD CONSTRAINT exam_events_scope_target_check
    CHECK (tuition_event_id IS NOT NULL OR enrollment_id IS NOT NULL);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_events_enrollment ON exam_events(enrollment_id);

-- 3. Parents can view their children's submissions (marked papers + results).
DROP POLICY IF EXISTS "Parent views child submissions" ON submissions;
CREATE POLICY "Parent views child submissions" ON submissions FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE parent_id = get_my_parent_id())
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
