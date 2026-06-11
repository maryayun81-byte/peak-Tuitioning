-- Premium Peak messaging: voice notes, pins, summaries, and Web Push.

CREATE TABLE IF NOT EXISTS peak_message_pins (
  conversation_id UUID NOT NULL REFERENCES peak_conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES peak_messages(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_peak_message_pins_conversation
  ON peak_message_pins(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS peak_conversation_summaries (
  conversation_id UUID PRIMARY KEY REFERENCES peak_conversations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_message_count INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'peak-core',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS peak_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peak_push_subscriptions_user
  ON peak_push_subscriptions(user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'peak-message-voice',
  'peak-message-voice',
  false,
  8388608,
  ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE peak_message_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE peak_conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE peak_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view Peak pins"
  ON peak_message_pins FOR SELECT TO authenticated
  USING (is_peak_conversation_participant(conversation_id));

CREATE POLICY "Participants view Peak summaries"
  ON peak_conversation_summaries FOR SELECT TO authenticated
  USING (is_peak_conversation_participant(conversation_id));

CREATE POLICY "Users manage own Peak push subscriptions"
  ON peak_push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE peak_message_pins;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

