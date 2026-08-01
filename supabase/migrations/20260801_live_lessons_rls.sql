-- ============================================================
-- Secure the live_lessons table with Row Level Security.
--
-- Why: live_lessons was created manually in the Supabase SQL
-- editor, so it had NO RLS — any anonymous client could read every
-- lesson including teacher host_url (host start links). This
-- migration scopes visibility:
--   • Admins  — everything
--   • Teachers — only the lessons they are assigned to host
--               (teacher_id = their teacher record)
--   • Students — only published lessons for their own class
--
-- The table already has a teacher_id column (set via the admin
-- "Class → Subject → Teacher" cascade), so scoping is deterministic
-- and naturally handles teachers assigned to multiple classes.
-- ============================================================

-- ── GUARANTEE teacher_id + index ──────────────────────────────
ALTER TABLE live_lessons
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_live_lessons_teacher ON live_lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_live_lessons_class ON live_lessons(class_id);

-- ── ENABLE RLS ────────────────────────────────────────────────
ALTER TABLE live_lessons ENABLE ROW LEVEL SECURITY;

-- Drop any pre-existing policies so this migration is idempotent
-- and cannot collide with manually-created ones.
DROP POLICY IF EXISTS "Admins manage live lessons" ON live_lessons;
DROP POLICY IF EXISTS "Teachers view own live lessons" ON live_lessons;
DROP POLICY IF EXISTS "Students view published class lessons" ON live_lessons;
DROP POLICY IF EXISTS "Public view published lessons" ON live_lessons;

-- Admins can do everything
CREATE POLICY "Admins manage live lessons"
  ON live_lessons FOR ALL
  USING (auth_role() = 'admin');

-- Teachers only see lessons they are assigned to host
CREATE POLICY "Teachers view own live lessons"
  ON live_lessons FOR SELECT
  USING (teacher_id = get_my_teacher_id());

-- Students only see published lessons for their own class
CREATE POLICY "Students view published class lessons"
  ON live_lessons FOR SELECT
  USING (
    is_published = TRUE AND
    class_id = get_my_student_class_id()
  );

NOTIFY pgrst, 'reload schema';
