-- Add missing fields to parents table for settings
ALTER TABLE parents 
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS home_address TEXT,
ADD COLUMN IF NOT EXISTS mpesa_push_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES';
