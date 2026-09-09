import { describe, it, expect } from 'vitest'
import { can, denialMessage } from '@/lib/homeschooling/permissions'

describe('homeschooling permission matrix', () => {
  it('restricts enrollment management to admin', () => {
    expect(can('enrollment.create', 'admin')).toBe(true)
    expect(can('enrollment.create', 'teacher')).toBe(false)
    expect(can('enrollment.pause', 'admin')).toBe(true)
    expect(can('week.publish', 'teacher')).toBe(false)
    expect(can('session.delete', 'teacher')).toBe(false)
    expect(can('session.delete', 'admin')).toBe(true)
  })

  it('allows teachers session operations by role', () => {
    expect(can('session.reschedule', 'teacher')).toBe(true)
    expect(can('session.cancel', 'teacher')).toBe(true)
    expect(can('content.manage', 'teacher')).toBe(true)
    expect(can('assignment.attach', 'teacher')).toBe(true)
    expect(can('submission.review', 'teacher')).toBe(true)
    expect(can('submission.accept', 'teacher')).toBe(true)
    expect(can('session.scan', 'teacher')).toBe(true)
  })

  it('denies students everything except their own learning actions', () => {
    expect(can('assignment.submit', 'student')).toBe(false)
    expect(can('coach.use', 'student')).toBe(false)
    expect(can('session.complete', 'student')).toBe(false)
    expect(can('content.manage', 'student')).toBe(false)
  })

  it('gates student actions on ACTIVE enrollment', () => {
    const active = { enrollmentStatus: 'ACTIVE', isOwner: true }
    expect(can('assignment.submit', 'student', active)).toBe(true)
    expect(can('coach.use', 'student', active)).toBe(true)
    expect(can('session.complete', 'student', active)).toBe(true)

    expect(can('assignment.submit', 'student', { enrollmentStatus: 'PAUSED', isOwner: true })).toBe(false)
    expect(can('assignment.submit', 'student', { enrollmentStatus: 'PENDING', isOwner: true })).toBe(false)
    expect(can('coach.use', 'student', { enrollmentStatus: null, isOwner: true })).toBe(false)
  })

  it('enforces ownership and relationship context', () => {
    expect(can('assignment.submit', 'student', { enrollmentStatus: 'ACTIVE', isOwner: false })).toBe(false)
    expect(can('progress.view.assigned', 'teacher', { isAssignedTeacher: false })).toBe(false)
    expect(can('progress.view.assigned', 'teacher', { isAssignedTeacher: true })).toBe(true)
    expect(can('progress.view.assigned', 'teacher', {})).toBe(true)
    expect(can('progress.view.child', 'parent', { isLinkedParent: false })).toBe(false)
    expect(can('progress.view.child', 'parent', { isLinkedParent: true })).toBe(true)
  })

  it('denies unknown roles and parents admin actions', () => {
    expect(can('week.publish', 'parent')).toBe(false)
    expect(can('coach.use', 'parent')).toBe(false)
    expect(can('session.reschedule', 'finance' as never)).toBe(false)
  })

  it('returns human-readable denial messages', () => {
    expect(denialMessage('assignment.submit')).toContain('not currently active')
    expect(denialMessage('coach.use')).toContain('not currently active')
    expect(denialMessage('week.publish')).toContain("don't have permission")
  })
})
