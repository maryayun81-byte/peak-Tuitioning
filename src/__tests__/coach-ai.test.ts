import { describe, it, expect } from 'vitest'
import { buildCoachSnapshot, parseCoachBrief, coachMoney, COACH_SYSTEM_PROMPT } from '@/lib/coach-ai'
import type { CoachInput } from '@/lib/weekly-insights'

const input: CoachInput = {
  rows: [
    { name: 'Amina', className: 'Grade 7', expected: 1250, paid: 0, balance: 1250, carryIn: 0, promisedDate: '', flagLabel: 'Overdue', flagTone: 'red' },
  ],
  totals: { expected: 1250, collected: 0, outstanding: 1250, credit: 0, flaggedCount: 1, collectionRate: 0 },
  trend: [{ label: 'Wk 1', expected: 1250, collected: 1250 }],
  methods: [{ method: 'M-Pesa', count: 2, amount: 1000 }],
  weekLabel: 'Week 2',
  behaviors: [{ id: 'b', tone: 'red', title: 'Amina misses payments', detail: 'Nothing paid in 2 weeks' }],
}

describe('coachMoney', () => {
  it('formats numbers as KSh with thousands separators', () => {
    expect(coachMoney(1250)).toBe('KSh 1,250')
    expect(coachMoney(0)).toBe('KSh 0')
  })
})

describe('buildCoachSnapshot', () => {
  it('includes the week, totals, trend, methods and behaviors', () => {
    const snap = buildCoachSnapshot(input)
    expect(snap).toContain('WEEK: Week 2')
    expect(snap).toContain('KSh 1,250')
    expect(snap).toContain('M-Pesa')
    expect(snap).toContain('Amina misses payments')
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
    expect(snap).not.toContain('STUDENTS:')
  })
})

describe('parseCoachBrief', () => {
  it('parses a valid JSON brief', () => {
    const parsed = parseCoachBrief(`{"verdict":"3 accounts still owe.","flags":[{"tone":"red","title":"Amina owes","detail":"KSh 1,250"}]}`)
    expect(parsed).not.toBeNull()
    expect(parsed!.verdict).toBe('3 accounts still owe.')
    expect(parsed!.flags).toHaveLength(1)
    expect(parsed!.flags[0].tone).toBe('red')
  })

  it('extracts JSON from surrounding noise', () => {
    const parsed = parseCoachBrief('Here you go:\n```json\n{"verdict":"All good.","flags":[{"tone":"green","title":"Clean","detail":"Nothing owed"}]}\n```')
    expect(parsed).not.toBeNull()
    expect(parsed!.flags[0].tone).toBe('green')
  })

  it('coerces unknown tones to blue and drops empty titles', () => {
    const parsed = parseCoachBrief(`{"verdict":"ok","flags":[{"tone":"purple","title":"X","detail":"d"},{"tone":"red","title":"","detail":"d"}]}`)
    expect(parsed).not.toBeNull()
    expect(parsed!.flags).toHaveLength(1)
    expect(parsed!.flags[0].tone).toBe('blue')
  })

  it('caps flags at three', () => {
    const flags = Array.from({ length: 5 }, (_, i) => ({ tone: 'red', title: `F${i}`, detail: 'd' }))
    const parsed = parseCoachBrief(JSON.stringify({ verdict: 'v', flags }))
    expect(parsed!.flags).toHaveLength(3)
  })

  it('returns null for non-JSON or empty content', () => {
    expect(parseCoachBrief('not json at all')).toBeNull()
    expect(parseCoachBrief('{"verdict":"","flags":[]}')).toBeNull()
    expect(parseCoachBrief('')).toBeNull()
  })

  it('has a coach system prompt mentioning Peak Coach', () => {
    expect(COACH_SYSTEM_PROMPT).toContain('Peak Coach')
  })
})
