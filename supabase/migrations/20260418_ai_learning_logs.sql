-- ============================================================
-- AI Learning Logs
-- Tracks what students are asking the AI to teach
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_learning_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for trending discovery
CREATE INDEX IF NOT EXISTS idx_ai_learning_topic ON ai_learning_logs(topic);
CREATE INDEX IF NOT EXISTS idx_ai_learning_curriculum ON ai_learning_logs(curriculum_id);

-- Enable RLS
ALTER TABLE ai_learning_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students can insert their own logs" ON ai_learning_logs
FOR INSERT WITH CHECK (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);

CREATE POLICY "Students can view anonymous trending data" ON ai_learning_logs
FOR SELECT USING (
  curriculum_id = (SELECT curriculum_id FROM students WHERE user_id = auth.uid())
);

CREATE POLICY "Admins view all logs" ON ai_learning_logs
FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
