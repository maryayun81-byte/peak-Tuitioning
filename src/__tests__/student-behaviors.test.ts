import { describe, it, expect } from 'vitest'
import { buildStudentBehaviors } from '@/lib/weekly-insights'
import type { CoachStudentHistory, CoachWeekHistory } from '@/lib/weekly-insights'

function week(overrides: Partial<CoachWeekHistory> = {}): CoachWeekHistory {
  return {
    weekLabel: '2026-06-29',
    expected: 1250,
    paid: 1250,
    balance: 0,
    carryIn: 0,
    paymentCount: 1,
    ...overrides,
  }
}

function student(name: string, weeks: CoachWeekHistory[]): CoachStudentHistory {
  return { name, className: 'Grade 7', weeks }
}

describe('buildStudentBehaviors', () => {
  it('returns empty when a student has fewer than two active weeks', () => {
    const behaviors = buildStudentBehaviors([student('Amina', [week()])])
    expect(behaviors).toEqual([])
  })

  it('flags a student who misses payments regularly as red', () => {
    const behaviors = buildStudentBehaviors([
      student('Amina', [week({ paid: 0 }), week({ paid: 0, weekLabel: '2026-07-06' })]),
    ])
    const behavior = behaviors.find((b) => b.id === 'behavior-miss-Amina')
    expect(behavior).toBeDefined()
    expect(behavior!.tone).toBe('red')
    expect(behavior!.title).toContain('misses payments regularly')
  })

  it('flags a student who makes promises but never settles as amber', () => {
    const behaviors = buildStudentBehaviors([
      student('Brian', [
        week({ promisedDate: '2026-07-05', paid: 0 }),
        week({ promisedDate: '2026-07-12', paid: 200, weekLabel: '2026-07-06' }),
      ]),
    ])
    const behavior = behaviors.find((b) => b.id === 'behavior-promise-Brian')
    expect(behavior).toBeDefined()
    expect(behavior!.tone).toBe('amber')
  })

  it('flags carried debt across weeks as amber', () => {
    const behaviors = buildStudentBehaviors([
      student('Carol', [week({ carryIn: 500 }), week({ carryIn: 700, weekLabel: '2026-07-06' })]),
    ])
    const behavior = behaviors.find((b) => b.id === 'behavior-carry-Carol')
    expect(behavior).toBeDefined()
    expect(behavior!.tone).toBe('amber')
  })

  it('flags instalment payers as blue', () => {
    const behaviors = buildStudentBehaviors([
      student('David', [
        week({ paymentCount: 3 }),
        week({ paymentCount: 2, weekLabel: '2026-07-06' }),
      ]),
    ])
    const behavior = behaviors.find((b) => b.id === 'behavior-installments-David')
    expect(behavior).toBeDefined()
    expect(behavior!.tone).toBe('blue')
  })

  it('celebrates a student who settles in full each week as green', () => {
    const behaviors = buildStudentBehaviors([
      student('Eve', [week(), week({ weekLabel: '2026-07-06' })]),
    ])
    const behavior = behaviors.find((b) => b.id === 'behavior-settled-Eve')
    expect(behavior).toBeDefined()
    expect(behavior!.tone).toBe('green')
    expect(behavior!.title).toContain('settles in full')
  })

  it('sorts red behavior ahead of amber and green', () => {
    const behaviors = buildStudentBehaviors([
      student('Amina', [week({ paid: 0 }), week({ paid: 0, weekLabel: '2026-07-06' })]),
      student('Carol', [week({ carryIn: 500 }), week({ carryIn: 700, weekLabel: '2026-07-06' })]),
      student('Eve', [week(), week({ weekLabel: '2026-07-06' })]),
    ])
    expect(behaviors[0].tone).toBe('red')
    expect(behaviors[behaviors.length - 1].tone).toBe('green')
  })

  it('ignores weeks with no expected fee when deciding activity', () => {
    const behaviors = buildStudentBehaviors([
      student('Amina', [week({ expected: 0, paid: 0 }), week({ expected: 1250, paid: 0 })]),
    ])
    expect(behaviors).toEqual([])
  })

  it('handles null/empty history gracefully', () => {
    expect(buildStudentBehaviors([])).toEqual([])
    expect(buildStudentBehaviors([{ name: 'X', className: 'C', weeks: [] }])).toEqual([])
  })
})

describe('buildStudentBehaviors trajectory', () => {
  it('labels a recovering student as improving', () => {
    const behaviors = buildStudentBehaviors([
      student('Amina', [
        week({ paid: 0 }),
        week({ paid: 0, weekLabel: '2026-07-06' }),
        week({ weekLabel: '2026-07-13' }),
        week({ weekLabel: '2026-07-20' }),
      ]),
    ])
    const b = behaviors.find((x) => x.id === 'behavior-miss-Amina')
    expect(b).toBeDefined()
    expect(b!.trajectory).toBe('improving')
  })

  it('labels a slipping student as worsening', () => {
    const behaviors = buildStudentBehaviors([
      student('Brian', [
        week({ weekLabel: '2026-06-29' }),
        week({ weekLabel: '2026-07-06' }),
        week({ paid: 0, weekLabel: '2026-07-13' }),
        week({ paid: 0, weekLabel: '2026-07-20' }),
      ]),
    ])
    const b = behaviors.find((x) => x.id === 'behavior-miss-Brian')
    expect(b).toBeDefined()
    expect(b!.trajectory).toBe('worsening')
  })

  it('labels a steady student as stable and carries studentName', () => {
    const behaviors = buildStudentBehaviors([
      student('Eve', [
        week({ weekLabel: '2026-06-29' }),
        week({ weekLabel: '2026-07-06' }),
        week({ weekLabel: '2026-07-13' }),
        week({ weekLabel: '2026-07-20' }),
      ]),
    ])
    const b = behaviors.find((x) => x.id === 'behavior-settled-Eve')
    expect(b).toBeDefined()
    expect(b!.trajectory).toBe('stable')
    expect(b!.studentName).toBe('Eve')
  })
})
