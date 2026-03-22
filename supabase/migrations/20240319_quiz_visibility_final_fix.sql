-- Final Quiz Visibility Fix
-- Sets default is_published to TRUE and simplifies student RLS

-- 1. Update existing quizzes that were likely saved as false by mistake
UPDATE quizzes SET is_published = TRUE WHERE is_published = FALSE;

-- 2. Ensure future quizzes default to TRUE
ALTER TABLE quizzes ALTER COLUMN is_published SET DEFAULT TRUE;

-- 3. Simplify Student RLS Policy for reliability
DROP POLICY IF EXISTS "Students view assigned quizzes" ON quizzes;

CREATE POLICY "Students view assigned quizzes" ON quizzes FOR SELECT USING (
  is_published = TRUE AND (
    audience = 'all_classes' OR 
    class_id IN (SELECT class_id FROM students WHERE user_id = auth.uid())
  )
);
