-- ============================================================
-- HOMESCHOOLING — Remove stale PENDING enrollments
-- Legacy rows created before activation-on-create existed.
-- Only removes PENDING enrollments with NO learning activity:
-- no completed objectives, no reflections, no started missions,
-- no submissions on linked assignments. Active learning is
-- never touched. Children cascade via existing FKs; the audit
-- log keeps target_id references (no FK) for traceability.
-- ============================================================

DO $$
DECLARE
  v_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(he.id) INTO v_ids
  FROM homeschool_enrollments he
  WHERE he.status = 'PENDING'
    AND NOT EXISTS (
      SELECT 1
      FROM learning_sessions ls
      JOIN learning_objectives lo
        ON lo.session_id = ls.id
       AND lo.is_completed = TRUE
      WHERE ls.enrollment_id = he.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM learning_sessions ls
      JOIN learning_reflections lr
        ON lr.session_id = ls.id
      WHERE ls.enrollment_id = he.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM learning_sessions ls
      JOIN learning_missions lm
        ON lm.session_id = ls.id
       AND lm.is_started = TRUE
      WHERE ls.enrollment_id = he.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM learning_sessions ls
      JOIN assignments a
        ON a.session_id = ls.id
      JOIN submissions s
        ON s.assignment_id = a.id
      WHERE ls.enrollment_id = he.id
    );

  IF v_ids IS NOT NULL AND array_length(v_ids, 1) > 0 THEN
    DELETE FROM homeschool_enrollments WHERE id = ANY(v_ids);
    RAISE NOTICE 'Removed % stale PENDING homeschool enrollment(s)', array_length(v_ids, 1);
  ELSE
    RAISE NOTICE 'No stale PENDING homeschool enrollments found — nothing removed';
  END IF;
END $$;
