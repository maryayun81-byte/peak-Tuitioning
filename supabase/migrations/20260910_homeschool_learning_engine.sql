-- ============================================================
-- PEAK CAMPUS HOMESCHOOLING — LEARNING ENGINE (Phase 2)
--
-- Adds the evidence/adaptation/mastery/retention layer on top of the
-- base homeschooling program (20260907):
--   • student_entitlements (§07)
--   • teacher_availability, separated from subject ownership (§09)
--   • HYBRID session mode (§10)
--   • session preparation states (§17)
--   • learning_activities + learning_questions (§26-34, §132)
--   • question_attempts + working capture (§74, §131)
--   • error_classifications — reflective, never punitive (§75-77)
--   • mastery_rules + objective_mastery_records + evaluations (§39, §86-89)
--   • learning_signals for teachers (§96-97)
--   • mission/objective versioning — history is immutable (§109)
--   • spaced_retrieval_items — "Keep It Fresh" (§99-100)
--   • submission idempotency keys (§117)
-- ============================================================

-- ── 1. STUDENT ENTITLEMENTS (§07) ─────────────────────────────
CREATE TABLE IF NOT EXISTS student_entitlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('HOMESCHOOLING','PEAK_COACH','ADVANCED_REPORTS')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','EXPIRED','REVOKED')),
  source TEXT NOT NULL DEFAULT 'ENROLLMENT' CHECK (source IN ('ENROLLMENT','MANUAL','TRIAL')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, feature)
);
CREATE INDEX IF NOT EXISTS idx_hs_entitlements_student ON student_entitlements(student_id);

-- ── 2. TEACHER AVAILABILITY, separate from ownership (§09) ────
CREATE TABLE IF NOT EXISTS teacher_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hs_availability_teacher ON teacher_availability(teacher_id);

-- ── 3. SESSION EVOLUTION: HYBRID mode + preparation state ─────
ALTER TABLE learning_sessions DROP CONSTRAINT IF EXISTS learning_sessions_learning_mode_check;
ALTER TABLE learning_sessions ADD CONSTRAINT learning_sessions_learning_mode_check
  CHECK (learning_mode IN ('TEACHER_LED','SELF_STUDY','AI_SUPPORTED','HYBRID'));

ALTER TABLE learning_sessions
  ADD COLUMN IF NOT EXISTS preparation_state TEXT NOT NULL DEFAULT 'EMPTY'
    CHECK (preparation_state IN ('EMPTY','DRAFT','READY','PUBLISHED','COMPLETED'));
ALTER TABLE learning_sessions
  ADD COLUMN IF NOT EXISTS mission_version INTEGER NOT NULL DEFAULT 1;

-- Objective lock override (§23, §108)
ALTER TABLE learning_objectives
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 4. LEARNING ACTIVITIES (§26-28, §132-135) ─────────────────
CREATE TABLE IF NOT EXISTS learning_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES homeschool_enrollments(id) ON DELETE CASCADE,
  objective_id UUID REFERENCES learning_objectives(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('TEACH','PRACTICE','WORK','ASSESS','REFLECT')),
  interaction_type TEXT NOT NULL DEFAULT 'GENERIC',
  assessment_mode TEXT NOT NULL DEFAULT 'SYSTEM' CHECK (assessment_mode IN ('SYSTEM','TEACHER','AI_FORMATIVE')),
  support_mode TEXT NOT NULL DEFAULT 'PEAK_COACH' CHECK (support_mode IN ('NONE','PEAK_COACH','TEACHER','FULL')),
  submission_mode TEXT NOT NULL DEFAULT 'DIGITAL' CHECK (submission_mode IN ('DIGITAL','PHOTO','NONE')),
  mastery_mode TEXT NOT NULL DEFAULT 'AUTOMATIC' CHECK (mastery_mode IN ('AUTOMATIC','TEACHER_REVIEW')),
  workspace_id TEXT,
  title TEXT NOT NULL,
  instructions TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hs_activities_session ON learning_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_hs_activities_objective ON learning_activities(objective_id);
CREATE INDEX IF NOT EXISTS idx_hs_activities_enrollment ON learning_activities(enrollment_id);

-- ── 5. LEARNING QUESTIONS (§32-36) ────────────────────────────
CREATE TABLE IF NOT EXISTS learning_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES homeschool_enrollments(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES learning_activities(id) ON DELETE SET NULL,
  objective_id UUID REFERENCES learning_objectives(id) ON DELETE SET NULL,
  question_type TEXT NOT NULL DEFAULT 'short_answer',
  prompt TEXT NOT NULL,
  instructions TEXT,
  interaction_type TEXT NOT NULL DEFAULT 'GENERIC',
  workspace_id TEXT,
  expected_answer JSONB,
  answer_model JSONB,
  validation_model JSONB,
  marks INTEGER NOT NULL DEFAULT 1,
  difficulty TEXT NOT NULL DEFAULT 'standard' CHECK (difficulty IN ('foundation','standard','challenge')),
  expected_skill TEXT,
  working_required BOOLEAN NOT NULL DEFAULT FALSE,
  explanation_required BOOLEAN NOT NULL DEFAULT FALSE,
  mastery_relevant BOOLEAN NOT NULL DEFAULT TRUE,
  peak_coach_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  teacher_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ai_generated','document_detected')),
  ai_validated BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hs_questions_session ON learning_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_hs_questions_activity ON learning_questions(activity_id);
CREATE INDEX IF NOT EXISTS idx_hs_questions_objective ON learning_questions(objective_id);

-- ── 6. QUESTION ATTEMPTS + WORKING CAPTURE (§74, §131) ────────
CREATE TABLE IF NOT EXISTS question_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES homeschool_enrollments(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  objective_id UUID REFERENCES learning_objectives(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES learning_activities(id) ON DELETE SET NULL,
  question_id UUID REFERENCES learning_questions(id) ON DELETE SET NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  final_answer JSONB,
  working JSONB NOT NULL DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',
  self_assessment TEXT,
  error_category TEXT,
  hints_used INTEGER NOT NULL DEFAULT 0,
  support_level INTEGER NOT NULL DEFAULT 0 CHECK (support_level BETWEEN 0 AND 6),
  score NUMERIC,
  max_score NUMERIC,
  is_correct BOOLEAN,
  mastery_relevant BOOLEAN NOT NULL DEFAULT TRUE,
  idempotency_key TEXT UNIQUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hs_attempts_student ON question_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_hs_attempts_question ON question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_hs_attempts_objective ON question_attempts(objective_id);
CREATE INDEX IF NOT EXISTS idx_hs_attempts_session ON question_attempts(session_id);

-- ── 7. ERROR CLASSIFICATIONS (§75-77) ─────────────────────────
-- Reflective learning data. Never an official judgment on its own.
CREATE TABLE IF NOT EXISTS error_classifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES question_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES homeschool_enrollments(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'concept','calculation','formula','sign','unit_conversion',
    'reading_interpretation','procedure','grammar_vocabulary',
    'careless','incomplete','guessing','not_sure','other'
  )),
  student_note TEXT,
  ai_suggested BOOLEAN NOT NULL DEFAULT FALSE,
  teacher_note TEXT,
  confirmed_by TEXT NOT NULL DEFAULT 'student' CHECK (confirmed_by IN ('student','teacher','ai')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hs_errors_attempt ON error_classifications(attempt_id);
CREATE INDEX IF NOT EXISTS idx_hs_errors_student ON error_classifications(student_id);
CREATE INDEX IF NOT EXISTS idx_hs_errors_session ON error_classifications(session_id);

-- ── 8. MASTERY RULES + RECORDS + EVALUATIONS (§39, §86-89) ────
CREATE TABLE IF NOT EXISTS mastery_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES homeschool_enrollments(id) ON DELETE CASCADE,
  session_id UUID REFERENCES learning_sessions(id) ON DELETE CASCADE,
  objective_id UUID REFERENCES learning_objectives(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'score_threshold','independent_attempts','teacher_approval','completion','combined'
  )),
  config JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hs_mastery_rules_objective ON mastery_rules(objective_id);

CREATE TABLE IF NOT EXISTS objective_mastery_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES homeschool_enrollments(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN (
    'NOT_STARTED','IN_PROGRESS','NEEDS_REINFORCEMENT',
    'CORRECTIONS_REQUIRED','UNDER_REVIEW','MASTERED'
  )),
  evidence JSONB NOT NULL DEFAULT '{}',
  evaluated_at TIMESTAMPTZ,
  evaluated_by TEXT,
  override_by UUID,
  override_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, objective_id)
);
CREATE INDEX IF NOT EXISTS idx_hs_mastery_student ON objective_mastery_records(student_id);
CREATE INDEX IF NOT EXISTS idx_hs_mastery_objective ON objective_mastery_records(objective_id);

CREATE TABLE IF NOT EXISTS mastery_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mastery_record_id UUID NOT NULL REFERENCES objective_mastery_records(id) ON DELETE CASCADE,
  triggered_by TEXT NOT NULL,
  result TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hs_mastery_eval_record ON mastery_evaluations(mastery_record_id);

-- ── 9. LEARNING SIGNALS (§96-97) ──────────────────────────────
-- Advisory signals for teachers. Never shown as-is to students.
CREATE TABLE IF NOT EXISTS learning_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES homeschool_enrollments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id UUID REFERENCES learning_sessions(id) ON DELETE SET NULL,
  objective_id UUID REFERENCES learning_objectives(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'repeated_error','high_support_dependence','repeated_correction',
    'fast_guessing','long_inactivity','strong_independent_performance',
    'retention_decline','mastery_instability'
  )),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','watch','act')),
  title TEXT NOT NULL,
  detail TEXT,
  evidence JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','acknowledged','resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hs_signals_student ON learning_signals(student_id);
CREATE INDEX IF NOT EXISTS idx_hs_signals_enrollment ON learning_signals(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_hs_signals_status ON learning_signals(status);

-- ── 10. MISSION / OBJECTIVE VERSIONING (§109) ─────────────────
CREATE TABLE IF NOT EXISTS learning_mission_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID NOT NULL REFERENCES learning_missions(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  published_by UUID,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (mission_id, version_number)
);
CREATE TABLE IF NOT EXISTS learning_objective_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objective_id UUID NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  published_by UUID,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (objective_id, version_number)
);

-- ── 11. SPACED RETRIEVAL — "Keep It Fresh" (§99-100) ──────────
CREATE TABLE IF NOT EXISTS spaced_retrieval_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES homeschool_enrollments(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES learning_questions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','due','done','lapsed')),
  due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_result BOOLEAN,
  streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hs_retrieval_student ON spaced_retrieval_items(student_id);
CREATE INDEX IF NOT EXISTS idx_hs_retrieval_due ON spaced_retrieval_items(status, due_at);

-- ── 12. SUBMISSION IDEMPOTENCY (§117) ─────────────────────────
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER trg_hs_entitlements_updated BEFORE UPDATE ON student_entitlements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hs_availability_updated BEFORE UPDATE ON teacher_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hs_activities_updated BEFORE UPDATE ON learning_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hs_questions_updated BEFORE UPDATE ON learning_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hs_mastery_rules_updated BEFORE UPDATE ON mastery_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hs_mastery_records_updated BEFORE UPDATE ON objective_mastery_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hs_signals_updated BEFORE UPDATE ON learning_signals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hs_retrieval_updated BEFORE UPDATE ON spaced_retrieval_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE student_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE objective_mastery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_mission_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_objective_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaced_retrieval_items ENABLE ROW LEVEL SECURITY;

-- ── ENTITLEMENTS ──
CREATE POLICY "Admin manages entitlements" ON student_entitlements FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Student views own entitlements" ON student_entitlements FOR SELECT USING (
  student_id = get_my_student_id()
);

-- ── AVAILABILITY ──
CREATE POLICY "Admin manages availability" ON teacher_availability FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher manages own availability" ON teacher_availability FOR ALL USING (
  teacher_id = get_my_teacher_id()
);

-- ── ACTIVITIES / QUESTIONS (enrollment-scoped, teacher-prepared) ──
CREATE POLICY "Admin manages activities" ON learning_activities FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher manages assigned activities" ON learning_activities FOR ALL USING (
  auth_role() = 'teacher' AND enrollment_id IN (
    SELECT enrollment_id FROM homeschool_teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Student views own published activities" ON learning_activities FOR SELECT USING (
  enrollment_id IN (SELECT id FROM homeschool_enrollments WHERE student_id = get_my_student_id())
  AND status = 'PUBLISHED'
);
CREATE POLICY "Parent views child activities" ON learning_activities FOR SELECT USING (
  enrollment_id IN (
    SELECT he.id FROM homeschool_enrollments he
    JOIN students s ON s.id = he.student_id
    WHERE s.parent_id = get_my_parent_id()
  )
  AND status = 'PUBLISHED'
);

CREATE POLICY "Admin manages questions" ON learning_questions FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher manages assigned questions" ON learning_questions FOR ALL USING (
  auth_role() = 'teacher' AND enrollment_id IN (
    SELECT enrollment_id FROM homeschool_teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Student views own published questions" ON learning_questions FOR SELECT USING (
  enrollment_id IN (SELECT id FROM homeschool_enrollments WHERE student_id = get_my_student_id())
  AND status = 'PUBLISHED'
);

-- ── ATTEMPTS (student-owned evidence) ──
CREATE POLICY "Admin views attempts" ON question_attempts FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher views assigned attempts" ON question_attempts FOR SELECT USING (
  auth_role() = 'teacher' AND enrollment_id IN (
    SELECT enrollment_id FROM homeschool_teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Student manages own attempts" ON question_attempts FOR ALL USING (
  student_id = get_my_student_id()
);
CREATE POLICY "Parent views child attempts" ON question_attempts FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE parent_id = get_my_parent_id())
);

-- ── ERROR CLASSIFICATIONS ──
CREATE POLICY "Admin views error classifications" ON error_classifications FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher views assigned error classifications" ON error_classifications FOR SELECT USING (
  auth_role() = 'teacher' AND enrollment_id IN (
    SELECT enrollment_id FROM homeschool_teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Student manages own error classifications" ON error_classifications FOR ALL USING (
  student_id = get_my_student_id()
);

-- ── MASTERY ──
CREATE POLICY "Admin manages mastery rules" ON mastery_rules FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher manages assigned mastery rules" ON mastery_rules FOR ALL USING (
  auth_role() = 'teacher' AND enrollment_id IN (
    SELECT enrollment_id FROM homeschool_teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Student views own mastery rules" ON mastery_rules FOR SELECT USING (
  enrollment_id IN (SELECT id FROM homeschool_enrollments WHERE student_id = get_my_student_id())
);
CREATE POLICY "Admin manages mastery records" ON objective_mastery_records FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher manages assigned mastery records" ON objective_mastery_records FOR ALL USING (
  auth_role() = 'teacher' AND enrollment_id IN (
    SELECT enrollment_id FROM homeschool_teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Student views own mastery records" ON objective_mastery_records FOR SELECT USING (
  student_id = get_my_student_id()
);
CREATE POLICY "Parent views child mastery records" ON objective_mastery_records FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE parent_id = get_my_parent_id())
);
CREATE POLICY "Admin manages mastery evaluations" ON mastery_evaluations FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher views assigned mastery evaluations" ON mastery_evaluations FOR SELECT USING (
  auth_role() = 'teacher' AND mastery_record_id IN (
    SELECT r.id FROM objective_mastery_records r
    JOIN homeschool_teacher_assignments ta ON ta.enrollment_id = r.enrollment_id
    WHERE ta.teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Student views own mastery evaluations" ON mastery_evaluations FOR SELECT USING (
  mastery_record_id IN (
    SELECT id FROM objective_mastery_records WHERE student_id = get_my_student_id()
  )
);

-- ── SIGNALS (teacher-facing; never student-visible) ──
CREATE POLICY "Admin manages signals" ON learning_signals FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher manages assigned signals" ON learning_signals FOR ALL USING (
  auth_role() = 'teacher' AND enrollment_id IN (
    SELECT enrollment_id FROM homeschool_teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);

-- ── VERSIONS (immutable history) ──
CREATE POLICY "Admin manages mission versions" ON learning_mission_versions FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher views assigned mission versions" ON learning_mission_versions FOR SELECT USING (
  auth_role() = 'teacher' AND session_id IN (
    SELECT id FROM learning_sessions WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Admin manages objective versions" ON learning_objective_versions FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher views assigned objective versions" ON learning_objective_versions FOR SELECT USING (
  auth_role() = 'teacher' AND session_id IN (
    SELECT id FROM learning_sessions WHERE teacher_id = get_my_teacher_id()
  )
);

-- ── RETRIEVAL ──
CREATE POLICY "Admin manages retrieval items" ON spaced_retrieval_items FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher views assigned retrieval items" ON spaced_retrieval_items FOR SELECT USING (
  auth_role() = 'teacher' AND enrollment_id IN (
    SELECT enrollment_id FROM homeschool_teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Student manages own retrieval items" ON spaced_retrieval_items FOR ALL USING (
  student_id = get_my_student_id()
);
CREATE POLICY "Parent views child retrieval items" ON spaced_retrieval_items FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE parent_id = get_my_parent_id())
);

NOTIFY pgrst, 'reload schema';
