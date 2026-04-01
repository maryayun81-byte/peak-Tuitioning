-- 1. Create the RPC function to get a student's rank efficiently
CREATE OR REPLACE FUNCTION get_student_rank(input_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
  student_xp INTEGER;
  student_rank INTEGER;
BEGIN
  -- Get the XP of the requested student
  SELECT xp INTO student_xp FROM students WHERE id = input_student_id;
  
  -- If student doesn't exist, return null
  IF student_xp IS NULL THEN
    RETURN NULL;
  END IF;

  -- Count how many students have more XP (this is their rank)
  SELECT COUNT(*) + 1 INTO student_rank
  FROM students
  WHERE xp > student_xp;

  RETURN student_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add avatar_url to the students table so the leaderboard can display it without complex joins
ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
