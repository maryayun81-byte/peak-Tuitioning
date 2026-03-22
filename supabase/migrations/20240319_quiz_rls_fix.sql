-- Quiz RLS Fix: Ensure teachers can manage their quizzes and students can view assigned quizzes
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- 1. Teacher Management Policy
DROP POLICY IF EXISTS "Teacher manages own quizzes" ON quizzes;
CREATE POLICY "Teacher manages own quizzes" ON quizzes FOR ALL USING (
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR auth_role() = 'admin'
);

-- 2. Student View Policy
DROP POLICY IF EXISTS "Students view assigned quizzes" ON quizzes;
CREATE POLICY "Students view assigned quizzes" ON quizzes FOR SELECT USING (
  is_published = TRUE AND (
    audience = 'all_classes' OR 
    (audience = 'class' AND class_id = (SELECT class_id FROM students WHERE user_id = auth.uid())) OR
    (audience = 'class_subject' AND class_id = (SELECT class_id FROM students WHERE user_id = auth.uid()))
  )
);

-- 3. Public View (if needed by Admin)
DROP POLICY IF EXISTS "Admin views all quizzes" ON quizzes;
CREATE POLICY "Admin views all quizzes" ON quizzes FOR SELECT USING (auth_role() = 'admin');
