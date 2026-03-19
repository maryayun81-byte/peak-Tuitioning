-- DB DIAGNOSTICS: TOTAL READ UNLOCK (FIXED)
-- Run this in your Supabase SQL Editor

-- 1. Profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diagnostics_allow_all" ON profiles;
CREATE POLICY "diagnostics_allow_all" ON profiles FOR SELECT USING (TRUE);

-- 2. Students
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diagnostics_allow_all" ON students;
CREATE POLICY "diagnostics_allow_all" ON students FOR SELECT USING (TRUE);

-- 3. Teachers
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diagnostics_allow_all" ON teachers;
CREATE POLICY "diagnostics_allow_all" ON teachers FOR SELECT USING (TRUE);

-- 4. Tuition Events
ALTER TABLE tuition_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diagnostics_allow_all" ON tuition_events;
CREATE POLICY "diagnostics_allow_all" ON tuition_events FOR SELECT USING (TRUE);

-- 5. Force PostgREST to reload its schema cache (Fixes 406 Not Acceptable)
NOTIFY pgrst, 'reload schema';
