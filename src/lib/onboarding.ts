/**
 * Onboarding truth rules.
 *
 * The database is the single source of truth for onboarding state. A student
 * is only considered "fully onboarded" when BOTH flags agree:
 *   - profiles.has_onboarded   (profile-level flag)
 *   - students.onboarded       (role-table flag)
 *
 * Using a single flag as truth let accounts with drifted flags skip onboarding
 * entirely. Keep these helpers as the ONE definition and use them everywhere
 * (server proxy, layouts, onboarding pages, hooks) so the rule cannot drift.
 */

// Local flag used when a teacher clicks "Skip setup" on onboarding. Skipping
// does NOT mark them onboarded — it just tells the teacher layout not to force
// them back into onboarding so the portal can keep reminding them to finish.
export const TEACHER_ONBOARDING_SKIPPED_KEY = 'peak_teacher_onboarding_skipped'

type OnboardedFlag = { onboarded?: boolean | null }
type HasOnboardedFlag = { has_onboarded?: boolean | null }

export function hasSkippedTeacherOnboarding(profile: HasOnboardedFlag & { onboarding_skipped?: boolean | null } | null | undefined): boolean {
  if (typeof window !== 'undefined' && window.localStorage.getItem(TEACHER_ONBOARDING_SKIPPED_KEY) === '1') return true
  return profile?.onboarding_skipped === true
}

export function isStudentFullyOnboarded(
  student: OnboardedFlag | null | undefined,
  profile: HasOnboardedFlag | null | undefined,
): boolean {
  return student?.onboarded === true && profile?.has_onboarded === true
}

// Teachers keep the legacy OR-rule (they have a rescue/heuristic path that
// syncs both flags and they were historically granted access on either flag).
export function isTeacherFullyOnboarded(
  teacher: OnboardedFlag | null | undefined,
  profile: HasOnboardedFlag | null | undefined,
): boolean {
  return teacher?.onboarded === true || profile?.has_onboarded === true
}
