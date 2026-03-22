-- Dual Ranking RPCs: Curriculum-scoped Subject Leaderboard
-- Aggregates performance for a subject across all students in a specific curriculum

CREATE OR REPLACE FUNCTION get_subject_curriculum_leaderboard(
    p_subject_id UUID,
    p_curriculum_id UUID
)
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    avg_percentage NUMERIC,
    quizzes_attempted BIGINT,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH student_performance AS (
        -- Calculate average percentage per student for the specific subject
        -- Only for students in the target curriculum
        SELECT 
            s.id as s_id,
            s.full_name as s_name,
            AVG(qa.percentage) as avg_p,
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
        ROUND(avg_p::NUMERIC, 2) as avg_percentage,
        q_count as quizzes_attempted,
        DENSE_RANK() OVER (ORDER BY avg_p DESC) as rank
    FROM student_performance
    ORDER BY avg_p DESC
    LIMIT 10; -- Return top 10 for global curriculum view
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
