// Pure analytics for the Peak Coach panel on the weekly payments page.
// Framework-free so the flag/insight logic is unit-testable and can be shared
// with reports or notifications later.

export type CoachTone = 'red' | 'amber' | 'blue' | 'green'

export interface CoachRow {
  name: string
  className: string
  expected: number
  paid: number
  balance: number
  carryIn: number
  promisedDate: string
  flagLabel: string
  flagTone: string
  /** Number of separate payments logged this week (installments). */
  paymentCount?: number
}

export interface CoachTotals {
  expected: number
  collected: number
  outstanding: number
  credit: number
  flaggedCount: number
  collectionRate: number
}

export interface CoachTrendPoint {
  label: string
  expected: number
  collected: number
}

export interface CoachMethod {
  method: string
  count: number
  amount: number
}

export interface CoachInput {
  rows: CoachRow[]
  totals: CoachTotals
  trend: CoachTrendPoint[]
  methods: CoachMethod[]
  weekLabel: string
  today?: Date
  /** Per-student payment-behavior findings (see buildStudentBehaviors). */
  behaviors?: CoachBehavior[]
}

export interface CoachFlag {
  id: string
  tone: CoachTone
  title: string
  detail: string
}

export interface CoachInsight {
  id: string
  tone: CoachTone
  title: string
  detail: string
}

export interface CoachBehavior {
  id: string
  tone: CoachTone
  title: string
  detail: string
}

export interface CoachBrief {
  verdicts: string[]
  flags: CoachFlag[]
  insights: CoachInsight[]
}

function money(n: number, currency: string): string {
  const val = Number(n) || 0
  return `${currency} ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function rate(expected: number, collected: number): number {
  return expected > 0 ? Math.round((collected / expected) * 100) : 100
}

const TONE_RANK: Record<CoachTone, number> = { red: 4, amber: 3, blue: 2, green: 1 }

// ---------------------------------------------------------------------
// Per-student payment behavior analysis
// ---------------------------------------------------------------------

export interface CoachWeekHistory {
  weekLabel: string
  expected: number
  paid: number
  balance: number
  carryIn: number
  promisedDate?: string
  paymentCount: number
}

export interface CoachStudentHistory {
  name: string
  className: string
  weeks: CoachWeekHistory[]
}

/**
 * Looks across a student's recent weekly history and names the behavior
 * pattern that matters most to an admin following up on fees:
 *
 *  - Misses payments regularly        → red
 *  - Makes promises but rarely settles → amber
 *  - Carries debt across weeks        → amber
 *  - Pays in installments             → blue
 *  - Settles in full each week        → green
 *
 * At least two weeks with activity are required before a pattern is named,
 * so brand-new students are never mislabeled. Returns empty for too-little
 * history.
 */
export function buildStudentBehaviors(histories: CoachStudentHistory[]): CoachBehavior[] {
  const behaviors: CoachBehavior[] = []

  for (const history of histories || []) {
    const weeks = (history.weeks || []).filter((w) => Number(w.expected) > 0)
    if (weeks.length < 2) continue

    const settled = weeks.filter((w) => Number(w.paid) >= Number(w.expected)).length
    const zeroPaid = weeks.filter((w) => Number(w.paid) <= 0).length
    const carried = weeks.filter((w) => Number(w.carryIn) > 0).length
    const installments = weeks.filter((w) => Number(w.paymentCount) > 1).length
    const promisedWeeks = weeks.filter((w) => w.promisedDate)
    const promisesKept = promisedWeeks.filter((w) => Number(w.paid) >= Number(w.expected)).length

    const { name } = history
    const total = weeks.length

    if (zeroPaid >= 2) {
      behaviors.push({
        id: `behavior-miss-${name}`,
        tone: 'red',
        title: `${name} misses payments regularly`,
        detail: `Nothing paid in ${zeroPaid} of the last ${total} active weeks`,
      })
    } else if (promisedWeeks.length >= 2 && promisesKept === 0) {
      behaviors.push({
        id: `behavior-promise-${name}`,
        tone: 'amber',
        title: `${name} makes promises but rarely settles`,
        detail: `${promisedWeeks.length} promise${promisedWeeks.length > 1 ? 's' : ''} set, none cleared`,
      })
    } else if (carried >= 2) {
      behaviors.push({
        id: `behavior-carry-${name}`,
        tone: 'amber',
        title: `${name} carries debt across weeks`,
        detail: `Brought a balance forward in ${carried} of the last ${total} weeks`,
      })
    } else if (installments >= 2) {
      behaviors.push({
        id: `behavior-installments-${name}`,
        tone: 'blue',
        title: `${name} pays in installments`,
        detail: `Multiple payments logged in ${installments} of the last ${total} weeks`,
      })
    } else if (settled >= 2) {
      behaviors.push({
        id: `behavior-settled-${name}`,
        tone: 'green',
        title: `${name} settles in full each week`,
        detail: `Cleared the full fee in ${settled} of the last ${total} weeks`,
      })
    }
  }

  behaviors.sort((a, b) => TONE_RANK[b.tone] - TONE_RANK[a.tone])
  return behaviors
}

export function buildCoachBrief(input: CoachInput): CoachBrief {
  const { rows, totals, trend, methods, weekLabel } = input
  const today = input.today || new Date()
  const currency = 'KSh'

  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // ---- Flags (follow-up reminders) ----
  const flags: CoachFlag[] = []

  for (const row of rows) {
    if (row.balance <= 0) {
      if (row.balance < 0) {
        flags.push({
          id: `credit-${row.name}`,
          tone: 'green',
          title: `${row.name} is in credit`,
          detail: `${money(-row.balance, currency)} ready to roll forward`,
        })
      }
      continue
    }

    const owes = money(row.balance, currency)
    const promised = row.promisedDate || ''

    if (row.flagLabel === 'Overdue' && !promised) {
      flags.push({
        id: `overdue-nopromise-${row.name}`,
        tone: 'red',
        title: `${row.name} owes ${owes} with no promise`,
        detail: `${row.className} · overdue with no payment date set`,
      })
      continue
    }

    if (promised && promised < todayIso) {
      flags.push({
        id: `promise-passed-${row.name}`,
        tone: 'red',
        title: `${row.name}'s promise (${promised}) passed`,
        detail: `${owes} still owed in ${row.className}`,
      })
      continue
    }

    if (row.flagLabel === 'Imminent' && promised) {
      flags.push({
        id: `promise-imminent-${row.name}`,
        tone: 'amber',
        title: `${row.name} promised ${promised}`,
        detail: `Due within days · ${owes} in ${row.className}`,
      })
      continue
    }

    if (row.carryIn > 0) {
      flags.push({
        id: `carried-${row.name}`,
        tone: 'amber',
        title: `${row.name} carried ${money(row.carryIn, currency)} from last week`,
        detail: `${owes} total balance in ${row.className}`,
      })
      continue
    }

    flags.push({
      id: `owing-${row.name}`,
      tone: 'amber',
      title: `${row.name} owes ${owes}`,
      detail: `${row.flagLabel} · ${row.className}`,
    })
  }

  flags.sort((a, b) => TONE_RANK[b.tone] - TONE_RANK[a.tone])

  // ---- Insights ----
  const insights: CoachInsight[] = []

  // Week-over-week collection change
  if (trend.length >= 2) {
    const current = trend[trend.length - 1]
    const previous = trend[trend.length - 2]
    const curRate = rate(current.expected, current.collected)
    const prevRate = rate(previous.expected, previous.collected)
    const diff = curRate - prevRate
    if (Math.abs(diff) >= 3 && current.expected > 0) {
      insights.push({
        id: 'trend',
        tone: diff > 0 ? 'green' : 'red',
        title: `Collection ${diff > 0 ? 'up' : 'down'} ${Math.abs(diff)} pts vs last week`,
        detail: `${curRate}% now vs ${prevRate}% last week`,
      })
    }
  }

  // Best / most-at-risk class
  const perClass = new Map<string, { expected: number; collected: number }>()
  for (const row of rows) {
    const cur = perClass.get(row.className) || { expected: 0, collected: 0 }
    cur.expected += row.expected
    cur.collected += row.paid
    perClass.set(row.className, cur)
  }
  const classStats = [...perClass.entries()]
    .map(([className, v]) => ({ className, ...v, rate: rate(v.expected, v.collected) }))
    .sort((a, b) => b.rate - a.rate)
  if (classStats.length > 1) {
    const best = classStats[0]
    const weakest = classStats[classStats.length - 1]
    if (best.rate >= 85 && best.expected > 0) {
      insights.push({
        id: 'best-class',
        tone: 'green',
        title: `${best.className} leads at ${best.rate}%`,
        detail: `Highest collection rate of any class this week`,
      })
    }
    if (weakest.rate < 60 && weakest.expected > 0 && weakest.className !== best.className) {
      insights.push({
        id: 'weak-class',
        tone: 'amber',
        title: `${weakest.className} is at ${weakest.rate}%`,
        detail: `Lowest collection rate — worth a focused reminder`,
      })
    }
  }

  // Largest single balance
  const largest = [...rows].sort((a, b) => b.balance - a.balance)[0]
  if (largest && largest.balance > 0) {
    insights.push({
      id: 'largest-balance',
      tone: 'amber',
      title: `${largest.name} has the largest balance`,
      detail: `${money(largest.balance, currency)} outstanding in ${largest.className}`,
    })
  }

  // Credit ready to roll
  if (totals.credit > 0) {
    insights.push({
      id: 'credit',
      tone: 'green',
      title: `${money(totals.credit, currency)} in credit on account`,
      detail: `Overpayments that will auto-apply to future weeks`,
    })
  }

  // Preferred payment method
  if (methods.length > 0) {
    const top = [...methods].sort((a, b) => b.amount - a.amount)[0]
    insights.push({
      id: 'method',
      tone: 'blue',
      title: `${top.method} is the top payment method`,
      detail: `${money(top.amount, currency)} across ${top.count} payment${top.count === 1 ? '' : 's'}`,
    })
  }

  // Per-student payment behavior (computed from multi-week history)
  for (const behavior of input.behaviors || []) {
    insights.push({
      id: behavior.id,
      tone: behavior.tone,
      title: behavior.title,
      detail: behavior.detail,
    })
  }

  insights.sort((a, b) => TONE_RANK[b.tone] - TONE_RANK[a.tone])

  // ---- Verdicts (rotating "alive" status lines) ----
  const verdicts: string[] = []
  if (rows.length === 0) {
    verdicts.push('No students on the roster yet — add students to start tracking.')
    verdicts.push('Waiting for data… Peak Coach is ready when you are.')
  } else if (totals.flaggedCount === 0 && totals.outstanding === 0) {
    verdicts.push(`Every account is settled — ${totals.collectionRate}% collected this week.`)
    verdicts.push(`Fully collected for ${weekLabel}. Beautiful week!`)
    verdicts.push('All caught up. The Friday report will reflect a clean week.')
  } else {
    verdicts.push(`${totals.flaggedCount} of ${rows.length} accounts still owe this week.`)
    verdicts.push(`${money(totals.outstanding, currency)} outstanding for ${weekLabel}.`)
    if (totals.collectionRate < 60) verdicts.push(`Collection is at ${totals.collectionRate}% — time to follow up.`)
    else verdicts.push(`Collection is tracking at ${totals.collectionRate}%.`)
    verdicts.push('Peak Coach is watching every payment as it comes in.')
    verdicts.push('Log each payment as it arrives to keep the flags fresh.')
  }

  return { verdicts, flags, insights }
}
