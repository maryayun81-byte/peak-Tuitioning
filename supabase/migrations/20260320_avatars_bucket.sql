-- Ensure avatars storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for avatars bucket
-- Allow public access to view avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." 
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
DROP POLICY IF EXISTS "Users can upload their own avatar." ON storage.objects;
CREATE POLICY "Users can upload their own avatar." 
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);

-- Allow users to update their own avatar
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
CREATE POLICY "Users can update their own avatar." 
ON storage.objects FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);
