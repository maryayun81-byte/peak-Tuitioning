-- ADD STATUS TO TUITION EVENTS

-- Add status column
ALTER TABLE tuition_events ADD COLUMN status VARCHAR(20) DEFAULT 'upcoming';
-- Backfill existing data based on dates or is_active
UPDATE tuition_events 
SET status = CASE 
  WHEN is_active = true THEN 'active'
  WHEN end_date < CURRENT_DATE THEN 'ended'
  ELSE 'upcoming'
END;

-- Add constraint
ALTER TABLE tuition_events ADD CONSTRAINT tuition_events_status_check
CHECK (status IN ('upcoming', 'active', 'postponed', 'cancelled', 'ended'));

-- Add postponed_to column
ALTER TABLE tuition_events ADD COLUMN postponed_to DATE;

-- Since we are migrating from is_active boolean to a status enum,
-- we'll keep is_active for backward compatibility or we can drop it later.
-- We'll keep it for now but the UI will manage 'status' primarily.

NOTIFY pgrst, 'reload schema';
