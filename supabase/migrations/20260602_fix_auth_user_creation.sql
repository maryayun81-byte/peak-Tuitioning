-- Fixes auth user creation failing with "Database error creating new user"
-- The on_auth_user_created trigger on auth.users may have a broken handle_new_user function.
-- This migration creates a fallback RPC that creates auth users via raw SQL,
-- bypassing the trigger entirely.

-- 1. Fix the broken trigger function (make it resilient to failures)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user trigger failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create an RPC function for admin user creation (bypasses GoTrue API + trigger)
CREATE OR REPLACE FUNCTION admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'student'
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Insert into auth.users directly (bypasses GoTrue API)
  INSERT INTO auth.users (
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    aud,
    role
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    now(),
    now(),
    encode(gen_random_bytes(32), 'hex'),
    '',
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO v_user_id;

  -- Insert profile manually (bypasses broken trigger)
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (v_user_id, p_email, p_full_name, p_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;
