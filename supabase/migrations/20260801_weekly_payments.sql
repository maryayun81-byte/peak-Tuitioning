-- ============================================================
-- Weekly Payments: standard weekly fee per student.
--
-- Why: the Weekly Payments admin page tracks what each student
-- owes per week (expected − paid, carried across weeks). The
-- expected amount is the student's normal weekly rate. The students
-- table has no fee column yet, so this migration adds one with a
-- sensible default. Existing rows get the default (1250.00); admins
-- can then set per-student rates inline on the page.
-- ============================================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS weekly_fee NUMERIC(10, 2) NOT NULL DEFAULT 1250.00;

NOTIFY pgrst, 'reload schema';
