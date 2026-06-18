
-- Update Flashcards
ALTER TABLE public.flashcard_decks ADD COLUMN class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

-- Peer Study Pods
CREATE TABLE public.study_pods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
    class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
    created_by uuid REFERENCES public.students(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.pod_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pod_id uuid NOT NULL REFERENCES public.study_pods(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    UNIQUE(pod_id, student_id)
);

CREATE TABLE public.pod_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pod_id uuid NOT NULL REFERENCES public.study_pods(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Voice Revision Notes
CREATE TABLE public.voice_revision_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
    title text NOT NULL,
    audio_url text NOT NULL,
    transcript text,
    ai_summary text,
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.study_pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_revision_notes ENABLE ROW LEVEL SECURITY;

-- Policies for Pods
CREATE POLICY "Students can view pods in their class" ON public.study_pods FOR SELECT USING (
    class_id IN (SELECT class_id FROM public.students WHERE user_id = auth.uid()) OR
    id IN (SELECT pod_id FROM public.pod_members WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
);
CREATE POLICY "Students can create pods" ON public.study_pods FOR INSERT WITH CHECK (
    created_by IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "View pod members" ON public.pod_members FOR SELECT USING (true);
CREATE POLICY "Join pods" ON public.pod_members FOR ALL USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);

CREATE POLICY "View pod messages" ON public.pod_messages FOR SELECT USING (
    pod_id IN (SELECT pod_id FROM public.pod_members WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
);
CREATE POLICY "Send pod messages" ON public.pod_messages FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) AND
    pod_id IN (SELECT pod_id FROM public.pod_members WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
);

-- Policies for Voice Notes
CREATE POLICY "Manage own voice notes" ON public.voice_revision_notes FOR ALL USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
);
