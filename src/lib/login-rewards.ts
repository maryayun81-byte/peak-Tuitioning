/**
 * Pure helpers for the daily login XP + streak system. Kept OUT of the 'use server'
 * action file so they stay importable from tests and client code.
 *
 * These back the `students.last_login_xp_at` / `students.last_login_date` /
 * `students.streak_count` columns: a student earns XP once per day and their
 * streak advances only when they log in on consecutive days.
 */

export const LOGIN_XP_BASE = 10

// Streak bonus tiers — bonus jumps at milestones instead of scaling linearly.
export const LOGIN_STREAK_BONUS_TIERS = [
  { days: 3, bonus: 20 },
  { days: 7, bonus: 50 },
  { days: 14, bonus: 100 },
  { days: 30, bonus: 250 },
] as const

export function todayIso(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

/**
 * The streak state for a student, given the last day they were active and their
 * previous streak. Returns 1 for a brand-new or broken streak, priorStreak when
 * already claimed today, and priorStreak + 1 for a consecutive-day login.
 */
export function computeLoginStreak(
  priorLastLoginDate: string | null | undefined,
  priorStreak: number,
  today: string
): number {
  if (!priorLastLoginDate) return 1
  if (priorLastLoginDate === today) return priorStreak
  const yesterday = new Date(new Date(`${today}T12:00:00Z`).getTime() - 86400000)
    .toISOString()
    .split('T')[0]
  return priorLastLoginDate === yesterday ? priorStreak + 1 : 1
}

/**
 * Optimistic-concurrency filter for the "last claimed" day. PostgREST treats
 * `col=eq.null` as `col = NULL`, which never matches, so a NULL last_login_date
 * (first-time login) must use the `is` operator instead.
 */
export function loginLastLoginClaimFilter(priorLastLoginDate: string | null | undefined): {
  operator: 'is' | 'eq'
  value: string | null
} {
  return priorLastLoginDate
    ? { operator: 'eq', value: priorLastLoginDate }
    : { operator: 'is', value: null }
}

export function loginRewardForStreak(streak: number): {
  base: number
  bonus: number
  total: number
  tier: number | null
} {
  let bonus = 0
  let tier: number | null = null
  for (const entry of LOGIN_STREAK_BONUS_TIERS) {
    if (streak >= entry.days) {
      bonus = entry.bonus
      tier = entry.days
    }
  }
  return { base: LOGIN_XP_BASE, bonus, total: LOGIN_XP_BASE + bonus, tier }
}
