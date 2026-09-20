-- ============================================================
-- 20260920_homeschool_examination_system.sql
-- Unified homeschool examination + assessment + results engine.
-- Reuses: exam_events, exams/exam_questions/exam_submissions,
-- assignments/submissions/annotations, exam_marks,
-- grading_systems/grading_scales, transcripts.
-- Adds: per-subject delivery mode, timetable trigger, verification
-- + publication states, audit trail, physical-paper tracking.
-- Idempotent: safe to run via `supabase db push`.
-- ============================================================

-- 1. Per-subject delivery + ownership inside one exam event.
-- One event (e.g. FORM 3 END TERM) -> many subjects, each online /
-- physical / hybrid, each owned by a teacher paper.
CREATE TABLE IF NOT EXISTS public.exam_event_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_event_id UUID NOT NULL REFERENCES public.exam_events(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  delivery_mode TEXT NOT NULL DEFAULT 'physical'
    CHECK (delivery_mode IN ('online', 'physical', 'hybrid')),
  exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  total_marks NUMERIC(10,2) NOT NULL DEFAULT 100,
  time_allowed_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','configured','ready','approved','scheduled','live','closed','marking','verified','published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_event_id, subject_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_event_subjects_event ON public.exam_event_subjects(exam_event_id);
CREATE INDEX IF NOT EXISTS idx_exam_event_subjects_teacher ON public.exam_event_subjects(teacher_id);

-- 2. Timetable entry drives online availability.
-- Student sees ENTER EXAM only inside [starts_at, ends_at].
CREATE TABLE IF NOT EXISTS public.exam_timetable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_event_id UUID NOT NULL REFERENCES public.exam_events(id) ON DELETE CASCADE,
  event_subject_id UUID REFERENCES public.exam_event_subjects(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  venue TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_exam_timetable_event ON public.exam_timetable(exam_event_id);
CREATE INDEX IF NOT EXISTS idx_exam_timetable_subject ON public.exam_timetable(event_subject_id);

-- 3. Result lifecycle on top of exam_marks (single result engine).
-- submitted -> marked -> verified -> published. Corrections reopen.
ALTER TABLE public.exam_marks
  ADD COLUMN IF NOT EXISTS max_marks NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS teacher_comment TEXT,
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES public.submissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exam_submission_id UUID REFERENCES public.exam_submissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS result_status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (result_status IN ('not_started','submitted','marked','verified','published')),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Backfill max_marks where missing (paper total defaults to 100).
UPDATE public.exam_marks SET max_marks = COALESCE(max_marks, 100) WHERE max_marks IS NULL;

-- 4. Physical-paper tracking: admin upload -> teacher marking -> return.
-- Pages live in assignment-uploads storage; this table is the queue.
CREATE TABLE IF NOT EXISTS public.exam_physical_papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_event_id UUID NOT NULL REFERENCES public.exam_events(id) ON DELETE CASCADE,
  event_subject_id UUID REFERENCES public.exam_event_subjects(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  pages JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded','assigned','marking','marked','returned','verified','published')),
  assigned_teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physical_papers_event ON public.exam_physical_papers(exam_event_id);
CREATE INDEX IF NOT EXISTS idx_physical_papers_teacher ON public.exam_physical_papers(assigned_teacher_id);
CREATE INDEX IF NOT EXISTS idx_physical_papers_student ON public.exam_physical_papers(student_id);

-- 5. Audit trail: every mark / verify / publish / correction is logged.
CREATE TABLE IF NOT EXISTS public.exam_result_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_event_id UUID REFERENCES public.exam_events(id) ON DELETE CASCADE,
  exam_mark_id UUID REFERENCES public.exam_marks(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  actor_id UUID,
  actor_role TEXT,
  action TEXT NOT NULL,
  old_marks NUMERIC(10,2),
  new_marks NUMERIC(10,2),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_audit_event ON public.exam_result_audit(exam_event_id);
CREATE INDEX IF NOT EXISTS idx_exam_audit_mark ON public.exam_result_audit(exam_mark_id);

-- 6. Online-attempt hardening fields (briefing, autosave, review window).
ALTER TABLE public.exam_submissions
  ADD COLUMN IF NOT EXISTS event_subject_id UUID REFERENCES public.exam_event_subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_answers JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS background_events JSONB NOT NULL DEFAULT '[]';

-- Widen integrity event types for evidence-not-accusation logging.
DO $$
BEGIN
  ALTER TABLE public.exam_integrity_logs DROP CONSTRAINT IF EXISTS exam_integrity_logs_event_type_check;
  ALTER TABLE public.exam_integrity_logs
    ADD CONSTRAINT exam_integrity_logs_event_type_check CHECK (event_type IN (
      'tab_switch','fullscreen_exit','paste_attempt','idle_warning','copy_attempt',
      'focus_loss','connection_lost','connection_restored','review_started',
      'auto_submit','late_start','timetable_changed','paper_changed'
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 7. Transcripts: homeschool enrollments + overall mean-grade trace.
ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES public.homeschool_enrollments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS overall_points NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS grading_system_id UUID REFERENCES public.grading_systems(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transcripts_enrollment ON public.transcripts(enrollment_id);

-- 8. updated_at triggers.
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_event_subjects ON public.exam_event_subjects;
CREATE TRIGGER set_updated_at_event_subjects BEFORE UPDATE ON public.exam_event_subjects
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_physical_papers ON public.exam_physical_papers;
CREATE TRIGGER set_updated_at_physical_papers BEFORE UPDATE ON public.exam_physical_papers
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 9. RLS: admin full, teacher scoped to own subjects/papers, student/parent read published.
ALTER TABLE public.exam_event_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_physical_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_result_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages event subjects" ON public.exam_event_subjects;
CREATE POLICY "Admin manages event subjects" ON public.exam_event_subjects FOR ALL USING (auth_role() = 'admin');

DROP POLICY IF EXISTS "All authenticated view event subjects" ON public.exam_event_subjects;
CREATE POLICY "All authenticated view event subjects" ON public.exam_event_subjects FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin manages timetable" ON public.exam_timetable;
CREATE POLICY "Admin manages timetable" ON public.exam_timetable FOR ALL USING (auth_role() = 'admin');

DROP POLICY IF EXISTS "All authenticated view timetable" ON public.exam_timetable;
CREATE POLICY "All authenticated view timetable" ON public.exam_timetable FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin manages physical papers" ON public.exam_physical_papers;
CREATE POLICY "Admin manages physical papers" ON public.exam_physical_papers FOR ALL USING (auth_role() = 'admin');

DROP POLICY IF EXISTS "Teacher views assigned papers" ON public.exam_physical_papers;
CREATE POLICY "Teacher views assigned papers" ON public.exam_physical_papers FOR SELECT USING (
  auth_role() = 'teacher' OR auth_role() = 'admin' OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Students insert own physical refs" ON public.exam_physical_papers;
CREATE POLICY "Students insert own physical refs" ON public.exam_physical_papers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin manages audit" ON public.exam_result_audit;
CREATE POLICY "Admin manages audit" ON public.exam_result_audit FOR ALL USING (auth_role() = 'admin' OR auth.uid() IS NOT NULL);

-- 10. Helper: grade from configured system (subject -> overall fallback).
-- Uses grading_scales(min_score/max_score). Never hardcodes grades in UI.
CREATE OR REPLACE FUNCTION public.exam_grade_for_mark(
  p_curriculum_id UUID,
  p_mark NUMERIC,
  p_subject_id UUID DEFAULT NULL,
  p_class_id UUID DEFAULT NULL
) RETURNS TABLE (grade TEXT, points NUMERIC, system_id UUID) AS $$
DECLARE
  v_system_id UUID;
BEGIN
  SELECT gs.id INTO v_system_id
  FROM public.grading_systems gs
  WHERE gs.curriculum_id = p_curriculum_id
    AND (p_subject_id IS NULL OR gs.subject_id IS NULL OR gs.subject_id = p_subject_id)
    AND (p_class_id IS NULL OR gs.class_id IS NULL OR gs.class_id = p_class_id)
  ORDER BY
    CASE WHEN gs.subject_id = p_subject_id AND gs.class_id = p_class_id THEN 0
         WHEN gs.subject_id = p_subject_id AND gs.class_id IS NULL THEN 1
         WHEN gs.subject_id IS NULL AND gs.class_id = p_class_id THEN 2
         WHEN gs.is_default THEN 3 ELSE 4 END
  LIMIT 1;

  IF v_system_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT s.grade, s.points, v_system_id
  FROM public.grading_scales s
  WHERE s.grading_system_id = v_system_id
    AND p_mark >= s.min_score AND p_mark <= s.max_score
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
