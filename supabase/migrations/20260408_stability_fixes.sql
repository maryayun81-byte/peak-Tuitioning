-- [MIGRATION] Add daily XP tracking and performance indexes for 200+ users

-- 1. Add last_login_date column for daily XP tracking
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_login_date DATE;
CREATE INDEX IF NOT EXISTS idx_students_last_login ON students(last_login_date);

-- 2. Performance Indexes for concurrent users
-- Speed up teacher dashboard and marking
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- Speed up attendance tracking
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);

-- Speed up student portal
CREATE INDEX IF NOT EXISTS idx_students_class_center ON students(class_id, tuition_center_id);
-- Fixed: column was "read", not "read_at"
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_status ON notifications(user_id, read);

-- Fixed: table is "timetables" and column is "day", and resources uses "audience" for scope
CREATE INDEX IF NOT EXISTS idx_resources_scope ON resources(audience, tuition_center_id);
CREATE INDEX IF NOT EXISTS idx_timetables_class_day_v2 ON timetables(class_id, day);
