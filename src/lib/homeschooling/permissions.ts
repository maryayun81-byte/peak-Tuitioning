import {
  ENROLLMENT_STATUS,
  type EnrollmentStatus,
} from './constants'

export type HomeschoolRole = 'admin' | 'teacher' | 'student' | 'parent'

export type HomeschoolAction =
  | 'enrollment.create'
  | 'enrollment.update'
  | 'enrollment.activate'
  | 'enrollment.pause'
  | 'enrollment.cancel'
  | 'week.create'
  | 'week.publish'
  | 'session.create'
  | 'session.update'
  | 'session.reschedule'
  | 'session.cancel'
  | 'session.delete'
  | 'session.scan'
  | 'session.complete'
  | 'content.manage'
  | 'assignment.attach'
  | 'assignment.submit'
  | 'submission.review'
  | 'submission.accept'
  | 'progress.view.own'
  | 'progress.view.assigned'
  | 'progress.view.child'
  | 'coach.use'

export interface PermissionContext {
  enrollmentStatus?: string | null
  isAssignedTeacher?: boolean
  isOwner?: boolean
  isLinkedParent?: boolean
}

const BASE_MATRIX: Record<HomeschoolAction, HomeschoolRole[]> = {
  'enrollment.create': ['admin'],
  'enrollment.update': ['admin'],
  'enrollment.activate': ['admin'],
  'enrollment.pause': ['admin'],
  'enrollment.cancel': ['admin'],
  'week.create': ['admin'],
  'week.publish': ['admin'],
  'session.create': ['admin', 'teacher'],
  'session.update': ['admin'],
  'session.reschedule': ['admin', 'teacher'],
  'session.cancel': ['admin', 'teacher'],
  'session.delete': ['admin'],
  'session.scan': ['admin', 'teacher'],
  'session.complete': ['student'],
  'content.manage': ['admin', 'teacher'],
  'assignment.attach': ['admin', 'teacher'],
  'assignment.submit': ['student'],
  'submission.review': ['admin', 'teacher'],
  'submission.accept': ['admin', 'teacher'],
  'progress.view.own': ['student'],
  'progress.view.assigned': ['teacher'],
  'progress.view.child': ['parent'],
  'coach.use': ['student'],
}

const ACTIVE_ONLY_ACTIONS: HomeschoolAction[] = [
  'session.complete',
  'assignment.submit',
  'coach.use',
]

export function can(
  action: HomeschoolAction,
  role: string,
  ctx: PermissionContext = {}
): boolean {
  const allowed = (BASE_MATRIX[action] || []) as string[]
  if (!allowed.includes(role)) return false

  if (ACTIVE_ONLY_ACTIONS.includes(action)) {
    if (ctx.enrollmentStatus !== ENROLLMENT_STATUS.ACTIVE) return false
  }

  if (role === 'teacher' && ctx.isAssignedTeacher === false) {
    if (
      action === 'session.create' ||
      action === 'session.reschedule' ||
      action === 'session.cancel' ||
      action === 'content.manage' ||
      action === 'assignment.attach' ||
      action === 'submission.review' ||
      action === 'submission.accept' ||
      action === 'progress.view.assigned'
    ) {
      return false
    }
  }

  if (role === 'student' && ctx.isOwner === false) {
    return false
  }

  if (role === 'parent' && ctx.isLinkedParent === false) {
    return false
  }

  return true
}

export function denialMessage(action: HomeschoolAction): string {
  const messages: Partial<Record<HomeschoolAction, string>> = {
    'assignment.submit': 'This homeschooling program is not currently active.',
    'coach.use': 'This homeschooling program is not currently active.',
    'session.complete': 'This homeschooling program is not currently active.',
  }
  return (
    messages[action] ||
    "You don't have permission to perform this homeschooling action."
  )
}

export type { EnrollmentStatus }
