'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Sends a motivational or reminder notification to a student.
 */
export async function nudgeStudent(studentId: string, type: 'assignment' | 'quiz' | 'motivation', message?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Get student info to check authorization (teacher must be assigned to student's class)
  const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', user.id).single()
  if (!teacher) return { error: 'Teacher record not found' }

  const { data: student } = await supabase.from('students').select('class_id, tuition_center_id, user_id, full_name').eq('id', studentId).single()
  if (!student || !student.user_id) return { error: 'Student user not found' }

  // Get all assignments for this teacher to verify access
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('class_id, tuition_center_id')
    .eq('teacher_id', teacher.id)

  const assignedClassIds = assignments?.map(a => a.class_id).filter(Boolean) || []
  const assignedCenterIds = assignments?.map(a => a.tuition_center_id).filter(Boolean) || []

  const isAssignedToClass = student.class_id && assignedClassIds.includes(student.class_id)
  const isAssignedToCenter = student.tuition_center_id && assignedCenterIds.includes(student.tuition_center_id)

  if (!isAssignedToClass && !isAssignedToCenter) {
    return { error: `Security Protocol: You are not authorized for this student (${student.full_name}). Required: Assignment to Class ${student.class_id} or Center ${student.tuition_center_id}.` }
  }

  const defaultMessages = {
    assignment: `Hey ${student.full_name.split(' ')[0]}, just a friendly nudge about your pending assignments. Let's get them to the Peak! 🏔️`,
    quiz: `Time to test your knowledge, ${student.full_name.split(' ')[0]}! You have some quizzes waiting for you. 🧠`,
    motivation: `Keep pushing, ${student.full_name.split(' ')[0]}! Your Peak Intelligence Coach and I are rooting for you.`
  }

  const { error } = await supabase.from('notifications').insert({
    user_id: student.user_id,
    title: type === 'motivation' ? 'Teacher Inspiration ✨' : 'Class Mission Update 📋',
    body: message || defaultMessages[type],
    type: 'intervention',
    data: { nudge_type: type, teacher_name: user.user_metadata?.full_name }
  })

  if (error) return { error: error.message }

  revalidatePath('/teacher')
  return { success: true }
}

/**
 * Generates an academic consistency report and sends it to the student's parent.
 */
export async function generateParentInsight(studentId: string) {
  const supabase = await createClient()
  const { data: { user: teacherUser } } = await supabase.auth.getUser()
  if (!teacherUser) return { error: 'Unauthorized' }

  const { data: student } = await supabase
    .from('students')
    .select('*, parent_id, parents(user_id)')
    .eq('id', studentId)
    .single()
  
  if (!student || !student.parent_id) return { error: 'Parent link not found for this student.' }

  // Get all assignments for this teacher to verify access
  const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', teacherUser.id).single()
  if (!teacher) return { error: 'Teacher record not found' }

  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('class_id, tuition_center_id')
    .eq('teacher_id', teacher.id)

  const assignedClassIds = assignments?.map(a => a.class_id).filter(Boolean) || []
  const assignedCenterIds = assignments?.map(a => a.tuition_center_id).filter(Boolean) || []

  const isAssignedToClass = student.class_id && assignedClassIds.includes(student.class_id)
  const isAssignedToCenter = student.tuition_center_id && assignedCenterIds.includes(student.tuition_center_id)

  if (!isAssignedToClass && !isAssignedToCenter) {
    return { error: `Security Protocol: Access denied for ${student.full_name}. Path restricted to assigned centers/classes.` }
  }

  // 1. Aggregate student performance
  const [submissions, quizzes] = await Promise.all([
    supabase.from('submissions').select('marks, status').eq('student_id', studentId).eq('status', 'submitted'),
    supabase.from('quiz_attempts').select('percentage').eq('student_id', studentId)
  ])

  const subCount = submissions.data?.length || 0
  const quizCount = quizzes.data?.length || 0
  const avgQuiz = (quizzes.data?.reduce((acc, q) => acc + q.percentage, 0) || 0) / (quizCount || 1)

  const message = `Academic Insight for ${student.full_name}: Your child has completed ${subCount} assignments and ${quizCount} quizzes this term. Current quiz average: ${Math.round(avgQuiz)}%. They are showing ${avgQuiz >= 70 ? 'strong consistency' : 'potential for growth'}. Keep encouraging them! 📈`

  // 2. Send notification to parent
  const parentUserId = (student.parents as any)?.user_id
  if (!parentUserId) return { error: 'Parent account not activated.' }

  const { error } = await supabase.from('notifications').insert({
    user_id: parentUserId,
    title: 'Class Teacher Insight 🎓',
    body: message,
    type: 'parent_insight',
    data: { student_id: studentId, teacher_name: teacherUser.user_metadata?.full_name }
  })

  if (error) return { error: error.message }
  return { success: true }
}
