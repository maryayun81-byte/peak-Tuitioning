// Time-aware session display (§11 timetable is the source of truth).
// Problem it solves: a session's stored student_status never changes on its
// own, so an 8–10 AM session still read "In progress" at 3 PM. These helpers
// derive what the student should SEE from the timetable + clock without
// rewriting history in the database.

export type TimeRelation = 'past' | 'live' | 'upcoming' | 'other-day'

export interface TimetableLike {
  day?: string | null
  start_time?: string | null
  end_time?: string | null
  status?: string | null
  student_status?: string | null
}

export function todayName(now: Date = new Date()): string {
  return now.toLocaleDateString('en-US', { weekday: 'long' })
}

function toMinutes(t: string | null | undefined): number | null {
  if (!t) return null
  const parts = t.split(':').map(Number)
  if (parts.some((n) => Number.isNaN(n))) return null
  return parts[0] * 60 + (parts[1] || 0)
}

/** Where "now" sits relative to a session's timetabled slot. */
export function sessionTimeRelation(
  session: TimetableLike,
  now: Date = new Date()
): TimeRelation {
  if (!session.day || session.day !== todayName(now)) return 'other-day'
  const start = toMinutes(session.start_time)
  const end = toMinutes(session.end_time)
  if (start === null || end === null) return 'other-day'
  const at = now.getHours() * 60 + now.getMinutes()
  if (at < start) return 'upcoming'
  if (at <= end) return 'live'
  return 'past'
}

const FINISHED = new Set(['COMPLETED', 'SUBMITTED'])

export function isUnfinished(session: TimetableLike): boolean {
  return !FINISHED.has(String(session.student_status || ''))
}

/**
 * True when today's slot has passed but the student never finished.
 * Display as "ended — resume where you left off", never as in-progress.
 * DB states (incl. MISSED) are left untouched; this is presentation truth.
 */
export function isEndedUnfinished(
  session: TimetableLike,
  now: Date = new Date()
): boolean {
  if (session.status === 'MISSED') return false // handled by the MISSED flow
  if (session.status === 'CANCELLED') return false
  if (!isUnfinished(session)) return false
  return sessionTimeRelation(session, now) === 'past'
}

/** True when the student could join right now. */
export function isHappeningNow(
  session: TimetableLike,
  now: Date = new Date()
): boolean {
  if (session.status === 'CANCELLED') return false
  if (!isUnfinished(session)) return false
  return sessionTimeRelation(session, now) === 'live'
}
