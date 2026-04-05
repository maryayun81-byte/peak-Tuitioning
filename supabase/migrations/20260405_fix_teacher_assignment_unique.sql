-- Migration: Fix Teacher Assignment Unique Constraint
-- Description: Updates the unique constraint on teacher_assignments to include tuition_center_id.
-- This allow assigning a teacher to the same class/subject combo in different centers.

-- 1. Identify the existing unique constraint name
-- Default name from 001_schema.sql would be something like 'teacher_assignments_teacher_id_class_id_subject_id_key'
-- But let's use a safer dropping method if we know it.
ALTER TABLE teacher_assignments 
  DROP CONSTRAINT IF EXISTS teacher_assignments_teacher_id_class_id_subject_id_key;

-- 2. Add the new constraint
ALTER TABLE teacher_assignments 
  ADD CONSTRAINT teacher_assignments_teacher_class_subject_center_key 
  UNIQUE (teacher_id, class_id, subject_id, tuition_center_id);
