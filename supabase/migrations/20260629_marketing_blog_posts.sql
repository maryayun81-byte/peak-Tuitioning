CREATE TABLE IF NOT EXISTS public.marketing_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  category TEXT NOT NULL DEFAULT 'Peak Insights',
  author_name TEXT NOT NULL DEFAULT 'Peak Performance Team',
  read_minutes INTEGER NOT NULL DEFAULT 4,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_blog_posts_published
  ON public.marketing_blog_posts (is_published, published_at DESC, created_at DESC);

ALTER TABLE public.marketing_blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_blog_posts_public_read" ON public.marketing_blog_posts;
CREATE POLICY "marketing_blog_posts_public_read"
ON public.marketing_blog_posts FOR SELECT
USING (is_published = true);

DROP POLICY IF EXISTS "marketing_blog_posts_admin_all" ON public.marketing_blog_posts;
CREATE POLICY "marketing_blog_posts_admin_all"
ON public.marketing_blog_posts FOR ALL
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Admin Upload Blog Images" ON storage.objects;
CREATE POLICY "Admin Upload Blog Images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-images'
  AND (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
);

DROP POLICY IF EXISTS "Admin Manage Blog Images" ON storage.objects;
CREATE POLICY "Admin Manage Blog Images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'blog-images'
  AND (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'blog-images'
  AND (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
);
