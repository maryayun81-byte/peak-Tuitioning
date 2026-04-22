-- Expansion of transcript_config to support advanced branding and signatures
ALTER TABLE transcript_config 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS stamp_url TEXT,
ADD COLUMN IF NOT EXISTS signature_data TEXT,
ADD COLUMN IF NOT EXISTS signature_type TEXT DEFAULT 'draw',
ADD COLUMN IF NOT EXISTS signature_font TEXT,
ADD COLUMN IF NOT EXISTS apply_transcripts BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS apply_certificates BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS apply_badges BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS director_name TEXT DEFAULT 'Director General';

-- Ensure at least one row exists
INSERT INTO transcript_config (id, school_name, director_name)
SELECT uuid_generate_v4(), 'Peak Performance Tutoring', 'Director General'
WHERE NOT EXISTS (SELECT 1 FROM transcript_config);

-- Create a storage bucket for branding if it doesn't exist
-- Note: In a real Supabase environment (SQL Editor), we'd use the storage API, 
-- but we can insert into storage.buckets if permissions allow or handled via UI.
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for branding bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'branding' AND (SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text) = 'admin');
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE USING (bucket_id = 'branding' AND (SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text) = 'admin');
