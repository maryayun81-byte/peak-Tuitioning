import { describe, it, expect } from 'vitest'
import { computeEligiblePendingSubjects } from '@/lib/pendingSubjects'

const maths = { id: 's-math', name: 'Mathematics', code: 'MATH', category: 'Core' }
const english = { id: 's-eng', name: 'English', code: 'ENG', category: 'Languages' }
const kiswahili = { id: 's-kis', name: 'Kiswahili', code: 'KIS', category: 'Languages' }
const science = { id: 's-sci', name: 'Integrated Science', code: 'SCI', category: 'Sciences' }

describe('computeEligiblePendingSubjects', () => {
  it('offers curriculum subjects the student is missing', () => {
    const pending = computeEligiblePendingSubjects({
      curriculumSubjects: [maths, english, kiswahili],
      classLinkSubjects: [],
      teacherAssignedSubjects: [],
      registeredSubjectIds: ['s-math'],
      studentClassId: 'c-1',
    })

    expect(pending.map((s) => s.id).sort()).toEqual(['s-eng', 's-kis'])
  })

  it('never offers already-registered subjects', () => {
    const pending = computeEligiblePendingSubjects({
      curriculumSubjects: [maths, english],
      classLinkSubjects: [],
      teacherAssignedSubjects: [],
      registeredSubjectIds: ['s-math', 's-eng'],
      studentClassId: 'c-1',
    })

    expect(pending).toEqual([])
  })

  it('drops class-specific subjects that belong to a different class', () => {
    const classSpecific = { id: 's-cs', name: 'Class 2 French', code: 'FR', class_id: 'c-2', curriculum_id: 'cur-1' }
    const pending = computeEligiblePendingSubjects({
      curriculumSubjects: [maths, classSpecific],
      classLinkSubjects: [],
      teacherAssignedSubjects: [],
      registeredSubjectIds: [],
      studentClassId: 'c-1',
    })

    expect(pending.map((s) => s.id)).toEqual(['s-math'])
  })

  it('keeps class-specific subjects that match the student class', () => {
    const classSpecific = { id: 's-cs', name: 'French', code: 'FR', class_id: 'c-1', curriculum_id: 'cur-1' }
    const pending = computeEligiblePendingSubjects({
      curriculumSubjects: [classSpecific],
      classLinkSubjects: [],
      teacherAssignedSubjects: [],
      registeredSubjectIds: [],
      studentClassId: 'c-1',
    })

    expect(pending.map((s) => s.id)).toEqual(['s-cs'])
  })

  it('keeps class-specific subjects when the student has no class id', () => {
    const classSpecific = { id: 's-cs', name: 'French', code: 'FR', class_id: 'c-2', curriculum_id: 'cur-1' }
    const pending = computeEligiblePendingSubjects({
      curriculumSubjects: [classSpecific],
      classLinkSubjects: [],
      teacherAssignedSubjects: [],
      registeredSubjectIds: [],
      studentClassId: null,
    })

    expect(pending.map((s) => s.id)).toEqual(['s-cs'])
  })

  it('unions class-link and teacher-assigned subjects without duplicates', () => {
    const pending = computeEligiblePendingSubjects({
      curriculumSubjects: [maths],
      classLinkSubjects: [english, kiswahili],
      teacherAssignedSubjects: [kiswahili, science],
      registeredSubjectIds: ['s-math'],
      studentClassId: 'c-1',
    })

    expect(pending.map((s) => s.id).sort()).toEqual(['s-eng', 's-kis', 's-sci'])
  })

  it('sorts results alphabetically by name', () => {
    const pending = computeEligiblePendingSubjects({
      curriculumSubjects: [science, english, kiswahili, maths],
      classLinkSubjects: [],
      teacherAssignedSubjects: [],
      registeredSubjectIds: [],
      studentClassId: 'c-1',
    })

    expect(pending.map((s) => s.name)).toEqual(['English', 'Integrated Science', 'Kiswahili', 'Mathematics'])
  })

  it('ignores malformed / null subject rows', () => {
    const pending = computeEligiblePendingSubjects({
      curriculumSubjects: [maths, null as any, { id: undefined as any, name: 'Broken' }],
      classLinkSubjects: [],
      teacherAssignedSubjects: [],
      registeredSubjectIds: [],
      studentClassId: 'c-1',
    })

    expect(pending.map((s) => s.id)).toEqual(['s-math'])
  })

  it('returns empty for empty inputs', () => {
    expect(computeEligiblePendingSubjects({
      curriculumSubjects: [],
      classLinkSubjects: [],
      teacherAssignedSubjects: [],
      registeredSubjectIds: [],
      studentClassId: 'c-1',
    })).toEqual([])
  })
})
