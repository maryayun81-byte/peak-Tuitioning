-- ============================================================
-- TRIVIA MEMBERSHIP TRIGGER FIX
-- Refines the membership constraints to prevent 
-- self-blocking when auto-joining or upserting.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_trivia_member_constraints()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
  v_member_count INTEGER;
  v_other_group_id UUID;
BEGIN
  -- 1. Get session id for the target group
  SELECT session_id INTO v_session_id 
  FROM trivia_groups 
  WHERE id = NEW.group_id;

  -- 2. Check capacity (Max 3)
  -- Count excluding the current student if they are already in (for upserts)
  SELECT count(*) INTO v_member_count 
  FROM trivia_group_members 
  WHERE group_id = NEW.group_id AND student_id != NEW.student_id;

  IF v_member_count >= 3 THEN
    RAISE EXCEPTION 'Squad is full (Max 3 members)';
  END IF;

  -- 3. Check for membership in A DIFFERENT group in the same session
  -- This prevents the "already in session" error when the student is 
  -- actually already in the SAME group (e.g. via auto-join trigger).
  SELECT m.group_id INTO v_other_group_id
  FROM trivia_group_members m
  JOIN trivia_groups g ON m.group_id = g.id
  WHERE g.session_id = v_session_id 
    AND m.student_id = NEW.student_id
    AND m.group_id != NEW.group_id  -- CRITICAL: Allow if it's the SAME group
  LIMIT 1;

  IF v_other_group_id IS NOT NULL THEN
    RAISE EXCEPTION 'You are already a member of another squad in this session';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- No need to recreate the trigger, just replacing the function logic.

NOTIFY pgrst, 'reload schema';
