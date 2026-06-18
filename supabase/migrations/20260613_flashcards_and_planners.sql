
-- Flashcards Tables
CREATE TABLE public.flashcard_decks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
    student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES public.teachers(id) ON DELETE CASCADE,
    is_public boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.flashcard_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id uuid NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    front_content text NOT NULL,
    back_content text NOT NULL,
    image_url text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.flashcard_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    card_id uuid NOT NULL REFERENCES public.flashcard_cards(id) ON DELETE CASCADE,
    ease_factor real DEFAULT 2.5,
    interval integer DEFAULT 0,
    repetitions integer DEFAULT 0,
    next_review_date timestamptz DEFAULT now(),
    last_reviewed_at timestamptz,
    UNIQUE(student_id, card_id)
);

-- Exam Planner Tables
CREATE TABLE public.student_exam_planners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    exam_name text NOT NULL,
    exam_date date NOT NULL,
    target_score text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.study_plan_days (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    planner_id uuid NOT NULL REFERENCES public.student_exam_planners(id) ON DELETE CASCADE,
    study_date date NOT NULL,
    tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_completed boolean DEFAULT false,
    xp_awarded integer DEFAULT 0,
    UNIQUE(planner_id, study_date)
);

-- RLS
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exam_planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plan_days ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students see own and public decks" ON public.flashcard_decks FOR SELECT USING (
    is_public = true OR 
    (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
);
CREATE POLICY "Students manage own decks" ON public.flashcard_decks FOR ALL USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "See cards for visible decks" ON public.flashcard_cards FOR SELECT USING (
    deck_id IN (SELECT id FROM public.flashcard_decks WHERE is_public = true OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
);
CREATE POLICY "Manage cards for own decks" ON public.flashcard_cards FOR ALL USING (
    deck_id IN (SELECT id FROM public.flashcard_decks WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
);

CREATE POLICY "Manage own progress" ON public.flashcard_progress FOR ALL USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "Manage own planners" ON public.student_exam_planners FOR ALL USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "Manage own plan days" ON public.study_plan_days FOR ALL USING (
    planner_id IN (SELECT id FROM public.student_exam_planners WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
);
