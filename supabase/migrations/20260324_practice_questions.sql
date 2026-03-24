-- Migration for Practice Questions System
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Practice Questions created by teachers
CREATE TABLE practice_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  content JSONB NOT NULL, -- Tiptap JSON or HTML content + metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_questions ENABLE ROW LEVEL SECURITY;

-- Topics: Read for all, manage by admins (or let teachers create topics?)
-- Usually it's better if teachers can create topics for their subjects
CREATE POLICY "Users can view topics" ON topics FOR SELECT USING (true);
CREATE POLICY "Teachers can insert topics" ON topics FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can update topics" ON topics FOR UPDATE USING (
  EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid())
);

-- Questions: Accessible by everyone, manageable by the teacher who created it
CREATE POLICY "Users can view practice questions" ON practice_questions FOR SELECT USING (true);
CREATE POLICY "Teachers can insert their own practice questions" ON practice_questions FOR INSERT WITH CHECK (
  teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can update their own practice questions" ON practice_questions FOR UPDATE USING (
  teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can delete their own practice questions" ON practice_questions FOR DELETE USING (
  teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
);
