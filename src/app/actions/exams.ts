'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    }
  )
}

export async function createExam(data: {
  title: string
  description?: string
  subject_id?: string
  duration_minutes: number
  pass_mark?: number
  random_order: boolean
  status: 'draft' | 'published'
}) {
  const supabase = await getSupabase()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  // Get teacher ID
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', user.user.id)
    .single()
    
  if (!teacher) throw new Error('Not a teacher')

  const { data: exam, error } = await supabase
    .from('exams')
    .insert({
      teacher_id: teacher.id,
      title: data.title,
      description: data.description,
      subject_id: data.subject_id,
      duration_minutes: data.duration_minutes,
      pass_mark: data.pass_mark,
      random_order: data.random_order,
      status: data.status,
    })
    .select()
    .single()

  if (error) throw error
  return exam
}

export async function addExamQuestion(examId: string, questionData: any) {
  const supabase = await getSupabase()
  
  const { data, error } = await supabase
    .from('exam_questions')
    .insert({
      exam_id: examId,
      ...questionData
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getExamsByTeacher() {
  const supabase = await getSupabase()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return []

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', user.user.id)
    .single()
    
  if (!teacher) return []

  const { data, error } = await supabase
    .from('exams')
    .select(`
      *,
      subject:subjects(name)
    `)
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getExamWithQuestions(examId: string) {
  const supabase = await getSupabase()
  
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select(`
      *,
      subject:subjects(name)
    `)
    .eq('id', examId)
    .single()

  if (examError) throw examError

  const { data: questions, error: qError } = await supabase
    .from('exam_questions')
    .select('*')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true })

  if (qError) throw qError

  // Also fetch passages (poems, excerpts, etc.)
  const { data: passages, error: pError } = await supabase
    .from('exam_passages')
    .select('*')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true })

  if (pError) throw pError

  return { ...exam, questions, passages: passages || [] }
}

export async function getStudentExams() {
  const supabase = await getSupabase()
  
  // We only show published exams to students
  const { data, error } = await supabase
    .from('exams')
    .select(`
      *,
      subject:subjects(name)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function startExamSubmission(examId: string) {
  const supabase = await getSupabase()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.user.id)
    .single()
    
  if (!student) throw new Error('Not a student')

  // Check if already started
  const { data: existing } = await supabase
    .from('exam_submissions')
    .select('id, status, start_time')
    .eq('exam_id', examId)
    .eq('student_id', student.id)
    .single()

  if (existing) {
    if (existing.status !== 'in_progress') throw new Error('Exam already submitted')
    return { id: existing.id, start_time: existing.start_time }
  }

  const { data, error } = await supabase
    .from('exam_submissions')
    .insert({
      exam_id: examId,
      student_id: student.id,
      status: 'in_progress'
    })
    .select('id, start_time')
    .single()

  if (error) throw error
  return { id: data.id, start_time: data.start_time }
}

export async function submitExam(submissionId: string, answers: any[]) {
  const supabase = await getSupabase()
  
  // Update status to submitted
  const { error: subError } = await supabase
    .from('exam_submissions')
    .update({ 
      status: 'submitted',
      submit_time: new Date().toISOString()
    })
    .eq('id', submissionId)

  if (subError) throw subError

  // Insert answers
  for (const answer of answers) {
    await supabase
      .from('exam_answers')
      .upsert({
        submission_id: submissionId,
        question_id: answer.question_id,
        student_answer: answer.student_answer
      }, { onConflict: 'submission_id, question_id' })
  }
}

export async function getServerTime() {
  // Server clock for exam timing — immune to student device-clock tampering.
  // Round-trip adds a small bias in the student's favour; acceptable tolerance.
  return Date.now()
}

export async function getStudentExamResult(examId: string) {
  const supabase = await getSupabase()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  const { data: student } = await supabase
    .from('students')
    .select('id, full_name, admission_number, class:classes(name)')
    .eq('user_id', user.user.id)
    .single()

  if (!student) throw new Error('Not a student')

  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select('*, subject:subjects(name)')
    .eq('id', examId)
    .single()

  if (examError) throw examError

  const { data: submission } = await supabase
    .from('exam_submissions')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', student.id)
    .maybeSingle()

  if (!submission) return { exam, student, submission: null, answers: [] }

  const { data: answers } = await supabase
    .from('exam_answers')
    .select('*, question:exam_questions(*)')
    .eq('submission_id', submission.id)

  const ordered = (answers || []).sort(
    (a: any, b: any) => (a.question?.order_index ?? 0) - (b.question?.order_index ?? 0)
  )

  return { exam, student, submission, answers: ordered }
}

export async function getTeacherOrThrow(supabase: any) {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', user.user.id)
    .single()
  if (!teacher) throw new Error('Not a teacher')
  return teacher
}

export async function getExamForEdit(examId: string) {
  const supabase = await getSupabase()
  const teacher = await getTeacherOrThrow(supabase)
  const data = await getExamWithQuestions(examId)
  if ((data as any).teacher_id !== teacher.id) throw new Error('Not your paper')
  return data
}

export async function checkExamLocked(examId: string) {
  const supabase = await getSupabase()
  const { count } = await supabase
    .from('exam_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('exam_id', examId)
  if ((count || 0) > 0) {
    return { locked: true as const, reason: `${count} student submission(s) exist — paper is frozen to protect marked work.` }
  }
  // Live timetable window with zero submissions yet: still frozen mid-window.
  try {
    const { data: links } = await supabase
      .from('exam_event_subjects')
      .select('id')
      .eq('exam_id', examId)
    const ids = ((links || []) as any[]).map(l => l.id)
    if (ids.length > 0) {
      const nowIso = new Date().toISOString()
      const { data: live } = await supabase
        .from('exam_timetable')
        .select('id')
        .in('event_subject_id', ids)
        .lte('starts_at', nowIso)
        .gte('ends_at', nowIso)
        .limit(1)
      if (live && live.length > 0) {
        return { locked: true as const, reason: 'A live exam window is open — paper is frozen until it closes.' }
      }
    }
  } catch { /* best-effort */ }
  return { locked: false as const, reason: '' }
}

export async function updateExam(examId: string, data: {
  title: string
  description?: string
  subject_id?: string
  duration_minutes: number
  pass_mark?: number
  random_order: boolean
  status: 'draft' | 'published'
}) {
  const supabase = await getSupabase()
  const teacher = await getTeacherOrThrow(supabase)
  const lock = await checkExamLocked(examId)
  if (lock.locked) throw new Error(lock.reason)
  const { error } = await supabase
    .from('exams')
    .update({
      title: data.title,
      description: data.description,
      subject_id: data.subject_id,
      duration_minutes: data.duration_minutes,
      pass_mark: data.pass_mark,
      random_order: data.random_order,
      status: data.status,
    })
    .eq('id', examId)
    .eq('teacher_id', teacher.id)
  if (error) throw error
}

export async function updateExamQuestion(questionId: string, questionData: any) {
  const supabase = await getSupabase()
  await getTeacherOrThrow(supabase)
  const { data, error } = await supabase
    .from('exam_questions')
    .update(questionData)
    .eq('id', questionId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExamQuestion(questionId: string) {
  const supabase = await getSupabase()
  await getTeacherOrThrow(supabase)
  const { error } = await supabase.from('exam_questions').delete().eq('id', questionId)
  if (error) throw error
}

export async function getExamSubmissions(examId: string) {
  const supabase = await getSupabase()
  
  const { data, error } = await supabase
    .from('exam_submissions')
    .select(`
      *,
      student:students(id, user_id),
      integrity_logs:exam_integrity_logs(id, event_type, timestamp)
    `)
    .eq('exam_id', examId)
    .order('submit_time', { ascending: false })

  if (error) throw error
  return data
}

export async function getSubmissionDetails(submissionId: string) {
  const supabase = await getSupabase()
  
  const { data: submission, error: subError } = await supabase
    .from('exam_submissions')
    .select(`
      *,
      exam:exams(*, subject:subjects(name)),
      student:students(id, user_id),
      integrity_logs:exam_integrity_logs(*)
    `)
    .eq('id', submissionId)
    .single()

  if (subError) throw subError

  const { data: answers, error: ansError } = await supabase
    .from('exam_answers')
    .select(`
      *,
      question:exam_questions(*)
    `)
    .eq('submission_id', submissionId)
    .order('question(order_index)', { ascending: true })

  if (ansError) throw ansError

  return { submission, answers }
}

export async function saveQuestionMarking(answerId: string, data: { marks_awarded: number, teacher_comments?: string, teacher_annotations?: any }) {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('exam_answers')
    .update({
      marks_awarded: data.marks_awarded,
      teacher_comments: data.teacher_comments,
      teacher_annotations: data.teacher_annotations,
    })
    .eq('id', answerId)
    
  if (error) throw error
}

export async function finalizeSubmission(submissionId: string, manualScore: number) {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('exam_submissions')
    .update({
      status: 'marked',
      manual_score: manualScore
    })
    .eq('id', submissionId)
    
  if (error) throw error
}
