-- FIX TEACHER REGISTRATION AND ONBOARDING
-- This migration ensures teachers can be invited by email or self-register without RLS errors.

-- 1. Make user_id nullable to support "Invite by Email" flow
ALTER TABLE teachers ALTER COLUMN user_id DROP NOT NULL;

-- 1b. Add UNIQUE constraint to email to allow upserting during registration
ALTER TABLE teachers ADD CONSTRAINT teachers_email_key UNIQUE (email);

-- 2. Ensure RLS is enabled
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- 3. DROP old restrictive policies if they exist (to be safe)
DROP POLICY IF EXISTS "Admin manages teachers" ON teachers;
DROP POLICY IF EXISTS "Teacher reviews own record" ON teachers;
DROP POLICY IF EXISTS "Teacher updates own record" ON teachers;
DROP POLICY IF EXISTS "teachers_select_admin" ON teachers;
DROP POLICY IF EXISTS "admin_all_teachers" ON teachers;
DROP POLICY IF EXISTS "teachers_view_own" ON teachers;
DROP POLICY IF EXISTS "teachers_insert_own" ON teachers;
DROP POLICY IF EXISTS "teachers_update_own" ON teachers;

-- 4. Create new comprehensive policies for TEACHERS table
-- Admin has full access
CREATE POLICY "admin_all_teachers" ON teachers FOR ALL TO authenticated 
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Teachers can view their own record
CREATE POLICY "teachers_view_own" ON teachers FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR email = auth.email());

-- Allow teachers to INSERT their own record during registration/onboarding
CREATE POLICY "teachers_insert_own" ON teachers FOR INSERT TO authenticated 
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher' 
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- Allow teachers to UPDATE their own record (to link user_id or update details)
CREATE POLICY "teachers_update_own" ON teachers FOR UPDATE TO authenticated 
  USING (user_id = auth.uid() OR (user_id IS NULL AND email = auth.email()))
  WITH CHECK (user_id = auth.uid());

-- 5. Fix RLS for teacher_teaching_map (Ensuring they use the right ID)
ALTER TABLE teacher_teaching_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers can manage own teaching map" ON teacher_teaching_map;
CREATE POLICY "Teachers can manage own teaching map" 
ON teacher_teaching_map FOR ALL 
TO authenticated
USING (
  teacher_id = auth.uid() OR 
  teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
);

-- 6. Add remarks column to exam_marks and update RLS
ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
