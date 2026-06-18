'use server'

import { createClient } from '@/lib/supabase/server'
import { callGroqChat, hasGroqToken } from '@/lib/groq-chat'
import { callGeminiChat, hasGeminiToken } from '@/lib/gemini-chat'
import { callHuggingFaceChat, hasHuggingFaceToken } from '@/lib/huggingface-chat'

function cleanJsonResponse(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    return match[0]
  }
  return text
}

export async function generateBrainGymQuestions(studentId?: string) {
  let curriculumContext = 'Kenyan CBC / 8-4-4'
  
  try {
    if (studentId) {
      const supabase = await createClient()
      const { data: student } = await supabase.from('students').select('curriculum_id, class_id').eq('id', studentId).single()
      if (student) {
        let currName = ''
        let className = ''
        if (student.curriculum_id) {
          const { data: c } = await supabase.from('curriculums').select('name').eq('id', student.curriculum_id).single()
          if (c) currName = c.name
        }
        if (student.class_id) {
          const { data: cls } = await supabase.from('classes').select('name').eq('id', student.class_id).single()
          if (cls) className = cls.name
        }
        if (currName || className) {
          curriculumContext = `${className} (${currName})`
        }
      }
    }

    const providers: { name: string; call: () => Promise<{ content: string; provider: string; model: string }> }[] = []

    if (hasGroqToken()) {
      providers.push({
        name: 'Groq',
        call: () => callGroqChat([
          { role: 'system', content: 'You are an expert Kenyan teacher for ' + curriculumContext + '. Generate 5 multiple choice trivia questions specifically tailored to this class and curriculum level. Do NOT generate generic questions. Return ONLY strict JSON with no markdown wrappers or conversational text. Format: {"questions": [{"id":"q1","question":"...","options":["A","B","C","D"],"correctAnswer":"A","explanation":"..."}]} ' },
        ], { temperature: 0.7, maxTokens: 1000 }),
      })
    }

    if (hasGeminiToken()) {
      providers.push({
        name: 'Gemini',
        call: () => callGeminiChat([
          { role: 'system', content: 'You are an expert Kenyan teacher for ' + curriculumContext + '. Generate 5 multiple choice trivia questions specifically tailored to this class and curriculum level. Do NOT generate generic questions. Return ONLY strict JSON with no markdown wrappers or conversational text. Format: {"questions": [{"id":"q1","question":"...","options":["A","B","C","D"],"correctAnswer":"A","explanation":"..."}]} ' },
        ], { temperature: 0.7, maxTokens: 1000 }),
      })
    }

    if (hasHuggingFaceToken()) {
      providers.push({
        name: 'Hugging Face',
        call: () => callHuggingFaceChat([
          { role: 'system', content: 'You are an expert Kenyan teacher for ' + curriculumContext + '. Generate 5 multiple choice trivia questions specifically tailored to this class and curriculum level. Do NOT generate generic questions. Return ONLY strict JSON with no markdown wrappers or conversational text. Format: {"questions": [{"id":"q1","question":"...","options":["A","B","C","D"],"correctAnswer":"A","explanation":"..."}]} ' },
        ], { temperature: 0.7, maxTokens: 1000 }),
      })
    }

    if (providers.length === 0) {
      throw new Error('No AI providers configured')
    }

    for (const provider of providers) {
      try {
        const response = await provider.call()
        const parsed = JSON.parse(cleanJsonResponse(response.content))
        if (parsed.questions && parsed.questions.length > 0) {
          return parsed.questions
        }
      } catch (error: any) {
        console.error(`[BrainGym] ${provider.name} failed:`, error.message)
      }
    }
    
    throw new Error('Failed to parse AI response or all providers failed')
  } catch (error) {
    console.error('generateBrainGymQuestions error:', error)
    // Fallback static questions so the feature always works
    return [
      { id: "s1", question: "What is the capital city of Kenya?", options: ["Mombasa", "Nairobi", "Kisumu", "Nakuru"], correctAnswer: "Nairobi", explanation: "Nairobi is the capital and largest city of Kenya." },
      { id: "s2", question: "Which is the longest river in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correctAnswer: "Nile", explanation: "The Nile River is widely considered the longest river in the world." },
      { id: "s3", question: "What is the chemical symbol for water?", options: ["H2O", "CO2", "O2", "NaCl"], correctAnswer: "H2O", explanation: "Water is composed of two hydrogen atoms and one oxygen atom." },
      { id: "s4", question: "How many counties are in Kenya?", options: ["47", "42", "50", "35"], correctAnswer: "47", explanation: "The Constitution of Kenya (2010) created 47 counties." },
      { id: "s5", question: "Which organ pumps blood in the human body?", options: ["Brain", "Lungs", "Heart", "Liver"], correctAnswer: "Heart", explanation: "The heart is the primary organ of the circulatory system that pumps blood." }
    ]
  }
}

export async function submitBrainGymScore(studentId: string, score: number) {
  const supabase = await createClient()
  
  // 1. Get current streak
  const { data: streakData } = await supabase
    .from('brain_gym_streaks')
    .select('*')
    .eq('student_id', studentId)
    .single()

  const today = new Date().toISOString().split('T')[0]
  
  if (!streakData) {
    // First time playing
    await supabase.from('brain_gym_streaks').insert({
      student_id: studentId,
      current_streak: 1,
      highest_streak: 1,
      last_played_date: today
    })
    return { streak: 1, isNewHighest: true }
  }

  // Already played today?
  if (streakData.last_played_date === today) {
    return { streak: streakData.current_streak, isNewHighest: false }
  }

  // Did they play yesterday?
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const isContinuous = streakData.last_played_date === yesterday

  const newStreak = isContinuous ? streakData.current_streak + 1 : 1
  const newHighest = Math.max(newStreak, streakData.highest_streak)

  await supabase
    .from('brain_gym_streaks')
    .update({
      current_streak: newStreak,
      highest_streak: newHighest,
      last_played_date: today
    })
    .eq('student_id', studentId)

  // Award XP for completing Brain Gym (e.g., 50 XP)
  // Let's get current student XP and add to it
  const { data: student } = await supabase.from('students').select('xp').eq('id', studentId).single()
  if (student) {
    await supabase.from('students').update({ xp: (student.xp || 0) + 50 }).eq('id', studentId)
  }

  return { streak: newStreak, isNewHighest: newStreak > streakData.highest_streak }
}

export async function getBrainGymStreak(studentId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('brain_gym_streaks')
    .select('*')
    .eq('student_id', studentId)
    .single()
    
  return data
}
