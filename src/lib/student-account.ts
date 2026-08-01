/**
 * Pure helpers for provisioning student accounts. Kept OUT of the 'use server'
 * action file so they stay importable from tests and client code.
 */

export function isEmailAlreadyRegisteredError(error: any): boolean {
  return (
    error?.status === 422 ||
    error?.code === 'user_already_exists' ||
    (typeof error?.message === 'string' && error.message.includes('already been registered'))
  )
}

// Students log in with `{admission}@student.peak.edu`. Returns the admission
// number (normalized to uppercase) or null for non-student emails.
export function deriveAdmissionFromStudentEmail(email?: string | null): string | null {
  const match = (email || '').trim().toLowerCase().match(/^(.+)@student\.peak\.edu$/)
  return match ? match[1].toUpperCase() : null
}
