ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS parent_name TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone TEXT,
  ADD COLUMN IF NOT EXISTS student_phone TEXT,
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS curriculum_label TEXT,
  ADD COLUMN IF NOT EXISTS class_level TEXT,
  ADD COLUMN IF NOT EXISTS programme_selected TEXT,
  ADD COLUMN IF NOT EXISTS preferred_mode TEXT,
  ADD COLUMN IF NOT EXISTS overall_grade TEXT,
  ADD COLUMN IF NOT EXISTS subject_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS whatsapp_summary TEXT;

CREATE INDEX IF NOT EXISTS idx_event_reg_programme_selected
  ON event_registrations (programme_selected);

CREATE INDEX IF NOT EXISTS idx_event_reg_curriculum_label
  ON event_registrations (curriculum_label);

CREATE INDEX IF NOT EXISTS idx_event_reg_subject_results_gin
  ON event_registrations USING GIN (subject_results);
