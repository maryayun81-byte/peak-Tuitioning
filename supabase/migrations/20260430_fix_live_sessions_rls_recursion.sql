-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Teachers can manage their own live sessions" ON live_sessions;
DROP POLICY IF EXISTS "Students can view live sessions for their class" ON live_sessions;
DROP POLICY IF EXISTS "Anyone can view live sessions" ON live_sessions;
DROP POLICY IF EXISTS "Teachers can insert their own live sessions" ON live_sessions;

-- 2. Create optimized, non-recursive policies
-- Use direct user_id comparison where possible to avoid recursion depth issues

-- TEACHERS: Can manage sessions they created
CREATE POLICY "Teachers can manage own sessions" ON live_sessions
FOR ALL
TO authenticated
USING (
  teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
);

-- STUDENTS: Can view sessions for their center and class
CREATE POLICY "Students can view relevant sessions" ON live_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE students.user_id = auth.uid()
    AND students.class_id = live_sessions.class_id
    AND students.tuition_center_id = live_sessions.tuition_center_id
  )
);

-- ADMINS: Full access
CREATE POLICY "Admins have full access to live sessions" ON live_sessions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
