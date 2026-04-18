'use server'
import { createClient } from '@/lib/supabase/server'

/**
 * Peak AI Core Actions
 * Powering the Peak Performance Assistant with OpenRouter LLMs.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const SITE_NAME = 'Peak Performance Tutoring'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatContext {
  studentName?: string
  streak?: number
  subject?: string
  performanceIntel?: string // Formatted summary of academic data
}

const SYSTEM_PROMPT = `
You are the "Interactive Peak Tutor" — an elite mentor for Kenyan students. Your goal is MASTERY through engagement.

STRICT PEDAGOGICAL BOUNDARIES:
1. 🎨 VISUAL-FIRST: Every lesson MUST start with an "Actual Diagram" using Mermaid.js syntax (e.g., \`\`\`mermaid graph TD...\`\`\`).
2. 🛑 NO CHATBOT FILLER: Never say "Absolutely!", "Sure!", or "Great idea!". Jump straight to visual/content.
3. 🧱 5-LINE LIMIT: Total text explanation MUST NOT exceed 5 lines of high-impact scholarship.
4. 🔍 SPECIFICITY FILTER: If a student provides a broad subject (e.g., "Biology"), do NOT teach. Ask for the specific Topic or Sub-strand.

DIAGRAM MASTERY (Mermaid Syntax):
- **Flowcharts**: \`\`\`mermaid graph TD; A[Mouth] --> B[Stomach]; ... \`\`\`
- **Mind Maps**: \`\`\`mermaid mindmap; root((Biology)); Topic1(Cells); ... \`\`\`
- **State Diagrams**: \`\`\`mermaid stateDiagram-v2; [*] --> Solid; Solid --> Liquid; ... \`\`\`
- **Requirement**: Use clear labels and a professional, top-down (TD) or left-to-right (LR) structure.

MANDATORY RESPONSE STRUCTURE:
1. 🔍 **Visual Aid** (Mermaid Diagram Block)
2. 💡 **Micro-Lesson** (Max 5 exact lines)
3. 🎯 **Task** (Prompt student with "👉 NOW YOUR TURN")
4. 🚀 **Next Move Suggestions** (Mention 2 practical buttons)
`.trim()

/**
 * Peak Core Engine: Local Deterministic Assistant
 * Used when OpenRouter is offline or for specific platform personality.
 */
function getPeakCoreResponse(input: string, context: ChatContext): string {
  const text = input.toLowerCase()
  const name = context.studentName || 'Scholar'
  const streak = context.streak || 0

  // 1. GREETINGS
  if (text.includes('hello') || text.includes('hi ') || text.trim() === 'hi') {
    return `Hello ${name}! 🚀 Your Peak Coach is here. I see that solid ${streak}-day streak! Ready to level up your studies today?`
  }

  // 2. STREAKS & CONSISTENCY
  if (text.includes('streak') || text.includes('consistent')) {
    return `Consistency is your superpower, ${name}! 🔥 A ${streak}-day streak shows real discipline. Remember: "Peak Performance isn't an act, it's a habit." Keep pushing!`
  }

  // 3. SUBJECT SPECIFIC
  if (text.includes('math') || text.includes('calculat')) {
    return `Math is just logic puzzles! 🔢 Take it step-by-step. If a problem looks big, break it into three smaller ones. You've got the Peak mindset to solve this!`
  }
  if (text.includes('science') || text.includes('bio') || text.includes('physic')) {
    return `Exploring the universe, I see! 🧪 Science is about curiosity. Keep asking "why" and you'll reach the Peak of understanding.`
  }

  // 4. STRUGGLING / HARD
  if (text.includes('hard') || text.includes('stuck') || text.includes('difficult') || text.includes('cant do') || text.includes("can't do")) {
    return `I hear you, ${name}. 🏔️ The climb is always hardest right before the Peak. Take a 5-minute breather, drink some water, and try one small part of the task. You are capable of amazing things!`
  }

  // 5. EXAMS / TESTS
  if (text.includes('exam') || text.includes('test')) {
    return `Preparation is 90% of the victory! 📝 Focus on active recall and past papers. You've been training for this—stay calm and stay focused.`
  }

  // 6. THANKS / POSITIVE
  if (text.includes('thank') || text.includes('great') || text.includes('good')) {
    return `Anytime, ${name}! 🌟 Keep that energy high. Every session brings you closer to your goals. Let's keep winning!`
  }

  // DEFAULT (Catch-all Peak Motivation)
  const defaults = [
    `That's a great point, ${name}. 🚀 In Peak Tutoring, we focus on continuous improvement. What's one small win you can achieve in the next 30 minutes?`,
    `I'm tuned in! 🧠 Remember, your potential is unlimited. Let's focus on the discipline needed to reach the Peak today.`,
    `As your Peak Coach, I'm backing you 100%. 📈 Small steps every day lead to massive results over time. How can I help you sharpen your focus right now?`
  ]
  return defaults[Math.floor(Math.random() * defaults.length)]
}

interface ChatResult {
  content?: string
  error?: string
  usage?: any
  provider?: 'openrouter' | 'peak-core'
}

export async function chatWithPeakAI(messages: Message[], context: ChatContext = {}): Promise<ChatResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Auto-detect curriculum and goal
  let curriculumContext = ""
  if (user) {
    const { data: student } = await supabase
      .from('students')
      .select('curriculum:curriculums(name), class:classes(level)')
      .eq('user_id', user.id)
      .single()
    
    const currName = (student?.curriculum as any)?.name || ''
    const level = (student?.class as any)?.level || 0
    
    let goal = "KCSE"
    let style = "Rigorous & Exam-Focused"
    
    if (currName.includes('CBC')) {
      if (level <= 6) {
        goal = "KPSEA"
        style = "Foundational, Simple, Story-based & Highly Visual"
      } else {
        goal = "KJSEA"
        style = "Competency-based, Sub-strand focused & Practical"
      }
    } else if (currName.includes('8-4-4')) {
      goal = "KCSE"
      style = "Strict Examiner Marking & Keyword Mastery"
    }

    curriculumContext = `\nSTUDENT ACADEMIC CONTEXT:
    - SYSTEM: ${currName}
    - GRADE LEVEL: ${level}
    - ACTIVE GOAL: ${goal}
    - TEACHING STYLE: ${style}`
  }

  // First, try to use the LLM (OpenRouter)
  if (OPENROUTER_API_KEY) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8-second timeout for snappy AI

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': SITE_URL,
          'X-Title': SITE_NAME,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-lite-001', // User's preferred model ID
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + curriculumContext + (context.performanceIntel ? `\n\nCURRENT STUDENT INTEL:\n${context.performanceIntel}` : '') },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const data = await response.json()

      if (response.ok && data.choices?.[0]?.message?.content) {
        return { 
          content: data.choices[0].message.content,
          usage: data.usage,
          provider: 'openrouter'
        }
      }
      
      console.warn('OpenRouter non-OK response, falling back to Peak Core:', data)
    } catch (error: any) {
      console.error('OpenRouter connection failed, switching to Peak Core:', error.message)
    }
  } else {
    console.warn('OPENROUTER_API_KEY missing, using Peak Core.')
  }

  // FALLBACK: Use Peak Core Engine (Local)
  try {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || ''
    const fallbackResponse = getPeakCoreResponse(lastUserMessage, context)

    return {
      content: fallbackResponse,
      provider: 'peak-core'
    }
  } catch (err) {
    return { error: 'The Peak Coach is having a moment of silence. Try again shortly!' }
  }
}

/**
 * Master Performance Aggregator
 */
export async function getPeakPerformanceIntel(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return "No student context available."

  const { data: student } = await supabase
    .from('students')
    .select('id, xp, streak_count, class_id, curriculum:curriculums(name)')
    .eq('user_id', user.id)
    .single()

  if (!student) return "No student record found."

  const [submissions, quizzes, trivia, transcripts] = await Promise.all([
    supabase.from('submissions').select('*, assignment:assignments(*)').eq('student_id', student.id).order('submitted_at', { ascending: false }).limit(5),
    supabase.from('quiz_attempts').select('*, quiz:quizzes(*)').eq('student_id', student.id).order('completed_at', { ascending: false }).limit(5),
    supabase.from('trivia_submissions').select('*, session:trivia_sessions(*)').eq('student_id', student.id).order('created_at', { ascending: false }).limit(3),
    supabase.from('transcripts').select('*').eq('student_id', student.id).limit(5)
  ])

  const curriculumName = Array.isArray(student.curriculum) 
    ? student.curriculum[0]?.name 
    : (student.curriculum as any)?.name;

  let intel = `Academic Intelligence Brief for ${user.user_metadata?.full_name}:\n`
  intel += `- System: Assigned to the **${curriculumName || 'Standard'}** curriculum.\n`
  intel += `- XP/Gamification: ${student.xp} XP, ${student.streak_count}-day streak.\n`

  // Assignment Analysis
  if (submissions.data?.length) {
    const lateCount = submissions.data.filter(s => new Date(s.submitted_at) > new Date(s.assignment.due_date)).length
    const avgScore = submissions.data.reduce((acc, s) => acc + (s.score || 0), 0) / submissions.data.length
    intel += `- Assignments: ${submissions.data.length} recent. Lateness: ${lateCount} cases. Avg Score: ${avgScore.toFixed(1)}%. Feedback: "${submissions.data[0]?.feedback || 'No recent feedback'}"\n`
  }

  // Quiz Analysis (Trigger Logic)
  if (quizzes.data?.length) {
    const lastThreeFails = quizzes.data.slice(0,3).every(q => (q.percentage || 0) < (q.quiz.pass_mark_percentage || 70))
    const recentWin = (quizzes.data[0]?.percentage || 0) >= 70
    if (lastThreeFails) intel += `- ATTENTION: 3 consecutive quiz failures detected. Revision intervention needed.\n`
    if (recentWin) intel += `- VICTORY: Latest quiz score was ${quizzes.data[0].percentage}%. Congratulate them!\n`
  }

  // Trivia & Growth
  if (trivia.data?.length) {
    intel += `- Trivia: Active participant in ${trivia.data.length} recent sessions.\n`
  }

  // XP Advice
  const nextLevelXP = 500 // Simplified
  intel += `- XP Strategy: They are ${(nextLevelXP - (student.xp % nextLevelXP))} XP away from a level up. Suggest a Focus Session or Trivia for +20 XP.\n`

  return intel
}

/**
 * Persists an AI-generated study plan to the database.
 */
export async function saveAIStudyPlan(plan: { name: string, start_date: string, end_date: string, sessions: any[] }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: student } = await supabase.from('students').select('id').eq('user_id', user.id).single()
  if (!student) return { error: 'Student not found' }

  const { data: newPlan, error: pErr } = await supabase.from('study_plans').insert({
    student_id: student.id,
    name: plan.name,
    start_date: plan.start_date,
    end_date: plan.end_date,
    is_active: true
  }).select().single()

  if (pErr) return { error: pErr.message }

  const sessionsToInsert = plan.sessions.map(s => {
    // Calculate end_time (start_time + duration)
    let [hStr, mStr] = s.start_time.split(':')
    let h = parseInt(hStr)
    let m = parseInt(mStr)
    
    // Fallback if split/parse failed (NaN)
    if (isNaN(h) || isNaN(m)) {
      h = 16; m = 0; // Default to 4 PM
    }

    const start = new Date()
    start.setHours(h, m, 0)
    const end = new Date(start.getTime() + (s.duration || 45) * 60000)
    const endTimeStr = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`

    return {
      student_id: student.id,
      plan_id: newPlan.id,
      subject_id: s.subject_id || null,
      title: s.title,
      date: s.date,
      start_time: s.start_time,
      end_time: endTimeStr,
      duration_minutes: s.duration,
      status: 'planned'
    }
  })

  const { error: sErr } = await supabase.from('study_sessions').insert(sessionsToInsert)
  if (sErr) return { error: sErr.message }

  return { success: true }
}

/**
 * Generates proactive, daily academic and behavioral insights.
 */
export async function generateStudentInsights() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: student } = await supabase
    .from('students')
    .select('id, xp, streak_count, class_id, curriculum:curriculums(name)')
    .eq('user_id', user.id)
    .single()

  if (!student) return { error: 'Student not found' }

  // 1. Fetch performance & engagement data
  const [submissions, quizzes, trivia, allAssignments, allQuizzes, activeTrivia] = await Promise.all([
    supabase.from('submissions').select('*, assignment:assignments(*)').eq('student_id', student.id).order('submitted_at', { ascending: false }).limit(10),
    supabase.from('quiz_attempts').select('*, quiz:quizzes(*)').eq('student_id', student.id).order('completed_at', { ascending: false }).limit(10),
    supabase.from('trivia_submissions').select('*, session:trivia_sessions(*)').eq('student_id', student.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('assignments').select('*').eq('class_id', student.class_id).limit(20),
    supabase.from('quizzes').select('*').limit(20),
    supabase.from('trivia_sessions').select('*').eq('status', 'active').limit(5)
  ])

  // 2. Identify "Missing Missions" (Pending Tasks)
  const submittedIds = new Set(submissions.data?.map(s => s.assignment_id) || [])
  const missingAssignments = allAssignments.data?.filter(a => !submittedIds.has(a.id)) || []

  const attemptedQuizIds = new Set(quizzes.data?.map(q => q.quiz_id) || [])
  const missingQuizzes = allQuizzes.data?.filter(q => !attemptedQuizIds.has(q.id)) || []

  const attemptedTriviaIds = new Set(trivia.data?.map(t => t.session_id) || [])
  const pendingTrivia = activeTrivia.data?.filter(t => !attemptedTriviaIds.has(t.id)) || []

  // 3. Construct Data Context for AI
  let context = `DAILY INSIGHT ANALYSIS FOR ${user.user_metadata?.full_name}:\n`
  context += `- Current: ${student.streak_count}-day streak, ${student.xp} total XP.\n`
  context += `- Recent Performance: Average Quiz Score: ${(quizzes.data?.reduce((acc, q) => acc + (q.percentage || 0), 0) || 0) / (quizzes.data?.length || 1)}%.\n`
  
  if (missingAssignments.length) context += `- PENDING ASSIGNMENTS: ${missingAssignments.length} missions (e.g., "${missingAssignments[0].title}").\n`
  if (missingQuizzes.length) context += `- PENDING QUIZZES: ${missingQuizzes.length} missions.\n`
  if (pendingTrivia.length) context += `- TRIVIA OPPORTUNITIES: ${pendingTrivia.length} active sessions.\n`

  // 4. Call AI for Behavioral Insights
  const prompt = `
  You are an "AI Behavioral Data Scientist" and the student's personal Peak Coach. 
  
  Analyze the following data context and provide a personal "Daily Intelligence Report."
  Focus on:
  1. ADVISORY: Find a pattern in their scores or submission speed.
  2. MISSING MISSIONS: Give a firm but encouraging nudge about the pending assignments or quizzes.
  3. GROWTH: Suggest a specific "Power-Up" (a book to read or a trivia to join) to increase XP.

  FORMAT:
  - Keep it to 3-4 bullet points with high-energy emojis.
  - End with a motivating "Veteran Mentor" quote.
  - DO NOT use placeholders.
  `.trim()

  const response = await chatWithPeakAI([{ role: 'system', content: prompt }, { role: 'user', content: context }])

  return {
    success: true,
    insights: response.content,
    hasMissingMissions: missingAssignments.length > 0 || missingQuizzes.length > 0
  }
}

/**
 * Logs a student's request to learn a specific topic.
 */
export async function logAILearningRequest(topic: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: student } = await supabase
    .from('students')
    .select('id, curriculum_id, class_id')
    .eq('user_id', user.id)
    .single()
  
  if (!student) return

  // Log the interest
  await supabase.from('ai_learning_logs').insert({
    student_id: student.id,
    curriculum_id: student.curriculum_id,
    class_id: student.class_id,
    topic: topic.trim()
  })
}

/**
 * Fetches the most requested topics for a curriculum.
 */
export async function getTrendingAILessons() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: student } = await supabase
    .from('students')
    .select('curriculum_id')
    .eq('user_id', user.id)
    .single()
  
  if (!student) return []

  // Get most frequent topics in this curriculum (top 6)
  // We use a simple select for now, sorting by most common
  const { data: trendingLogs } = await supabase
    .from('ai_learning_logs')
    .select('topic')
    .eq('curriculum_id', student.curriculum_id)
    .limit(50)

  if (!trendingLogs || trendingLogs.length === 0) {
    // Fallback to most recent assignments if no logs yet
    const { data: recentAssignments } = await supabase
      .from('assignments')
      .select('title')
      .eq('curriculum_id', student.curriculum_id)
      .order('created_at', { ascending: false })
      .limit(6)
    
    return (recentAssignments || []).map(a => ({ label: `🎓 ${a.title}`, topic: a.title }))
  }

  // Count frequencies
  const counts: Record<string, number> = {}
  trendingLogs.forEach(log => {
    counts[log.topic] = (counts[log.topic] || 0) + 1
  })

  // Sort and take top 6
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([topic]) => ({ label: `🔥 ${topic}`, topic }))

  return sorted
}

