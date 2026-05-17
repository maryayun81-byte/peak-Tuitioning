-- Fix overly-strict RLS policies for live_session_messages and live_session_whiteboards.
-- The previous policies required students.tuition_center_id = live_sessions.tuition_center_id,
-- which fails when the column is NULL or the student wasn't associated with a tuition center.
-- We now only require class membership (which is the real authorization signal).

-- ─────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────

DROP POLICY IF EXISTS "Participants view live session messages" ON live_session_messages;
DROP POLICY IF EXISTS "Participants send live session messages" ON live_session_messages;

CREATE POLICY "Participants view live session messages" ON live_session_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_session_messages.session_id
        AND (
          -- Teacher owns the session
          EXISTS (
            SELECT 1 FROM teachers
            WHERE teachers.id = live_sessions.teacher_id
              AND teachers.user_id = auth.uid()
          )
          OR
          -- Student is in the session's class
          EXISTS (
            SELECT 1 FROM students
            WHERE students.class_id = live_sessions.class_id
              AND students.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Participants send live session messages" ON live_session_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_session_messages.session_id
        AND (
          EXISTS (
            SELECT 1 FROM teachers
            WHERE teachers.id = live_sessions.teacher_id
              AND teachers.user_id = auth.uid()
          )
          OR
          EXISTS (
            SELECT 1 FROM students
            WHERE students.class_id = live_sessions.class_id
              AND students.user_id = auth.uid()
          )
        )
    )
  );

-- ─────────────────────────────────────────────
-- WHITEBOARD
-- ─────────────────────────────────────────────

DROP POLICY IF EXISTS "Participants view live session whiteboard" ON live_session_whiteboards;

CREATE POLICY "Participants view live session whiteboard" ON live_session_whiteboards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_session_whiteboards.session_id
        AND (
          EXISTS (
            SELECT 1 FROM teachers
            WHERE teachers.id = live_sessions.teacher_id
              AND teachers.user_id = auth.uid()
          )
          OR
          EXISTS (
            SELECT 1 FROM students
            WHERE students.class_id = live_sessions.class_id
              AND students.user_id = auth.uid()
          )
        )
    )
  );

-- ─────────────────────────────────────────────
-- Ensure realtime is enabled on both tables
-- ─────────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE live_session_messages;
EXCEPTION
  WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE live_session_whiteboards;
EXCEPTION
  WHEN duplicate_object OR undefined_object THEN NULL;
END $$;
