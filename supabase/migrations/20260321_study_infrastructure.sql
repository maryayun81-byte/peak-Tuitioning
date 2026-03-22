-- Study Timetable & Focus Mode Infrastructure
-- Supports age-adaptive goals, focus tracking, and reflections.

-- 1. Study Sessions (The core time blocks)
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT, -- Optional custom title if not subject-linked
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'skipped')),
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Study Goals (The structured objective/action/outcome/meaning model)
CREATE TABLE study_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  meaning TEXT NOT NULL,
  age_style TEXT NOT NULL CHECK (age_style IN ('exploration', 'skill_building', 'transition', 'mastery')),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Focus Logs (Detailed analytics for focus sessions)
CREATE TABLE focus_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  actual_focus_minutes INTEGER NOT NULL DEFAULT 0,
  interruption_count INTEGER NOT NULL DEFAULT 0,
  streak_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  focus_score NUMERIC(5,2) DEFAULT 0, -- 0 to 100 based on interruptions vs duration
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Study Reflections (Post-session growth tracking)
CREATE TABLE study_reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  completed_summary TEXT, -- What did I complete?
  learned_summary TEXT,   -- What did I learn?
  difficulty_summary TEXT, -- What was difficult?
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_reflections ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Study Sessions
CREATE POLICY "Students manage own study sessions" ON study_sessions 
  FOR ALL USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers view class study sessions" ON study_sessions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_assignments ta ON s.class_id = ta.class_id
      WHERE s.id = study_sessions.student_id 
      AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins view all study sessions" ON study_sessions FOR SELECT USING (auth_role() = 'admin');

-- Study Goals
CREATE POLICY "Students manage own study goals" ON study_goals 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM study_sessions WHERE id = study_goals.session_id AND student_id = (SELECT id FROM students WHERE user_id = auth.uid()))
  );

CREATE POLICY "Teachers view class study goals" ON study_goals 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN students s ON ss.student_id = s.id
      JOIN teacher_assignments ta ON s.class_id = ta.class_id
      WHERE ss.id = study_goals.session_id 
      AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- Focus Logs
CREATE POLICY "Students manage own focus logs" ON focus_logs 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM study_sessions WHERE id = focus_logs.session_id AND student_id = (SELECT id FROM students WHERE user_id = auth.uid()))
  );

CREATE POLICY "Teachers view class focus logs" ON focus_logs 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN students s ON ss.student_id = s.id
      JOIN teacher_assignments ta ON s.class_id = ta.class_id
      WHERE ss.id = focus_logs.session_id 
      AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- Study Reflections
CREATE POLICY "Students manage own study reflections" ON study_reflections 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM study_sessions WHERE id = study_reflections.session_id AND student_id = (SELECT id FROM students WHERE user_id = auth.uid()))
  );

CREATE POLICY "Teachers view class study reflections" ON study_reflections 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN students s ON ss.student_id = s.id
      JOIN teacher_assignments ta ON s.class_id = ta.class_id
      WHERE ss.id = study_reflections.session_id 
      AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- 7. Indexes
CREATE INDEX idx_study_sessions_student ON study_sessions(student_id);
CREATE INDEX idx_study_sessions_date ON study_sessions(date);
CREATE INDEX idx_study_goals_session ON study_goals(session_id);
CREATE INDEX idx_focus_logs_session ON focus_logs(session_id);
CREATE INDEX idx_study_reflections_session ON study_reflections(session_id);

-- 8. Add trigger for updated_at on study_sessions
CREATE TRIGGER trg_study_sessions_updated BEFORE UPDATE ON study_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
