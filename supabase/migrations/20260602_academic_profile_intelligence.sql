-- Academic Profile Intelligence Schema
-- Tracks per-student performance, errors, toasts, and notifications

-- 1. Student Academic Profiles (one row per student, JSONB for flexibility)
CREATE TABLE IF NOT EXISTS student_academic_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profile_data structure:
-- {
--   "subjects": {
--     "subject_name": {
--       "status": "critical|developing|strong|uncovered",
--       "trajectory": "improving|plateauing|declining|volatile",
--       "topics": {
--         "topic_name": {
--           "status": "critical|developing|strong|uncovered",
--           "trajectory": "improving|plateauing|declining|volatile",
--           "avg_score": 65,
--           "attempts": 5,
--           "last_tested": "2026-05-20T10:00:00Z"
--         }
--       }
--     }
--   },
--   "error_profile": {
--     "conceptual": [{ "subject": "Biology", "topic": "Osmosis", "count": 3 }],
--     "procedural": [],
--     "careless": [],
--     "omission": []
--   },
--   "engagement": {
--     "sessions_7d": 4,
--     "sessions_30d": 12,
--     "subjects_initiated": ["Math", "Chemistry"],
--     "subjects_avoided": ["English"],
--     "avg_return_frequency_days": 2.5
--   }
-- }

-- 2. Student Error Log (individual error events for pattern detection)
CREATE TABLE IF NOT EXISTS student_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('peak_session', 'assignment', 'quiz', 'exam')),
  source_id TEXT,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  error_type TEXT NOT NULL CHECK (error_type IN ('conceptual', 'procedural', 'careless', 'omission')),
  description TEXT,
  score_on_attempt NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_log_student ON student_error_log(student_id);
CREATE INDEX IF NOT EXISTS idx_error_log_subject_topic ON student_error_log(student_id, subject, topic);

-- 3. Student Toast Log (in-session toasts delivered)
CREATE TABLE IF NOT EXISTS student_toast_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  toast_type TEXT NOT NULL,
  toast_text TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_toast_log_student ON student_toast_log(student_id);

-- 4. Academic Notifications (between-session)
CREATE TABLE IF NOT EXISTS student_academic_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_text TEXT,
  action_data JSONB DEFAULT '{}'::jsonb,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academic_notif_student ON student_academic_notifications(student_id, sent_at);

-- Enable RLS
ALTER TABLE student_academic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_toast_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_academic_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: students see own data, admins see all
CREATE POLICY "Students view own profile" ON student_academic_profiles
  FOR SELECT USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()) OR auth_role() = 'admin');

CREATE POLICY "Students view own errors" ON student_error_log
  FOR SELECT USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()) OR auth_role() = 'admin');

CREATE POLICY "Students view own toasts" ON student_toast_log
  FOR SELECT USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()) OR auth_role() = 'admin');

CREATE POLICY "Students view own notifications" ON student_academic_notifications
  FOR SELECT USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()) OR auth_role() = 'admin');

-- Allow service_role insert
GRANT ALL ON student_academic_profiles TO service_role;
GRANT ALL ON student_error_log TO service_role;
GRANT ALL ON student_toast_log TO service_role;
GRANT ALL ON student_academic_notifications TO service_role;
