-- ============================================================
-- Payment plans: per-student billing cadence for the weekly
-- payments tracker.
--
-- Why: a student can be billed either a flat fee per teaching
-- week ('weekly') or per teaching day ('daily'). The expected
-- fee for the week, and therefore how credit/debt carries across
-- weeks, depends on which plan the student is on.
--   - weekly: expected = weekly_fee (or the week's override)
--   - daily:  expected = daily_fee x active teaching days in the
--             week (defaults to 5 days, or the tuition event's
--             actual active days)
-- ============================================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS payment_plan TEXT NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS daily_fee NUMERIC(10, 2);

UPDATE students SET daily_fee = 250 WHERE daily_fee IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_payment_plan_check'
  ) THEN
    ALTER TABLE students
      ADD CONSTRAINT students_payment_plan_check CHECK (payment_plan IN ('weekly', 'daily'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
