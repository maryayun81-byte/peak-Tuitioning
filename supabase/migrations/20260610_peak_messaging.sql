-- Peak Performance student-teacher messaging.
CREATE TABLE IF NOT EXISTS peak_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  student_last_read_at TIMESTAMPTZ,
  teacher_last_read_at TIMESTAMPTZ,
  is_archived_by_student BOOLEAN NOT NULL DEFAULT false,
  is_archived_by_teacher BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_peak_conversations_student
  ON peak_conversations(student_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_peak_conversations_teacher
  ON peak_conversations(teacher_id, last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS peak_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES peak_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'voice', 'attachment', 'poll', 'learning_card', 'system')),
  reply_to_id UUID REFERENCES peak_messages(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peak_messages_conversation
  ON peak_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS peak_message_reactions (
  message_id UUID NOT NULL REFERENCES peak_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS peak_typing_presence (
  conversation_id UUID NOT NULL REFERENCES peak_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS peak_message_safety_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES peak_messages(id) ON DELETE SET NULL,
  conversation_id UUID NOT NULL REFERENCES peak_conversations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  categories TEXT[] NOT NULL DEFAULT '{}',
  explanation TEXT NOT NULL,
  action_taken TEXT NOT NULL CHECK (action_taken IN ('allowed', 'warned', 'blocked', 'flagged')),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'peak-rules',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peak_message_safety_student
  ON peak_message_safety_reviews(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_peak_message_safety_conversation
  ON peak_message_safety_reviews(conversation_id, created_at DESC);

CREATE OR REPLACE FUNCTION is_peak_conversation_participant(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM peak_conversations c
    LEFT JOIN students s ON s.id = c.student_id
    LEFT JOIN teachers t ON t.id = c.teacher_id
    WHERE c.id = p_conversation_id
      AND (s.user_id = auth.uid() OR t.user_id = auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION is_peak_conversation_participant(UUID) TO authenticated;

ALTER TABLE peak_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE peak_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE peak_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE peak_typing_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE peak_message_safety_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view Peak conversations"
  ON peak_conversations FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM students WHERE students.id = student_id AND students.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM teachers WHERE teachers.id = teacher_id AND teachers.user_id = auth.uid())
  );

CREATE POLICY "Participants view Peak messages"
  ON peak_messages FOR SELECT TO authenticated
  USING (is_peak_conversation_participant(conversation_id));

CREATE POLICY "Participants view Peak reactions"
  ON peak_message_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM peak_messages
      WHERE peak_messages.id = peak_message_reactions.message_id
        AND is_peak_conversation_participant(peak_messages.conversation_id)
    )
  );

CREATE POLICY "Participants manage own Peak reactions"
  ON peak_message_reactions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM peak_messages
      WHERE peak_messages.id = peak_message_reactions.message_id
        AND is_peak_conversation_participant(peak_messages.conversation_id)
    )
  );

CREATE POLICY "Participants view Peak typing"
  ON peak_typing_presence FOR SELECT TO authenticated
  USING (is_peak_conversation_participant(conversation_id));

CREATE POLICY "Participants manage own Peak typing"
  ON peak_typing_presence FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND is_peak_conversation_participant(conversation_id));

CREATE POLICY "Teachers view assigned safeguarding reviews"
  ON peak_message_safety_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM peak_conversations c
      JOIN teachers t ON t.id = c.teacher_id
      WHERE c.id = peak_message_safety_reviews.conversation_id
        AND t.user_id = auth.uid()
    )
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE peak_conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE peak_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE peak_message_reactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE peak_typing_presence;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE peak_message_safety_reviews;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
