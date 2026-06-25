-- peak_peer_conversations: student-to-student chat within the same class
CREATE TABLE IF NOT EXISTS peak_peer_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_a_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_b_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  student_a_last_read_at TIMESTAMPTZ,
  student_b_last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ordered_students CHECK (student_a_id < student_b_id),
  UNIQUE(student_a_id, student_b_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_conversations_a
  ON peak_peer_conversations(student_a_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_peer_conversations_b
  ON peak_peer_conversations(student_b_id, last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS peak_peer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES peak_peer_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peer_messages_conversation
  ON peak_peer_messages(conversation_id, created_at);

ALTER TABLE peak_peer_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE peak_peer_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their peer conversations"
  ON peak_peer_conversations FOR SELECT
  USING (
    student_a_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR student_b_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Students can insert peer conversations"
  ON peak_peer_conversations FOR INSERT
  WITH CHECK (
    student_a_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR student_b_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Students can update their peer conversations"
  ON peak_peer_conversations FOR UPDATE
  USING (
    student_a_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR student_b_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Students can view peer messages"
  ON peak_peer_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM peak_peer_conversations
      WHERE student_a_id IN (SELECT id FROM students WHERE user_id = auth.uid())
         OR student_b_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    )
  );

    )
  );

-- Enable Realtime for peer conversation tables
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE peak_peer_conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE peak_peer_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
