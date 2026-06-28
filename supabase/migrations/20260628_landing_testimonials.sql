CREATE TABLE IF NOT EXISTS public.landing_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 2 AND 90),
  role TEXT NOT NULL CHECK (role IN ('parent', 'student', 'teacher', 'alumni', 'guardian', 'other')),
  relationship_label TEXT,
  quote TEXT NOT NULL CHECK (char_length(trim(quote)) BETWEEN 20 AND 900),
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT NOT NULL DEFAULT 'landing_page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_testimonials_published_created
  ON public.landing_testimonials (is_published, created_at DESC);

ALTER TABLE public.landing_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published landing testimonials" ON public.landing_testimonials;
CREATE POLICY "Public can read published landing testimonials"
  ON public.landing_testimonials
  FOR SELECT
  TO anon, authenticated
  USING (is_published = TRUE);

DROP POLICY IF EXISTS "Public can submit landing testimonials" ON public.landing_testimonials;
CREATE POLICY "Public can submit landing testimonials"
  ON public.landing_testimonials
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    is_published = TRUE
    AND source = 'landing_page'
    AND role IN ('parent', 'student', 'teacher', 'alumni', 'guardian', 'other')
  );

DROP POLICY IF EXISTS "Admins manage landing testimonials" ON public.landing_testimonials;
CREATE POLICY "Admins manage landing testimonials"
  ON public.landing_testimonials
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

GRANT SELECT, INSERT ON public.landing_testimonials TO anon;
GRANT SELECT, INSERT ON public.landing_testimonials TO authenticated;
GRANT ALL ON public.landing_testimonials TO service_role;
