-- ============================================================
-- REGISTRATION-BASED ATTENDANCE
-- ============================================================

-- 1. Add registration_id column
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES event_registrations(id) ON DELETE CASCADE;

-- 2. Make student_id nullable
ALTER TABLE attendance ALTER COLUMN student_id DROP NOT NULL;

-- 3. Populate registration_id for existing records
-- We match by student_id and tuition_event_id
UPDATE attendance a
SET registration_id = er.id
FROM event_registrations er
WHERE a.student_id = er.student_id 
  AND a.tuition_event_id = er.tuition_event_id
  AND a.registration_id IS NULL;

-- 4. Handle records that might not have a matching registration (edge case)
-- If we can't find a registration, we might want to create a 'skeleton' registration 
-- or just leave them (they won't show up in the new UI anyway).
-- Recommendation: All students *should* be in registrations for the event.

-- 5. Update Unique Constraint
-- Drop existing (student_id, tuition_event_id, date)
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_tuition_event_id_date_key;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_tuition_event_id_key;

-- Add new (registration_id, date) constraint
-- Every registration can only have one attendance record per date.
ALTER TABLE attendance ADD CONSTRAINT attendance_registration_date_unique UNIQUE (registration_id, date);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_registration ON attendance(registration_id);
