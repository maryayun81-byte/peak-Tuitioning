-- 20260921_exam_sections.sql
-- Paper-builder sections: teachers group questions section-by-section
-- (e.g. SECTION A — Answer ALL). Stored per question, ordered by order_index.
ALTER TABLE public.exam_questions
  ADD COLUMN IF NOT EXISTS section_title TEXT NOT NULL DEFAULT 'Section A';

NOTIFY pgrst, 'reload schema';
