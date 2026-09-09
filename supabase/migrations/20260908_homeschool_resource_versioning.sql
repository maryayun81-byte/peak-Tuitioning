-- ============================================================
-- HOMESCHOOLING — Resource versioning (§63)
-- Replacing a session resource keeps the old row as history
-- (is_current = FALSE, superseded_by → new row) instead of
-- overwriting learning evidence.
-- ============================================================

ALTER TABLE learning_resources
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE learning_resources
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES learning_resources(id) ON DELETE SET NULL;

ALTER TABLE learning_resources
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_hs_resources_current
  ON learning_resources(session_id, is_current);
