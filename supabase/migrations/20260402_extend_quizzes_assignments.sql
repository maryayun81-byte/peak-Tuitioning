-- ============================================================
-- Extend quizzes, assignments, and trivia tables with missing columns
-- Run this ONCE in the Supabase SQL Editor
-- ============================================================

-- ── QUIZZES: Add missing columns ───────────────────────────────
-- NOTE: tuition_center_id already added by 20260329_tuition_centers.sql
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS total_marks NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pass_mark_percentage INTEGER DEFAULT 70,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS retake_delay_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'class',
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ;

-- ── ASSIGNMENTS: Add missing columns ────────────────────────────
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS worksheet JSONB,
  ADD COLUMN IF NOT EXISTS passage TEXT,
  ADD COLUMN IF NOT EXISTS passage_type TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS total_marks NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_timer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS time_limit INTEGER,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS response_mode TEXT DEFAULT 'blocks';

-- ── TRIVIA SUBMISSIONS: Add max_streak column ──────────────────
-- Used by the student arena attempt page to track answer streaks
ALTER TABLE trivia_submissions
  ADD COLUMN IF NOT EXISTS max_streak INTEGER DEFAULT 0;

-- ── QUIZZES: Allow finance/admin to read quizzes ────────────────
DROP POLICY IF EXISTS "Finance reads quizzes" ON quizzes;
CREATE POLICY "Finance reads quizzes"
  ON quizzes FOR SELECT
  USING ((SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text) IN ('admin', 'finance'));

-- ── STORAGE: Make avatars bucket public if not already ──────────
-- This ensures trivia question images (stored under avatars/trivia/) are
-- accessible to students during the exam attempt.
-- Run this in your Supabase Dashboard > Storage > avatars > Make Public
-- OR execute this SQL in the SQL editor:
UPDATE storage.buckets SET public = true WHERE id = 'avatars';

-- ── Done ────────────────────────────────────────────────────────
