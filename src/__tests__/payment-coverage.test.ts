import { describe, it, expect } from 'vitest'
import {
  computeCoverage,
  allocateAcrossDates,
  nextUncoveredDates,
} from '@/lib/payment-coverage'

const RATE = 250
// Week 1: Mon 6 Jul – Fri 10 Jul, Week 2: Mon 13 Jul – Fri 17 Jul
const W1 = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10']
const W2 = ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17']
const ACTIVE = [...W1, ...W2]

describe('computeCoverage', () => {
  it('pays for Tue+Wed, skips Wed, attends Thu → Thursday stays covered', () => {
    // Paid 2 days on Tuesday (500). Attended Tuesday only. Today is Thursday.
    const c = computeCoverage({
      activeDates: ACTIVE,
      totalPaid: 2 * RATE,
      attendedDates: ['2026-07-07'],
      dailyRate: RATE,
      today: '2026-07-09',
    })
    expect(c.purchasedDays).toBe(2)
    expect(c.consumedDays).toBe(1)
    expect(c.remainingDays).toBe(1)
    expect(c.coverageEndDate).toBe('2026-07-09')
    expect(c.isCoveredToday).toBe(true)
  })

  it('pays for 5 days on Thursday → carried into next week, paid until Wed', () => {
    // Fresh case: student shows up Thursday and pays for 5 days. Attending
    // Thursday consumes one of them, leaving 4 → Fri + next Mon/Tue/Wed.
    const c = computeCoverage({
      activeDates: ACTIVE,
      totalPaid: 5 * RATE,
      attendedDates: ['2026-07-09'], // today
      dailyRate: RATE,
      today: '2026-07-09',
    })
    expect(c.purchasedDays).toBe(5)
    expect(c.consumedDays).toBe(1)
    expect(c.remainingDays).toBe(4)
    expect(c.coveredDates).toEqual(['2026-07-10', '2026-07-13', '2026-07-14', '2026-07-15'])
    expect(c.coverageEndDate).toBe('2026-07-15') // Wednesday of next week
  })

  it('combines skip-day credit with a new 5-day payment into next week', () => {
    // Tue: paid 2 days, attended. Thu: skips were free, attends today, pays 5
    // more. Total purchased 7, attended 2 → 5 remaining → through Thu next wk.
    const c = computeCoverage({
      activeDates: ACTIVE,
      totalPaid: 2 * RATE + 5 * RATE,
      attendedDates: ['2026-07-07', '2026-07-09'],
      dailyRate: RATE,
      today: '2026-07-09',
    })
    expect(c.purchasedDays).toBe(7)
    expect(c.consumedDays).toBe(2)
    expect(c.remainingDays).toBe(5)
    expect(c.coveredDates).toEqual(['2026-07-10', '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'])
    expect(c.coverageEndDate).toBe('2026-07-16') // Thursday of next week
  })

  it('credit from a fully paid week rolls into the next week', () => {
    // Paid 6 days worth (1500), attended all 5 days of W1. Today = Fri of W1.
    const c = computeCoverage({
      activeDates: ACTIVE,
      totalPaid: 6 * RATE,
      attendedDates: W1,
      dailyRate: RATE,
      today: '2026-07-10',
    })
    expect(c.consumedDays).toBe(5)
    expect(c.remainingDays).toBe(1)
    expect(c.coverageEndDate).toBe('2026-07-13') // next Monday
  })

  it('skips holiday days entirely (they neither consume nor cover)', () => {
    // Wednesday 8 Jul is a holiday → not an active date.
    const withHoliday = ['2026-07-06', '2026-07-07', '2026-07-09', '2026-07-10']
    const c = computeCoverage({
      activeDates: withHoliday,
      totalPaid: 2 * RATE,
      attendedDates: ['2026-07-06'],
      dailyRate: RATE,
      today: '2026-07-08', // holiday itself
    })
    expect(c.remainingDays).toBe(1)
    expect(c.coverageEndDate).toBe('2026-07-09') // Thursday, not the holiday
  })

  it('partial payment still covers the next teaching day (marked partial on the tail)', () => {
    const c = computeCoverage({
      activeDates: ACTIVE,
      totalPaid: 300,
      attendedDates: [],
      dailyRate: RATE,
      today: '2026-07-06',
    })
    expect(c.remainingDays).toBeCloseTo(1.2, 5)
    expect(c.coveredDates).toEqual(['2026-07-06', '2026-07-07'])
    expect(c.coveredDays).toEqual([
      { date: '2026-07-06', full: true },
      { date: '2026-07-07', full: false },
    ])
    expect(c.isCoveredToday).toBe(true)
  })

  it('attendance can never consume more days than were purchased', () => {
    const c = computeCoverage({
      activeDates: ACTIVE,
      totalPaid: RATE, // 1 day bought
      attendedDates: W1, // attended all 5
      dailyRate: RATE,
      today: '2026-07-10',
    })
    expect(c.consumedDays).toBe(1)
    expect(c.remainingDays).toBe(0)
    expect(c.coverageEndDate).toBeNull()
  })

  it('no payment means no coverage', () => {
    const c = computeCoverage({
      activeDates: ACTIVE,
      totalPaid: 0,
      attendedDates: ['2026-07-06'],
      dailyRate: RATE,
      today: '2026-07-06',
    })
    expect(c.coverageEndDate).toBeNull()
    expect(c.isCoveredToday).toBe(false)
  })
})

describe('allocateAcrossDates', () => {
  it('allocates a 5-day payment across the current and next week', () => {
    const r = allocateAcrossDates({
      amount: 5 * RATE,
      activeDates: ACTIVE,
      alreadyCovered: ['2026-07-06', '2026-07-07'],
      dailyRate: RATE,
      today: '2026-07-09',
    })
    expect(r.allocations.map((a) => a.date)).toEqual([
      '2026-07-09', '2026-07-10', '2026-07-13', '2026-07-14', '2026-07-15',
    ])
    expect(r.allocations.every((a) => a.full)).toBe(true)
    expect(r.credit).toBe(0)
  })

  it('returns leftover as credit when it cannot reach another full day', () => {
    // 600 covers Mon (full), Tue (full) and a partial 100 on Wed.
    const r = allocateAcrossDates({
      amount: 600,
      activeDates: ACTIVE,
      alreadyCovered: [],
      dailyRate: RATE,
      today: '2026-07-06',
    })
    expect(r.allocations.map((a) => a.date)).toEqual(['2026-07-06', '2026-07-07', '2026-07-08'])
    expect(r.allocations.map((a) => a.full)).toEqual([true, true, false])
    expect(r.credit).toBe(0)
  })
})

describe('nextUncoveredDates', () => {
  it('returns the next uncovered teaching dates after a given day, skipping covered ones', () => {
    const r = nextUncoveredDates({
      count: 4,
      activeDates: ACTIVE,
      alreadyCovered: ['2026-07-06', '2026-07-07', '2026-07-10'],
      today: '2026-07-08',
    })
    expect(r).toEqual(['2026-07-09', '2026-07-13', '2026-07-14', '2026-07-15'])
  })

  it('can extend past the end of the current week into the next', () => {
    const r = nextUncoveredDates({
      count: 3,
      activeDates: ACTIVE,
      alreadyCovered: ['2026-07-09', '2026-07-10'],
      from: '2026-07-10',
    })
    expect(r).toEqual(['2026-07-13', '2026-07-14', '2026-07-15'])
  })
})
