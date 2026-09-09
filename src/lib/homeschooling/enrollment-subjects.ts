/**
 * PostgREST cannot embed homeschool_teacher_assignments inside
 * homeschool_subjects (no direct FK between them), so teacher
 * assignments are fetched separately and merged here. Every
 * consumer of enrollment + subjects must run this merge.
 */
export function attachTeacherAssignments<T extends { id: string; subjects?: any[] }>(
  enrollments: T[],
  assignments: any[]
): T[] {
  const byKey = new Map<string, any[]>()
  for (const ta of assignments || []) {
    const key = `${ta.enrollment_id}|${ta.subject_id}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(ta)
  }
  for (const enrollment of enrollments || []) {
    for (const entry of enrollment.subjects || []) {
      entry.teacher_assignments =
        byKey.get(`${enrollment.id}|${entry.subject_id}`) || []
    }
  }
  return enrollments
}

export const TEACHER_ASSIGNMENT_SELECT =
  'id, enrollment_id, subject_id, teacher_id, assignment_type, teacher:teachers(id, full_name)'
