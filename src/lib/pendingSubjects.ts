/**
 * Curriculum subject-update eligibility rules.
 *
 * When an admin adds subjects to a curriculum, every fully-onboarded student in
 * that curriculum may be offered the new subjects. A subject is "pending" (i.e.
 * offered in the update modal) only when BOTH of these are true:
 *   - It belongs to the student's assigned curriculum (or is explicitly linked
 *     to their class via class_subjects / teacher_assignments), and
 *   - It is missing from the student's registered subject list.
 *
 * The set is computed fresh on every check — nothing is persisted as "pending"
 * — so subjects that get added at different times are naturally offered
 * together, and a subject stops being offered the moment it is registered.
 * This pure helper keeps that rule in ONE place so the server action, the
 * modal and tests can never drift.
 */

export interface PendingSubjectSource {
  id: string
  name: string
  code?: string | null
  category?: string | null
  class_id?: string | null
  curriculum_id?: string | null
}

export interface ComputeEligiblePendingSubjectsInput {
  /** Subjects scoped to the student's curriculum (subjects.class_id nullable). */
  curriculumSubjects: PendingSubjectSource[]
  /** Subjects linked to the student's class via class_subjects. */
  classLinkSubjects: PendingSubjectSource[]
  /** Subjects the student's teachers are assigned to in the class. */
  teacherAssignedSubjects: PendingSubjectSource[]
  /** subject_ids already registered for the student. */
  registeredSubjectIds: string[]
  /** The student's assigned class id. Used to scope class-specific subjects. */
  studentClassId?: string | null
}

export function computeEligiblePendingSubjects({
  curriculumSubjects,
  classLinkSubjects,
  teacherAssignedSubjects,
  registeredSubjectIds,
  studentClassId,
}: ComputeEligiblePendingSubjectsInput): PendingSubjectSource[] {
  const registered = new Set((registeredSubjectIds || []).filter(Boolean))
  const map = new Map<string, PendingSubjectSource>()

  const add = (subject: PendingSubjectSource | null | undefined) => {
    if (!subject?.id) return
    // A subject pinned to a specific class only applies to students of that
    // class. Curriculum-level subjects (class_id null) apply to everyone.
    if (studentClassId && subject.class_id && subject.class_id !== studentClassId) return
    map.set(subject.id, subject)
  }

  for (const s of curriculumSubjects || []) add(s)
  for (const s of classLinkSubjects || []) add(s)
  for (const s of teacherAssignedSubjects || []) add(s)

  return [...map.values()]
    .filter((s) => !registered.has(s.id))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
}
