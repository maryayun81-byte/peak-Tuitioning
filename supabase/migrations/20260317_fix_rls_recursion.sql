-- Fix for RLS Recursion causing infinite loading
-- This migration rewrites auth_role() to pull from JWT metadata instead of a table query

CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text;
$$ LANGUAGE sql STABLE;

-- Ensure RLS doesn't block legitimate admin access during debugging
-- Granting certain permissions explicitly if role is found in JWT
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- Notify that the fix has been applied
COMMENT ON FUNCTION auth_role() IS 'Returns the user role from JWT metadata to prevent RLS recursion.';
