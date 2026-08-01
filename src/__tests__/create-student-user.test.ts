import { describe, it, expect } from 'vitest'
import { isEmailAlreadyRegisteredError, deriveAdmissionFromStudentEmail } from '@/lib/student-account'

describe('isEmailAlreadyRegisteredError', () => {
  it('detects the GoTrue 422 duplicate-email error', () => {
    expect(isEmailAlreadyRegisteredError({ status: 422 })).toBe(true)
    expect(isEmailAlreadyRegisteredError({ code: 'user_already_exists' })).toBe(true)
    expect(isEmailAlreadyRegisteredError({ message: 'A user with this email address has already been registered' })).toBe(true)
  })

  it('does not misclassify unrelated errors', () => {
    expect(isEmailAlreadyRegisteredError(null)).toBe(false)
    expect(isEmailAlreadyRegisteredError({})).toBe(false)
    expect(isEmailAlreadyRegisteredError({ status: 400, message: 'Password should be at least 6 characters' })).toBe(false)
    expect(isEmailAlreadyRegisteredError({ code: 'unexpected_failure' })).toBe(false)
  })
})

describe('deriveAdmissionFromStudentEmail', () => {
  it('derives the admission number from a student email', () => {
    expect(deriveAdmissionFromStudentEmail('ppt-2026-042@student.peak.edu')).toBe('PPT-2026-042')
    expect(deriveAdmissionFromStudentEmail('PEK/2026/001@student.peak.edu')).toBe('PEK/2026/001')
  })

  it('normalizes case and trims', () => {
    expect(deriveAdmissionFromStudentEmail('  PPT-2026-042@STUDENT.PEAK.EDU  ')).toBe('PPT-2026-042')
  })

  it('returns null for non-student emails', () => {
    expect(deriveAdmissionFromStudentEmail('admin@peak.edu')).toBeNull()
    expect(deriveAdmissionFromStudentEmail('teacher@student.peak.edu')).toBe('TEACHER')
    expect(deriveAdmissionFromStudentEmail(undefined)).toBeNull()
    expect(deriveAdmissionFromStudentEmail('')).toBeNull()
    expect(deriveAdmissionFromStudentEmail(null)).toBeNull()
  })
})
