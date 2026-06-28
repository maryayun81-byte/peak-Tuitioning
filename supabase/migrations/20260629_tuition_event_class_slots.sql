CREATE TABLE IF NOT EXISTS public.tuition_event_class_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.tuition_events(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES public.curriculums(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_tuition_event_class_slots_event
  ON public.tuition_event_class_slots(event_id);

CREATE INDEX IF NOT EXISTS idx_tuition_event_class_slots_curriculum
  ON public.tuition_event_class_slots(curriculum_id);

CREATE OR REPLACE FUNCTION public.set_tuition_event_class_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tuition_event_class_slots_updated_at ON public.tuition_event_class_slots;
CREATE TRIGGER trg_tuition_event_class_slots_updated_at
BEFORE UPDATE ON public.tuition_event_class_slots
FOR EACH ROW
EXECUTE FUNCTION public.set_tuition_event_class_slots_updated_at();

ALTER TABLE public.tuition_event_class_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view tuition event class slots" ON public.tuition_event_class_slots;
CREATE POLICY "Public can view tuition event class slots"
ON public.tuition_event_class_slots
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage tuition event class slots" ON public.tuition_event_class_slots;
CREATE POLICY "Authenticated users can manage tuition event class slots"
ON public.tuition_event_class_slots
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.tuition_event_class_slots IS 'Per tuition event capacity by curriculum and class/grade/form.';
COMMENT ON COLUMN public.tuition_event_class_slots.capacity IS 'Maximum registrations allowed for this event in this class.';

CREATE OR REPLACE FUNCTION public.prevent_tuition_event_slot_overbooking()
RETURNS TRIGGER AS $$
DECLARE
  v_class_id UUID;
  v_capacity INTEGER;
  v_registered INTEGER;
BEGIN
  IF NEW.status = 'cancelled' OR NEW.tuition_event_id IS NULL OR NEW.curriculum_label IS NULL OR NEW.class_level IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.id
  INTO v_class_id
  FROM public.classes c
  JOIN public.curriculums cu ON cu.id = c.curriculum_id
  WHERE cu.name = NEW.curriculum_label
    AND c.name = NEW.class_level
  LIMIT 1;

  IF v_class_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT capacity
  INTO v_capacity
  FROM public.tuition_event_class_slots
  WHERE event_id = NEW.tuition_event_id
    AND class_id = v_class_id
  LIMIT 1;

  IF v_capacity IS NULL OR v_capacity <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO v_registered
  FROM public.event_registrations er
  WHERE er.tuition_event_id = NEW.tuition_event_id
    AND er.curriculum_label = NEW.curriculum_label
    AND er.class_level = NEW.class_level
    AND COALESCE(er.status, 'active') <> 'cancelled'
    AND (TG_OP = 'INSERT' OR er.id <> NEW.id);

  IF v_registered >= v_capacity THEN
    RAISE EXCEPTION 'No slots remaining for % % in this tuition event.', NEW.curriculum_label, NEW.class_level
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_tuition_event_slot_overbooking ON public.event_registrations;
CREATE TRIGGER trg_prevent_tuition_event_slot_overbooking
BEFORE INSERT OR UPDATE OF tuition_event_id, curriculum_label, class_level, status
ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_tuition_event_slot_overbooking();
