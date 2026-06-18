-- CBC-friendly flashcard studio metadata and sharing foundations.
ALTER TABLE public.flashcard_decks
  ADD COLUMN IF NOT EXISTS share_code text UNIQUE DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 7)),
  ADD COLUMN IF NOT EXISTS curriculum_id uuid REFERENCES public.curriculums(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'class', 'public')),
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS difficulty_level text DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS price_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'submitted', 'changes_requested', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS publishing_status text NOT NULL DEFAULT 'private' CHECK (publishing_status IN ('private', 'classroom', 'marketplace', 'featured')),
  ADD COLUMN IF NOT EXISTS theme_style text DEFAULT 'cbc-magic',
  ADD COLUMN IF NOT EXISTS theme_prompt text,
  ADD COLUMN IF NOT EXISTS cover_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sticker_pack text DEFAULT 'School',
  ADD COLUMN IF NOT EXISTS mascot_id text DEFAULT 'professor-peak',
  ADD COLUMN IF NOT EXISTS deck_mode text NOT NULL DEFAULT 'standard' CHECK (deck_mode IN ('standard', 'cbc_quick', 'match_play')),
  ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saves integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downloads integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured_label text;

ALTER TABLE public.flashcard_cards
  ADD COLUMN IF NOT EXISTS card_type text NOT NULL DEFAULT 'qa' CHECK (card_type IN ('qa', 'match', 'draw', 'voice')),
  ADD COLUMN IF NOT EXISTS stickers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visual_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS question_audio_url text,
  ADD COLUMN IF NOT EXISTS answer_audio_url text,
  ADD COLUMN IF NOT EXISTS drawing_url text;

CREATE TABLE IF NOT EXISTS public.flashcard_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'class', 'public')),
  share_code text UNIQUE DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 7)),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flashcard_collection_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.flashcard_collections(id) ON DELETE CASCADE,
  deck_id uuid NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, deck_id)
);

CREATE TABLE IF NOT EXISTS public.flashcard_deck_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('viewer', 'editor')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(deck_id, student_id)
);

UPDATE public.flashcard_decks d
SET curriculum_id = s.curriculum_id
FROM public.students s
WHERE d.student_id = s.id
  AND d.curriculum_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_curriculum ON public.flashcard_decks(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_review_status ON public.flashcard_decks(review_status);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_publishing_status ON public.flashcard_decks(publishing_status);

ALTER TABLE public.flashcard_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_collection_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_deck_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see own and shared flashcard collections" ON public.flashcard_collections
  FOR SELECT USING (
    visibility IN ('class', 'public')
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "Students manage own flashcard collections" ON public.flashcard_collections
  FOR ALL USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
  WITH CHECK (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Students see decks in visible collections" ON public.flashcard_collection_decks
  FOR SELECT USING (
    collection_id IN (SELECT id FROM public.flashcard_collections)
  );

CREATE POLICY "Students manage own collection decks" ON public.flashcard_collection_decks
  FOR ALL USING (
    collection_id IN (SELECT id FROM public.flashcard_collections WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    collection_id IN (SELECT id FROM public.flashcard_collections WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
  );

CREATE POLICY "Students see flashcard collaborators" ON public.flashcard_deck_collaborators
  FOR SELECT USING (
    deck_id IN (SELECT id FROM public.flashcard_decks WHERE is_public = true OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "Deck owners manage collaborators" ON public.flashcard_deck_collaborators
  FOR ALL USING (
    deck_id IN (SELECT id FROM public.flashcard_decks WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    deck_id IN (SELECT id FROM public.flashcard_decks WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
  );
