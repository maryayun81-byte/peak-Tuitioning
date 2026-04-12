-- Add guest speaker support to timetables for non-staff speakers
ALTER TABLE timetables ADD COLUMN IF NOT EXISTS guest_speaker TEXT;
