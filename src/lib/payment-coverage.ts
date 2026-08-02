// Payment-coverage math — framework-free so the carryover logic can be
// unit-tested and reused by any front-end (Payment Hub, reports, exports).
//
// Model: a payment buys N teaching-day credits (N = amount / dailyRate). A
// credit is consumed only when the student actually attends that teaching day
// (from the attendance table). Unused credits roll forward automatically, so:
//
//   • pay for Tue+Wed, skip Wed, show up Thu  → Thursday is still covered
//   • pay for 5 days on Thursday              → covered through the 5th
//     upcoming teaching day (spilling into next week)
//
// "Paid until" is the date of the last upcoming teaching day the remaining
// credit reaches. Skipped days never waste money: because only attended days
// are consumed, the coverage end date simply slides forward.

export interface CoverageParams {
  /** Every active teaching date of the event, ascending (holidays already excluded). */
  activeDates: string[]
  /** Total amount paid so far (sum of all payment rows for the student/event). */
  totalPaid: number
  /** ISO dates the student was marked present in attendance. */
  attendedDates: string[]
  /** Charge per teaching day. */
  dailyRate: number
  /** ISO date used as "today" for elapsed/remaining computation. */
  today: string
}

export interface CoveredDay {
  date: string
  /** True when the credit covers the whole day; false when only a partial amount remains. */
  full: boolean
}

export interface CoverageResult {
  /** Total teaching-day credits purchased (totalPaid / dailyRate). */
  purchasedDays: number
  /** Attended days so far, capped so it can never exceed purchasedDays. */
  consumedDays: number
  /** Money already consumed by attended days (consumedDays * dailyRate). */
  consumedValue: number
  /** Credit still available after consumed days (>= 0). */
  remainingValue: number
  /** Remaining credit expressed in teaching days (can be fractional). */
  remainingDays: number
  /** Upcoming active dates (from today, inclusive) covered by remaining credit. */
  coveredDates: string[]
  /** Coverage detail for the covered dates (partial on the last date if credit runs out mid-day). */
  coveredDays: CoveredDay[]
  /** Last date the remaining credit reaches; null when nothing is covered. */
  coverageEndDate: string | null
  /** Whether the student is covered for an active teaching day that falls on `today`. */
  isCoveredToday: boolean
}

export function computeCoverage({
  activeDates,
  totalPaid,
  attendedDates,
  dailyRate,
  today,
}: CoverageParams): CoverageResult {
  const rate = Number(dailyRate) || 0
  const paid = Math.max(0, Number(totalPaid) || 0)

  const empty: CoverageResult = {
    purchasedDays: rate > 0 ? paid / rate : 0,
    consumedDays: 0,
    consumedValue: 0,
    remainingValue: 0,
    remainingDays: 0,
    coveredDates: [],
    coveredDays: [],
    coverageEndDate: null,
    isCoveredToday: false,
  }
  if (rate <= 0 || paid <= 0) return empty

  const attended = new Set(attendedDates)
  const elapsed = activeDates.filter((d) => d <= today)
  const purchasedDays = paid / rate
  const consumedDays = Math.min(
    elapsed.filter((d) => attended.has(d)).length,
    purchasedDays
  )
  const remainingValue = Math.max(0, paid - consumedDays * rate)

  // A teaching day that has already been attended is consumed, not re-covered.
  // "today" is still an upcoming (coverable) day when the student has not yet
  // been marked present for it — e.g. the financier records the payment as the
  // student walks in.
  const upcoming = activeDates.filter((d) => d > today || (d === today && !attended.has(d)))
  const coveredDays: CoveredDay[] = []
  let remaining = remainingValue
  for (const d of upcoming) {
    if (remaining <= 0) break
    coveredDays.push({ date: d, full: remaining >= rate })
    remaining -= rate
  }

  const coveredDates = coveredDays.map((c) => c.date)
  return {
    purchasedDays,
    consumedDays,
    consumedValue: consumedDays * rate,
    remainingValue,
    remainingDays: remainingValue / rate,
    coveredDates,
    coveredDays,
    coverageEndDate: coveredDates.length > 0 ? coveredDates[coveredDates.length - 1] : null,
    isCoveredToday: coveredDates.includes(today),
  }
}

// ---------------------------------------------------------------------
// Allocation helpers used by the payment form
// ---------------------------------------------------------------------

export interface DateAllocation {
  date: string
  full: boolean
  allocated: number
  credit: number
}

/**
 * Allocates a paid amount across the next available (uncovered) teaching
 * dates starting from `today`, spanning as many weeks as needed. Dates that
 * are already covered (in `alreadyCovered`) are skipped. Returns the per-date
 * allocations plus any leftover credit that could not be mapped to a date.
 */
export function allocateAcrossDates(params: {
  amount: number
  activeDates: string[]
  alreadyCovered: string[]
  dailyRate: number
  today: string
}): { allocations: DateAllocation[]; credit: number } {
  const rate = Number(params.dailyRate) || 0
  if (rate <= 0 || Number(params.amount) <= 0) {
    return { allocations: [], credit: Math.max(0, Number(params.amount) || 0) }
  }

  const covered = new Set(params.alreadyCovered)
  const upcoming = params.activeDates.filter(
    (d) => d >= params.today && !covered.has(d)
  )

  let remaining = Number(params.amount)
  const allocations: DateAllocation[] = []
  for (const d of upcoming) {
    if (remaining <= 0) break
    const allocated = Math.min(remaining, rate)
    allocations.push({ date: d, full: allocated >= rate, allocated, credit: 0 })
    remaining -= allocated
  }

  return { allocations, credit: Math.max(0, remaining) }
}

/** The next N uncovered teaching dates after `from` (defaults to today). Used to extend the day picker across weeks. */
export function nextUncoveredDates(params: {
  count: number
  activeDates: string[]
  alreadyCovered: string[]
  from?: string
  today?: string
}): string[] {
  const covered = new Set(params.alreadyCovered)
  const from = params.from ?? params.today ?? ''
  const out: string[] = []
  for (const d of params.activeDates) {
    if (out.length >= params.count) break
    if (d > from && !covered.has(d)) out.push(d)
  }
  return out
}
