-- Worksheet Builder & Assessment Engine Migration

-- 1. Extend Assignments Table for JSONB Worksheets
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS worksheet JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS passage TEXT,
ADD COLUMN IF NOT EXISTS passage_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS total_marks INTEGER,
ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_timer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS time_limit INTEGER;

-- 2. Extend Submissions Table for Worksheet Answers and Annotations
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS worksheet_answers JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS question_marks JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS annotations JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS time_taken INTEGER;

-- 3. Create Worksheet Templates (Optional but recommended for reuse)
CREATE TABLE IF NOT EXISTS worksheet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  created_by UUID REFERENCES users(id),
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  passage TEXT,
  passage_type TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS on Templates
ALTER TABLE worksheet_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own templates" 
ON worksheet_templates FOR ALL 
USING (auth.uid() = created_by);

CREATE POLICY "Public templates are viewable by all teachers"
ON worksheet_templates FOR SELECT
USING (true);

-- 5. Comments for documentation
COMMENT ON COLUMN assignments.worksheet IS 'Array of WorksheetBlock objects';
COMMENT ON COLUMN submissions.worksheet_answers IS 'Map of block_id to student answer';
COMMENT ON COLUMN submissions.question_marks IS 'Map of block_id to awarded marks (auto or manual)';
COMMENT ON COLUMN submissions.annotations IS 'Fabric.js JSON for teacher grading notes';
