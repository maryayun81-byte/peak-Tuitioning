-- Peak Coach learning memory and duel season persistence.
-- Apply these tables in Supabase so Brain Gym, Duels and Peak Coach can learn from attempts.

CREATE TABLE IF NOT EXISTS public.student_syllabus_outcome_mastery (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  curriculum text NOT NULL DEFAULT 'Kenyan curriculum',
  subject text NOT NULL,
  syllabus_outcome text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  marks_available numeric NOT NULL DEFAULT 0,
  marks_earned numeric NOT NULL DEFAULT 0,
  mastery_estimate numeric NOT NULL DEFAULT 0 CHECK (mastery_estimate >= 0 AND mastery_estimate <= 1),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject, syllabus_outcome)
);

CREATE INDEX IF NOT EXISTS idx_student_syllabus_outcome_mastery_student
  ON public.student_syllabus_outcome_mastery(student_id);

CREATE INDEX IF NOT EXISTS idx_student_syllabus_outcome_mastery_weak
  ON public.student_syllabus_outcome_mastery(student_id, mastery_estimate, last_seen_at DESC);

ALTER TABLE public.student_syllabus_outcome_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own mastery memory"
  ON public.student_syllabus_outcome_mastery
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = student_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Students update own mastery memory"
  ON public.student_syllabus_outcome_mastery
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = student_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = student_id
        AND s.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.weekly_championships (
  id text PRIMARY KEY,
  week_start date NOT NULL,
  week_end date NOT NULL,
  subject_id uuid NULL REFERENCES public.subjects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  title text NULL,
  rewards jsonb NOT NULL DEFAULT '[]'::jsonb,
  titles jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  champion_id uuid NULL REFERENCES public.students(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_championships_status
  ON public.weekly_championships(status, week_start DESC);

ALTER TABLE public.weekly_championships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read weekly championships"
  ON public.weekly_championships
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users start weekly championships"
  ON public.weekly_championships
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  paper_blueprint_id text NOT NULL,
  curriculum text NOT NULL,
  level text NOT NULL,
  subject text NOT NULL,
  paper_name text NOT NULL,
  duration_minutes integer NOT NULL,
  total_marks numeric NOT NULL,
  paper_json jsonb NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'teacher_review')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  integrity_score integer NOT NULL DEFAULT 100 CHECK (integrity_score >= 0 AND integrity_score <= 100),
  score numeric NULL,
  percentage numeric NULL,
  grade text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_student
  ON public.exam_sessions(student_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_blueprint
  ON public.exam_sessions(paper_blueprint_id, status);

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own exam sessions"
  ON public.exam_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = student_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Students manage own exam sessions"
  ON public.exam_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = student_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = student_id
        AND s.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.exam_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  question_json jsonb NOT NULL,
  response_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_score numeric NOT NULL DEFAULT 0,
  final_score numeric NULL,
  max_score numeric NOT NULL DEFAULT 0,
  marking_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_items_session
  ON public.exam_items(session_id);

ALTER TABLE public.exam_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own exam items"
  ON public.exam_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.exam_sessions es
      JOIN public.students s ON s.id = es.student_id
      WHERE es.id = session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Students manage own exam items"
  ON public.exam_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.exam_sessions es
      JOIN public.students s ON s.id = es.student_id
      WHERE es.id = session_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.exam_sessions es
      JOIN public.students s ON s.id = es.student_id
      WHERE es.id = session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.invigilation_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invigilation_events_session
  ON public.invigilation_events(session_id, created_at DESC);

ALTER TABLE public.invigilation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own invigilation events"
  ON public.invigilation_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.exam_sessions es
      JOIN public.students s ON s.id = es.student_id
      WHERE es.id = session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Students create own invigilation events"
  ON public.invigilation_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.exam_sessions es
      JOIN public.students s ON s.id = es.student_id
      WHERE es.id = session_id
        AND s.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.teacher_overrides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_item_id uuid NOT NULL REFERENCES public.exam_items(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  previous_score numeric NOT NULL,
  new_score numeric NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_overrides_exam_item
  ON public.teacher_overrides(exam_item_id, created_at DESC);

ALTER TABLE public.teacher_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read teacher overrides"
  ON public.teacher_overrides
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
