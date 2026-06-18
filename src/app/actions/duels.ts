'use server'

import { createClient } from '@/lib/supabase/server'
import { generateBrainGymQuestions } from './brainGym'

export async function createDuel(studentId: string, classId?: string) {
  const supabase = await createClient()

  // 1. Generate 5 random questions
  // For the demo, we reuse the Brain Gym AI generator, but we don't care about streaks
  const { questions } = await generateBrainGymQuestions(studentId)

  // 2. Create the duel
  const { data: duel, error: dError } = await supabase
    .from('classroom_duels')
    .insert({ class_id: classId, status: 'waiting', questions })
    .select()
    .single()
  
  if (dError) throw dError

  // 3. Join the creator
  await supabase
    .from('duel_participants')
    .insert({ duel_id: duel.id, student_id: studentId })

  return duel
}

export async function getActiveDuels(classId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('classroom_duels')
    .select('*, participants:duel_participants(*, student:students(full_name, avatar_url))')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
  
  if (classId) {
    query = query.eq('class_id', classId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function joinDuel(duelId: string, studentId: string) {
  const supabase = await createClient()
  
  // Join
  const { error } = await supabase
    .from('duel_participants')
    .insert({ duel_id: duelId, student_id: studentId })
  
  if (error) throw error

  // If 2 participants exist, start the duel
  const { count } = await supabase
    .from('duel_participants')
    .select('*', { count: 'exact', head: true })
    .eq('duel_id', duelId)

  if (count && count >= 2) {
    await supabase.from('classroom_duels').update({ status: 'active' }).eq('id', duelId)
  }

  return true
}

export async function submitDuelAnswer(duelId: string, studentId: string, isCorrect: boolean) {
  const supabase = await createClient()
  if (isCorrect) {
    // Increment score by 100
    // Supabase RPC or direct fetch+update
    const { data: participant } = await supabase
      .from('duel_participants')
      .select('score')
      .eq('duel_id', duelId)
      .eq('student_id', studentId)
      .single()

    if (participant) {
      await supabase
        .from('duel_participants')
        .update({ score: participant.score + 100 })
        .eq('duel_id', duelId)
        .eq('student_id', studentId)
    }
  }
  return true
}

export async function advanceDuelQuestion(duelId: string, currentIndex: string | number) {
  const supabase = await createClient()
  const { data: duel } = await supabase.from('classroom_duels').select('current_question_index, questions').eq('id', duelId).single()
  
  if (!duel) return

  // Prevent race conditions where multiple clients try to advance it
  if (duel.current_question_index.toString() !== currentIndex.toString()) return

  if (duel.current_question_index >= duel.questions.length - 1) {
    // End of duel
    await supabase.from('classroom_duels').update({ status: 'completed' }).eq('id', duelId)
    await supabase.rpc('record_duel_results', { p_duel_id: duelId })
  } else {
    // Next question
    await supabase.from('classroom_duels').update({ current_question_index: duel.current_question_index + 1 }).eq('id', duelId)
  }
}
