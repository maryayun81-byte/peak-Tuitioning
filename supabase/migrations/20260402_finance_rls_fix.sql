-- ======================================================
-- FINANCE PORTAL: RLS FIXES AND ROLE EXPANSION
-- This script expands user roles and adds missing RLS policies
-- to ensure staff with the 'finance' role can record payments.
-- ======================================================

-- 1. EXPAND PROFILE ROLES
-- The original CHECK constraint on 'profiles.role' was too strict.
-- We must safely release it and re-add the 'finance' role.
DO $$
BEGIN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'finance'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping constraint modification as it might have already been updated.';
END $$;

-- 2. TUITION CENTERS SECURITY
-- Ensure centers are readable by authenticated users and manageable by admin/finance
ALTER TABLE tuition_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view centers" ON tuition_centers;
CREATE POLICY "Anyone authenticated can view centers" ON tuition_centers
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin and Finance manage centers" ON tuition_centers;
CREATE POLICY "Admin and Finance manage centers" ON tuition_centers
    FOR ALL USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'finance')
    ));

-- 3. EVENT REGISTRATIONS ACCESS
-- staff with 'finance' role MUST select from registrations to find students for billing
DROP POLICY IF EXISTS "Finance can view event registrations" ON event_registrations;
CREATE POLICY "Finance can view registrations for billing" ON event_registrations
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'finance')
    ));

-- 4. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
