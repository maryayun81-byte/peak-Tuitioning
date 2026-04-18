-- Create the AI Jobs table
CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  raw_prompt TEXT NOT NULL,
  intent_type TEXT CHECK (intent_type IN ('assignment', 'quiz', 'trivia', 'resource')),
  parsed_output JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'scheduled')),
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for teachers
CREATE POLICY "Teachers can view their own AI jobs"
ON ai_jobs FOR SELECT
TO authenticated
USING (
  teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can create their own AI jobs"
ON ai_jobs FOR INSERT
TO authenticated
WITH CHECK (
  teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can update their own AI jobs"
ON ai_jobs FOR UPDATE
TO authenticated
USING (
  teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ai_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_jobs_updated_at_trigger
BEFORE UPDATE ON ai_jobs
FOR EACH ROW
EXECUTE FUNCTION update_ai_jobs_updated_at();
