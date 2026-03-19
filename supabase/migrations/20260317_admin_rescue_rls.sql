-- ADMIN RESCUE: UNLOCK CORE TABLES
-- This script aggressively resets RLS for tables that were missed in previous rescue attempts.

-- 1. Disable RLS temporarily
ALTER TABLE curriculums DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_events DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing SELECT policies to ensure a clean slate
DROP POLICY IF EXISTS "Anyone can view curriculums" ON curriculums;
DROP POLICY IF EXISTS "Anyone can view classes" ON classes;
DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
DROP POLICY IF EXISTS "All authenticated can view tuition events" ON tuition_events;

-- 3. Re-enable RLS
ALTER TABLE curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_events ENABLE ROW LEVEL SECURITY;

-- 4. Create ULTRA-SIMPLE FLAT policies (No subqueries)
CREATE POLICY "curriculums_free_read" ON curriculums FOR SELECT USING (TRUE);
CREATE POLICY "classes_free_read" ON classes FOR SELECT USING (TRUE);
CREATE POLICY "subjects_free_read" ON subjects FOR SELECT USING (TRUE);
CREATE POLICY "tuition_events_free_read" ON tuition_events FOR SELECT USING (TRUE);

-- 5. Ensure admin has full power bypass using JWT only
CREATE POLICY "admin_all_curriculums" ON curriculums FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_all_classes" ON classes FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_all_subjects" ON subjects FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_all_tuition_events" ON tuition_events FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 6. Final safety: Refresh schema cache
NOTIFY pgrst, 'reload schema';
