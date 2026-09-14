-- §05–07, §130: spec-alignment — entitlement source of truth + timetable alias.
-- learning_sessions is the implementation; spec names it homeschool_timetable_sessions.
-- Provide a read-compatible view so both names resolve to the same data.

CREATE OR REPLACE VIEW public.homeschool_timetable_sessions AS
SELECT
  id,
  enrollment_id,
  week_id,
  subject_id,
  teacher_id,
  day AS weekday,
  day,
  start_time,
  end_time,
  learning_mode AS session_mode,
  learning_mode,
  topic,
  status,
  student_status,
  created_at,
  updated_at
FROM public.learning_sessions;

-- Expire enrollments whose end_date passed (safe: only ACTIVE → EXPIRED).
CREATE OR REPLACE FUNCTION public.expire_overdue_homeschool_enrollments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  UPDATE public.homeschool_enrollments
  SET status = 'EXPIRED', updated_at = now()
  WHERE status = 'ACTIVE'
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;
  GET DIAGNOSTICS updated_count = ROW_COUNT;

  UPDATE public.student_entitlements
  SET status = 'EXPIRED', ends_at = now(), updated_at = now()
  WHERE feature = 'HOMESCHOOLING'
    AND status = 'ACTIVE'
    AND student_id IN (
      SELECT student_id FROM public.homeschool_enrollments
      WHERE status = 'EXPIRED'
    );
  RETURN updated_count;
END;
$$;
