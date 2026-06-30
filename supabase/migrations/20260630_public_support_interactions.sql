CREATE TABLE IF NOT EXISTS public.public_support_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'chat' CHECK (kind IN ('chat', 'result_slip', 'handoff')),
  visitor_message TEXT NOT NULL,
  assistant_reply TEXT,
  intent TEXT,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high')),
  needs_human BOOLEAN NOT NULL DEFAULT FALSE,
  source_path TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  provider TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_support_interactions_created
  ON public.public_support_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_support_interactions_needs_human
  ON public.public_support_interactions(needs_human, created_at DESC);

ALTER TABLE public.public_support_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can log support interactions" ON public.public_support_interactions;
CREATE POLICY "Public can log support interactions"
ON public.public_support_interactions
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage support interactions" ON public.public_support_interactions;
CREATE POLICY "Admins can manage support interactions"
ON public.public_support_interactions
FOR ALL
USING (auth_role() = 'admin')
WITH CHECK (auth_role() = 'admin');

GRANT INSERT ON public.public_support_interactions TO anon;
GRANT INSERT ON public.public_support_interactions TO authenticated;
GRANT ALL ON public.public_support_interactions TO service_role;
