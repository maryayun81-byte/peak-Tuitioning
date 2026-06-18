
CREATE TABLE public.classroom_duels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'waiting', -- waiting, active, completed
    questions jsonb NOT NULL DEFAULT '[]'::jsonb,
    current_question_index integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.duel_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    duel_id uuid NOT NULL REFERENCES public.classroom_duels(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    score integer DEFAULT 0,
    joined_at timestamptz DEFAULT now(),
    UNIQUE(duel_id, student_id)
);

ALTER TABLE public.classroom_duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view duels" ON public.classroom_duels FOR SELECT USING (true);
CREATE POLICY "Anyone can manage duels" ON public.classroom_duels FOR ALL USING (true);

CREATE POLICY "Anyone can view participants" ON public.duel_participants FOR SELECT USING (true);
CREATE POLICY "Students can join duels" ON public.duel_participants FOR ALL USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);
