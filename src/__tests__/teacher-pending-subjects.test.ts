import { describe, it, expect } from 'vitest'
import {
  computeEligibleTeacherPendingSubjects,
  curriculumCodeFor,
  teacherSubjectKey,
  isSubjectApplicableToClass,
} from '@/lib/teacherPendingSubjects'

const c1 = { id: 'c-1', name: 'Grade 5', curriculum_id: 'cur-cbc', curriculum_name: 'CBC' }
const c3 = { id: 'c-3', name: 'Grade 6', curriculum_id: 'cur-cbc', curriculum_name: 'CBC' }
const c2 = { id: 'c-2', name: 'Form 1', curriculum_id: 'cur-844', curriculum_name: '8-4-4 System' }

const maths = { id: 's-math', name: 'Mathematics', code: 'MATH', category: 'Core', class_id: null, curriculum_id: 'cur-cbc' }
const english = { id: 's-eng', name: 'English', code: 'ENG', category: 'Languages', class_id: null, curriculum_id: 'cur-cbc' }
const agriculture = { id: 's-agri', name: 'Agriculture', code: 'AGR', category: 'Applied', class_id: 'c-1', curriculum_id: 'cur-cbc' }
const biology = { id: 's-bio', name: 'Biology', code: 'BIO', category: 'Sciences', class_id: null, curriculum_id: 'cur-844' }

const base = {
  teacherClasses: [c1],
  curriculumSubjects: [],
  classLinkSubjects: [],
  assignedSubjects: [],
  registeredKeys: [] as string[],
}

describe('computeEligibleTeacherPendingSubjects', () => {
  it('offers curriculum subjects with their applicable classes', () => {
    const pending = computeEligibleTeacherPendingSubjects({
      ...base,
      curriculumSubjects: [maths, english, agriculture, biology],
      registeredKeys: [teacherSubjectKey('s-eng', 'c-1')],
    })

    expect(pending.map((p) => p.subject.id).sort()).toEqual(['s-agri', 's-math'])
    const mathsEntry = pending.find((p) => p.subject.id === 's-math')!
    expect(mathsEntry.applicableClasses.map((c) => c.id)).toEqual(['c-1'])
    expect(mathsEntry.curriculumCode).toBe('CBC')
  })

  it('never offers subjects already registered for every applicable class', () => {
    const pending = computeEligibleTeacherPendingSubjects({
      ...base,
      curriculumSubjects: [maths, english],
      registeredKeys: [teacherSubjectKey('s-eng', 'c-1'), teacherSubjectKey('s-math', 'c-1')],
    })

    expect(pending).toEqual([])
  })

  it('offers only the unregistered classes of a partially-registered subject', () => {
    const pending = computeEligibleTeacherPendingSubjects({
      ...base,
      teacherClasses: [c1, c3],
      curriculumSubjects: [maths],
      registeredKeys: [teacherSubjectKey('s-math', 'c-1')],
    })

    expect(pending.map((p) => p.subject.id)).toEqual(['s-math'])
    expect(pending[0].applicableClasses.map((c) => c.id)).toEqual(['c-3'])
  })

  it('treats admin-assigned subjects (teacher_assignments) as already registered', () => {
    const pending = computeEligibleTeacherPendingSubjects({
      ...base,
      curriculumSubjects: [maths, english],
      assignedSubjects: [english],
      registeredKeys: [teacherSubjectKey('s-eng', 'c-1')],
    })

    expect(pending.map((p) => p.subject.id)).toEqual(['s-math'])
  })

  it('applies class-specific subjects only to the matching class', () => {
    const pending = computeEligibleTeacherPendingSubjects({
      ...base,
      teacherClasses: [c1, c3],
      curriculumSubjects: [agriculture],
    })

    expect(pending[0].subject.id).toBe('s-agri')
    expect(pending[0].applicableClasses.map((c) => c.id)).toEqual(['c-1'])
  })

  it('scopes subjects to the teacher curriculum per class (cross-curriculum)', () => {
    const pending = computeEligibleTeacherPendingSubjects({
      ...base,
      teacherClasses: [c1, c2],
      curriculumSubjects: [maths, biology],
    })

    const mathsEntry = pending.find((p) => p.subject.id === 's-math')!
    const bioEntry = pending.find((p) => p.subject.id === 's-bio')!
    expect(mathsEntry.applicableClasses.map((c) => c.id)).toEqual(['c-1'])
    expect(mathsEntry.curriculumCode).toBe('CBC')
    expect(bioEntry.applicableClasses.map((c) => c.id)).toEqual(['c-2'])
    expect(bioEntry.curriculumCode).toBe('844')
  })

  it('unions class-link subjects into the pending set', () => {
    const pending = computeEligibleTeacherPendingSubjects({
      ...base,
      curriculumSubjects: [maths],
      classLinkSubjects: [english],
    })

    expect(pending.map((p) => p.subject.id).sort()).toEqual(['s-eng', 's-math'])
  })

  it('sorts results alphabetically by subject name', () => {
    const pending = computeEligibleTeacherPendingSubjects({
      ...base,
      curriculumSubjects: [english, agriculture, maths],
    })

    expect(pending.map((p) => p.subject.name)).toEqual(['Agriculture', 'English', 'Mathematics'])
  })

  it('returns empty for empty inputs', () => {
    expect(computeEligibleTeacherPendingSubjects(base)).toEqual([])
  })
})

describe('curriculumCodeFor', () => {
  it('detects 8-4-4 curriculums', () => {
    expect(curriculumCodeFor('8-4-4 System')).toBe('844')
    expect(curriculumCodeFor('8.4.4')).toBe('844')
    expect(curriculumCodeFor('KCSE')).toBe('844')
  })

  it('defaults everything else to CBC', () => {
    expect(curriculumCodeFor('Competency Based Curriculum')).toBe('CBC')
    expect(curriculumCodeFor(null)).toBe('CBC')
    expect(curriculumCodeFor('')).toBe('CBC')
  })
})

describe('isSubjectApplicableToClass', () => {
  it('accepts curriculum-wide and class-specific subjects for the matching class', () => {
    expect(isSubjectApplicableToClass(maths, 'c-1', 'cur-cbc')).toBe(true)
    expect(isSubjectApplicableToClass(agriculture, 'c-1', 'cur-cbc')).toBe(true)
  })

  it('rejects subjects pinned to a different class or curriculum', () => {
    expect(isSubjectApplicableToClass(agriculture, 'c-3', 'cur-cbc')).toBe(false)
    expect(isSubjectApplicableToClass(maths, 'c-2', 'cur-844')).toBe(false)
  })

  it('rejects malformed inputs', () => {
    expect(isSubjectApplicableToClass(null as any, 'c-1', 'cur-cbc')).toBe(false)
    expect(isSubjectApplicableToClass(maths, '', 'cur-cbc')).toBe(false)
  })
})

describe('72h auto-prompt freshness', () => {
  const NOW = new Date('2026-09-14T12:00:00Z').getTime()
  const hoursAgo = (h: number) => new Date(NOW - h * 60 * 60 * 1000).toISOString()
  const freshSub = { ...maths, created_at: hoursAgo(24) }
  const staleSub = { ...english, created_at: hoursAgo(100) }
  const agelessSub = { ...agriculture, created_at: null }

  it('flags recently-added subjects fresh and older ones stale', () => {
    const pending = computeEligibleTeacherPendingSubjects({
      ...base,
      curriculumSubjects: [freshSub, staleSub],
      now: NOW,
    })
    expect(pending.find((p) => p.subject.id === 's-math')!.isFresh).toBe(true)
    expect(pending.find((p) => p.subject.id === 's-eng')!.isFresh).toBe(false)
  })

  it('keeps stale subjects eligible (manual Manage path) while fresh ones prompt', () => {
    const pending = computeEligibleTeacherPendingSubjects({
      ...base,
      curriculumSubjects: [freshSub, staleSub],
      now: NOW,
    })
    // Both still listed for on-demand opening; only fresh auto-prompts.
    expect(pending.map((p) => p.subject.id).sort()).toEqual(['s-eng', 's-math'])
    expect(pending.filter((p) => p.isFresh).map((p) => p.subject.id)).toEqual(['s-math'])
  })

  it('treats unknown-age subjects as non-fresh and honours a custom window', () => {
    const pending = computeEligibleTeacherPendingSubjects({
      ...base,
      curriculumSubjects: [{ ...agriculture, class_id: 'c-1', created_at: null }],
      now: NOW,
    })
    expect(pending[0].isFresh).toBe(false)

    const wide = computeEligibleTeacherPendingSubjects({
      ...base,
      curriculumSubjects: [staleSub],
      now: NOW,
      autoPromptHours: 200,
    })
    expect(wide[0].isFresh).toBe(true)
  })
})
