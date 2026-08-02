import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type TeacherClassSource,
  type TeacherPendingSubjectSource,
  teacherSubjectKey,
  isSubjectApplicableToClass,
} from '@/lib/teacherPendingSubjects'

export interface TeacherSubjectContext {
  teacherClasses: TeacherClassSource[]
  curriculumSubjects: TeacherPendingSubjectSource[]
  classLinkSubjects: TeacherPendingSubjectSource[]
  assignedSubjects: TeacherPendingSubjectSource[]
  /** `${subjectId}:${classId}` combos already registered (self or admin-assigned). */
  registeredKeys: string[]
  /** All subjects that could possibly apply to any of the teacher's classes. */
  allSubjects: TeacherPendingSubjectSource[]
}

function normalizeRelation(value: any) {
  return Array.isArray(value) ? value[0] : value
}

function uniqueById<T extends { id?: string | null }>(items: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  return out
}

/**
 * Loads everything needed to compute a teacher's pending subjects and to
 * validate new registrations. Shared by GET and POST routes so eligibility
 * can never drift between "what we offer" and "what we accept".
 */
export async function fetchTeacherSubjectContext(
  admin: SupabaseClient,
  teacherIds: string[]
): Promise<TeacherSubjectContext> {
  const [assignmentsRes, registeredRes] = await Promise.all([
    admin
      .from('teacher_assignments')
      .select('class_id, subject_id, class:classes(id, name, curriculum_id, curriculum:curriculums(name))')
      .in('teacher_id', teacherIds),
    admin
      .from('teacher_subject_classes')
      .select('subject_id, class_id, status')
      .in('teacher_id', teacherIds),
  ])

  if (assignmentsRes.error) throw assignmentsRes.error
  if (registeredRes.error) throw registeredRes.error

  const teacherClasses = uniqueById(
    (assignmentsRes.data || []).map((a: any) => {
      const cls = normalizeRelation(a.class)
      return {
        id: cls?.id ?? a.class_id,
        name: cls?.name ?? null,
        curriculum_id: cls?.curriculum_id ?? null,
        curriculum_name: normalizeRelation(cls?.curriculum)?.name ?? null,
      }
    })
  )

  const classIds = teacherClasses.map((c) => c.id).filter(Boolean)
  const curriculumIds = Array.from(new Set(teacherClasses.map((c) => c.curriculum_id).filter(Boolean)))

  const [curriculumRes, classLinkRes, assignedRes] = await Promise.all([
    curriculumIds.length
      ? admin
          .from('subjects')
          .select('id, name, code, category, class_id, curriculum_id')
          .in('curriculum_id', curriculumIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    classIds.length
      ? admin
          .from('class_subjects')
          .select('subject:subjects(id, name, code, category, class_id, curriculum_id)')
          .in('class_id', classIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    admin
      .from('teacher_assignments')
      .select('subject:subjects(id, name, code, category, class_id, curriculum_id)')
      .in('teacher_id', teacherIds),
  ])

  if (curriculumRes.error) throw curriculumRes.error
  if (classLinkRes.error) throw classLinkRes.error
  if (assignedRes.error) throw assignedRes.error

  const curriculumSubjects = (curriculumRes.data || []).filter((s: any) => s?.id)
  const classLinkSubjects = (classLinkRes.data || [])
    .map((row: any) => normalizeRelation(row.subject))
    .filter((s: any) => s?.id)
  const assignedSubjects = (assignedRes.data || [])
    .map((row: any) => normalizeRelation(row.subject))
    .filter((s: any) => s?.id)

  // A teacher is never offered a subject they are already administratively
  // assigned to teach (teacher_assignments) OR have self-registered.
  const registeredKeys = [
    ...(registeredRes.data || []).map((r: any) => teacherSubjectKey(r.subject_id, r.class_id)),
    ...(assignmentsRes.data || []).map((a: any) => teacherSubjectKey(a.subject_id, a.class_id)),
  ]

  return {
    teacherClasses,
    curriculumSubjects,
    classLinkSubjects,
    assignedSubjects,
    registeredKeys,
    allSubjects: uniqueById([...curriculumSubjects, ...classLinkSubjects, ...assignedSubjects]),
  }
}

export interface TeachingSelection {
  subjectId: string
  classId: string
}

/**
 * Keeps only selections that pass curriculum validation: the class must be one
 * of the teacher's assigned classes and the subject must apply to it. Returns
 * the deduped, valid list plus the curriculum_id to stamp on each row.
 */
export function validateTeachingSelections(
  selections: TeachingSelection[],
  ctx: TeacherSubjectContext
): Array<{ subject_id: string; class_id: string; curriculum_id: string }> {
  const seen = new Set<string>()
  const out: Array<{ subject_id: string; class_id: string; curriculum_id: string }> = []

  for (const sel of selections || []) {
    if (!sel?.subjectId || !sel?.classId) continue
    const key = teacherSubjectKey(sel.subjectId, sel.classId)
    if (seen.has(key)) continue
    seen.add(key)

    const cls = ctx.teacherClasses.find((c) => c.id === sel.classId)
    if (!cls) continue
    const subject = ctx.allSubjects.find((s) => s.id === sel.subjectId)
    if (!subject) continue
    if (!isSubjectApplicableToClass(subject, sel.classId, cls.curriculum_id)) continue

    out.push({ subject_id: sel.subjectId, class_id: sel.classId, curriculum_id: cls.curriculum_id || subject.curriculum_id || null as any })
  }

  return out
}
