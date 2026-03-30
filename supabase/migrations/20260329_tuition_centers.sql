-- Migration: Add Tuition Centers

CREATE TABLE IF NOT EXISTS tuition_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE tuition_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tuition_centers" ON tuition_centers 
FOR SELECT USING (TRUE);

CREATE POLICY "Admin manages tuition_centers" ON tuition_centers 
FOR ALL USING (
  (SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text) = 'admin'
);

-- Trigger for updated_at
CREATE TRIGGER trg_tuition_centers_updated 
BEFORE UPDATE ON tuition_centers 
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add tuition_center_id to relevant tables
ALTER TABLE classes 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;

ALTER TABLE subjects 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;

ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;

ALTER TABLE teacher_assignments 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;

ALTER TABLE timetables 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE CASCADE;

ALTER TABLE quizzes 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;

ALTER TABLE trivia_sessions 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;
