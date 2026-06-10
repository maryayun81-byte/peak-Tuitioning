-- Persist live quiz results so they survive teacher refreshes.
CREATE TABLE IF NOT EXISTS live_quiz_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  quiz_id       TEXT NOT NULL,
  question_id   TEXT NOT NULL,
  participant_id  TEXT NOT NULL,
  participant_name TEXT NOT NULL DEFAULT 'Anonymous',
  answer_index  INTEGER NOT NULL,
  is_correct    BOOLEAN NOT NULL DEFAULT false,
  score         INTEGER NOT NULL DEFAULT 0,
  answered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Required by the client upsert conflict target.
DELETE FROM live_quiz_results older
USING live_quiz_results newer
WHERE older.session_id = newer.session_id
  AND older.quiz_id = newer.quiz_id
  AND older.question_id = newer.question_id
  AND older.participant_id = newer.participant_id
  AND older.created_at < newer.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS uq_live_quiz_results_answer
  ON live_quiz_results(session_id, quiz_id, question_id, participant_id);

-- Index for fast leaderboard queries.
CREATE INDEX IF NOT EXISTS idx_live_quiz_results_session ON live_quiz_results(session_id, quiz_id);

-- Students can write only their own answers. The session teacher can read all
-- answers for the leaderboard, while students can read only their own.
ALTER TABLE live_quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert quiz results" ON live_quiz_results;
DROP POLICY IF EXISTS "Authenticated users can view quiz results" ON live_quiz_results;

CREATE POLICY "Students insert own live quiz results"
  ON live_quiz_results FOR INSERT
  TO authenticated
  WITH CHECK (
    participant_id = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM live_sessions
      JOIN students ON students.class_id = live_sessions.class_id
      WHERE live_sessions.id = live_quiz_results.session_id
        AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Students update own live quiz results"
  ON live_quiz_results FOR UPDATE
  TO authenticated
  USING (participant_id = auth.uid()::text)
  WITH CHECK (
    participant_id = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM live_sessions
      JOIN students ON students.class_id = live_sessions.class_id
      WHERE live_sessions.id = live_quiz_results.session_id
        AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants view permitted live quiz results"
  ON live_quiz_results FOR SELECT
  TO authenticated
  USING (
    participant_id = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM live_sessions
      JOIN teachers ON teachers.id = live_sessions.teacher_id
      WHERE live_sessions.id = live_quiz_results.session_id
        AND teachers.user_id = auth.uid()
    )
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE live_quiz_results;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
