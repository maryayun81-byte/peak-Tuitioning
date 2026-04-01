-- ======================================================
-- TIMETABLE & PORTAL UPDATES (V3)
-- Fixes financier role, adds session types, and swap system.
-- ======================================================

-- 1. FIX PROFILES ROLE CONSTRAINT
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'finance'));

-- 2. EXTEND TIMETABLES TABLE
-- Add session_type (class, break, prep, duty)
ALTER TABLE timetables ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'class';

-- Make subject_id and teacher_id nullable for breaks/prep
ALTER TABLE timetables ALTER COLUMN subject_id DROP NOT NULL;
ALTER TABLE timetables ALTER COLUMN teacher_id DROP NOT NULL;

-- Add tuition_center_id to timetables if missing (it was added in 20260329_tuition_centers.sql)
-- But let's ensure it has an index for fast filtering
CREATE INDEX IF NOT EXISTS idx_timetables_center ON timetables(tuition_center_id);

-- 3. CREATE TIMETABLE SWAPS TABLE
CREATE TABLE IF NOT EXISTS timetable_swaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    requested_by_id UUID NOT NULL REFERENCES teachers(id),
    target_teacher_id UUID REFERENCES teachers(id), -- Null means any teacher can take it
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_swaps_status ON timetable_swaps(status);
CREATE INDEX IF NOT EXISTS idx_swaps_teacher ON timetable_swaps(requested_by_id, target_teacher_id);

-- 4. RLS POLICIES FOR SWAPS
ALTER TABLE timetable_swaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teachers_manage_own_swaps" ON timetable_swaps;
CREATE POLICY "teachers_manage_own_swaps" ON timetable_swaps
FOR ALL USING (
    requested_by_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR
    target_teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "teachers_view_open_swaps" ON timetable_swaps;
CREATE POLICY "teachers_view_open_swaps" ON timetable_swaps
FOR SELECT USING (
    target_teacher_id IS NULL AND 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
);

-- 5. FIX TRIVIA GROUP DISBAND (Deletion Permission)
DROP POLICY IF EXISTS "Creators can delete their own trivia groups" ON trivia_groups;
CREATE POLICY "Creators can delete their own trivia groups" ON trivia_groups
FOR DELETE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Creators can delete their own group members" ON trivia_group_members;
CREATE POLICY "Creators can delete their own group members" ON trivia_group_members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM trivia_groups 
    WHERE id = trivia_group_members.group_id 
    AND created_by = auth.uid()
  ) OR
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);
