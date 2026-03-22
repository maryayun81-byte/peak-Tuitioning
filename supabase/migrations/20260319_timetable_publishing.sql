-- Add publishing workflow to timetables
ALTER TABLE timetables
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'published', 'unpublished'));

COMMENT ON COLUMN timetables.status IS 'Workflow state: draft (admin only), published (visible to students/teachers), unpublished (hidden)';

-- RLS: students can see published timetables for their class
DROP POLICY IF EXISTS "Student views published timetables for own class" ON timetables;
CREATE POLICY "Student views published timetables for own class" ON timetables
  FOR SELECT USING (
    status = 'published' AND class_id = get_my_student_class_id()
  );

-- RLS: teachers can see published timetables for classes they teach
DROP POLICY IF EXISTS "Teacher views published timetables for assigned classes" ON timetables;
CREATE POLICY "Teacher views published timetables for assigned classes" ON timetables
  FOR SELECT USING (
    status = 'published' AND class_id IN (
      SELECT class_id FROM teacher_assignments WHERE teacher_id = get_my_teacher_id()
    )
  );

-- RLS: admins see all
DROP POLICY IF EXISTS "Admin manages all timetables" ON timetables;
CREATE POLICY "Admin manages all timetables" ON timetables
  FOR ALL USING (auth_role() = 'admin');
