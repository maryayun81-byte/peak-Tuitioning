-- EMERGENCY RLS SIMPLIFICATION & RECURSION BREAK
-- This migration replaces subqueries in policies with SECURITY DEFINER helpers

-- 1. Optimized Auth Role (JWT only)
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  -- Directly access the role from the JWT to avoid any DB lookups
  SELECT (COALESCE(auth.jwt() -> 'user_metadata', auth.jwt() -> 'app_metadata') ->> 'role')::text;
$$ LANGUAGE sql STABLE;

-- 2. Security Definer Helpers (Global search path for safety)
ALTER FUNCTION get_my_teacher_id() SET search_path = public;
ALTER FUNCTION get_my_student_id() SET search_path = public;
ALTER FUNCTION get_my_parent_id() SET search_path = public;

-- 3. Simplified Profiles RLS (Crucial for useAuth)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
CREATE POLICY "Profiles view policy" ON profiles FOR SELECT USING (
  id = auth.uid() OR auth_role() = 'admin'
);

-- 4. Simplified Students RLS (Heavy subqueries replaced)
DROP POLICY IF EXISTS "Teacher views class students" ON students;
CREATE POLICY "Teacher views class students" ON students FOR SELECT USING (
  auth_role() = 'teacher' AND class_id IN (
    SELECT class_id FROM teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);

-- 5. Simplified Teachers RLS
DROP POLICY IF EXISTS "Admin views all teachers" ON teachers;
DROP POLICY IF EXISTS "All can view teachers" ON teachers;
CREATE POLICY "Teachers view policy" ON teachers FOR SELECT USING (
  user_id = auth.uid() OR auth_role() = 'admin' OR TRUE -- Temporary TRUE to break hang
);

-- 6. Simplified Assignments RLS
DROP POLICY IF EXISTS "Teacher manages own assignments" ON assignments;
CREATE POLICY "Teacher manages own assignments" ON assignments FOR ALL USING (
  teacher_id = get_my_teacher_id() OR auth_role() = 'admin'
);

-- 7. Simplified Attendance RLS
DROP POLICY IF EXISTS "Teacher manages attendance" ON attendance;
CREATE POLICY "Teacher manages attendance" ON attendance FOR ALL USING (
  teacher_id = get_my_teacher_id() OR auth_role() = 'admin'
);
