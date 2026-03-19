-- PEAK PERFORMANCE EMERGENCY DB REPAIR
-- This script aggressively resets RLS to stop hangs.

-- 1. Disable RLS temporarily to ensure we can fix things without being blocked
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;

-- 2. Drop any recursive policies
DROP POLICY IF EXISTS "Admin views all students" ON students;
DROP POLICY IF EXISTS "Teacher views class students" ON students;
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
DROP POLICY IF EXISTS "Teacher views own record" ON teachers;
DROP POLICY IF EXISTS "Admin views all teachers" ON teachers;
DROP POLICY IF EXISTS "All can view teachers" ON teachers;

-- 3. Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- 4. Create FLAT policies (No subqueries, just JWT metadata checks)
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR id = auth.uid());
CREATE POLICY "students_select_admin" ON students FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR user_id = auth.uid());
CREATE POLICY "teachers_select_admin" ON teachers FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR user_id = auth.uid());
CREATE POLICY "assignments_select_all" ON teacher_assignments FOR SELECT USING (TRUE); -- Fast read

-- 5. Give Admin full power bypass
CREATE POLICY "admin_all_profiles" ON profiles FOR ALL TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_all_students" ON students FOR ALL TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_all_teachers" ON teachers FOR ALL TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 6. Re-optimize the helper functions with explicit search paths
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_my_teacher_id() RETURNS UUID AS $$
  SELECT id FROM public.teachers WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_student_id() RETURNS UUID AS $$
  SELECT id FROM public.students WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
