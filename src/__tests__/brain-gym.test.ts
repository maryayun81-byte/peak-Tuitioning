import { describe, it, expect } from 'vitest'
import { sanitizeQuestions, filterToRegisteredSubjects, getFallbackQuestions } from '@/lib/brainGymUtils'
import type { BrainGymQuestion } from '@/lib/brainGymUtils'

const makeQuestion = (overrides: Partial<BrainGymQuestion> = {}): any => ({
  id: 't1',
  subject: 'Mathematics',
  topic: 'Algebra',
  difficulty: 'medium',
  question: 'What is the value of x when 2x + 3 = 7? Solve for x using basic algebraic manipulation shown step by step.',
  options: ['x = 2', 'x = 5', 'x = 4', 'x = 1'],
  correctAnswer: 'x = 2',
  explanation: 'Subtract 3 from both sides: 2x = 4. Then divide both sides by 2: x = 2. This demonstrates the fundamental principle of maintaining equality when solving equations.',
  ...overrides,
})

describe('sanitizeQuestions', () => {
  it('drops null questions', () => {
    const result = sanitizeQuestions([null, makeQuestion()])
    expect(result).toHaveLength(1)
  })

  it('drops questions without a question string', () => {
    const result = sanitizeQuestions([makeQuestion({ question: '' })])
    expect(result).toHaveLength(0)
  })

  it('drops questions with fewer than 4 unique options', () => {
    const result = sanitizeQuestions([makeQuestion({ options: ['A', 'B', 'C'] })])
    expect(result).toHaveLength(0)
  })

  it('drops questions where options are only letter choices (A-D)', () => {
    const result = sanitizeQuestions([makeQuestion({ options: ['A', 'B', 'C', 'D'] })])
    expect(result).toHaveLength(0)
  })

  it('drops questions with short question text (< 35 chars)', () => {
    const result = sanitizeQuestions([makeQuestion({ question: 'Short q?' })])
    expect(result).toHaveLength(0)
  })

  it('drops questions with short explanation (< 45 chars)', () => {
    const result = sanitizeQuestions([makeQuestion({ explanation: 'Short.' })])
    expect(result).toHaveLength(0)
  })

  it('drops questions with "all of the above" or "none of the above"', () => {
    const q = makeQuestion({ options: ['A', 'B', 'All of the above', 'None of the above'] })
    const result = sanitizeQuestions([q])
    expect(result).toHaveLength(0)
  })

  it('converts letter-only correctAnswer to full option text', () => {
    const q = makeQuestion({ correctAnswer: 'A', options: ['x = 2', 'x = 5', 'x = 4', 'x = 1'] })
    const result = sanitizeQuestions([q])
    expect(result[0].correctAnswer).toBe('x = 2')
  })

  it('accepts a valid well-formed question', () => {
    const result = sanitizeQuestions([makeQuestion()])
    expect(result).toHaveLength(1)
    expect(result[0].subject).toBe('Mathematics')
  })

  it('removes duplicate options', () => {
    const q = makeQuestion({ options: ['x = 2', 'x = 2', 'x = 4', 'x = 1'] })
    const result = sanitizeQuestions([q])
    expect(result).toHaveLength(0)
  })
})

describe('filterToRegisteredSubjects', () => {
  const mathQ = makeQuestion({ subject: 'Mathematics' })
  const bioQ = makeQuestion({ id: 't2', subject: 'Biology', question: 'What is photosynthesis? A long question text that exceeds the minimum length requirement for testing purposes.', explanation: 'A detailed explanation about the process of photosynthesis in plants that exceeds the minimum length requirement for testing.' })
  const geoQ = makeQuestion({ id: 't3', subject: 'Geography', question: 'What is the capital of Kenya? A long question text for testing filtering functionality.', explanation: 'A detailed explanation about the capital city of Kenya for testing purposes in this filtering unit test.' })

  it('returns all questions when no subjects given', () => {
    const result = filterToRegisteredSubjects([mathQ, bioQ, geoQ], [])
    expect(result).toHaveLength(3)
  })

  it('filters to matching subjects only (non-strict)', () => {
    const result = filterToRegisteredSubjects([mathQ, bioQ, geoQ], ['Mathematics', 'Biology'])
    expect(result).toHaveLength(2)
    expect(result.every(q => q.subject !== 'Geography')).toBe(true)
  })

  it('strict mode rejects questions without a subject field', () => {
    const noSubject = makeQuestion({ id: 't4', subject: '', question: 'A long question text for testing strict filtering functionality in brain gym.', explanation: 'A detailed explanation for testing strict filtering in the brain gym unit tests.' })
    const result = filterToRegisteredSubjects([mathQ, noSubject], ['Mathematics'], true)
    expect(result).toHaveLength(1)
    expect(result[0].subject).toBe('Mathematics')
  })

  it('non-strict mode passes questions without a subject', () => {
    const noSubject = makeQuestion({ id: 't4', subject: '', question: 'A long question text for testing non-strict filtering functionality.', explanation: 'A detailed explanation for testing non-strict filtering in the brain gym.' })
    const result = filterToRegisteredSubjects([mathQ, noSubject], ['Mathematics'])
    expect(result).toHaveLength(2)
  })

  it('matches "Math" to "Mathematics" via fuzzy matching', () => {
    const mathQ = makeQuestion({ subject: 'Math' })
    const result = filterToRegisteredSubjects([mathQ], ['Mathematics'])
    expect(result).toHaveLength(1)
  })

  it('matches "History" to "History & Government"', () => {
    const histQ = makeQuestion({ id: 't5', subject: 'History', question: 'A long question text about Kenyan history for testing fuzzy matching.', explanation: 'A detailed explanation about Kenyan history for fuzzy matching test in brain gym.' })
    const result = filterToRegisteredSubjects([histQ], ['History & Government'])
    expect(result).toHaveLength(1)
  })
})

describe('getFallbackQuestions', () => {
  const fallback = getFallbackQuestions()

  it('returns at least 20 questions', () => {
    expect(fallback.length).toBeGreaterThanOrEqual(20)
  })

  it('all questions pass sanitization', () => {
    const raw = [...fallback]
    const sanitized = sanitizeQuestions(raw)
    expect(sanitized.length).toBe(raw.length)
  })

  it('covers KCSE core subjects', () => {
    const subjects = new Set(fallback.map(q => q.subject))
    expect(subjects.has('Mathematics')).toBe(true)
    expect(subjects.has('English')).toBe(true)
    expect(subjects.has('Kiswahili')).toBe(true)
    expect(subjects.has('Chemistry')).toBe(true)
    expect(subjects.has('Biology')).toBe(true)
    expect(subjects.has('Physics')).toBe(true)
    expect(subjects.has('Geography')).toBe(true)
    expect(subjects.has('History & Government')).toBe(true)
  })

  it('covers KCSE elective subjects', () => {
    const subjects = new Set(fallback.map(q => q.subject))
    expect(subjects.has('Business Studies')).toBe(true)
    expect(subjects.has('CRE')).toBe(true)
    expect(subjects.has('IRE')).toBe(true)
    expect(subjects.has('Agriculture')).toBe(true)
    expect(subjects.has('Computer Studies')).toBe(true)
  })

  it('covers CBC/KPSEA primary subjects', () => {
    const subjects = new Set(fallback.map(q => q.subject))
    expect(subjects.has('Science & Technology')).toBe(true)
    expect(subjects.has('Social Studies')).toBe(true)
    expect(subjects.has('Mathematics (CBC)')).toBe(true)
  })

  it('all questions have valid difficulty levels', () => {
    const valid = ['easy', 'medium', 'hard']
    for (const q of fallback) {
      expect(valid).toContain(q.difficulty)
    }
  })

  it('all questions have exactly 4 options', () => {
    for (const q of fallback) {
      expect(q.options).toHaveLength(4)
    }
  })

  it('all questions have correctAnswer present in options', () => {
    for (const q of fallback) {
      expect(q.options).toContain(q.correctAnswer)
    }
  })
})
