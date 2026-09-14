-- ============================================================
-- HOMESCHOOLING — Break RLS infinite recursion
--
-- Root cause: policies on homeschool_enrollments and
-- homeschool_teacher_assignments (and friends) queried each other
-- directly. Postgres evaluates every permissive policy on a table,
-- so teacher/student/parent queries touching these tables looped:
--   enrollments → teacher_assignments → enrollments → …
-- surfacing as: infinite recursion detected in policy for
-- relation "homeschool_enrollments" (e.g. opening a session in the
-- teacher portal, which queries via the browser client + realtime).
--
-- Fix (repo precedent: 20260317 emergency RLS fix): SECURITY DEFINER
-- helpers that resolve the id-sets with RLS bypassed, so no policy
-- expression references another RLS-protected homeschool table.
-- Semantics are unchanged — same rows visible to the same roles.
-- ============================================================

-- ── Helpers (SECURITY DEFINER = RLS bypassed inside) ──────────

CREATE OR REPLACE FUNCTION my_hs_student_enrollment_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM homeschool_enrollments WHERE student_id = get_my_student_id();
$$;

CREATE OR REPLACE FUNCTION my_hs_teacher_enrollment_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT enrollment_id FROM homeschool_teacher_assignments WHERE teacher_id = get_my_teacher_id();
$$;

CREATE OR REPLACE FUNCTION my_child_student_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM students WHERE parent_id = get_my_parent_id();
$$;

CREATE OR REPLACE FUNCTION my_hs_child_enrollment_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT he.id FROM homeschool_enrollments he WHERE he.student_id IN (SELECT my_child_student_ids());
$$;

CREATE OR REPLACE FUNCTION my_hs_teacher_session_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM learning_sessions WHERE teacher_id = get_my_teacher_id();
$$;

CREATE OR REPLACE FUNCTION my_hs_student_session_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM learning_sessions WHERE enrollment_id IN (SELECT my_hs_student_enrollment_ids());
$$;

CREATE OR REPLACE FUNCTION my_hs_child_session_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM learning_sessions WHERE enrollment_id IN (SELECT my_hs_child_enrollment_ids());
$$;

-- ── homeschool_enrollments ────────────────────────────────────

DROP POLICY IF EXISTS "Teacher views assigned enrollments" ON homeschool_enrollments;
CREATE POLICY "Teacher views assigned enrollments" ON homeschool_enrollments FOR SELECT USING (
  auth_role() = 'teacher' AND id IN (SELECT my_hs_teacher_enrollment_ids())
);
DROP POLICY IF EXISTS "Parent views child enrollments" ON homeschool_enrollments;
CREATE POLICY "Parent views child enrollments" ON homeschool_enrollments FOR SELECT USING (
  student_id IN (SELECT my_child_student_ids())
);

-- ── homeschool_subjects ───────────────────────────────────────

DROP POLICY IF EXISTS "Student views own homeschool subjects" ON homeschool_subjects;
CREATE POLICY "Student views own homeschool subjects" ON homeschool_subjects FOR SELECT USING (
  enrollment_id IN (SELECT my_hs_student_enrollment_ids())
);
DROP POLICY IF EXISTS "Teacher views assigned homeschool subjects" ON homeschool_subjects;
CREATE POLICY "Teacher views assigned homeschool subjects" ON homeschool_subjects FOR SELECT USING (
  auth_role() = 'teacher' AND enrollment_id IN (SELECT my_hs_teacher_enrollment_ids())
);

-- ── homeschool_teacher_assignments ────────────────────────────

DROP POLICY IF EXISTS "Student views own teacher assignments" ON homeschool_teacher_assignments;
CREATE POLICY "Student views own teacher assignments" ON homeschool_teacher_assignments FOR SELECT USING (
  enrollment_id IN (SELECT my_hs_student_enrollment_ids())
);

-- ── homeschool_weeks ──────────────────────────────────────────

DROP POLICY IF EXISTS "Teacher manages assigned weeks" ON homeschool_weeks;
CREATE POLICY "Teacher manages assigned weeks" ON homeschool_weeks FOR ALL USING (
  auth_role() = 'teacher' AND enrollment_id IN (SELECT my_hs_teacher_enrollment_ids())
);
DROP POLICY IF EXISTS "Student views published weeks" ON homeschool_weeks;
CREATE POLICY "Student views published weeks" ON homeschool_weeks FOR SELECT USING (
  enrollment_id IN (SELECT my_hs_student_enrollment_ids())
  AND (status = 'PUBLISHED' OR auth_role() = 'admin')
);

-- ── learning_sessions ─────────────────────────────────────────

DROP POLICY IF EXISTS "Student views own sessions" ON learning_sessions;
CREATE POLICY "Student views own sessions" ON learning_sessions FOR SELECT USING (
  enrollment_id IN (SELECT my_hs_student_enrollment_ids())
);
DROP POLICY IF EXISTS "Parent views child sessions" ON learning_sessions;
CREATE POLICY "Parent views child sessions" ON learning_sessions FOR SELECT USING (
  enrollment_id IN (SELECT my_hs_child_enrollment_ids())
);

-- ── learning_objectives ───────────────────────────────────────

DROP POLICY IF EXISTS "Teacher manages session objectives" ON learning_objectives;
CREATE POLICY "Teacher manages session objectives" ON learning_objectives FOR ALL USING (
  auth_role() = 'teacher' AND session_id IN (SELECT my_hs_teacher_session_ids())
);
DROP POLICY IF EXISTS "Student views and completes own objectives" ON learning_objectives;
CREATE POLICY "Student views and completes own objectives" ON learning_objectives FOR ALL USING (
  session_id IN (SELECT my_hs_student_session_ids())
);

-- ── learning_resources ────────────────────────────────────────

DROP POLICY IF EXISTS "Teacher manages session resources" ON learning_resources;
CREATE POLICY "Teacher manages session resources" ON learning_resources FOR ALL USING (
  auth_role() = 'teacher' AND session_id IN (SELECT my_hs_teacher_session_ids())
);
DROP POLICY IF EXISTS "Student views session resources" ON learning_resources;
CREATE POLICY "Student views session resources" ON learning_resources FOR SELECT USING (
  session_id IN (SELECT my_hs_student_session_ids())
);
DROP POLICY IF EXISTS "Parent views child resources" ON learning_resources;
CREATE POLICY "Parent views child resources" ON learning_resources FOR SELECT USING (
  session_id IN (SELECT my_hs_child_session_ids())
);

-- ── learning_missions ─────────────────────────────────────────

DROP POLICY IF EXISTS "Teacher manages assigned missions" ON learning_missions;
CREATE POLICY "Teacher manages assigned missions" ON learning_missions FOR ALL USING (
  auth_role() = 'teacher' AND session_id IN (SELECT my_hs_teacher_session_ids())
);
DROP POLICY IF EXISTS "Student manages own missions" ON learning_missions;
CREATE POLICY "Student manages own missions" ON learning_missions FOR ALL USING (
  session_id IN (SELECT my_hs_student_session_ids())
);

-- ── learning_reflections ──────────────────────────────────────

DROP POLICY IF EXISTS "Teacher views reflections for assigned sessions" ON learning_reflections;
CREATE POLICY "Teacher views reflections for assigned sessions" ON learning_reflections FOR SELECT USING (
  session_id IN (SELECT my_hs_teacher_session_ids())
);
DROP POLICY IF EXISTS "Parent views child reflections" ON learning_reflections;
CREATE POLICY "Parent views child reflections" ON learning_reflections FOR SELECT USING (
  student_id IN (SELECT my_child_student_ids())
);

-- ── learning_activities / learning_questions ──────────────────

DROP POLICY IF EXISTS "Teacher manages assigned activities" ON learning_activities;
CREATE POLICY "Teacher manages assigned activities" ON learning_activities FOR ALL USING (
  auth_role() = 'teacher' AND enrollment_id IN (SELECT my_hs_teacher_enrollment_ids())
);
DROP POLICY IF EXISTS "Student views own published activities" ON learning_activities;
CREATE POLICY "Student views own published activities" ON learning_activities FOR SELECT USING (
  enrollment_id IN (SELECT my_hs_student_enrollment_ids())
  AND status = 'PUBLISHED'
);
DROP POLICY IF EXISTS "Parent views child activities" ON learning_activities;
CREATE POLICY "Parent views child activities" ON learning_activities FOR SELECT USING (
  enrollment_id IN (SELECT my_hs_child_enrollment_ids())
  AND status = 'PUBLISHED'
);

DROP POLICY IF EXISTS "Teacher manages assigned questions" ON learning_questions;
CREATE POLICY "Teacher manages assigned questions" ON learning_questions FOR ALL USING (
  auth_role() = 'teacher' AND enrollment_id IN (SELECT my_hs_teacher_enrollment_ids())
);
DROP POLICY IF EXISTS "Student views own published questions" ON learning_questions;
CREATE POLICY "Student views own published questions" ON learning_questions FOR SELECT USING (
  enrollment_id IN (SELECT my_hs_student_enrollment_ids())
  AND status = 'PUBLISHED'
);

-- ── question_attempts / error_classifications ─────────────────

DROP POLICY IF EXISTS "Teacher views assigned attempts" ON question_attempts;
CREATE POLICY "Teacher views assigned attempts" ON question_attempts FOR SELECT USING (
  auth_role() = 'teacher' AND enrollment_id IN (SELECT my_hs_teacher_enrollment_ids())
);
DROP POLICY IF EXISTS "Parent views child attempts" ON question_attempts;
CREATE POLICY "Parent views child attempts" ON question_attempts FOR SELECT USING (
  student_id IN (SELECT my_child_student_ids())
);

DROP POLICY IF EXISTS "Teacher views assigned error classifications" ON error_classifications;
CREATE POLICY "Teacher views assigned error classifications" ON error_classifications FOR SELECT USING (
  auth_role() = 'teacher' AND enrollment_id IN (SELECT my_hs_teacher_enrollment_ids())
);

-- ── mastery ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "Teacher manages assigned mastery rules" ON mastery_rules;
CREATE POLICY "Teacher manages assigned mastery rules" ON mastery_rules FOR ALL USING (
  auth_role() = 'teacher' AND enrollment_id IN (SELECT my_hs_teacher_enrollment_ids())
);
DROP POLICY IF EXISTS "Student views own mastery rules" ON mastery_rules;
CREATE POLICY "Student views own mastery rules" ON mastery_rules FOR SELECT USING (
  enrollment_id IN (SELECT my_hs_student_enrollment_ids())
);

DROP POLICY IF EXISTS "Teacher manages assigned mastery records" ON objective_mastery_records;
CREATE POLICY "Teacher manages assigned mastery records" ON objective_mastery_records FOR ALL USING (
  auth_role() = 'teacher' AND enrollment_id IN (SELECT my_hs_teacher_enrollment_ids())
);
DROP POLICY IF EXISTS "Parent views child mastery records" ON objective_mastery_records;
CREATE POLICY "Parent views child mastery records" ON objective_mastery_records FOR SELECT USING (
  student_id IN (SELECT my_child_student_ids())
);

DROP POLICY IF EXISTS "Teacher views assigned mastery evaluations" ON mastery_evaluations;
CREATE POLICY "Teacher views assigned mastery evaluations" ON mastery_evaluations FOR SELECT USING (
  auth_role() = 'teacher' AND mastery_record_id IN (
    SELECT r.id FROM objective_mastery_records r
    WHERE r.enrollment_id IN (SELECT my_hs_teacher_enrollment_ids())
  )
);
DROP POLICY IF EXISTS "Student views own mastery evaluations" ON mastery_evaluations;
CREATE POLICY "Student views own mastery evaluations" ON mastery_evaluations FOR SELECT USING (
  mastery_record_id IN (
    SELECT id FROM objective_mastery_records WHERE student_id = get_my_student_id()
  )
);

-- ── learning_signals / versions / retrieval ───────────────────

DROP POLICY IF EXISTS "Teacher manages assigned signals" ON learning_signals;
CREATE POLICY "Teacher manages assigned signals" ON learning_signals FOR ALL USING (
  auth_role() = 'teacher' AND enrollment_id IN (SELECT my_hs_teacher_enrollment_ids())
);

DROP POLICY IF EXISTS "Teacher views assigned mission versions" ON learning_mission_versions;
CREATE POLICY "Teacher views assigned mission versions" ON learning_mission_versions FOR SELECT USING (
  auth_role() = 'teacher' AND session_id IN (SELECT my_hs_teacher_session_ids())
);
DROP POLICY IF EXISTS "Teacher views assigned objective versions" ON learning_objective_versions;
CREATE POLICY "Teacher views assigned objective versions" ON learning_objective_versions FOR SELECT USING (
  auth_role() = 'teacher' AND session_id IN (SELECT my_hs_teacher_session_ids())
);

DROP POLICY IF EXISTS "Teacher views assigned retrieval items" ON spaced_retrieval_items;
CREATE POLICY "Teacher views assigned retrieval items" ON spaced_retrieval_items FOR SELECT USING (
  auth_role() = 'teacher' AND enrollment_id IN (SELECT my_hs_teacher_enrollment_ids())
);
DROP POLICY IF EXISTS "Parent views child retrieval items" ON spaced_retrieval_items;
CREATE POLICY "Parent views child retrieval items" ON spaced_retrieval_items FOR SELECT USING (
  student_id IN (SELECT my_child_student_ids())
);

-- ── linked assignments / submissions ──────────────────────────

DROP POLICY IF EXISTS "Student views linked homeschool assignments" ON assignments;
CREATE POLICY "Student views linked homeschool assignments" ON assignments FOR SELECT USING (
  status = 'published'
  AND program = 'HOMESCHOOLING'
  AND session_id IN (SELECT my_hs_student_session_ids())
);
DROP POLICY IF EXISTS "Teacher manages linked session assignments" ON assignments;
CREATE POLICY "Teacher manages linked session assignments" ON assignments FOR ALL USING (
  auth_role() = 'teacher'
  AND session_id IN (SELECT my_hs_teacher_session_ids())
);
DROP POLICY IF EXISTS "Parent views child homeschool assignments" ON assignments;
CREATE POLICY "Parent views child homeschool assignments" ON assignments FOR SELECT USING (
  status = 'published'
  AND program = 'HOMESCHOOLING'
  AND session_id IN (SELECT my_hs_child_session_ids())
);

DROP POLICY IF EXISTS "Teacher views linked session submissions" ON submissions;
CREATE POLICY "Teacher views linked session submissions" ON submissions FOR SELECT USING (
  assignment_id IN (
    SELECT a.id FROM assignments a
    WHERE a.session_id IN (SELECT my_hs_teacher_session_ids())
  )
);
DROP POLICY IF EXISTS "Teacher updates linked session submissions" ON submissions;
CREATE POLICY "Teacher updates linked session submissions" ON submissions FOR UPDATE USING (
  assignment_id IN (
    SELECT a.id FROM assignments a
    WHERE a.session_id IN (SELECT my_hs_teacher_session_ids())
  )
);

-- ── AI markings (enrollment branch only; class branch untouched) ──

DROP POLICY IF EXISTS "Teacher manages assigned AI markings" ON ai_submission_marks;
CREATE POLICY "Teacher manages assigned AI markings" ON ai_submission_marks FOR ALL USING (
  auth_role() = 'teacher' AND (
    enrollment_id IN (SELECT my_hs_teacher_enrollment_ids())
    OR
    assignment_id IN (
      SELECT a.id FROM assignments a
      JOIN teacher_assignments ta ON ta.class_id = a.class_id AND ta.subject_id = a.subject_id
      WHERE ta.teacher_id = get_my_teacher_id()
    )
  )
);

NOTIFY pgrst, 'reload schema';
