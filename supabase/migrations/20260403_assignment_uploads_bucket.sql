-- Ensure assignment-uploads storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assignment-uploads', 'assignment-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for assignment-uploads bucket
-- Allow public access to view uploaded assignment materials (PDFs/Images)
-- This is critical so students can see the worksheet they are meant to work on.
DROP POLICY IF EXISTS "Assignment materials are publicly accessible." ON storage.objects;
CREATE POLICY "Assignment materials are publicly accessible." 
ON storage.objects FOR SELECT USING (bucket_id = 'assignment-uploads');

-- Allow authenticated users to upload assignment materials
-- This allows teachers and admins to upload PDFs/images when creating assignments.
DROP POLICY IF EXISTS "Authenticated users can upload assignment materials." ON storage.objects;
CREATE POLICY "Authenticated users can upload assignment materials." 
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'assignment-uploads' 
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete assignment materials they uploaded (if needed)
DROP POLICY IF EXISTS "Authenticated users can delete assignment materials." ON storage.objects;
CREATE POLICY "Authenticated users can delete assignment materials." 
ON storage.objects FOR DELETE USING (
    bucket_id = 'assignment-uploads' 
    AND auth.role() = 'authenticated'
);
