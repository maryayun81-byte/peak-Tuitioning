import { describe, it, expect } from 'vitest'
import { buildCoachBrief } from '@/lib/weekly-insights'
import type { CoachInput, CoachRow } from '@/lib/weekly-insights'

const TODAY = new Date('2026-07-10') // Friday of W1

function row(overrides: Partial<CoachRow> = {}): CoachRow {
  return {
    name: 'Amina',
    className: 'Grade 7',
    expected: 1250,
    paid: 0,
    balance: 1250,
    carryIn: 0,
    promisedDate: '',
    flagLabel: 'Overdue',
    flagTone: 'red',
    ...overrides,
  }
}

function brief(input: Partial<CoachInput>) {
  return buildCoachBrief({
    rows: [],
    totals: { expected: 0, collected: 0, outstanding: 0, credit: 0, flaggedCount: 0, collectionRate: 100 },
    trend: [],
    methods: [],
    weekLabel: 'Week 2',
    today: TODAY,
    ...input,
  })
}

describe('buildCoachBrief verdicts', () => {
  it('shows a placeholder when the roster is empty', () => {
    const { verdicts } = brief({ rows: [] })
    expect(verdicts.some((v) => /No students on the roster/i.test(v))).toBe(true)
  })

  it('celebrates a fully collected week', () => {
    const { verdicts } = brief({
      rows: [row({ balance: 0, paid: 1250 })],
      totals: { expected: 1250, collected: 1250, outstanding: 0, credit: 0, flaggedCount: 0, collectionRate: 100 },
    })
    expect(verdicts.some((v) => /Every account is settled/i.test(v))).toBe(true)
  })

  it('names the outstanding amount in the verdict', () => {
    const { verdicts } = brief({
      rows: [row()],
      totals: { expected: 1250, collected: 0, outstanding: 1250, credit: 0, flaggedCount: 1, collectionRate: 0 },
    })
    expect(verdicts.some((v) => /1,250 outstanding/i.test(v))).toBe(true)
  })
})

describe('buildCoachBrief flags', () => {
  it('flags an overdue balance with no promise as red', () => {
    const { flags } = brief({ rows: [row()] })
    const flag = flags.find((f) => f.id === 'overdue-nopromise-Amina')
    expect(flag).toBeDefined()
    expect(flag!.tone).toBe('red')
    expect(flag!.title).toContain('owes KSh 1,250')
  })

  it('flags a promise whose date has passed as red', () => {
    const { flags } = brief({ rows: [row({ promisedDate: '2026-07-08', flagLabel: 'Overdue' })] })
    const flag = flags.find((f) => f.id === 'promise-passed-Amina')
    expect(flag).toBeDefined()
    expect(flag!.tone).toBe('red')
    expect(flag!.title).toContain('2026-07-08')
  })

  it('flags an imminent promise as amber', () => {
    const { flags } = brief({ rows: [row({ promisedDate: '2026-07-11', flagLabel: 'Imminent' })] })
    const flag = flags.find((f) => f.id === 'promise-imminent-Amina')
    expect(flag).toBeDefined()
    expect(flag!.tone).toBe('amber')
  })

  it('flags carried-in debt as amber', () => {
    const { flags } = brief({ rows: [row({ carryIn: 500, flagLabel: 'Promised' })] })
    const flag = flags.find((f) => f.id === 'carried-Amina')
    expect(flag).toBeDefined()
    expect(flag!.tone).toBe('amber')
    expect(flag!.title).toContain('500')
  })

  it('marks a credit balance green', () => {
    const { flags } = brief({ rows: [row({ balance: -250, paid: 1500, flagLabel: 'Credit' })] })
    const flag = flags.find((f) => f.id === 'credit-Amina')
    expect(flag).toBeDefined()
    expect(flag!.tone).toBe('green')
  })

  it('sorts red flags before amber and blue', () => {
    const { flags } = brief({
      rows: [
        row({ name: 'Brian', flagLabel: 'Promised', promisedDate: '2026-07-15' }),
        row({ name: 'Amina' }),
      ],
    })
    expect(flags[0].id).toBe('overdue-nopromise-Amina')
  })
})

describe('buildCoachBrief insights', () => {
  it('reports a week-over-week collection change', () => {
    const { insights } = brief({
      rows: [row()],
      trend: [
        { label: 'Wk 1', expected: 1250, collected: 1250 },
        { label: 'Wk 2', expected: 1250, collected: 500 },
      ],
    })
    const insight = insights.find((i) => i.id === 'trend')
    expect(insight).toBeDefined()
    expect(insight!.title).toContain('down 60 pts')
    expect(insight!.tone).toBe('red')
  })

  it('names the leading class when collection is strong', () => {
    const { insights } = brief({
      rows: [
        row({ name: 'Amina', className: 'Grade 7', balance: 0, paid: 1250 }),
        row({ name: 'Brian', className: 'Grade 8', balance: 1250 }),
      ],
    })
    const insight = insights.find((i) => i.id === 'best-class')
    expect(insight).toBeDefined()
    expect(insight!.title).toContain('Grade 7')
  })

  it('highlights the weakest class', () => {
    const { insights } = brief({
      rows: [
        row({ name: 'Amina', className: 'Grade 7', balance: 0, paid: 1250 }),
        row({ name: 'Brian', className: 'Grade 8', balance: 1250 }),
        row({ name: 'Carol', className: 'Grade 8', balance: 1250 }),
      ],
    })
    const insight = insights.find((i) => i.id === 'weak-class')
    expect(insight).toBeDefined()
    expect(insight!.title).toContain('Grade 8')
  })

  it('picks out the largest single balance', () => {
    const { insights } = brief({
      rows: [row({ name: 'Amina', balance: 3000 }), row({ name: 'Brian', balance: 1250 })],
    })
    const insight = insights.find((i) => i.id === 'largest-balance')
    expect(insight).toBeDefined()
    expect(insight!.title).toContain('Amina')
    expect(insight!.detail).toContain('3,000')
  })

  it('surfaces credit waiting on account', () => {
    const { insights } = brief({
      rows: [row({ balance: 0, paid: 1250 })],
      totals: { expected: 1250, collected: 1250, outstanding: 0, credit: 500, flaggedCount: 0, collectionRate: 100 },
    })
    const insight = insights.find((i) => i.id === 'credit')
    expect(insight).toBeDefined()
    expect(insight!.title).toContain('500')
  })

  it('names the top payment method', () => {
    const { insights } = brief({
      methods: [
        { method: 'Cash', count: 1, amount: 1250 },
        { method: 'M-Pesa', count: 4, amount: 5000 },
      ],
    })
    const insight = insights.find((i) => i.id === 'method')
    expect(insight).toBeDefined()
    expect(insight!.title).toContain('M-Pesa')
  })
})
