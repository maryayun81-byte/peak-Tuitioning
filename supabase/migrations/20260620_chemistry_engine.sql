CREATE TABLE IF NOT EXISTS educational_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  resource_type VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content JSONB DEFAULT '{}'::jsonb,
  visibility VARCHAR(50) DEFAULT 'private',
  price_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE educational_resources ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own resources
CREATE POLICY "Teachers can manage own resources"
  ON educational_resources
  FOR ALL
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
  );

-- Everyone can view marketplace resources
CREATE POLICY "Anyone can view marketplace resources"
  ON educational_resources
  FOR SELECT
  USING (visibility = 'marketplace');
