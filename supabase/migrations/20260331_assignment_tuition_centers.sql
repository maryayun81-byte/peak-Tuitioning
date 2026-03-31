-- Add tuition_center_id to assignments to allow teachers to isolate assignments by tuition center
ALTER TABLE IF EXISTS assignments
ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE CASCADE;
