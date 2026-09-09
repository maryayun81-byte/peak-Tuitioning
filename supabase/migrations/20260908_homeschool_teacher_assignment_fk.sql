-- ============================================================
-- HOMESCHOOLING — Referential integrity for teacher assignments
-- Every teacher assignment must reference a subject that is
-- actually enrolled in the same homeschool enrollment.
-- Composite FK on (enrollment_id, subject_id) → homeschool_subjects.
-- Also enables PostgREST to embed teacher assignments inside
-- homeschool subjects directly.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_hsta_enrolled_subject'
  ) THEN
    ALTER TABLE homeschool_teacher_assignments
      ADD CONSTRAINT fk_hsta_enrolled_subject
      FOREIGN KEY (enrollment_id, subject_id)
      REFERENCES homeschool_subjects (enrollment_id, subject_id)
      ON DELETE CASCADE;
  END IF;
END $$;
