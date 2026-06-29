CREATE TABLE IF NOT EXISTS public.public_support_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  phone TEXT,
  email TEXT,
  message TEXT NOT NULL,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  source_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_support_handoffs_status_created
  ON public.public_support_handoffs(status, created_at DESC);

ALTER TABLE public.public_support_handoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit support handoffs" ON public.public_support_handoffs;
CREATE POLICY "Public can submit support handoffs"
ON public.public_support_handoffs
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage support handoffs" ON public.public_support_handoffs;
CREATE POLICY "Admins can manage support handoffs"
ON public.public_support_handoffs
FOR ALL
USING (auth_role() = 'admin')
WITH CHECK (auth_role() = 'admin');

GRANT INSERT ON public.public_support_handoffs TO anon;
GRANT INSERT ON public.public_support_handoffs TO authenticated;
GRANT ALL ON public.public_support_handoffs TO service_role;
