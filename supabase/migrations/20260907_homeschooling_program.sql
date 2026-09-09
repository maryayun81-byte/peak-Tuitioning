-- ============================================================
-- HOMESCHOOLING PROGRAM — Complete Database Schema
-- Peak Performance Tutoring
-- ============================================================

-- ============================================================
-- HOMESCHOOL ENROLLMENTS
-- ============================================================
CREATE TABLE homeschool_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','PAUSED','COMPLETED','EXPIRED','CANCELLED')),
  start_date DATE NOT NULL,
  end_date DATE,
  grade_level TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  program_name TEXT NOT NULL DEFAULT 'Homeschooling',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, academic_year, status) -- Prevent duplicate active enrollments per year
);

-- ============================================================
-- HOMESCHOOL SUBJECTS (subjects enrolled in the homeschooling program)
-- ============================================================
CREATE TABLE homeschool_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES homeschool_enrollments(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, subject_id)
);

-- ============================================================
-- HOMESCHOOL TEACHER ASSIGNMENTS (teacher per subject)
-- ============================================================
CREATE TABLE homeschool_teacher_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES homeschool_enrollments(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL DEFAULT 'primary' CHECK (assignment_type IN ('primary','secondary')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, subject_id, teacher_id)
);

-- ============================================================
-- HOMESCHOOL WEEKS
-- ============================================================
CREATE TABLE homeschool_weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES homeschool_enrollments(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, week_number)
);

-- ============================================================
-- LEARNING SESSIONS (each session within a week)
-- ============================================================
CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES homeschool_enrollments(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES homeschool_weeks(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  day TEXT NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  learning_mode TEXT NOT NULL DEFAULT 'TEACHER_LED' CHECK (learning_mode IN ('TEACHER_LED','SELF_STUDY','AI_SUPPORTED')),
  topic TEXT,
  learning_goal TEXT,
  instructions TEXT,
  submission_required BOOLEAN NOT NULL DEFAULT FALSE,
  submission_type TEXT DEFAULT 'file' CHECK (submission_type IN ('file','text','both','none')),
  status TEXT NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING','READY','IN_PROGRESS','SUBMISSION_PENDING','UNDER_REVIEW','CORRECTIONS_REQUIRED','COMPLETED','MISSED','CANCELLED')),
  student_status TEXT NOT NULL DEFAULT 'UPCOMING' CHECK (student_status IN ('UPCOMING','NOT_STARTED','IN_PROGRESS','SUBMITTED','COMPLETED')),
  ai_assistance_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_instructions TEXT,
  max_duration_minutes INTEGER,
  notes TEXT,
  cancelled_reason TEXT,
  rescheduled_from UUID REFERENCES learning_sessions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEARNING OBJECTIVES (per session)
-- ============================================================
CREATE TABLE learning_objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEARNING RESOURCES (attached to sessions)
-- ============================================================
CREATE TABLE learning_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'document' CHECK (type IN ('document','video','link','quiz','question_set','file','image')),
  url TEXT,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEARNING MISSIONS (the learning plan for self-study sessions)
-- ============================================================
CREATE TABLE learning_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL UNIQUE REFERENCES learning_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_started BOOLEAN NOT NULL DEFAULT FALSE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEARNING REFLECTIONS (student self-reflection after sessions)
-- ============================================================
CREATE TABLE learning_reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  accomplished TEXT,
  difficulties TEXT,
  confidence TEXT CHECK (confidence IN ('need_help','getting_there','comfortable','very_confident')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

-- ============================================================
-- HOMESCHOOL AUDIT LOG
-- ============================================================
CREATE TABLE homeschool_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_hs_enrollment_student ON homeschool_enrollments(student_id);
CREATE INDEX idx_hs_enrollment_status ON homeschool_enrollments(status);
CREATE INDEX idx_hs_subjects_enrollment ON homeschool_subjects(enrollment_id);
CREATE INDEX idx_hs_teacher_assignments_enrollment ON homeschool_teacher_assignments(enrollment_id);
CREATE INDEX idx_hs_weeks_enrollment ON homeschool_weeks(enrollment_id);
CREATE INDEX idx_hs_sessions_enrollment ON learning_sessions(enrollment_id);
CREATE INDEX idx_hs_sessions_week ON learning_sessions(week_id);
CREATE INDEX idx_hs_sessions_subject ON learning_sessions(subject_id);
CREATE INDEX idx_hs_sessions_teacher ON learning_sessions(teacher_id);
CREATE INDEX idx_hs_sessions_status ON learning_sessions(status);
CREATE INDEX idx_hs_objectives_session ON learning_objectives(session_id);
CREATE INDEX idx_hs_resources_session ON learning_resources(session_id);
CREATE INDEX idx_hs_missions_session ON learning_missions(session_id);
CREATE INDEX idx_hs_reflections_session ON learning_reflections(session_id);
CREATE INDEX idx_hs_reflections_student ON learning_reflections(student_id);
CREATE INDEX idx_hs_audit_actor ON homeschool_audit_log(actor_id);
CREATE INDEX idx_hs_audit_target ON homeschool_audit_log(target_type, target_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER trg_hs_enrollments_updated BEFORE UPDATE ON homeschool_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hs_weeks_updated BEFORE UPDATE ON homeschool_weeks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hs_sessions_updated BEFORE UPDATE ON learning_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hs_missions_updated BEFORE UPDATE ON learning_missions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE homeschool_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeschool_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeschool_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeschool_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeschool_audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: check if student has active homeschool enrollment
CREATE OR REPLACE FUNCTION has_active_homeschool_enrollment(p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM homeschool_enrollments
    WHERE student_id = p_student_id AND status = 'ACTIVE'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get student's active homeschool enrollment
CREATE OR REPLACE FUNCTION get_active_homeschool_enrollment(p_student_id UUID)
RETURNS UUID AS $$
  SELECT id FROM homeschool_enrollments
  WHERE student_id = p_student_id AND status = 'ACTIVE'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- HOMESCHOOL ENROLLMENTS
CREATE POLICY "Admin manages all enrollments" ON homeschool_enrollments FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Student views own enrollments" ON homeschool_enrollments FOR SELECT USING (
  student_id = get_my_student_id()
);
CREATE POLICY "Teacher views assigned enrollments" ON homeschool_enrollments FOR SELECT USING (
  auth_role() = 'teacher' AND id IN (
    SELECT enrollment_id FROM homeschool_teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Parent views child enrollments" ON homeschool_enrollments FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE parent_id = get_my_parent_id())
);

-- HOMESCHOOL SUBJECTS
CREATE POLICY "Admin manages all homeschool subjects" ON homeschool_subjects FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Student views own homeschool subjects" ON homeschool_subjects FOR SELECT USING (
  enrollment_id IN (SELECT id FROM homeschool_enrollments WHERE student_id = get_my_student_id())
);
CREATE POLICY "Teacher views assigned homeschool subjects" ON homeschool_subjects FOR SELECT USING (
  auth_role() = 'teacher' AND enrollment_id IN (
    SELECT enrollment_id FROM homeschool_teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);

-- HOMESCHOOL TEACHER ASSIGNMENTS
CREATE POLICY "Admin manages all teacher assignments" ON homeschool_teacher_assignments FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher views own assignments" ON homeschool_teacher_assignments FOR SELECT USING (
  teacher_id = get_my_teacher_id()
);
CREATE POLICY "Student views own teacher assignments" ON homeschool_teacher_assignments FOR SELECT USING (
  enrollment_id IN (SELECT id FROM homeschool_enrollments WHERE student_id = get_my_student_id())
);

-- HOMESCHOOL WEEKS
CREATE POLICY "Admin manages all weeks" ON homeschool_weeks FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher manages assigned weeks" ON homeschool_weeks FOR ALL USING (
  auth_role() = 'teacher' AND enrollment_id IN (
    SELECT enrollment_id FROM homeschool_teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Student views published weeks" ON homeschool_weeks FOR SELECT USING (
  enrollment_id IN (SELECT id FROM homeschool_enrollments WHERE student_id = get_my_student_id())
  AND (status = 'PUBLISHED' OR auth_role() = 'admin')
);

-- LEARNING SESSIONS
CREATE POLICY "Admin manages all sessions" ON learning_sessions FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher manages assigned sessions" ON learning_sessions FOR ALL USING (
  auth_role() = 'teacher' AND teacher_id = get_my_teacher_id()
);
CREATE POLICY "Student views own sessions" ON learning_sessions FOR SELECT USING (
  enrollment_id IN (SELECT id FROM homeschool_enrollments WHERE student_id = get_my_student_id())
);
CREATE POLICY "Parent views child sessions" ON learning_sessions FOR SELECT USING (
  enrollment_id IN (
    SELECT he.id FROM homeschool_enrollments he
    JOIN students s ON s.id = he.student_id
    WHERE s.parent_id = get_my_parent_id()
  )
);

-- LEARNING OBJECTIVES
CREATE POLICY "Admin manages all objectives" ON learning_objectives FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher manages session objectives" ON learning_objectives FOR ALL USING (
  auth_role() = 'teacher' AND session_id IN (
    SELECT id FROM learning_sessions WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Student views and completes own objectives" ON learning_objectives FOR ALL USING (
  session_id IN (
    SELECT ls.id FROM learning_sessions ls
    JOIN homeschool_enrollments he ON he.id = ls.enrollment_id
    WHERE he.student_id = get_my_student_id()
  )
);

-- LEARNING RESOURCES
CREATE POLICY "Admin manages all resources" ON learning_resources FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher manages session resources" ON learning_resources FOR ALL USING (
  auth_role() = 'teacher' AND session_id IN (
    SELECT id FROM learning_sessions WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Student views session resources" ON learning_resources FOR SELECT USING (
  session_id IN (
    SELECT ls.id FROM learning_sessions ls
    JOIN homeschool_enrollments he ON he.id = ls.enrollment_id
    WHERE he.student_id = get_my_student_id()
  )
);
CREATE POLICY "Parent views child resources" ON learning_resources FOR SELECT USING (
  session_id IN (
    SELECT ls.id FROM learning_sessions ls
    JOIN homeschool_enrollments he ON he.id = ls.enrollment_id
    JOIN students s ON s.id = he.student_id
    WHERE s.parent_id = get_my_parent_id()
  )
);

-- LEARNING MISSIONS
CREATE POLICY "Admin manages all missions" ON learning_missions FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher manages assigned missions" ON learning_missions FOR ALL USING (
  auth_role() = 'teacher' AND session_id IN (
    SELECT id FROM learning_sessions WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Student manages own missions" ON learning_missions FOR ALL USING (
  session_id IN (
    SELECT ls.id FROM learning_sessions ls
    JOIN homeschool_enrollments he ON he.id = ls.enrollment_id
    WHERE he.student_id = get_my_student_id()
  )
);

-- LEARNING REFLECTIONS
CREATE POLICY "Admin manages all reflections" ON learning_reflections FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Student manages own reflections" ON learning_reflections FOR ALL USING (
  student_id = get_my_student_id()
);
CREATE POLICY "Teacher views reflections for assigned sessions" ON learning_reflections FOR SELECT USING (
  session_id IN (
    SELECT id FROM learning_sessions WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Parent views child reflections" ON learning_reflections FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE parent_id = get_my_parent_id())
);

-- HOMESCHOOL AUDIT LOG
CREATE POLICY "Admin manages audit log" ON homeschool_audit_log FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Admin views audit log" ON homeschool_audit_log FOR SELECT USING (auth_role() = 'admin');

-- ============================================================
-- ENABLE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE learning_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE learning_objectives;
ALTER PUBLICATION supabase_realtime ADD TABLE learning_missions;
ALTER PUBLICATION supabase_realtime ADD TABLE homeschool_enrollments;
