-- ============================================================
-- Peak Performance Tutoring — Trivia System
-- ============================================================

-- ── TRIVIA SESSIONS ───────────────────────────────────────────
CREATE TABLE trivia_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  class_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed')),
  duration_minutes INTEGER,           -- overall session countdown (null = untimed)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRIVIA QUESTIONS ──────────────────────────────────────────
CREATE TABLE trivia_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES trivia_sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',   -- [{id: string, text: string}]
  correct_option_id TEXT NOT NULL,
  marks INTEGER NOT NULL DEFAULT 1,
  time_seconds INTEGER NOT NULL DEFAULT 30,  -- per-question countdown
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRIVIA GROUPS ─────────────────────────────────────────────
CREATE TABLE trivia_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES trivia_sessions(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, name)
);

-- ── TRIVIA GROUP MEMBERS ──────────────────────────────────────
CREATE TABLE trivia_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES trivia_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, student_id)
);

-- ── TRIVIA SUBMISSIONS ────────────────────────────────────────
-- One row per group per session. Auto-marked on submission.
CREATE TABLE trivia_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES trivia_sessions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES trivia_groups(id) ON DELETE CASCADE,
  -- answers: { [question_id]: option_id | null }
  answers JSONB NOT NULL DEFAULT '{}',
  -- question_timings: { [question_id]: { time_taken_s: number, timed_out: boolean } }
  question_timings JSONB NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER,           -- total wall-clock seconds for the attempt
  auto_submitted BOOLEAN NOT NULL DEFAULT FALSE,  -- true if overall timer expired
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, group_id)
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_trivia_sessions_teacher ON trivia_sessions(teacher_id);
CREATE INDEX idx_trivia_sessions_status ON trivia_sessions(status);
CREATE INDEX idx_trivia_questions_session ON trivia_questions(session_id, position);
CREATE INDEX idx_trivia_groups_session ON trivia_groups(session_id);
CREATE INDEX idx_trivia_group_members_group ON trivia_group_members(group_id);
CREATE INDEX idx_trivia_group_members_student ON trivia_group_members(student_id);
CREATE INDEX idx_trivia_submissions_session ON trivia_submissions(session_id);
CREATE INDEX idx_trivia_submissions_group ON trivia_submissions(group_id);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────
CREATE TRIGGER trg_trivia_sessions_updated
  BEFORE UPDATE ON trivia_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE trivia_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_submissions ENABLE ROW LEVEL SECURITY;

-- TRIVIA SESSIONS
-- Teachers manage their own; all authenticated users can view published sessions
CREATE POLICY "Teacher manages own trivia sessions"
  ON trivia_sessions FOR ALL
  USING (teacher_id = get_my_teacher_id() OR auth_role() = 'admin');

CREATE POLICY "Students view published trivia for their class"
  ON trivia_sessions FOR SELECT
  USING (
    auth_role() = 'student'
    AND status = 'published'
    AND get_my_student_class_id() = ANY(class_ids)
  );

-- TRIVIA QUESTIONS
-- Question visibility follows session visibility
CREATE POLICY "Teacher manages own trivia questions"
  ON trivia_questions FOR ALL
  USING (
    session_id IN (
      SELECT id FROM trivia_sessions WHERE teacher_id = get_my_teacher_id()
    ) OR auth_role() = 'admin'
  );

CREATE POLICY "Students view questions of published sessions for their class"
  ON trivia_questions FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM trivia_sessions
      WHERE status = 'published'
      AND get_my_student_class_id() = ANY(class_ids)
    )
  );

-- TRIVIA GROUPS
CREATE POLICY "Anyone authenticated views groups for their session"
  ON trivia_groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Students manage groups they created"
  ON trivia_groups FOR ALL
  USING (created_by = get_my_student_id() OR auth_role() IN ('teacher', 'admin'));

CREATE POLICY "Students can create groups"
  ON trivia_groups FOR INSERT
  WITH CHECK (auth_role() = 'student');

-- TRIVIA GROUP MEMBERS
CREATE POLICY "Anyone authenticated views group members"
  ON trivia_group_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Students can join groups"
  ON trivia_group_members FOR INSERT
  WITH CHECK (student_id = get_my_student_id());

CREATE POLICY "Students can leave groups"
  ON trivia_group_members FOR DELETE
  USING (student_id = get_my_student_id());

CREATE POLICY "Teachers and admins manage group members"
  ON trivia_group_members FOR ALL
  USING (auth_role() IN ('teacher', 'admin'));

-- TRIVIA SUBMISSIONS
CREATE POLICY "Students in group can submit"
  ON trivia_submissions FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM trivia_group_members WHERE student_id = get_my_student_id()
    )
  );

CREATE POLICY "Students view their group's submission"
  ON trivia_submissions FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM trivia_group_members WHERE student_id = get_my_student_id()
    ) OR auth_role() IN ('teacher', 'admin')
  );

CREATE POLICY "Anyone can view submissions for ranking"
  ON trivia_submissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Teacher views submissions for their trivia"
  ON trivia_submissions FOR ALL
  USING (
    session_id IN (
      SELECT id FROM trivia_sessions WHERE teacher_id = get_my_teacher_id()
    ) OR auth_role() = 'admin'
  );
