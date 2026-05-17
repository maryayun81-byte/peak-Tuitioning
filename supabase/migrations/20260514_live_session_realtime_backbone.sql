-- Realtime backbone for live classroom chat and whiteboard recovery.
-- LiveKit data channels remain the low-latency path; these tables make chat
-- and board state survive missed packets, refreshes, and late joins.

CREATE TABLE IF NOT EXISTS live_session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL DEFAULT 'Participant',
  sender_role TEXT NOT NULL CHECK (sender_role IN ('teacher', 'student')),
  message TEXT NOT NULL CHECK (length(trim(message)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_session_messages_session_created
  ON live_session_messages(session_id, created_at);

ALTER TABLE live_session_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view live session messages" ON live_session_messages;
CREATE POLICY "Participants view live session messages" ON live_session_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM live_sessions
      LEFT JOIN teachers ON teachers.id = live_sessions.teacher_id
      LEFT JOIN students ON students.class_id = live_sessions.class_id
        AND students.tuition_center_id = live_sessions.tuition_center_id
      WHERE live_sessions.id = live_session_messages.session_id
        AND (teachers.user_id = auth.uid() OR students.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants send live session messages" ON live_session_messages;
CREATE POLICY "Participants send live session messages" ON live_session_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM live_sessions
      LEFT JOIN teachers ON teachers.id = live_sessions.teacher_id
      LEFT JOIN students ON students.class_id = live_sessions.class_id
        AND students.tuition_center_id = live_sessions.tuition_center_id
      WHERE live_sessions.id = live_session_messages.session_id
        AND (teachers.user_id = auth.uid() OR students.user_id = auth.uid())
    )
  );

CREATE TABLE IF NOT EXISTS live_session_whiteboards (
  session_id UUID PRIMARY KEY REFERENCES live_sessions(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE live_session_whiteboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view live session whiteboard" ON live_session_whiteboards;
CREATE POLICY "Participants view live session whiteboard" ON live_session_whiteboards
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM live_sessions
      LEFT JOIN teachers ON teachers.id = live_sessions.teacher_id
      LEFT JOIN students ON students.class_id = live_sessions.class_id
        AND students.tuition_center_id = live_sessions.tuition_center_id
      WHERE live_sessions.id = live_session_whiteboards.session_id
        AND (teachers.user_id = auth.uid() OR students.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers manage live session whiteboard" ON live_session_whiteboards;
CREATE POLICY "Teachers manage live session whiteboard" ON live_session_whiteboards
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM live_sessions
      JOIN teachers ON teachers.id = live_sessions.teacher_id
      WHERE live_sessions.id = live_session_whiteboards.session_id
        AND teachers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    updated_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM live_sessions
      JOIN teachers ON teachers.id = live_sessions.teacher_id
      WHERE live_sessions.id = live_session_whiteboards.session_id
        AND teachers.user_id = auth.uid()
    )
  );

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
