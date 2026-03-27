-- ============================================================
-- Squad Membership Fixes: Auto-Join, Capacity, and One-Squad Rule
-- ============================================================

-- 1. Function to auto-join the creator to their own group
CREATE OR REPLACE FUNCTION fn_trivia_group_auto_join_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO trivia_group_members (group_id, student_id)
  VALUES (NEW.id, NEW.created_by)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_trivia_group_auto_join
  AFTER INSERT ON trivia_groups
  FOR EACH ROW EXECUTE FUNCTION fn_trivia_group_auto_join_creator();

-- 2. Function to enforce capacity and single-squad rule
CREATE OR REPLACE FUNCTION fn_trivia_member_constraints()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
  v_member_count INTEGER;
  v_already_in_session BOOLEAN;
BEGIN
  -- Get session id for the target group
  SELECT session_id INTO v_session_id FROM trivia_groups WHERE id = NEW.group_id;

  -- Check capacity (Max 3)
  SELECT count(*) INTO v_member_count FROM trivia_group_members WHERE group_id = NEW.group_id;
  IF v_member_count >= 3 THEN
    RAISE EXCEPTION 'Squad is full (Max 3 members)';
  END IF;

  -- Check if student is already in a group for THIS session
  SELECT EXISTS (
    SELECT 1 FROM trivia_group_members m
    JOIN trivia_groups g ON m.group_id = g.id
    WHERE g.session_id = v_session_id AND m.student_id = NEW.student_id
  ) INTO v_already_in_session;

  IF v_already_in_session THEN
    RAISE EXCEPTION 'You are already a member of another squad in this session';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_trivia_member_constraints
  BEFORE INSERT ON trivia_group_members
  FOR EACH ROW EXECUTE FUNCTION fn_trivia_member_constraints();

-- 3. Function to cleanup empty groups
CREATE OR REPLACE FUNCTION fn_trivia_cleanup_empty_groups()
RETURNS TRIGGER AS $$
BEGIN
  -- If the last member leaves, delete the group
  IF NOT EXISTS (SELECT 1 FROM trivia_group_members WHERE group_id = OLD.group_id) THEN
    DELETE FROM trivia_groups WHERE id = OLD.group_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_trivia_cleanup_empty_groups
  AFTER DELETE ON trivia_group_members
  FOR EACH ROW EXECUTE FUNCTION fn_trivia_cleanup_empty_groups();

-- 4. Update RLS for trivia_group_members
DROP POLICY IF EXISTS "Students can join groups" ON trivia_group_members;

CREATE POLICY "Students can join or invite to groups"
  ON trivia_group_members FOR INSERT
  WITH CHECK (
    -- Joining themselves
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
    OR
    -- Creator inviting teammates
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = (SELECT id FROM students WHERE user_id = auth.uid())
    )
  );

-- Allow students to view all memberships for their session
-- (Already exists in trivia_system migration, but just in case)
DROP POLICY IF EXISTS "Anyone authenticated views group members" ON trivia_group_members;
CREATE POLICY "Anyone authenticated views group members"
  ON trivia_group_members FOR SELECT
  USING (auth.uid() IS NOT NULL);
