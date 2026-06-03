-- ============================================================
-- Peak Performance Tutoring - Full Database Restore
-- Generated from supabase/migrations on 2026-06-02T14:03:11.437Z
--
-- Run this in a brand-new Supabase project's SQL editor.
-- It excludes the destructive migration:
--   20260330_delete_all_assignments_and_quests.sql
-- ============================================================

-- ============================================================
-- BEGIN MIGRATION: 001_schema.sql
-- ============================================================
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
  audience TEXT NOT NULL DEFAULT 'class' CHECK (audience IN ('all_classes', 'class', 'class_subject')),
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
-- END MIGRATION: 001_schema.sql

-- ============================================================
-- BEGIN MIGRATION: 20240316_worksheet_engine.sql
-- ============================================================
-- Worksheet Builder & Assessment Engine Migration

-- 1. Extend Assignments Table for JSONB Worksheets
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS worksheet JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS passage TEXT,
ADD COLUMN IF NOT EXISTS passage_type TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS total_marks INTEGER,
ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_timer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS time_limit INTEGER;

-- 2. Extend Submissions Table for Worksheet Answers and Annotations
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS worksheet_answers JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS question_marks JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS annotations JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS time_taken INTEGER;

-- 3. Create Worksheet Templates (Optional but recommended for reuse)
CREATE TABLE IF NOT EXISTS worksheet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id),
  created_by UUID REFERENCES profiles(id),
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  passage TEXT,
  passage_type TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS on Templates
ALTER TABLE worksheet_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own templates" 
ON worksheet_templates FOR ALL 
USING (auth.uid() = created_by);

CREATE POLICY "Public templates are viewable by all teachers"
ON worksheet_templates FOR SELECT
USING (true);

-- 5. Comments for documentation
COMMENT ON COLUMN assignments.worksheet IS 'Array of WorksheetBlock objects';
COMMENT ON COLUMN submissions.worksheet_answers IS 'Map of block_id to student answer';
COMMENT ON COLUMN submissions.question_marks IS 'Map of block_id to awarded marks (auto or manual)';
COMMENT ON COLUMN submissions.annotations IS 'Fabric.js JSON for teacher grading notes';
-- END MIGRATION: 20240316_worksheet_engine.sql

-- ============================================================
-- BEGIN MIGRATION: 20240319_gamification.sql
-- ============================================================
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_xp_at DATE,
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_at DATE;

COMMENT ON COLUMN students.xp IS 'Cumulative experience points earned by the student';
COMMENT ON COLUMN students.last_login_xp_at IS 'The last date the student received a login XP bonus';
COMMENT ON COLUMN students.streak_count IS 'Number of consecutive days the student has been active';
COMMENT ON COLUMN students.last_active_at IS 'The last date the student was active';
-- END MIGRATION: 20240319_gamification.sql

-- ============================================================
-- BEGIN MIGRATION: 20240319_quiz_rls_fix.sql
-- ============================================================
-- Quiz RLS Fix: Ensure teachers can manage their quizzes and students can view assigned quizzes
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- 1. Teacher Management Policy
DROP POLICY IF EXISTS "Teacher manages own quizzes" ON quizzes;
CREATE POLICY "Teacher manages own quizzes" ON quizzes FOR ALL USING (
  teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR auth_role() = 'admin'
);

-- 2. Student View Policy
DROP POLICY IF EXISTS "Students view assigned quizzes" ON quizzes;
CREATE POLICY "Students view assigned quizzes" ON quizzes FOR SELECT USING (
  is_published = TRUE AND (
    audience = 'all_classes' OR 
    (audience = 'class' AND class_id = (SELECT class_id FROM students WHERE user_id = auth.uid())) OR
    (audience = 'class_subject' AND class_id = (SELECT class_id FROM students WHERE user_id = auth.uid()))
  )
);

-- 3. Public View (if needed by Admin)
DROP POLICY IF EXISTS "Admin views all quizzes" ON quizzes;
CREATE POLICY "Admin views all quizzes" ON quizzes FOR SELECT USING (auth_role() = 'admin');
-- END MIGRATION: 20240319_quiz_rls_fix.sql

-- ============================================================
-- BEGIN MIGRATION: 20240319_quiz_schema_fix.sql
-- ============================================================
-- Add missing columns to quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS instructions TEXT,
ADD COLUMN IF NOT EXISTS time_limit INTEGER;

-- Ensure passing_score logic is aligned (we use pass_mark_percentage in schema logic)
-- No changes needed if we just map in frontend, but good to have the column for clarity if needed.
-- But since pass_mark_percentage is already there, we will just use it.

COMMENT ON COLUMN quizzes.instructions IS 'Special rules or guidelines for the quiz';
COMMENT ON COLUMN quizzes.time_limit IS 'Time limit in minutes (replaces or supplements duration_minutes)';
-- END MIGRATION: 20240319_quiz_schema_fix.sql

-- ============================================================
-- BEGIN MIGRATION: 20240319_quiz_visibility_final_fix.sql
-- ============================================================
-- Final Quiz Visibility Fix
-- Sets default is_published to TRUE and simplifies student RLS

-- 1. Update existing quizzes that were likely saved as false by mistake
UPDATE quizzes SET is_published = TRUE WHERE is_published = FALSE;

-- 2. Ensure future quizzes default to TRUE
ALTER TABLE quizzes ALTER COLUMN is_published SET DEFAULT TRUE;

-- 3. Simplify Student RLS Policy for reliability
DROP POLICY IF EXISTS "Students view assigned quizzes" ON quizzes;

CREATE POLICY "Students view assigned quizzes" ON quizzes FOR SELECT USING (
  is_published = TRUE AND (
    audience = 'all_classes' OR 
    class_id IN (SELECT class_id FROM students WHERE user_id = auth.uid())
  )
);
-- END MIGRATION: 20240319_quiz_visibility_final_fix.sql

-- ============================================================
-- BEGIN MIGRATION: 20240319_subject_curriculum_leaderboard.sql
-- ============================================================
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
-- END MIGRATION: 20240319_subject_curriculum_leaderboard.sql

-- ============================================================
-- BEGIN MIGRATION: 20240322_parent_settings_fields.sql
-- ============================================================
-- Add missing fields to parents table for settings
ALTER TABLE parents 
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS home_address TEXT,
ADD COLUMN IF NOT EXISTS mpesa_push_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES';
-- END MIGRATION: 20240322_parent_settings_fields.sql

-- ============================================================
-- BEGIN MIGRATION: 20240322_parent_student_links.sql
-- ============================================================
-- Create many-to-many parent-student link table
CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- Enable RLS
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- Helper to get current parent ID
CREATE OR REPLACE FUNCTION get_my_parent_id() RETURNS UUID AS $$
  SELECT id FROM parents WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies
DROP POLICY IF EXISTS "Parents can view own links" ON parent_student_links;
CREATE POLICY "Parents can view own links" 
ON parent_student_links FOR SELECT 
USING (parent_id = get_my_parent_id());

DROP POLICY IF EXISTS "Parents can insert own links" ON parent_student_links;
CREATE POLICY "Parents can insert own links" 
ON parent_student_links FOR INSERT 
WITH CHECK (parent_id = get_my_parent_id());

DROP POLICY IF EXISTS "Parents can update own links" ON parent_student_links;
CREATE POLICY "Parents can update own links" 
ON parent_student_links FOR UPDATE
USING (parent_id = get_my_parent_id());

DROP POLICY IF EXISTS "Admins can manage all links" ON parent_student_links;
CREATE POLICY "Admins can manage all links" 
ON parent_student_links FOR ALL 
USING ((auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin');

-- Also add a policy for students to view their parents
-- Also allow parents to update the student record with their parent_id
-- but only if the student is not already linked to someone else
DROP POLICY IF EXISTS "Parents can link to unlinked students" ON students;
CREATE POLICY "Parents can link to unlinked students"
ON students FOR UPDATE
USING (parent_id IS NULL)
WITH CHECK (parent_id = get_my_parent_id());

-- To allow parents to view students they are linking (needed for the search step)
-- This is already mostly covered by existing policies but let's be explicit
DROP POLICY IF EXISTS "Parents can search for any student" ON students;
CREATE POLICY "Parents can search for any student"
ON students FOR SELECT
USING (auth_role() = 'parent');
-- END MIGRATION: 20240322_parent_student_links.sql

-- ============================================================
-- BEGIN MIGRATION: 20240418_teacher_ai_system.sql
-- ============================================================
-- Create the AI Jobs table
CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  raw_prompt TEXT NOT NULL,
  intent_type TEXT CHECK (intent_type IN ('assignment', 'quiz', 'trivia', 'resource')),
  parsed_output JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'scheduled')),
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for teachers
CREATE POLICY "Teachers can view their own AI jobs"
ON ai_jobs FOR SELECT
TO authenticated
USING (
  teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can create their own AI jobs"
ON ai_jobs FOR INSERT
TO authenticated
WITH CHECK (
  teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can update their own AI jobs"
ON ai_jobs FOR UPDATE
TO authenticated
USING (
  teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ai_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_jobs_updated_at_trigger
BEFORE UPDATE ON ai_jobs
FOR EACH ROW
EXECUTE FUNCTION update_ai_jobs_updated_at();
-- END MIGRATION: 20240418_teacher_ai_system.sql

-- ============================================================
-- BEGIN MIGRATION: 20260316_quiz_engine_v2.sql
-- ============================================================
-- Quiz Engine V2 Enhancement Migration
-- Date: 2026-03-16

-- 1. Enhance Quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS total_marks NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS retake_delay_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pass_mark_percentage NUMERIC(5,2) DEFAULT 50,
ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'class' CHECK (audience IN ('all_classes', 'class', 'class_subject')),
ADD COLUMN IF NOT EXISTS target_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Support all_classes by making class_id nullable
ALTER TABLE quizzes ALTER COLUMN class_id DROP NOT NULL;

-- 2. Enhance Quiz Attempts to support retakes and tracking
-- First, handle unique constraint that might block multiple attempts
ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_quiz_id_student_id_key;

ALTER TABLE quiz_attempts 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('in_progress', 'submitted')),
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS result TEXT CHECK (result IN ('pass', 'fail', 'pending')),
ADD COLUMN IF NOT EXISTS grading_details JSONB DEFAULT '{}';

-- 3. Create Ranking Functions for real-time performance

-- Level 1: Class Ranking Function
CREATE OR REPLACE FUNCTION get_class_quiz_ranking(p_quiz_id UUID, p_class_id UUID)
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    score NUMERIC,
    percentage NUMERIC,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_attempts AS (
        -- For ranking, we take the best attempt if best_attempt_policy is true, 
        -- but spec says "ORDER BY score DESC" usually implies taking the top score.
        SELECT DISTINCT ON (student_id)
            qa.student_id,
            qa.score,
            qa.percentage
        FROM quiz_attempts qa
        WHERE qa.quiz_id = p_quiz_id
        ORDER BY qa.student_id, qa.score DESC, qa.completed_at DESC
    )
    SELECT 
        s.id as student_id,
        s.full_name,
        la.score,
        la.percentage,
        DENSE_RANK() OVER (ORDER BY la.score DESC) as rank
    FROM students s
    JOIN latest_attempts la ON la.student_id = s.id
    WHERE s.class_id = p_class_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Level 2: Subject Ranking Across All Classes
CREATE OR REPLACE FUNCTION get_subject_ranking(p_subject_id UUID)
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    avg_score NUMERIC,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as student_id,
        s.full_name,
        AVG(qa.percentage)::NUMERIC as avg_score,
        DENSE_RANK() OVER (ORDER BY AVG(qa.percentage) DESC) as rank
    FROM students s
    JOIN quiz_attempts qa ON qa.student_id = s.id
    JOIN quizzes q ON q.id = qa.quiz_id
    WHERE q.subject_id = p_subject_id
    GROUP BY s.id, s.full_name
    ORDER BY avg_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Level 3: Overall Performance Ranking
CREATE OR REPLACE FUNCTION get_overall_performance_ranking()
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    overall_avg_score NUMERIC,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as student_id,
        s.full_name,
        AVG(qa.percentage)::NUMERIC as overall_avg_score,
        DENSE_RANK() OVER (ORDER BY AVG(qa.percentage) DESC) as rank
    FROM students s
    JOIN quiz_attempts qa ON qa.student_id = s.id
    GROUP BY s.id, s.full_name
    ORDER BY overall_avg_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS for new functionality
-- Ensure students can view their own attempts and teachers can view attempts for their quizzes
-- (Existing policies might already cover some of this, but adding specific ones for 'in_progress' status)

DROP POLICY IF EXISTS "Students manage own attempts" ON quiz_attempts;
CREATE POLICY "Student manage own attempts" ON quiz_attempts FOR ALL USING (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Teacher views attempts for their quizzes" ON quiz_attempts;
CREATE POLICY "Teacher views attempts for their quizzes" ON quiz_attempts FOR SELECT USING (
  quiz_id IN (SELECT id FROM quizzes WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()))
  OR auth_role() = 'admin'
);
-- END MIGRATION: 20260316_quiz_engine_v2.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_admin_rescue_rls.sql
-- ============================================================
-- ADMIN RESCUE: UNLOCK CORE TABLES
-- This script aggressively resets RLS for tables that were missed in previous rescue attempts.

-- 1. Disable RLS temporarily
ALTER TABLE curriculums DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_events DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing SELECT policies to ensure a clean slate
DROP POLICY IF EXISTS "Anyone can view curriculums" ON curriculums;
DROP POLICY IF EXISTS "Anyone can view classes" ON classes;
DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
DROP POLICY IF EXISTS "All authenticated can view tuition events" ON tuition_events;

-- 3. Re-enable RLS
ALTER TABLE curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_events ENABLE ROW LEVEL SECURITY;

-- 4. Create ULTRA-SIMPLE FLAT policies (No subqueries)
CREATE POLICY "curriculums_free_read" ON curriculums FOR SELECT USING (TRUE);
CREATE POLICY "classes_free_read" ON classes FOR SELECT USING (TRUE);
CREATE POLICY "subjects_free_read" ON subjects FOR SELECT USING (TRUE);
CREATE POLICY "tuition_events_free_read" ON tuition_events FOR SELECT USING (TRUE);

-- 5. Ensure admin has full power bypass using JWT only
CREATE POLICY "admin_all_curriculums" ON curriculums FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_all_classes" ON classes FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_all_subjects" ON subjects FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_all_tuition_events" ON tuition_events FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 6. Final safety: Refresh schema cache
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260317_admin_rescue_rls.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_emergency_repair.sql
-- ============================================================
-- PEAK PERFORMANCE EMERGENCY DB REPAIR
-- This script aggressively resets RLS to stop hangs.

-- 1. Disable RLS temporarily to ensure we can fix things without being blocked
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;

-- 2. Drop any recursive policies
DROP POLICY IF EXISTS "Admin views all students" ON students;
DROP POLICY IF EXISTS "Teacher views class students" ON students;
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
DROP POLICY IF EXISTS "Teacher views own record" ON teachers;
DROP POLICY IF EXISTS "Admin views all teachers" ON teachers;
DROP POLICY IF EXISTS "All can view teachers" ON teachers;

-- 3. Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- 4. Create FLAT policies (No subqueries, just JWT metadata checks)
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR id = auth.uid());
CREATE POLICY "students_select_admin" ON students FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR user_id = auth.uid());
CREATE POLICY "teachers_select_admin" ON teachers FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR user_id = auth.uid());
CREATE POLICY "assignments_select_all" ON teacher_assignments FOR SELECT USING (TRUE); -- Fast read

-- 5. Give Admin full power bypass
CREATE POLICY "admin_all_profiles" ON profiles FOR ALL TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_all_students" ON students FOR ALL TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "admin_all_teachers" ON teachers FOR ALL TO authenticated USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 6. Re-optimize the helper functions with explicit search paths
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_my_teacher_id() RETURNS UUID AS $$
  SELECT id FROM public.teachers WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_student_id() RETURNS UUID AS $$
  SELECT id FROM public.students WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
-- END MIGRATION: 20260317_emergency_repair.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_emergency_rls_fix.sql
-- ============================================================
-- EMERGENCY RLS SIMPLIFICATION & RECURSION BREAK
-- This migration replaces subqueries in policies with SECURITY DEFINER helpers

-- 1. Optimized Auth Role (JWT only)
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  -- Directly access the role from the JWT to avoid any DB lookups
  SELECT (COALESCE(auth.jwt() -> 'user_metadata', auth.jwt() -> 'app_metadata') ->> 'role')::text;
$$ LANGUAGE sql STABLE;

-- 2. Security Definer Helpers (Global search path for safety)
ALTER FUNCTION get_my_teacher_id() SET search_path = public;
ALTER FUNCTION get_my_student_id() SET search_path = public;
ALTER FUNCTION get_my_parent_id() SET search_path = public;

-- 3. Simplified Profiles RLS (Crucial for useAuth)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON profiles;
CREATE POLICY "Profiles view policy" ON profiles FOR SELECT USING (
  id = auth.uid() OR auth_role() = 'admin'
);

-- 4. Simplified Students RLS (Heavy subqueries replaced)
DROP POLICY IF EXISTS "Teacher views class students" ON students;
CREATE POLICY "Teacher views class students" ON students FOR SELECT USING (
  auth_role() = 'teacher' AND class_id IN (
    SELECT class_id FROM teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);

-- 5. Simplified Teachers RLS
DROP POLICY IF EXISTS "Admin views all teachers" ON teachers;
DROP POLICY IF EXISTS "All can view teachers" ON teachers;
CREATE POLICY "Teachers view policy" ON teachers FOR SELECT USING (
  user_id = auth.uid() OR auth_role() = 'admin' OR TRUE -- Temporary TRUE to break hang
);

-- 6. Simplified Assignments RLS
DROP POLICY IF EXISTS "Teacher manages own assignments" ON assignments;
CREATE POLICY "Teacher manages own assignments" ON assignments FOR ALL USING (
  teacher_id = get_my_teacher_id() OR auth_role() = 'admin'
);

-- 7. Simplified Attendance RLS
DROP POLICY IF EXISTS "Teacher manages attendance" ON attendance;
CREATE POLICY "Teacher manages attendance" ON attendance FOR ALL USING (
  teacher_id = get_my_teacher_id() OR auth_role() = 'admin'
);
-- END MIGRATION: 20260317_emergency_rls_fix.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_enhanced_exam_events.sql
-- ============================================================
-- ENHANCED EXAM EVENTS SYSTEM
-- Adds granular targeting, start/end dates, and expanded statuses.

-- 1. Add status column and new columns
ALTER TABLE exam_events 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS curriculum_id UUID REFERENCES curriculums(id),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS target_class_ids UUID[] DEFAULT '{}';

-- 1b. Ensure curriculum_id is nullable
ALTER TABLE exam_events ALTER COLUMN curriculum_id DROP NOT NULL;

-- 1c. Update status constraint with new values
ALTER TABLE exam_events DROP CONSTRAINT IF EXISTS exam_events_status_check;
ALTER TABLE exam_events 
ADD CONSTRAINT exam_events_status_check 
CHECK (status IN ('upcoming', 'active', 'closed', 'cancelled', 'ended', 'generated', 'published'));

-- 2. RLS Refresh (Admin manages all, but ensuring selection is open for filtering)
-- Existing policies:
-- "All authenticated can view exam events" ON exam_events FOR SELECT USING (auth.uid() IS NOT NULL);
-- "Admin manages exam events" ON exam_events FOR ALL USING (auth_role() = 'admin');

-- Refresh schema for PostgREST
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260317_enhanced_exam_events.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_final_rescue_rls.sql
-- ============================================================
-- FINAL RESCUE: ULTRA-SIMPLE RLS
-- This script removes all complexity to rule out recursion.

-- 1. Profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles view policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_allow_all_read" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_allow_own_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- 2. Teachers
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers view policy" ON teachers;
DROP POLICY IF EXISTS "teachers_select_admin" ON teachers;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teachers_allow_all_read" ON teachers FOR SELECT USING (TRUE);
CREATE POLICY "teachers_allow_admin_all" ON teachers FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 3. Students
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teacher views class students" ON students;
DROP POLICY IF EXISTS "students_select_admin" ON students;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_allow_all_read" ON students FOR SELECT USING (TRUE);

-- 4. Clean up functions (optional but good for stability)
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
-- END MIGRATION: 20260317_final_rescue_rls.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_fix_rls_recursion_v2.sql
-- ============================================================
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

-- update students policies
DROP POLICY IF EXISTS "Teacher views class students" ON students;
CREATE POLICY "Teacher views class students" ON students FOR SELECT USING (
  auth_role() = 'teacher' AND class_id IN (
    SELECT class_id FROM teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);

DROP POLICY IF EXISTS "Parent views linked students" ON students;
CREATE POLICY "Parent views linked students" ON students FOR SELECT USING (
  parent_id = get_my_parent_id()
);

-- update parents policies
DROP POLICY IF EXISTS "Student can view linked parent" ON parents;
CREATE POLICY "Student can view linked parent" ON parents FOR SELECT USING (
  id = get_my_student_parent_id()
);

-- update quizzes policies
DROP POLICY IF EXISTS "Student views published quizzes for class" ON quizzes;
CREATE POLICY "Student views published quizzes for class" ON quizzes FOR SELECT USING (
  is_published = TRUE AND class_id = get_my_student_class_id()
);

-- update assignments policies
DROP POLICY IF EXISTS "Student views published assignments for class" ON assignments;
CREATE POLICY "Student views published assignments for class" ON assignments FOR SELECT USING (
  status = 'published' AND class_id = get_my_student_class_id()
);

-- update attendance policies
DROP POLICY IF EXISTS "Student views own attendance" ON attendance;
CREATE POLICY "Student views own attendance" ON attendance FOR SELECT USING (
  student_id = get_my_student_id()
);

-- update resources policies
DROP POLICY IF EXISTS "Students view resources for their class" ON resources;
CREATE POLICY "Students view resources for their class" ON resources FOR SELECT USING (
  class_id = get_my_student_class_id()
);
-- END MIGRATION: 20260317_fix_rls_recursion_v2.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_fix_rls_recursion.sql
-- ============================================================
-- Fix for RLS Recursion causing infinite loading
-- This migration rewrites auth_role() to pull from JWT metadata instead of a table query

CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text;
$$ LANGUAGE sql STABLE;

-- Ensure RLS doesn't block legitimate admin access during debugging
-- Granting certain permissions explicitly if role is found in JWT
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- Notify that the fix has been applied
COMMENT ON FUNCTION auth_role() IS 'Returns the user role from JWT metadata to prevent RLS recursion.';
-- END MIGRATION: 20260317_fix_rls_recursion.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_fix_self_reg_rls.sql
-- ============================================================
-- Allow self-registration for teachers and parents
CREATE POLICY "Anyone can register as a teacher" ON teachers FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can register as a parent" ON parents FOR INSERT WITH CHECK (TRUE);

-- Ensure profiles can be created during signup
CREATE POLICY "Allow profile creation on signup" ON profiles FOR INSERT WITH CHECK (TRUE);

-- Optimization: sometimes SECURITY DEFINER functions need to be explicit about the search path
ALTER FUNCTION get_my_teacher_id() SET search_path = public;
ALTER FUNCTION get_my_student_id() SET search_path = public;
ALTER FUNCTION get_my_parent_id() SET search_path = public;
-- END MIGRATION: 20260317_fix_self_reg_rls.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_fix_subjects_columns.sql
-- ============================================================
-- Fix subjects table schema
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS category TEXT;

-- Make class_id nullable as subjects are often curriculum-wide
ALTER TABLE subjects ALTER COLUMN class_id DROP NOT NULL;

-- If you have a UNIQUE constraint on (class_id, name), we might need to update it 
-- but for now let's just ensure the columns exist.
-- END MIGRATION: 20260317_fix_subjects_columns.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_fix_teacher_teaching_map.sql
-- ============================================================
-- FIX: teacher_teaching_map schema
-- The original migration incorrectly referenced profiles(id) for teacher_id.
-- Teachers have their own UUID in the teachers table (not equal to profiles.id).
-- This migration drops and recreates the table with the correct foreign key.

-- Drop existing table (safe since onboarding hasn't worked yet)
DROP TABLE IF EXISTS teacher_teaching_map CASCADE;

-- Recreate with correct FK pointing to teachers(id)
CREATE TABLE teacher_teaching_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- Row Level Security
ALTER TABLE teacher_teaching_map ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own map (using teachers.user_id -> auth.uid())
DROP POLICY IF EXISTS "Teachers can manage own teaching map" ON teacher_teaching_map;
CREATE POLICY "Teachers can manage own teaching map"
ON teacher_teaching_map FOR ALL
USING (teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()));

-- Admins can view and manage all
DROP POLICY IF EXISTS "Admins can view all teaching maps" ON teacher_teaching_map;
CREATE POLICY "Admins can view all teaching maps"
ON teacher_teaching_map FOR ALL
USING (auth_role() = 'admin');

-- Grant permissions
GRANT ALL ON TABLE teacher_teaching_map TO authenticated;
GRANT ALL ON TABLE teacher_teaching_map TO service_role;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260317_fix_teacher_teaching_map.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_master_transcripts_infrastructure.sql
-- ============================================================
-- MASTER TRANSCRIPTS SYSTEM: Database Schema Enhancements
-- Adds lifecycle management and granular remarks capability.

-- 1. Enhance Exam Events with Status Lifecycle
ALTER TABLE exam_events 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'closed', 'generated', 'published'));

-- 2. Enhance Exam Marks with Teacher Remarks
ALTER TABLE exam_marks 
ADD COLUMN IF NOT EXISTS teacher_remark TEXT;

-- 3. Add Performance Summary to Transcripts (if not already handled via JSONB)
-- We'll explicitly add these to make querying easier for rankings/analytics
ALTER TABLE transcripts 
ADD COLUMN IF NOT EXISTS total_marks NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS average_score NUMERIC(10,2);

-- 4. Branding Snapshot in Transcripts
-- Captures the state of branding (school name, logos) at the moment of generation
ALTER TABLE transcripts
ADD COLUMN IF NOT EXISTS branding_snapshot JSONB DEFAULT '{}';

-- 5. RLS Policies for the new fields (Admins manage everything)
-- Existing policies should cover most, but ensuring Admin can update status
DROP POLICY IF EXISTS "Admin manages exam events" ON exam_events;
CREATE POLICY "Admin manages exam events" 
ON exam_events FOR ALL 
USING (auth_role() = 'admin');

-- Refresh schema for PostgREST
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260317_master_transcripts_infrastructure.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_rls_diagnostic_unlock.sql
-- ============================================================
-- DB DIAGNOSTICS: TOTAL READ UNLOCK (FIXED)
-- Run this in your Supabase SQL Editor

-- 1. Profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diagnostics_allow_all" ON profiles;
CREATE POLICY "diagnostics_allow_all" ON profiles FOR SELECT USING (TRUE);

-- 2. Students
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diagnostics_allow_all" ON students;
CREATE POLICY "diagnostics_allow_all" ON students FOR SELECT USING (TRUE);

-- 3. Teachers
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diagnostics_allow_all" ON teachers;
CREATE POLICY "diagnostics_allow_all" ON teachers FOR SELECT USING (TRUE);

-- 4. Tuition Events
ALTER TABLE tuition_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diagnostics_allow_all" ON tuition_events;
CREATE POLICY "diagnostics_allow_all" ON tuition_events FOR SELECT USING (TRUE);

-- 5. Force PostgREST to reload its schema cache (Fixes 406 Not Acceptable)
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260317_rls_diagnostic_unlock.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_sync_auth_metadata.sql
-- ============================================================
-- SQL to fix the Admin role and ensure it stays in sync with metadata
-- Run this in your Supabase SQL Editor

-- 1. Sync existing admin roles to Auth Metadata
DO $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      '"admin"'
    )
  WHERE id IN (SELECT id FROM profiles WHERE role = 'admin');
END $$;

-- 2. Create a trigger function to sync profile role changes to Auth Metadata
-- This ensures that next time you update a profile role, it syncs to the JWT
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

-- 3. Attach the trigger to the profiles table
DROP TRIGGER IF EXISTS trg_sync_role_to_metadata ON profiles;
CREATE TRIGGER trg_sync_role_to_metadata
AFTER UPDATE OF role ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_role_to_metadata();

-- 4. Re-verify auth_role function is correct
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION auth_role() IS 'Returns the user role from JWT metadata. Fast and prevents RLS recursion.';
-- END MIGRATION: 20260317_sync_auth_metadata.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_teacher_onboarding_v2.sql
-- ============================================================
-- TEACHER ONBOARDING SYSTEM V2
-- This migration updates the profiles table and creates a structured mapping for teacher preferences.

-- 1. Update Profiles Table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_onboarded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE;

-- 2. Create Teacher Teaching Mapping Table (Hierarchical: Subject -> Classes)
CREATE TABLE IF NOT EXISTS teacher_teaching_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- 3. Row Level Security
ALTER TABLE teacher_teaching_map ENABLE ROW LEVEL SECURITY;

-- 4. Policies for teacher_teaching_map
DROP POLICY IF EXISTS "Teachers can manage own teaching map" ON teacher_teaching_map;
CREATE POLICY "Teachers can manage own teaching map" 
ON teacher_teaching_map FOR ALL 
USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all teaching maps" ON teacher_teaching_map;
CREATE POLICY "Admins can view all teaching maps" 
ON teacher_teaching_map FOR SELECT 
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 5. Helper Function for cleaner auth role (Ensures consistency)
CREATE OR REPLACE FUNCTION auth_role() RETURNS TEXT AS $$
  SELECT (COALESCE(auth.jwt() -> 'user_metadata', auth.jwt() -> 'app_metadata') ->> 'role')::text;
$$ LANGUAGE sql STABLE;

-- 6. Grant Permissions
GRANT ALL ON TABLE teacher_teaching_map TO authenticated;
GRANT ALL ON TABLE teacher_teaching_map TO service_role;

-- 7. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260317_teacher_onboarding_v2.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_transcript_branding.sql
-- ============================================================
-- MASTER TRANSCRIPTS: Branding & Configuration Table

CREATE TABLE IF NOT EXISTS transcript_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_name TEXT NOT NULL DEFAULT 'Peak Performance Tutoring',
  logo_url TEXT,
  stamp_url TEXT,
  director_signature_url TEXT,
  director_name TEXT DEFAULT 'Director General',
  address_line_1 TEXT,
  address_line_2 TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Insert default row if not exists
INSERT INTO transcript_config (school_name) 
SELECT 'Peak Performance Tutoring'
WHERE NOT EXISTS (SELECT 1 FROM transcript_config LIMIT 1);

-- RLS
ALTER TABLE transcript_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for transcripts" 
ON transcript_config FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage config" 
ON transcript_config FOR ALL 
USING (auth_role() = 'admin');
-- END MIGRATION: 20260317_transcript_branding.sql

-- ============================================================
-- BEGIN MIGRATION: 20260317_worksheet_builder_v3.sql
-- ============================================================
-- 1. Create Worksheet Templates Table if not exists (Version 3)
CREATE TABLE IF NOT EXISTS worksheet_templates_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_marks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add layout_locked flag to assignments
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS layout_locked BOOLEAN DEFAULT true;

-- 3. Ensure passage linking support in assignments
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS linked_passages JSONB DEFAULT '[]'::jsonb;

-- 4. RLS for v3 templates
ALTER TABLE worksheet_templates_v3 ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can manage their own v3 templates') THEN
        CREATE POLICY "Teachers can manage their own v3 templates" 
        ON worksheet_templates_v3 FOR ALL 
        USING (auth.uid() = teacher_id);
    END IF;
END $$;
-- END MIGRATION: 20260317_worksheet_builder_v3.sql

-- ============================================================
-- BEGIN MIGRATION: 20260318_add_finalized_status.sql
-- ============================================================
-- ADD FINALIZED STATUS TO EXAM EVENTS
-- This adds the new "finalized" status that allows teachers to record marks while active/closed mean different things.

-- First drop existing constraint
ALTER TABLE exam_events DROP CONSTRAINT IF EXISTS exam_events_status_check;

-- Add updated constraint with 'finalized'
ALTER TABLE exam_events 
ADD CONSTRAINT exam_events_status_check 
CHECK (status IN ('upcoming', 'active', 'finalized', 'closed', 'cancelled', 'ended', 'generated', 'published'));

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260318_add_finalized_status.sql

-- ============================================================
-- BEGIN MIGRATION: 20260318_fix_teacher_registration.sql
-- ============================================================
-- FIX TEACHER REGISTRATION AND ONBOARDING
-- This migration ensures teachers can be invited by email or self-register without RLS errors.

-- 1. Make user_id nullable to support "Invite by Email" flow
ALTER TABLE teachers ALTER COLUMN user_id DROP NOT NULL;

-- 1b. Add UNIQUE constraint to email to allow upserting during registration
ALTER TABLE teachers ADD CONSTRAINT teachers_email_key UNIQUE (email);

-- 2. Ensure RLS is enabled
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- 3. DROP old restrictive policies if they exist (to be safe)
DROP POLICY IF EXISTS "Admin manages teachers" ON teachers;
DROP POLICY IF EXISTS "Teacher reviews own record" ON teachers;
DROP POLICY IF EXISTS "Teacher updates own record" ON teachers;
DROP POLICY IF EXISTS "teachers_select_admin" ON teachers;
DROP POLICY IF EXISTS "admin_all_teachers" ON teachers;
DROP POLICY IF EXISTS "teachers_view_own" ON teachers;
DROP POLICY IF EXISTS "teachers_insert_own" ON teachers;
DROP POLICY IF EXISTS "teachers_update_own" ON teachers;

-- 4. Create new comprehensive policies for TEACHERS table
-- Admin has full access
CREATE POLICY "admin_all_teachers" ON teachers FOR ALL TO authenticated 
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Teachers can view their own record
CREATE POLICY "teachers_view_own" ON teachers FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR email = auth.email());

-- Allow teachers to INSERT their own record during registration/onboarding
CREATE POLICY "teachers_insert_own" ON teachers FOR INSERT TO authenticated 
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher' 
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- Allow teachers to UPDATE their own record (to link user_id or update details)
CREATE POLICY "teachers_update_own" ON teachers FOR UPDATE TO authenticated 
  USING (user_id = auth.uid() OR (user_id IS NULL AND email = auth.email()))
  WITH CHECK (user_id = auth.uid());

-- 5. Fix RLS for teacher_teaching_map (Ensuring they use the right ID)
ALTER TABLE teacher_teaching_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers can manage own teaching map" ON teacher_teaching_map;
CREATE POLICY "Teachers can manage own teaching map" 
ON teacher_teaching_map FOR ALL 
TO authenticated
USING (
  teacher_id = auth.uid() OR 
  teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
);

-- 6. Add remarks column to exam_marks and update RLS
ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260318_fix_teacher_registration.sql

-- ============================================================
-- BEGIN MIGRATION: 20260318_remove_exam_date.sql
-- ============================================================
-- REMOVE EXAM_DATE AND ENFORCE START/END DATES

-- Temporarily copy any legacy exam_date values into start_date/end_date before tightening constraints
UPDATE exam_events 
SET 
  start_date = COALESCE(start_date, exam_date, CURRENT_DATE),
  end_date = COALESCE(end_date, exam_date, CURRENT_DATE)
WHERE start_date IS NULL OR end_date IS NULL;

-- Now drop the old exam_date
ALTER TABLE exam_events DROP COLUMN IF EXISTS exam_date;

-- Make start_date and end_date required fields
ALTER TABLE exam_events ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE exam_events ALTER COLUMN end_date SET NOT NULL;

-- Refresh cache
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260318_remove_exam_date.sql

-- ============================================================
-- BEGIN MIGRATION: 20260318_theme_preferences.sql
-- ============================================================
-- Add theme column to profiles table to store persistent theme preferences
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS theme VARCHAR(50) DEFAULT 'midnight-scholar';
-- END MIGRATION: 20260318_theme_preferences.sql

-- ============================================================
-- BEGIN MIGRATION: 20260318_tuition_events_status.sql
-- ============================================================
-- ADD STATUS TO TUITION EVENTS

-- Add status column
ALTER TABLE tuition_events ADD COLUMN status VARCHAR(20) DEFAULT 'upcoming';
-- Backfill existing data based on dates or is_active
UPDATE tuition_events 
SET status = CASE 
  WHEN is_active = true THEN 'active'
  WHEN end_date < CURRENT_DATE THEN 'ended'
  ELSE 'upcoming'
END;

-- Add constraint
ALTER TABLE tuition_events ADD CONSTRAINT tuition_events_status_check
CHECK (status IN ('upcoming', 'active', 'postponed', 'cancelled', 'ended'));

-- Add postponed_to column
ALTER TABLE tuition_events ADD COLUMN postponed_to DATE;

-- Since we are migrating from is_active boolean to a status enum,
-- we'll keep is_active for backward compatibility or we can drop it later.
-- We'll keep it for now but the UI will manage 'status' primarily.

NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260318_tuition_events_status.sql

-- ============================================================
-- BEGIN MIGRATION: 20260319_teacher_xp_rls.sql
-- ============================================================
-- Allow teachers to update student records (specifically needed to award XP)
-- We restrict this to students in classes the teacher is assigned to.

CREATE POLICY "Teacher updates mapped students" ON students
FOR UPDATE USING (
  auth_role() = 'teacher' AND class_id IN (
    SELECT class_id FROM teacher_assignments WHERE teacher_id = get_my_teacher_id()
  )
);
-- END MIGRATION: 20260319_teacher_xp_rls.sql

-- ============================================================
-- BEGIN MIGRATION: 20260319_timetable_publishing.sql
-- ============================================================
-- Add publishing workflow to timetables
ALTER TABLE timetables
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'published', 'unpublished'));

COMMENT ON COLUMN timetables.status IS 'Workflow state: draft (admin only), published (visible to students/teachers), unpublished (hidden)';

-- RLS: students can see published timetables for their class
DROP POLICY IF EXISTS "Student views published timetables for own class" ON timetables;
CREATE POLICY "Student views published timetables for own class" ON timetables
  FOR SELECT USING (
    status = 'published' AND class_id = get_my_student_class_id()
  );

-- RLS: teachers can see published timetables for classes they teach
DROP POLICY IF EXISTS "Teacher views published timetables for assigned classes" ON timetables;
CREATE POLICY "Teacher views published timetables for assigned classes" ON timetables
  FOR SELECT USING (
    status = 'published' AND class_id IN (
      SELECT class_id FROM teacher_assignments WHERE teacher_id = get_my_teacher_id()
    )
  );

-- RLS: admins see all
DROP POLICY IF EXISTS "Admin manages all timetables" ON timetables;
CREATE POLICY "Admin manages all timetables" ON timetables
  FOR ALL USING (auth_role() = 'admin');
-- END MIGRATION: 20260319_timetable_publishing.sql

-- ============================================================
-- BEGIN MIGRATION: 20260319_timetable_room_number.sql
-- ============================================================
-- Add room_number to timetables

ALTER TABLE timetables 
ADD COLUMN IF NOT EXISTS room_number TEXT;

COMMENT ON COLUMN timetables.room_number IS 'The physical or virtual room where the tuition session takes place';
-- END MIGRATION: 20260319_timetable_room_number.sql

-- ============================================================
-- BEGIN MIGRATION: 20260320_admin_signatures.sql
-- ============================================================
-- 20260320_admin_signatures: Extended fields for digital signatures and document functionality

-- 1. Updates to transcript_config for signature management
ALTER TABLE transcript_config 
ADD COLUMN IF NOT EXISTS signature_data TEXT, -- SVG or Base64 data
ADD COLUMN IF NOT EXISTS signature_type TEXT DEFAULT 'draw', -- 'draw' or 'type'
ADD COLUMN IF NOT EXISTS signature_font TEXT, -- CSS font family for typed signature
ADD COLUMN IF NOT EXISTS apply_transcripts BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS apply_certificates BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS apply_badges BOOLEAN DEFAULT FALSE;

-- 2. Updates to transcripts table for UI compatibility
ALTER TABLE transcripts
ADD COLUMN IF NOT EXISTS total_marks NUMERIC,
ADD COLUMN IF NOT EXISTS average_score NUMERIC,
ADD COLUMN IF NOT EXISTS branding_snapshot JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN transcript_config.signature_data IS 'Digital signature data (SVG recommended)';
-- END MIGRATION: 20260320_admin_signatures.sql

-- ============================================================
-- BEGIN MIGRATION: 20260320_avatars_bucket.sql
-- ============================================================
-- Ensure avatars storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for avatars bucket
-- Allow public access to view avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." 
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
DROP POLICY IF EXISTS "Users can upload their own avatar." ON storage.objects;
CREATE POLICY "Users can upload their own avatar." 
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);

-- Allow users to update their own avatar
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
CREATE POLICY "Users can update their own avatar." 
ON storage.objects FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
);
-- END MIGRATION: 20260320_avatars_bucket.sql

-- ============================================================
-- BEGIN MIGRATION: 20260320_grading_system_v2.sql
-- ============================================================
-- Grading System V2 Infrastructure
-- Supports relational grading scales and CBC standards.

-- 1. Drop the legacy grading systems table
-- WARNING: This clears old grading configurations to ensure a clean migration 
-- to the new structured system.
DROP TABLE IF EXISTS grading_systems CASCADE;

-- 2. Create the new grading_systems table
CREATE TABLE grading_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(curriculum_id, subject_id, class_id, name)
);

-- 3. Create the grading_scales table
CREATE TABLE grading_scales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grading_system_id UUID NOT NULL REFERENCES grading_systems(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  min_score NUMERIC(5,2) NOT NULL,
  max_score NUMERIC(5,2) NOT NULL,
  points INTEGER,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT score_range_check CHECK (min_score <= max_score)
);

-- 4. Enable RLS
ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS Policies
CREATE POLICY "All can view grading systems" ON grading_systems FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages grading systems" ON grading_systems FOR ALL USING (auth_role() = 'admin');

CREATE POLICY "All can view grading scales" ON grading_scales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages grading scales" ON grading_scales FOR ALL USING (auth_role() = 'admin');

-- 6. Indexes for performance
CREATE INDEX idx_gs_curriculum ON grading_systems(curriculum_id);
CREATE INDEX idx_gs_subject ON grading_systems(subject_id);
CREATE INDEX idx_scales_system ON grading_scales(grading_system_id);

-- Refresh schema
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260320_grading_system_v2.sql

-- ============================================================
-- BEGIN MIGRATION: 20260320_quiz_cumulative_rankings.sql
-- ============================================================
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
-- END MIGRATION: 20260320_quiz_cumulative_rankings.sql

-- ============================================================
-- BEGIN MIGRATION: 20260320_quiz_scheduling.sql
-- ============================================================
-- Add publish_at column for scheduled publishing
ALTER TABLE quizzes 
ADD COLUMN publish_at TIMESTAMPTZ;

-- Note: is_published still defaults to TRUE. 
-- However, our read logic on the frontend will now also respect publish_at.
-- If publish_at is set, it will only be visible to students if publish_at <= NOW().
-- END MIGRATION: 20260320_quiz_scheduling.sql

-- ============================================================
-- BEGIN MIGRATION: 20260321_parent_record_recovery.sql
-- ============================================================
-- ============================================================
-- Parent Record Recovery & Auto-Creation
-- ============================================================

ALTER TABLE parents ADD COLUMN IF NOT EXISTS security_pin TEXT;

-- 1. Function to auto-create a parent record from a profile
CREATE OR REPLACE FUNCTION handle_parent_record_sync()
RETURNS TRIGGER AS $$
DECLARE
    new_parent_code TEXT;
    new_pin TEXT;
BEGIN
    -- Only act if the role is 'parent'
    IF NEW.role = 'parent' THEN
        -- Check if parent record already exists
        IF NOT EXISTS (SELECT 1 FROM parents WHERE user_id = NEW.id) THEN
            -- Generate a unique parent code: PR-XXXXXX
            LOOP
                new_parent_code := 'PR-' || floor(random() * (999999 - 100000 + 1) + 100000)::text;
                EXIT WHEN NOT EXISTS (SELECT 1 FROM parents WHERE parent_code = new_parent_code);
            END LOOP;

            -- Generate a 4-digit security PIN
            new_pin := floor(random() * (9999 - 1000 + 1) + 1000)::text;

            -- Create the parent record
            INSERT INTO parents (user_id, parent_code, full_name, email, security_pin)
            VALUES (NEW.id, new_parent_code, NEW.full_name, NEW.email, new_pin);

            -- Create an initial notification for the parent with their PIN
            INSERT INTO notifications (user_id, title, body, type)
            VALUES (
                NEW.id, 
                'Welcome to Parent Portal', 
                'Your account is ready! Use your security PIN ' || new_pin || ' to link your students. This PIN is for one-time use.',
                'info'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger on profiles table to sync parent records
DROP TRIGGER IF EXISTS trg_sync_parent_record ON profiles;
CREATE TRIGGER trg_sync_parent_record
AFTER INSERT OR UPDATE OF role ON profiles
FOR EACH ROW
EXECUTE FUNCTION handle_parent_record_sync();

-- 3. Repair existing parent profiles that might be missing a parent record
DO $$
DECLARE
    r RECORD;
    new_parent_code TEXT;
    new_pin TEXT;
BEGIN
    FOR r IN SELECT id, full_name, email FROM profiles WHERE role = 'parent'
    LOOP
        IF NOT EXISTS (SELECT 1 FROM parents WHERE user_id = r.id) THEN
            -- Generate code
            LOOP
                new_parent_code := 'PR-' || floor(random() * (999999 - 100000 + 1) + 100000)::text;
                EXIT WHEN NOT EXISTS (SELECT 1 FROM parents WHERE parent_code = new_parent_code);
            END LOOP;

            -- Generate PIN
            new_pin := floor(random() * (9999 - 1000 + 1) + 1000)::text;

            -- Insert
            INSERT INTO parents (user_id, parent_code, full_name, email, security_pin)
            VALUES (r.id, new_parent_code, r.full_name, r.email, new_pin);

            -- Notify
            INSERT INTO notifications (user_id, title, body, type)
            VALUES (
                r.id, 
                'Parent Profile Recovered', 
                'We have recovered your parent profile information. Your one-time security PIN is ' || new_pin || '.',
                'info'
            );
        END IF;
    END LOOP;
END $$;
-- END MIGRATION: 20260321_parent_record_recovery.sql

-- ============================================================
-- BEGIN MIGRATION: 20260321_resource_bank_v2.sql
-- ============================================================
-- Add chapter and is_practice to resources table
-- Supports Resource Bank organization and specialized practice flows.

ALTER TABLE resources ADD COLUMN IF NOT EXISTS chapter TEXT DEFAULT 'General';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS is_practice BOOLEAN DEFAULT FALSE;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260321_resource_bank_v2.sql

-- ============================================================
-- BEGIN MIGRATION: 20260321_study_badges.sql
-- ============================================================
-- Study Badges & Achievements
-- Tracks earned badges for students (e.g., Weekly Mastery)

CREATE TABLE IF NOT EXISTS study_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL, -- e.g. 'weekly_mastery', 'consistency_king'
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE study_badges ENABLE ROW LEVEL SECURITY;

-- 1. Students can view their own badges
DROP POLICY IF EXISTS "Students view own badges" ON study_badges;
CREATE POLICY "Students view own badges" ON study_badges
  FOR SELECT USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

-- 2. Students can record their own badges
DROP POLICY IF EXISTS "Students record own badges" ON study_badges;
CREATE POLICY "Students record own badges" ON study_badges
  FOR INSERT WITH CHECK (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

-- 3. Parents can view their linked students' badges
DROP POLICY IF EXISTS "Parents view student badges" ON study_badges;
CREATE POLICY "Parents view student badges" ON study_badges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_links psl
      JOIN parents p ON psl.parent_id = p.id
      WHERE psl.student_id = study_badges.student_id
      AND p.user_id = auth.uid()
    )
  );

-- 4. Admins view all
DROP POLICY IF EXISTS "Admins manage all badges" ON study_badges;
CREATE POLICY "Admins manage all badges" ON study_badges
  FOR ALL USING (auth_role() = 'admin');

-- Add Index
CREATE INDEX IF NOT EXISTS idx_study_badges_student ON study_badges(student_id);

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260321_study_badges.sql

-- ============================================================
-- BEGIN MIGRATION: 20260321_study_infrastructure.sql
-- ============================================================
-- Study Timetable & Focus Mode Infrastructure
-- Supports age-adaptive goals, focus tracking, and reflections.

-- 1. Study Sessions (The core time blocks)
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT, -- Optional custom title if not subject-linked
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'skipped')),
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Study Goals (The structured objective/action/outcome/meaning model)
CREATE TABLE study_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  meaning TEXT NOT NULL,
  age_style TEXT NOT NULL CHECK (age_style IN ('exploration', 'skill_building', 'transition', 'mastery')),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Focus Logs (Detailed analytics for focus sessions)
CREATE TABLE focus_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  actual_focus_minutes INTEGER NOT NULL DEFAULT 0,
  interruption_count INTEGER NOT NULL DEFAULT 0,
  streak_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  focus_score NUMERIC(5,2) DEFAULT 0, -- 0 to 100 based on interruptions vs duration
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Study Reflections (Post-session growth tracking)
CREATE TABLE study_reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  completed_summary TEXT, -- What did I complete?
  learned_summary TEXT,   -- What did I learn?
  difficulty_summary TEXT, -- What was difficult?
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_reflections ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Study Sessions
CREATE POLICY "Students manage own study sessions" ON study_sessions 
  FOR ALL USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers view class study sessions" ON study_sessions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_assignments ta ON s.class_id = ta.class_id
      WHERE s.id = study_sessions.student_id 
      AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins view all study sessions" ON study_sessions FOR SELECT USING (auth_role() = 'admin');

-- Study Goals
CREATE POLICY "Students manage own study goals" ON study_goals 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM study_sessions WHERE id = study_goals.session_id AND student_id = (SELECT id FROM students WHERE user_id = auth.uid()))
  );

CREATE POLICY "Teachers view class study goals" ON study_goals 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN students s ON ss.student_id = s.id
      JOIN teacher_assignments ta ON s.class_id = ta.class_id
      WHERE ss.id = study_goals.session_id 
      AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- Focus Logs
CREATE POLICY "Students manage own focus logs" ON focus_logs 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM study_sessions WHERE id = focus_logs.session_id AND student_id = (SELECT id FROM students WHERE user_id = auth.uid()))
  );

CREATE POLICY "Teachers view class focus logs" ON focus_logs 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN students s ON ss.student_id = s.id
      JOIN teacher_assignments ta ON s.class_id = ta.class_id
      WHERE ss.id = focus_logs.session_id 
      AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- Study Reflections
CREATE POLICY "Students manage own study reflections" ON study_reflections 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM study_sessions WHERE id = study_reflections.session_id AND student_id = (SELECT id FROM students WHERE user_id = auth.uid()))
  );

CREATE POLICY "Teachers view class study reflections" ON study_reflections 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN students s ON ss.student_id = s.id
      JOIN teacher_assignments ta ON s.class_id = ta.class_id
      WHERE ss.id = study_reflections.session_id 
      AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- 7. Indexes
CREATE INDEX idx_study_sessions_student ON study_sessions(student_id);
CREATE INDEX idx_study_sessions_date ON study_sessions(date);
CREATE INDEX idx_study_goals_session ON study_goals(session_id);
CREATE INDEX idx_focus_logs_session ON focus_logs(session_id);
CREATE INDEX idx_study_reflections_session ON study_reflections(session_id);

-- 8. Add trigger for updated_at on study_sessions
CREATE TRIGGER trg_study_sessions_updated BEFORE UPDATE ON study_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260321_study_infrastructure.sql

-- ============================================================
-- BEGIN MIGRATION: 20260322_avatar_system.sql
-- ============================================================
-- Add avatar_metadata to profiles to support the Avatar Studio
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_metadata JSONB DEFAULT '{}'::jsonb;

-- Update RLS if needed (profiles is already editable by the user themselves)
-- Policy "Users update own profile" already exists and covers this column.

-- Add a column to study_goals to track if it's "achieved" (distinct from completed if needed, 
-- but I'll use is_completed which already exists)

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260322_avatar_system.sql

-- ============================================================
-- BEGIN MIGRATION: 20260322_grading_schema_repair.sql
-- ============================================================
-- Grading System Schema Repair & Reconciliation
-- Ensures that grading_systems and grading_scales are correctly structured.

-- 1. Ensure grading_systems exists with the correct columns
CREATE TABLE IF NOT EXISTS grading_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(curriculum_id, subject_id, class_id, name)
);

-- Add is_overall if it was missing from the initial migration
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='grading_systems' AND column_name='is_overall') THEN
    ALTER TABLE grading_systems ADD COLUMN is_overall BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 2. Ensure grading_scales exists
CREATE TABLE IF NOT EXISTS grading_scales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grading_system_id UUID NOT NULL REFERENCES grading_systems(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  min_score NUMERIC(5,2) NOT NULL,
  max_score NUMERIC(5,2) NOT NULL,
  points INTEGER,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT score_range_check CHECK (min_score <= max_score)
);

-- 3. Enable RLS
ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;

-- 4. Idempotent RLS Policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "All can view grading systems" ON grading_systems;
    DROP POLICY IF EXISTS "Admin manages grading systems" ON grading_systems;
    DROP POLICY IF EXISTS "All can view grading scales" ON grading_scales;
    DROP POLICY IF EXISTS "Admin manages grading scales" ON grading_scales;
END $$;

CREATE POLICY "All can view grading systems" ON grading_systems FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages grading systems" ON grading_systems FOR ALL USING (auth_role() = 'admin');

CREATE POLICY "All can view grading scales" ON grading_scales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages grading scales" ON grading_scales FOR ALL USING (auth_role() = 'admin');

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_gs_curriculum_v2 ON grading_systems(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_gs_subject_v2 ON grading_systems(subject_id);
CREATE INDEX IF NOT EXISTS idx_scales_system_v2 ON grading_scales(grading_system_id);

-- 6. Trigger for schema cache refresh
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260322_grading_schema_repair.sql

-- ============================================================
-- BEGIN MIGRATION: 20260322_multi_plan_support.sql
-- ============================================================
-- 1. Create study_plans table
CREATE TABLE study_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add plan_id to study_sessions
ALTER TABLE study_sessions ADD COLUMN plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE;

-- 3. Enable RLS on study_plans
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for study_plans
CREATE POLICY "Students manage own study plans" ON study_plans 
  FOR ALL USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Teachers view class study plans" ON study_plans 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_assignments ta ON s.class_id = ta.class_id
      WHERE s.id = study_plans.student_id 
      AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Parents view children's study plans" ON study_plans 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = study_plans.student_id 
      AND s.parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

-- 5. Helper function to ensure only one plan is active if needed (optional, keeping it flexible for now)
-- 6. Trigger for updated_at
CREATE TRIGGER trg_study_plans_updated BEFORE UPDATE ON study_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. Add Index
CREATE INDEX idx_study_sessions_plan ON study_sessions(plan_id);
CREATE INDEX idx_study_plans_student ON study_plans(student_id);

-- 8. Backfill existing sessions into a "Legacy Plan"
DO $$
DECLARE
    row_count integer;
    new_plan_id uuid;
    std_id uuid;
BEGIN
    FOR std_id IN SELECT DISTINCT student_id FROM study_sessions WHERE plan_id IS NULL LOOP
        INSERT INTO study_plans (student_id, name, start_date, end_date, is_active)
        VALUES (std_id, 'Legacy Roadmap', (SELECT MIN(date) FROM study_sessions WHERE student_id = std_id), (SELECT MAX(date) FROM study_sessions WHERE student_id = std_id), FALSE)
        RETURNING id INTO new_plan_id;

        UPDATE study_sessions SET plan_id = new_plan_id WHERE student_id = std_id AND plan_id IS NULL;
    END LOOP;
END $$;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260322_multi_plan_support.sql

-- ============================================================
-- BEGIN MIGRATION: 20260322_parent_study_access.sql
-- ============================================================
-- Enable Parents to view their linked students' study progress
-- Includes Study Sessions, Goals, Focus Logs, and Reflections

-- 1. Study Sessions
CREATE POLICY "Parents view student study sessions" ON study_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_links psl
      JOIN parents p ON psl.parent_id = p.id
      WHERE psl.student_id = study_sessions.student_id
      AND p.user_id = auth.uid()
    )
  );

-- 2. Study Goals
CREATE POLICY "Parents view student study goals" ON study_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN parent_student_links psl ON ss.student_id = psl.student_id
      JOIN parents p ON psl.parent_id = p.id
      WHERE ss.id = study_goals.session_id
      AND p.user_id = auth.uid()
    )
  );

-- 3. Focus Logs
CREATE POLICY "Parents view student focus logs" ON focus_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN parent_student_links psl ON ss.student_id = psl.student_id
      JOIN parents p ON psl.parent_id = p.id
      WHERE ss.id = focus_logs.session_id
      AND p.user_id = auth.uid()
    )
  );

-- 4. Study Reflections
CREATE POLICY "Parents view student study reflections" ON study_reflections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_sessions ss
      JOIN parent_student_links psl ON ss.student_id = psl.student_id
      JOIN parents p ON psl.parent_id = p.id
      WHERE ss.id = study_reflections.session_id
      AND p.user_id = auth.uid()
    )
  );

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260322_parent_study_access.sql

-- ============================================================
-- BEGIN MIGRATION: 20260323_grading_v3.sql
-- ============================================================
-- Grading System V3 Enhancements
-- 1. Add is_overall to grading_systems for transcript mean grade calculation
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS is_overall BOOLEAN DEFAULT false;

-- 2. Enhance exam_marks with grade and trace to the grading system used
ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS grading_system_id UUID REFERENCES grading_systems(id);

-- 3. Update existing marks (optional/best effort if needed, but usually marks are fresh)

-- 4. Re-enable RLS for safety (already enabled but good practice)
ALTER TABLE grading_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_marks ENABLE ROW LEVEL SECURITY;

-- 5. Refresh schema
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260323_grading_v3.sql

-- ============================================================
-- BEGIN MIGRATION: 20260324_grading_fix.sql
-- ============================================================
-- Grading System Schema Fix
-- Adds missing columns that were supposed to be in V2 but are missing in the current schema.

-- 1. Add class_id to grading_systems
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;

-- 2. Add is_default to grading_systems
ALTER TABLE grading_systems ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- 3. Add unique constraint to prevent duplicates for specific subject/class combinations
-- We'll use a unique index to handle existing duplicates if any (though unlikely if it was failing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gs_unique_combo ON grading_systems (curriculum_id, COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'), COALESCE(class_id, '00000000-0000-0000-0000-000000000000'), name);

-- 4. Refresh schema cache
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260324_grading_fix.sql

-- ============================================================
-- BEGIN MIGRATION: 20260324_parent_onboarded.sql
-- ============================================================
-- Add onboarded flag to parents table
ALTER TABLE parents ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT false;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260324_parent_onboarded.sql

-- ============================================================
-- BEGIN MIGRATION: 20260324_practice_questions.sql
-- ============================================================
-- Migration for Practice Questions System
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Practice Questions created by teachers
CREATE TABLE practice_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  content JSONB NOT NULL, -- Tiptap JSON or HTML content + metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_questions ENABLE ROW LEVEL SECURITY;

-- Topics: Read for all, manage by admins (or let teachers create topics?)
-- Usually it's better if teachers can create topics for their subjects
CREATE POLICY "Users can view topics" ON topics FOR SELECT USING (true);
CREATE POLICY "Teachers can insert topics" ON topics FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can update topics" ON topics FOR UPDATE USING (
  EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid())
);

-- Questions: Accessible by everyone, manageable by the teacher who created it
CREATE POLICY "Users can view practice questions" ON practice_questions FOR SELECT USING (true);
CREATE POLICY "Teachers can insert their own practice questions" ON practice_questions FOR INSERT WITH CHECK (
  teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can update their own practice questions" ON practice_questions FOR UPDATE USING (
  teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can delete their own practice questions" ON practice_questions FOR DELETE USING (
  teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
);
-- END MIGRATION: 20260324_practice_questions.sql

-- ============================================================
-- BEGIN MIGRATION: 20260324_transcript_enhanced.sql
-- ============================================================
-- Premium Transcript Enhancements
-- Adds fields for rankings and performance metrics to support luxury-grade transcripts.

-- 1. Add ranking and score fields to transcripts
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS total_marks NUMERIC(10,2);
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS average_score NUMERIC(10,2);
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS class_rank INTEGER;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS curriculum_rank INTEGER;

-- 2. Add an index for ranking lookups
CREATE INDEX IF NOT EXISTS idx_transcripts_ranks ON transcripts(exam_event_id, class_rank, curriculum_rank);

-- 3. Refresh schema cache
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260324_transcript_enhanced.sql

-- ============================================================
-- BEGIN MIGRATION: 20260324_transcripts_publish_notifications.sql
-- ============================================================
-- ============================================================
-- 1. RLS Policies: Allow parents/students to read published transcripts
-- ============================================================

-- Parents can view transcripts for their linked students if published
DROP POLICY IF EXISTS "Parents view published linked transcripts" ON transcripts;
CREATE POLICY "Parents view published linked transcripts" ON transcripts
FOR SELECT USING (
  is_published = true AND
  student_id IN (
    SELECT student_id FROM parent_student_links
    WHERE parent_id = get_my_parent_id()
  )
);

-- Students can view their own transcripts if published
DROP POLICY IF EXISTS "Students view own published transcripts" ON transcripts;
CREATE POLICY "Students view own published transcripts" ON transcripts
FOR SELECT USING (
  is_published = true AND
  student_id = get_my_student_id()
);

-- ============================================================
-- 2. Automated Notification Trigger for Transcript Publishing
-- ============================================================
CREATE OR REPLACE FUNCTION notify_transcript_published()
RETURNS TRIGGER AS $$
DECLARE
  v_student_user_id UUID;
  v_parent_user_id UUID;
  v_exam_name TEXT;
  v_student_name TEXT;
BEGIN
  -- Check if transcript just changed from draft to published
  IF NEW.is_published = true AND OLD.is_published = false THEN
    
    -- Get exam name safely
    SELECT name INTO v_exam_name FROM exam_events WHERE id = NEW.exam_event_id;
    
    -- Get student user_id and full name
    SELECT user_id, full_name INTO v_student_user_id, v_student_name FROM students WHERE id = NEW.student_id;
    
    -- 1. Insert notification for the student
    IF v_student_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, type, data)
      VALUES (
        v_student_user_id, 
        'New Transcript Available', 
        'Your official transcript for ' || COALESCE(v_exam_name, 'the recent exam') || ' has been published.', 
        'academic_update', 
        jsonb_build_object('transcript_id', NEW.id, 'link', '/student/transcripts/' || NEW.id)
      );
    END IF;

    -- 2. Insert notification for ALL linked parents
    FOR v_parent_user_id IN 
      SELECT p.user_id FROM parents p
      JOIN parent_student_links l ON p.id = l.parent_id
      WHERE l.student_id = NEW.student_id AND p.user_id IS NOT NULL
    LOOP
      INSERT INTO notifications (user_id, title, body, type, data)
      VALUES (
        v_parent_user_id, 
        'Transcript Published: ' || COALESCE(v_student_name, 'Student'), 
        'An official academic transcript for ' || COALESCE(v_student_name, 'your student') || ' (' || COALESCE(v_exam_name, 'recent exam') || ') is now available to review.', 
        'academic_update', 
        jsonb_build_object('transcript_id', NEW.id, 'student_id', NEW.student_id, 'link', '/parent/academics/' || NEW.student_id)
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Map the trigger
DROP TRIGGER IF EXISTS trg_notify_transcript_published ON transcripts;
CREATE TRIGGER trg_notify_transcript_published
AFTER UPDATE ON transcripts
FOR EACH ROW
EXECUTE FUNCTION notify_transcript_published();
-- END MIGRATION: 20260324_transcripts_publish_notifications.sql

-- ============================================================
-- BEGIN MIGRATION: 20260327_trivia_system.sql
-- ============================================================
-- ============================================================
-- Peak Performance Tutoring — Trivia System
-- ============================================================

-- ── TRIVIA SESSIONS ───────────────────────────────────────────
CREATE TABLE trivia_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  class_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed')),
  duration_minutes INTEGER,           -- overall session countdown (null = untimed)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRIVIA QUESTIONS ──────────────────────────────────────────
CREATE TABLE trivia_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES trivia_sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',   -- [{id: string, text: string}]
  correct_option_id TEXT NOT NULL,
  marks INTEGER NOT NULL DEFAULT 1,
  time_seconds INTEGER NOT NULL DEFAULT 30,  -- per-question countdown
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRIVIA GROUPS ─────────────────────────────────────────────
CREATE TABLE trivia_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES trivia_sessions(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, name)
);

-- ── TRIVIA GROUP MEMBERS ──────────────────────────────────────
CREATE TABLE trivia_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES trivia_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, student_id)
);

-- ── TRIVIA SUBMISSIONS ────────────────────────────────────────
-- One row per group per session. Auto-marked on submission.
CREATE TABLE trivia_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES trivia_sessions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES trivia_groups(id) ON DELETE CASCADE,
  -- answers: { [question_id]: option_id | null }
  answers JSONB NOT NULL DEFAULT '{}',
  -- question_timings: { [question_id]: { time_taken_s: number, timed_out: boolean } }
  question_timings JSONB NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER,           -- total wall-clock seconds for the attempt
  auto_submitted BOOLEAN NOT NULL DEFAULT FALSE,  -- true if overall timer expired
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, group_id)
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_trivia_sessions_teacher ON trivia_sessions(teacher_id);
CREATE INDEX idx_trivia_sessions_status ON trivia_sessions(status);
CREATE INDEX idx_trivia_questions_session ON trivia_questions(session_id, position);
CREATE INDEX idx_trivia_groups_session ON trivia_groups(session_id);
CREATE INDEX idx_trivia_group_members_group ON trivia_group_members(group_id);
CREATE INDEX idx_trivia_group_members_student ON trivia_group_members(student_id);
CREATE INDEX idx_trivia_submissions_session ON trivia_submissions(session_id);
CREATE INDEX idx_trivia_submissions_group ON trivia_submissions(group_id);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────
CREATE TRIGGER trg_trivia_sessions_updated
  BEFORE UPDATE ON trivia_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE trivia_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_submissions ENABLE ROW LEVEL SECURITY;

-- TRIVIA SESSIONS
-- Teachers manage their own; all authenticated users can view published sessions
CREATE POLICY "Teacher manages own trivia sessions"
  ON trivia_sessions FOR ALL
  USING (teacher_id = get_my_teacher_id() OR auth_role() = 'admin');

CREATE POLICY "Students view published trivia for their class"
  ON trivia_sessions FOR SELECT
  USING (
    auth_role() = 'student'
    AND status = 'published'
    AND get_my_student_class_id() = ANY(class_ids)
  );

-- TRIVIA QUESTIONS
-- Question visibility follows session visibility
CREATE POLICY "Teacher manages own trivia questions"
  ON trivia_questions FOR ALL
  USING (
    session_id IN (
      SELECT id FROM trivia_sessions WHERE teacher_id = get_my_teacher_id()
    ) OR auth_role() = 'admin'
  );

CREATE POLICY "Students view questions of published sessions for their class"
  ON trivia_questions FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM trivia_sessions
      WHERE status = 'published'
      AND get_my_student_class_id() = ANY(class_ids)
    )
  );

-- TRIVIA GROUPS
CREATE POLICY "Anyone authenticated views groups for their session"
  ON trivia_groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Students manage groups they created"
  ON trivia_groups FOR ALL
  USING (created_by = get_my_student_id() OR auth_role() IN ('teacher', 'admin'));

CREATE POLICY "Students can create groups"
  ON trivia_groups FOR INSERT
  WITH CHECK (auth_role() = 'student');

-- TRIVIA GROUP MEMBERS
CREATE POLICY "Anyone authenticated views group members"
  ON trivia_group_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Students can join groups"
  ON trivia_group_members FOR INSERT
  WITH CHECK (student_id = get_my_student_id());

CREATE POLICY "Students can leave groups"
  ON trivia_group_members FOR DELETE
  USING (student_id = get_my_student_id());

CREATE POLICY "Teachers and admins manage group members"
  ON trivia_group_members FOR ALL
  USING (auth_role() IN ('teacher', 'admin'));

-- TRIVIA SUBMISSIONS
CREATE POLICY "Students in group can submit"
  ON trivia_submissions FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM trivia_group_members WHERE student_id = get_my_student_id()
    )
  );

CREATE POLICY "Students view their group's submission"
  ON trivia_submissions FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM trivia_group_members WHERE student_id = get_my_student_id()
    ) OR auth_role() IN ('teacher', 'admin')
  );

CREATE POLICY "Anyone can view submissions for ranking"
  ON trivia_submissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Teacher views submissions for their trivia"
  ON trivia_submissions FOR ALL
  USING (
    session_id IN (
      SELECT id FROM trivia_sessions WHERE teacher_id = get_my_teacher_id()
    ) OR auth_role() = 'admin'
  );
-- END MIGRATION: 20260327_trivia_system.sql

-- ============================================================
-- BEGIN MIGRATION: 20260327_trivia_avatars.sql
-- ============================================================
-- Add avatar_url to trivia_groups for team identity
ALTER TABLE trivia_groups ADD COLUMN avatar_url TEXT;

-- Update RLS if needed (already broad enough for viewing but good to be explicit)
-- No changes needed to existing policies as they use ALL for owners and SELECT for others.
-- END MIGRATION: 20260327_trivia_avatars.sql

-- ============================================================
-- BEGIN MIGRATION: 20260327_trivia_locking.sql
-- ============================================================
-- Add locking columns to trivia_groups
ALTER TABLE trivia_groups 
ADD COLUMN IF NOT EXISTS attempt_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attempt_started_by UUID REFERENCES students(id);

-- Reset existing groups just in case
UPDATE trivia_groups SET attempt_started_at = NULL, attempt_started_by = NULL;
-- END MIGRATION: 20260327_trivia_locking.sql

-- ============================================================
-- BEGIN MIGRATION: 20260327_trivia_membership_fix.sql
-- ============================================================
-- ============================================================
-- Squad Membership Fixes: Auto-Join, Capacity, and One-Squad Rule
-- ============================================================

-- 1. Function to auto-join the creator to their own group
CREATE OR REPLACE FUNCTION fn_trivia_group_auto_join_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO trivia_group_members (group_id, student_id)
  VALUES (NEW.id, NEW.created_by)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_trivia_group_auto_join
  AFTER INSERT ON trivia_groups
  FOR EACH ROW EXECUTE FUNCTION fn_trivia_group_auto_join_creator();

-- 2. Function to enforce capacity and single-squad rule
CREATE OR REPLACE FUNCTION fn_trivia_member_constraints()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
  v_member_count INTEGER;
  v_already_in_session BOOLEAN;
BEGIN
  -- Get session id for the target group
  SELECT session_id INTO v_session_id FROM trivia_groups WHERE id = NEW.group_id;

  -- Check capacity (Max 3)
  SELECT count(*) INTO v_member_count FROM trivia_group_members WHERE group_id = NEW.group_id;
  IF v_member_count >= 3 THEN
    RAISE EXCEPTION 'Squad is full (Max 3 members)';
  END IF;

  -- Check if student is already in a group for THIS session
  SELECT EXISTS (
    SELECT 1 FROM trivia_group_members m
    JOIN trivia_groups g ON m.group_id = g.id
    WHERE g.session_id = v_session_id AND m.student_id = NEW.student_id
  ) INTO v_already_in_session;

  IF v_already_in_session THEN
    RAISE EXCEPTION 'You are already a member of another squad in this session';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_trivia_member_constraints
  BEFORE INSERT ON trivia_group_members
  FOR EACH ROW EXECUTE FUNCTION fn_trivia_member_constraints();

-- 3. Function to cleanup empty groups
CREATE OR REPLACE FUNCTION fn_trivia_cleanup_empty_groups()
RETURNS TRIGGER AS $$
BEGIN
  -- If the last member leaves, delete the group
  IF NOT EXISTS (SELECT 1 FROM trivia_group_members WHERE group_id = OLD.group_id) THEN
    DELETE FROM trivia_groups WHERE id = OLD.group_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_trivia_cleanup_empty_groups
  AFTER DELETE ON trivia_group_members
  FOR EACH ROW EXECUTE FUNCTION fn_trivia_cleanup_empty_groups();

-- 4. Update RLS for trivia_group_members
DROP POLICY IF EXISTS "Students can join groups" ON trivia_group_members;

CREATE POLICY "Students can join or invite to groups"
  ON trivia_group_members FOR INSERT
  WITH CHECK (
    -- Joining themselves
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
    OR
    -- Creator inviting teammates
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = (SELECT id FROM students WHERE user_id = auth.uid())
    )
  );

-- Allow students to view all memberships for their session
-- (Already exists in trivia_system migration, but just in case)
DROP POLICY IF EXISTS "Anyone authenticated views group members" ON trivia_group_members;
CREATE POLICY "Anyone authenticated views group members"
  ON trivia_group_members FOR SELECT
  USING (auth.uid() IS NOT NULL);
-- END MIGRATION: 20260327_trivia_membership_fix.sql

-- ============================================================
-- BEGIN MIGRATION: 20260327_trivia_streaks.sql
-- ============================================================
-- Add max_streak to trivia_submissions for leaderboard/analytics
ALTER TABLE trivia_submissions ADD COLUMN max_streak INTEGER DEFAULT 0;
-- END MIGRATION: 20260327_trivia_streaks.sql

-- ============================================================
-- BEGIN MIGRATION: 20260328_persistent_squads.sql
-- ============================================================
-- ============================================================
-- Persistent Squads Migration
-- ============================================================

-- ── SQUADS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS squads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, name)
);

-- Function to auto-join the creator to their own squad
CREATE OR REPLACE FUNCTION fn_squad_auto_join_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO squad_members (squad_id, student_id)
  VALUES (NEW.id, NEW.created_by)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_squad_auto_join ON squads;
CREATE TRIGGER trg_squad_auto_join
  AFTER INSERT ON squads
  FOR EACH ROW EXECUTE FUNCTION fn_squad_auto_join_creator();

-- ── SQUAD MEMBERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS squad_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(squad_id, student_id)
);

-- Add the unique constraint to squad_members if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'squad_members_student_id_key') THEN
        ALTER TABLE squad_members ADD CONSTRAINT squad_members_student_id_key UNIQUE (student_id);
    END IF;
END $$;

-- ── UPDATE TRIVIA GROUPS ───────────────────────────────────────
-- Link trivia_groups to the persistent squad if the column doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trivia_groups' AND column_name='squad_id') THEN
        ALTER TABLE trivia_groups ADD COLUMN squad_id UUID REFERENCES squads(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ── RLS POLICIES ──────────────────────────────────────────────
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone in class views squads" ON squads;
CREATE POLICY "Anyone in class views squads"
  ON squads FOR SELECT
  USING (class_id = get_my_student_class_id() OR auth_role() IN ('teacher', 'admin'));

DROP POLICY IF EXISTS "Students create squads for their class" ON squads;
CREATE POLICY "Students create squads for their class"
  ON squads FOR INSERT
  WITH CHECK (class_id = get_my_student_class_id() AND auth_role() = 'student');

DROP POLICY IF EXISTS "Squad members can view members" ON squad_members;
CREATE POLICY "Squad members can view members"
  ON squad_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Students join or invite to squads" ON squad_members;
CREATE POLICY "Students join or invite to squads"
  ON squad_members FOR INSERT
  WITH CHECK (
    -- Joining themselves
    student_id = get_my_student_id()
    OR
    -- Creator inviting teammates
    squad_id IN (
      SELECT id FROM squads WHERE created_by = get_my_student_id()
    )
  );

DROP POLICY IF EXISTS "Students join squads" ON squad_members; -- clean up old policy if named differently

DROP POLICY IF EXISTS "Students leave squads" ON squad_members;
CREATE POLICY "Students leave squads"
  ON squad_members FOR DELETE
  USING (student_id = get_my_student_id());
-- END MIGRATION: 20260328_persistent_squads.sql

-- ============================================================
-- BEGIN MIGRATION: 20260329_tuition_centers.sql
-- ============================================================
-- Migration: Add Tuition Centers

CREATE TABLE IF NOT EXISTS tuition_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE tuition_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tuition_centers" ON tuition_centers 
FOR SELECT USING (TRUE);

CREATE POLICY "Admin manages tuition_centers" ON tuition_centers 
FOR ALL USING (
  (SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text) = 'admin'
);

-- Trigger for updated_at
CREATE TRIGGER trg_tuition_centers_updated 
BEFORE UPDATE ON tuition_centers 
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add tuition_center_id to relevant tables
ALTER TABLE classes 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;

ALTER TABLE subjects 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;

ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;

ALTER TABLE teacher_assignments 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;

ALTER TABLE timetables 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE CASCADE;

ALTER TABLE quizzes 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;

ALTER TABLE trivia_sessions 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;
-- END MIGRATION: 20260329_tuition_centers.sql

-- ============================================================
-- BEGIN MIGRATION: 20260330_event_registrations.sql
-- ============================================================
-- ============================================================
-- EVENT REGISTRATIONS
-- Tracks students enrolled in tuition events (both with/without accounts)
-- ============================================================

CREATE TABLE IF NOT EXISTS event_registrations (
  id                 UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name       TEXT         NOT NULL, -- Primary name for the registration
  student_id         UUID         REFERENCES students(id) ON DELETE SET NULL, -- Optional link to account
  tuition_event_id   UUID         NOT NULL REFERENCES tuition_events(id) ON DELETE CASCADE,
  class_id           UUID         REFERENCES classes(id) ON DELETE SET NULL,
  tuition_center_id  UUID         REFERENCES tuition_centers(id) ON DELETE SET NULL,
  registered_at      TIMESTAMPTZ  DEFAULT NOW(),
  notes              TEXT,
  status             TEXT         DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'suspended')),
  UNIQUE (tuition_event_id, student_name, student_id)
);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_event_reg_event   ON event_registrations (tuition_event_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_class   ON event_registrations (class_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_center  ON event_registrations (tuition_center_id);

-- Enable RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "admins_all_event_registrations" ON event_registrations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Teachers can read
CREATE POLICY "teachers_read_event_registrations" ON event_registrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );
-- END MIGRATION: 20260330_event_registrations.sql

-- ============================================================
-- BEGIN MIGRATION: 20260330_nullable_subject.sql
-- ============================================================
ALTER TABLE teacher_assignments ALTER COLUMN subject_id DROP NOT NULL;
-- END MIGRATION: 20260330_nullable_subject.sql

-- ============================================================
-- BEGIN MIGRATION: 20260331_add_notes_to_attendance.sql
-- ============================================================
-- Add missing 'notes' column to attendance table
ALTER TABLE IF EXISTS attendance
ADD COLUMN IF NOT EXISTS notes TEXT;
-- END MIGRATION: 20260331_add_notes_to_attendance.sql

-- ============================================================
-- BEGIN MIGRATION: 20260331_assignment_tuition_centers.sql
-- ============================================================
-- Add tuition_center_id to assignments to allow teachers to isolate assignments by tuition center
ALTER TABLE IF EXISTS assignments
ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE CASCADE;
-- END MIGRATION: 20260331_assignment_tuition_centers.sql

-- ============================================================
-- BEGIN MIGRATION: 20260331_attendance_schema_update.sql
-- ============================================================
-- ==========================================================
-- UPDATE ATTENDANCE SCHEMA
-- Adds 'status' and 'week_number' to support advanced tracking.
-- ==========================================================

ALTER TABLE IF EXISTS attendance
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present',
ADD COLUMN IF NOT EXISTS week_number INTEGER,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Drop 'present' column if you no longer need the boolean field, 
-- or leave it for backward compatibility if other places use it.
-- ALTER TABLE attendance DROP COLUMN IF EXISTS present;
-- END MIGRATION: 20260331_attendance_schema_update.sql

-- ============================================================
-- BEGIN MIGRATION: 20260401_finance_portal.sql
-- ============================================================
-- ======================================================
-- FINANCE PORTAL: FULL SYSTEM DDL (SAFE MIGRATION)
-- This script adds new finance tables and safely extends
-- existing tables (like tuition_events and event_registrations)
-- without destroying any existing data.
-- ======================================================

-- 1. NEW SUPPORTING TABLES (Safe to run multiple times)
CREATE TABLE IF NOT EXISTS tuition_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6366F1',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. EXTEND EXISTING TABLES (Non-destructive ALTERS)
-- Extend tuition_events with billing fields
ALTER TABLE tuition_events 
    ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(10, 2) DEFAULT 500.00,
    ADD COLUMN IF NOT EXISTS active_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    ADD COLUMN IF NOT EXISTS attendance_threshold INTEGER DEFAULT 80;

-- Extend event_registrations to link to centers and status
ALTER TABLE event_registrations 
    ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'suspended'));


-- 3. NEW CORE FINANCE TABLES
-- Payments engine
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    method TEXT NOT NULL, -- 'Cash', 'M-Pesa', 'Bank Transfer', 'Cheque'
    paid_dates TEXT, -- CSV of ISO dates: "2026-04-01,2026-04-02"
    week_number INTEGER,
    reference TEXT, -- Transaction ID / Cheque #
    notes TEXT,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL, 
    student_name TEXT, 
    tuition_event_id UUID REFERENCES tuition_events(id) ON DELETE SET NULL,
    tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns that may be missing if payments table already existed from 001_schema
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_dates TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS week_number INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;

-- Expenses tracker
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    method TEXT DEFAULT 'Cash',
    reference TEXT,
    notes TEXT,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- PDF Report Tracking
CREATE TABLE IF NOT EXISTS financial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    report_type TEXT DEFAULT 'weekly', -- 'weekly', 'monthly', 'annual'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_revenue NUMERIC(15, 2) DEFAULT 0,
    total_expenses NUMERIC(15, 2) DEFAULT 0,
    net_profit NUMERIC(15, 2) DEFAULT 0,
    pdf_url TEXT,
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PERFORMANCE INDEXES
DROP INDEX IF EXISTS idx_payments_event;
CREATE INDEX idx_payments_event ON payments(tuition_event_id, week_number);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_center ON payments(tuition_center_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_center ON expenses(tuition_center_id);


-- 5. REPORTING VIEWS
-- Drop view if exists to easily recreate its structure if needed
DROP VIEW IF EXISTS student_weekly_arrears;
CREATE VIEW student_weekly_arrears AS
SELECT 
    er.student_name,
    er.tuition_event_id,
    te.name AS event_name,
    te.daily_rate,
    COALESCE(SUM(p.amount), 0) AS amount_paid,
    COALESCE(SUM(array_length(string_to_array(p.paid_dates, ','), 1)), 0) AS days_settled
FROM event_registrations er
JOIN tuition_events te ON er.tuition_event_id = te.id
LEFT JOIN payments p ON er.tuition_event_id = p.tuition_event_id AND er.student_name = p.student_name
GROUP BY er.student_name, er.tuition_event_id, te.name, te.daily_rate;

DROP VIEW IF EXISTS finance_daily_summary;
CREATE VIEW finance_daily_summary AS
SELECT 
    payment_date AS summary_date,
    SUM(amount) AS total_revenue,
    (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE expense_date = payments.payment_date) AS total_expenses
FROM payments
GROUP BY payment_date;


-- 6. ROW LEVEL SECURITY (RLS) & POLICIES
-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Safe Policy Creation (Drop then Create)
DROP POLICY IF EXISTS "finance_all_payments" ON payments;
CREATE POLICY "finance_all_payments" ON payments
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'finance')));

DROP POLICY IF EXISTS "finance_all_expenses" ON expenses;
CREATE POLICY "finance_all_expenses" ON expenses
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'finance')));

DROP POLICY IF EXISTS "finance_all_reports" ON financial_reports;
CREATE POLICY "finance_all_reports" ON financial_reports
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'finance')));

DROP POLICY IF EXISTS "everyone_read_categories" ON expense_categories;
CREATE POLICY "everyone_read_categories" ON expense_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_write_categories" ON expense_categories;
CREATE POLICY "admin_write_categories" ON expense_categories
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));


-- 7. INITIAL DATA SEEDING
-- Seed categories safely
INSERT INTO expense_categories (name, color) VALUES 
('Teacher Salaries', '#10B981'), 
('Rent & Utilities', '#EF4444'), 
('Marketing', '#3B82F6'), 
('Stationery', '#F59E0B'),
('Maintenance', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;
-- END MIGRATION: 20260401_finance_portal.sql

-- ============================================================
-- BEGIN MIGRATION: 20260401_restore_gap_patch.sql
-- ============================================================
-- ============================================================
-- Peak Performance Tutoring
-- Restore gap patch for a brand-new Supabase project
--
-- These objects are referenced by the app but were either created
-- manually in a prior project or repaired later without a base
-- CREATE TABLE migration.
-- ============================================================

-- Finance settings used by /finance/settings
CREATE TABLE IF NOT EXISTS finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name TEXT NOT NULL DEFAULT 'Peak Performance Tutoring',
  org_address TEXT,
  org_phone TEXT,
  org_email TEXT,
  default_currency TEXT NOT NULL DEFAULT 'KES',
  fiscal_year_start_month INTEGER NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  pdf_footer_text TEXT DEFAULT 'Generated by Peak Performance Tutoring Finance Portal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO finance_settings (org_name)
SELECT 'Peak Performance Tutoring'
WHERE NOT EXISTS (SELECT 1 FROM finance_settings);

ALTER TABLE finance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_settings_manage" ON finance_settings;
CREATE POLICY "finance_settings_manage" ON finance_settings
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'finance')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'finance')
  ));

-- Teacher registration keys used by /auth/register and /admin/settings
CREATE TABLE IF NOT EXISTS teacher_registration_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_registration_keys_key
  ON teacher_registration_keys(key);

ALTER TABLE teacher_registration_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can validate teacher registration keys" ON teacher_registration_keys;
CREATE POLICY "Anyone can validate teacher registration keys" ON teacher_registration_keys
  FOR SELECT
  USING (expires_at >= now());

DROP POLICY IF EXISTS "Admins manage teacher registration keys" ON teacher_registration_keys;
CREATE POLICY "Admins manage teacher registration keys" ON teacher_registration_keys
  FOR ALL
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- Class-subject junction used as an onboarding fallback.
CREATE TABLE IF NOT EXISTS class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_class_subjects_class
  ON class_subjects(class_id);

ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users view class subjects" ON class_subjects;
CREATE POLICY "Authenticated users view class subjects" ON class_subjects
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins manage class subjects" ON class_subjects;
CREATE POLICY "Admins manage class subjects" ON class_subjects
  FOR ALL
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- Holidays used by attendance and tuition-event week calculations.
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('public', 'custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users view holidays" ON holidays;
CREATE POLICY "Authenticated users view holidays" ON holidays
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins manage custom holidays" ON holidays;
CREATE POLICY "Admins manage custom holidays" ON holidays
  FOR ALL
  USING (auth_role() = 'admin')
  WITH CHECK (auth_role() = 'admin');

-- Lightweight notification/intel feed used by library rewards.
CREATE TABLE IF NOT EXISTS intel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intel_profile_read
  ON intel(profile_id, read);

ALTER TABLE intel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own intel" ON intel;
CREATE POLICY "Users manage own intel" ON intel
  FOR ALL
  USING (profile_id = auth.uid() OR auth_role() = 'admin')
  WITH CHECK (profile_id = auth.uid() OR auth_role() = 'admin');

-- Live classroom base tables. Later migrations add room fields,
-- realtime messages, whiteboard state, reflections, and RLS fixes.
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher
  ON live_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_class_center
  ON live_sessions(class_id, tuition_center_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled_at
  ON live_sessions(scheduled_at);

ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_live_sessions_updated ON live_sessions;
CREATE TRIGGER trg_live_sessions_updated
  BEFORE UPDATE ON live_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS live_session_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_session_outcomes_session
  ON live_session_outcomes(session_id);

ALTER TABLE live_session_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage their own live sessions" ON live_sessions;
CREATE POLICY "Teachers can manage their own live sessions" ON live_sessions
  FOR ALL
  USING (teacher_id = get_my_teacher_id() OR auth_role() = 'admin')
  WITH CHECK (teacher_id = get_my_teacher_id() OR auth_role() = 'admin');

DROP POLICY IF EXISTS "Students can view live sessions for their class" ON live_sessions;
CREATE POLICY "Students can view live sessions for their class" ON live_sessions
  FOR SELECT
  USING (class_id = get_my_student_class_id() OR auth_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS "Teachers can manage outcomes for their sessions" ON live_session_outcomes;
CREATE POLICY "Teachers can manage outcomes for their sessions" ON live_session_outcomes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_session_outcomes.session_id
        AND (live_sessions.teacher_id = get_my_teacher_id() OR auth_role() = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_session_outcomes.session_id
        AND (live_sessions.teacher_id = get_my_teacher_id() OR auth_role() = 'admin')
    )
  );

DROP POLICY IF EXISTS "Students can view outcomes for their sessions" ON live_session_outcomes;
CREATE POLICY "Students can view outcomes for their sessions" ON live_session_outcomes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_session_outcomes.session_id
        AND live_sessions.class_id = get_my_student_class_id()
    )
  );

-- Storage bucket used by the teacher AI assistant.
INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-resources', 'teacher-resources', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Teacher resources are publicly accessible" ON storage.objects;
CREATE POLICY "Teacher resources are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'teacher-resources');

DROP POLICY IF EXISTS "Authenticated users upload teacher resources" ON storage.objects;
CREATE POLICY "Authenticated users upload teacher resources"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'teacher-resources' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users delete teacher resources" ON storage.objects;
CREATE POLICY "Authenticated users delete teacher resources"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'teacher-resources' AND auth.role() = 'authenticated');

-- Global leaderboard used by student dashboard.
DROP FUNCTION IF EXISTS get_global_leaderboard(integer);
CREATE FUNCTION get_global_leaderboard(p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, full_name text, xp int, avatar_url text, class_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    s.id,
    s.full_name,
    COALESCE(s.xp, 0) AS xp,
    p.avatar_url,
    c.name AS class_name
  FROM students s
  LEFT JOIN profiles p ON p.id = s.user_id
  LEFT JOIN classes c ON c.id = s.class_id
  ORDER BY COALESCE(s.xp, 0) DESC, s.full_name ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_global_leaderboard(integer) TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE live_sessions;
EXCEPTION
  WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE live_session_outcomes;
EXCEPTION
  WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260401_restore_gap_patch.sql

-- ============================================================
-- BEGIN MIGRATION: 20260402_cleanup_trivia_groups.sql
-- ============================================================
-- ============================================================
-- TRIVIA ARENA: TOTAL SYSTEM RESET
-- This will delete ALL trivia groups (session-specific) AND 
-- ALL persistent squads (Academy Squads).
-- Use this to clear the board entirely and resolve membership 
-- conflicts for all students.
-- ============================================================

-- 1. Clear session-specific groups
DELETE FROM trivia_groups;

-- 2. Clear persistent Academy squads
-- (This also clears squad_members via CASCADE)
DELETE FROM squads;

-- 3. Notify schema change
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260402_cleanup_trivia_groups.sql

-- ============================================================
-- BEGIN MIGRATION: 20260402_extend_quizzes_assignments.sql
-- ============================================================
-- ============================================================
-- Extend quizzes, assignments, and trivia tables with missing columns
-- Run this ONCE in the Supabase SQL Editor
-- ============================================================

-- ── QUIZZES: Add missing columns ───────────────────────────────
-- NOTE: tuition_center_id already added by 20260329_tuition_centers.sql
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS total_marks NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pass_mark_percentage INTEGER DEFAULT 70,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS retake_delay_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'class',
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ;

-- ── ASSIGNMENTS: Add missing columns ────────────────────────────
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS worksheet JSONB,
  ADD COLUMN IF NOT EXISTS passage TEXT,
  ADD COLUMN IF NOT EXISTS passage_type TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS total_marks NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_timer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS time_limit INTEGER,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS response_mode TEXT DEFAULT 'blocks';

-- ── TRIVIA SUBMISSIONS: Add max_streak column ──────────────────
-- Used by the student arena attempt page to track answer streaks
ALTER TABLE trivia_submissions
  ADD COLUMN IF NOT EXISTS max_streak INTEGER DEFAULT 0;

-- ── QUIZZES: Allow finance/admin to read quizzes ────────────────
DROP POLICY IF EXISTS "Finance reads quizzes" ON quizzes;
CREATE POLICY "Finance reads quizzes"
  ON quizzes FOR SELECT
  USING ((SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text) IN ('admin', 'finance'));

-- ── STORAGE: Make avatars bucket public if not already ──────────
-- This ensures trivia question images (stored under avatars/trivia/) are
-- accessible to students during the exam attempt.
-- Run this in your Supabase Dashboard > Storage > avatars > Make Public
-- OR execute this SQL in the SQL editor:
UPDATE storage.buckets SET public = true WHERE id = 'avatars';

-- ── Done ────────────────────────────────────────────────────────
-- END MIGRATION: 20260402_extend_quizzes_assignments.sql

-- ============================================================
-- BEGIN MIGRATION: 20260402_finance_rls_fix.sql
-- ============================================================
-- ======================================================
-- FINANCE HUB: FINAL RLS STABILIZATION (PERMISSIVE)
-- Re-standardizing and simplifying access for staff to
-- prevent any security layer from blocking patient billing.
-- ======================================================

-- 1. STRENGTHEN PROFILE ROLES
DO $$
BEGIN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'finance'));
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Constraint already handled.';
END $$;

-- 2. SIMPLIFIED SELECT PERMISSIONS (Authenticated Only)
-- Granting ALL authenticated staff read-only access to Registrations
-- This rules out any complex subquery recursion issues entirely.
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "finance_view_registrations" ON event_registrations;
DROP POLICY IF EXISTS "Finance can view registrations for billing" ON event_registrations;
DROP POLICY IF EXISTS "admin_all_registrations" ON event_registrations;
DROP POLICY IF EXISTS "teacher_view_registrations" ON event_registrations;
DROP POLICY IF EXISTS "admins_all_event_registrations" ON event_registrations;
DROP POLICY IF EXISTS "teachers_read_event_registrations" ON event_registrations;

CREATE POLICY "Anyone authenticated can view event registrations" ON event_registrations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Same for Tuition Centers
ALTER TABLE tuition_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can view centers" ON tuition_centers;
DROP POLICY IF EXISTS "Admin and Finance manage centers" ON tuition_centers;

CREATE POLICY "Anyone authenticated can view centers" ON tuition_centers
    FOR SELECT USING (auth.role() = 'authenticated');

-- 3. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260402_finance_rls_fix.sql

-- ============================================================
-- BEGIN MIGRATION: 20260402_student_leaderboard_fixes.sql
-- ============================================================
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
-- END MIGRATION: 20260402_student_leaderboard_fixes.sql

-- ============================================================
-- BEGIN MIGRATION: 20260402_timetable_updates_and_swaps.sql
-- ============================================================
-- ======================================================
-- TIMETABLE & PORTAL UPDATES (V3)
-- Fixes financier role, adds session types, and swap system.
-- ======================================================

-- 1. FIX PROFILES ROLE CONSTRAINT
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'finance'));

-- 2. EXTEND TIMETABLES TABLE
-- Add session_type (class, break, prep, duty)
ALTER TABLE timetables ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'class';

-- Make subject_id and teacher_id nullable for breaks/prep
ALTER TABLE timetables ALTER COLUMN subject_id DROP NOT NULL;
ALTER TABLE timetables ALTER COLUMN teacher_id DROP NOT NULL;

-- Add tuition_center_id to timetables if missing (it was added in 20260329_tuition_centers.sql)
-- But let's ensure it has an index for fast filtering
CREATE INDEX IF NOT EXISTS idx_timetables_center ON timetables(tuition_center_id);

-- 3. CREATE TIMETABLE SWAPS TABLE
CREATE TABLE IF NOT EXISTS timetable_swaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    requested_by_id UUID NOT NULL REFERENCES teachers(id),
    target_teacher_id UUID REFERENCES teachers(id), -- Null means any teacher can take it
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_swaps_status ON timetable_swaps(status);
CREATE INDEX IF NOT EXISTS idx_swaps_teacher ON timetable_swaps(requested_by_id, target_teacher_id);

-- 4. RLS POLICIES FOR SWAPS
ALTER TABLE timetable_swaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teachers_manage_own_swaps" ON timetable_swaps;
CREATE POLICY "teachers_manage_own_swaps" ON timetable_swaps
FOR ALL USING (
    requested_by_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR
    target_teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "teachers_view_open_swaps" ON timetable_swaps;
CREATE POLICY "teachers_view_open_swaps" ON timetable_swaps
FOR SELECT USING (
    target_teacher_id IS NULL AND 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
);

-- 5. FIX TRIVIA GROUP DISBAND (Deletion Permission)
DROP POLICY IF EXISTS "Creators can delete their own trivia groups" ON trivia_groups;
CREATE POLICY "Creators can delete their own trivia groups" ON trivia_groups
FOR DELETE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Creators can delete their own group members" ON trivia_group_members;
CREATE POLICY "Creators can delete their own group members" ON trivia_group_members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM trivia_groups 
    WHERE id = trivia_group_members.group_id 
    AND created_by = auth.uid()
  ) OR
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);
-- END MIGRATION: 20260402_timetable_updates_and_swaps.sql

-- ============================================================
-- BEGIN MIGRATION: 20260402_trivia_membership_trigger_fix.sql
-- ============================================================
-- ============================================================
-- TRIVIA MEMBERSHIP TRIGGER FIX
-- Refines the membership constraints to prevent 
-- self-blocking when auto-joining or upserting.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_trivia_member_constraints()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
  v_member_count INTEGER;
  v_other_group_id UUID;
BEGIN
  -- 1. Get session id for the target group
  SELECT session_id INTO v_session_id 
  FROM trivia_groups 
  WHERE id = NEW.group_id;

  -- 2. Check capacity (Max 3)
  -- Count excluding the current student if they are already in (for upserts)
  SELECT count(*) INTO v_member_count 
  FROM trivia_group_members 
  WHERE group_id = NEW.group_id AND student_id != NEW.student_id;

  IF v_member_count >= 3 THEN
    RAISE EXCEPTION 'Squad is full (Max 3 members)';
  END IF;

  -- 3. Check for membership in A DIFFERENT group in the same session
  -- This prevents the "already in session" error when the student is 
  -- actually already in the SAME group (e.g. via auto-join trigger).
  SELECT m.group_id INTO v_other_group_id
  FROM trivia_group_members m
  JOIN trivia_groups g ON m.group_id = g.id
  WHERE g.session_id = v_session_id 
    AND m.student_id = NEW.student_id
    AND m.group_id != NEW.group_id  -- CRITICAL: Allow if it's the SAME group
  LIMIT 1;

  IF v_other_group_id IS NOT NULL THEN
    RAISE EXCEPTION 'You are already a member of another squad in this session';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- No need to recreate the trigger, just replacing the function logic.

NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260402_trivia_membership_trigger_fix.sql

-- ============================================================
-- BEGIN MIGRATION: 20260402_trivia_rls_robustness.sql
-- ============================================================
-- ============================================================
-- TRIVIA RLS ROBUSTNESS
-- Standardizing student ID lookups and grant explicit join 
-- permissions to prevent RLS errors during group activities.
-- ============================================================

-- 1. TRIVIA GROUPS
DROP POLICY IF EXISTS "Students manage groups they created" ON trivia_groups;
CREATE POLICY "Students manage groups they created"
  ON trivia_groups FOR ALL
  USING (
    created_by = get_my_student_id() 
    OR auth_role() IN ('teacher', 'admin')
  );

DROP POLICY IF EXISTS "Students can create groups" ON trivia_groups;
CREATE POLICY "Students can create groups"
  ON trivia_groups FOR INSERT
  WITH CHECK (
    auth_role() = 'student' 
    AND created_by = get_my_student_id()
  );

-- 2. TRIVIA GROUP MEMBERS
DROP POLICY IF EXISTS "Students can join groups" ON trivia_group_members;
DROP POLICY IF EXISTS "Students can join or invite to groups" ON trivia_group_members;

CREATE POLICY "Students can join or invite to groups"
  ON trivia_group_members FOR INSERT
  WITH CHECK (
    -- Case: Student joining themselves
    student_id = get_my_student_id()
    OR
    -- Case: Creator of the group inviting teammates
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = get_my_student_id()
    )
  );

DROP POLICY IF EXISTS "Students can leave groups" ON trivia_group_members;
CREATE POLICY "Students can leave groups"
  ON trivia_group_members FOR DELETE
  USING (
    student_id = get_my_student_id()
    OR 
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = get_my_student_id()
    )
  );

-- 3. SQUAD MEMBERS (Persistent)
DROP POLICY IF EXISTS "Students join or invite to squads" ON squad_members;
CREATE POLICY "Students join or invite to squads"
  ON squad_members FOR INSERT
  WITH CHECK (
    -- Case: Joining themselves
    student_id = get_my_student_id()
    OR
    -- Case: Creator inviting teammates
    squad_id IN (
      SELECT id FROM squads WHERE created_by = get_my_student_id()
    )
  );

DROP POLICY IF EXISTS "Students leave squads" ON squad_members;
CREATE POLICY "Students leave squads"
  ON squad_members FOR DELETE
  USING (
    student_id = get_my_student_id()
    OR
    squad_id IN (
      SELECT id FROM squads WHERE created_by = get_my_student_id()
    )
  );

-- 4. TRIVIA SUBMISSIONS
DROP POLICY IF EXISTS "Students in group can submit" ON trivia_submissions;
CREATE POLICY "Students in group can submit"
  ON trivia_submissions FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM trivia_group_members WHERE student_id = get_my_student_id()
    )
  );

DROP POLICY IF EXISTS "Students view their group's submission" ON trivia_submissions;
CREATE POLICY "Students view their group's submission"
  ON trivia_submissions FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM trivia_group_members WHERE student_id = get_my_student_id()
    ) 
    OR auth_role() IN ('teacher', 'admin')
  );

-- Notify schema change
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260402_trivia_rls_robustness.sql

-- ============================================================
-- BEGIN MIGRATION: 20260403_assignment_uploads_bucket.sql
-- ============================================================
-- Ensure assignment-uploads storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assignment-uploads', 'assignment-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for assignment-uploads bucket
-- Allow public access to view uploaded assignment materials (PDFs/Images)
-- This is critical so students can see the worksheet they are meant to work on.
DROP POLICY IF EXISTS "Assignment materials are publicly accessible." ON storage.objects;
CREATE POLICY "Assignment materials are publicly accessible." 
ON storage.objects FOR SELECT USING (bucket_id = 'assignment-uploads');

-- Allow authenticated users to upload assignment materials
-- This allows teachers and admins to upload PDFs/images when creating assignments.
DROP POLICY IF EXISTS "Authenticated users can upload assignment materials." ON storage.objects;
CREATE POLICY "Authenticated users can upload assignment materials." 
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'assignment-uploads' 
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete assignment materials they uploaded (if needed)
DROP POLICY IF EXISTS "Authenticated users can delete assignment materials." ON storage.objects;
CREATE POLICY "Authenticated users can delete assignment materials." 
ON storage.objects FOR DELETE USING (
    bucket_id = 'assignment-uploads' 
    AND auth.role() = 'authenticated'
);
-- END MIGRATION: 20260403_assignment_uploads_bucket.sql

-- ============================================================
-- BEGIN MIGRATION: 20260403_enhanced_resources.sql
-- ============================================================
-- Migration: Enhanced Resource Library
-- Adds support for broadcasting to all centers, multiple classes, and sharing with individual students.

-- 1. Create storage bucket for resources
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resource-uploads', 'resource-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for resource-uploads
DROP POLICY IF EXISTS "Resources are publicly accessible." ON storage.objects;
CREATE POLICY "Resources are publicly accessible." 
ON storage.objects FOR SELECT USING (bucket_id = 'resource-uploads');

DROP POLICY IF EXISTS "Authenticated users can upload resources." ON storage.objects;
CREATE POLICY "Authenticated users can upload resources." 
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'resource-uploads' 
    AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can delete resources." ON storage.objects;
CREATE POLICY "Authenticated users can delete resources." 
ON storage.objects FOR DELETE USING (
    bucket_id = 'resource-uploads' 
    AND auth.role() = 'authenticated'
);

-- 3. Update resources table
ALTER TABLE resources 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'class' CHECK (audience IN ('public', 'class', 'broadcast', 'students')),
  ADD COLUMN IF NOT EXISTS class_ids UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS student_ids UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260403_enhanced_resources.sql

-- ============================================================
-- BEGIN MIGRATION: 20260403_fix_resource_public_column.sql
-- ============================================================
-- Migration: Add is_public column to resources table
-- This column is required for public sharing of educational materials.

ALTER TABLE resources 
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Ensure tuition_center_id is also present as a fallback
ALTER TABLE resources 
  ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE SET NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260403_fix_resource_public_column.sql

-- ============================================================
-- BEGIN MIGRATION: 20260403_resources_nullable_class.sql
-- ============================================================
-- Migration: Make class_id and subject_id nullable on resources table
-- This allows broadcast, public, and student-targeted resources
-- to exist without being tied to a single class or subject.

ALTER TABLE resources
  ALTER COLUMN class_id DROP NOT NULL;

ALTER TABLE resources
  ALTER COLUMN subject_id DROP NOT NULL;

-- Also update the RLS policy so students can see resources
-- shared with them via student_ids or broadcast
DROP POLICY IF EXISTS "Students view resources for their class" ON resources;

CREATE POLICY "Students view resources for their class" ON resources
  FOR SELECT USING (
    -- Shared with the student's class
    class_id = get_my_student_class_id()
    OR
    -- Broadcast/public resource
    audience IN ('broadcast', 'public')
    OR
    -- Explicitly targeted at this student
    (get_my_student_id())::uuid = ANY(student_ids)
  );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260403_resources_nullable_class.sql

-- ============================================================
-- BEGIN MIGRATION: 20260405_fix_resource_broadcasting.sql
-- ============================================================
-- Migration: Fix Resource Broadcasting RLS
-- This migration ensures that resources targeted at specific centers, 
-- multiple classes (class_ids array), or individual students are correctly filtered.

-- 1. Helper function to get student's center (to avoid recursion in RLS)
CREATE OR REPLACE FUNCTION get_my_student_center_id() RETURNS UUID AS $$
  SELECT tuition_center_id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Update Resource RLS Policy
DROP POLICY IF EXISTS "Students view resources for their class" ON resources;

CREATE POLICY "Students view resources for their class" ON resources
  FOR SELECT USING (
    -- Shared with the student's primary class
    class_id = get_my_student_class_id()
    OR
    -- Shared via multiple class targeting (Broadcast/Specific)
    get_my_student_class_id() = ANY(class_ids)
    OR
    -- Explicitly targeted at this student
    (get_my_student_id())::uuid = ANY(student_ids)
    OR
    -- Broadcast or Public resource
    (
      (audience = 'public') 
      OR 
      (
        audience = 'broadcast' 
        AND (
          tuition_center_id IS NULL 
          OR 
          tuition_center_id = get_my_student_center_id()
        )
      )
    )
  );

-- 3. Notify PostgREST
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260405_fix_resource_broadcasting.sql

-- ============================================================
-- BEGIN MIGRATION: 20260405_fix_teacher_assignment_unique.sql
-- ============================================================
-- Migration: Fix Teacher Assignment Unique Constraint
-- Description: Updates the unique constraint on teacher_assignments to include tuition_center_id.
-- This allow assigning a teacher to the same class/subject combo in different centers.

-- 1. Identify the existing unique constraint name
-- Default name from 001_schema.sql would be something like 'teacher_assignments_teacher_id_class_id_subject_id_key'
-- But let's use a safer dropping method if we know it.
ALTER TABLE teacher_assignments 
  DROP CONSTRAINT IF EXISTS teacher_assignments_teacher_id_class_id_subject_id_key;

-- 2. Add the new constraint
ALTER TABLE teacher_assignments 
  ADD CONSTRAINT teacher_assignments_teacher_class_subject_center_key 
  UNIQUE (teacher_id, class_id, subject_id, tuition_center_id);
-- END MIGRATION: 20260405_fix_teacher_assignment_unique.sql

-- ============================================================
-- BEGIN MIGRATION: 20260405_quiz_media_bucket.sql
-- ============================================================
-- Migration: Create Quiz Media Storage Bucket
-- Description: Creates a public bucket for quiz-related images and documents with appropriate RLS policies.

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-media', 'quiz-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS Policies for the bucket
-- 1. Allow anyone to view media
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'quiz-media');

-- 2. Allow authenticated teachers and admins to upload
CREATE POLICY "Teacher & Admin Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'quiz-media' AND 
  (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('teacher', 'admin')
);

-- 3. Allow creators to delete or update their own media
CREATE POLICY "Creator Manage" 
ON storage.objects FOR ALL 
USING (
  bucket_id = 'quiz-media' AND 
  (auth.uid() = owner)
)
WITH CHECK (
  bucket_id = 'quiz-media' AND 
  (auth.uid() = owner)
);
-- END MIGRATION: 20260405_quiz_media_bucket.sql

-- ============================================================
-- BEGIN MIGRATION: 20260405_terms_system.sql
-- ============================================================
-- ============================================================
-- Peak Performance Tutoring — Terms & Conditions System
-- ============================================================

-- ── DOCUMENTS ─────────────────────────────────────────────────
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,          -- Storing HTML from TipTap
  version TEXT NOT NULL DEFAULT 'v1.0',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── DOCUMENT ASSIGNMENTS ──────────────────────────────────────
CREATE TABLE document_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed')),
  signature_type TEXT CHECK (signature_type IN ('typed', 'drawn')),
  signature_data TEXT,            -- Typed name or base64 image URL
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  signed_at TIMESTAMPTZ,
  UNIQUE(document_id, teacher_id) -- Teachers can only be assigned to a specific document version once
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_document_assignments_teacher ON document_assignments(teacher_id);
CREATE INDEX idx_document_assignments_status ON document_assignments(status);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────
CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_assignments ENABLE ROW LEVEL SECURITY;

-- DOCUMENTS
-- Admins can do everything
CREATE POLICY "Admins manage documents"
  ON documents FOR ALL
  USING (auth_role() = 'admin');

-- Teachers can view published documents they've been assigned
CREATE POLICY "Teachers view assigned published documents"
  ON documents FOR SELECT
  USING (
    status = 'published' AND
    id IN (
      SELECT document_id FROM document_assignments WHERE teacher_id = get_my_teacher_id()
    )
  );

-- DOCUMENT ASSIGNMENTS
-- Admins can do everything
CREATE POLICY "Admins manage document assignments"
  ON document_assignments FOR ALL
  USING (auth_role() = 'admin');

-- Teachers view their own assignments
CREATE POLICY "Teachers view own assignments"
  ON document_assignments FOR SELECT
  USING (teacher_id = get_my_teacher_id());

-- Teachers can UPDATE their assignments to sign them
CREATE POLICY "Teachers can sign their assignments"
  ON document_assignments FOR UPDATE
  USING (teacher_id = get_my_teacher_id() AND status = 'pending')
  WITH CHECK (
    teacher_id = get_my_teacher_id() AND 
    status = 'signed' AND
    signature_data IS NOT NULL
  );
-- END MIGRATION: 20260405_terms_system.sql

-- ============================================================
-- BEGIN MIGRATION: 20260407_add_tuition_center_to_attendance.sql
-- ============================================================
-- Add tuition_center_id to attendance to allow tracking attendance by specific centers
ALTER TABLE IF EXISTS attendance
ADD COLUMN IF NOT EXISTS tuition_center_id UUID REFERENCES tuition_centers(id) ON DELETE CASCADE;
-- END MIGRATION: 20260407_add_tuition_center_to_attendance.sql

-- ============================================================
-- BEGIN MIGRATION: 20260407_fix_attendance_rls.sql
-- ============================================================
-- Fix attendance RLS to allow any teacher assigned to the class to manage attendance
-- This prevents issues where one teacher creates the row and another teacher (or substitute) cannot update it.

DROP POLICY IF EXISTS "Teacher manages attendance" ON attendance;

CREATE POLICY "Teacher manages attendance" ON attendance FOR ALL USING (
  class_id IN (
    SELECT class_id FROM teacher_assignments WHERE teacher_id = get_my_teacher_id() AND is_class_teacher = TRUE
  ) OR auth_role() = 'admin'
);
-- END MIGRATION: 20260407_fix_attendance_rls.sql

-- ============================================================
-- BEGIN MIGRATION: 20260408_stability_fixes.sql
-- ============================================================
-- [MIGRATION] Add daily XP tracking and performance indexes for 200+ users

-- 1. Add last_login_date column for daily XP tracking
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_login_date DATE;
CREATE INDEX IF NOT EXISTS idx_students_last_login ON students(last_login_date);

-- 2. Performance Indexes for concurrent users
-- Speed up teacher dashboard and marking
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- Speed up attendance tracking
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);

-- Speed up student portal
CREATE INDEX IF NOT EXISTS idx_students_class_center ON students(class_id, tuition_center_id);
-- Fixed: column was "read", not "read_at"
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_status ON notifications(user_id, read);

-- Fixed: table is "timetables" and column is "day", and resources uses "audience" for scope
CREATE INDEX IF NOT EXISTS idx_resources_scope ON resources(audience, tuition_center_id);
CREATE INDEX IF NOT EXISTS idx_timetables_class_day_v2 ON timetables(class_id, day);
-- END MIGRATION: 20260408_stability_fixes.sql

-- ============================================================
-- BEGIN MIGRATION: 20260408_workbook_mode.sql
-- ============================================================
-- [MIGRATION] Add Workbook Mode and refined gamification support

-- 1. Add is_workbook flag to assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_workbook BOOLEAN DEFAULT FALSE;

-- 2. Add description/instruction support for assignments if missing (for the "illustrations/images" part)
-- (Already exists in most schemas as 'description' or 'instructions')

-- 3. Ensure students table has XP column (already exists based on code)

-- 4. Create an index for faster grading lookups
CREATE INDEX IF NOT EXISTS idx_submissions_status_assignment ON submissions(status, assignment_id);
-- END MIGRATION: 20260408_workbook_mode.sql

-- ============================================================
-- BEGIN MIGRATION: 20260410_fix_trivia_group_members_rls.sql
-- ============================================================
-- ============================================================
-- FIX: trivia_group_members RLS for squad joins
-- 
-- The previous upsert approach failed because:
-- 1. upsert = INSERT + ON CONFLICT DO UPDATE
-- 2. The UPDATE path has no permissive RLS policy for the group creator
-- 3. The auto-join trigger already inserted the creator, so the
--    upsert hit the UPDATE path for the creator row, which was blocked.
--
-- Fix: Create a SECURITY DEFINER function that handles member insertion
-- server-side without RLS interference, with explicit permission checks.
-- ============================================================

-- 1. Add explicit UPDATE policy for group creators
DROP POLICY IF EXISTS "Group creators can update member records" ON trivia_group_members;
CREATE POLICY "Group creators can update member records"
  ON trivia_group_members FOR UPDATE
  USING (
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = get_my_student_id()
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = get_my_student_id()
    )
  );

-- 2. SECURITY DEFINER function to safely add multiple members to a trivia group.
--    This runs as the OWNER (postgres) so it bypasses student RLS,
--    but has explicit permission checks baked in.
CREATE OR REPLACE FUNCTION add_trivia_group_members(
  p_group_id   UUID,
  p_member_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id    UUID;
  v_calling_id    UUID;
  v_session_id    UUID;
  v_member_count  INTEGER;
  v_sid           UUID;
BEGIN
  -- Get the calling student's ID
  SELECT id INTO v_calling_id FROM students WHERE user_id = auth.uid();
  IF v_calling_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: not a student';
  END IF;

  -- Get the group creator
  SELECT created_by, session_id INTO v_creator_id, v_session_id
  FROM trivia_groups WHERE id = p_group_id;
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  -- Only the group creator or the student adding themselves is allowed
  IF v_creator_id != v_calling_id AND NOT (
    array_length(p_member_ids, 1) = 1 AND p_member_ids[1] = v_calling_id
  ) THEN
    RAISE EXCEPTION 'Permission denied: only the group creator can add other members';
  END IF;

  -- Check current member count won't exceed 3
  SELECT COUNT(*) INTO v_member_count
  FROM trivia_group_members WHERE group_id = p_group_id;

  IF v_member_count + array_length(p_member_ids, 1) > 3 THEN
    RAISE EXCEPTION 'Squad is full (max 3 members)';
  END IF;

  -- Insert each member, skip duplicates silently
  FOREACH v_sid IN ARRAY p_member_ids
  LOOP
    -- Skip if already in session (prevents duplicate session membership)
    IF EXISTS (
      SELECT 1 FROM trivia_group_members m
      JOIN trivia_groups g ON m.group_id = g.id
      WHERE g.session_id = v_session_id AND m.student_id = v_sid
        AND m.group_id != p_group_id
    ) THEN
      CONTINUE; -- Already in another group in this session, skip
    END IF;

    INSERT INTO trivia_group_members (group_id, student_id)
    VALUES (p_group_id, v_sid)
    ON CONFLICT (group_id, student_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION add_trivia_group_members(UUID, UUID[]) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260410_fix_trivia_group_members_rls.sql

-- ============================================================
-- BEGIN MIGRATION: 20260411_student_rls_fixes.sql
-- ============================================================
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
-- END MIGRATION: 20260411_student_rls_fixes.sql

-- ============================================================
-- BEGIN MIGRATION: 20260411_teacher_badge_awards.sql
-- ============================================================
-- ==========================================================
-- Teacher Badge Awarding System
-- Extends study_badges so teachers can award achievement
-- badges to students in the classes/subjects they teach.
-- ==========================================================

-- 1. Extend study_badges with teacher-award metadata
ALTER TABLE study_badges
  ADD COLUMN IF NOT EXISTS awarded_by_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS awarded_reason TEXT;

-- 2. Allow teachers to award badges to students in their classes
DROP POLICY IF EXISTS "Teachers award badges to their students" ON study_badges;
CREATE POLICY "Teachers award badges to their students" ON study_badges
  FOR INSERT
  WITH CHECK (
    awarded_by_teacher_id = get_my_teacher_id()
    AND student_id IN (
      SELECT s.id FROM students s
      JOIN teacher_assignments ta ON ta.class_id = s.class_id
      WHERE ta.teacher_id = get_my_teacher_id()
    )
  );

-- 3. Allow teachers to view badges they awarded (for their own records)
DROP POLICY IF EXISTS "Teachers view badges they awarded" ON study_badges;
CREATE POLICY "Teachers view badges they awarded" ON study_badges
  FOR SELECT
  USING (awarded_by_teacher_id = get_my_teacher_id());

-- 4. Allow teachers to delete badges they awarded (undo mistakes)
DROP POLICY IF EXISTS "Teachers delete badges they awarded" ON study_badges;
CREATE POLICY "Teachers delete badges they awarded" ON study_badges
  FOR DELETE
  USING (awarded_by_teacher_id = get_my_teacher_id());

-- 5. RPC: Award a badge and give XP to the student atomically
CREATE OR REPLACE FUNCTION award_student_badge(
  p_student_id UUID,
  p_badge_type TEXT,
  p_awarded_by_teacher_id UUID,
  p_subject_id UUID DEFAULT NULL,
  p_class_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_xp_reward INT DEFAULT 50
)
RETURNS UUID AS $$
DECLARE
  new_badge_id UUID;
BEGIN
  -- Insert the badge
  INSERT INTO study_badges (
    student_id, badge_type, awarded_by_teacher_id,
    subject_id, class_id, awarded_reason, metadata
  )
  VALUES (
    p_student_id, p_badge_type, p_awarded_by_teacher_id,
    p_subject_id, p_class_id, p_reason,
    jsonb_build_object('xp_reward', p_xp_reward, 'awarded_by', p_awarded_by_teacher_id)
  )
  RETURNING id INTO new_badge_id;

  -- Award XP to the student
  UPDATE students
  SET xp = COALESCE(xp, 0) + p_xp_reward
  WHERE id = p_student_id;

  -- Create a notification for the student
  INSERT INTO notifications (user_id, title, body, type)
  SELECT
    s.user_id,
    '🏅 New Badge Earned!',
    'Your teacher awarded you the "' || p_badge_type || '" badge! +' || p_xp_reward || ' XP',
    'award'
  FROM students s
  WHERE s.id = p_student_id AND s.user_id IS NOT NULL;

  RETURN new_badge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reload schema
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260411_teacher_badge_awards.sql

-- ============================================================
-- BEGIN MIGRATION: 20260411_trivia_join_requests.sql
-- ============================================================
-- ============================================================
-- TRIVIA JOIN REQUESTS
-- 
-- System to allow students to request joining a squad,
-- with explicit leader approval required.
-- ============================================================

CREATE TABLE IF NOT EXISTS trivia_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES trivia_sessions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES trivia_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent multiple pending requests to the same group
  UNIQUE(group_id, student_id, status)
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_trivia_join_requests_group ON trivia_join_requests(group_id);
CREATE INDEX idx_trivia_join_requests_student ON trivia_join_requests(student_id);
CREATE INDEX idx_trivia_join_requests_session ON trivia_join_requests(session_id);

-- ── RLS POLICIES ──────────────────────────────────────────────
ALTER TABLE trivia_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students see requests they sent" ON trivia_join_requests;
CREATE POLICY "Students see requests they sent"
  ON trivia_join_requests FOR SELECT
  USING (student_id = get_my_student_id());

DROP POLICY IF EXISTS "Leaders see requests to their group" ON trivia_join_requests;
CREATE POLICY "Leaders see requests to their group"
  ON trivia_join_requests FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = get_my_student_id()
    )
  );

DROP POLICY IF EXISTS "Students can request to join" ON trivia_join_requests;
CREATE POLICY "Students can request to join"
  ON trivia_join_requests FOR INSERT
  WITH CHECK (student_id = get_my_student_id());

DROP POLICY IF EXISTS "Leaders can approve or reject" ON trivia_join_requests;
CREATE POLICY "Leaders can approve or reject"
  ON trivia_join_requests FOR UPDATE
  USING (
    group_id IN (
      SELECT id FROM trivia_groups WHERE created_by = get_my_student_id()
    )
  );

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260411_trivia_join_requests.sql

-- ============================================================
-- BEGIN MIGRATION: 20260412_add_guest_speaker_to_timetables.sql
-- ============================================================
-- Add guest speaker support to timetables for non-staff speakers
ALTER TABLE timetables ADD COLUMN IF NOT EXISTS guest_speaker TEXT;
-- END MIGRATION: 20260412_add_guest_speaker_to_timetables.sql

-- ============================================================
-- BEGIN MIGRATION: 20260412_assignment_locks.sql
-- ============================================================
-- Add lock_after_deadline to assignments
-- This allows teachers to explicitly block submissions after the due date.

ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS lock_after_deadline BOOLEAN DEFAULT FALSE;

-- Ensure RLS is updated (though not strictly necessary as it's a new column)
-- Comments for documentation
COMMENT ON COLUMN assignments.lock_after_deadline IS 'If true, students cannot submit or edit submissions after the due_date has passed.';
-- END MIGRATION: 20260412_assignment_locks.sql

-- ============================================================
-- BEGIN MIGRATION: 20260412_timetable_swaps_cascade_delete.sql
-- ============================================================
-- Drop existing constraints that block teacher deletion
ALTER TABLE timetable_swaps DROP CONSTRAINT IF EXISTS timetable_swaps_requested_by_id_fkey;
ALTER TABLE timetable_swaps DROP CONSTRAINT IF EXISTS timetable_swaps_target_teacher_id_fkey;

-- Re-add constraints with ON DELETE CASCADE
ALTER TABLE timetable_swaps 
    ADD CONSTRAINT timetable_swaps_requested_by_id_fkey 
    FOREIGN KEY (requested_by_id) REFERENCES teachers(id) ON DELETE CASCADE;

ALTER TABLE timetable_swaps 
    ADD CONSTRAINT timetable_swaps_target_teacher_id_fkey 
    FOREIGN KEY (target_teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
-- END MIGRATION: 20260412_timetable_swaps_cascade_delete.sql

-- ============================================================
-- BEGIN MIGRATION: 20260418_ai_learning_logs.sql
-- ============================================================
-- ============================================================
-- AI Learning Logs
-- Tracks what students are asking the AI to teach
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_learning_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for trending discovery
CREATE INDEX IF NOT EXISTS idx_ai_learning_topic ON ai_learning_logs(topic);
CREATE INDEX IF NOT EXISTS idx_ai_learning_curriculum ON ai_learning_logs(curriculum_id);

-- Enable RLS
ALTER TABLE ai_learning_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students can insert their own logs" ON ai_learning_logs
FOR INSERT WITH CHECK (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);

CREATE POLICY "Students can view anonymous trending data" ON ai_learning_logs
FOR SELECT USING (
  curriculum_id = (SELECT curriculum_id FROM students WHERE user_id = auth.uid())
);

CREATE POLICY "Admins view all logs" ON ai_learning_logs
FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
-- END MIGRATION: 20260418_ai_learning_logs.sql

-- ============================================================
-- BEGIN MIGRATION: 20260418_knowledge_base.sql
-- ============================================================
-- ============================================================
-- Peak Performance Tutoring — Knowledge Base System
-- ============================================================

CREATE TABLE IF NOT EXISTS app_knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('vocabulary', 'fact')),
  content JSONB NOT NULL, -- { word, type, def, ex } OR { text }
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE app_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students and staff can view active knowledge"
  ON app_knowledge_base FOR SELECT
  USING (is_active = TRUE OR auth_role() IN ('teacher', 'admin'));

CREATE POLICY "Admins manage knowledge base"
  ON app_knowledge_base FOR ALL
  USING (auth_role() = 'admin');

-- SEED DATA
INSERT INTO app_knowledge_base (category, content) VALUES
('vocabulary', '{"word": "Erudite", "type": "Adj.", "def": "Having or showing great knowledge or learning.", "ex": "Ken could turn any conversation into an erudite discussion."}'),
('vocabulary', '{"word": "Resilient", "type": "Adj.", "def": "Able to withstand or recover quickly from difficult conditions.", "ex": "She is a resilient girl who won''t let failure stop her."}'),
('vocabulary', '{"word": "Diligent", "type": "Adj.", "def": "Having or showing care and conscientiousness in one''s work.", "ex": "Success is the result of diligent effort and persistence."}'),
('vocabulary', '{"word": "Eloquence", "type": "Noun", "def": "Fluent or persuasive speaking or writing.", "ex": "His eloquence moved the entire audience to action."}'),
('vocabulary', '{"word": "Pragmatic", "type": "Adj.", "def": "Dealing with things sensibly and realistically.", "ex": "She took a pragmatic approach to solving the complex problem."}'),
('vocabulary', '{"word": "Superfluous", "type": "Adj.", "def": "Unnecessary, especially through being more than enough.", "ex": "The new rules seem superfluous as the current ones work well."}'),
('vocabulary', '{"word": "Ephemeral", "type": "Adj.", "def": "Lasting for a very short time.", "ex": "Fame in the world of social media is often ephemeral."}'),
('vocabulary', '{"word": "Sycophant", "type": "Noun", "def": "A person who acts obsequiously toward someone important in order to gain advantage.", "ex": "The king was surrounded by sycophants who praised his every move."}'),
('vocabulary', '{"word": "Ubiquitous", "type": "Adj.", "def": "Present, appearing, or found everywhere.", "ex": "Mobile phones have become ubiquitous in today''s society."}'),
('vocabulary', '{"word": "Venerable", "type": "Adj.", "def": "Accorded a great deal of respect, especially because of age, wisdom, or character.", "ex": "The venerable professor was retired after 40 years of service."}'),
('vocabulary', '{"word": "Altruistic", "type": "Adj.", "def": "Showing a disinterested and selfless concern for the well-being of others.", "ex": "His altruistic efforts helped raise millions for the charity."}'),
('vocabulary', '{"word": "Capricious", "type": "Adj.", "def": "Given to sudden and unaccountable changes of mood or behavior.", "ex": "The weather in this region is notoriously capricious."}'),
('vocabulary', '{"word": "Enervate", "type": "Verb", "def": "To cause (someone) to feel drained of energy or vitality.", "ex": "The blazing heat enervated the hikers as they climbed."}'),
('vocabulary', '{"word": "Fastidious", "type": "Adj.", "def": "Very attentive to and concerned about accuracy and detail.", "ex": "He is fastidious about keeping his workspace perfectly organized."}'),
('vocabulary', '{"word": "Garrulous", "type": "Adj.", "def": "Excessively talkative, especially on trivial matters.", "ex": "The garrulous neighbor kept me at the door for an hour."}'),
('vocabulary', '{"word": "Impetuous", "type": "Adj.", "def": "Acting or done quickly and without thought or care.", "ex": "Her impetuous decision to quit her job surprised everyone."}'),
('vocabulary', '{"word": "Lethargic", "type": "Adj.", "def": "Affected by lethargy; sluggish and apathetic.", "ex": "After the heavy meal, I felt lethargic and wanted to nap."}'),
('vocabulary', '{"word": "Meticulous", "type": "Adj.", "def": "Showing great attention to detail; very careful and precise.", "ex": "She was meticulous in her research, checking every source twice."}'),
('vocabulary', '{"word": "Nefarious", "type": "Adj.", "def": "Wicked or criminal (typically of an action or activity).", "ex": "The hacker''s nefarious activities were finally stopped by the police."}'),
('vocabulary', '{"word": "Obsequious", "type": "Adj.", "def": "Obedient or attentive to an excessive or servile degree.", "ex": "The attendants were obsequious, anticipating every whim of the VIP."}'),
('fact', '{"text": "The human brain has enough memory to hold about 2.5 petabytes of information—roughly 3 million hours of TV!"}'),
('fact', '{"text": "Regular activity can improve cognitive skills by increasing oxygen to the brain."}'),
('fact', '{"text": "The Library of Alexandria was one of the largest and most significant libraries of the ancient world."}'),
('fact', '{"text": "A group of flamingos is called a ''flamboyance''. Nature is full of art!"}'),
('fact', '{"text": "The Eiffel Tower can be 15 cm taller during the summer due to thermal expansion."}'),
('fact', '{"text": "Octopuses have three hearts and blue blood. Amazing!"}'),
('fact', '{"text": "Hot water will turn into ice faster than cold water (The Mpemba effect)."}'),
('fact', '{"text": "The shortest war in history lasted 38 to 45 minutes between Britain and Zanzibar in 1896."}'),
('fact', '{"text": "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are 3000 years old!"}'),
('fact', '{"text": "Bananas are berries, but strawberries are not. Taxonomy can be surprising!"}'),
('fact', '{"text": "Venus is the hottest planet in our solar system, with a surface temperature of about 465°C."}'),
('fact', '{"text": "Trees communicate and share nutrients through an underground network of fungi."}'),
('fact', '{"text": "The dot over the letter ''i'' and ''j'' is called a ''tittle''."}'),
('fact', '{"text": "A ''jiffy'' is an actual unit of time for 1/100th of a second."}'),
('fact', '{"text": "There are more possible iterations of a game of chess than there are atoms in the known universe."}'),
('fact', '{"text": "Wombat poop is cube-shaped to stop it from rolling away. Pure engineering!"}'),
('fact', '{"text": "Mount Everest is 29,032 feet tall, and it''s still growing at about partial inches per year."}'),
('fact', '{"text": "Cleopatra lived closer to the moon landing than to the building of the Great Pyramid."}'),
('fact', '{"text": "Glitter was invented by a cattle rancher in New Jersey in 1934."}'),
('fact', '{"text": "A bolt of lightning contains enough energy to toast 100,000 slices of bread."}');
-- END MIGRATION: 20260418_knowledge_base.sql

-- ============================================================
-- BEGIN MIGRATION: 20260418_peak_library_final.sql
-- ============================================================
-- ============================================================
-- Peak Performance Tutoring — Peak Library System
-- ============================================================

-- ── ENUMS ──────────────────────────────────────────────────
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'library_category') THEN
        CREATE TYPE library_category AS ENUM (
            'Communication', 'Money', 'Self-worth', 'Mindset', 'Working Smart', 'Leadership', 'Other'
        );
    END IF;
END $$;

-- ── LIBRARY BOOKS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT, -- Google Books ID
  title TEXT NOT NULL,
  author TEXT,
  cover_url TEXT,
  description TEXT,
  pdf_url TEXT, -- Shared storage link
  category library_category DEFAULT 'Mindset',
  importance TEXT, -- "Why this matters"
  benefits TEXT,   -- "Benefits of reading"
  relevance TEXT,  -- "Peak relevance"
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── STUDENT PROGRESS & REFLECTION ──────────────────────────
CREATE TABLE IF NOT EXISTS library_student_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'reading' CHECK (status IN ('want_to_read', 'reading', 'finished')),
  progress_percent INTEGER DEFAULT 0,
  reflection_text TEXT,
  ai_feedback TEXT,
  bonus_xp_awarded INTEGER DEFAULT 0,
  is_finished BOOLEAN DEFAULT FALSE,
  finished_at TIMESTAMPTZ,
  last_page INTEGER DEFAULT 1,
  last_position_percent FLOAT DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, book_id)
);

-- ── STORAGE BUCKET ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) 
VALUES ('library-books', 'library-books', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage
DROP POLICY IF EXISTS "Library books are public" ON storage.objects;
CREATE POLICY "Library books are public" 
ON storage.objects FOR SELECT USING (bucket_id = 'library-books');

DROP POLICY IF EXISTS "Admins can upload library books" ON storage.objects;
CREATE POLICY "Admins can upload library books" 
ON storage.objects FOR ALL USING (bucket_id = 'library-books');

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published library books"
  ON library_books FOR SELECT
  USING (is_published = TRUE OR auth_role() = 'admin');

CREATE POLICY "Admins manage library books"
  ON library_books FOR ALL
  USING (auth_role() = 'admin');

CREATE POLICY "Students manage their own library progress"
  ON library_student_progress FOR ALL
  USING (student_id = get_my_student_id() OR auth_role() = 'admin');

-- ── TRIGGER FOR UPDATED_AT ─────────────────────────────────
CREATE TRIGGER trg_library_books_updated
  BEFORE UPDATE ON library_books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_library_student_progress_updated
  BEFORE UPDATE ON library_student_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- END MIGRATION: 20260418_peak_library_final.sql

-- ============================================================
-- BEGIN MIGRATION: 20260418_resource_storage_fix.sql
-- ============================================================
-- ============================================================
-- STORAGE POLICY FIX: resource-uploads
-- ============================================================

-- 1. Ensure bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'resource-uploads';

-- 2. Refine SELECT policy
DROP POLICY IF EXISTS "Resources are publicly accessible." ON storage.objects;
CREATE POLICY "Resources are publicly accessible." 
ON storage.objects FOR SELECT USING (bucket_id = 'resource-uploads');

-- 3. Refine INSERT policy (The likely cause of the error)
-- We must check bucket_id explicitly and ensure it matches 'resource-uploads'
DROP POLICY IF EXISTS "Authenticated users can upload resources." ON storage.objects;
CREATE POLICY "Authenticated users can upload resources." 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'resource-uploads' 
    AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);

-- 4. Enable DELETE for owners/admins
DROP POLICY IF EXISTS "Authenticated users can delete resources." ON storage.objects;
CREATE POLICY "Authenticated users can delete resources." 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'resource-uploads' 
    AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
);
-- END MIGRATION: 20260418_resource_storage_fix.sql

-- ============================================================
-- BEGIN MIGRATION: 20260419_leaderboard_rpcs.sql
-- ============================================================
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
-- END MIGRATION: 20260419_leaderboard_rpcs.sql

-- ============================================================
-- BEGIN MIGRATION: 20260420_admin_credentials.sql
-- ============================================================
-- ============================================================
-- ADMIN CREDENTIAL SYSTEM INFRASTRUCTURE
-- ============================================================

-- 1. Extend existing tables with normalization
ALTER TABLE students ADD COLUMN IF NOT EXISTS normalized_name TEXT;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- 2. Create normalization function
CREATE OR REPLACE FUNCTION normalize_name(name TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN lower(trim(regexp_replace(name, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql;

-- 3. Populate existing data
UPDATE students SET normalized_name = normalize_name(full_name) WHERE normalized_name IS NULL;
UPDATE event_registrations SET normalized_name = normalize_name(student_name) WHERE normalized_name IS NULL;

-- 4. Create Triggers for automatic normalization
CREATE OR REPLACE FUNCTION trigger_normalize_student_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_name := normalize_name(NEW.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_normalize_student_name
BEFORE INSERT OR UPDATE OF full_name ON students
FOR EACH ROW EXECUTE FUNCTION trigger_normalize_student_name();

CREATE OR REPLACE FUNCTION trigger_normalize_registration_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_name := normalize_name(NEW.student_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_normalize_registration_name
BEFORE INSERT OR UPDATE OF student_name ON event_registrations
FOR EACH ROW EXECUTE FUNCTION trigger_normalize_registration_name();

-- 5. Create Batch & Credential Tables
CREATE TABLE IF NOT EXISTS credential_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_processed   INT NOT NULL DEFAULT 0,
  total_created     INT NOT NULL DEFAULT 0,
  total_linked      INT NOT NULL DEFAULT 0,
  total_flagged     INT NOT NULL DEFAULT 0,
  image_url         TEXT,
  pdf_url           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_credentials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  batch_id          UUID NOT NULL REFERENCES credential_batches(id) ON DELETE CASCADE,
  plain_password    TEXT NOT NULL, -- Stored temporarily for batch generation
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS duplicate_flags (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id   UUID NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
  possible_matches  JSONB NOT NULL, -- Array of student records
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_students_normalized_name ON students(normalized_name);
CREATE INDEX IF NOT EXISTS idx_event_reg_normalized_name ON event_registrations(normalized_name);
CREATE INDEX IF NOT EXISTS idx_gen_credentials_batch ON generated_credentials(batch_id);
CREATE INDEX IF NOT EXISTS idx_dup_flags_reg ON duplicate_flags(registration_id);

-- 7. RLS Policies
ALTER TABLE credential_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_full_access_batches" ON credential_batches FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "admins_full_access_gen_creds" ON generated_credentials FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "admins_full_access_dup_flags" ON duplicate_flags FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 8. Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('credentials', 'credentials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin_full_access_credentials" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'credentials' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (bucket_id = 'credentials' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
-- END MIGRATION: 20260420_admin_credentials.sql

-- ============================================================
-- BEGIN MIGRATION: 20260421_add_failed_count_to_batches.sql
-- ============================================================
-- Add total_failed column to credential_batches
ALTER TABLE credential_batches ADD COLUMN IF NOT EXISTS total_failed INT NOT NULL DEFAULT 0;
-- END MIGRATION: 20260421_add_failed_count_to_batches.sql

-- ============================================================
-- BEGIN MIGRATION: 20260421_registration_attendance.sql
-- ============================================================
-- ============================================================
-- REGISTRATION-BASED ATTENDANCE
-- ============================================================

-- 1. Add registration_id column
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES event_registrations(id) ON DELETE CASCADE;

-- 2. Make student_id nullable
ALTER TABLE attendance ALTER COLUMN student_id DROP NOT NULL;

-- 3. Populate registration_id for existing records
-- We match by student_id and tuition_event_id
UPDATE attendance a
SET registration_id = er.id
FROM event_registrations er
WHERE a.student_id = er.student_id 
  AND a.tuition_event_id = er.tuition_event_id
  AND a.registration_id IS NULL;

-- 4. Handle records that might not have a matching registration (edge case)
-- If we can't find a registration, we might want to create a 'skeleton' registration 
-- or just leave them (they won't show up in the new UI anyway).
-- Recommendation: All students *should* be in registrations for the event.

-- 5. Update Unique Constraint
-- Drop existing (student_id, tuition_event_id, date)
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_tuition_event_id_date_key;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_tuition_event_id_key;

-- Add new (registration_id, date) constraint
-- Every registration can only have one attendance record per date.
ALTER TABLE attendance ADD CONSTRAINT attendance_registration_date_unique UNIQUE (registration_id, date);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_registration ON attendance(registration_id);
-- END MIGRATION: 20260421_registration_attendance.sql

-- ============================================================
-- BEGIN MIGRATION: 20260422_teacher_transcript_rls.sql
-- ============================================================
-- Allow teachers to manage transcripts for students in classes they are assigned to
CREATE POLICY "Teacher manage transcripts for assigned students" ON transcripts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM students s
    JOIN teacher_assignments ta ON s.class_id = ta.class_id
    WHERE s.id = transcripts.student_id
    AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM students s
    JOIN teacher_assignments ta ON s.class_id = ta.class_id
    WHERE s.id = transcripts.student_id
    AND ta.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  )
);
-- END MIGRATION: 20260422_teacher_transcript_rls.sql

-- ============================================================
-- BEGIN MIGRATION: 20260423_backfill_cbc_subjects.sql
-- ============================================================
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
-- END MIGRATION: 20260423_backfill_cbc_subjects.sql

-- ============================================================
-- BEGIN MIGRATION: 20260423_brand_config_expansion.sql
-- ============================================================
-- Expansion of transcript_config to support advanced branding and signatures
ALTER TABLE transcript_config 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS stamp_url TEXT,
ADD COLUMN IF NOT EXISTS signature_data TEXT,
ADD COLUMN IF NOT EXISTS signature_type TEXT DEFAULT 'draw',
ADD COLUMN IF NOT EXISTS signature_font TEXT,
ADD COLUMN IF NOT EXISTS apply_transcripts BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS apply_certificates BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS apply_badges BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS director_name TEXT DEFAULT 'Director General';

-- Ensure at least one row exists
INSERT INTO transcript_config (id, school_name, director_name)
SELECT uuid_generate_v4(), 'Peak Performance Tutoring', 'Director General'
WHERE NOT EXISTS (SELECT 1 FROM transcript_config);

-- Create a storage bucket for branding if it doesn't exist
-- Note: In a real Supabase environment (SQL Editor), we'd use the storage API, 
-- but we can insert into storage.buckets if permissions allow or handled via UI.
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for branding bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'branding' AND (SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text) = 'admin');
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE USING (bucket_id = 'branding' AND (SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text) = 'admin');
-- END MIGRATION: 20260423_brand_config_expansion.sql

-- ============================================================
-- BEGIN MIGRATION: 20260424_exam_marks_progress.sql
-- ============================================================
-- Add progress_summary to exam_marks to allow for qualitative feedback without numeric marks
ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS progress_summary TEXT;

-- Update transcripts generation to potentially use this
-- Add progress_summary to the JSONB structure if needed, but we'll handled it in code
-- END MIGRATION: 20260424_exam_marks_progress.sql

-- ============================================================
-- BEGIN MIGRATION: 20260430_add_room_name_to_live_sessions.sql
-- ============================================================
-- Ensure live_sessions table has all required columns for the new Studio engine
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS room_name TEXT;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS duration_mins INTEGER DEFAULT 60;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'subject';

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_live_sessions_room_name ON live_sessions(room_name);
-- END MIGRATION: 20260430_add_room_name_to_live_sessions.sql

-- ============================================================
-- BEGIN MIGRATION: 20260430_fix_live_sessions_rls_recursion.sql
-- ============================================================
-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Teachers can manage their own live sessions" ON live_sessions;
DROP POLICY IF EXISTS "Students can view live sessions for their class" ON live_sessions;
DROP POLICY IF EXISTS "Anyone can view live sessions" ON live_sessions;
DROP POLICY IF EXISTS "Teachers can insert their own live sessions" ON live_sessions;

-- 2. Create optimized, non-recursive policies
-- Use direct user_id comparison where possible to avoid recursion depth issues

-- TEACHERS: Can manage sessions they created
CREATE POLICY "Teachers can manage own sessions" ON live_sessions
FOR ALL
TO authenticated
USING (
  teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
);

-- STUDENTS: Can view sessions for their center and class
CREATE POLICY "Students can view relevant sessions" ON live_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM students 
    WHERE students.user_id = auth.uid()
    AND students.class_id = live_sessions.class_id
    AND students.tuition_center_id = live_sessions.tuition_center_id
  )
);

-- ADMINS: Full access
CREATE POLICY "Admins have full access to live sessions" ON live_sessions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
-- END MIGRATION: 20260430_fix_live_sessions_rls_recursion.sql

-- ============================================================
-- BEGIN MIGRATION: 20260430_fix_outcomes_rls.sql
-- ============================================================
-- Fix for live_session_outcomes recursion
DROP POLICY IF EXISTS "Teachers can manage outcomes for their sessions" ON live_session_outcomes;
DROP POLICY IF EXISTS "Students can view outcomes for their sessions" ON live_session_outcomes;

CREATE POLICY "Teachers can manage outcomes" ON live_session_outcomes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions
    JOIN teachers ON live_sessions.teacher_id = teachers.id
    WHERE live_sessions.id = live_session_outcomes.session_id
    AND teachers.user_id = auth.uid()
  )
);

CREATE POLICY "Students can view outcomes" ON live_session_outcomes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_sessions
    JOIN students ON live_sessions.class_id = students.class_id
    WHERE live_sessions.id = live_session_outcomes.session_id
    AND students.user_id = auth.uid()
  )
);
-- END MIGRATION: 20260430_fix_outcomes_rls.sql

-- ============================================================
-- BEGIN MIGRATION: 20260513_live_session_reflections.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS live_session_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reflection_text TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 4 CHECK (confidence BETWEEN 1 AND 5),
  mastery_score INTEGER NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

ALTER TABLE live_session_reflections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own live reflections" ON live_session_reflections;
CREATE POLICY "Students manage own live reflections" ON live_session_reflections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = live_session_reflections.student_id
      AND students.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = live_session_reflections.student_id
      AND students.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Teachers view reflections for own sessions" ON live_session_reflections;
CREATE POLICY "Teachers view reflections for own sessions" ON live_session_reflections
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM live_sessions
    JOIN teachers ON teachers.id = live_sessions.teacher_id
    WHERE live_sessions.id = live_session_reflections.session_id
      AND teachers.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_live_session_reflections_session_id ON live_session_reflections(session_id);
CREATE INDEX IF NOT EXISTS idx_live_session_reflections_student_id ON live_session_reflections(student_id);
-- END MIGRATION: 20260513_live_session_reflections.sql

-- ============================================================
-- BEGIN MIGRATION: 20260514_live_session_realtime_backbone.sql
-- ============================================================
-- Realtime backbone for live classroom chat and whiteboard recovery.
-- LiveKit data channels remain the low-latency path; these tables make chat
-- and board state survive missed packets, refreshes, and late joins.

CREATE TABLE IF NOT EXISTS live_session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL DEFAULT 'Participant',
  sender_role TEXT NOT NULL CHECK (sender_role IN ('teacher', 'student')),
  message TEXT NOT NULL CHECK (length(trim(message)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_session_messages_session_created
  ON live_session_messages(session_id, created_at);

ALTER TABLE live_session_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view live session messages" ON live_session_messages;
CREATE POLICY "Participants view live session messages" ON live_session_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM live_sessions
      LEFT JOIN teachers ON teachers.id = live_sessions.teacher_id
      LEFT JOIN students ON students.class_id = live_sessions.class_id
        AND students.tuition_center_id = live_sessions.tuition_center_id
      WHERE live_sessions.id = live_session_messages.session_id
        AND (teachers.user_id = auth.uid() OR students.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants send live session messages" ON live_session_messages;
CREATE POLICY "Participants send live session messages" ON live_session_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM live_sessions
      LEFT JOIN teachers ON teachers.id = live_sessions.teacher_id
      LEFT JOIN students ON students.class_id = live_sessions.class_id
        AND students.tuition_center_id = live_sessions.tuition_center_id
      WHERE live_sessions.id = live_session_messages.session_id
        AND (teachers.user_id = auth.uid() OR students.user_id = auth.uid())
    )
  );

CREATE TABLE IF NOT EXISTS live_session_whiteboards (
  session_id UUID PRIMARY KEY REFERENCES live_sessions(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE live_session_whiteboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view live session whiteboard" ON live_session_whiteboards;
CREATE POLICY "Participants view live session whiteboard" ON live_session_whiteboards
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM live_sessions
      LEFT JOIN teachers ON teachers.id = live_sessions.teacher_id
      LEFT JOIN students ON students.class_id = live_sessions.class_id
        AND students.tuition_center_id = live_sessions.tuition_center_id
      WHERE live_sessions.id = live_session_whiteboards.session_id
        AND (teachers.user_id = auth.uid() OR students.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers manage live session whiteboard" ON live_session_whiteboards;
CREATE POLICY "Teachers manage live session whiteboard" ON live_session_whiteboards
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM live_sessions
      JOIN teachers ON teachers.id = live_sessions.teacher_id
      WHERE live_sessions.id = live_session_whiteboards.session_id
        AND teachers.user_id = auth.uid()
    )
  )
  WITH CHECK (
    updated_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM live_sessions
      JOIN teachers ON teachers.id = live_sessions.teacher_id
      WHERE live_sessions.id = live_session_whiteboards.session_id
        AND teachers.user_id = auth.uid()
    )
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE live_session_messages;
EXCEPTION
  WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE live_session_whiteboards;
EXCEPTION
  WHEN duplicate_object OR undefined_object THEN NULL;
END $$;
-- END MIGRATION: 20260514_live_session_realtime_backbone.sql

-- ============================================================
-- BEGIN MIGRATION: 20260514_fix_live_session_rls.sql
-- ============================================================
-- Fix overly-strict RLS policies for live_session_messages and live_session_whiteboards.
-- The previous policies required students.tuition_center_id = live_sessions.tuition_center_id,
-- which fails when the column is NULL or the student wasn't associated with a tuition center.
-- We now only require class membership (which is the real authorization signal).

-- ─────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────

DROP POLICY IF EXISTS "Participants view live session messages" ON live_session_messages;
DROP POLICY IF EXISTS "Participants send live session messages" ON live_session_messages;

CREATE POLICY "Participants view live session messages" ON live_session_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_session_messages.session_id
        AND (
          -- Teacher owns the session
          EXISTS (
            SELECT 1 FROM teachers
            WHERE teachers.id = live_sessions.teacher_id
              AND teachers.user_id = auth.uid()
          )
          OR
          -- Student is in the session's class
          EXISTS (
            SELECT 1 FROM students
            WHERE students.class_id = live_sessions.class_id
              AND students.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Participants send live session messages" ON live_session_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_session_messages.session_id
        AND (
          EXISTS (
            SELECT 1 FROM teachers
            WHERE teachers.id = live_sessions.teacher_id
              AND teachers.user_id = auth.uid()
          )
          OR
          EXISTS (
            SELECT 1 FROM students
            WHERE students.class_id = live_sessions.class_id
              AND students.user_id = auth.uid()
          )
        )
    )
  );

-- ─────────────────────────────────────────────
-- WHITEBOARD
-- ─────────────────────────────────────────────

DROP POLICY IF EXISTS "Participants view live session whiteboard" ON live_session_whiteboards;

CREATE POLICY "Participants view live session whiteboard" ON live_session_whiteboards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_session_whiteboards.session_id
        AND (
          EXISTS (
            SELECT 1 FROM teachers
            WHERE teachers.id = live_sessions.teacher_id
              AND teachers.user_id = auth.uid()
          )
          OR
          EXISTS (
            SELECT 1 FROM students
            WHERE students.class_id = live_sessions.class_id
              AND students.user_id = auth.uid()
          )
        )
    )
  );

-- ─────────────────────────────────────────────
-- Ensure realtime is enabled on both tables
-- ─────────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE live_session_messages;
EXCEPTION
  WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE live_session_whiteboards;
EXCEPTION
  WHEN duplicate_object OR undefined_object THEN NULL;
END $$;
-- END MIGRATION: 20260514_fix_live_session_rls.sql

-- ============================================================
-- BEGIN MIGRATION: 20260515_restore_storage_policy_safety.sql
-- ============================================================
-- ============================================================
-- Final storage policy safety pass for full restores
--
-- Older migrations reused generic policy names on storage.objects.
-- Because policies are table-scoped, this final pass gives every
-- bucket its own stable policy name.
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('assignment-uploads', 'assignment-uploads', true),
  ('resource-uploads', 'resource-uploads', true),
  ('teacher-resources', 'teacher-resources', true),
  ('quiz-media', 'quiz-media', true),
  ('library-books', 'library-books', true),
  ('credentials', 'credentials', true),
  ('branding', 'branding', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;
DROP POLICY IF EXISTS "Teacher & Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Creator Manage" ON storage.objects;
DROP POLICY IF EXISTS "Resources are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload resources." ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete resources." ON storage.objects;
DROP POLICY IF EXISTS "Teacher resources are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload teacher resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users delete teacher resources" ON storage.objects;

DROP POLICY IF EXISTS "storage_public_read_app_buckets" ON storage.objects;
CREATE POLICY "storage_public_read_app_buckets" ON storage.objects
  FOR SELECT
  USING (
    bucket_id IN (
      'avatars',
      'assignment-uploads',
      'resource-uploads',
      'teacher-resources',
      'quiz-media',
      'library-books',
      'credentials',
      'branding'
    )
  );

DROP POLICY IF EXISTS "storage_authenticated_upload_app_buckets" ON storage.objects;
CREATE POLICY "storage_authenticated_upload_app_buckets" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id IN (
      'avatars',
      'assignment-uploads',
      'resource-uploads',
      'teacher-resources',
      'quiz-media',
      'library-books',
      'branding'
    )
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "storage_authenticated_update_app_buckets" ON storage.objects;
CREATE POLICY "storage_authenticated_update_app_buckets" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id IN (
      'avatars',
      'assignment-uploads',
      'resource-uploads',
      'teacher-resources',
      'quiz-media',
      'library-books',
      'branding'
    )
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id IN (
      'avatars',
      'assignment-uploads',
      'resource-uploads',
      'teacher-resources',
      'quiz-media',
      'library-books',
      'branding'
    )
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "storage_authenticated_delete_app_buckets" ON storage.objects;
CREATE POLICY "storage_authenticated_delete_app_buckets" ON storage.objects
  FOR DELETE
  USING (
    bucket_id IN (
      'assignment-uploads',
      'resource-uploads',
      'teacher-resources',
      'quiz-media',
      'library-books',
      'branding'
    )
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "storage_admin_manage_credentials" ON storage.objects;
CREATE POLICY "storage_admin_manage_credentials" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'credentials'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'credentials'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
-- END MIGRATION: 20260515_restore_storage_policy_safety.sql

-- ============================================================
-- Restore script complete.
-- After running: update .env.local with the new project URL and keys,
-- then create at least one admin user in Supabase Auth.
-- ============================================================
