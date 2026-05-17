CREATE TABLE IF NOT EXISTS live_session_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reflection_text TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 4 CHECK (confidence BETWEEN 1 AND 5),
  mastery_score INTEGER NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

ALTER TABLE live_session_reflections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own live reflections" ON live_session_reflections;
CREATE POLICY "Students manage own live reflections" ON live_session_reflections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = live_session_reflections.student_id
      AND students.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = live_session_reflections.student_id
      AND students.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Teachers view reflections for own sessions" ON live_session_reflections;
CREATE POLICY "Teachers view reflections for own sessions" ON live_session_reflections
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM live_sessions
    JOIN teachers ON teachers.id = live_sessions.teacher_id
    WHERE live_sessions.id = live_session_reflections.session_id
      AND teachers.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_live_session_reflections_session_id ON live_session_reflections(session_id);
CREATE INDEX IF NOT EXISTS idx_live_session_reflections_student_id ON live_session_reflections(student_id);
