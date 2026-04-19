-- ============================================================
-- Migration: Leaderboard RPCs for student performance page
-- Fixes the "No rankings found yet" error caused by:
--   1. Missing avatar_url column crashing all queries
--   2. Missing or mismatched RPC functions
-- ============================================================

-- Drop existing functions first (required if return type changes)
DROP FUNCTION IF EXISTS get_class_leaderboard(uuid, integer);
DROP FUNCTION IF EXISTS get_my_class_rank(uuid, uuid);
DROP FUNCTION IF EXISTS get_curriculum_leaderboard(uuid, integer);
DROP FUNCTION IF EXISTS get_my_curriculum_rank(uuid, uuid);
DROP FUNCTION IF EXISTS get_center_leaderboard(uuid, integer);
DROP FUNCTION IF EXISTS get_my_center_rank(uuid, uuid);
DROP FUNCTION IF EXISTS get_student_rank(uuid);

-- ── Class Leaderboard ────────────────────────────────────────
CREATE FUNCTION get_class_leaderboard(p_class_id uuid, p_limit int DEFAULT 3)
RETURNS TABLE(id uuid, full_name text, xp int, avatar_url text, class_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    s.id,
    s.full_name,
    COALESCE(s.xp, 0) AS xp,
    NULL::text AS avatar_url,
    c.name AS class_name
  FROM students s
  LEFT JOIN classes c ON c.id = s.class_id
  WHERE s.class_id = p_class_id
  ORDER BY s.xp DESC NULLS LAST
  LIMIT p_limit;
$$;

-- ── My Class Rank ─────────────────────────────────────────────
CREATE FUNCTION get_my_class_rank(p_student_id uuid, p_class_id uuid)
RETURNS int
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int + 1
  FROM students
  WHERE class_id = p_class_id
    AND COALESCE(xp, 0) > COALESCE((SELECT xp FROM students WHERE id = p_student_id), 0);
$$;

-- ── Curriculum Leaderboard ────────────────────────────────────
CREATE FUNCTION get_curriculum_leaderboard(p_curriculum_id uuid, p_limit int DEFAULT 3)
RETURNS TABLE(id uuid, full_name text, xp int, avatar_url text, class_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    s.id,
    s.full_name,
    COALESCE(s.xp, 0) AS xp,
    NULL::text AS avatar_url,
    c.name AS class_name
  FROM students s
  LEFT JOIN classes c ON c.id = s.class_id
  WHERE s.curriculum_id = p_curriculum_id
  ORDER BY s.xp DESC NULLS LAST
  LIMIT p_limit;
$$;

-- ── My Curriculum Rank ────────────────────────────────────────
CREATE FUNCTION get_my_curriculum_rank(p_student_id uuid, p_curriculum_id uuid)
RETURNS int
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int + 1
  FROM students
  WHERE curriculum_id = p_curriculum_id
    AND COALESCE(xp, 0) > COALESCE((SELECT xp FROM students WHERE id = p_student_id), 0);
$$;

-- ── Center Leaderboard ────────────────────────────────────────
CREATE FUNCTION get_center_leaderboard(p_center_id uuid, p_limit int DEFAULT 3)
RETURNS TABLE(id uuid, full_name text, xp int, avatar_url text, class_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    s.id,
    s.full_name,
    COALESCE(s.xp, 0) AS xp,
    NULL::text AS avatar_url,
    c.name AS class_name
  FROM students s
  LEFT JOIN classes c ON c.id = s.class_id
  WHERE s.tuition_center_id = p_center_id
  ORDER BY s.xp DESC NULLS LAST
  LIMIT p_limit;
$$;

-- ── My Center Rank ────────────────────────────────────────────
CREATE FUNCTION get_my_center_rank(p_student_id uuid, p_center_id uuid)
RETURNS int
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int + 1
  FROM students
  WHERE tuition_center_id = p_center_id
    AND COALESCE(xp, 0) > COALESCE((SELECT xp FROM students WHERE id = p_student_id), 0);
$$;

-- ── Global Rank ───────────────────────────────────────────────
CREATE FUNCTION get_student_rank(input_student_id uuid)
RETURNS int
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int + 1
  FROM students
  WHERE COALESCE(xp, 0) > COALESCE((SELECT xp FROM students WHERE id = input_student_id), 0);
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_class_leaderboard(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_class_rank(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_curriculum_leaderboard(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_curriculum_rank(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_center_leaderboard(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_center_rank(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_rank(uuid) TO authenticated;
