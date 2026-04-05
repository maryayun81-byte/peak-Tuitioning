-- Migration: Fix Resource Broadcasting RLS
-- This migration ensures that resources targeted at specific centers, 
-- multiple classes (class_ids array), or individual students are correctly filtered.

-- 1. Helper function to get student's center (to avoid recursion in RLS)
CREATE OR REPLACE FUNCTION get_my_student_center_id() RETURNS UUID AS $$
  SELECT tuition_center_id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Update Resource RLS Policy
DROP POLICY IF EXISTS "Students view resources for their class" ON resources;

CREATE POLICY "Students view resources for their class" ON resources
  FOR SELECT USING (
    -- Shared with the student's primary class
    class_id = get_my_student_class_id()
    OR
    -- Shared via multiple class targeting (Broadcast/Specific)
    get_my_student_class_id() = ANY(class_ids)
    OR
    -- Explicitly targeted at this student
    (get_my_student_id())::uuid = ANY(student_ids)
    OR
    -- Broadcast or Public resource
    (
      (audience = 'public') 
      OR 
      (
        audience = 'broadcast' 
        AND (
          tuition_center_id IS NULL 
          OR 
          tuition_center_id = get_my_student_center_id()
        )
      )
    )
  );

-- 3. Notify PostgREST
NOTIFY pgrst, 'reload schema';
