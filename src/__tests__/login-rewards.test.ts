import { describe, it, expect } from 'vitest'
import {
  computeLoginStreak,
  loginRewardForStreak,
  todayIso,
  loginLastLoginClaimFilter,
  LOGIN_XP_BASE,
  LOGIN_STREAK_BONUS_TIERS,
} from '@/lib/login-rewards'

describe('computeLoginStreak', () => {
  const today = '2026-08-01'

  it('starts a streak at 1 with no prior activity', () => {
    expect(computeLoginStreak(null, 0, today)).toBe(1)
    expect(computeLoginStreak(undefined, 0, today)).toBe(1)
  })

  it('increments when the last login was yesterday', () => {
    expect(computeLoginStreak('2026-07-31', 4, today)).toBe(5)
  })

  it('keeps the streak unchanged when already claimed today', () => {
    expect(computeLoginStreak(today, 7, today)).toBe(7)
  })

  it('resets to 1 when a day was missed', () => {
    expect(computeLoginStreak('2026-07-29', 12, today)).toBe(1)
    expect(computeLoginStreak('2025-01-01', 3, today)).toBe(1)
  })
})

describe('loginRewardForStreak', () => {
  it('awards only the base XP below the first milestone', () => {
    expect(loginRewardForStreak(1)).toEqual({ base: LOGIN_XP_BASE, bonus: 0, total: LOGIN_XP_BASE, tier: null })
    expect(loginRewardForStreak(2)).toEqual({ base: LOGIN_XP_BASE, bonus: 0, total: LOGIN_XP_BASE, tier: null })
  })

  it('adds the milestone bonus at the exact day', () => {
    expect(loginRewardForStreak(3)).toEqual({ base: LOGIN_XP_BASE, bonus: 20, total: LOGIN_XP_BASE + 20, tier: 3 })
    expect(loginRewardForStreak(7)).toEqual({ base: LOGIN_XP_BASE, bonus: 50, total: LOGIN_XP_BASE + 50, tier: 7 })
    expect(loginRewardForStreak(14)).toEqual({ base: LOGIN_XP_BASE, bonus: 100, total: LOGIN_XP_BASE + 100, tier: 14 })
    expect(loginRewardForStreak(30)).toEqual({ base: LOGIN_XP_BASE, bonus: 250, total: LOGIN_XP_BASE + 250, tier: 30 })
  })

  it('applies the highest tier reached', () => {
    expect(loginRewardForStreak(31)).toEqual({ base: LOGIN_XP_BASE, bonus: 250, total: LOGIN_XP_BASE + 250, tier: 30 })
    expect(loginRewardForStreak(10)).toEqual({ base: LOGIN_XP_BASE, bonus: 50, total: LOGIN_XP_BASE + 50, tier: 7 })
  })

  it('defines monotonic tiers', () => {
    const bonuses = LOGIN_STREAK_BONUS_TIERS.map((t) => t.bonus)
    expect([...bonuses].sort((a, b) => a - b)).toEqual(bonuses)
  })
})

describe('todayIso', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(todayIso(new Date('2026-08-01T10:00:00Z'))).toBe('2026-08-01')
  })
})

describe('loginLastLoginClaimFilter', () => {
  it('uses the is operator for a NULL prior login date (first-time login)', () => {
    expect(loginLastLoginClaimFilter(null)).toEqual({ operator: 'is', value: null })
    expect(loginLastLoginClaimFilter(undefined)).toEqual({ operator: 'is', value: null })
  })

  it('uses the eq operator for an existing prior login date', () => {
    expect(loginLastLoginClaimFilter('2026-07-31')).toEqual({ operator: 'eq', value: '2026-07-31' })
  })
})
