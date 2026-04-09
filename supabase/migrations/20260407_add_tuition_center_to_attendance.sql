-- Add tuition_center_id to attendance to allow tracking attendance by specific centers
ALTER TABLE IF EXISTS attendance
ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE CASCADE;
