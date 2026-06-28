-- Migration: 20260627_exam_passages.sql
-- Adds passage/excerpt support and functional writing types to Exam Desk

-- Passages table (poems, excerpts, set book extracts)
CREATE TABLE IF NOT EXISTS public.exam_passages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    title TEXT NOT NULL, -- e.g. "Read the poem below" or "Excerpt from 'The River Between'"
    content TEXT NOT NULL, -- Markdown content with paragraph numbers pre-rendered
    passage_type TEXT NOT NULL DEFAULT 'prose' 
        CHECK (passage_type IN ('prose', 'poem', 'dialogue', 'set_book', 'table', 'image')),
    allow_search BOOLEAN NOT NULL DEFAULT false, -- Teacher can enable Ctrl+F in passage
    allow_image_insert BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add passage_id and functional writing type to exam_questions
ALTER TABLE public.exam_questions 
    ADD COLUMN IF NOT EXISTS passage_id UUID REFERENCES public.exam_passages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS functional_writing_type TEXT 
        CHECK (functional_writing_type IN ('letter', 'report', 'speech', 'memo', 'minutes', 'diary', 'notice', 'essay', 'article', 'review', 'summary', 'free')),
    ADD COLUMN IF NOT EXISTS word_limit INTEGER,
    ADD COLUMN IF NOT EXISTS question_number TEXT; -- e.g. "1(a)", "2(b)(i)"

-- Student passage annotations (highlights, sticky notes per submission)
CREATE TABLE IF NOT EXISTS public.exam_passage_annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES public.exam_submissions(id) ON DELETE CASCADE,
    passage_id UUID NOT NULL REFERENCES public.exam_passages(id) ON DELETE CASCADE,
    annotations JSONB NOT NULL DEFAULT '[]', -- Array of {type, start, end, color, note, paragraph}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(submission_id, passage_id)
);

-- RLS
ALTER TABLE public.exam_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_passage_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage passages" ON public.exam_passages
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'teacher');

CREATE POLICY "Students can read passages of published exams" ON public.exam_passages
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.exams WHERE id = exam_id AND status != 'draft'
    ));

CREATE POLICY "Students manage own annotations" ON public.exam_passage_annotations
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.exam_submissions 
        WHERE id = submission_id AND student_id = auth.uid()
    ));

CREATE POLICY "Teachers can read annotations" ON public.exam_passage_annotations
    FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'role' = 'teacher');

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_passage_annotations
    BEFORE UPDATE ON public.exam_passage_annotations
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
