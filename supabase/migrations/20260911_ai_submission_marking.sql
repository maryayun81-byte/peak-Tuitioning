-- ============================================================
-- PEAK CAMPUS HOMESCHOOLING — AI SUBMISSION MARKING (Phase 3)
--
-- The model reads photos of student work and produces DRAFT
-- annotations + corrections. Nothing reaches the student until a
-- teacher reviews and accepts it. Teacher judgment stays final.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_submission_marks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES homeschool_enrollments(id) ON DELETE SET NULL,
  session_id UUID REFERENCES learning_sessions(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  -- images the model actually saw
  image_urls JSONB NOT NULL DEFAULT '[]',
  -- per-image annotations: [{ image_index, x, y (0-100), kind, label, comment }]
  annotations JSONB NOT NULL DEFAULT '[]',
  -- per-question/section findings: [{ ref, verdict, comment, marks_awarded, marks_max }]
  findings JSONB NOT NULL DEFAULT '[]',
  suggested_marks NUMERIC,
  max_marks NUMERIC,
  feedback_draft TEXT,
  strengths_draft TEXT,
  weaknesses_draft TEXT,
  corrections_draft JSONB NOT NULL DEFAULT '[]',
  model TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review','accepted','edited_accepted','dismissed','failed'
  )),
  error TEXT,
  requested_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (submission_id)
);
CREATE INDEX IF NOT EXISTS idx_hs_aimarks_submission ON ai_submission_marks(submission_id);
CREATE INDEX IF NOT EXISTS idx_hs_aimarks_enrollment ON ai_submission_marks(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_hs_aimarks_status ON ai_submission_marks(status);

CREATE TRIGGER trg_hs_aimarks_updated BEFORE UPDATE ON ai_submission_marks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE ai_submission_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages AI markings" ON ai_submission_marks FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher manages assigned AI markings" ON ai_submission_marks FOR ALL USING (
  auth_role() = 'teacher' AND (
    enrollment_id IN (
      SELECT enrollment_id FROM homeschool_teacher_assignments WHERE teacher_id = get_my_teacher_id()
    )
    OR
    assignment_id IN (
      SELECT a.id FROM assignments a
      JOIN teacher_assignments ta ON ta.class_id = a.class_id AND ta.subject_id = a.subject_id
      WHERE ta.teacher_id = get_my_teacher_id()
    )
  )
);
-- Students never see raw AI markings; they see teacher-accepted feedback.

NOTIFY pgrst, 'reload schema';
