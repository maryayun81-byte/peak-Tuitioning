-- Enable Parents to view their linked students' study progress
-- Includes Study Sessions, Goals, Focus Logs, and Reflections

-- 1. Study Sessions
CREATE POLICY "Parents view student study sessions" ON study_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_links psl
      JOIN parents p ON psl.parent_id = p.id
      WHERE psl.student_id = study_sessions.student_id
      AND p.user_id = auth.uid()
    )
  );

-- 2. Study Goals
CREATE POLICY "Parents view student study goals" ON study_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN parent_student_links psl ON ss.student_id = psl.student_id
      JOIN parents p ON psl.parent_id = p.id
      WHERE ss.id = study_goals.session_id
      AND p.user_id = auth.uid()
    )
  );

-- 3. Focus Logs
CREATE POLICY "Parents view student focus logs" ON focus_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN parent_student_links psl ON ss.student_id = psl.student_id
      JOIN parents p ON psl.parent_id = p.id
      WHERE ss.id = focus_logs.session_id
      AND p.user_id = auth.uid()
    )
  );

-- 4. Study Reflections
CREATE POLICY "Parents view student study reflections" ON study_reflections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN parent_student_links psl ON ss.student_id = psl.student_id
      JOIN parents p ON psl.parent_id = p.id
      WHERE ss.id = study_reflections.session_id
      AND p.user_id = auth.uid()
    )
  );

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
