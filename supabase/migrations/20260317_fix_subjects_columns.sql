-- Fix subjects table schema
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS category TEXT;

-- Make class_id nullable as subjects are often curriculum-wide
ALTER TABLE subjects ALTER COLUMN class_id DROP NOT NULL;

-- If you have a UNIQUE constraint on (class_id, name), we might need to update it 
-- but for now let's just ensure the columns exist.
