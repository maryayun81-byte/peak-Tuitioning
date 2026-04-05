-- Migration: Create Quiz Media Storage Bucket
-- Description: Creates a public bucket for quiz-related images and documents with appropriate RLS policies.

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-media', 'quiz-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS Policies for the bucket
-- 1. Allow anyone to view media
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'quiz-media');

-- 2. Allow authenticated teachers and admins to upload
CREATE POLICY "Teacher & Admin Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'quiz-media' AND 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('teacher', 'admin')
);

-- 3. Allow creators to delete or update their own media
CREATE POLICY "Creator Manage" 
ON storage.objects FOR ALL 
USING (
  bucket_id = 'quiz-media' AND 
  (auth.uid() = owner)
)
WITH CHECK (
  bucket_id = 'quiz-media' AND 
  (auth.uid() = owner)
);
