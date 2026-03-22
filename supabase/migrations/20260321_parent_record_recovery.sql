-- ============================================================
-- Parent Record Recovery & Auto-Creation
-- ============================================================

-- 1. Function to auto-create a parent record from a profile
CREATE OR REPLACE FUNCTION handle_parent_record_sync()
RETURNS TRIGGER AS $$
DECLARE
    new_parent_code TEXT;
    new_pin TEXT;
BEGIN
    -- Only act if the role is 'parent'
    IF NEW.role = 'parent' THEN
        -- Check if parent record already exists
        IF NOT EXISTS (SELECT 1 FROM parents WHERE user_id = NEW.id) THEN
            -- Generate a unique parent code: PR-XXXXXX
            LOOP
                new_parent_code := 'PR-' || floor(random() * (999999 - 100000 + 1) + 100000)::text;
                EXIT WHEN NOT EXISTS (SELECT 1 FROM parents WHERE parent_code = new_parent_code);
            END LOOP;

            -- Generate a 4-digit security PIN
            new_pin := floor(random() * (9999 - 1000 + 1) + 1000)::text;

            -- Create the parent record
            INSERT INTO parents (user_id, parent_code, full_name, email, security_pin)
            VALUES (NEW.id, new_parent_code, NEW.full_name, NEW.email, new_pin);

            -- Create an initial notification for the parent with their PIN
            INSERT INTO notifications (user_id, title, body, type)
            VALUES (
                NEW.id, 
                'Welcome to Parent Portal', 
                'Your account is ready! Use your security PIN ' || new_pin || ' to link your students. This PIN is for one-time use.',
                'info'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger on profiles table to sync parent records
DROP TRIGGER IF EXISTS trg_sync_parent_record ON profiles;
CREATE TRIGGER trg_sync_parent_record
AFTER INSERT OR UPDATE OF role ON profiles
FOR EACH ROW
EXECUTE FUNCTION handle_parent_record_sync();

-- 3. Repair existing parent profiles that might be missing a parent record
DO $$
DECLARE
    r RECORD;
    new_parent_code TEXT;
    new_pin TEXT;
BEGIN
    FOR r IN SELECT id, full_name, email FROM profiles WHERE role = 'parent'
    LOOP
        IF NOT EXISTS (SELECT 1 FROM parents WHERE user_id = r.id) THEN
            -- Generate code
            LOOP
                new_parent_code := 'PR-' || floor(random() * (999999 - 100000 + 1) + 100000)::text;
                EXIT WHEN NOT EXISTS (SELECT 1 FROM parents WHERE parent_code = new_parent_code);
            END LOOP;

            -- Generate PIN
            new_pin := floor(random() * (9999 - 1000 + 1) + 1000)::text;

            -- Insert
            INSERT INTO parents (user_id, parent_code, full_name, email, security_pin)
            VALUES (r.id, new_parent_code, r.full_name, r.email, new_pin);

            -- Notify
            INSERT INTO notifications (user_id, title, body, type)
            VALUES (
                r.id, 
                'Parent Profile Recovered', 
                'We have recovered your parent profile information. Your one-time security PIN is ' || new_pin || '.',
                'info'
            );
        END IF;
    END LOOP;
END $$;
