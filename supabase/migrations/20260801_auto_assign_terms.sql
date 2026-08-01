-- ============================================================
-- Auto-assign the latest published terms document to teachers.
--
-- Why: terms enforcement is assignment-driven. The teacher layout
-- only shows the TermsEnforcementModal when a row exists in
-- document_assignments with status = 'pending'. Teachers created
-- AFTER the admin runs "Assign to All Active Teachers" (e.g.
-- self-registered teachers) never get an assignment, so they never
-- see the terms modal. This migration backfills those teachers and
-- ensures every newly created teacher is auto-assigned.
-- ============================================================

-- ── BACKFILL ──────────────────────────────────────────────────
-- Give every teacher who is missing an assignment for the LATEST
-- published document a pending assignment. Idempotent.
INSERT INTO document_assignments (document_id, teacher_id, status, assigned_at)
SELECT d.id, t.id, 'pending', NOW()
FROM teachers t
CROSS JOIN LATERAL (
  SELECT id FROM documents
  WHERE status = 'published'
  ORDER BY created_at DESC
  LIMIT 1
) d
WHERE NOT EXISTS (
  SELECT 1 FROM document_assignments a
  WHERE a.document_id = d.id AND a.teacher_id = t.id
);

-- ── NEW TEACHERS ──────────────────────────────────────────────
-- Auto-assign the latest published document whenever a teacher row
-- is created (self-registration, admin invite, or invite claim).
CREATE OR REPLACE FUNCTION auto_assign_terms_to_teacher()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO document_assignments (document_id, teacher_id, status, assigned_at)
  SELECT id, NEW.id, 'pending', NOW()
  FROM documents
  WHERE status = 'published'
  ORDER BY created_at DESC
  LIMIT 1
  ON CONFLICT (document_id, teacher_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_assign_terms ON teachers;
CREATE TRIGGER trg_auto_assign_terms
AFTER INSERT ON teachers
FOR EACH ROW EXECUTE FUNCTION auto_assign_terms_to_teacher();

NOTIFY pgrst, 'reload schema';
