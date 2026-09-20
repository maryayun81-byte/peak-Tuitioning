// Spotlight announcements — rich "snapshot" modals for high-value school events.
//
// A notification becomes a spotlight when its `data` carries:
//   { spotlight: true, kind, href, snapshot: {...} }
// The QuickInfoModal rail renders the snapshot card; the realtime hook +
// initial-load check surface it automatically (both portals).
//
// Event sites build the payload with `spotlightData(kind, href, snapshot)`
// so the shape can never drift between producers and the modal.

export type SpotlightKind =
  | 'assignment_published'
  | 'quiz_published'
  | 'mission_published'
  | 'timetable_published'
  | 'assignment_returned'
  | 'submission_received'
  | 'scripts_ready'

export interface SpotlightPayload {
  spotlight: true
  kind: SpotlightKind
  /** Deep link opened by the card's primary CTA. */
  href: string
  /** Kind-specific snapshot fields rendered as rows (see QuickInfoModal). */
  snapshot: Record<string, string | number | null | undefined>
}

export function spotlightData(
  kind: SpotlightKind,
  href: string,
  snapshot: Record<string, string | number | null | undefined>
): SpotlightPayload {
  return { spotlight: true, kind, href, snapshot }
}

export function isSpotlight(data: any): data is SpotlightPayload {
  return !!data && data.spotlight === true && typeof data.kind === 'string' && typeof data.href === 'string'
}
