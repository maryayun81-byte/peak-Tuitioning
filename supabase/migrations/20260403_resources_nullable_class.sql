-- Migration: Make class_id and subject_id nullable on resources table
-- This allows broadcast, public, and student-targeted resources
-- to exist without being tied to a single class or subject.

ALTER TABLE resources
  ALTER COLUMN class_id DROP NOT NULL;

ALTER TABLE resources
  ALTER COLUMN subject_id DROP NOT NULL;

-- Also update the RLS policy so students can see resources
-- shared with them via student_ids or broadcast
DROP POLICY IF EXISTS "Students view resources for their class" ON resources;

CREATE POLICY "Students view resources for their class" ON resources
  FOR SELECT USING (
    -- Shared with the student's class
    class_id = get_my_student_class_id()
    OR
    -- Broadcast/public resource
    audience IN ('broadcast', 'public')
    OR
    -- Explicitly targeted at this student
    (get_my_student_id())::uuid = ANY(student_ids)
  );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
