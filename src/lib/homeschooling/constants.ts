// ============================================================
// Homeschooling Program — Centralized Constants
// ============================================================

// ── Status Enums ─────────────────────────────────────────────

export const ENROLLMENT_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const

export type EnrollmentStatus = typeof ENROLLMENT_STATUS[keyof typeof ENROLLMENT_STATUS]

export const WEEK_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const

export type WeekStatus = typeof WEEK_STATUS[keyof typeof WEEK_STATUS]

export const SESSION_STATUS = {
  UPCOMING: 'UPCOMING',
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMISSION_PENDING: 'SUBMISSION_PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  CORRECTIONS_REQUIRED: 'CORRECTIONS_REQUIRED',
  COMPLETED: 'COMPLETED',
  MISSED: 'MISSED',
  CANCELLED: 'CANCELLED',
} as const

export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS]

export const STUDENT_SESSION_STATUS = {
  UPCOMING: 'UPCOMING',
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  COMPLETED: 'COMPLETED',
} as const

export type StudentSessionStatus = typeof STUDENT_SESSION_STATUS[keyof typeof STUDENT_SESSION_STATUS]

export const LEARNING_MODE = {
  TEACHER_LED: 'TEACHER_LED',
  SELF_STUDY: 'SELF_STUDY',
  AI_SUPPORTED: 'AI_SUPPORTED',
  HYBRID: 'HYBRID',
} as const

export type LearningMode = typeof LEARNING_MODE[keyof typeof LEARNING_MODE]

// ── Type Enums ───────────────────────────────────────────────

export const RESOURCE_TYPE = {
  DOCUMENT: 'document',
  VIDEO: 'video',
  LINK: 'link',
  QUIZ: 'quiz',
  QUESTION_SET: 'question_set',
  FILE: 'file',
  IMAGE: 'image',
} as const

export type ResourceType = typeof RESOURCE_TYPE[keyof typeof RESOURCE_TYPE]

export const SUBMISSION_TYPE = {
  FILE: 'file',
  TEXT: 'text',
  BOTH: 'both',
  NONE: 'none',
} as const

export type SubmissionType = typeof SUBMISSION_TYPE[keyof typeof SUBMISSION_TYPE]

export const CONFIDENCE_LEVEL = {
  NEED_HELP: 'need_help',
  GETTING_THERE: 'getting_there',
  COMFORTABLE: 'comfortable',
  VERY_CONFIDENT: 'very_confident',
} as const

export type ConfidenceLevel = typeof CONFIDENCE_LEVEL[keyof typeof CONFIDENCE_LEVEL]

export const TEACHER_ASSIGNMENT_TYPE = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
} as const

export type TeacherAssignmentType = typeof TEACHER_ASSIGNMENT_TYPE[keyof typeof TEACHER_ASSIGNMENT_TYPE]

// ── Static Data ──────────────────────────────────────────────

export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export const TIME_SLOTS = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
] as const

// ── Color Maps ───────────────────────────────────────────────

export const ENROLLMENT_STATUS_COLORS: Record<EnrollmentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  PAUSED: 'bg-orange-100 text-orange-800 border-orange-200',
  COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200',
  EXPIRED: 'bg-gray-100 text-gray-800 border-gray-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
}

export const SESSION_STATUS_COLORS: Record<SessionStatus, string> = {
  UPCOMING: 'bg-slate-100 text-slate-700 border-slate-200',
  READY: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  SUBMISSION_PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  UNDER_REVIEW: 'bg-purple-100 text-purple-700 border-purple-200',
  CORRECTIONS_REQUIRED: 'bg-orange-100 text-orange-700 border-orange-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  MISSED: 'bg-red-100 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
}

// ── Navigation Items ─────────────────────────────────────────

export interface NavItem {
  label: string
  shortLabel?: string
  href: string
  icon: string
  group?: string
}

export const HOMESCHOOLING_NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    shortLabel: 'Home',
    href: '/student/homeschooling',
    icon: 'LayoutDashboard',
    group: 'Overview',
  },
  {
    label: 'My Timetable',
    shortLabel: 'Timetable',
    href: '/student/homeschooling/timetable',
    icon: 'CalendarDays',
    group: 'Overview',
  },
  {
    label: 'Week View',
    shortLabel: 'Week',
    href: '/student/homeschooling/week',
    icon: 'BookOpen',
    group: 'Learning',
  },
  {
    label: 'History',
    href: '/student/homeschooling/history',
    icon: 'History',
    group: 'Progress',
  },
]

export const TEACHER_HOMESCHOOL_NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    shortLabel: 'Home',
    href: '/teacher/homeschooling',
    icon: 'LayoutDashboard',
    group: 'Overview',
  },
  {
    label: 'Teaching Timetable',
    shortLabel: 'Timetable',
    href: '/teacher/homeschooling/timetable',
    icon: 'CalendarDays',
    group: 'Teaching',
  },
  {
    label: 'Analytics',
    href: '/teacher/homeschooling/analytics',
    icon: 'BarChart3',
    group: 'Insights',
  },
]

export const ADMIN_HOMESCHOOL_NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    shortLabel: 'Home',
    href: '/admin/homeschooling',
    icon: 'LayoutDashboard',
    group: 'Overview',
  },
]

/** Legacy note: only the routes above exist. Additional teacher/admin homeschooling
 *  sections (students list, enrollments, schedule, sessions index, resources index,
 *  submissions index, reports, settings) are not implemented — do not link to them. */

// ── Utility Functions ────────────────────────────────────────

const DAY_INDEX_MAP: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

/**
 * Get the day name from a Date object.
 */
export function getDayOfWeek(date: Date): string {
  return DAY_INDEX_MAP[date.getDay()]
}

/**
 * Format a time range string from two 24h time strings.
 * @example formatTimeRange('09:00', '10:30') → '9:00 AM – 10:30 AM'
 */
export function formatTimeRange(start: string, end: string): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`
  }
  return `${fmt(start)} – ${fmt(end)}`
}

/**
 * Human-readable label for a learning mode.
 */
export function getSessionModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    TEACHER_LED: 'Teacher-Led',
    SELF_STUDY: 'Self-Study',
    AI_SUPPORTED: 'AI-Supported',
    HYBRID: 'Hybrid',
  }
  return labels[mode] ?? mode
}

/**
 * Icon name (lucide-react) for a learning mode.
 */
export function getSessionModeIcon(mode: string): string {
  const icons: Record<string, string> = {
    TEACHER_LED: 'Users',
    SELF_STUDY: 'BookOpen',
    AI_SUPPORTED: 'Sparkles',
    HYBRID: 'Layers',
  }
  return icons[mode] ?? 'HelpCircle'
}

interface WeekLike {
  start_date: string
  end_date: string
  status: string
}

/**
 * Date-based current week index: today within [start_date, end_date] wins;
 * otherwise the nearest upcoming week; then first published; else 0.
 */
export function getCurrentWeekIndex<T extends WeekLike>(weeks: T[]): number {
  if (weeks.length === 0) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const inRange = weeks.findIndex((w) => {
    const start = new Date(w.start_date + 'T00:00:00')
    const end = new Date(w.end_date + 'T23:59:59')
    return today >= start && today <= end
  })
  if (inRange >= 0) return inRange

  let nearest = -1
  let nearestTime = Infinity
  weeks.forEach((w, i) => {
    const start = new Date(w.start_date + 'T00:00:00').getTime()
    if (start > today.getTime() && start - today.getTime() < nearestTime) {
      nearestTime = start - today.getTime()
      nearest = i
    }
  })
  if (nearest >= 0) return nearest

  const published = weeks.findIndex((w) => w.status === 'PUBLISHED')
  return Math.max(0, published)
}
