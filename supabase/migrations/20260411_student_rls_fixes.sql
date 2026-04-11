-- ==========================================================
-- FIX: Student RLS + Scoped Leaderboard RPCs
-- Purpose:
--   Students previously could only see their own student row,
--   which broke the Hall of Fame on the homepage and rankings
--   on the My Progress page.
--   Attendance remains teacher-only (students cannot see it).
-- ==========================================================

-- 1. Allow authenticated students to view all student rows
--    (required for Hall of Fame and cross-class/curriculum rankings)
DROP POLICY IF EXISTS "Students can view all students for leaderboard" ON students;
CREATE POLICY "Students can view all students for leaderboard" ON students
  FOR SELECT
  USING (auth_role() = 'student');

-- 2. Ensure the global rank RPC is up to date
CREATE OR REPLACE FUNCTION get_student_rank(input_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
  student_xp INTEGER;
  student_rank INTEGER;
BEGIN
  SELECT xp INTO student_xp FROM students WHERE id = input_student_id;
  IF student_xp IS NULL THEN RETURN NULL; END IF;
  SELECT COUNT(*) + 1 INTO student_rank FROM students WHERE xp > student_xp;
  RETURN student_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: Top N students in the same class
CREATE OR REPLACE FUNCTION get_class_leaderboard(p_class_id UUID, p_limit INT DEFAULT 3)
RETURNS TABLE(id UUID, full_name TEXT, xp INT, avatar_url TEXT) AS $$
BEGIN
  RETURN QUERY
    SELECT s.id, s.full_name, s.xp, s.avatar_url
    FROM students s
    WHERE s.class_id = p_class_id
    ORDER BY s.xp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. RPC: Top N students in the same curriculum
CREATE OR REPLACE FUNCTION get_curriculum_leaderboard(p_curriculum_id UUID, p_limit INT DEFAULT 3)
RETURNS TABLE(id UUID, full_name TEXT, xp INT, avatar_url TEXT, class_name TEXT) AS $$
BEGIN
  RETURN QUERY
    SELECT s.id, s.full_name, s.xp, s.avatar_url, c.name
    FROM students s
    LEFT JOIN classes c ON c.id = s.class_id
    WHERE s.curriculum_id = p_curriculum_id
    ORDER BY s.xp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. RPC: Top N students in the same tuition center
CREATE OR REPLACE FUNCTION get_center_leaderboard(p_center_id UUID, p_limit INT DEFAULT 3)
RETURNS TABLE(id UUID, full_name TEXT, xp INT, avatar_url TEXT, class_name TEXT) AS $$
BEGIN
  RETURN QUERY
    SELECT s.id, s.full_name, s.xp, s.avatar_url, c.name
    FROM students s
    LEFT JOIN classes c ON c.id = s.class_id
    WHERE s.tuition_center_id = p_center_id
    ORDER BY s.xp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. RPC: Student's rank within their class
CREATE OR REPLACE FUNCTION get_my_class_rank(p_student_id UUID, p_class_id UUID)
RETURNS INTEGER AS $$
DECLARE
  student_xp INTEGER;
  student_rank INTEGER;
BEGIN
  SELECT xp INTO student_xp FROM students WHERE id = p_student_id;
  IF student_xp IS NULL THEN RETURN NULL; END IF;
  SELECT COUNT(*) + 1 INTO student_rank
    FROM students WHERE class_id = p_class_id AND xp > student_xp;
  RETURN student_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. RPC: Student's rank within their curriculum
CREATE OR REPLACE FUNCTION get_my_curriculum_rank(p_student_id UUID, p_curriculum_id UUID)
RETURNS INTEGER AS $$
DECLARE
  student_xp INTEGER;
  student_rank INTEGER;
BEGIN
  SELECT xp INTO student_xp FROM students WHERE id = p_student_id;
  IF student_xp IS NULL THEN RETURN NULL; END IF;
  SELECT COUNT(*) + 1 INTO student_rank
    FROM students WHERE curriculum_id = p_curriculum_id AND xp > student_xp;
  RETURN student_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 8. RPC: Student's rank within their tuition center
CREATE OR REPLACE FUNCTION get_my_center_rank(p_student_id UUID, p_center_id UUID)
RETURNS INTEGER AS $$
DECLARE
  student_xp INTEGER;
  student_rank INTEGER;
BEGIN
  SELECT xp INTO student_xp FROM students WHERE id = p_student_id;
  IF student_xp IS NULL THEN RETURN NULL; END IF;
  SELECT COUNT(*) + 1 INTO student_rank
    FROM students WHERE tuition_center_id = p_center_id AND xp > student_xp;
  RETURN student_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
