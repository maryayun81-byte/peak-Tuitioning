import { describe, it, expect } from 'vitest'
import { buildCoachSnapshot, parseCoachCommentary, coachMoney, COACH_SYSTEM_PROMPT } from '@/lib/coach-ai'
import type { CoachInput } from '@/lib/weekly-insights'

const input: CoachInput = {
  rows: [
    { name: 'Amina', className: 'Grade 7', expected: 1250, paid: 0, balance: 1250, carryIn: 0, promisedDate: '', flagLabel: 'Overdue', flagTone: 'red' },
  ],
  totals: { expected: 1250, collected: 0, outstanding: 1250, credit: 0, flaggedCount: 1, collectionRate: 0 },
  trend: [{ label: 'Wk 1', expected: 1250, collected: 1250 }],
  methods: [{ method: 'M-Pesa', count: 2, amount: 1000 }],
  weekLabel: 'Week 2',
  behaviors: [{
    id: 'behavior-miss-Amina',
    tone: 'red',
    title: 'Amina misses payments',
    detail: 'Nothing paid in 2 weeks',
    studentName: 'Amina',
    trajectory: 'worsening',
  }],
  aging: {
    buckets: [{ key: '5plus', label: '5+ weeks', count: 1, amount: 5000 }],
    totalOutstanding: 5000,
    oldest: { studentName: 'Amina', className: 'Grade 7', weeks: 6, balance: 5000 },
  },
}

describe('coachMoney', () => {
  it('formats numbers as KSh with thousands separators', () => {
    expect(coachMoney(1250)).toBe('KSh 1,250')
    expect(coachMoney(0)).toBe('KSh 0')
  })
})

describe('buildCoachSnapshot', () => {
  it('includes the week, totals, trend, methods, aging and behaviors', () => {
    const snap = buildCoachSnapshot(input)
    expect(snap).toContain('WEEK: Week 2')
    expect(snap).toContain('KSh 1,250')
    expect(snap).toContain('M-Pesa')
    expect(snap).toContain('AGING:')
    expect(snap).toContain('oldest Amina 6 weeks')
    expect(snap).toContain('Amina misses payments')
    expect(snap).toContain('(worsening)')
    expect(snap).toContain('Amina (Grade 7)')
  })

  it('omits sections that have no data', () => {
    const empty: CoachInput = {
      rows: [],
      totals: { expected: 0, collected: 0, outstanding: 0, credit: 0, flaggedCount: 0, collectionRate: 100 },
      trend: [],
      methods: [],
      weekLabel: 'Week 1',
    }
    const snap = buildCoachSnapshot(empty)
    expect(snap).toContain('WEEK: Week 1')
    expect(snap).not.toContain('TREND:')
    expect(snap).not.toContain('METHODS:')
    expect(snap).not.toContain('AGING:')
    expect(snap).not.toContain('STUDENTS:')
  })
})

describe('parseCoachCommentary', () => {
  it('returns trimmed plain text', () => {
    expect(parseCoachCommentary('  Great week, three accounts need a nudge.  ')).toBe('Great week, three accounts need a nudge.')
  })

  it('extracts text from code fences', () => {
    const c = parseCoachCommentary('Here you go:\n```text\nThree accounts still owe this week.\n```\nThanks!')
    expect(c).toBe('Three accounts still owe this week.')
  })

  it('flattens bullet lines into prose', () => {
    const c = parseCoachCommentary('- First line\n- Second line')
    expect(c).toBe('First line Second line')
  })

  it('returns null for empty or whitespace content', () => {
    expect(parseCoachCommentary('')).toBeNull()
    expect(parseCoachCommentary('   \n ')).toBeNull()
  })

  it('returns null when only empty fences are present', () => {
    expect(parseCoachCommentary('```\n```')).toBeNull()
  })

  it('has a coach system prompt mentioning Peak Coach', () => {
    expect(COACH_SYSTEM_PROMPT).toContain('Peak Coach')
  })
})
