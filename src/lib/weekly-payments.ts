// Pure weekly-payments math. Kept framework-free so the carrying-balance
// logic can be unit-tested and reused by any front-end (page, report, export).

export interface PaymentEntry {
  id: string
  studentId: string
  weekStart: string
  date: string
  amount: number
  method: string
  note?: string
}
export interface RosterStudent {
  id: string
  name: string
  fee: number
}
export type FeeOverrides = Record<string, number>
export type Promises = Record<string, string>

export interface Flag {
  label: string
  tone: 'green' | 'blue' | 'amber' | 'red' | 'gray'
}

export const DEFAULT_WEEKLY_FEE = 1250
export const DAYS_PER_WEEK = 5
// How many consecutive touched weeks we'll walk back through when carrying a
// balance forward. High enough to never matter in practice.
const MAX_CARRY_LOOKBACK_WEEKS = 104

// ---------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------
export function toISODate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
export function daysBetween(a: Date | string, b: Date | string): number {
  const MS = 24 * 60 * 60 * 1000
  return Math.round((new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) / MS)
}

// ---------------------------------------------------------------------
// Per-student / per-week computation
// ---------------------------------------------------------------------
export function weekKey(studentId: string, week: string): string {
  return `${week}__${studentId}`
}

export function paymentsFor(payments: PaymentEntry[], studentId: string, week: string): PaymentEntry[] {
  return payments.filter((p) => p.studentId === studentId && p.weekStart === week)
}

export function paidTotalFor(payments: PaymentEntry[], studentId: string, week: string): number {
  return paymentsFor(payments, studentId, week).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
}

export function expectedFeeFor(student: RosterStudent, week: string, feeOverrides: FeeOverrides = {}): number {
  const key = weekKey(student.id, week)
  return feeOverrides[key] != null ? feeOverrides[key] : student.fee
}

export function ownBalanceFor(
  student: RosterStudent,
  week: string,
  payments: PaymentEntry[],
  feeOverrides: FeeOverrides = {}
): number {
  return expectedFeeFor(student, week, feeOverrides) - paidTotalFor(payments, student.id, week)
}

// A week only "counts" for carryover purposes if something was actually
// recorded for it — otherwise every untouched past week would look like a
// debt, since the default expected fee is always > 0.
export function weekWasTouched(
  studentId: string,
  week: string,
  payments: PaymentEntry[],
  promises: Promises = {},
  feeOverrides: FeeOverrides = {}
): boolean {
  if (paymentsFor(payments, studentId, week).length > 0) return true
  if (promises[weekKey(studentId, week)]) return true
  if (feeOverrides[weekKey(studentId, week)] != null) return true
  return false
}

// Walk backwards through consecutive touched weeks, summing each week's own
// (expected − paid). A credit from overpaying one week rolls straight into the
// next touched week's total; so does unpaid debt. Hitting an untouched week
// stops the chain, so history from before the roster was in use never counts.
export function cumulativeBalanceFor(
  student: RosterStudent,
  week: string,
  payments: PaymentEntry[],
  promises: Promises = {},
  feeOverrides: FeeOverrides = {}
): number {
  let total = ownBalanceFor(student, week, payments, feeOverrides)
  let cursor = week
  for (let i = 0; i < MAX_CARRY_LOOKBACK_WEEKS; i++) {
    const prev = toISODate(addDays(parseISODate(cursor), -7))
    if (!weekWasTouched(student.id, prev, payments, promises, feeOverrides)) break
    total += ownBalanceFor(student, prev, payments, feeOverrides)
    cursor = prev
  }
  return total
}

// ---------------------------------------------------------------------
// Status flag
// ---------------------------------------------------------------------
export function computeFlag(
  { balance, promisedDate, weekStart }: { balance: number; promisedDate: string; weekStart: string },
  today: Date = new Date()
): Flag {
  const monday = parseISODate(weekStart)

  if (balance <= 0) return { label: balance < 0 ? 'Credit' : 'Paid', tone: 'green' }

  if (promisedDate) {
    const diffToPromise = daysBetween(today, promisedDate)
    if (diffToPromise < 0) return { label: 'Overdue', tone: 'red' }
    if (diffToPromise <= 2) return { label: 'Imminent', tone: 'amber' }
    return { label: 'Promised', tone: 'blue' }
  }

  const diffFromDue = daysBetween(monday, today)
  if (diffFromDue < 0) return { label: 'Not yet due', tone: 'gray' }
  if (diffFromDue >= 3) return { label: 'Overdue', tone: 'red' }
  return { label: 'Imminent', tone: 'amber' }
}
