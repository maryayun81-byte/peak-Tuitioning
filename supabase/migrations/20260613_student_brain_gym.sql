
-- Create table for Brain Gym streaks
CREATE TABLE public.brain_gym_streaks (
    student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
    current_streak integer NOT NULL DEFAULT 0,
    highest_streak integer NOT NULL DEFAULT 0,
    last_played_date date
);

ALTER TABLE public.brain_gym_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own streaks" ON public.brain_gym_streaks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.students
            WHERE students.id = brain_gym_streaks.student_id
            AND students.user_id = auth.uid()
        )
    );

CREATE POLICY "Students can update own streaks" ON public.brain_gym_streaks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.students
            WHERE students.id = brain_gym_streaks.student_id
            AND students.user_id = auth.uid()
        )
    );
