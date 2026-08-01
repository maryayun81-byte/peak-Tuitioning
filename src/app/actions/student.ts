'use server'

import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guards'
import { isEmailAlreadyRegisteredError, deriveAdmissionFromStudentEmail } from '@/lib/student-account'
import { todayIso, computeLoginStreak, loginRewardForStreak } from '@/lib/login-rewards'

// Finds an auth user by email. listUsers() in this supabase-js version has no
// server-side filter, so we paginate and match client-side (same pattern used
// by the event-registration credential generator).
async function findAuthUserByEmail(adminClient: any, email: string) {
  const normalized = email.toLowerCase().trim()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return null
    const user = (data.users || []).find((u: any) => u.email?.toLowerCase() === normalized)
    if (user) return user
    if ((data.users || []).length < 1000) break
  }
  return null
}

export async function createStudentUser(admissionNumber: string, emailStr: string, tempPwd: string, fullName: string) {
  await requireAdmin()
  const adminClient = await createAdminClient()

  // 1. Try normal auth.admin.createUser()
  const { data, error } = await adminClient.auth.admin.createUser({
    email: emailStr,
    password: tempPwd,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'student' },
  })

  if (error) {
    console.error('[createStudentUser] admin.createUser failed:', error.message, error.code)

    // 2. RECOVERY: The admission-derived email is already registered. This
    // happens when a previous attempt left an orphaned auth user behind (auth
    // created but the students row insert failed), or when the account was
    // created through the event-registration flow. Reuse the existing user
    // instead of failing the whole create.
    if (isEmailAlreadyRegisteredError(error)) {
      const existing = await findAuthUserByEmail(adminClient, emailStr)
      if (existing) {
        console.warn(`[createStudentUser] Reusing existing auth user for ${emailStr} (${existing.id})`)
        // Reset the password to the temp password the admin is about to display,
        // so the printed credentials actually work at login. Without this, the
        // recovered user keeps its OLD password and login fails with
        // "Invalid login credentials" despite correct credentials being shown.
        const updates: { email?: string; password: string; email_confirm: boolean } = {
          password: tempPwd,
          email_confirm: true,
        }
        if (existing.email?.toLowerCase() !== emailStr.toLowerCase()) {
          updates.email = emailStr
        }
        const { error: updateError } = await adminClient.auth.admin.updateUserById(existing.id, updates)
        if (updateError) {
          console.error('[createStudentUser] failed to reset recovered user password:', updateError.message)
          return { success: false, error: updateError.message, code: (updateError as any).code }
        }
        return { success: true, user_id: existing.id, recovered: true }
      }
      return { success: false, error: error.message, code: (error as any).code }
    }

    // 3. If the on_auth_user_created trigger is broken, use the RPC fallback
    if (error.code === 'unexpected_failure') {
      const { data: rpcUserId, error: rpcError } = await adminClient.rpc('admin_create_user', {
        p_email: emailStr,
        p_password: tempPwd,
        p_full_name: fullName,
        p_role: 'student',
      })

      if (rpcError) {
        console.error('[createStudentUser] RPC fallback also failed:', rpcError)
        return { success: false, error: rpcError.message, code: 'rpc_fallback_failed' }
      }

      return { success: true, user_id: rpcUserId }
    }

    return { success: false, error: error.message, code: (error as any).code }
  }

  return { success: true, user_id: data.user.id }
}

// Heals orphaned student accounts: an auth user whose email follows the
// `{admission}@student.peak.edu` convention but who has no linked `students` row.
// If an UNCLAIMED students row (user_id IS NULL) exists for that admission number,
// claim it by linking it to the current session user. Students whose record is
// missing entirely must be re-created by an admin (which is idempotent now).
export async function linkStudentAccountToUser() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, linked: false, reason: 'not_authenticated' }

  const role = user.app_metadata?.role || user.user_metadata?.role
  if (role !== 'student') return { success: false, linked: false, reason: 'not_student' }

  const admissionNumber = deriveAdmissionFromStudentEmail(user.email)
  if (!admissionNumber) return { success: false, linked: false, reason: 'no_admission_email' }

  const admin = await createAdminClient()

  const { data: own } = await admin.from('students').select('id').eq('user_id', user.id).maybeSingle()
  if (own) return { success: true, linked: true, alreadyLinked: true }

  const { data: unclaimedRows } = await admin
    .from('students')
    .select('id')
    .eq('admission_number', admissionNumber)
    .is('user_id', null)
    .limit(1)
  const unclaimed = unclaimedRows?.[0]
  if (!unclaimed) return { success: false, linked: false, reason: 'no_unclaimed_profile' }

  const { error: linkError } = await admin
    .from('students')
    .update({ user_id: user.id })
    .eq('id', unclaimed.id)
    .is('user_id', null)

  if (linkError) return { success: false, linked: false, reason: 'link_failed', error: linkError.message }

  return { success: true, linked: true }
}

// Daily login reward: awards +10 XP (plus a milestone streak bonus) once per day
// and advances the login streak. Idempotent per day and safe under concurrent
// requests: the UPDATE is guarded on the previously-read last_login_date, so a
// second claim loses the race and reports alreadyClaimed instead of double-awarding.
export type DailyLoginRewardResult =
  | { success: false; reason: string; error?: string }
  | {
      success: true
      alreadyClaimed: true
      xpAwarded: 0
      baseXp: 0
      bonusXp: 0
      streak: number
      tier: null
    }
  | {
      success: true
      alreadyClaimed: false
      xpAwarded: number
      baseXp: number
      bonusXp: number
      streak: number
      tier: number | null
    }

export async function claimDailyLoginReward(): Promise<DailyLoginRewardResult> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, reason: 'not_authenticated' }

  const admin = await createAdminClient()
  const { data: student } = await admin
    .from('students')
    .select('id, xp, streak_count, last_login_date')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!student) return { success: false, reason: 'no_student_profile' }

  const today = todayIso()
  const priorLastLoginDate = student.last_login_date || null
  const priorStreak = student.streak_count || 0

  if (priorLastLoginDate === today) {
    return {
      success: true,
      alreadyClaimed: true,
      xpAwarded: 0,
      baseXp: 0,
      bonusXp: 0,
      streak: priorStreak,
      tier: null,
    }
  }

  const streak = computeLoginStreak(priorLastLoginDate, priorStreak, today)
  const reward = loginRewardForStreak(streak)

  const { data: updated, error } = await admin
    .from('students')
    .update({
      xp: (student.xp || 0) + reward.total,
      last_login_xp_at: today,
      last_login_date: today,
      streak_count: streak,
    })
    .eq('id', student.id)
    .eq('last_login_date', priorLastLoginDate)
    .select('xp, streak_count, last_login_date')
    .maybeSingle()

  if (error) return { success: false, reason: 'db_error', error: error.message }
  if (!updated) {
    // Another request already claimed today (concurrent tab/mount).
    return {
      success: true,
      alreadyClaimed: true,
      xpAwarded: 0,
      baseXp: 0,
      bonusXp: 0,
      streak: priorStreak,
      tier: null,
    }
  }

  return {
    success: true,
    alreadyClaimed: false,
    xpAwarded: reward.total,
    baseXp: reward.base,
    bonusXp: reward.bonus,
    streak,
    tier: reward.tier,
  }
}

export async function updateOwnPassword(newPassword: string) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Unauthorized access' }

  const adminClient = await createAdminClient()
  
  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, { password: newPassword })
  if (updateError) return { success: false, error: updateError.message }

  // Clear the temporary password flag so it reflects in the admin dashboard
  await adminClient.from('students').update({ temp_password: null }).eq('user_id', user.id)

  return { success: true }
}

export async function getStudentHomepageFeeds(classId: string) {
  // Guard: if no classId the student has no class assigned yet — return empties immediately
  if (!classId) {
    console.warn('[getStudentHomepageFeeds] classId is missing — student may not be assigned to a class yet.')
    return { recentAssignments: [], recentQuizzes: [], upcomingSessions: [] }
  }

  // Use admin client so Supabase RLS does NOT silently block student reads
  const admin = await createAdminClient()
  
  const [assignRes, quizRes, timetableRes] = await Promise.all([
    admin.from('assignments')
      .select('id, title, due_date, status, class_id, subject:subjects(name)')
      .eq('class_id', classId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(5),
    admin.from('quizzes')
      .select('id, title, is_published, class_id, subject:subjects(name)')
      .eq('class_id', classId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(5),
    admin.from('timetables')
      .select('id, day, start_time, end_time, subject:subjects(name), teacher:teachers(full_name)')
      .eq('class_id', classId)
      .order('day', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5)
  ])

  if (assignRes.error) console.error('[getStudentHomepageFeeds] assignments error:', assignRes.error.message)
  if (quizRes.error) console.error('[getStudentHomepageFeeds] quizzes error:', quizRes.error.message)
  if (timetableRes.error) console.error('[getStudentHomepageFeeds] timetable error:', timetableRes.error.message)

  return {
    recentAssignments: assignRes.data || [],
    recentQuizzes: quizRes.data || [],
    upcomingSessions: timetableRes.data || []
  }
}

async function verifyStudentForUser(studentId: string, expectedUserId?: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || expectedUserId
  if (!userId) throw new Error('Student session is not available yet.')

  const admin = await createAdminClient()
  const { data: student, error } = await admin
    .from('students')
    .select('id, user_id, class_id, curriculum_id, tuition_center_id')
    .eq('id', studentId)
    .single()

  if (error || !student) throw error || new Error('Student profile was not found.')
  if (student.user_id && student.user_id !== userId) {
    const { data: ownStudent } = await admin
      .from('students')
      .select('id, user_id, class_id, curriculum_id, tuition_center_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (ownStudent) return { admin, student: ownStudent, userId }
    throw new Error('This student profile does not belong to the current user.')
  }

  return { admin, student, userId }
}

function normalizeRelation(value: any) {
  return Array.isArray(value) ? value[0] : value
}

export async function getStudentSettingsSubjects(studentId: string, expectedUserId?: string) {
  const { admin, student } = await verifyStudentForUser(studentId, expectedUserId)

  const [registeredRes, classMapRes, curriculumRes] = await Promise.all([
    admin
      .from('student_subjects')
      .select('id, subject_id, subject:subjects(id, name, class_id, curriculum_id)')
      .eq('student_id', student.id),
    student.class_id
      ? admin
          .from('teacher_assignments')
          .select('subject:subjects(id, name, class_id, curriculum_id)')
          .eq('class_id', student.class_id)
      : Promise.resolve({ data: [] as any[], error: null }),
    student.curriculum_id
      ? admin
          .from('subjects')
          .select('id, name, class_id, curriculum_id')
          .eq('curriculum_id', student.curriculum_id)
          .order('name')
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  if (registeredRes.error) throw registeredRes.error
  if (classMapRes.error) throw classMapRes.error
  if (curriculumRes.error) throw curriculumRes.error

  const registeredSubjects = (registeredRes.data || [])
    .map((row: any) => ({ ...row, subject: normalizeRelation(row.subject) }))
    .filter((row: any) => row.subject)

  const map = new Map<string, any>()
  for (const row of registeredSubjects) map.set(row.subject.id, row.subject)
  for (const row of classMapRes.data || []) {
    const subject = normalizeRelation((row as any).subject)
    if (subject?.id) map.set(subject.id, subject)
  }
  for (const subject of curriculumRes.data || []) {
    if (subject?.id && (!student.class_id || !subject.class_id || subject.class_id === student.class_id)) {
      map.set(subject.id, subject)
    }
  }

  return {
    registeredSubjects,
    availableSubjects: [...map.values()].sort((a: any, b: any) => String(a.name).localeCompare(String(b.name))),
  }
}

export async function getStudentAssignmentBoard(input: {
  studentId: string
  expectedUserId?: string
  page: number
  pageSize: number
}) {
  const { admin, student } = await verifyStudentForUser(input.studentId, input.expectedUserId)

  const { data: registeredRows } = await admin
    .from('student_subjects')
    .select('subject_id')
    .eq('student_id', student.id)
  const subjectIds = (registeredRows || []).map((row: any) => row.subject_id).filter(Boolean)

  const from = (input.page - 1) * input.pageSize
  const to = from + input.pageSize - 1
  let query = admin
    .from('assignments')
    .select('id, title, description, due_date, status, total_marks, max_marks, is_workbook, attachment_url, lock_after_deadline, worksheet, class_id, subject_id, subject:subjects(name), teacher:teachers(full_name)', { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (student.class_id) query = query.eq('class_id', student.class_id)
  if (student.tuition_center_id) query = query.or(`tuition_center_id.eq.${student.tuition_center_id},tuition_center_id.is.null`)
  if (subjectIds.length > 0) query = query.in('subject_id', subjectIds)

  const { data: assignments, count, error: assignmentError } = await query
  if (assignmentError) throw assignmentError

  const assignmentIds = (assignments || []).map((assignment: any) => assignment.id)
  const { data: submissions, error: submissionsError } = assignmentIds.length
    ? await admin
        .from('submissions')
        .select('id, assignment_id, student_id, status, marks, submitted_at, worksheet_answers')
        .eq('student_id', student.id)
        .in('assignment_id', assignmentIds)
    : { data: [], error: null }

  if (submissionsError) throw submissionsError

  const submissionMap = (submissions || []).reduce((acc: Record<string, any>, submission: any) => {
    acc[submission.assignment_id] = submission
    return acc
  }, {})

  return {
    assignments: assignments || [],
    submissions: submissionMap,
    count: count || 0,
  }
}

export async function getStudentNotificationFeed(expectedUserId?: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || expectedUserId
  if (!userId) return []

  const admin = await createAdminClient()
  const { data, error } = await admin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) return []
  return data || []
}

export async function getStudentNationalExam(studentId: string, examType: 'KCSE' | 'KPSEA' | 'KJSEA', expectedUserId?: string) {
  const { admin, student } = await verifyStudentForUser(studentId, expectedUserId)
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await admin
    .from('national_exam_events')
    .select('*')
    .eq('exam_type', examType)
    .eq('status', 'published')
    .gte('exam_date', today)
    .order('exam_date', { ascending: true })
    .limit(10)

  if (error) return null
  return (data || []).find((exam: any) => {
    const targets = exam.target_class_ids || []
    return targets.length === 0 || targets.includes(student.class_id)
  }) || null
}
