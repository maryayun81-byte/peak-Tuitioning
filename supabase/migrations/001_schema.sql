-- ============================================================
-- Peak Performance Tutoring — Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','teacher','student','parent')),
  avatar_url TEXT,
  phone TEXT,
  theme TEXT NOT NULL DEFAULT 'midnight-scholar',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CURRICULUMS
-- ============================================================
CREATE TABLE curriculums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLASSES
-- ============================================================
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(curriculum_id, name)
);

-- ============================================================
-- SUBJECTS
-- ============================================================
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE, -- Made nullable
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, name)
);

-- ============================================================
-- PARENTS
-- ============================================================
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_code TEXT NOT NULL UNIQUE, -- PR-XXXXXX
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  admission_number TEXT NOT NULL UNIQUE, -- PPT-2026-XXXXX
  full_name TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id),
  curriculum_id UUID NOT NULL REFERENCES curriculums(id),
  school_name TEXT,
  parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  parent_code_used TEXT, -- parent code used to link
  temp_password TEXT,
  onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student subjects (subjects a student is registered for)
CREATE TABLE student_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);

-- ============================================================
-- TEACHERS
-- ============================================================
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher curriculum preferences (onboarding)
CREATE TABLE teacher_curriculum_prefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  UNIQUE(teacher_id, curriculum_id)
);

-- Teacher class preferences (onboarding)
CREATE TABLE teacher_class_prefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES curriculums(id),
  UNIQUE(teacher_id, class_id)
);

-- Teacher subject preferences (onboarding)
CREATE TABLE teacher_subject_prefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- ============================================================
-- TEACHER ASSIGNMENTS (admin assigns teacher to class+subject)
-- ============================================================
CREATE TABLE teacher_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  is_class_teacher BOOLEAN NOT NULL DEFAULT FALSE,
  tuition_event_id UUID, -- optional scope
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, class_id, subject_id)
);

-- ============================================================
-- TUITION EVENTS
-- ============================================================
CREATE TABLE tuition_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active_days TEXT[] NOT NULL DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday'],
  attendance_threshold INTEGER NOT NULL DEFAULT 80,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  curriculum_id UUID REFERENCES curriculums(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student event registrations
CREATE TABLE student_event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tuition_event_id UUID NOT NULL REFERENCES tuition_events(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, tuition_event_id)
);

-- ============================================================
-- EXAM EVENTS
-- ============================================================
CREATE TABLE exam_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tuition_event_id UUID NOT NULL REFERENCES tuition_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exam_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GRADING SYSTEMS
-- ============================================================
CREATE TABLE grading_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grades JSONB NOT NULL DEFAULT '[]', -- [{grade, min_mark, max_mark, points, remark}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TIMETABLE
-- ============================================================
CREATE TABLE timetables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  tuition_event_id UUID NOT NULL REFERENCES tuition_events(id) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  tuition_event_id UUID NOT NULL REFERENCES tuition_events(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  date DATE NOT NULL,
  present BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date, tuition_event_id)
);

-- ============================================================
-- ASSIGNMENTS
-- ============================================================
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL DEFAULT '{}', -- TipTap JSON
  audience TEXT NOT NULL DEFAULT 'class' CHECK (audience IN ('class','subject','selected_students','group')),
  selected_student_ids UUID[] DEFAULT ARRAY[]::UUID[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  due_date TIMESTAMPTZ,
  max_marks NUMERIC(10,2),
  tuition_event_id UUID REFERENCES tuition_events(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  content TEXT DEFAULT '{}', -- TipTap JSON answer
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','submitted','marked','returned')),
  marks NUMERIC(10,2),
  grade TEXT,
  feedback TEXT,
  strengths TEXT,
  weaknesses TEXT,
  submitted_at TIMESTAMPTZ,
  marked_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- ============================================================
-- ANNOTATIONS
-- ============================================================
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  canvas_state_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUIZZES
-- ============================================================
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  duration_minutes INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  tuition_event_id UUID REFERENCES tuition_events(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  score NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_marks NUMERIC(10,2) NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, student_id)
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tuition_event_id UUID NOT NULL REFERENCES tuition_events(id),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  payment_date DATE NOT NULL,
  method TEXT NOT NULL DEFAULT 'Cash',
  reference TEXT,
  notes TEXT,
  receipt_number TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXAM MARKS (teacher submits per student per subject)
-- ============================================================
CREATE TABLE exam_marks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  exam_event_id UUID NOT NULL REFERENCES exam_events(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  marks NUMERIC(10,2) NOT NULL,
  grade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, exam_event_id)
);

-- ============================================================
-- TRANSCRIPTS
-- ============================================================
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_event_id UUID NOT NULL REFERENCES exam_events(id),
  tuition_event_id UUID NOT NULL REFERENCES tuition_events(id),
  subject_results JSONB NOT NULL DEFAULT '[]',
  overall_grade TEXT,
  remarks TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, exam_event_id)
);

-- ============================================================
-- TRANSCRIPT CONFIG (admin configures globally)
-- ============================================================
CREATE TABLE transcript_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  logo_url TEXT,
  signature_url TEXT,
  stamp_url TEXT,
  watermark_text TEXT DEFAULT 'PEAK PERFORMANCE TUTORING',
  school_name TEXT NOT NULL DEFAULT 'Peak Performance Tutoring',
  footer_text TEXT,
  primary_color TEXT DEFAULT '#4F8CFF',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCHEMES OF WORK
-- ============================================================
CREATE TABLE schemes_of_work (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  tuition_event_id UUID REFERENCES tuition_events(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '{}', -- TipTap JSON
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  shared_with UUID[] DEFAULT ARRAY[]::UUID[], -- teacher user_ids
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESOURCES
-- ============================================================
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'note' CHECK (type IN ('note','video','link','file')),
  url TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CERTIFICATES
-- ============================================================
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tuition_event_id UUID NOT NULL REFERENCES tuition_events(id),
  attendance_percentage NUMERIC(5,2) NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  issued BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(student_id, tuition_event_id)
);

-- ============================================================
-- STUDENT PERFORMANCE ENTRIES (student self-reports)
-- ============================================================
CREATE TABLE student_performance_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tuition_event_id UUID NOT NULL REFERENCES tuition_events(id),
  exam_event_id UUID REFERENCES exam_events(id),
  subject_entries JSONB NOT NULL DEFAULT '[]',
  overall_grade TEXT,
  previous_grade TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, tuition_event_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_parent ON students(parent_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_event ON attendance(tuition_event_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_event ON payments(tuition_event_id);
CREATE INDEX idx_exam_marks_event ON exam_marks(exam_event_id);
CREATE INDEX idx_transcripts_student ON transcripts(student_id);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tuition_events_updated BEFORE UPDATE ON tuition_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_assignments_updated BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_annotations_updated BEFORE UPDATE ON annotations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_schemes_updated BEFORE UPDATE ON schemes_of_work FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_exam_marks_updated BEFORE UPDATE ON exam_marks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger to sync profile role changes to Auth Metadata (for RLS)
CREATE OR REPLACE FUNCTION sync_role_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.role)
    )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_role_to_metadata
AFTER UPDATE OF role ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_role_to_metadata();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_curriculum_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subject_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemes_of_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_performance_entries ENABLE ROW LEVEL SECURITY;

-- helper functions to bypass RLS for identity lookups to prevent recursion
CREATE OR REPLACE FUNCTION get_my_parent_id() RETURNS UUID AS $$
  SELECT id FROM parents WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_teacher_id() RETURNS UUID AS $$
  SELECT id FROM teachers WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_student_id() RETURNS UUID AS $$
  SELECT id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_student_parent_id() RETURNS UUID AS $$
  SELECT parent_id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_student_class_id() RETURNS UUID AS $$
  SELECT class_id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check user role (uses JWT metadata to avoid Profiles table recursion)
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text;
$$ LANGUAGE sql STABLE;

-- PROFILES
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins view all profiles" ON profiles FOR SELECT USING (auth_role() = 'admin');
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins update all profiles" ON profiles FOR UPDATE USING (auth_role() = 'admin');

-- CURRICULUMS, CLASSES, SUBJECTS — public read, admin write
CREATE POLICY "Anyone can view curriculums" ON curriculums FOR SELECT USING (TRUE);
CREATE POLICY "Admin manages curriculums" ON curriculums FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Anyone can view classes" ON classes FOR SELECT USING (TRUE);
CREATE POLICY "Admin manages classes" ON classes FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Anyone can view subjects" ON subjects FOR SELECT USING (TRUE);
CREATE POLICY "Admin manages subjects" ON subjects FOR ALL USING (auth_role() = 'admin');

-- STUDENTS
CREATE POLICY "Student views own record" ON students FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin views all students" ON students FOR SELECT USING (auth_role() = 'admin');
CREATE POLICY "Teacher views class students" ON students FOR SELECT USING (
  auth_role() = 'teacher' AND class_id IN (
    SELECT class_id FROM teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);
CREATE POLICY "Parent views linked students" ON students FOR SELECT USING (
  parent_id = get_my_parent_id()
);
CREATE POLICY "Admin manages students" ON students FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Student updates own record" ON students FOR UPDATE USING (user_id = auth.uid());

-- PARENTS
CREATE POLICY "Parent views own record" ON parents FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin views all parents" ON parents FOR SELECT USING (auth_role() = 'admin');
CREATE POLICY "Admin manages parents" ON parents FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Student can view linked parent" ON parents FOR SELECT USING (
  id = get_my_student_parent_id()
);

-- TEACHERS
CREATE POLICY "Teacher views own record" ON teachers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin views all teachers" ON teachers FOR SELECT USING (auth_role() = 'admin');
CREATE POLICY "All can view teachers" ON teachers FOR SELECT USING (TRUE);
CREATE POLICY "Admin manages teachers" ON teachers FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Teacher updates own record" ON teachers FOR UPDATE USING (user_id = auth.uid());

-- TUITION EVENTS
CREATE POLICY "All authenticated can view tuition events" ON tuition_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages tuition events" ON tuition_events FOR ALL USING (auth_role() = 'admin');

-- EXAM EVENTS
CREATE POLICY "All authenticated can view exam events" ON exam_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages exam events" ON exam_events FOR ALL USING (auth_role() = 'admin');

-- TIMETABLES
CREATE POLICY "All authenticated view timetables" ON timetables FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages timetables" ON timetables FOR ALL USING (auth_role() = 'admin');

-- ATTENDANCE
CREATE POLICY "Teacher manages attendance" ON attendance FOR ALL USING (
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR auth_role() = 'admin'
);
CREATE POLICY "Student views own attendance" ON attendance FOR SELECT USING (
  student_id = get_my_student_id()
);
CREATE POLICY "Parent views child attendance" ON attendance FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid()))
);
CREATE POLICY "Admin views all attendance" ON attendance FOR SELECT USING (auth_role() = 'admin');

-- ASSIGNMENTS
CREATE POLICY "Teacher manages own assignments" ON assignments FOR ALL USING (
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR auth_role() = 'admin'
);
CREATE POLICY "Student views published assignments for class" ON assignments FOR SELECT USING (
  status = 'published' AND class_id = get_my_student_class_id()
);

-- SUBMISSIONS
CREATE POLICY "Student manages own submissions" ON submissions FOR ALL USING (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Teacher views submissions for their assignments" ON submissions FOR SELECT USING (
  assignment_id IN (SELECT id FROM assignments WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()))
);
CREATE POLICY "Teacher updates submissions" ON submissions FOR UPDATE USING (
  assignment_id IN (SELECT id FROM assignments WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()))
);
CREATE POLICY "Admin views all submissions" ON submissions FOR SELECT USING (auth_role() = 'admin');

-- ANNOTATIONS
CREATE POLICY "Teacher manages annotations" ON annotations FOR ALL USING (
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR auth_role() = 'admin'
);
CREATE POLICY "Student views own annotations" ON annotations FOR SELECT USING (
  submission_id IN (SELECT id FROM submissions WHERE student_id = (SELECT id FROM students WHERE user_id = auth.uid()))
);

-- QUIZZES
CREATE POLICY "Teacher manages own quizzes" ON quizzes FOR ALL USING (
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR auth_role() = 'admin'
);
CREATE POLICY "Student views published quizzes for class" ON quizzes FOR SELECT USING (
  is_published = TRUE AND class_id = get_my_student_class_id()
);

-- QUIZ ATTEMPTS
CREATE POLICY "Student manages own attempts" ON quiz_attempts FOR ALL USING (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Teacher views attempts for their quizzes" ON quiz_attempts FOR SELECT USING (
  quiz_id IN (SELECT id FROM quizzes WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()))
);
CREATE POLICY "Admin views all attempts" ON quiz_attempts FOR SELECT USING (auth_role() = 'admin');

-- PAYMENTS
CREATE POLICY "Admin manages payments" ON payments FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Student views own payments" ON payments FOR SELECT USING (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Parent views child payments" ON payments FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid()))
);

-- NOTIFICATIONS
CREATE POLICY "User views own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "User updates own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admin manages all notifications" ON notifications FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "System inserts notifications" ON notifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Teacher inserts notifications" ON notifications FOR INSERT WITH CHECK (auth_role() IN ('teacher', 'admin'));

-- EXAM MARKS
CREATE POLICY "Teacher manages own exam marks" ON exam_marks FOR ALL USING (
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR auth_role() = 'admin'
);
CREATE POLICY "Student views own exam marks" ON exam_marks FOR SELECT USING (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Admin views all exam marks" ON exam_marks FOR SELECT USING (auth_role() = 'admin');

-- TRANSCRIPTS
CREATE POLICY "Admin manages transcripts" ON transcripts FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Student views own published transcript" ON transcripts FOR SELECT USING (
  is_published = TRUE AND student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Parent views child published transcripts" ON transcripts FOR SELECT USING (
  is_published = TRUE AND student_id IN (SELECT id FROM students WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid()))
);

-- TRANSCRIPT CONFIG
CREATE POLICY "All can view transcript config" ON transcript_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages transcript config" ON transcript_config FOR ALL USING (auth_role() = 'admin');

-- SCHEMES OF WORK
CREATE POLICY "Teacher manages own schemes" ON schemes_of_work FOR ALL USING (
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR auth_role() = 'admin'
);
CREATE POLICY "Shared schemes visible to teachers" ON schemes_of_work FOR SELECT USING (
  auth.uid()::TEXT = ANY(shared_with::TEXT[]) OR auth_role() = 'admin' OR is_published = TRUE
);

-- RESOURCES
CREATE POLICY "Teacher manages own resources" ON resources FOR ALL USING (
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR auth_role() = 'admin'
);
CREATE POLICY "Students view resources for their class" ON resources FOR SELECT USING (
  class_id = get_my_student_class_id()
);

-- CERTIFICATES
CREATE POLICY "Admin manages certificates" ON certificates FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "Student views own certificate" ON certificates FOR SELECT USING (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Parent views child certificates" ON certificates FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid()))
);

-- STUDENT PERFORMANCE ENTRIES
CREATE POLICY "Student manages own entries" ON student_performance_entries FOR ALL USING (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Parent views child entries" ON student_performance_entries FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid()))
);
CREATE POLICY "Admin views all entries" ON student_performance_entries FOR SELECT USING (auth_role() = 'admin');

-- TEACHER ASSIGNMENTS (viewing)
CREATE POLICY "All can view teacher assignments" ON teacher_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages teacher assignments" ON teacher_assignments FOR ALL USING (auth_role() = 'admin');

-- TEACHER PREFS
CREATE POLICY "Teacher manages own prefs" ON teacher_curriculum_prefs FOR ALL USING (
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR auth_role() = 'admin'
);
CREATE POLICY "Teacher manages own class prefs" ON teacher_class_prefs FOR ALL USING (
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR auth_role() = 'admin'
);
CREATE POLICY "Teacher manages own subject prefs" ON teacher_subject_prefs FOR ALL USING (
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR auth_role() = 'admin'
);
CREATE POLICY "Admin views teacher prefs" ON teacher_curriculum_prefs FOR SELECT USING (auth_role() = 'admin');
CREATE POLICY "Admin views teacher class prefs" ON teacher_class_prefs FOR SELECT USING (auth_role() = 'admin');
CREATE POLICY "Admin views teacher subject prefs" ON teacher_subject_prefs FOR SELECT USING (auth_role() = 'admin');

-- GRADING SYSTEMS
CREATE POLICY "All can view grading systems" ON grading_systems FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages grading systems" ON grading_systems FOR ALL USING (auth_role() = 'admin');

-- STUDENT SUBJECTS
CREATE POLICY "Student manages own subjects" ON student_subjects FOR ALL USING (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid()) OR auth_role() IN ('admin', 'teacher')
);
CREATE POLICY "Teacher views student subjects" ON student_subjects FOR SELECT USING (auth_role() IN ('teacher','admin'));

-- STUDENT EVENT REGISTRATIONS
CREATE POLICY "Student manages own registrations" ON student_event_registrations FOR ALL USING (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid()) OR auth_role() = 'admin'
);
CREATE POLICY "Teacher views registrations" ON student_event_registrations FOR SELECT USING (auth_role() IN ('teacher','admin'));

-- ============================================================
-- INITIAL DATA: Insert default transcript config
-- ============================================================
INSERT INTO transcript_config (school_name, watermark_text) VALUES ('Peak Performance Tutoring', 'PEAK PERFORMANCE TUTORING')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ENABLE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE transcripts;
