-- SQL to fix the Admin role and ensure it stays in sync with metadata
-- Run this in your Supabase SQL Editor

-- 1. Sync existing admin roles to Auth Metadata
DO $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      '"admin"'
    )
  WHERE id IN (SELECT id FROM profiles WHERE role = 'admin');
END $$;

-- 2. Create a trigger function to sync profile role changes to Auth Metadata
-- This ensures that next time you update a profile role, it syncs to the JWT
CREATE OR REPLACE FUNCTION sync_role_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.role)
    )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the trigger to the profiles table
DROP TRIGGER IF EXISTS trg_sync_role_to_metadata ON profiles;
CREATE TRIGGER trg_sync_role_to_metadata
AFTER UPDATE OF role ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_role_to_metadata();

-- 4. Re-verify auth_role function is correct
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION auth_role() IS 'Returns the user role from JWT metadata. Fast and prevents RLS recursion.';
