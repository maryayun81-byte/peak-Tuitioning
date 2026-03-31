-- ============================================================
-- EVENT REGISTRATIONS
-- Tracks students enrolled in tuition events (both with/without accounts)
-- ============================================================

CREATE TABLE IF NOT EXISTS event_registrations (
  id                 UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name       TEXT         NOT NULL, -- Primary name for the registration
  student_id         UUID         REFERENCES students(id) ON DELETE SET NULL, -- Optional link to account
  tuition_event_id   UUID         NOT NULL REFERENCES tuition_events(id) ON DELETE CASCADE,
  class_id           UUID         REFERENCES classes(id) ON DELETE SET NULL,
  tuition_center_id  UUID         REFERENCES tuition_centers(id) ON DELETE SET NULL,
  registered_at      TIMESTAMPTZ  DEFAULT NOW(),
  notes              TEXT,
  status             TEXT         DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'suspended')),
  UNIQUE (tuition_event_id, student_name, student_id)
);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_event_reg_event   ON event_registrations (tuition_event_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_class   ON event_registrations (class_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_center  ON event_registrations (tuition_center_id);

-- Enable RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "admins_all_event_registrations" ON event_registrations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Teachers can read
CREATE POLICY "teachers_read_event_registrations" ON event_registrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );
