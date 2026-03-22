-- Create many-to-many parent-student link table
CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- Enable RLS
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- Helper to get current parent ID
CREATE OR REPLACE FUNCTION get_my_parent_id() RETURNS UUID AS $$
  SELECT id FROM parents WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies
DROP POLICY IF EXISTS "Parents can view own links" ON parent_student_links;
CREATE POLICY "Parents can view own links" 
ON parent_student_links FOR SELECT 
USING (parent_id = get_my_parent_id());

DROP POLICY IF EXISTS "Parents can insert own links" ON parent_student_links;
CREATE POLICY "Parents can insert own links" 
ON parent_student_links FOR INSERT 
WITH CHECK (parent_id = get_my_parent_id());

DROP POLICY IF EXISTS "Parents can update own links" ON parent_student_links;
CREATE POLICY "Parents can update own links" 
ON parent_student_links FOR UPDATE
USING (parent_id = get_my_parent_id());

DROP POLICY IF EXISTS "Admins can manage all links" ON parent_student_links;
CREATE POLICY "Admins can manage all links" 
ON parent_student_links FOR ALL 
USING ((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin');

-- Also add a policy for students to view their parents
-- Also allow parents to update the student record with their parent_id
-- but only if the student is not already linked to someone else
DROP POLICY IF EXISTS "Parents can link to unlinked students" ON students;
CREATE POLICY "Parents can link to unlinked students"
ON students FOR UPDATE
USING (parent_id IS NULL)
WITH CHECK (parent_id = get_my_parent_id());

-- To allow parents to view students they are linking (needed for the search step)
-- This is already mostly covered by existing policies but let's be explicit
DROP POLICY IF EXISTS "Parents can search for any student" ON students;
CREATE POLICY "Parents can search for any student"
ON students FOR SELECT
USING (auth_role() = 'parent');
