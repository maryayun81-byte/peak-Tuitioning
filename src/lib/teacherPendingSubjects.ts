/**
 * Teacher curriculum subject-update eligibility rules.
 *
 * When an admin adds subjects to a curriculum, every onboarded teacher who is
 * assigned to a class in that curriculum may be offered the new subjects. A
 * subject is "pending" (i.e. offered in the teacher update modal) when:
 *   - It belongs to one of the teacher's assigned curriculums, AND
 *   - It applies to at least one of the teacher's assigned classes (curriculum-
 *     wide subject, or pinned to that class, or linked via class_subjects),
 *   - AND the teacher has not already registered/been assigned to teach that
 *     subject for every applicable class.
 *
 * Like the student engine, nothing is persisted as "pending" — it is computed
 * fresh on every check so new subjects are naturally offered together and a
 * subject stops being offered the moment the teacher registers for all of its
 * applicable classes. This pure helper keeps the rule in ONE place so the API
 * routes, the modal and tests can never drift.
 */

export interface TeacherClassSource {
  id: string
  name?: string | null
  curriculum_id?: string | null
  curriculum_name?: string | null
}

export interface TeacherPendingSubjectSource {
  id: string
  name: string
  code?: string | null
  category?: string | null
  class_id?: string | null
  curriculum_id?: string | null
}

export interface TeacherPendingSubject {
  subject: TeacherPendingSubjectSource
  curriculumId: string
  curriculumName: string
  curriculumCode: 'CBC' | '844'
  applicableClasses: TeacherClassSource[]
}

export interface ComputeEligibleTeacherPendingSubjectsInput {
  /** Classes the teacher is assigned to (teacher_assignments), incl. curriculum. */
  teacherClasses: TeacherClassSource[]
  /** Subjects scoped to the teacher's assigned curriculums. */
  curriculumSubjects: TeacherPendingSubjectSource[]
  /** Subjects linked to the teacher's classes via class_subjects. */
  classLinkSubjects: TeacherPendingSubjectSource[]
  /** Subjects the teacher is already assigned to teach (teacher_assignments). */
  assignedSubjects: TeacherPendingSubjectSource[]
  /** `${subjectId}:${classId}` combos already registered/taught. */
  registeredKeys: string[]
}

export const teacherSubjectKey = (subjectId: string, classId: string) => `${subjectId}:${classId}`

export function curriculumCodeFor(name?: string | null): 'CBC' | '844' {
  const n = String(name || '').toLowerCase()
  return /8[-.]?4[-.]?4|844|kcse|kise/.test(n) ? '844' : 'CBC'
}

export function computeEligibleTeacherPendingSubjects({
  teacherClasses,
  curriculumSubjects,
  classLinkSubjects,
  assignedSubjects,
  registeredKeys,
}: ComputeEligibleTeacherPendingSubjectsInput): TeacherPendingSubject[] {
  const registered = new Set((registeredKeys || []).filter(Boolean))
  const classMap = new Map<string, TeacherClassSource>((teacherClasses || []).map((c) => [c.id, c]))
  const bySubject = new Map<string, { subject: TeacherPendingSubjectSource; classes: TeacherClassSource[] }>()

  const addApplicable = (subject: TeacherPendingSubjectSource | null | undefined, classId?: string | null) => {
    if (!subject?.id || !classId) return
    const cls = classMap.get(classId)
    if (!cls) return
    if (registered.has(teacherSubjectKey(subject.id, classId))) return
    let entry = bySubject.get(subject.id)
    if (!entry) {
      entry = { subject, classes: [] }
      bySubject.set(subject.id, entry)
    }
    if (!entry.classes.some((c) => c.id === classId)) entry.classes.push(cls)
  }

  for (const cls of teacherClasses || []) {
    for (const s of curriculumSubjects || []) {
      if (s.curriculum_id && s.curriculum_id !== cls.curriculum_id) continue
      if (s.class_id && s.class_id !== cls.id) continue
      addApplicable(s, cls.id)
    }
    for (const s of classLinkSubjects || []) {
      if (s.class_id && s.class_id !== cls.id) continue
      if (s.curriculum_id && s.curriculum_id !== cls.curriculum_id) continue
      addApplicable(s, cls.id)
    }
    for (const s of assignedSubjects || []) {
      if (s.class_id && s.class_id !== cls.id) continue
      addApplicable(s, cls.id)
    }
  }

  return [...bySubject.values()]
    .map((entry) => {
      const firstClass = entry.classes[0]
      const curriculumName = firstClass?.curriculum_name || ''
      return {
        subject: entry.subject,
        curriculumId: entry.subject.curriculum_id || firstClass?.curriculum_id || '',
        curriculumName,
        curriculumCode: curriculumCodeFor(curriculumName),
        applicableClasses: entry.classes.sort((a, b) => String(a.name).localeCompare(String(b.name))),
      }
    })
    .filter((entry) => entry.applicableClasses.length > 0)
    .sort((a, b) => String(a.subject.name).localeCompare(String(b.subject.name)))
}

/** Does a subject apply to a specific class (for registration validation)? */
export function isSubjectApplicableToClass(
  subject: TeacherPendingSubjectSource,
  classId: string,
  classCurriculumId?: string | null
): boolean {
  if (!subject || !subject.id || !classId) return false
  if (subject.class_id && subject.class_id !== classId) return false
  if (subject.curriculum_id && classCurriculumId && subject.curriculum_id !== classCurriculumId) return false
  return true
}
