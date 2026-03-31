-- Add missing 'notes' column to attendance table
ALTER TABLE IF EXISTS attendance
ADD COLUMN IF NOT EXISTS notes TEXT;
