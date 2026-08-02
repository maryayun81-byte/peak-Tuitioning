// Pure helpers for the Peak Coach AI commentary action. Kept free of any
// server-only imports so the snapshot builder and the JSON parser can be
// unit-tested in isolation.

import type { CoachInput, CoachTone } from '@/lib/weekly-insights'

export const COACH_SYSTEM_PROMPT = `
You are Peak Coach, the warm, sharp, real-time payment coach for a Kenyan tuition centre.
You speak plainly and warmly, like a trusted centre manager — never robotic.

Given the weekly fee snapshot, write a short "coach brief" for the admin.
Use the exact figures provided (KSh amounts, percentages, student/class names).
Return STRICTLY a JSON object with this shape and nothing else:

{
  "verdict": "One punchy summary sentence of the week, e.g. '3 accounts still owe — and the trend is climbing.'",
  "flags": [
    { "tone": "red|amber|blue|green", "title": "Short headline", "detail": "One concrete sentence with a figure and the action to take" }
  ]
}

Rules:
- At most 3 flags, most important first.
- tone=red for urgent follow-up, amber for watch closely, green for all good.
- Never invent students, amounts or classes that are not in the snapshot.
- Keep it to 2-3 sentences total for the verdict; flags are short.
- No markdown, no emojis, no extra prose. JSON only.
`.trim()

export const VALID_COACH_TONES: CoachTone[] = ['red', 'amber', 'blue', 'green']

export interface ParsedCoachBrief {
  verdict: string
  flags: { tone: CoachTone; title: string; detail: string }[]
}

export function coachMoney(n: number): string {
  const val = Number(n) || 0
  return `KSh ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function buildCoachSnapshot(input: CoachInput): string {
  const { rows, totals, trend, methods, weekLabel, behaviors } = input
  const lines: string[] = []
  lines.push(`WEEK: ${weekLabel}`)
  lines.push(`TOTALS: expected ${coachMoney(totals.expected)}, collected ${coachMoney(totals.collected)} (${totals.collectionRate}%), outstanding ${coachMoney(totals.outstanding)}, credit ${coachMoney(totals.credit)}, ${totals.flaggedCount} flagged.`)

  if (trend.length) {
    lines.push(`TREND: ${trend.map((t) => `${t.label} ${coachMoney(t.expected)} expected / ${coachMoney(t.collected)} collected`).join('; ')}`)
  }
  if (methods.length) {
    lines.push(`METHODS: ${methods.map((m) => `${m.method} ${coachMoney(m.amount)} (${m.count})`).join('; ')}`)
  }
  if (behaviors?.length) {
    lines.push(`BEHAVIOR: ${behaviors.map((b) => `${b.title} — ${b.detail}`).join('; ')}`)
  }
  if (rows.length) {
    lines.push(`STUDENTS:`)
    for (const r of rows.slice(0, 60)) {
      lines.push(`- ${r.name} (${r.className}): expected ${coachMoney(r.expected)}, paid ${coachMoney(r.paid)}, balance ${coachMoney(r.balance)}, carry ${coachMoney(r.carryIn)}${r.promisedDate ? `, promised ${r.promisedDate}` : ''}, status ${r.flagLabel}`)
    }
  }
  return lines.join('\n')
}

export function parseCoachBrief(content: string): ParsedCoachBrief | null {
  try {
    const match = String(content || '').match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    const verdict = String(parsed?.verdict || '').trim()
    const flags = Array.isArray(parsed?.flags) ? parsed.flags : []
    const clean = flags
      .map((f: any) => ({
        tone: VALID_COACH_TONES.includes(f?.tone) ? (f.tone as CoachTone) : 'blue',
        title: String(f?.title || '').trim(),
        detail: String(f?.detail || '').trim(),
      }))
      .filter((f: any) => f.title)
      .slice(0, 3)
    if (!verdict && clean.length === 0) return null
    return { verdict, flags: clean }
  } catch {
    return null
  }
}
