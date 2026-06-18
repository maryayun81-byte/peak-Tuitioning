'use server'

import { createClient } from '@/lib/supabase/server'
import { callGroqChat, hasGroqToken } from '@/lib/groq-chat'
import { callGeminiChat, hasGeminiToken } from '@/lib/gemini-chat'

export async function createExamPlanner(studentId: string, examName: string, examDate: string, targetScore: string, subjects: string[]) {
  const supabase = await createClient()

  // 1. Create the planner
  const { data: planner, error: pError } = await supabase
    .from('student_exam_planners')
    .insert({ student_id: studentId, exam_name: examName, exam_date: examDate, target_score: targetScore })
    .select()
    .single()
  
  if (pError) throw pError

  // 2. AI generation of a day-by-day plan
  // Calculate days remaining
  const today = new Date()
  const examD = new Date(examDate)
  const diffTime = Math.abs(examD.getTime() - today.getTime())
  let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays > 30) diffDays = 30 // Cap at 30 days for plan generation

  const prompt = `Generate a ${diffDays}-day study plan for an exam named "${examName}" covering subjects: ${subjects.join(', ')}. 
Return strict JSON format: 
{ "days": [ { "day_offset": 0, "tasks": [{"id": "t1", "title": "...", "subject": "Math"}] }, ... ] }.
day_offset 0 is today, 1 is tomorrow, etc. Keep tasks concise, actionable, and evenly spread out.`

  let generatedDays = []
  
  try {
    let aiResponse = null
    if (hasGroqToken()) {
      const res = await callGroqChat([{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 2000, responseFormat: { type: 'json_object' } })
      aiResponse = JSON.parse(res.content)
    } else if (hasGeminiToken()) {
      const res = await callGeminiChat([{ role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 2000, responseFormat: { type: 'json_object' } })
      aiResponse = JSON.parse(res.content)
    }

    if (aiResponse && aiResponse.days) {
      generatedDays = aiResponse.days
    } else {
      throw new Error('No valid AI response')
    }
  } catch (err) {
    console.error('AI Plan generation failed, using fallback:', err)
    // Fallback simple schedule
    generatedDays = Array.from({ length: diffDays }).map((_, i) => ({
      day_offset: i,
      tasks: subjects.map((sub, j) => ({ id: `t${i}_${j}`, title: `Review ${sub} topic ${i+1}`, subject: sub }))
    }))
  }

  // 3. Insert study plan days
  const inserts = generatedDays.map((d: any) => {
    const sDate = new Date()
    sDate.setDate(sDate.getDate() + d.day_offset)
    return {
      planner_id: planner.id,
      study_date: sDate.toISOString().split('T')[0],
      tasks: d.tasks
    }
  })

  await supabase.from('study_plan_days').insert(inserts)

  return planner
}

export async function getStudentPlanners(studentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('student_exam_planners')
    .select('*, days:study_plan_days(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  
  if (error) throw error

  // Sort days
  data.forEach((p: any) => {
    p.days.sort((a: any, b: any) => new Date(a.study_date).getTime() - new Date(b.study_date).getTime())
  })

  return data
}

export async function togglePlanDayComplete(dayId: string, isCompleted: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('study_plan_days')
    .update({ is_completed: isCompleted, xp_awarded: isCompleted ? 20 : 0 })
    .eq('id', dayId)
  
  if (error) throw error
  
  // If we wanted to, we could also award XP to the student row here.
  return true
}
