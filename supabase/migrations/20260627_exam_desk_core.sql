-- 20260627_exam_desk_core.sql
-- Peak Performance Exam Desk - Core Schema

-- Exams
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    pass_mark NUMERIC,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
    random_order BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exam Questions
CREATE TABLE IF NOT EXISTS public.exam_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'true_false', 'short_answer', 'essay', 'fill_in_the_blank', 'matching', 'math_working', 'case_study')),
    content TEXT NOT NULL, -- The main question text
    media_url TEXT, -- Optional image/diagram
    options JSONB, -- For MCQ or matching: array of options
    correct_answer JSONB, -- The correct answer
    marks NUMERIC NOT NULL DEFAULT 1,
    topic_tags TEXT[],
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exam Submissions (Student attempts)
CREATE TABLE IF NOT EXISTS public.exam_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submit_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'marked', 'published')),
    auto_score NUMERIC,
    manual_score NUMERIC,
    total_score NUMERIC GENERATED ALWAYS AS (COALESCE(auto_score, 0) + COALESCE(manual_score, 0)) STORED,
    integrity_flags_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exam_id, student_id) -- Only one submission per student per exam
);

-- Exam Answers (Per question responses)
CREATE TABLE IF NOT EXISTS public.exam_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES public.exam_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
    student_answer JSONB, -- Contains text answer, selected option, OR Fabric.js canvas JSON for working
    marks_awarded NUMERIC,
    teacher_comments TEXT,
    teacher_annotations JSONB, -- Fabric.js objects drawn by teacher over student working
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(submission_id, question_id)
);

-- Exam Integrity Logs (Phase 3)
CREATE TABLE IF NOT EXISTS public.exam_integrity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES public.exam_submissions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('tab_switch', 'fullscreen_exit', 'paste_attempt', 'idle_warning', 'copy_attempt')),
    details JSONB, -- e.g., paste length, idle duration
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add updated_at triggers
CREATE TRIGGER set_updated_at_exams
    BEFORE UPDATE ON public.exams
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_updated_at_exam_questions
    BEFORE UPDATE ON public.exam_questions
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_updated_at_exam_submissions
    BEFORE UPDATE ON public.exam_submissions
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_updated_at_exam_answers
    BEFORE UPDATE ON public.exam_answers
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS Policies

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_integrity_logs ENABLE ROW LEVEL SECURITY;

-- Exams: Teachers can manage their own, students can read published
CREATE POLICY "Teachers can manage their own exams" ON public.exams
    FOR ALL TO authenticated
    USING (teacher_id = auth.uid() OR auth.jwt() ->> 'role' = 'teacher');

CREATE POLICY "Students can read published exams" ON public.exams
    FOR SELECT TO authenticated
    USING (status != 'draft');

-- Exam Questions: Teachers can manage questions for their exams, students can read questions for published exams
CREATE POLICY "Teachers can manage exam questions" ON public.exam_questions
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'teacher');

CREATE POLICY "Students can read exam questions" ON public.exam_questions
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND status != 'draft'));

-- Submissions: Students can insert/update their own, Teachers can read/update all
CREATE POLICY "Students can manage own submissions" ON public.exam_submissions
    FOR ALL TO authenticated
    USING (student_id = auth.uid() OR auth.jwt() ->> 'role' = 'student');

CREATE POLICY "Teachers can manage submissions" ON public.exam_submissions
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'teacher');

-- Answers: Students can insert/update their own, Teachers can read/update all
CREATE POLICY "Students can manage own answers" ON public.exam_answers
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.exam_submissions WHERE id = submission_id AND student_id = auth.uid()));

CREATE POLICY "Teachers can manage answers" ON public.exam_answers
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'teacher');

-- Trigger to prevent students from grading themselves
CREATE OR REPLACE FUNCTION public.prevent_student_grading() RETURNS TRIGGER AS $$
BEGIN
    -- If the user is a student (or not a teacher), they cannot modify grading columns
    IF auth.jwt() ->> 'role' != 'teacher' THEN
        IF TG_OP = 'UPDATE' THEN
            NEW.marks_awarded := OLD.marks_awarded;
            NEW.teacher_comments := OLD.teacher_comments;
            NEW.teacher_annotations := OLD.teacher_annotations;
        ELSIF TG_OP = 'INSERT' THEN
            NEW.marks_awarded := NULL;
            NEW.teacher_comments := NULL;
            NEW.teacher_annotations := NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_student_grading_lock
    BEFORE INSERT OR UPDATE ON public.exam_answers
    FOR EACH ROW EXECUTE FUNCTION public.prevent_student_grading();

-- Integrity Logs: Students can insert, Teachers can read
CREATE POLICY "Students can insert integrity logs" ON public.exam_integrity_logs
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.exam_submissions WHERE id = submission_id AND student_id = auth.uid()));

CREATE POLICY "Teachers can read integrity logs" ON public.exam_integrity_logs
    FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'role' = 'teacher');

-- RPC to log integrity events securely from client
CREATE OR REPLACE FUNCTION public.log_exam_integrity_event(
    p_submission_id UUID,
    p_event_type TEXT,
    p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Basic validation
    IF NOT EXISTS (SELECT 1 FROM public.exam_submissions WHERE id = p_submission_id AND student_id = auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Insert log
    INSERT INTO public.exam_integrity_logs (submission_id, event_type, details)
    VALUES (p_submission_id, p_event_type, p_details);

    -- Increment counter on submission
    UPDATE public.exam_submissions
    SET integrity_flags_count = integrity_flags_count + 1
    WHERE id = p_submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
