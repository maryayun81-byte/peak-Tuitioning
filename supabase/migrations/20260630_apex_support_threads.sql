ALTER TABLE public.public_support_handoffs
  ADD COLUMN IF NOT EXISTS conversation_id TEXT;

CREATE INDEX IF NOT EXISTS idx_public_support_handoffs_conversation
  ON public.public_support_handoffs(conversation_id);

CREATE TABLE IF NOT EXISTS public.public_support_thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  handoff_id UUID REFERENCES public.public_support_handoffs(id) ON DELETE SET NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('visitor', 'apex', 'admin', 'system')),
  author_name TEXT,
  body TEXT NOT NULL,
  is_read_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_read_by_visitor BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_support_thread_messages_conversation_created
  ON public.public_support_thread_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_public_support_thread_messages_admin_unread
  ON public.public_support_thread_messages(is_read_by_admin, created_at DESC);

ALTER TABLE public.public_support_thread_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read support thread messages" ON public.public_support_thread_messages;
CREATE POLICY "Public can read support thread messages"
ON public.public_support_thread_messages
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public can write visitor support messages" ON public.public_support_thread_messages;
CREATE POLICY "Public can write visitor support messages"
ON public.public_support_thread_messages
FOR INSERT
WITH CHECK (author_role IN ('visitor', 'system'));

DROP POLICY IF EXISTS "Admins can manage support thread messages" ON public.public_support_thread_messages;
CREATE POLICY "Admins can manage support thread messages"
ON public.public_support_thread_messages
FOR ALL
USING (auth_role() = 'admin')
WITH CHECK (auth_role() = 'admin');

GRANT SELECT, INSERT ON public.public_support_thread_messages TO anon;
GRANT SELECT, INSERT ON public.public_support_thread_messages TO authenticated;
GRANT ALL ON public.public_support_thread_messages TO service_role;
