import type { Student, Teacher, Subject, Assignment } from '@/types/database'
import type {
  EnrollmentStatus,
  WeekStatus,
  SessionStatus,
  StudentSessionStatus,
  LearningMode,
  SubmissionType,
  ResourceType,
  TeacherAssignmentType,
  ConfidenceLevel,
} from '@/lib/homeschooling/constants'

// Local aliases under the domain names used across the feature
// (`export ... from` alone does not create local bindings).
export type HomeschoolEnrollmentStatus = EnrollmentStatus
export type HomeschoolWeekStatus = WeekStatus
export type LearningSessionStatus = SessionStatus
export type { StudentSessionStatus, LearningMode, SubmissionType, ConfidenceLevel }
export type ResourceLinkType = ResourceType
export type AssignmentType = TeacherAssignmentType

export interface HomeschoolEnrollment {
  id: string
  student_id: string
  status: HomeschoolEnrollmentStatus
  start_date: string
  end_date: string | null
  grade_level: string
  academic_year: string
  program_name: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  student?: Student
  subjects?: HomeschoolSubject[]
  teacher_assignments?: HomeschoolTeacherAssignment[]
  weeks?: HomeschoolWeek[]
}

export interface HomeschoolSubject {
  id: string
  enrollment_id: string
  subject_id: string
  is_active: boolean
  created_at: string
  subject?: Subject
}

export interface HomeschoolTeacherAssignment {
  id: string
  enrollment_id: string
  subject_id: string
  teacher_id: string
  assignment_type: AssignmentType
  created_at: string
  teacher?: Teacher
  subject?: Subject
}

export interface HomeschoolWeek {
  id: string
  enrollment_id: string
  week_number: number
  title: string
  start_date: string
  end_date: string
  status: HomeschoolWeekStatus
  created_at: string
  updated_at: string
  sessions?: LearningSession[]
}

export interface LearningSession {
  id: string
  enrollment_id: string
  week_id: string
  subject_id: string
  teacher_id: string
  day: string
  start_time: string
  end_time: string
  learning_mode: LearningMode
  topic: string
  learning_goal: string
  instructions: string | null
  submission_required: boolean
  submission_type: SubmissionType
  status: LearningSessionStatus
  student_status: StudentSessionStatus
  ai_assistance_enabled: boolean
  ai_instructions: string | null
  max_duration_minutes: number | null
  notes: string | null
  cancelled_reason: string | null
  rescheduled_from: string | null
  created_at: string
  updated_at: string
  subject?: Subject
  teacher?: Teacher
  objectives?: LearningObjective[]
  resources?: LearningResource[]
  mission?: LearningMission
  reflection?: LearningReflection
  assignment?: Assignment
}

export interface LearningObjective {
  id: string
  session_id: string
  title: string
  description: string | null
  order_index: number
  is_completed: boolean
  completed_at: string | null
  created_at: string
}

export interface LearningResource {
  id: string
  session_id: string
  title: string
  description: string | null
  type: ResourceLinkType
  url: string | null
  file_path: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  is_required: boolean
  order_index: number
  created_at: string
}

export interface LearningMission {
  id: string
  session_id: string
  title: string
  description: string | null
  is_started: boolean
  is_completed: boolean
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface LearningReflection {
  id: string
  session_id: string
  student_id: string
  accomplished: string | null
  difficulties: string | null
  confidence: ConfidenceLevel | null
  created_at: string
}

export interface HomeschoolAuditLog {
  id: string
  actor_id: string
  actor_role: string
  action: string
  target_type: string
  target_id: string
  before_state: Record<string, unknown> | null
  after_state: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface HomeschoolDashboardData {
  enrollment: HomeschoolEnrollment
  todaySessions: LearningSession[]
  weekSessions: LearningSession[]
  currentWeek: HomeschoolWeek | null
  pendingAssignments: number
  needsAttention: string[]
  progress: HomeschoolProgress
}

export interface HomeschoolWeekView {
  week: HomeschoolWeek
  sessions: Record<string, LearningSession[]>
}

export interface HomeschoolProgress {
  totalSessions: number
  completedSessions: number
  totalObjectives: number
  completedObjectives: number
  totalAssignments: number
  submittedAssignments: number
  reviewedAssignments: number
  subjectProgress: SubjectProgress[]
}

export interface SubjectProgress {
  subject_id: string
  subject_name: string
  subject_code?: string | null
  total_sessions: number
  completed_sessions: number
  in_progress_sessions?: number
  total_objectives?: number
  completed_objectives?: number
  progress_percent: number
}
