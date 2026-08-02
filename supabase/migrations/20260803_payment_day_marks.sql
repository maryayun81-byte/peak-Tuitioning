-- ============================================================
-- Payment day marks: finance-owned "used day" overrides.
--
-- Why: coverage ("paid until") consumes a paid teaching-day
-- credit when the student actually attends (from `attendance`).
-- But attendance is written by teachers and may lag the moment
-- the financier records a payment. This table lets finance staff
-- mark a day as used/consumed immediately without needing a
-- teacher, so carry-over coverage stays accurate in real time.
--
-- A `used = TRUE` row means the student attended that session and
-- consumed one paid day. There is intentionally no "skip" variant:
-- absence of a mark (and absence of attendance) already means the
-- day was not consumed and its credit rolls forward.
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_day_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
  tuition_event_id UUID NOT NULL REFERENCES tuition_events(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registration_id, date)
);

CREATE INDEX IF NOT EXISTS idx_payment_day_marks_lookup
  ON payment_day_marks(registration_id, date);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE payment_day_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_all_payment_day_marks" ON payment_day_marks;
CREATE POLICY "staff_all_payment_day_marks"
  ON payment_day_marks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'finance')));

NOTIFY pgrst, 'reload schema';
