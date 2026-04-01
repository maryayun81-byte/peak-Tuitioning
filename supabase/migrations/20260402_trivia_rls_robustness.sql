-- ============================================================
-- TRIVIA RLS ROBUSTNESS
-- Standardizing student ID lookups and grant explicit join 
-- permissions to prevent RLS errors during group activities.
-- ============================================================

-- 1. TRIVIA GROUPS
DROP POLICY IF EXISTS "Students manage groups they created" ON trivia_groups;
CREATE POLICY "Students manage groups they created"
  ON trivia_groups FOR ALL
  USING (
    created_by = get_my_student_id() 
    OR auth_role() IN ('teacher', 'admin')
  );

DROP POLICY IF EXISTS "Students can create groups" ON trivia_groups;
CREATE POLICY "Students can create groups"
  ON trivia_groups FOR INSERT
  WITH CHECK (
    auth_role() = 'student' 
    AND created_by = get_my_student_id()
  );

-- 2. TRIVIA GROUP MEMBERS
DROP POLICY IF EXISTS "Students can join groups" ON trivia_group_members;
DROP POLICY IF EXISTS "Students can join or invite to groups" ON trivia_group_members;

CREATE POLICY "Students can join or invite to groups"
  ON trivia_group_members FOR INSERT
  WITH CHECK (
    -- Case: Student joining themselves
    student_id = get_my_student_id()
    OR
    -- Case: Creator of the group inviting teammates
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = get_my_student_id()
    )
  );

DROP POLICY IF EXISTS "Students can leave groups" ON trivia_group_members;
CREATE POLICY "Students can leave groups"
  ON trivia_group_members FOR DELETE
  USING (
    student_id = get_my_student_id()
    OR 
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = get_my_student_id()
    )
  );

-- 3. SQUAD MEMBERS (Persistent)
DROP POLICY IF EXISTS "Students join or invite to squads" ON squad_members;
CREATE POLICY "Students join or invite to squads"
  ON squad_members FOR INSERT
  WITH CHECK (
    -- Case: Joining themselves
    student_id = get_my_student_id()
    OR
    -- Case: Creator inviting teammates
    squad_id IN (
      SELECT id FROM squads WHERE created_by = get_my_student_id()
    )
  );

DROP POLICY IF EXISTS "Students leave squads" ON squad_members;
CREATE POLICY "Students leave squads"
  ON squad_members FOR DELETE
  USING (
    student_id = get_my_student_id()
    OR
    squad_id IN (
      SELECT id FROM squads WHERE created_by = get_my_student_id()
    )
  );

-- 4. TRIVIA SUBMISSIONS
DROP POLICY IF EXISTS "Students in group can submit" ON trivia_submissions;
CREATE POLICY "Students in group can submit"
  ON trivia_submissions FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM trivia_group_members WHERE student_id = get_my_student_id()
    )
  );

DROP POLICY IF EXISTS "Students view their group's submission" ON trivia_submissions;
CREATE POLICY "Students view their group's submission"
  ON trivia_submissions FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM trivia_group_members WHERE student_id = get_my_student_id()
    ) 
    OR auth_role() IN ('teacher', 'admin')
  );

-- Notify schema change
NOTIFY pgrst, 'reload schema';
