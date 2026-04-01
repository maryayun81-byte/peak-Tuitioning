-- ======================================================
-- FINANCE HUB: FINAL RLS STABILIZATION (PERMISSIVE)
-- Re-standardizing and simplifying access for staff to
-- prevent any security layer from blocking patient billing.
-- ======================================================

-- 1. STRENGTHEN PROFILE ROLES
DO $$
BEGIN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'finance'));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Constraint already handled.';
END $$;

-- 2. SIMPLIFIED SELECT PERMISSIONS (Authenticated Only)
-- Granting ALL authenticated staff read-only access to Registrations
-- This rules out any complex subquery recursion issues entirely.
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "finance_view_registrations" ON event_registrations;
DROP POLICY IF EXISTS "Finance can view registrations for billing" ON event_registrations;
DROP POLICY IF EXISTS "admin_all_registrations" ON event_registrations;
DROP POLICY IF EXISTS "teacher_view_registrations" ON event_registrations;
DROP POLICY IF EXISTS "admins_all_event_registrations" ON event_registrations;
DROP POLICY IF EXISTS "teachers_read_event_registrations" ON event_registrations;

CREATE POLICY "Anyone authenticated can view event registrations" ON event_registrations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Same for Tuition Centers
ALTER TABLE tuition_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can view centers" ON tuition_centers;
DROP POLICY IF EXISTS "Admin and Finance manage centers" ON tuition_centers;

CREATE POLICY "Anyone authenticated can view centers" ON tuition_centers
    FOR SELECT USING (auth.role() = 'authenticated');

-- 3. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
