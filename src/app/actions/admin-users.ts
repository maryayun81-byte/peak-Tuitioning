'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guards'

// Deletes a teacher and their linked auth account + profile so the login
// account does not survive the removal. The teachers row is removed first so
// child rows (teacher_assignments, teacher_*_prefs, document_assignments) are
// cleaned up via their FK cascades; auth/profile cleanup is best-effort.
export async function deleteTeacher(teacherId: string) {
  await requireAdmin()
  const adminClient = await createAdminClient()

  const { data: teacher } = await adminClient
    .from('teachers')
    .select('id, user_id, full_name')
    .eq('id', teacherId)
    .maybeSingle()

  const { error: teacherError } = await adminClient
    .from('teachers')
    .delete()
    .eq('id', teacherId)
  if (teacherError) {
    return { success: false, error: teacherError.message }
  }

  const userId = teacher?.user_id
  let accountRemoved = true
  if (userId) {
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('[deleteTeacher] auth user cleanup failed:', authError.message)
      accountRemoved = false
    }
  }

  return {
    success: true,
    accountRemoved,
    message: teacher?.full_name
      ? `${teacher.full_name} removed${accountRemoved ? '' : ' (login account left behind)'}`
      : 'Teacher removed',
  }
}

// Deletes a student and their linked auth account + profile. The students row
// is removed first so child rows (student_subjects, enrollments, attendance,
// etc.) are cleaned up via their FK cascades; auth/profile cleanup is
// best-effort.
export async function deleteStudent(studentId: string) {
  await requireAdmin()
  const adminClient = await createAdminClient()

  const { data: student } = await adminClient
    .from('students')
    .select('id, user_id, full_name')
    .eq('id', studentId)
    .maybeSingle()

  const { error: studentError } = await adminClient
    .from('students')
    .delete()
    .eq('id', studentId)
  if (studentError) {
    return { success: false, error: studentError.message }
  }

  const userId = student?.user_id
  let accountRemoved = true
  if (userId) {
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('[deleteStudent] auth user cleanup failed:', authError.message)
      accountRemoved = false
    }
  }

  return {
    success: true,
    accountRemoved,
    message: student?.full_name
      ? `${student.full_name} removed${accountRemoved ? '' : ' (login account left behind)'}`
      : 'Student removed',
  }
}
