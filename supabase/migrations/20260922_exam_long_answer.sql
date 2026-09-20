-- 20260922_exam_long_answer.sql
-- Adds the paragraph / long-answer question type to the online paper engine.
ALTER TABLE public.exam_questions DROP CONSTRAINT IF EXISTS exam_questions_question_type_check;
ALTER TABLE public.exam_questions
  ADD CONSTRAINT exam_questions_question_type_check CHECK (question_type IN (
    'mcq', 'true_false', 'short_answer', 'long_answer', 'essay',
    'fill_in_blank', 'matching', 'math_working', 'case_study'
  ));

NOTIFY pgrst, 'reload schema';
