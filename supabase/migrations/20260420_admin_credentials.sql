-- ============================================================
-- ADMIN CREDENTIAL SYSTEM INFRASTRUCTURE
-- ============================================================

-- 1. Extend existing tables with normalization
ALTER TABLE students ADD COLUMN IF NOT EXISTS normalized_name TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- 2. Create normalization function
CREATE OR REPLACE FUNCTION normalize_name(name TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN lower(trim(regexp_replace(name, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql;

-- 3. Populate existing data
UPDATE students SET normalized_name = normalize_name(full_name) WHERE normalized_name IS NULL;
UPDATE event_registrations SET normalized_name = normalize_name(student_name) WHERE normalized_name IS NULL;

-- 4. Create Triggers for automatic normalization
CREATE OR REPLACE FUNCTION trigger_normalize_student_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_name := normalize_name(NEW.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_normalize_student_name
BEFORE INSERT OR UPDATE OF full_name ON students
FOR EACH ROW EXECUTE FUNCTION trigger_normalize_student_name();

CREATE OR REPLACE FUNCTION trigger_normalize_registration_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_name := normalize_name(NEW.student_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_normalize_registration_name
BEFORE INSERT OR UPDATE OF student_name ON event_registrations
FOR EACH ROW EXECUTE FUNCTION trigger_normalize_registration_name();

-- 5. Create Batch & Credential Tables
CREATE TABLE IF NOT EXISTS credential_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_processed   INT NOT NULL DEFAULT 0,
  total_created     INT NOT NULL DEFAULT 0,
  total_linked      INT NOT NULL DEFAULT 0,
  total_flagged     INT NOT NULL DEFAULT 0,
  image_url         TEXT,
  pdf_url           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_credentials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  batch_id          UUID NOT NULL REFERENCES credential_batches(id) ON DELETE CASCADE,
  plain_password    TEXT NOT NULL, -- Stored temporarily for batch generation
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS duplicate_flags (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id   UUID NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
  possible_matches  JSONB NOT NULL, -- Array of student records
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_students_normalized_name ON students(normalized_name);
CREATE INDEX IF NOT EXISTS idx_event_reg_normalized_name ON event_registrations(normalized_name);
CREATE INDEX IF NOT EXISTS idx_gen_credentials_batch ON generated_credentials(batch_id);
CREATE INDEX IF NOT EXISTS idx_dup_flags_reg ON duplicate_flags(registration_id);

-- 7. RLS Policies
ALTER TABLE credential_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_full_access_batches" ON credential_batches FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "admins_full_access_gen_creds" ON generated_credentials FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "admins_full_access_dup_flags" ON duplicate_flags FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 8. Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('credentials', 'credentials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin_full_access_credentials" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'credentials' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (bucket_id = 'credentials' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

