/**
 * Default daily billing rates, keyed by class/curriculum.
 *
 * The reference rate is money-per-day (not weekly ÷ variable active days),
 * so a "day" costs the same in short holiday weeks as in full weeks:
 *   - CBC (Grade 6–9 and all other junior CBC classes): KES 200/day
 *   - Senior classes (Form 3, Form 4, Grade 10) and the 8-4-4/844 track:
 *     KES 250/day
 *
 * These are the *defaults* only. A class slot's explicit charge
 * (`tuition_event_class_slots`) always wins over these defaults.
 */

export const DEFAULT_CBC_DAILY_RATE = 200
export const DEFAULT_SENIOR_DAILY_RATE = 250

const SENIOR_CLASS_RE = /form3|form4|grade10/

export interface DefaultRateInput {
  /** curriculum display name, e.g. "CBC", "8-4-4", "844" */
  curriculumName?: string | null
  /** class display name, e.g. "Grade 7", "Form 3", "Grade 10" */
  className?: string | null
  /** legacy free-text class level on a registration */
  classLevel?: string | null
}

/** Normalizes text the same way the admin pricing presets do. */
export function normalizeRateText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '')
}

export function isSeniorClass(text: string): boolean {
  return SENIOR_CLASS_RE.test(normalizeRateText(text))
}

export function is844Curriculum(name: string): boolean {
  const normalized = normalizeRateText(name)
  return normalized.includes('8-4-4') || normalized.includes('844')
}

/** KES per teaching day for a class/curriculum that has no explicit slot rate. */
export function defaultDailyRateFor(input: DefaultRateInput = {}): number {
  const classText = [input.className, input.classLevel].filter(Boolean).join(' ')
  if (isSeniorClass(classText)) return DEFAULT_SENIOR_DAILY_RATE
  if (is844Curriculum(input.curriculumName ?? '')) return DEFAULT_SENIOR_DAILY_RATE
  return DEFAULT_CBC_DAILY_RATE
}
