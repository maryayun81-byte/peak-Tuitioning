-- 20260923_exam_depth.sql
-- Persist KCSE numbering depth so sub-question hierarchy survives editing.
ALTER TABLE public.exam_questions
  ADD COLUMN IF NOT EXISTS depth INTEGER NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
