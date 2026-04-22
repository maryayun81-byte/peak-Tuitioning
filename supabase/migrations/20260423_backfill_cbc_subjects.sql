-- ============================================================
-- Auto-register CBC subjects for students who have not onboarded
-- This script finds all students in a CBC curriculum who have
-- not yet completed onboarding and registers them for all
-- subjects belonging to their class (or curriculum where class
-- is null), skipping any that already exist.
-- ============================================================

-- STEP 1: Preview what will be inserted (run these SELECTs first to verify)
-- Uncomment and run to check before executing the INSERTs below.


-- Preview Pass 1: class-specific CBC subjects per student
SELECT
  s.admission_number,
  s.full_name,
  c.name  AS class_name,
  cu.name AS curriculum_name,
  sub.name AS subject_to_register,
  'class-specific' AS match_type
FROM students s
JOIN classes c ON c.id = s.class_id
JOIN curriculums cu
  ON cu.id = s.curriculum_id
  AND cu.name ILIKE '%CBC%'
JOIN subjects sub
  ON sub.class_id = s.class_id
  AND sub.curriculum_id = s.curriculum_id
WHERE s.onboarded = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM student_subjects ss
    WHERE ss.student_id = s.id AND ss.subject_id = sub.id
  )
ORDER BY s.full_name, sub.name;

-- Preview Pass 2: curriculum-wide fallback (only for students with 0 class subjects)
SELECT
  s.admission_number,
  s.full_name,
  c.name  AS class_name,
  cu.name AS curriculum_name,
  sub.name AS subject_to_register,
  'curriculum-wide fallback' AS match_type
FROM students s
JOIN classes c ON c.id = s.class_id
JOIN curriculums cu
  ON cu.id = s.curriculum_id
  AND cu.name ILIKE '%CBC%'
JOIN subjects sub
  ON sub.curriculum_id = s.curriculum_id
  AND sub.class_id IS NULL
WHERE s.onboarded = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM student_subjects ss WHERE ss.student_id = s.id
  )
ORDER BY s.full_name, sub.name;

-- STEP 2: Insert student_subjects for all CBC non-onboarded students
-- PASS 1: Register subjects that belong to the student's EXACT class (class_id match)
INSERT INTO student_subjects (student_id, subject_id, class_id)
SELECT DISTINCT
  s.id   AS student_id,
  sub.id AS subject_id,
  s.class_id
FROM students s
-- Only CBC curriculum students
JOIN curriculums cu 
  ON cu.id = s.curriculum_id
  AND cu.name ILIKE '%CBC%'
-- Only subjects that belong to EXACTLY this student's class AND curriculum
JOIN subjects sub 
  ON sub.class_id = s.class_id
  AND sub.curriculum_id = s.curriculum_id
WHERE
  s.onboarded = FALSE
ON CONFLICT (student_id, subject_id) DO NOTHING;

-- PASS 2: For any CBC student who still has NO registered subjects after Pass 1,
-- fall back to curriculum-wide subjects (class_id IS NULL) within CBC only.
INSERT INTO student_subjects (student_id, subject_id, class_id)
SELECT DISTINCT
  s.id   AS student_id,
  sub.id AS subject_id,
  s.class_id
FROM students s
JOIN curriculums cu 
  ON cu.id = s.curriculum_id
  AND cu.name ILIKE '%CBC%'
JOIN subjects sub 
  ON sub.curriculum_id = s.curriculum_id   -- same CBC curriculum
  AND sub.class_id IS NULL                  -- curriculum-wide subjects only
WHERE
  s.onboarded = FALSE
  -- Only apply fallback to students who got 0 subjects from Pass 1
  AND NOT EXISTS (
    SELECT 1 FROM student_subjects ss WHERE ss.student_id = s.id
  )
ON CONFLICT (student_id, subject_id) DO NOTHING;

-- STEP 3: Mark these students as onboarded so they skip the modal
-- WARNING: Only run this if you are SURE you want to bypass the onboarding modal.
-- If you want them to still go through the modal, DO NOT run this.
/*
UPDATE students
SET onboarded = TRUE
WHERE
  onboarded = FALSE
  AND curriculum_id IN (
    SELECT id FROM curriculums WHERE name ILIKE '%CBC%'
  );
*/

-- Done. The INSERT above is safe to run multiple times (ON CONFLICT DO NOTHING).
