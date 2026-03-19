-- MASTER TRANSCRIPTS: Branding & Configuration Table

CREATE TABLE IF NOT EXISTS transcript_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_name TEXT NOT NULL DEFAULT 'Peak Performance Tutoring',
  logo_url TEXT,
  stamp_url TEXT,
  director_signature_url TEXT,
  director_name TEXT DEFAULT 'Director General',
  address_line_1 TEXT,
  address_line_2 TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Insert default row if not exists
INSERT INTO transcript_config (school_name) 
SELECT 'Peak Performance Tutoring'
WHERE NOT EXISTS (SELECT 1 FROM transcript_config LIMIT 1);

-- RLS
ALTER TABLE transcript_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for transcripts" 
ON transcript_config FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage config" 
ON transcript_config FOR ALL 
USING (auth_role() = 'admin');
