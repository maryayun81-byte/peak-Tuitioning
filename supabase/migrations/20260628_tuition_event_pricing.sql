ALTER TABLE tuition_events
  ADD COLUMN IF NOT EXISTS charge_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS charge_currency TEXT NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS charge_frequency TEXT,
  ADD COLUMN IF NOT EXISTS charge_unit_label TEXT,
  ADD COLUMN IF NOT EXISTS pricing_note TEXT,
  ADD COLUMN IF NOT EXISTS event_location TEXT,
  ADD COLUMN IF NOT EXISTS session_start_time TIME,
  ADD COLUMN IF NOT EXISTS session_end_time TIME;

COMMENT ON COLUMN tuition_events.charge_amount IS 'Public/admin tuition event charge amount, for example 1250 or 2000.';
COMMENT ON COLUMN tuition_events.charge_currency IS 'Currency label for event charges, usually KES.';
COMMENT ON COLUMN tuition_events.charge_frequency IS 'Billing frequency such as weekly, per_session, per_2_hours, per_term, full_programme, monthly.';
COMMENT ON COLUMN tuition_events.charge_unit_label IS 'Human-readable unit shown publicly, for example per week or per 2 hours.';
COMMENT ON COLUMN tuition_events.pricing_note IS 'Optional public note for discounts, siblings, deposits, or payment instructions.';
COMMENT ON COLUMN tuition_events.event_location IS 'Public event venue/location, for example Nairobi Campus, Westlands or Online.';
COMMENT ON COLUMN tuition_events.session_start_time IS 'Daily session start time for this event.';
COMMENT ON COLUMN tuition_events.session_end_time IS 'Daily session end time for this event.';
