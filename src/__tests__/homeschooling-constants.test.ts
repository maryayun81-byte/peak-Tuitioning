import { describe, it, expect } from 'vitest'
import {
  ENROLLMENT_STATUS,
  SESSION_STATUS,
  STUDENT_SESSION_STATUS,
  getDayOfWeek,
  formatTimeRange,
  getSessionModeLabel,
  getCurrentWeekIndex,
} from '@/lib/homeschooling/constants'

describe('homeschooling status enums', () => {
  it('matches the database CHECK constraints', () => {
    expect(Object.values(ENROLLMENT_STATUS).sort()).toEqual(
      ['ACTIVE', 'CANCELLED', 'COMPLETED', 'EXPIRED', 'PAUSED', 'PENDING'].sort()
    )
    expect(Object.keys(SESSION_STATUS)).toHaveLength(9)
    expect(SESSION_STATUS.MISSED).toBe('MISSED')
    expect(SESSION_STATUS.CORRECTIONS_REQUIRED).toBe('CORRECTIONS_REQUIRED')
    expect(Object.keys(STUDENT_SESSION_STATUS)).toHaveLength(5)
  })
})

describe('getDayOfWeek', () => {
  it('returns the English day name', () => {
    expect(getDayOfWeek(new Date('2026-09-07T12:00:00'))).toBe('Monday')
    expect(getDayOfWeek(new Date('2026-09-12T12:00:00'))).toBe('Saturday')
    expect(getDayOfWeek(new Date('2026-09-13T12:00:00'))).toBe('Sunday')
  })
})

describe('formatTimeRange', () => {
  it('formats 24h ranges as 12h labels', () => {
    expect(formatTimeRange('09:00', '10:30')).toBe('9 AM – 10:30 AM')
    expect(formatTimeRange('08:00', '10:00')).toBe('8 AM – 10 AM')
    expect(formatTimeRange('13:00', '15:00')).toBe('1 PM – 3 PM')
    expect(formatTimeRange('12:00', '13:00')).toBe('12 PM – 1 PM')
  })
})

describe('getSessionModeLabel', () => {
  it('labels known modes and passes through unknown values', () => {
    expect(getSessionModeLabel('TEACHER_LED')).toBe('Teacher-Led')
    expect(getSessionModeLabel('SELF_STUDY')).toBe('Self-Study')
    expect(getSessionModeLabel('AI_SUPPORTED')).toBe('AI-Supported')
    expect(getSessionModeLabel('SOMETHING_ELSE')).toBe('SOMETHING_ELSE')
  })
})

describe('getCurrentWeekIndex', () => {
  const weeks = [
    { start_date: '2026-09-07', end_date: '2026-09-12', status: 'PUBLISHED' },
    { start_date: '2026-09-14', end_date: '2026-09-19', status: 'PUBLISHED' },
    { start_date: '2026-09-21', end_date: '2026-09-26', status: 'DRAFT' },
  ]

  it('returns empty-list guard', () => {
    expect(getCurrentWeekIndex([])).toBe(0)
  })

  it('prefers the first published week when today is outside all ranges', () => {
    const past = [
      { start_date: '2020-01-06', end_date: '2020-01-11', status: 'PUBLISHED' },
      { start_date: '2020-01-13', end_date: '2020-01-18', status: 'DRAFT' },
    ]
    expect(getCurrentWeekIndex(past)).toBe(0)
  })

  it('picks the nearest upcoming week over an older published one', () => {
    const farFuture = '2099-01-04'
    const farEnd = '2099-01-09'
    const list = [
      { start_date: '2020-01-06', end_date: '2020-01-11', status: 'PUBLISHED' },
      { start_date: farFuture, end_date: farEnd, status: 'DRAFT' },
    ]
    expect(getCurrentWeekIndex(list)).toBe(1)
  })

  it('matches a week containing today', () => {
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    const start = new Date(today)
    start.setDate(today.getDate() - 1)
    const end = new Date(today)
    end.setDate(today.getDate() + 1)
    const list = [
      { start_date: '2020-01-06', end_date: '2020-01-11', status: 'PUBLISHED' },
      { start_date: fmt(start), end_date: fmt(end), status: 'PUBLISHED' },
    ]
    expect(getCurrentWeekIndex(list)).toBe(1)
    expect(weeks.length).toBe(3)
  })
})
