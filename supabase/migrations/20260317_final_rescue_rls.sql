-- FINAL RESCUE: ULTRA-SIMPLE RLS
-- This script removes all complexity to rule out recursion.

-- 1. Profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles view policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_allow_all_read" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_allow_own_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- 2. Teachers
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers view policy" ON teachers;
DROP POLICY IF EXISTS "teachers_select_admin" ON teachers;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teachers_allow_all_read" ON teachers FOR SELECT USING (TRUE);
CREATE POLICY "teachers_allow_admin_all" ON teachers FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 3. Students
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teacher views class students" ON students;
DROP POLICY IF EXISTS "students_select_admin" ON students;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_allow_all_read" ON students FOR SELECT USING (TRUE);

-- 4. Clean up functions (optional but good for stability)
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
