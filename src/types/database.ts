// Supabase Database Types — generated from schema
export type UserRole = 'admin' | 'teacher' | 'student' | 'parent'

export type Theme =
  | 'midnight-scholar'
  | 'royal-indigo'
  | 'emerald-focus'
  | 'solar-gold'
  | 'ocean-depth'
  | 'arctic-frost'
  | 'crimson-elite'
  | 'lavender-dream'
  | 'forest-intelligence'
  | 'cyber-blue'
  | 'graphite-pro'
  | 'sunrise-energy'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  phone?: string
  theme: Theme
  has_onboarded?: boolean
  onboarding_skipped?: boolean
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  user_id?: string
  admission_number: string
  full_name: string
  class_id: string
  curriculum_id: string
  school_name?: string
  parent_id?: string
  temp_password?: string
  onboarded: boolean
  registered_for_event_id?: string
  created_by_admin: boolean
  xp: number
  last_login_xp_at?: string
  streak_count: number
  last_active_at?: string
  created_at: string
  updated_at: string
  // joins
  class?: Class
  curriculum?: Curriculum
  parent?: Parent
  subjects?: Subject[]
}

export interface Parent {
  id: string
  user_id: string
  parent_code: string // e.g. PR-902114
  full_name: string
  email: string
  phone?: string
  security_pin?: string
  created_at: string
  // joins
  students?: Student[]
}

export interface Teacher {
  id: string
  user_id: string
  full_name: string
  email: string
  phone?: string
  avatar_url?: string
  onboarded: boolean
  created_at: string
  // joins
  curricula?: Curriculum[]
  assigned_classes?: Class[]
  assigned_subjects?: Subject[]
  is_class_teacher?: boolean
  class_teacher_for?: Class
}

export interface TeacherCurriculum {
  id: string
  teacher_id: string
  curriculum_id: string
}

export interface TeacherClassPreference {
  id: string
  teacher_id: string
  class_id: string
  curriculum_id: string
}

export interface TeacherSubjectPreference {
  id: string
  teacher_id: string
  subject_id: string
  class_id: string
}

export interface Curriculum {
  id: string
  name: string // e.g. 8-4-8, IGCSE, KCSE
  description?: string
  created_at: string
  // joins
  classes?: Class[]
}

export interface Class {
  id: string
  curriculum_id: string
  name: string // e.g. Form 1, Grade 7
  level: number
  created_at: string
  // joins
  curriculum?: Curriculum
  subjects?: Subject[]
}

export interface Subject {
  id: string
  class_id: string
  curriculum_id: string
  name: string // e.g. Math, English
  code: string // e.g. MATH-01
  category?: string // e.g. Sciences
  created_at: string
  // joins
  class?: Class
  curriculum?: Curriculum
}

export interface TeacherAssignment {
  id: string
  teacher_id: string
  class_id: string
  subject_id: string
  is_class_teacher: boolean
  tuition_event_id?: string
  created_at: string
  // joins
  teacher?: Teacher
  class?: Class
  subject?: Subject
}

export interface TuitionEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  active_days: string[] // ['monday','tuesday','wednesday','thursday','friday']
  attendance_threshold: number // e.g. 80
  is_active: boolean
  status: 'upcoming' | 'active' | 'postponed' | 'cancelled' | 'ended'
  postponed_to?: string
  curriculum_id?: string
  description?: string
  created_at: string
  updated_at: string
}

export interface ExamEvent {
  id: string
  tuition_event_id: string
  curriculum_id?: string // NULL = All Curriculums
  target_class_ids?: string[] // NULL/Empty = All Classes in curriculum
  name: string
  start_date: string
  end_date: string
  status: 'upcoming' | 'active' | 'finalized' | 'closed' | 'cancelled' | 'ended' | 'generated' | 'published'
  created_at: string
  // joins
  tuition_event?: TuitionEvent
  curriculum?: Curriculum
  total_candidates?: number
}

export interface GradingSystem {
  id: string
  curriculum_id: string
  subject_id?: string // null = applies to all subjects in curriculum
  class_id?: string // null = applies to all classes in curriculum (e.g. CBC)
  name: string
  is_default: boolean,
  is_overall?: boolean,
  created_at: string
  // joins
  curriculum?: Curriculum
  subject?: Subject
  class?: Class
  scales?: GradingScale[]
}

export interface GradingScale {
  id: string
  grading_system_id: string
  grade: string // e.g. A, EE
  min_score: number
  max_score: number
  points?: number
  remarks?: string
  created_at: string
}

export interface GradeBand {
  grade: string // e.g. A, B+, C
  min_mark: number
  max_mark: number
  points?: number
  remark?: string
}

export interface Timetable {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string
  day: string // Monday, Tuesday ...
  start_time: string // HH:MM
  end_time: string
  tuition_event_id: string
  room_number?: string
  created_at: string
  // joins
  class?: Class
  subject?: Subject
  teacher?: Teacher
}

export interface Attendance {
  id: string
  student_id: string
  class_id: string
  tuition_event_id: string
  teacher_id?: string
  marked_by?: string
  date: string // ISO date
  week_number?: number
  status: 'present' | 'absent' | 'late' | 'excused'
  notes?: string
  present?: boolean // deprecated but kept for backwards compatibility
  created_at: string
}

export type AssignmentStatus = 'draft' | 'published' | 'closed'
export type AssignmentAudience = 'class' | 'subject' | 'selected_students' | 'group'

export interface Assignment {
  id: string
  teacher_id: string
  class_id: string
  subject_id: string
  title: string
  description?: string
  content: string // TipTap JSON
  audience: AssignmentAudience
  selected_student_ids?: string[]
  status: AssignmentStatus
  due_date?: string
  max_marks?: number
  tuition_event_id?: string
  created_at: string
  updated_at: string
  // joins
  teacher?: Teacher
  class?: Class
  subject?: Subject
  submissions?: Submission[]
}

export type SubmissionStatus = 'not_started' | 'in_progress' | 'submitted' | 'marked' | 'returned'

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  content?: string // TipTap JSON answer
  status: SubmissionStatus
  marks?: number
  grade?: string
  feedback?: string
  strengths?: string
  weaknesses?: string
  submitted_at?: string
  marked_at?: string
  returned_at?: string
  created_at: string
  // joins
  student?: Student
  assignment?: Assignment
  annotations?: Annotation[]
}

export interface Annotation {
  id: string
  submission_id: string
  teacher_id: string
  canvas_state_json: string // Fabric.js JSON
  created_at: string
  updated_at: string
}

export interface Quiz {
  id: string
  teacher_id: string
  class_id: string
  subject_id?: string
  title: string
  description?: string
  questions: QuizQuestion[]
  duration_minutes?: number
  is_published: boolean
  tuition_event_id?: string
  created_at: string
  // joins
  attempts?: QuizAttempt[]
}

export interface QuizQuestion {
  id: string
  type: 'mcq' | 'short_answer' | 'true_false'
  question: string
  options?: string[]
  correct_answer: string
  marks: number
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  student_id: string
  answers: Record<string, string>
  score: number
  total_marks: number
  percentage: number
  completed_at: string
  time_taken_seconds?: number
  // joins
  student?: Student
}

export interface Payment {
  id: string
  student_id: string
  tuition_event_id: string
  amount: number
  currency: string
  payment_date: string
  method: string // Cash, MPESA, Bank Transfer
  reference?: string
  notes?: string
  receipt_number: string
  created_by: string // admin user_id
  created_at: string
  // joins
  student?: Student
  tuition_event?: TuitionEvent
}

export type NotificationType =
  | 'assignment_published'
  | 'quiz_published'
  | 'transcript_released'
  | 'payment_recorded'
  | 'attendance_alert'
  | 'certificate_generated'
  | 'achievement'
  | 'general'
  | 'broadcast'
  | 'alert'
  | 'info'
  | 'warning'

export interface Notification {
  id: string
  user_id: string // recipient
  title: string
  body: string
  type: NotificationType
  read: boolean
  data?: Record<string, unknown>
  created_at: string
}

export interface Transcript {
  id: string
  student_id: string
  exam_event_id: string
  tuition_event_id: string
  title: string
  file_url: string
  subject_results: SubjectResult[]
  total_marks: number
  average_score: number
  overall_grade: string
  class_rank?: number
  curriculum_rank?: number
  remarks?: string // director remark
  branding_snapshot?: Record<string, any>
  is_published: boolean
  published_at?: string
  created_at: string
  // joins
  student?: Student
  exam_event?: ExamEvent
}

export interface SubjectResult {
  subject_id: string
  subject_name: string
  marks: number
  grade: string
  remark?: string
}

export interface ExamMark {
  id: string
  student_id: string
  subject_id: string
  class_id: string
  exam_event_id: string
  teacher_id: string
  marks: number,
  grade?: string,
  grading_system_id?: string,
  teacher_remark?: string,
  created_at: string
}

export interface SchemeOfWork {
  id: string
  teacher_id: string
  class_id: string
  subject_id: string
  tuition_event_id: string
  title: string
  content: string // TipTap JSON
  is_published: boolean
  shared_with?: string[] // teacher_ids
  created_at: string
  updated_at: string
}

export interface Resource {
  id: string
  teacher_id: string
  class_id: string
  subject_id: string
  title: string
  description?: string
  type: 'note' | 'video' | 'link' | 'file'
  url?: string
  file_path?: string
  chapter?: string
  is_practice?: boolean
  created_at: string
}

export interface Certificate {
  id: string
  student_id: string
  tuition_event_id: string
  attendance_percentage: number
  generated_at: string
  issued: boolean
}

export interface Timetable {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string
  tuition_event_id: string
  day: string
  start_time: string
  end_time: string
  room_number?: string
  status: 'draft' | 'published' | 'unpublished'
  created_at: string
  // joins
  class?: Class
  subject?: Subject
  teacher?: Teacher
}

export interface StudentSubject {
  id: string
  student_id: string
  subject_id: string
  class_id: string
  created_at: string
}

export interface StudentPerformanceEntry {
  id: string
  student_id: string
  tuition_event_id: string
  exam_event_id?: string
  subject_entries: PerformanceSubjectEntry[]
  overall_grade?: string
  previous_grade?: string
  submitted_at: string
}

export interface PerformanceSubjectEntry {
  subject_id: string
  subject_name: string
  grade: string
}

export interface TranscriptConfig {
  id: string
  logo_url?: string
  signature_url?: string
  stamp_url?: string
  watermark_text?: string
  school_name: string
  footer_text?: string
  primary_color?: string
  updated_at: string
}

// ─── Worksheet Engine Types ───────────────────────────

export type QuestionType =
  | 'mcq'
  | 'multi_select'
  | 'short_answer'
  | 'long_answer'
  | 'math'
  | 'file_upload'
  | 'matching'
  | 'true_false'
  | 'section_header'
  | 'reading_passage'
  | 'poem'
  | 'passage'
  | 'sub_question'
  | 'diagram_labeling'
  | 'table_question'
  | 'fill_in_blank'

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export type PassageType = 'none' | 'passage' | 'poem' | 'diagram'

export interface MatchingPair {
  left: string
  right: string
}

export interface WorksheetBlock {
  id: string
  type: QuestionType
  // Content
  question: string           // HTML or plain text
  marks: number
  difficulty: DifficultyLevel
  topic: string
  page_index?: number       // For multi-page worksheets
  layout_config?: {         // For future flexibility
    width?: string          // e.g. '50%', '100%'
    alignment?: 'left' | 'center' | 'right'
  }
  linked_passage_id?: string // To link questions to a passage block
  // MCQ / Multi-select
  options?: string[]
  correct_answer?: string    // for MCQ/TF — 'A','B','C','D' or 'true'/'false'
  correct_answers?: string[] // for multi_select
  shuffle_options?: boolean
  // Short/Long answer
  answer_lines?: number
  answer_placeholder?: string
  // Matching
  matching_pairs?: MatchingPair[]
  // Section header
  section_title?: string
  section_instructions?: string
  // Passage embedded in question (reading_passage block)
  passage_text?: string
  passage_type?: PassageType
  // Diagram Labeling
  diagram_url?: string
  labels?: { id: string; x: number; y: number; text: string }[]
  // Table Question
  table_data?: { headers: string[]; rows: string[][] }
  // Fill in the Blank
  blank_text?: string // e.g. "The [blank1] jumped over the [blank2]."
  blanks?: Record<string, string> // blankId -> correctAnswer
}

export interface WorksheetAnswers {
  [blockId: string]:
    | string        // short/long/math/mcq/true_false
    | string[]      // multi_select
    | { left: string; right: string }[] // matching
    | Record<string, string> // diagram_labeling, fill_in_blank
    | string[][] // table_question
    | null
}

export interface WorksheetTemplate {
  id: string
  teacher_id: string
  title: string
  description?: string
  worksheet: WorksheetBlock[]
  category?: string
  created_at: string
}

// Extended Assignment (worksheet fields added to existing)
export interface WorksheetAssignment extends Assignment {
  worksheet: WorksheetBlock[]
  passage?: string
  passage_type?: PassageType
  total_marks?: number
  shuffle_questions?: boolean
  show_timer?: boolean
  time_limit?: number // minutes
  template_id?: string
}

// Extended Submission (worksheet fields added to existing)
export interface WorksheetSubmission extends Submission {
  worksheet_answers?: WorksheetAnswers
  question_marks?: Record<string, number>
  annotation_json?: string // Fabric.js JSON (separate from Annotation[] type)
  time_taken?: number  // seconds
}


// ─── Study Timetable & Focus Mode Types ───────────────────

export type StudySessionStatus = 'planned' | 'in_progress' | 'completed' | 'skipped'
export type AgeStyle = 'exploration' | 'skill_building' | 'transition' | 'mastery'

export interface StudySession {
  id: string
  student_id: string
  subject_id?: string
  title?: string
  date: string // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string // HH:MM
  duration_minutes: number
  status: StudySessionStatus
  year: number
  created_at: string
  updated_at: string
  // joins
  subject?: Subject
  goals?: StudyGoal[]
  reflections?: StudyReflection[]
  focus_logs?: FocusLog[]
}

export interface StudyGoal {
  id: string
  session_id: string
  objective: string
  action: string
  outcome: string
  meaning: string
  age_style: AgeStyle
  is_completed: boolean
  created_at: string
}

export interface FocusLog {
  id: string
  session_id: string
  actual_focus_minutes: number
  interruption_count: number
  streak_count: number
  started_at?: string
  ended_at?: string
  focus_score?: number
  created_at: string
}

export interface StudyReflection {
  id: string
  session_id: string
  completed_summary?: string
  learned_summary?: string
  difficulty_summary?: string
  created_at: string
}

export interface StudyBadge {
  id: string
  student_id: string
  badge_type: string
  achieved_at: string
  metadata: any
  created_at: string
}
