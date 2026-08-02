// Pure helpers for the Peak Coach AI commentary action. Kept free of any
// server-only imports so the snapshot builder and the commentary parser can be
// unit-tested in isolation.
//
// The AI layer only ever produces a short labelled "commentary" paragraph. It
// never replaces the deterministic brief (flags, insights, verdicts are always
// computed by buildCoachBrief in lib/weekly-insights), so a model can add
// context but can never contradict the numbers or change what the admin must
// follow up on.

import type { CoachInput } from '@/lib/weekly-insights'

export const COACH_SYSTEM_PROMPT = `
You are Peak Coach, the warm, sharp, weekly payment coach for a Kenyan tuition centre.
You speak plainly and warmly, like a trusted centre manager — never robotic.

Below is the weekly fee snapshot (KSh figures, percentages, student and class names).
Write a SHORT commentary of 2-4 sentences summarising the state of the week for the
admin. Use the exact figures provided. Cover, where relevant:
- how the week is going overall (collection pace),
- any balances that are getting old and need a direct call,
- any promising signs (classes collecting well, students clearing up).

Rules:
- Plain text only. No JSON, no markdown, no bullet lists, no emojis.
- Never invent students, amounts or classes that are not in the snapshot.
- Do not give payment instructions or advice; just describe what you see.
`.trim()

export interface CoachCommentary {
  text: string
  provider: string
  model?: string
}

export function coachMoney(n: number): string {
  const val = Number(n) || 0
  return `KSh ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function buildCoachSnapshot(input: CoachInput): string {
  const { rows, totals, trend, methods, weekLabel, behaviors, aging } = input
  const lines: string[] = []
  lines.push(`WEEK: ${weekLabel}`)
  lines.push(`TOTALS: expected ${coachMoney(totals.expected)}, collected ${coachMoney(totals.collected)} (${totals.collectionRate}%), outstanding ${coachMoney(totals.outstanding)}, credit ${coachMoney(totals.credit)}, ${totals.flaggedCount} flagged.`)

  if (trend.length) {
    lines.push(`TREND: ${trend.map((t) => `${t.label} ${coachMoney(t.expected)} expected / ${coachMoney(t.collected)} collected`).join('; ')}`)
  }
  if (methods.length) {
    lines.push(`METHODS: ${methods.map((m) => `${m.method} ${coachMoney(m.amount)} (${m.count})`).join('; ')}`)
  }
  if (aging && aging.buckets.length) {
    lines.push(`AGING: ${aging.buckets.map((b) => `${b.label} ${b.count} account(s) ${coachMoney(b.amount)}`).join('; ')}${aging.oldest ? `; oldest ${aging.oldest.studentName} ${aging.oldest.weeks} weeks` : ''}`)
  }
  if (behaviors?.length) {
    lines.push(`BEHAVIOR: ${behaviors.map((b) => `${b.title} — ${b.detail} (${b.trajectory})`).join('; ')}`)
  }
  if (rows.length) {
    lines.push(`STUDENTS:`)
    for (const r of rows.slice(0, 60)) {
      lines.push(`- ${r.name} (${r.className}): expected ${coachMoney(r.expected)}, paid ${coachMoney(r.paid)}, balance ${coachMoney(r.balance)}, carry ${coachMoney(r.carryIn)}${r.promisedDate ? `, promised ${r.promisedDate}` : ''}, status ${r.flagLabel}`)
    }
  }
  return lines.join('\n')
}

/**
 * Extracts a short commentary paragraph from a model response. Strips code
 * fences and surrounding prose, returns trimmed plain text, or null when the
 * model produced nothing usable (so callers can fall back to the next
 * provider).
 */
export function parseCoachCommentary(content: string): string | null {
  const raw = String(content || '')
  if (!raw.trim()) return null

  const fenced = raw.match(/```(?:text|plain)?\s*([\s\S]*?)```/i)
  const body = (fenced ? fenced[1] : raw).trim()
  if (!body) return null

  const cleaned = body
    .split('\n')
    .map((l) => l.replace(/^[-*+]\s+/, '').trim())
    .filter(Boolean)
    .join(' ')
    .trim()

  return cleaned || null
}
