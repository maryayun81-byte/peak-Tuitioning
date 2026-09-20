-- 20260924_exam_rubric.sql
-- Per-question marking rubric: step-by-step M/A/C/B allocation.
-- [{step TEXT, marks NUMERIC, type TEXT}] — sums to the question's marks.
ALTER TABLE public.exam_questions
  ADD COLUMN IF NOT EXISTS marking_rubric JSONB NOT NULL DEFAULT '[]';

NOTIFY pgrst, 'reload schema';
