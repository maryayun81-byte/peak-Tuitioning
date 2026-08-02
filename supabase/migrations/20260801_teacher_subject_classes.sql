-- Teacher subject/class registrations (self-registered teaching profile)
-- A teacher opts into teaching a subject for a class when new subjects are
-- added to their assigned curriculum. These rows coexist with the admin-driven
-- teacher_assignments table (which is still the source of truth for timetables
-- and marking); teacher_subject_classes only records the teacher's own choices.
CREATE TABLE IF NOT EXISTS teacher_subject_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  curriculum_id uuid REFERENCES curriculums(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_subject_classes_teacher_subject_class_key UNIQUE (teacher_id, subject_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_classes_teacher ON teacher_subject_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_classes_class ON teacher_subject_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_classes_subject ON teacher_subject_classes(subject_id);

ALTER TABLE teacher_subject_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teacher manages own subject classes" ON teacher_subject_classes;
CREATE POLICY "Teacher manages own subject classes"
  ON teacher_subject_classes
  FOR ALL
  USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
  WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage all teacher subject classes" ON teacher_subject_classes;
CREATE POLICY "Admins manage all teacher subject classes"
  ON teacher_subject_classes
  FOR ALL
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

CREATE TRIGGER trg_teacher_subject_classes_updated
  BEFORE UPDATE ON teacher_subject_classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
