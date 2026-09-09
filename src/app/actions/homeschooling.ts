'use server'

import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-guards'
import { can, denialMessage } from '@/lib/homeschooling/permissions'
import { attachTeacherAssignments, TEACHER_ASSIGNMENT_SELECT } from '@/lib/homeschooling/enrollment-subjects'
import type {
  HomeschoolEnrollment,
  HomeschoolWeek,
  LearningSession,
  SubjectProgress,
} from '@/types/homeschooling'

async function fetchTeacherAssignments(admin: any, enrollmentIds: string[]) {
  if (enrollmentIds.length === 0) return []
  const { data, error } = await admin
    .from('homeschool_teacher_assignments')
    .select(TEACHER_ASSIGNMENT_SELECT)
    .in('enrollment_id', enrollmentIds)
  if (error) throw error
  return data || []
}

async function getAuthUser() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthorized: Please log in.')
  return { user, supabase }
}

async function getStudentForUser(userId: string) {
  const admin = await createAdminClient()
  const { data: student, error } = await admin
    .from('students')
    .select('id, user_id, class_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !student) throw new Error('Student profile not found.')
  return student
}

async function verifyStudentOwnership(studentId: string, userId: string) {
  const admin = await createAdminClient()
  const { data: student, error } = await admin
    .from('students')
    .select('id, user_id')
    .eq('id', studentId)
    .maybeSingle()
  if (error || !student) throw new Error('Student not found.')
  if (student.user_id !== userId) throw new Error('Access denied: not your profile.')
  return student
}

async function verifyEnrollmentAccess(enrollmentId: string, userId: string, role: string) {
  const admin = await createAdminClient()
  const { data: enrollment, error } = await admin
    .from('homeschool_enrollments')
    .select('id, student_id, status')
    .eq('id', enrollmentId)
    .maybeSingle()
  if (error || !enrollment) throw new Error('Enrollment not found.')

  if (role === 'admin') return enrollment

  if (role === 'student') {
    const student = await getStudentForUser(userId)
    if (enrollment.student_id !== student.id) throw new Error('Access denied: not your enrollment.')
    return enrollment
  }

  if (role === 'teacher') {
    const adminClient = await createAdminClient()
    const { data: teacher } = await adminClient
      .from('teachers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (!teacher) throw new Error('Teacher profile not found.')

    const { data: assignment } = await adminClient
      .from('homeschool_teacher_assignments')
      .select('id')
      .eq('enrollment_id', enrollmentId)
      .eq('teacher_id', teacher.id)
      .maybeSingle()
    if (!assignment) throw new Error('Access denied: not assigned to this enrollment.')
    return enrollment
  }

  throw new Error('Access denied.')
}

async function verifySessionAccess(sessionId: string, userId: string, role: string) {
  const admin = await createAdminClient()
  const { data: session, error } = await admin
    .from('learning_sessions')
    .select('id, enrollment_id, teacher_id, week_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (error || !session) throw new Error('Session not found.')

  if (role === 'admin') return session

  if (role === 'student') {
    const student = await getStudentForUser(userId)
    const { data: enrollment } = await admin
      .from('homeschool_enrollments')
      .select('id, student_id')
      .eq('id', session.enrollment_id)
      .maybeSingle()
    if (!enrollment || enrollment.student_id !== student.id) throw new Error('Access denied.')
    return session
  }

  if (role === 'teacher') {
    const { data: teacher } = await admin
      .from('teachers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (!teacher || session.teacher_id !== teacher.id) throw new Error('Access denied: not assigned.')
    return session
  }

  throw new Error('Access denied.')
}

function getUserRole(user: any): string {
  return user.user_metadata?.role || user.app_metadata?.role || 'student'
}

export async function getHomeschoolEnrollments(studentId?: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    const admin = await createAdminClient()

    let query = admin
      .from('homeschool_enrollments')
      .select(`
        id, student_id, status, start_date, end_date, grade_level, academic_year,
        program_name, notes, created_by, created_at, updated_at,
        student:students(id, full_name, admission_number, user_id),
        subjects:homeschool_subjects(
          id, subject_id, is_active,
          subject:subjects(id, name, code)
        )
      `)
      .order('created_at', { ascending: false })

    if (studentId) {
      if (role === 'student') {
        const student = await getStudentForUser(user.id)
        if (student.id !== studentId) throw new Error('Access denied.')
      } else if (role !== 'admin') {
        throw new Error('Access denied.')
      }
      query = query.eq('student_id', studentId)
    } else if (role === 'student') {
      const student = await getStudentForUser(user.id)
      query = query.eq('student_id', student.id)
    }

    const { data, error } = await query
    if (error) throw error

    const enrollments = data || []
    const tas = await fetchTeacherAssignments(
      admin,
      enrollments.map((e: any) => e.id)
    )
    attachTeacherAssignments(enrollments, tas)

    return { success: true, data: enrollments as unknown as HomeschoolEnrollment[] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getActiveHomeschoolEnrollment(studentId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)

    if (role === 'student') {
      await verifyStudentOwnership(studentId, user.id)
    } else if (role !== 'admin') {
      throw new Error('Access denied.')
    }

    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('homeschool_enrollments')
      .select(`
        id, student_id, status, start_date, end_date, grade_level, academic_year,
        program_name, notes, created_by, created_at, updated_at,
        student:students(id, full_name, admission_number),
        subjects:homeschool_subjects(
          id, subject_id, is_active,
          subject:subjects(id, name, code)
        ),
        weeks:homeschool_weeks(
          id, week_number, title, start_date, end_date, status,
          sessions:learning_sessions(
            id, subject_id, day, start_time, end_time, learning_mode, topic, status, student_status
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (error) throw error
    if (data) {
      const tas = await fetchTeacherAssignments(admin, [data.id])
      attachTeacherAssignments([data], tas)
    }

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createHomeschoolEnrollment(data: {
  student_id: string
  start_date: string
  end_date?: string
  grade_level: string
  academic_year: string
  program_name?: string
  notes?: string
  subjects: Array<{ subject_id: string; teacher_id?: string; assignment_type?: string }>
}) {
  try {
    const { user } = await requireAdmin()
    const admin = await createAdminClient()

    const { data: existing } = await admin
      .from('homeschool_enrollments')
      .select('id, status')
      .eq('student_id', data.student_id)
      .eq('academic_year', data.academic_year)
      .in('status', ['PENDING', 'ACTIVE', 'PAUSED'])
      .maybeSingle()

    if (existing) {
      throw new Error(
        `This student already has a ${existing.status.toLowerCase()} homeschooling enrollment for ${data.academic_year}.`
      )
    }

    const { data: enrollment, error: enrollmentError } = await admin
      .from('homeschool_enrollments')
      .insert({
        student_id: data.student_id,
        status: 'ACTIVE',
        start_date: data.start_date,
        end_date: data.end_date || null,
        grade_level: data.grade_level,
        academic_year: data.academic_year,
        program_name: data.program_name || 'Homeschooling',
        notes: data.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (enrollmentError) throw enrollmentError

    try {
      if (data.subjects && data.subjects.length > 0) {
        const subjectInserts = data.subjects.map((s) => ({
          enrollment_id: enrollment.id,
          subject_id: s.subject_id,
          is_active: true,
        }))

        const { error: subjectError } = await admin
          .from('homeschool_subjects')
          .insert(subjectInserts)

        if (subjectError) throw subjectError

        const teacherInserts = data.subjects
          .filter((s) => s.teacher_id)
          .map((s) => ({
            enrollment_id: enrollment.id,
            subject_id: s.subject_id,
            teacher_id: s.teacher_id!,
            assignment_type: s.assignment_type || 'primary',
          }))

        if (teacherInserts.length > 0) {
          const { error: teacherError } = await admin
            .from('homeschool_teacher_assignments')
            .insert(teacherInserts)
          if (teacherError) throw teacherError
        }
      }
    } catch (linkError: any) {
      await admin.from('homeschool_enrollments').delete().eq('id', enrollment.id)
      throw new Error(`Enrollment rolled back: ${linkError.message}`)
    }

    await logHomeschoolAudit(user.id, 'create', 'enrollment', enrollment.id, null, enrollment, {
      subjects_count: data.subjects?.length || 0,
    })

    return { success: true, data: enrollment }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function activateHomeschoolEnrollment(enrollmentId: string) {
  try {
    const { user } = await requireAdmin()
    const admin = await createAdminClient()

    const { data: before } = await admin
      .from('homeschool_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .maybeSingle()

    if (!before) throw new Error('Enrollment not found.')
    if (before.status === 'ACTIVE') throw new Error('Enrollment is already active.')

    const { data: updated, error } = await admin
      .from('homeschool_enrollments')
      .update({ status: 'ACTIVE' })
      .eq('id', enrollmentId)
      .select()
      .single()

    if (error) throw error

    await logHomeschoolAudit(user.id, 'activate', 'enrollment', enrollmentId, before, updated)

    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateHomeschoolEnrollment(
  enrollmentId: string,
  data: { status?: string; notes?: string; grade_level?: string; end_date?: string }
) {
  try {
    const { user } = await requireAdmin()
    const admin = await createAdminClient()

    const { data: before } = await admin
      .from('homeschool_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .maybeSingle()

    const updates: Record<string, any> = {}
    if (data.status !== undefined) updates.status = data.status
    if (data.notes !== undefined) updates.notes = data.notes
    if (data.grade_level !== undefined) updates.grade_level = data.grade_level
    if (data.end_date !== undefined) updates.end_date = data.end_date

    const { data: updated, error } = await admin
      .from('homeschool_enrollments')
      .update(updates)
      .eq('id', enrollmentId)
      .select()
      .single()

    if (error) throw error

    await logHomeschoolAudit(user.id, 'update', 'enrollment', enrollmentId, before, updated, {
      updated_fields: Object.keys(updates),
    })

    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function pauseHomeschoolEnrollment(enrollmentId: string) {
  try {
    const { user } = await requireAdmin()
    const admin = await createAdminClient()

    const { data: before } = await admin
      .from('homeschool_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .maybeSingle()

    const { data: updated, error } = await admin
      .from('homeschool_enrollments')
      .update({ status: 'PAUSED' })
      .eq('id', enrollmentId)
      .eq('status', 'ACTIVE')
      .select()
      .single()

    if (error) throw error
    if (!updated) throw new Error('Enrollment is not in ACTIVE status.')

    await logHomeschoolAudit(user.id, 'pause', 'enrollment', enrollmentId, before, updated)

    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function resumeHomeschoolEnrollment(enrollmentId: string) {
  try {
    const { user } = await requireAdmin()
    const admin = await createAdminClient()

    const { data: before } = await admin
      .from('homeschool_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .maybeSingle()

    const { data: updated, error } = await admin
      .from('homeschool_enrollments')
      .update({ status: 'ACTIVE' })
      .eq('id', enrollmentId)
      .eq('status', 'PAUSED')
      .select()
      .single()

    if (error) throw error
    if (!updated) throw new Error('Enrollment is not in PAUSED status.')

    await logHomeschoolAudit(user.id, 'resume', 'enrollment', enrollmentId, before, updated)

    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function cancelHomeschoolEnrollment(enrollmentId: string) {
  try {
    const { user } = await requireAdmin()
    const admin = await createAdminClient()

    const { data: before } = await admin
      .from('homeschool_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .maybeSingle()

    const { data: updated, error } = await admin
      .from('homeschool_enrollments')
      .update({ status: 'CANCELLED', end_date: new Date().toISOString().split('T')[0] })
      .eq('id', enrollmentId)
      .not('status', 'in', '(CANCELLED,COMPLETED,EXPIRED)')
      .select()
      .single()

    if (error) throw error
    if (!updated) throw new Error('Enrollment cannot be cancelled.')

    await logHomeschoolAudit(user.id, 'cancel', 'enrollment', enrollmentId, before, updated)

    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getHomeschoolWeeks(enrollmentId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    await verifyEnrollmentAccess(enrollmentId, user.id, role)

    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('homeschool_weeks')
      .select(`
        id, enrollment_id, week_number, title, start_date, end_date, status, created_at, updated_at,
        sessions:learning_sessions(
          id, subject_id, teacher_id, day, start_time, end_time, learning_mode, topic, status, student_status,
          subject:subjects(id, name),
          teacher:teachers(id, full_name)
        )
      `)
      .eq('enrollment_id', enrollmentId)
      .order('week_number', { ascending: true })

    if (error) throw error

    return { success: true, data: (data || []) as unknown as HomeschoolWeek[] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createHomeschoolWeek(
  enrollmentId: string,
  data: { week_number: number; title: string; start_date: string; end_date: string }
) {
  try {
    const { user } = await requireAdmin()
    await verifyEnrollmentAccess(enrollmentId, user.id, 'admin')

    const admin = await createAdminClient()
    const { data: week, error } = await admin
      .from('homeschool_weeks')
      .insert({
        enrollment_id: enrollmentId,
        week_number: data.week_number,
        title: data.title,
        start_date: data.start_date,
        end_date: data.end_date,
        status: 'DRAFT',
      })
      .select()
      .single()

    if (error) throw error

    await logHomeschoolAudit(user.id, 'create', 'week', week.id, null, week)

    return { success: true, data: week }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function publishHomeschoolWeek(weekId: string, force = false) {
  try {
    const { user } = await requireAdmin()
    const admin = await createAdminClient()

    const { data: before } = await admin
      .from('homeschool_weeks')
      .select('*, enrollment:homeschool_enrollments(id, student_id)')
      .eq('id', weekId)
      .maybeSingle()

    if (!before) throw new Error('Week not found.')
    if (before.status !== 'DRAFT') throw new Error('Only draft weeks can be published.')

    const { data: sessions } = await admin
      .from('learning_sessions')
      .select(`
        id, topic, day, start_time, learning_mode, teacher_id,
        objectives:learning_objectives(id),
        resources:learning_resources(id)
      `)
      .eq('week_id', weekId)
      .neq('status', 'CANCELLED')

    const list = sessions || []
    const warnings: string[] = []
    if (list.length === 0) {
      warnings.push('This week has no sessions yet.')
    }
    for (const s of list) {
      const label = `${s.day} ${s.start_time} ${s.topic || ''}`.trim()
      if ((s.objectives || []).length === 0) warnings.push(`${label}: no learning objectives.`)
      if ((s.resources || []).length === 0) warnings.push(`${label}: no resources attached.`)
      if (s.learning_mode === 'TEACHER_LED' && !s.teacher_id) {
        warnings.push(`${label}: teacher-led but no teacher assigned.`)
      }
    }

    if (warnings.length > 0 && !force) {
      return { success: false, needsConfirmation: true, warnings, error: 'Week has incomplete sessions.' }
    }

    const { data: updated, error } = await admin
      .from('homeschool_weeks')
      .update({ status: 'PUBLISHED' })
      .eq('id', weekId)
      .eq('status', 'DRAFT')
      .select()
      .single()

    if (error) throw error
    if (!updated) throw new Error('Week is not in DRAFT status.')

    await logHomeschoolAudit(user.id, 'publish', 'week', weekId, before, updated, { warnings })

    const studentId = (before.enrollment as any)?.student_id
    if (studentId) {
      const { data: student } = await admin
        .from('students')
        .select('user_id')
        .eq('id', studentId)
        .maybeSingle()
      if (student?.user_id) {
        await admin.from('notifications').insert({
          user_id: student.user_id,
          title: 'Learning plan ready',
          body: `Your ${before.title || 'weekly'} learning plan is ready.`,
          type: 'week_published',
          data: { week_id: weekId, enrollment_id: before.enrollment_id },
        })
      }
    }

    return { success: true, data: updated, warnings }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getLearningSessions(weekId?: string, enrollmentId?: string, date?: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    const admin = await createAdminClient()

    let query = admin
      .from('learning_sessions')
      .select(`
        id, enrollment_id, week_id, subject_id, teacher_id, day, start_time, end_time,
        learning_mode, topic, learning_goal, instructions, submission_required, status,
        student_status, ai_assistance_enabled, ai_instructions, max_duration_minutes,
        notes, created_at, updated_at,
        subject:subjects(id, name, code),
        teacher:teachers(id, full_name),
        objectives:learning_objectives(id, title, description, order_index, is_completed, completed_at),
        resources:learning_resources(id, title, type, url, file_path, is_required, order_index),
        mission:learning_missions(id, title, description, is_started, is_completed, started_at, completed_at),
        week:homeschool_weeks(id, week_number, title, status),
        enrollment:homeschool_enrollments(id, student_id, student:students(id, full_name))
      `)
      .order('day', { ascending: true })
      .order('start_time', { ascending: true })

    if (weekId) query = query.eq('week_id', weekId)
    if (enrollmentId) query = query.eq('enrollment_id', enrollmentId)

    const { data, error } = await query
    if (error) throw error

    let filtered = data || []
    if (date) {
      const targetDay = new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
      filtered = filtered.filter((s: any) => s.day === targetDay)
    }

    if (role === 'student') {
      const student = await getStudentForUser(user.id)
      const enrollmentIds = new Set(
        filtered
          .filter((s: any) => s.enrollment?.student_id === student.id)
          .map((s: any) => s.enrollment_id)
      )
      filtered = filtered.filter((s: any) => s.status !== 'CANCELLED' && enrollmentIds.has(s.enrollment_id))
    } else if (role === 'teacher') {
      const { data: teacher } = await admin
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (teacher) {
        filtered = filtered.filter((s: any) => s.teacher_id === teacher.id)
      }
    }

    return { success: true, data: filtered as unknown as LearningSession[] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getTodaySessions(enrollmentId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    await verifyEnrollmentAccess(enrollmentId, user.id, role)

    const today = new Date()
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })

    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('learning_sessions')
      .select(`
        id, enrollment_id, week_id, subject_id, teacher_id, day, start_time, end_time,
        learning_mode, topic, learning_goal, instructions, submission_required, status,
        student_status, ai_assistance_enabled, ai_instructions, max_duration_minutes,
        subject:subjects(id, name, code),
        teacher:teachers(id, full_name),
        objectives:learning_objectives(id, title, is_completed),
        resources:learning_resources(id, title, type, is_required),
        mission:learning_missions(id, title, is_started, is_completed),
        week:homeschool_weeks(id, week_number, title)
      `)
      .eq('enrollment_id', enrollmentId)
      .eq('day', dayName)
      .in('status', ['UPCOMING', 'READY', 'IN_PROGRESS', 'SUBMISSION_PENDING'])
      .order('start_time', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createLearningSession(data: {
  week_id: string
  subject_id: string
  teacher_id?: string
  day: string
  start_time: string
  end_time: string
  learning_mode: string
  topic?: string
  learning_goal?: string
  instructions?: string
  submission_required?: boolean
  ai_assistance_enabled?: boolean
  ai_instructions?: string
}) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)

    const admin = await createAdminClient()
    const { data: week } = await admin
      .from('homeschool_weeks')
      .select('id, enrollment_id')
      .eq('id', data.week_id)
      .maybeSingle()
    if (!week) throw new Error('Week not found.')

    if (role === 'teacher') {
      const { data: teacher } = await admin
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!teacher) throw new Error('Teacher profile not found.')
      if (!data.teacher_id || data.teacher_id !== teacher.id) {
        throw new Error('Access denied: not assigned.')
      }
    } else if (role === 'student') {
      throw new Error('Students cannot create sessions.')
    }

    const { data: session, error } = await admin
      .from('learning_sessions')
      .insert({
        enrollment_id: week.enrollment_id,
        week_id: data.week_id,
        subject_id: data.subject_id,
        teacher_id: data.teacher_id || null,
        day: data.day,
        start_time: data.start_time,
        end_time: data.end_time,
        learning_mode: data.learning_mode,
        topic: data.topic || null,
        learning_goal: data.learning_goal || null,
        instructions: data.instructions || null,
        submission_required: data.submission_required || false,
        ai_assistance_enabled: data.ai_assistance_enabled !== false,
        ai_instructions: data.ai_instructions || null,
        status: 'UPCOMING',
        student_status: 'UPCOMING',
      })
      .select()
      .single()

    if (error) throw error

    await logHomeschoolAudit(user.id, 'create', 'session', session.id, null, session)

    return { success: true, data: session }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateLearningSession(
  sessionId: string,
  data: Partial<{
    subject_id: string
    teacher_id: string
    day: string
    start_time: string
    end_time: string
    learning_mode: string
    topic: string
    learning_goal: string
    instructions: string
    submission_required: boolean
    status: string
    ai_assistance_enabled: boolean
    ai_instructions: string
    max_duration_minutes: number
    notes: string
  }>
) {
  try {
    const { user } = await requireAdmin()
    const admin = await createAdminClient()

    const { data: before } = await admin
      .from('learning_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    const updates: Record<string, any> = {}
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) updates[key] = value
    }

    const { data: updated, error } = await admin
      .from('learning_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error

    await logHomeschoolAudit(user.id, 'update', 'session', sessionId, before, updated, {
      updated_fields: Object.keys(updates),
    })

    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function startSession(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'student') throw new Error('Only students can start sessions.')

    await verifySessionAccess(sessionId, user.id, 'student')

    const admin = await createAdminClient()
    const { data: session, error: fetchError } = await admin
      .from('learning_sessions')
      .select('id, status, student_status')
      .eq('id', sessionId)
      .maybeSingle()

    if (fetchError || !session) throw new Error('Session not found.')
    if (!['UPCOMING', 'READY'].includes(session.student_status)) {
      throw new Error('Session cannot be started.')
    }

    const { data: updated, error } = await admin
      .from('learning_sessions')
      .update({ student_status: 'IN_PROGRESS' })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function completeSession(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'student') throw new Error('Only students can complete sessions.')

    await verifySessionAccess(sessionId, user.id, 'student')

    const admin = await createAdminClient()
    const { data: session, error: fetchError } = await admin
      .from('learning_sessions')
      .select('id, student_status, submission_required')
      .eq('id', sessionId)
      .maybeSingle()

    if (fetchError || !session) throw new Error('Session not found.')
    if (session.submission_required && session.student_status !== 'SUBMITTED') {
      throw new Error('Session requires submission before completion.')
    }

    const newStatus = session.submission_required ? 'COMPLETED' : 'COMPLETED'
    const { data: updated, error } = await admin
      .from('learning_sessions')
      .update({
        student_status: 'COMPLETED',
        status: session.submission_required ? 'UNDER_REVIEW' : 'COMPLETED',
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getLearningObjectives(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    await verifySessionAccess(sessionId, user.id, role)

    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('learning_objectives')
      .select('id, session_id, title, description, order_index, is_completed, completed_at, created_at')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createLearningObjective(
  sessionId: string,
  title: string,
  description?: string
) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)

    if (!can('content.manage', role)) throw new Error(denialMessage('content.manage'))

    await verifySessionAccess(sessionId, user.id, role)

    const admin = await createAdminClient()
    const { data: existing } = await admin
      .from('learning_objectives')
      .select('order_index')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0

    const { data, error } = await admin
      .from('learning_objectives')
      .insert({
        session_id: sessionId,
        title,
        description: description || null,
        order_index: nextIndex,
        is_completed: false,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function toggleObjective(objectiveId: string, isCompleted: boolean) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'student') throw new Error('Only students can toggle objectives.')

    const admin = await createAdminClient()
    const { data: objective, error: fetchError } = await admin
      .from('learning_objectives')
      .select('id, session_id')
      .eq('id', objectiveId)
      .maybeSingle()

    if (fetchError || !objective) throw new Error('Objective not found.')

    await verifySessionAccess(objective.session_id, user.id, 'student')

    const { data, error } = await admin
      .from('learning_objectives')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', objectiveId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getLearningResources(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    await verifySessionAccess(sessionId, user.id, role)

    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('learning_resources')
      .select('id, session_id, title, description, type, url, file_path, file_name, file_size, mime_type, is_required, order_index, created_at')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: true })

    if (error) throw error

    return { success: true, data: (data || []).filter((r: any) => r.is_current !== false) }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createLearningResource(
  sessionId: string,
  data: { title: string; description?: string; type: string; url?: string; file_path?: string; is_required?: boolean }
) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)

    if (!can('content.manage', role)) throw new Error(denialMessage('content.manage'))

    await verifySessionAccess(sessionId, user.id, role)

    const admin = await createAdminClient()
    const { data: existing } = await admin
      .from('learning_resources')
      .select('order_index')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0

    const { data: resource, error } = await admin
      .from('learning_resources')
      .insert({
        session_id: sessionId,
        title: data.title,
        description: data.description || null,
        type: data.type,
        url: data.url || null,
        file_path: data.file_path || null,
        is_required: data.is_required || false,
        order_index: nextIndex,
      })
      .select()
      .single()

    if (error) throw error

    let superseded = 0
    try {
      const { data: same } = await admin
        .from('learning_resources')
        .select('id, title')
        .eq('session_id', sessionId)
        .eq('is_current', true)
        .neq('id', resource.id)
      for (const row of same || []) {
        if (row.title.trim().toLowerCase() === data.title.trim().toLowerCase()) {
          await admin
            .from('learning_resources')
            .update({ is_current: false, superseded_by: resource.id, superseded_at: new Date().toISOString() })
            .eq('id', row.id)
          superseded += 1
        }
      }
    } catch {
      // versioning columns not yet migrated — insert still stands
    }

    await logHomeschoolAudit(user.id, 'create', 'resource', resource.id, null, resource, {
      superseded_count: superseded,
    })

    return { success: true, data: resource }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getLearningMission(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    await verifySessionAccess(sessionId, user.id, role)

    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('learning_missions')
      .select('id, session_id, title, description, is_started, is_completed, started_at, completed_at, created_at, updated_at')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (error) throw error

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function startMission(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'student') throw new Error('Only students can start missions.')

    await verifySessionAccess(sessionId, user.id, 'student')

    const admin = await createAdminClient()
    const { data: mission, error: fetchError } = await admin
      .from('learning_missions')
      .select('id, is_started')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (fetchError || !mission) throw new Error('Mission not found.')
    if (mission.is_started) return { success: true, data: mission }

    const { data, error } = await admin
      .from('learning_missions')
      .update({ is_started: true, started_at: new Date().toISOString() })
      .eq('id', mission.id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function completeMission(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'student') throw new Error('Only students can complete missions.')

    await verifySessionAccess(sessionId, user.id, 'student')

    const admin = await createAdminClient()
    const { data: mission, error: fetchError } = await admin
      .from('learning_missions')
      .select('id, is_started, is_completed')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (fetchError || !mission) throw new Error('Mission not found.')
    if (mission.is_completed) return { success: true, data: mission }
    if (!mission.is_started) throw new Error('Mission must be started before completing.')

    const { data, error } = await admin
      .from('learning_missions')
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq('id', mission.id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function submitReflection(
  sessionId: string,
  data: { accomplished?: string; difficulties?: string; confidence?: string }
) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'student') throw new Error('Only students can submit reflections.')

    const student = await getStudentForUser(user.id)
    await verifySessionAccess(sessionId, user.id, 'student')

    const admin = await createAdminClient()

    if (data.confidence && !['need_help', 'getting_there', 'comfortable', 'very_confident'].includes(data.confidence)) {
      throw new Error('Invalid confidence level.')
    }

    const { data: existing } = await admin
      .from('learning_reflections')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', student.id)
      .maybeSingle()

    let result
    if (existing) {
      const { data: updated, error } = await admin
        .from('learning_reflections')
        .update({
          accomplished: data.accomplished || null,
          difficulties: data.difficulties || null,
          confidence: data.confidence || null,
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      result = updated
    } else {
      const { data: created, error } = await admin
        .from('learning_reflections')
        .insert({
          session_id: sessionId,
          student_id: student.id,
          accomplished: data.accomplished || null,
          difficulties: data.difficulties || null,
          confidence: data.confidence || null,
        })
        .select()
        .single()
      if (error) throw error
      result = created
    }

    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getHomeschoolProgress(enrollmentId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    await verifyEnrollmentAccess(enrollmentId, user.id, role)

    const admin = await createAdminClient()

    const { data: enrollment } = await admin
      .from('homeschool_enrollments')
      .select(`
        id, student_id, status, start_date, end_date, grade_level, academic_year,
        program_name, notes, created_at,
        student:students(id, full_name, admission_number),
        subjects:homeschool_subjects(
          id, subject_id, is_active,
          subject:subjects(id, name, code)
        )
      `)
      .eq('id', enrollmentId)
      .maybeSingle()

    const { data: sessions } = await admin
      .from('learning_sessions')
      .select('id, status, student_status, submission_required')
      .eq('enrollment_id', enrollmentId)

    const { data: objectives } = await admin
      .from('learning_objectives')
      .select('id, is_completed')
      .in('session_id', (sessions || []).map((s: any) => s.id))

    const totalSessions = (sessions || []).length
    const completedSessions = (sessions || []).filter(
      (s: any) => s.student_status === 'COMPLETED' || s.status === 'COMPLETED'
    ).length
    const inProgressSessions = (sessions || []).filter(
      (s: any) => s.student_status === 'IN_PROGRESS'
    ).length
    const upcomingSessions = (sessions || []).filter(
      (s: any) => s.student_status === 'UPCOMING' || s.student_status === 'NOT_STARTED'
    ).length
    const missedSessions = (sessions || []).filter(
      (s: any) => s.status === 'MISSED'
    ).length

    const totalObjectives = (objectives || []).length
    const completedObjectives = (objectives || []).filter((o: any) => o.is_completed).length

    const submissionRequiredSessions = (sessions || []).filter(
      (s: any) => s.submission_required
    ).length
    const submittedSessions = (sessions || []).filter(
      (s: any) => s.student_status === 'SUBMITTED' || s.status === 'UNDER_REVIEW'
    ).length

    const sessionProgress = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0
    const objectiveProgress = totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0
    const submissionProgress = submissionRequiredSessions > 0
      ? Math.round((submittedSessions / submissionRequiredSessions) * 100)
      : 100

    const overallProgress = totalSessions > 0
      ? Math.round((sessionProgress * 0.5 + objectiveProgress * 0.3 + submissionProgress * 0.2))
      : 0

    if (enrollment) {
      const tas = await fetchTeacherAssignments(admin, [enrollment.id])
      attachTeacherAssignments([enrollment], tas)
    }

    return {
      success: true,
      data: {
        enrollment: enrollment as unknown as HomeschoolEnrollment | null,
        summary: {
          totalSessions,
          completedSessions,
          inProgressSessions,
          upcomingSessions,
          missedSessions,
          totalObjectives,
          completedObjectives,
          submissionRequiredSessions,
          submittedSessions,
        },
        progress: {
          sessionProgress,
          objectiveProgress,
          submissionProgress,
          overallProgress,
        },
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getSubjectProgress(enrollmentId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    await verifyEnrollmentAccess(enrollmentId, user.id, role)

    const admin = await createAdminClient()

    const { data: subjects } = await admin
      .from('homeschool_subjects')
      .select(`
        id, subject_id, is_active,
        subject:subjects(id, name, code)
      `)
      .eq('enrollment_id', enrollmentId)
      .eq('is_active', true)

    const subjectIds = (subjects || []).map((s: any) => s.subject_id)
    if (subjectIds.length === 0) return { success: true, data: [] }

    const { data: sessions } = await admin
      .from('learning_sessions')
      .select('id, subject_id, status, student_status')
      .eq('enrollment_id', enrollmentId)
      .in('subject_id', subjectIds)

    const sessionIds = (sessions || []).map((s: any) => s.id)
    const { data: objectives } = sessionIds.length > 0
      ? await admin
          .from('learning_objectives')
          .select('id, session_id, is_completed')
          .in('session_id', sessionIds)
      : { data: [] }

    const subjectMap = new Map<string, any>()
    for (const s of subjects || []) {
      subjectMap.set(s.subject_id, {
        subject_id: s.subject_id,
        subject_name: (s.subject as any)?.name || 'Unknown',
        subject_code: (s.subject as any)?.code || null,
        total_sessions: 0,
        completed_sessions: 0,
        in_progress_sessions: 0,
        total_objectives: 0,
        completed_objectives: 0,
        progress_percent: 0,
      })
    }

    for (const session of sessions || []) {
      const entry = subjectMap.get(session.subject_id)
      if (!entry) continue
      entry.total_sessions++
      if (session.student_status === 'COMPLETED' || session.status === 'COMPLETED') {
        entry.completed_sessions++
      } else if (session.student_status === 'IN_PROGRESS') {
        entry.in_progress_sessions++
      }
    }

    const sessionSubjectMap = new Map<string, string>()
    for (const session of sessions || []) {
      sessionSubjectMap.set(session.id, session.subject_id)
    }

    for (const objective of objectives || []) {
      const subjectId = sessionSubjectMap.get((objective as any).session_id)
      if (!subjectId) continue
      const entry = subjectMap.get(subjectId)
      if (!entry) continue
      entry.total_objectives++
      if (objective.is_completed) entry.completed_objectives++
    }

    const result = Array.from(subjectMap.values())
    for (const entry of result) {
      if (entry.total_sessions > 0) {
        entry.progress_percent = Math.round((entry.completed_sessions / entry.total_sessions) * 100)
      }
    }

    return { success: true, data: result as SubjectProgress[] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getHomeschoolDashboardData(studentId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)

    if (role === 'student') {
      await verifyStudentOwnership(studentId, user.id)
    } else if (role !== 'admin') {
      throw new Error('Access denied.')
    }

    const admin = await createAdminClient()

    const { data: enrollmentRows } = await admin
      .from('homeschool_enrollments')
      .select(`
        id, student_id, status, start_date, end_date, grade_level, academic_year,
        program_name, notes, created_at,
        student:students(id, full_name, admission_number),
        subjects:homeschool_subjects(
          id, subject_id, is_active,
          subject:subjects(id, name, code)
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)

    const enrollment = enrollmentRows?.[0] ?? null

    if (enrollment) {
      const tas = await fetchTeacherAssignments(admin, [enrollment.id])
      attachTeacherAssignments([enrollment], tas)
    }

    let todaySessions: any[] = []
    let weekOverview: any[] = []
    let pendingItems: any[] = []
    let progress = { sessionProgress: 0, objectiveProgress: 0, overallProgress: 0 }

    if (enrollment) {
      const today = new Date()
      const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })

      const [todayRes, weeksRes, sessionsRes] = await Promise.all([
        admin
          .from('learning_sessions')
          .select(`
            id, subject_id, day, start_time, end_time, learning_mode, topic, status, student_status,
            subject:subjects(id, name),
            objectives:learning_objectives(id, is_completed),
            mission:learning_missions(id, is_started, is_completed)
          `)
          .eq('enrollment_id', enrollment.id)
          .eq('day', dayName)
          .in('status', ['UPCOMING', 'READY', 'IN_PROGRESS', 'SUBMISSION_PENDING'])
          .order('start_time', { ascending: true }),
        admin
          .from('homeschool_weeks')
          .select(`
            id, week_number, title, start_date, end_date, status,
            sessions:learning_sessions(id, status, student_status)
          `)
          .eq('enrollment_id', enrollment.id)
          .order('week_number', { ascending: true })
          .limit(5),
        admin
          .from('learning_sessions')
          .select('id, status, student_status, submission_required')
          .eq('enrollment_id', enrollment.id),
      ])

      const allSessions = (sessionsRes.data || []).filter((s: any) => s.status !== 'CANCELLED')
      const sessionIds = allSessions.map((s: any) => s.id)
      const { data: objectivesRes } = sessionIds.length > 0
        ? await admin
            .from('learning_objectives')
            .select('id, is_completed')
            .in('session_id', sessionIds)
        : { data: [] as any[] }

      todaySessions = todayRes.data || []
      weekOverview = weeksRes.data || []

      const allObjectives = (objectivesRes || []) as any[]

      pendingItems = allSessions.filter(
        (s: any) =>
          s.student_status === 'UPCOMING' ||
          s.student_status === 'NOT_STARTED' ||
          s.student_status === 'IN_PROGRESS' ||
          s.student_status === 'SUBMITTED'
      )

      const totalSessions = allSessions.length
      const completedSessions = allSessions.filter(
        (s: any) => s.student_status === 'COMPLETED' || s.status === 'COMPLETED'
      ).length
      const totalObjectives = allObjectives.length
      const completedObjectives = allObjectives.filter((o: any) => o.is_completed).length

      progress = {
        sessionProgress: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
        objectiveProgress: totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0,
        overallProgress: totalSessions > 0
          ? Math.round(((completedSessions / totalSessions) * 100 + (totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0)) / 2)
          : 0,
      }
    }

    return {
      success: true,
      data: {
        enrollment,
        todaySessions,
        weekOverview,
        pendingItems,
        progress,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getStudentHomeschoolOverview(studentId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)

    if (role === 'student') {
      await verifyStudentOwnership(studentId, user.id)
    } else if (role !== 'admin') {
      throw new Error('Access denied.')
    }

    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('homeschool_enrollments')
      .select('id, status, grade_level, academic_year, program_name')
      .eq('student_id', studentId)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (error) throw error

    return {
      success: true,
      data: {
        hasActiveEnrollment: !!data,
        enrollment: data,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function logHomeschoolAudit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  beforeState?: any,
  afterState?: any,
  metadata?: Record<string, any>
) {
  try {
    const admin = await createAdminClient()

    const { error } = await admin
      .from('homeschool_audit_log')
      .insert({
        actor_id: actorId,
        actor_role: 'admin',
        action,
        target_type: targetType,
        target_id: targetId,
        before_state: beforeState || null,
        after_state: afterState || null,
        metadata: metadata || {},
      })

    if (error) {
      console.error('[logHomeschoolAudit] Failed to insert audit log:', error.message)
    }

    return { success: !error }
  } catch (err: any) {
    console.error('[logHomeschoolAudit] Error:', err.message)
    return { success: false }
  }
}

export async function deleteLearningSession(sessionId: string) {
  try {
    const { user } = await requireAdmin()
    const admin = await createAdminClient()

    const { data: before } = await admin
      .from('learning_sessions')
      .select('*, week:homeschool_weeks(id, status)')
      .eq('id', sessionId)
      .maybeSingle()

    if (!before) throw new Error('Session not found.')

    if ((before.week as any)?.status !== 'DRAFT') {
      throw new Error('This session is published. Cancel it instead to preserve learning history.')
    }

    const [{ count: doneObjectives }, { data: linked }, { count: reflections }, { data: mission }] = await Promise.all([
      admin.from('learning_objectives').select('id', { count: 'exact', head: true }).eq('session_id', sessionId).eq('is_completed', true),
      admin.from('assignments').select('id').eq('session_id', sessionId).limit(1),
      admin.from('learning_reflections').select('id', { count: 'exact', head: true }).eq('session_id', sessionId),
      admin.from('learning_missions').select('id, is_started').eq('session_id', sessionId).maybeSingle(),
    ])

    if ((doneObjectives || 0) > 0 || (reflections || 0) > 0 || (linked || []).length > 0 || mission?.is_started) {
      throw new Error('This session has learning activity. Cancel it instead to preserve history.')
    }

    const { error } = await admin
      .from('learning_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) throw error

    await logHomeschoolAudit(user.id, 'delete', 'session', sessionId, before, null)

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createBulkSessions(sessions: Array<{
  week_id: string
  subject_id: string
  teacher_id?: string
  day: string
  start_time: string
  end_time: string
  learning_mode: string
  topic?: string
  learning_goal?: string
  instructions?: string
  submission_required?: boolean
  ai_assistance_enabled?: boolean
  ai_instructions?: string
}>) {
  try {
    const { user } = await requireAdmin()
    const admin = await createAdminClient()

    const weekIds = [...new Set(sessions.map((s) => s.week_id))]
    const { data: weeks, error: weekError } = await admin
      .from('homeschool_weeks')
      .select('id, enrollment_id')
      .in('id', weekIds)

    if (weekError) throw weekError
    if (!weeks || weeks.length !== weekIds.length) {
      throw new Error('One or more weeks not found.')
    }

    const weekMap = new Map<string, string>()
    for (const w of weeks) {
      weekMap.set(w.id, w.enrollment_id)
    }

    for (const s of sessions) {
      if (timeToMinutes(s.end_time) <= timeToMinutes(s.start_time)) {
        throw new Error(`Invalid time range for session on ${s.day}: ${s.start_time}–${s.end_time}`)
      }
    }

    const enrollmentWeekSessions = new Map<string, Array<{ start_time: string; end_time: string; day: string }>>()
    for (const s of sessions) {
      const enrollmentId = weekMap.get(s.week_id)!
      const key = `${enrollmentId}:${s.day}`
      if (!enrollmentWeekSessions.has(key)) {
        const { data: existing } = await admin
          .from('learning_sessions')
          .select('start_time, end_time, day')
          .eq('enrollment_id', enrollmentId)
          .eq('day', s.day)
        enrollmentWeekSessions.set(key, existing || [])
      }
      const existing = enrollmentWeekSessions.get(key)!
      const newStart = timeToMinutes(s.start_time)
      const newEnd = timeToMinutes(s.end_time)
      for (const e of existing) {
        const eStart = timeToMinutes(e.start_time)
        const eEnd = timeToMinutes(e.end_time)
        if (newStart < eEnd && newEnd > eStart) {
          throw new Error(`Time conflict on ${s.day}: ${s.start_time}–${s.end_time} overlaps with ${e.start_time}–${e.end_time}`)
        }
      }
      existing.push({ start_time: s.start_time, end_time: s.end_time, day: s.day })
    }

    const inserts = sessions.map((s) => ({
      enrollment_id: weekMap.get(s.week_id)!,
      week_id: s.week_id,
      subject_id: s.subject_id,
      teacher_id: s.teacher_id || null,
      day: s.day,
      start_time: s.start_time,
      end_time: s.end_time,
      learning_mode: s.learning_mode,
      topic: s.topic || null,
      learning_goal: s.learning_goal || null,
      instructions: s.instructions || null,
      submission_required: s.submission_required || false,
      ai_assistance_enabled: s.ai_assistance_enabled !== false,
      ai_instructions: s.ai_instructions || null,
      status: 'UPCOMING',
      student_status: 'UPCOMING',
    }))

    const { data: created, error } = await admin
      .from('learning_sessions')
      .insert(inserts)
      .select()

    if (error) throw error

    await logHomeschoolAudit(user.id, 'bulk_create', 'session', weekIds[0], null, null, {
      count: inserts.length,
      week_ids: weekIds,
    })

    return { success: true, data: created }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export async function duplicateWeekAsTemplate(
  sourceWeekId: string,
  targetEnrollmentId: string,
  newWeekNumber: number,
  newStartDate: string,
  newEndDate: string
) {
  try {
    const { user } = await requireAdmin()
    const admin = await createAdminClient()

    const { data: sourceWeek, error: sourceError } = await admin
      .from('homeschool_weeks')
      .select('id, enrollment_id, title')
      .eq('id', sourceWeekId)
      .maybeSingle()
    if (sourceError || !sourceWeek) throw new Error('Source week not found.')

    const { data: targetEnrollment, error: enrollError } = await admin
      .from('homeschool_enrollments')
      .select('id, student_id')
      .eq('id', targetEnrollmentId)
      .maybeSingle()
    if (enrollError || !targetEnrollment) throw new Error('Target enrollment not found.')

    const { data: existingWeek } = await admin
      .from('homeschool_weeks')
      .select('id')
      .eq('enrollment_id', targetEnrollmentId)
      .eq('week_number', newWeekNumber)
      .maybeSingle()
    if (existingWeek) throw new Error(`Week number ${newWeekNumber} already exists for this enrollment.`)

    const { data: newWeek, error: weekError } = await admin
      .from('homeschool_weeks')
      .insert({
        enrollment_id: targetEnrollmentId,
        week_number: newWeekNumber,
        title: sourceWeek.title || `Week ${newWeekNumber}`,
        start_date: newStartDate,
        end_date: newEndDate,
        status: 'DRAFT',
      })
      .select()
      .single()

    if (weekError) throw weekError

    const { data: sourceSessions, error: sessError } = await admin
      .from('learning_sessions')
      .select('*')
      .eq('week_id', sourceWeekId)
      .order('day', { ascending: true })
      .order('start_time', { ascending: true })

    if (sessError) throw sessError

    if (!sourceSessions?.length) {
      await logHomeschoolAudit(user.id, 'duplicate_week', 'week', newWeek.id, null, newWeek, {
        source_week_id: sourceWeekId,
        sessions_copied: 0,
      })
      return { success: true, data: { week: newWeek, sessions: [] } }
    }

    const inserts = sourceSessions.map((s) => ({
      enrollment_id: targetEnrollmentId,
      week_id: newWeek.id,
      subject_id: s.subject_id,
      teacher_id: s.teacher_id,
      day: s.day,
      start_time: s.start_time,
      end_time: s.end_time,
      learning_mode: s.learning_mode,
      topic: s.topic,
      learning_goal: s.learning_goal,
      instructions: s.instructions,
      submission_required: s.submission_required,
      ai_assistance_enabled: s.ai_assistance_enabled,
      ai_instructions: s.ai_instructions,
      max_duration_minutes: s.max_duration_minutes,
      status: 'UPCOMING',
      student_status: 'UPCOMING',
    }))

    const { data: createdSessions, error: insertError } = await admin
      .from('learning_sessions')
      .insert(inserts)
      .select()

    if (insertError) throw insertError

    await logHomeschoolAudit(user.id, 'duplicate_week', 'week', newWeek.id, null, newWeek, {
      source_week_id: sourceWeekId,
      sessions_copied: inserts.length,
      target_enrollment_id: targetEnrollmentId,
    })

    return { success: true, data: { week: newWeek, sessions: createdSessions } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteLearningObjective(objectiveId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (!can('content.manage', role)) throw new Error(denialMessage('content.manage'))

    const admin = await createAdminClient()
    const { data: objective } = await admin
      .from('learning_objectives')
      .select('id, session_id')
      .eq('id', objectiveId)
      .maybeSingle()
    if (!objective) throw new Error('Objective not found.')

    await verifySessionAccess(objective.session_id, user.id, role)

    const { error } = await admin
      .from('learning_objectives')
      .delete()
      .eq('id', objectiveId)
    if (error) throw error

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteLearningResource(resourceId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (!can('content.manage', role)) throw new Error(denialMessage('content.manage'))

    const admin = await createAdminClient()
    const { data: resource } = await admin
      .from('learning_resources')
      .select('id, session_id')
      .eq('id', resourceId)
      .maybeSingle()
    if (!resource) throw new Error('Resource not found.')

    await verifySessionAccess(resource.session_id, user.id, role)

    const { error } = await admin
      .from('learning_resources')
      .delete()
      .eq('id', resourceId)
    if (error) throw error

    await logHomeschoolAudit(user.id, 'delete', 'resource', resourceId, resource, null)

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function attachAssignmentToSession(sessionId: string, assignmentId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (!can('assignment.attach', role)) throw new Error(denialMessage('assignment.attach'))

    const session = await verifySessionAccess(sessionId, user.id, role)
    const admin = await createAdminClient()

    const { data: assignment, error: fetchError } = await admin
      .from('assignments')
      .select('id, teacher_id, session_id, title')
      .eq('id', assignmentId)
      .maybeSingle()
    if (fetchError || !assignment) throw new Error('Assignment not found.')

    if (role === 'teacher') {
      const { data: teacher } = await admin
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!teacher) throw new Error('Teacher profile not found.')
      if (assignment.teacher_id !== teacher.id && assignment.session_id !== sessionId) {
        throw new Error('You can only attach assignments you created.')
      }
    }

    if (assignment.session_id && assignment.session_id !== sessionId) {
      throw new Error('This assignment is already attached to another session. Detach it first.')
    }

    const { data: fullSession } = await admin
      .from('learning_sessions')
      .select('id, week_id')
      .eq('id', sessionId)
      .maybeSingle()

    const { data: updated, error } = await admin
      .from('assignments')
      .update({
        session_id: sessionId,
        week_id: fullSession?.week_id || null,
        program: 'HOMESCHOOLING',
      })
      .eq('id', assignmentId)
      .select()
      .single()

    if (error) throw error

    await logHomeschoolAudit(user.id, 'attach_assignment', 'session', sessionId, null, updated, {
      assignment_id: assignmentId,
    })

    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function detachAssignmentFromSession(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (!can('assignment.attach', role)) throw new Error(denialMessage('assignment.attach'))

    await verifySessionAccess(sessionId, user.id, role)
    const admin = await createAdminClient()

    const { data: linked } = await admin
      .from('assignments')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle()
    if (!linked) throw new Error('No assignment attached to this session.')

    const { error } = await admin
      .from('assignments')
      .update({ session_id: null, week_id: null, program: 'GROUP_TUITION' })
      .eq('id', linked.id)
    if (error) throw error

    await logHomeschoolAudit(user.id, 'detach_assignment', 'session', sessionId, linked, null)

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getLinkableAssignments(search?: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (!can('assignment.attach', role)) throw new Error(denialMessage('assignment.attach'))

    const admin = await createAdminClient()
    let query = admin
      .from('assignments')
      .select('id, title, status, due_date, max_marks, session_id, subject:subjects(id, name), teacher:teachers(id, full_name)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (role === 'teacher') {
      const { data: teacher } = await admin
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!teacher) throw new Error('Teacher profile not found.')
      query = query.eq('teacher_id', teacher.id)
    }

    if (search && search.trim().length > 0) {
      query = query.ilike('title', `%${search.trim()}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getSessionAssignment(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    await verifySessionAccess(sessionId, user.id, role)

    const admin = await createAdminClient()
    let query = admin
      .from('assignments')
      .select('id, title, description, status, due_date, max_marks, subject:subjects(id, name), teacher:teachers(id, full_name)')
      .eq('session_id', sessionId)
      .maybeSingle()

    const { data, error } = await query
    if (error) throw error
    if (!data) return { success: true, data: null }
    if (role === 'student' && (data as any).status !== 'published') {
      return { success: true, data: null }
    }

    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getSessionSubmission(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'student') throw new Error('Only students can view their submission this way.')

    const student = await getStudentForUser(user.id)
    await verifySessionAccess(sessionId, user.id, 'student')

    const admin = await createAdminClient()
    const { data: assignment } = await admin
      .from('assignments')
      .select('id')
      .eq('session_id', sessionId)
      .eq('status', 'published')
      .maybeSingle()
    if (!assignment) return { success: true, data: null }

    const { data: submission, error } = await admin
      .from('submissions')
      .select('id, content, status, marks, grade, feedback, strengths, weaknesses, submitted_at, marked_at, returned_at')
      .eq('assignment_id', assignment.id)
      .eq('student_id', student.id)
      .maybeSingle()
    if (error) throw error

    return { success: true, data: submission }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getLinkedAssignmentSubmissions(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (!can('submission.review', role)) throw new Error(denialMessage('submission.review'))

    await verifySessionAccess(sessionId, user.id, role)
    const admin = await createAdminClient()

    const { data: assignment } = await admin
      .from('assignments')
      .select('id, title')
      .eq('session_id', sessionId)
      .maybeSingle()
    if (!assignment) return { success: true, data: { assignment: null, submissions: [] } }

    const { data: submissions, error } = await admin
      .from('submissions')
      .select('id, content, status, marks, grade, feedback, submitted_at, student:students(id, full_name)')
      .eq('assignment_id', assignment.id)
      .order('submitted_at', { ascending: false })
    if (error) throw error

    return { success: true, data: { assignment, submissions: submissions || [] } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function submitSessionWork(
  sessionId: string,
  data: { answerText?: string; fileUrls?: string[] }
) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (!can('assignment.submit', role)) throw new Error(denialMessage('assignment.submit'))

    const student = await getStudentForUser(user.id)
    const session = await verifySessionAccess(sessionId, user.id, 'student')

    const admin = await createAdminClient()
    const { data: enrollment } = await admin
      .from('homeschool_enrollments')
      .select('id, status')
      .eq('id', (session as any).enrollment_id)
      .maybeSingle()
    if (!can('assignment.submit', role, { enrollmentStatus: enrollment?.status, isOwner: true })) {
      throw new Error(denialMessage('assignment.submit'))
    }

    const { data: assignment } = await admin
      .from('assignments')
      .select('id, title, teacher_id')
      .eq('session_id', sessionId)
      .eq('status', 'published')
      .maybeSingle()
    if (!assignment) throw new Error('No published assignment attached to this session yet.')

    const files = (data.fileUrls || []).filter(Boolean)
    if (!data.answerText?.trim() && files.length === 0) {
      throw new Error('Write an answer or upload your work before submitting.')
    }

    const content = JSON.stringify({
      text: data.answerText?.trim() || '',
      files,
      session_id: sessionId,
      submitted_via: 'homeschool_session',
    })

    const { data: submission, error } = await admin
      .from('submissions')
      .upsert(
        {
          assignment_id: assignment.id,
          student_id: student.id,
          content,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'assignment_id,student_id' }
      )
      .select()
      .single()
    if (error) throw error

    await admin
      .from('learning_sessions')
      .update({ student_status: 'SUBMITTED', status: 'SUBMISSION_PENDING' })
      .eq('id', sessionId)

    const { data: teacher } = await admin
      .from('teachers')
      .select('user_id')
      .eq('id', assignment.teacher_id)
      .maybeSingle()
    if (teacher?.user_id) {
      await admin.from('notifications').insert({
        user_id: teacher.user_id,
        title: 'Homeschool submission',
        body: `A student submitted work for "${assignment.title}".`,
        type: 'submission',
        data: { assignment_id: assignment.id, student_id: student.id, session_id: sessionId },
      })
    }

    await logHomeschoolAudit(user.id, 'submit', 'session', sessionId, null, submission, {
      assignment_id: assignment.id,
    })

    return { success: true, data: submission }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function requestSessionCorrections(sessionId: string, submissionId: string, note?: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (!can('submission.review', role)) throw new Error(denialMessage('submission.review'))

    await verifySessionAccess(sessionId, user.id, role)
    const admin = await createAdminClient()

    const { data: linked } = await admin
      .from('assignments')
      .select('id, title')
      .eq('session_id', sessionId)
      .maybeSingle()
    if (!linked) throw new Error('No assignment attached to this session.')

    const { data: submission } = await admin
      .from('submissions')
      .select('id, student_id, feedback')
      .eq('id', submissionId)
      .eq('assignment_id', linked.id)
      .maybeSingle()
    if (!submission) throw new Error('Submission not found.')

    const correctionNote = note?.trim()
      ? `${submission.feedback ? submission.feedback + '\n\n' : ''}Corrections requested: ${note.trim()}`
      : submission.feedback

    const { error: subError } = await admin
      .from('submissions')
      .update({ status: 'submitted', feedback: correctionNote, returned_at: null })
      .eq('id', submissionId)
    if (subError) throw subError

    const { error: sessError } = await admin
      .from('learning_sessions')
      .update({ status: 'CORRECTIONS_REQUIRED' })
      .eq('id', sessionId)
    if (sessError) throw sessError

    const { data: student } = await admin
      .from('students')
      .select('user_id, full_name')
      .eq('id', submission.student_id)
      .maybeSingle()
    if (student?.user_id) {
      await admin.from('notifications').insert({
        user_id: student.user_id,
        title: 'Corrections requested',
        body: `Your teacher left feedback on "${linked.title}". Review and resubmit.`,
        type: 'corrections_required',
        data: { assignment_id: linked.id, student_id: submission.student_id, session_id: sessionId },
      })
    }

    await logHomeschoolAudit(user.id, 'request_corrections', 'session', sessionId, null, null, {
      submission_id: submissionId,
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function acceptSessionWork(sessionId: string, submissionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (!can('submission.accept', role)) throw new Error(denialMessage('submission.accept'))

    await verifySessionAccess(sessionId, user.id, role)
    const admin = await createAdminClient()

    const { data: linked } = await admin
      .from('assignments')
      .select('id, title')
      .eq('session_id', sessionId)
      .maybeSingle()
    if (!linked) throw new Error('No assignment attached to this session.')

    const { data: submission } = await admin
      .from('submissions')
      .select('id, student_id')
      .eq('id', submissionId)
      .eq('assignment_id', linked.id)
      .maybeSingle()
    if (!submission) throw new Error('Submission not found.')

    const { error: sessError } = await admin
      .from('learning_sessions')
      .update({ status: 'COMPLETED', student_status: 'COMPLETED' })
      .eq('id', sessionId)
    if (sessError) throw sessError

    const { data: student } = await admin
      .from('students')
      .select('user_id')
      .eq('id', submission.student_id)
      .maybeSingle()
    if (student?.user_id) {
      await admin.from('notifications').insert({
        user_id: student.user_id,
        title: 'Work accepted',
        body: `Your work for "${linked.title}" was accepted. Well done!`,
        type: 'work_accepted',
        data: { assignment_id: linked.id, student_id: submission.student_id, session_id: sessionId },
      })
    }

    await logHomeschoolAudit(user.id, 'accept_work', 'session', sessionId, null, null, {
      submission_id: submissionId,
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

function sessionDayToDate(weekStart: string, weekEnd: string, day: string): Date | null {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(weekEnd + 'T23:59:59')
  const cursor = new Date(start)
  while (cursor <= end) {
    const name = cursor.toLocaleDateString('en-US', { weekday: 'long' })
    if (name === day) return cursor
    cursor.setDate(cursor.getDate() + 1)
  }
  return null
}

export async function scanMissedSessions(enrollmentId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (!can('session.scan', role)) throw new Error(denialMessage('session.scan'))

    await verifyEnrollmentAccess(enrollmentId, user.id, role)
    const admin = await createAdminClient()

    const { data: sessions, error } = await admin
      .from('learning_sessions')
      .select('id, day, start_time, end_time, status, student_status, week:homeschool_weeks(id, start_date, end_date, status)')
      .eq('enrollment_id', enrollmentId)
      .in('status', ['UPCOMING', 'READY'])
      .in('student_status', ['UPCOMING', 'NOT_STARTED'])
    if (error) throw error

    const now = new Date()
    const missedIds: string[] = []
    for (const s of sessions || []) {
      const week = s.week as any
      if (!week || week.status !== 'PUBLISHED') continue
      const date = sessionDayToDate(week.start_date, week.end_date, s.day)
      if (!date) continue
      const [eh, em] = s.end_time.split(':').map(Number)
      const endsAt = new Date(date)
      endsAt.setHours(eh, em || 0, 0, 0)
      if (endsAt < now) missedIds.push(s.id)
    }

    if (missedIds.length > 0) {
      const { error: updateError } = await admin
        .from('learning_sessions')
        .update({ status: 'MISSED' })
        .in('id', missedIds)
      if (updateError) throw updateError

      await logHomeschoolAudit(user.id, 'scan_missed', 'enrollment', enrollmentId, null, null, {
        missed_count: missedIds.length,
        session_ids: missedIds,
      })

      const { data: enrollment } = await admin
        .from('homeschool_enrollments')
        .select('student:students(user_id)')
        .eq('id', enrollmentId)
        .maybeSingle()
      const studentUserId = (enrollment?.student as any)?.user_id
      if (studentUserId) {
        await admin.from('notifications').insert({
          user_id: studentUserId,
          title: 'Missed learning sessions',
          body: `You missed ${missedIds.length} learning session${missedIds.length !== 1 ? 's' : ''}. Open them to catch up.`,
          type: 'missed_session',
          data: { enrollment_id: enrollmentId, session_ids: missedIds },
        })
      }
    }

    return { success: true, data: { missed: missedIds.length, sessionIds: missedIds } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function catchUpSession(sessionId: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (role !== 'student') throw new Error('Only students can catch up on sessions.')

    await verifySessionAccess(sessionId, user.id, 'student')
    const admin = await createAdminClient()

    const { data: session } = await admin
      .from('learning_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session) throw new Error('Session not found.')
    if (session.status !== 'MISSED') throw new Error('Only missed sessions can be caught up.')

    const { data: updated, error } = await admin
      .from('learning_sessions')
      .update({ status: 'IN_PROGRESS', student_status: 'IN_PROGRESS' })
      .eq('id', sessionId)
      .select()
      .single()
    if (error) throw error

    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function rescheduleSession(
  sessionId: string,
  data: { day: string; start_time: string; end_time: string; reason?: string }
) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (!can('session.reschedule', role)) throw new Error(denialMessage('session.reschedule'))

    await verifySessionAccess(sessionId, user.id, role)
    const admin = await createAdminClient()

    const { data: original, error: fetchError } = await admin
      .from('learning_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()
    if (fetchError || !original) throw new Error('Session not found.')
    if (original.status === 'CANCELLED') throw new Error('Cancelled sessions cannot be rescheduled.')

    const timeToMin = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }
    if (timeToMin(data.end_time) <= timeToMin(data.start_time)) {
      throw new Error('End time must be after start time.')
    }

    const { data: clashes } = await admin
      .from('learning_sessions')
      .select('id, start_time, end_time')
      .eq('enrollment_id', original.enrollment_id)
      .eq('day', data.day)
      .neq('id', sessionId)
      .neq('status', 'CANCELLED')
    for (const c of clashes || []) {
      if (timeToMin(data.start_time) < timeToMin(c.end_time) && timeToMin(data.end_time) > timeToMin(c.start_time)) {
        throw new Error(`Time conflict on ${data.day}: overlaps ${c.start_time}–${c.end_time}.`)
      }
    }

    const { id: _drop, created_at: _c, updated_at: _u, ...copyFields } = original
    const { data: moved, error: insertError } = await admin
      .from('learning_sessions')
      .insert({
        ...copyFields,
        day: data.day,
        start_time: data.start_time,
        end_time: data.end_time,
        status: 'UPCOMING',
        student_status: 'UPCOMING',
        rescheduled_from: sessionId,
        notes: [original.notes, data.reason ? `Rescheduled: ${data.reason}` : null].filter(Boolean).join('\n') || null,
      })
      .select()
      .single()
    if (insertError) throw insertError

    const { data: objectives } = await admin
      .from('learning_objectives')
      .select('title, description, order_index')
      .eq('session_id', sessionId)
      .order('order_index')
    if (objectives && objectives.length > 0) {
      await admin.from('learning_objectives').insert(
        objectives.map((o) => ({ ...o, session_id: moved.id, is_completed: false, completed_at: null }))
      )
    }

    const { data: resources } = await admin
      .from('learning_resources')
      .select('title, description, type, url, file_path, file_name, file_size, mime_type, is_required, order_index')
      .eq('session_id', sessionId)
      .order('order_index')
    if (resources && resources.length > 0) {
      await admin.from('learning_resources').insert(
        resources.map((r) => ({ ...r, session_id: moved.id }))
      )
    }

    const { data: mission } = await admin
      .from('learning_missions')
      .select('title, description')
      .eq('session_id', sessionId)
      .maybeSingle()
    if (mission) {
      await admin.from('learning_missions').insert({
        session_id: moved.id,
        title: mission.title,
        description: mission.description,
      })
    }

    await admin
      .from('assignments')
      .update({ session_id: moved.id })
      .eq('session_id', sessionId)

    const { error: cancelError } = await admin
      .from('learning_sessions')
      .update({
        status: 'CANCELLED',
        cancelled_reason: data.reason ? `Rescheduled: ${data.reason}` : 'Rescheduled to a new time.',
      })
      .eq('id', sessionId)
    if (cancelError) throw cancelError

    await logHomeschoolAudit(user.id, 'reschedule', 'session', moved.id, original, moved, {
      from: { day: original.day, start_time: original.start_time, end_time: original.end_time },
      to: { day: data.day, start_time: data.start_time, end_time: data.end_time },
      reason: data.reason || null,
    })

    return { success: true, data: moved }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function cancelSession(sessionId: string, reason?: string) {
  try {
    const { user } = await getAuthUser()
    const role = getUserRole(user)
    if (!can('session.cancel', role)) throw new Error(denialMessage('session.cancel'))

    const session = await verifySessionAccess(sessionId, user.id, role)
    void session
    const admin = await createAdminClient()

    const { data: before } = await admin
      .from('learning_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()
    if (!before) throw new Error('Session not found.')
    if (before.status === 'CANCELLED') throw new Error('Session is already cancelled.')

    const { data: updated, error } = await admin
      .from('learning_sessions')
      .update({
        status: 'CANCELLED',
        cancelled_reason: reason?.trim() || 'Cancelled.',
      })
      .eq('id', sessionId)
      .select()
      .single()
    if (error) throw error

    await logHomeschoolAudit(user.id, 'cancel', 'session', sessionId, before, updated, {
      reason: reason?.trim() || null,
    })

    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
