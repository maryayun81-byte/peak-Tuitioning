-- Allow teachers to manage transcripts for students in classes they are assigned to
CREATE POLICY "Teacher manage transcripts for assigned students" ON transcripts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM students s
    JOIN teacher_assignments ta ON s.class_id = ta.class_id
    WHERE s.id = transcripts.student_id
    AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM students s
    JOIN teacher_assignments ta ON s.class_id = ta.class_id
    WHERE s.id = transcripts.student_id
    AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  )
);
