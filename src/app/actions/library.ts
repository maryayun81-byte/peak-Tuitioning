'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * finishBookAction
 * Marks a book as finished, saves the final reflection,
 * and awards base + bonus XP.
 */
export async function finishBookAction(studentId: string, bookId: string, reflection: string) {
  const supabase = await createClient()

  // 1. Get current progress status
  const { data: progress } = await supabase
    .from('library_student_progress')
    .select('*')
    .eq('student_id', studentId)
    .eq('book_id', bookId)
    .single()

  if (progress?.is_finished) {
    return { success: false, error: 'You have already finished this book and claimed your reward!' }
  }

  // 2. Simple AI Mock Analysis Logic (In a real app, this would call OpenAI/Gemini)
  // Logic: Longer, more structured reflections get more bonus XP.
  let bonusXP = 0
  let feedback = "Excellent job finishing this novel! Reading is the foundation of a great mind."

  if (reflection.length > 500) {
    bonusXP = 50
    feedback = "Your reflection is profound! You've successfully dissected the core narrative and connected it to real-world growth. This level of analysis is exactly what a Peak Scholar achieves! 🚀✨"
  } else if (reflection.length > 200) {
    bonusXP = 25
    feedback = "Excellent insights. You've captured the essential lessons of this work. Consistent reflection like this is key to mastering your mindset. Keep pushing! 🔥"
  } else {
    feedback = "Good start on your journaling! Try to go deeper next time to unlock even more bonus XP and insights. You've got this! 📚"
  }

  const baseXP = 200
  const totalAward = baseXP + bonusXP

  // 3. Update Progress Record
  const { error: progressError } = await supabase
    .from('library_student_progress')
    .update({
      status: 'finished',
      is_finished: true,
      reflection_text: reflection,
      ai_feedback: feedback,
      bonus_xp_awarded: bonusXP,
      finished_at: new Date().toISOString(),
      progress_percent: 100
    })
    .eq('student_id', studentId)
    .eq('book_id', bookId)

  if (progressError) return { success: false, error: progressError.message }

  // 4. Award XP to Student
  const { data: student } = await supabase.from('students').select('xp').eq('id', studentId).single()
  const currentXP = student?.xp || 0
  
  const { error: xpError } = await supabase
    .from('students')
    .update({ xp: currentXP + totalAward })
    .eq('id', studentId)

  if (xpError) return { success: false, error: xpError.message }

  // 5. Send Notification
  await supabase.from('intel').insert({
    profile_id: (await supabase.from('students').select('user_id').eq('id', studentId).single()).data?.user_id,
    title: 'Bibliophile Reward! 📚',
    message: `You earned ${totalAward} XP for finishing a book! AI Feedback: ${feedback}`,
    type: 'success',
    data: { book_id: bookId, bonus_xp: bonusXP }
  })

  revalidatePath('/student/library')
  return { success: true, totalAward, bonusXP, feedback }
}

/**
 * updateReadingProgress
 * Debounced sync of current reading position.
 */
export async function updateReadingProgress(studentId: string, bookId: string, page: number, percent: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('library_student_progress')
    .update({
      last_page: page,
      last_position_percent: percent,
      progress_percent: percent // Update overall progress too
    })
    .eq('student_id', studentId)
    .eq('book_id', bookId)

  if (error) {
    console.error('[Library] Progress sync error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
