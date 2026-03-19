-- Allow self-registration for teachers and parents
CREATE POLICY "Anyone can register as a teacher" ON teachers FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can register as a parent" ON parents FOR INSERT WITH CHECK (TRUE);

-- Ensure profiles can be created during signup
CREATE POLICY "Allow profile creation on signup" ON profiles FOR INSERT WITH CHECK (TRUE);

-- Optimization: sometimes SECURITY DEFINER functions need to be explicit about the search path
ALTER FUNCTION get_my_teacher_id() SET search_path = public;
ALTER FUNCTION get_my_student_id() SET search_path = public;
ALTER FUNCTION get_my_parent_id() SET search_path = public;
