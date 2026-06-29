ALTER TABLE public.tuition_events
  ADD COLUMN IF NOT EXISTS banner_object_position TEXT DEFAULT 'center center',
  ADD COLUMN IF NOT EXISTS banner_overlay_strength INTEGER DEFAULT 70;

ALTER TABLE public.tuition_event_class_slots
  ADD COLUMN IF NOT EXISTS charge_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS charge_currency TEXT DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS charge_frequency TEXT,
  ADD COLUMN IF NOT EXISTS charge_unit_label TEXT,
  ADD COLUMN IF NOT EXISTS pricing_note TEXT;
