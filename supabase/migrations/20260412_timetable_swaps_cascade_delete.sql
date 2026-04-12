-- Drop existing constraints that block teacher deletion
ALTER TABLE timetable_swaps DROP CONSTRAINT IF EXISTS timetable_swaps_requested_by_id_fkey;
ALTER TABLE timetable_swaps DROP CONSTRAINT IF EXISTS timetable_swaps_target_teacher_id_fkey;

-- Re-add constraints with ON DELETE CASCADE
ALTER TABLE timetable_swaps 
    ADD CONSTRAINT timetable_swaps_requested_by_id_fkey 
    FOREIGN KEY (requested_by_id) REFERENCES teachers(id) ON DELETE CASCADE;

ALTER TABLE timetable_swaps 
    ADD CONSTRAINT timetable_swaps_target_teacher_id_fkey 
    FOREIGN KEY (target_teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
