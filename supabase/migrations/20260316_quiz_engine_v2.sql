-- Quiz Engine V2 Enhancement Migration
-- Date: 2026-03-16

-- 1. Enhance Quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS total_marks NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS retake_delay_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pass_mark_percentage NUMERIC(5,2) DEFAULT 50,
ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'class' CHECK (audience IN ('all_classes', 'class', 'class_subject')),
ADD COLUMN IF NOT EXISTS target_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Support all_classes by making class_id nullable
ALTER TABLE quizzes ALTER COLUMN class_id DROP NOT NULL;

-- 2. Enhance Quiz Attempts to support retakes and tracking
-- First, handle unique constraint that might block multiple attempts
ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_quiz_id_student_id_key;

ALTER TABLE quiz_attempts 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('in_progress', 'submitted')),
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS result TEXT CHECK (result IN ('pass', 'fail', 'pending')),
ADD COLUMN IF NOT EXISTS grading_details JSONB DEFAULT '{}';

-- 3. Create Ranking Functions for real-time performance

-- Level 1: Class Ranking Function
CREATE OR REPLACE FUNCTION get_class_quiz_ranking(p_quiz_id UUID, p_class_id UUID)
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    score NUMERIC,
    percentage NUMERIC,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_attempts AS (
        -- For ranking, we take the best attempt if best_attempt_policy is true, 
        -- but spec says "ORDER BY score DESC" usually implies taking the top score.
        SELECT DISTINCT ON (student_id)
            qa.student_id,
            qa.score,
            qa.percentage
        FROM quiz_attempts qa
        WHERE qa.quiz_id = p_quiz_id
        ORDER BY qa.student_id, qa.score DESC, qa.completed_at DESC
    )
    SELECT 
        s.id as student_id,
        s.full_name,
        la.score,
        la.percentage,
        DENSE_RANK() OVER (ORDER BY la.score DESC) as rank
    FROM students s
    JOIN latest_attempts la ON la.student_id = s.id
    WHERE s.class_id = p_class_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Level 2: Subject Ranking Across All Classes
CREATE OR REPLACE FUNCTION get_subject_ranking(p_subject_id UUID)
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    avg_score NUMERIC,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as student_id,
        s.full_name,
        AVG(qa.percentage)::NUMERIC as avg_score,
        DENSE_RANK() OVER (ORDER BY AVG(qa.percentage) DESC) as rank
    FROM students s
    JOIN quiz_attempts qa ON qa.student_id = s.id
    JOIN quizzes q ON q.id = qa.quiz_id
    WHERE q.subject_id = p_subject_id
    GROUP BY s.id, s.full_name
    ORDER BY avg_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Level 3: Overall Performance Ranking
CREATE OR REPLACE FUNCTION get_overall_performance_ranking()
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    overall_avg_score NUMERIC,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as student_id,
        s.full_name,
        AVG(qa.percentage)::NUMERIC as overall_avg_score,
        DENSE_RANK() OVER (ORDER BY AVG(qa.percentage) DESC) as rank
    FROM students s
    JOIN quiz_attempts qa ON qa.student_id = s.id
    GROUP BY s.id, s.full_name
    ORDER BY overall_avg_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS for new functionality
-- Ensure students can view their own attempts and teachers can view attempts for their quizzes
-- (Existing policies might already cover some of this, but adding specific ones for 'in_progress' status)

DROP POLICY IF EXISTS "Students manage own attempts" ON quiz_attempts;
CREATE POLICY "Student manage own attempts" ON quiz_attempts FOR ALL USING (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Teacher views attempts for their quizzes" ON quiz_attempts;
CREATE POLICY "Teacher views attempts for their quizzes" ON quiz_attempts FOR SELECT USING (
  quiz_id IN (SELECT id FROM quizzes WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()))
  OR auth_role() = 'admin'
);
