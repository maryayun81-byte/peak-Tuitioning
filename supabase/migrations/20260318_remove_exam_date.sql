-- REMOVE EXAM_DATE AND ENFORCE START/END DATES

-- Temporarily copy any legacy exam_date values into start_date/end_date before tightening constraints
UPDATE exam_events 
SET 
  start_date = COALESCE(start_date, exam_date, CURRENT_DATE),
  end_date = COALESCE(end_date, exam_date, CURRENT_DATE)
WHERE start_date IS NULL OR end_date IS NULL;

-- Now drop the old exam_date
ALTER TABLE exam_events DROP COLUMN IF EXISTS exam_date;

-- Make start_date and end_date required fields
ALTER TABLE exam_events ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE exam_events ALTER COLUMN end_date SET NOT NULL;

-- Refresh cache
NOTIFY pgrst, 'reload schema';
