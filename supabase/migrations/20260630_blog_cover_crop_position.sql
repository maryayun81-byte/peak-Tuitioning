ALTER TABLE public.marketing_blog_posts
  ADD COLUMN IF NOT EXISTS cover_object_position TEXT DEFAULT 'center center';
