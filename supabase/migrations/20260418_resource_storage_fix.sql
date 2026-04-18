-- ============================================================
-- STORAGE POLICY FIX: resource-uploads
-- ============================================================

-- 1. Ensure bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'resource-uploads';

-- 2. Refine SELECT policy
DROP POLICY IF EXISTS "Resources are publicly accessible." ON storage.objects;
CREATE POLICY "Resources are publicly accessible." 
ON storage.objects FOR SELECT USING (bucket_id = 'resource-uploads');

-- 3. Refine INSERT policy (The likely cause of the error)
-- We must check bucket_id explicitly and ensure it matches 'resource-uploads'
DROP POLICY IF EXISTS "Authenticated users can upload resources." ON storage.objects;
CREATE POLICY "Authenticated users can upload resources." 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'resource-uploads' 
    AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- 4. Enable DELETE for owners/admins
DROP POLICY IF EXISTS "Authenticated users can delete resources." ON storage.objects;
CREATE POLICY "Authenticated users can delete resources." 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'resource-uploads' 
    AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);
