-- ============================================================
-- Peak Performance Tutoring — Peak Library System
-- ============================================================

-- ── ENUMS ──────────────────────────────────────────────────
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'library_category') THEN
        CREATE TYPE library_category AS ENUM (
            'Communication', 'Money', 'Self-worth', 'Mindset', 'Working Smart', 'Leadership', 'Other'
        );
    END IF;
END $$;

-- ── LIBRARY BOOKS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT, -- Google Books ID
  title TEXT NOT NULL,
  author TEXT,
  cover_url TEXT,
  description TEXT,
  pdf_url TEXT, -- Shared storage link
  category library_category DEFAULT 'Mindset',
  importance TEXT, -- "Why this matters"
  benefits TEXT,   -- "Benefits of reading"
  relevance TEXT,  -- "Peak relevance"
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── STUDENT PROGRESS & REFLECTION ──────────────────────────
CREATE TABLE IF NOT EXISTS library_student_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'reading' CHECK (status IN ('want_to_read', 'reading', 'finished')),
  progress_percent INTEGER DEFAULT 0,
  reflection_text TEXT,
  ai_feedback TEXT,
  bonus_xp_awarded INTEGER DEFAULT 0,
  is_finished BOOLEAN DEFAULT FALSE,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, book_id)
);

-- ── STORAGE BUCKET ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) 
VALUES ('library-books', 'library-books', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage
DROP POLICY IF EXISTS "Library books are public" ON storage.objects;
CREATE POLICY "Library books are public" 
ON storage.objects FOR SELECT USING (bucket_id = 'library-books');

DROP POLICY IF EXISTS "Admins can upload library books" ON storage.objects;
CREATE POLICY "Admins can upload library books" 
ON storage.objects FOR ALL USING (bucket_id = 'library-books');

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published library books"
  ON library_books FOR SELECT
  USING (is_published = TRUE OR auth_role() = 'admin');

CREATE POLICY "Admins manage library books"
  ON library_books FOR ALL
  USING (auth_role() = 'admin');

CREATE POLICY "Students manage their own library progress"
  ON library_student_progress FOR ALL
  USING (student_id = get_my_student_id() OR auth_role() = 'admin');

-- ── TRIGGER FOR UPDATED_AT ─────────────────────────────────
CREATE TRIGGER trg_library_books_updated
  BEFORE UPDATE ON library_books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_library_student_progress_updated
  BEFORE UPDATE ON library_student_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
