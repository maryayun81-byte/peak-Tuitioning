-- ============================================================
-- Weekly Payments: database persistence for the admin tracker.
--
-- Why: the Weekly Payments admin page previously kept per-week
-- transactional data (payments, fee overrides, promises) in the
-- browser's localStorage. That made the scheduled Friday report
-- impossible — a server-side job has no access to a user's browser.
-- This migration moves that data into Supabase so the page AND the
-- automated Peak Coach weekly report read from the same source.
--
-- Also adds students.weekly_roster_archived so "remove from roster"
-- is durable (history is kept, student hidden from the roster).
-- ============================================================

-- ── ROSTER HIDING ──────────────────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS weekly_roster_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- ── PER-STUDENT WEEKLY PAYMENTS ───────────────────────────────
CREATE TABLE IF NOT EXISTS student_weekly_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,                -- Monday of the week the payment covers
  paid_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL DEFAULT 'Cash',
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_weekly_payments_lookup
  ON student_weekly_payments(student_id, week_start);

-- ── PER-WEEK FEE OVERRIDES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_weekly_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,                -- Monday of the week the override applies to
  amount NUMERIC(15, 2) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, week_start)
);

-- ── PER-WEEK PROMISED PAYMENT DATES ───────────────────────────
CREATE TABLE IF NOT EXISTS student_weekly_promises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  promised_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, week_start)
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE student_weekly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_weekly_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_weekly_promises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_weekly_payments" ON student_weekly_payments;
CREATE POLICY "staff_all_weekly_payments"
  ON student_weekly_payments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'finance')));

DROP POLICY IF EXISTS "staff_all_weekly_overrides" ON student_weekly_overrides;
CREATE POLICY "staff_all_weekly_overrides"
  ON student_weekly_overrides FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'finance')));

DROP POLICY IF EXISTS "staff_all_weekly_promises" ON student_weekly_promises;
CREATE POLICY "staff_all_weekly_promises"
  ON student_weekly_promises FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'finance')));

NOTIFY pgrst, 'reload schema';
