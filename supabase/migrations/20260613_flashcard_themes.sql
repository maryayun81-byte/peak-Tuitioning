
-- Add theme color to flashcard decks
ALTER TABLE public.flashcard_decks ADD COLUMN theme_color text DEFAULT 'blue';
