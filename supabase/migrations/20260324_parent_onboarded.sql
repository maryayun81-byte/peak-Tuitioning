-- Add onboarded flag to parents table
ALTER TABLE parents ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT false;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
