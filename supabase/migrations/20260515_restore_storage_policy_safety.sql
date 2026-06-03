-- ============================================================
-- Final storage policy safety pass for full restores
--
-- Older migrations reused generic policy names on storage.objects.
-- Because policies are table-scoped, this final pass gives every
-- bucket its own stable policy name.
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('assignment-uploads', 'assignment-uploads', true),
  ('resource-uploads', 'resource-uploads', true),
  ('teacher-resources', 'teacher-resources', true),
  ('quiz-media', 'quiz-media', true),
  ('library-books', 'library-books', true),
  ('credentials', 'credentials', true),
  ('branding', 'branding', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;
DROP POLICY IF EXISTS "Teacher & Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Creator Manage" ON storage.objects;
DROP POLICY IF EXISTS "Resources are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload resources." ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete resources." ON storage.objects;
DROP POLICY IF EXISTS "Teacher resources are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload teacher resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users delete teacher resources" ON storage.objects;

DROP POLICY IF EXISTS "storage_public_read_app_buckets" ON storage.objects;
CREATE POLICY "storage_public_read_app_buckets" ON storage.objects
  FOR SELECT
  USING (
    bucket_id IN (
      'avatars',
      'assignment-uploads',
      'resource-uploads',
      'teacher-resources',
      'quiz-media',
      'library-books',
      'credentials',
      'branding'
    )
  );

DROP POLICY IF EXISTS "storage_authenticated_upload_app_buckets" ON storage.objects;
CREATE POLICY "storage_authenticated_upload_app_buckets" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id IN (
      'avatars',
      'assignment-uploads',
      'resource-uploads',
      'teacher-resources',
      'quiz-media',
      'library-books',
      'branding'
    )
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "storage_authenticated_update_app_buckets" ON storage.objects;
CREATE POLICY "storage_authenticated_update_app_buckets" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id IN (
      'avatars',
      'assignment-uploads',
      'resource-uploads',
      'teacher-resources',
      'quiz-media',
      'library-books',
      'branding'
    )
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id IN (
      'avatars',
      'assignment-uploads',
      'resource-uploads',
      'teacher-resources',
      'quiz-media',
      'library-books',
      'branding'
    )
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "storage_authenticated_delete_app_buckets" ON storage.objects;
CREATE POLICY "storage_authenticated_delete_app_buckets" ON storage.objects
  FOR DELETE
  USING (
    bucket_id IN (
      'assignment-uploads',
      'resource-uploads',
      'teacher-resources',
      'quiz-media',
      'library-books',
      'branding'
    )
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "storage_admin_manage_credentials" ON storage.objects;
CREATE POLICY "storage_admin_manage_credentials" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'credentials'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'credentials'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
