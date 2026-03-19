-- helper functions to bypass RLS for identity lookups to prevent recursion
CREATE OR REPLACE FUNCTION get_my_parent_id() RETURNS UUID AS $$
  SELECT id FROM parents WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_teacher_id() RETURNS UUID AS $$
  SELECT id FROM teachers WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_student_id() RETURNS UUID AS $$
  SELECT id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_student_parent_id() RETURNS UUID AS $$
  SELECT parent_id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_student_class_id() RETURNS UUID AS $$
  SELECT class_id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- update students policies
DROP POLICY IF EXISTS "Teacher views class students" ON students;
CREATE POLICY "Teacher views class students" ON students FOR SELECT USING (
  auth_role() = 'teacher' AND class_id IN (
    SELECT class_id FROM teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);

DROP POLICY IF EXISTS "Parent views linked students" ON students;
CREATE POLICY "Parent views linked students" ON students FOR SELECT USING (
  parent_id = get_my_parent_id()
);

-- update parents policies
DROP POLICY IF EXISTS "Student can view linked parent" ON parents;
CREATE POLICY "Student can view linked parent" ON parents FOR SELECT USING (
  id = get_my_student_parent_id()
);

-- update quizzes policies
DROP POLICY IF EXISTS "Student views published quizzes for class" ON quizzes;
CREATE POLICY "Student views published quizzes for class" ON quizzes FOR SELECT USING (
  is_published = TRUE AND class_id = get_my_student_class_id()
);

-- update assignments policies
DROP POLICY IF EXISTS "Student views published assignments for class" ON assignments;
CREATE POLICY "Student views published assignments for class" ON assignments FOR SELECT USING (
  status = 'published' AND class_id = get_my_student_class_id()
);

-- update attendance policies
DROP POLICY IF EXISTS "Student views own attendance" ON attendance;
CREATE POLICY "Student views own attendance" ON attendance FOR SELECT USING (
  student_id = get_my_student_id()
);

-- update resources policies
DROP POLICY IF EXISTS "Students view resources for their class" ON resources;
CREATE POLICY "Students view resources for their class" ON resources FOR SELECT USING (
  class_id = get_my_student_class_id()
);
