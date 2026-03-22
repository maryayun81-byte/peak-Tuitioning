-- 1. Create study_plans table
CREATE TABLE study_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add plan_id to study_sessions
ALTER TABLE study_sessions ADD COLUMN plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE;

-- 3. Enable RLS on study_plans
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for study_plans
CREATE POLICY "Students manage own study plans" ON study_plans 
  FOR ALL USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers view class study plans" ON study_plans 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_assignments ta ON s.class_id = ta.class_id
      WHERE s.id = study_plans.student_id 
      AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Parents view children's study plans" ON study_plans 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = study_plans.student_id 
      AND s.parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

-- 5. Helper function to ensure only one plan is active if needed (optional, keeping it flexible for now)
-- 6. Trigger for updated_at
CREATE TRIGGER trg_study_plans_updated BEFORE UPDATE ON study_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. Add Index
CREATE INDEX idx_study_sessions_plan ON study_sessions(plan_id);
CREATE INDEX idx_study_plans_student ON study_plans(student_id);

-- 8. Backfill existing sessions into a "Legacy Plan"
DO $$
DECLARE
    row_count integer;
    new_plan_id uuid;
    std_id uuid;
BEGIN
    FOR std_id IN SELECT DISTINCT student_id FROM study_sessions WHERE plan_id IS NULL LOOP
        INSERT INTO study_plans (student_id, name, start_date, end_date, is_active)
        VALUES (std_id, 'Legacy Roadmap', (SELECT MIN(date) FROM study_sessions WHERE student_id = std_id), (SELECT MAX(date) FROM study_sessions WHERE student_id = std_id), FALSE)
        RETURNING id INTO new_plan_id;

        UPDATE study_sessions SET plan_id = new_plan_id WHERE student_id = std_id AND plan_id IS NULL;
    END LOOP;
END $$;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
