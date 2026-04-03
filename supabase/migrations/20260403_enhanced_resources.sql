-- Migration: Enhanced Resource Library
-- Adds support for broadcasting to all centers, multiple classes, and sharing with individual students.

-- 1. Create storage bucket for resources
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resource-uploads', 'resource-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for resource-uploads
DROP POLICY IF EXISTS "Resources are publicly accessible." ON storage.objects;
CREATE POLICY "Resources are publicly accessible." 
ON storage.objects FOR SELECT USING (bucket_id = 'resource-uploads');

DROP POLICY IF EXISTS "Authenticated users can upload resources." ON storage.objects;
CREATE POLICY "Authenticated users can upload resources." 
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'resource-uploads' 
    AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can delete resources." ON storage.objects;
CREATE POLICY "Authenticated users can delete resources." 
ON storage.objects FOR DELETE USING (
    bucket_id = 'resource-uploads' 
    AND auth.role() = 'authenticated'
);

-- 3. Update resources table
ALTER TABLE resources 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'class' CHECK (audience IN ('public', 'class', 'broadcast', 'students')),
  ADD COLUMN IF NOT EXISTS class_ids UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS student_ids UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
