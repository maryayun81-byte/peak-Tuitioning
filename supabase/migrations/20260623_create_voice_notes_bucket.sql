-- Create voice_notes storage bucket for student voice revision notes
-- This bucket must be public because the code uses getPublicUrl()

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice_notes',
  'voice_notes',
  true,
  10485760,
  ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow public access to voice_notes bucket
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'voice_notes');

CREATE POLICY "Authenticated upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'voice_notes'
    AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  );

CREATE POLICY "Owner update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'voice_notes'
    AND (auth.uid() = owner OR auth.role() = 'service_role')
  );

CREATE POLICY "Owner delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'voice_notes'
    AND (auth.uid() = owner OR auth.role() = 'service_role')
  );
