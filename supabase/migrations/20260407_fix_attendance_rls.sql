-- Fix attendance RLS to allow any teacher assigned to the class to manage attendance
-- This prevents issues where one teacher creates the row and another teacher (or substitute) cannot update it.

DROP POLICY IF EXISTS "Teacher manages attendance" ON attendance;

CREATE POLICY "Teacher manages attendance" ON attendance FOR ALL USING (
  class_id IN (
    SELECT class_id FROM teacher_assignments WHERE teacher_id = get_my_teacher_id() AND is_class_teacher = TRUE
  ) OR auth_role() = 'admin'
);
