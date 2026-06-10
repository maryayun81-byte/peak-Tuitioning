-- Durable live-classroom presence and activity audit.
CREATE TABLE IF NOT EXISTS live_session_participants (
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL DEFAULT 'Student',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  active_tab TEXT NOT NULL DEFAULT 'content',
  microphone_enabled BOOLEAN NOT NULL DEFAULT false,
  camera_enabled BOOLEAN NOT NULL DEFAULT false,
  screen_share_enabled BOOLEAN NOT NULL DEFAULT false,
  hand_raised BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_live_session_participants_presence
  ON live_session_participants(session_id, last_seen DESC);

CREATE TABLE IF NOT EXISTS live_session_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_session_activity_events_timeline
  ON live_session_activity_events(session_id, created_at DESC);

ALTER TABLE live_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_session_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own live presence"
  ON live_session_participants FOR ALL
  TO authenticated
  USING (participant_id = auth.uid())
  WITH CHECK (
    participant_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM live_sessions
      JOIN students ON students.class_id = live_sessions.class_id
      WHERE live_sessions.id = live_session_participants.session_id
        AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers view session presence"
  ON live_session_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM live_sessions
      JOIN teachers ON teachers.id = live_sessions.teacher_id
      WHERE live_sessions.id = live_session_participants.session_id
        AND teachers.user_id = auth.uid()
    )
  );

CREATE POLICY "Students record own live activity"
  ON live_session_activity_events FOR INSERT
  TO authenticated
  WITH CHECK (
    participant_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM live_sessions
      JOIN students ON students.class_id = live_sessions.class_id
      WHERE live_sessions.id = live_session_activity_events.session_id
        AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers view session activity"
  ON live_session_activity_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM live_sessions
      JOIN teachers ON teachers.id = live_sessions.teacher_id
      WHERE live_sessions.id = live_session_activity_events.session_id
        AND teachers.user_id = auth.uid()
    )
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE live_session_participants;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE live_session_activity_events;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
