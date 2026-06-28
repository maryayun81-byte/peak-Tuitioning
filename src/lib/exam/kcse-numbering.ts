/**
 * kcse-numbering.ts
 * Utilities for KCSE/CBC hierarchical question numbering.
 *
 * Supports unlimited nesting:
 *   1
 *   1(a)
 *   1(a)(i)
 *   1(a)(i)(I)
 *   1(a)(i)(I)(A)
 */

// ─── Types ─────────────────────────────────────────────────────────────────────
type Level = 'number' | 'lower_alpha' | 'lower_roman' | 'upper_roman' | 'upper_alpha'

const LEVELS: Level[] = ['number', 'lower_alpha', 'lower_roman', 'upper_roman', 'upper_alpha']

// ─── Sequence generators ────────────────────────────────────────────────────────
function toRoman(n: number, upper = true): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  const syms = ['m', 'cm', 'd', 'cd', 'c', 'xc', 'l', 'xl', 'x', 'ix', 'v', 'iv', 'i']
  let result = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) {
      result += syms[i]
      n -= vals[i]
    }
  }
  return upper ? result.toUpperCase() : result
}

function toLowerAlpha(n: number): string {
  return String.fromCharCode(96 + n) // a=1, b=2...
}

function toUpperAlpha(n: number): string {
  return String.fromCharCode(64 + n)
}

function formatSegment(level: Level, n: number): string {
  switch (level) {
    case 'number': return `${n}`
    case 'lower_alpha': return toLowerAlpha(n)
    case 'lower_roman': return toRoman(n, false)
    case 'upper_roman': return toRoman(n, true)
    case 'upper_alpha': return toUpperAlpha(n)
  }
}

// ─── Main: Generate question number ────────────────────────────────────────────
/**
 * Generate KCSE-style hierarchical question number.
 * @param path  Array of 1-based counters at each depth level.
 *              e.g. [1, 1, 2] → "1(a)(ii)"
 */
export function generateQuestionNumber(path: number[]): string {
  return path
    .map((n, depth) => {
      const level = LEVELS[Math.min(depth, LEVELS.length - 1)]
      const segment = formatSegment(level, n)
      return depth === 0 ? segment : `(${segment})`
    })
    .join('')
}

// ─── Auto-number a flat list of questions with depth ─────────────────────────
/**
 * Given a list of questions each with a depth (0 = top-level, 1 = sub, etc.),
 * generate KCSE numbering for all of them.
 */
export function autoNumberQuestions(questions: { id: string; depth: number }[]): Record<string, string> {
  const counters: number[] = []
  const result: Record<string, string> = {}

  for (const q of questions) {
    const depth = q.depth

    // Extend counters array if needed
    while (counters.length <= depth) counters.push(0)

    // Reset deeper counters when moving to a new top-level or same level
    if (counters.length > depth + 1) {
      counters.splice(depth + 1)
    }

    counters[depth] = (counters[depth] || 0) + 1
    result[q.id] = generateQuestionNumber(counters.slice(0, depth + 1))
  }

  return result
}

// ─── Parse a question number string back to path ─────────────────────────────
/**
 * Parse a KCSE question number string into its depth path.
 * "1(a)(ii)" → [1, 1, 2]
 */
export function parseQuestionNumber(label: string): number[] {
  const path: number[] = []
  // Split on top-level number and bracketed parts
  const topMatch = label.match(/^(\d+)/)
  if (topMatch) path.push(parseInt(topMatch[1]))
  
  const bracketedParts = label.matchAll(/\(([^)]+)\)/g)
  let depth = 1
  for (const match of bracketedParts) {
    const seg = match[1]
    const level = LEVELS[Math.min(depth, LEVELS.length - 1)]
    path.push(parseSegment(level, seg))
    depth++
  }
  return path
}

function parseSegment(level: Level, seg: string): number {
  switch (level) {
    case 'lower_alpha': return seg.charCodeAt(0) - 96
    case 'lower_roman': return fromRoman(seg)
    case 'upper_roman': return fromRoman(seg.toLowerCase())
    case 'upper_alpha': return seg.charCodeAt(0) - 64
    default: return parseInt(seg) || 1
  }
}

function fromRoman(s: string): number {
  const map: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }
  let total = 0
  for (let i = 0; i < s.length; i++) {
    const cur = map[s[i]] || 0
    const next = map[s[i + 1]] || 0
    total += cur < next ? -cur : cur
  }
  return total
}

// ─── Question number picker component helper ───────────────────────────────────
export const DEPTH_LABELS = [
  { depth: 0, example: '1, 2, 3...', label: 'Main question' },
  { depth: 1, example: '(a), (b), (c)...', label: 'Sub-question' },
  { depth: 2, example: '(i), (ii), (iii)...', label: 'Sub-sub-question' },
  { depth: 3, example: '(I), (II), (III)...', label: 'Deep sub-question' },
  { depth: 4, example: '(A), (B), (C)...', label: 'Deepest level' },
]
