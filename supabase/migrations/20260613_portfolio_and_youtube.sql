
-- CBC Portfolios
CREATE TABLE public.cbc_portfolios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(student_id, title)
);

CREATE TABLE public.cbc_portfolio_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id uuid NOT NULL REFERENCES public.cbc_portfolios(id) ON DELETE CASCADE,
    title text NOT NULL,
    image_url text NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- Teacher YouTube Suggestions
CREATE TABLE public.teacher_youtube_suggestions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
    title text NOT NULL,
    youtube_url text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.cbc_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbc_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_youtube_suggestions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students manage own portfolios" ON public.cbc_portfolios FOR ALL USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);
CREATE POLICY "Students manage own portfolio items" ON public.cbc_portfolio_items FOR ALL USING (
    portfolio_id IN (SELECT id FROM public.cbc_portfolios WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
);

CREATE POLICY "Students view youtube suggestions" ON public.teacher_youtube_suggestions FOR SELECT USING (
    class_id IN (SELECT class_id FROM public.students WHERE user_id = auth.uid()) OR class_id IS NULL
);
CREATE POLICY "Teachers manage youtube suggestions" ON public.teacher_youtube_suggestions FOR ALL USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
);
