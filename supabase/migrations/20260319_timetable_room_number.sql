-- Add room_number to timetables

ALTER TABLE timetables 
ADD COLUMN IF NOT EXISTS room_number TEXT;

COMMENT ON COLUMN timetables.room_number IS 'The physical or virtual room where the tuition session takes place';
