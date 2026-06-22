-- Migration: Create Event Posters Storage Bucket
-- Description: Creates a public bucket for tuition event banners and posters with appropriate RLS policies.

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-posters', 'event-posters', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS Policies for the bucket
-- Note: A SELECT policy is intentionally omitted. Public buckets serve files directly via public URLs,
-- and adding a broad SELECT policy would allow users to list all files in the bucket.

-- 2. Allow authenticated admins to upload
CREATE POLICY "Admin Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'event-posters' AND 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);

-- 3. Allow admins to delete or update media
CREATE POLICY "Admin Manage" 
ON storage.objects FOR ALL 
USING (
  bucket_id = 'event-posters' AND 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
)
WITH CHECK (
  bucket_id = 'event-posters' AND 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
);
