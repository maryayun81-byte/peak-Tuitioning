-- Fix for live_session_outcomes recursion
DROP POLICY IF EXISTS "Teachers can manage outcomes for their sessions" ON live_session_outcomes;
DROP POLICY IF EXISTS "Students can view outcomes for their sessions" ON live_session_outcomes;

CREATE POLICY "Teachers can manage outcomes" ON live_session_outcomes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions
    JOIN teachers ON live_sessions.teacher_id = teachers.id
    WHERE live_sessions.id = live_session_outcomes.session_id
    AND teachers.user_id = auth.uid()
  )
);

CREATE POLICY "Students can view outcomes" ON live_session_outcomes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions
    JOIN students ON live_sessions.class_id = students.class_id
    WHERE live_sessions.id = live_session_outcomes.session_id
    AND students.user_id = auth.uid()
  )
);
