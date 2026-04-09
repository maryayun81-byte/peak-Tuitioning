-- ============================================================
-- FIX: trivia_group_members RLS for squad joins
-- 
-- The previous upsert approach failed because:
-- 1. upsert = INSERT + ON CONFLICT DO UPDATE
-- 2. The UPDATE path has no permissive RLS policy for the group creator
-- 3. The auto-join trigger already inserted the creator, so the
--    upsert hit the UPDATE path for the creator row, which was blocked.
--
-- Fix: Create a SECURITY DEFINER function that handles member insertion
-- server-side without RLS interference, with explicit permission checks.
-- ============================================================

-- 1. Add explicit UPDATE policy for group creators
DROP POLICY IF EXISTS "Group creators can update member records" ON trivia_group_members;
CREATE POLICY "Group creators can update member records"
  ON trivia_group_members FOR UPDATE
  USING (
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = get_my_student_id()
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = get_my_student_id()
    )
  );

-- 2. SECURITY DEFINER function to safely add multiple members to a trivia group.
--    This runs as the OWNER (postgres) so it bypasses student RLS,
--    but has explicit permission checks baked in.
CREATE OR REPLACE FUNCTION add_trivia_group_members(
  p_group_id   UUID,
  p_member_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id    UUID;
  v_calling_id    UUID;
  v_session_id    UUID;
  v_member_count  INTEGER;
  v_sid           UUID;
BEGIN
  -- Get the calling student's ID
  SELECT id INTO v_calling_id FROM students WHERE user_id = auth.uid();
  IF v_calling_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: not a student';
  END IF;

  -- Get the group creator
  SELECT created_by, session_id INTO v_creator_id, v_session_id
  FROM trivia_groups WHERE id = p_group_id;
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  -- Only the group creator or the student adding themselves is allowed
  IF v_creator_id != v_calling_id AND NOT (
    array_length(p_member_ids, 1) = 1 AND p_member_ids[1] = v_calling_id
  ) THEN
    RAISE EXCEPTION 'Permission denied: only the group creator can add other members';
  END IF;

  -- Check current member count won't exceed 3
  SELECT COUNT(*) INTO v_member_count
  FROM trivia_group_members WHERE group_id = p_group_id;

  IF v_member_count + array_length(p_member_ids, 1) > 3 THEN
    RAISE EXCEPTION 'Squad is full (max 3 members)';
  END IF;

  -- Insert each member, skip duplicates silently
  FOREACH v_sid IN ARRAY p_member_ids
  LOOP
    -- Skip if already in session (prevents duplicate session membership)
    IF EXISTS (
      SELECT 1 FROM trivia_group_members m
      JOIN trivia_groups g ON m.group_id = g.id
      WHERE g.session_id = v_session_id AND m.student_id = v_sid
        AND m.group_id != p_group_id
    ) THEN
      CONTINUE; -- Already in another group in this session, skip
    END IF;

    INSERT INTO trivia_group_members (group_id, student_id)
    VALUES (p_group_id, v_sid)
    ON CONFLICT (group_id, student_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION add_trivia_group_members(UUID, UUID[]) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
