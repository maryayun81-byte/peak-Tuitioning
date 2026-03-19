-- 1. Create Worksheet Templates Table if not exists (Version 3)
CREATE TABLE IF NOT EXISTS worksheet_templates_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_marks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add layout_locked flag to assignments
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS layout_locked BOOLEAN DEFAULT true;

-- 3. Ensure passage linking support in assignments
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS linked_passages JSONB DEFAULT '[]'::jsonb;

-- 4. RLS for v3 templates
ALTER TABLE worksheet_templates_v3 ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can manage their own v3 templates') THEN
        CREATE POLICY "Teachers can manage their own v3 templates" 
        ON worksheet_templates_v3 FOR ALL 
        USING (auth.uid() = teacher_id);
    END IF;
END $$;
