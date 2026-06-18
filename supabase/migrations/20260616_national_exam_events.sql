-- National exam countdown dates are separate from internal exam_events.
-- Internal exam_events remain for Peak assessments, marks, and transcripts.

CREATE TABLE IF NOT EXISTS national_exam_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type TEXT NOT NULL CHECK (exam_type IN ('KCSE', 'KPSEA', 'KJSEA')),
  name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  registration_deadline DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  target_class_ids UUID[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_national_exam_events_type_status_date
  ON national_exam_events(exam_type, status, exam_date);

ALTER TABLE national_exam_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view national exams" ON national_exam_events;
CREATE POLICY "Authenticated users can view national exams"
  ON national_exam_events FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin manages national exams" ON national_exam_events;
CREATE POLICY "Admin manages national exams"
  ON national_exam_events FOR ALL
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

CREATE OR REPLACE FUNCTION set_national_exam_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_national_exam_events_updated_at ON national_exam_events;
CREATE TRIGGER trg_national_exam_events_updated_at
BEFORE UPDATE ON national_exam_events
FOR EACH ROW
EXECUTE FUNCTION set_national_exam_events_updated_at();

NOTIFY pgrst, 'reload schema';
