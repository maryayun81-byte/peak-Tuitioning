-- Add is_published column to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Create notifications table if it doesn't exist (assuming standard schema)
-- We will just use the existing notifications table in the system.
-- If notifications table already exists, we do nothing here.
