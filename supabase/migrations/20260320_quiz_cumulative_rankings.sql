-- Cumulative Quiz Rankings
-- 1. Class Ranking for a Subject (Cumulative)
CREATE OR REPLACE FUNCTION get_subject_class_ranking(p_subject_id UUID, p_class_id UUID)
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    total_score NUMERIC,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH student_performance AS (
        SELECT 
            s.id as s_id,
            s.full_name as s_name,
            -- Sum up marks scored in this subject across all quizzes
            SUM(qa.score) as t_score
        FROM students s
        LEFT JOIN quiz_attempts qa ON s.id = qa.student_id
        LEFT JOIN quizzes q ON qa.quiz_id = q.id AND q.subject_id = p_subject_id
        WHERE s.class_id = p_class_id
        GROUP BY s.id, s.full_name
    )
    SELECT 
        s_id as student_id,
        s_name as full_name,
        COALESCE(t_score, 0)::NUMERIC as total_score,
        DENSE_RANK() OVER (ORDER BY COALESCE(t_score, 0) DESC) as rank
    FROM student_performance
    ORDER BY total_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Curriculum Ranking for a Subject (Cumulative) -> The "Overall Ranking"
CREATE OR REPLACE FUNCTION get_subject_curriculum_ranking(p_subject_id UUID, p_curriculum_id UUID)
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    total_score NUMERIC,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH student_performance AS (
        SELECT 
            s.id as s_id,
            s.full_name as s_name,
            SUM(qa.score) as t_score
        FROM students s
        JOIN classes c ON s.class_id = c.id
        LEFT JOIN quiz_attempts qa ON s.id = qa.student_id
        LEFT JOIN quizzes q ON qa.quiz_id = q.id AND q.subject_id = p_subject_id
        WHERE c.curriculum_id = p_curriculum_id
        GROUP BY s.id, s.full_name
    )
    SELECT 
        s_id as student_id,
        s_name as full_name,
        COALESCE(t_score, 0)::NUMERIC as total_score,
        DENSE_RANK() OVER (ORDER BY COALESCE(t_score, 0) DESC) as rank
    FROM student_performance
    ORDER BY total_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Backwards compatibility replacement for previous subject leaderboard
CREATE OR REPLACE FUNCTION get_subject_curriculum_leaderboard(
    p_subject_id UUID,
    p_curriculum_id UUID
)
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    avg_percentage NUMERIC, -- Kept name for compatibility, but holds SUM
    quizzes_attempted BIGINT,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH student_performance AS (
        SELECT 
            s.id as s_id,
            s.full_name as s_name,
            SUM(qa.score) as avg_p, -- Actually SUM of score
            COUNT(DISTINCT qa.quiz_id) as q_count
        FROM students s
        JOIN classes c ON s.class_id = c.id
        JOIN quiz_attempts qa ON s.id = qa.student_id
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE q.subject_id = p_subject_id
          AND c.curriculum_id = p_curriculum_id
        GROUP BY s.id, s.full_name
    )
    SELECT 
        s_id as student_id,
        s_name as full_name,
        ROUND(COALESCE(avg_p, 0)::NUMERIC, 2) as avg_percentage,
        q_count as quizzes_attempted,
        DENSE_RANK() OVER (ORDER BY COALESCE(avg_p, 0) DESC) as rank
    FROM student_performance
    ORDER BY avg_p DESC
    LIMIT 50; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Overall Performance Ranking (True XP Global Leaderboard)
CREATE OR REPLACE FUNCTION get_overall_performance_ranking()
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    overall_avg_score NUMERIC, -- Actually holds XP
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as student_id,
        s.full_name,
        COALESCE(s.xp, 0)::NUMERIC as overall_avg_score,
        DENSE_RANK() OVER (ORDER BY COALESCE(s.xp, 0) DESC) as rank
    FROM students s
    ORDER BY overall_avg_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
