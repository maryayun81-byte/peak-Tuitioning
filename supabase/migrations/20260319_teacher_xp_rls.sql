-- Allow teachers to update student records (specifically needed to award XP)
-- We restrict this to students in classes the teacher is assigned to.

CREATE POLICY "Teacher updates mapped students" ON students
FOR UPDATE USING (
  auth_role() = 'teacher' AND class_id IN (
    SELECT class_id FROM teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);
