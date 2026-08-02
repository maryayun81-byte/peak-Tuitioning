import { describe, it, expect } from 'vitest'
import {
  cumulativeBalanceFor,
  expectedFeeFor,
  ownBalanceFor,
  weekWasTouched,
  computeFlag,
  toISODate,
  getMondayOf,
} from '@/lib/weekly-payments'
import { buildWeeklyReportPdf, buildOutstandingBalancesPdf } from '@/lib/reports/weekly-payment-report'
import type { PaymentEntry, RosterStudent } from '@/lib/weekly-payments'

const W1 = '2026-07-06' // Monday
const W2 = '2026-07-13'
const W3 = '2026-07-20'
const TODAY = new Date('2026-07-10') // Friday of W1

function student(overrides: Partial<RosterStudent> = {}): RosterStudent {
  return { id: 'stu_1', name: 'Amina', fee: 1250, ...overrides }
}
function pay(week: string, amount: number, method = 'Cash', id = 'pay_1'): PaymentEntry {
  return { id, studentId: 'stu_1', weekStart: week, date: week, amount, method }
}

describe('weekly-payments balance logic', () => {
  it('exact payment gives a zero balance', () => {
    expect(cumulativeBalanceFor(student(), W1, [pay(W1, 1250)], {}, {})).toBe(0)
  })

  it('underpayment leaves the remainder owing', () => {
    expect(cumulativeBalanceFor(student(), W1, [pay(W1, 1000)], {}, {})).toBe(250)
  })

  it('multiple installments in the same week sum correctly', () => {
    const entries = [pay(W1, 500, 'Cash', 'a'), pay(W1, 450, 'M-Pesa', 'b'), pay(W1, 300, 'Cash', 'c')]
    expect(cumulativeBalanceFor(student(), W1, entries, {}, {})).toBe(0)
  })

  it('an overpayment shows as credit', () => {
    expect(cumulativeBalanceFor(student(), W1, [pay(W1, 2250)], {}, {})).toBe(-1000)
  })

  it('credit rolls into the next touched week', () => {
    // W1 overpaid by 1000 → credit. W2 has no payment of its own, but W1 was
    // touched, so W2 owes 1250 − 1000 = 250.
    const balance = cumulativeBalanceFor(student(), W2, [pay(W1, 2250)], {}, {})
    expect(balance).toBe(250)
  })

  it('debt rolls forward through a chain of touched weeks', () => {
    // W1 unpaid but touched via a fee override (activity recorded) → owes 1250.
    // W2 paid 1000 → owes 250 more. Total carried = 1250 + 250 = 1500.
    const overrides = { [`${W1}__stu_1`]: 1250 }
    const balance = cumulativeBalanceFor(student(), W2, [pay(W2, 1000)], {}, overrides)
    expect(balance).toBe(1500)
  })

  it('an untouched week breaks the chain (no invented debt)', () => {
    // W1 owes 250, W2 is completely untouched. W3 must NOT inherit W1's debt.
    const balance = cumulativeBalanceFor(student(), W3, [pay(W1, 1000)], {}, {})
    expect(balance).toBe(1250)
  })

  it('a fee override changes only that week, not the standard rate', () => {
    const overrides = { [`${W1}__stu_1`]: 750 }
    expect(expectedFeeFor(student(), W1, overrides)).toBe(750)
    expect(expectedFeeFor(student(), W2, overrides)).toBe(1250)
    expect(ownBalanceFor(student(), W1, [], overrides)).toBe(750)
  })

  it('detects touched weeks from payments, promises and overrides', () => {
    expect(weekWasTouched('stu_1', W1, [pay(W1, 100)]),).toBe(true)
    expect(weekWasTouched('stu_1', W1, [], { [`${W1}__stu_1`]: '2026-07-15' })).toBe(true)
    expect(weekWasTouched('stu_1', W1, [], {}, { [`${W1}__stu_1`]: 1250 })).toBe(true)
    expect(weekWasTouched('stu_1', W1, [], {}, {})).toBe(false)
  })

  it('daily plan bills dailyFee x active days, defaulting to a 5-day week', () => {
    const s = student({ plan: 'daily', dailyFee: 250 })
    expect(expectedFeeFor(s, W1, {}, () => 5)).toBe(1250)
    expect(expectedFeeFor(s, W1, {}, () => 3)).toBe(750)
    expect(expectedFeeFor(s, W1, {}, undefined)).toBe(1250)
  })

  it('a weekly override wins over the daily plan for that week', () => {
    const s = student({ plan: 'daily', dailyFee: 250 })
    const overrides = { [`${W1}__stu_1`]: 600 }
    expect(expectedFeeFor(s, W1, overrides, () => 5)).toBe(600)
    expect(ownBalanceFor(s, W1, [], overrides, () => 5)).toBe(600)
  })

  it('daily plan credit carries into the next touched week', () => {
    // W1 has 3 active days => expected 750. Paid 1000 => 250 credit.
    // W2 has 3 active days => expected 750; the credit applies => owes 500.
    const s = student({ plan: 'daily', dailyFee: 250 })
    const balance = cumulativeBalanceFor(s, W2, [pay(W1, 1000)], {}, {}, () => 3)
    expect(balance).toBe(500)
  })

  it('daily plan debt rolls forward through a chain of touched weeks', () => {
    // W1: 3 days => 750 due, paid 500 => 250 owed (week touched via payment).
    // W2: 3 days => 750 due, nothing paid => 250 + 750 = 1000 carried.
    const s = student({ plan: 'daily', dailyFee: 250 })
    const balance = cumulativeBalanceFor(s, W2, [pay(W1, 500)], {}, {}, () => 3)
    expect(balance).toBe(1000)
  })

  it('an untouched week breaks the daily-plan chain too', () => {
    // W1: 3 days => 750 due, unpaid but untouched. W2 untouched. W3: 3 days.
    // Nothing carries, so W3 just owes its own 750.
    const s = student({ plan: 'daily', dailyFee: 250 })
    expect(cumulativeBalanceFor(s, W3, [], {}, {}, () => 3)).toBe(750)
  })
})

describe('computeFlag', () => {
  it('marks paid and credit balances', () => {
    expect(computeFlag({ balance: 0, promisedDate: '', weekStart: W1 }, TODAY).label).toBe('Paid')
    expect(computeFlag({ balance: -500, promisedDate: '', weekStart: W1 }, TODAY).label).toBe('Credit')
  })

  it('flags a future week as "Not yet due"', () => {
    const flag = computeFlag({ balance: 500, promisedDate: '', weekStart: W2 }, TODAY)
    expect(flag.label).toBe('Not yet due')
    expect(flag.tone).toBe('gray')
  })

  it('escalates an unpaid balance to Overdue', () => {
    const flag = computeFlag({ balance: 500, promisedDate: '', weekStart: W1 }, TODAY)
    expect(flag.label).toBe('Overdue')
    expect(flag.tone).toBe('red')
  })

  it('honours a promise date: Promised, Imminent, then Overdue', () => {
    expect(computeFlag({ balance: 500, promisedDate: '2026-07-15', weekStart: W1 }, TODAY).label).toBe('Promised')
    expect(computeFlag({ balance: 500, promisedDate: '2026-07-11', weekStart: W1 }, TODAY).label).toBe('Imminent')
    expect(computeFlag({ balance: 500, promisedDate: '2026-07-09', weekStart: W1 }, TODAY).label).toBe('Overdue')
  })
})

describe('date helpers', () => {
  it('normalises any day to the Monday of its week', () => {
    expect(toISODate(getMondayOf(new Date('2026-07-10')))).toBe('2026-07-06')
    expect(toISODate(getMondayOf(new Date('2026-07-05')))).toBe('2026-06-29')
  })
})

describe('weekly report PDF builders', () => {
  const summary = {
    eventName: 'Full Term',
    eventId: 'evt_1',
    weekLabel: 'Week 2',
    weekStart: '2026-07-13',
    weekEnd: '2026-07-19',
    weekNumber: 2,
    totalStudents: 3,
    expected: 3750,
    collected: 2500,
    outstanding: 1250,
    credit: 0,
    collectionRate: 67,
    flaggedCount: 1,
    perClass: [
      { name: 'Grade 7', students: 2, expected: 2500, collected: 2500, outstanding: 0, credit: 0 },
      { name: 'Grade 8', students: 1, expected: 1250, collected: 0, outstanding: 1250, credit: 0 },
    ],
    rows: [
      {
        studentId: 'stu_1',
        name: 'Amina',
        className: 'Grade 7',
        weeklyFee: 1250,
        expected: 1250,
        paid: 1250,
        balance: 0,
        carryIn: 0,
        promisedDate: null,
        flag: { label: 'Paid', tone: 'green' as const },
      },
      {
        studentId: 'stu_2',
        name: 'Brian',
        className: 'Grade 7',
        weeklyFee: 1250,
        expected: 1250,
        paid: 1250,
        balance: 0,
        carryIn: 0,
        promisedDate: null,
        flag: { label: 'Paid', tone: 'green' as const },
      },
      {
        studentId: 'stu_3',
        name: 'Carol',
        className: 'Grade 8',
        weeklyFee: 1250,
        expected: 1250,
        paid: 0,
        balance: 1250,
        carryIn: 0,
        promisedDate: '2026-07-18',
        flag: { label: 'Promised', tone: 'blue' as const },
      },
    ],
  }

  it('builds the weekly report PDF without throwing', () => {
    const pdf = buildWeeklyReportPdf(summary)
    expect(pdf.length).toBeGreaterThan(1000)
    expect(pdf.subarray(0, 4).toString('latin1')).toBe('%PDF')
  })

  it('builds the outstanding balances PDF without throwing', () => {
    const pdf = buildOutstandingBalancesPdf(summary)
    expect(pdf.length).toBeGreaterThan(1000)
    expect(pdf.subarray(0, 4).toString('latin1')).toBe('%PDF')
  })

  it('paginates a large roster across multiple pages', () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({
      studentId: `stu_${i}`,
      name: `Student ${i}`,
      className: i % 2 ? 'Grade 7' : 'Grade 8',
      weeklyFee: 1250,
      expected: 1250,
      paid: i % 3 === 0 ? 1250 : 500,
      balance: i % 3 === 0 ? 0 : 750,
      carryIn: 0,
      promisedDate: i % 2 ? '2026-07-18' : null,
      flag: {
        label: i % 3 === 0 ? ('Paid' as const) : ('Overdue' as const),
        tone: i % 3 === 0 ? ('green' as const) : ('red' as const),
      },
    }))
    const big = {
      ...summary,
      totalStudents: 60,
      expected: 75000,
      collected: 40000,
      outstanding: 35000,
      collectionRate: 53,
      flaggedCount: 40,
      perClass: [
        { name: 'Grade 7', students: 30, expected: 37500, collected: 20000, outstanding: 17500, credit: 0 },
        { name: 'Grade 8', students: 30, expected: 37500, collected: 20000, outstanding: 17500, credit: 0 },
      ],
      rows,
    }
    const pdf = buildWeeklyReportPdf(big)
    expect(pdf.length).toBeGreaterThan(1000)
    expect(pdf.subarray(0, 4).toString('latin1')).toBe('%PDF')
  })
})
