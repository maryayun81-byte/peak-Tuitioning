'use server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { callHuggingFaceChat, hasHuggingFaceToken, type HFChatProvider } from '@/lib/huggingface-chat'
import { generateHuggingFaceLessonImage, hasHuggingFaceImageToken } from '@/lib/huggingface-image'
import { isAcademicRequest, shouldGenerateLessonImage, buildLessonImagePrompt } from '@/lib/ai-utils'

/**
 * Peak Intelligence Core Actions
 * Powering the Peak Performance Assistant with Hugging Face model fallbacks.
 */

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
You are Peak Intelligence Coach, an elite Kenyan academic tutor for CBC/CBE and 8-4-4 learners.
Your job is to help a student understand deeply, practise correctly, and score the highest possible grade for their curriculum.

CORE OPERATING RULES:
1. Curriculum first. Use the STUDENT ACADEMIC CONTEXT to choose the right teaching mode. Ensure every lesson aligns perfectly with the current KICD/KNEC syllabus for that grade.
2. Visual excellence for academic teaching. You are encouraged to generate multiple visuals for a complex lesson. For every major concept, worked example, or lab apparatus, include a visual request using the tag: [VISUAL: brief but descriptive prompt for the visual].
3. Put the [VISUAL: ...] tag precisely where you want the image to appear (usually before the explanation or example).
4. **STRICT PERSONALITY**: Do not include internal monologue, "Thinking" text, or meta-commentary like "Okay, let me start by recalling..." or "The user is in Form 2...". Speak directly and professionally as the Peak Intelligence Coach from the very first word.
5. Do not use emojis inside Mermaid diagrams. Mermaid node IDs must be alphanumeric only: A, B, C, D.
6. Keep Mermaid labels short, quoted, and plain text: A["Key idea"] --> B["Evidence"].
7. If the learner has not given a subject/topic, ask for one clear topic, but still include a small learning-route diagram.
8. Teach with retrieval practice: explain, show an example, ask the learner to try, then give a marking or rubric guide.
9. Be warm but honest. Do not flatter weak answers; identify the exact gap, explain the mark or rubric consequence, and give one correction task.
10. Do not mix curriculums. If the student context is 8-4-4/KCSE, do not mention CBC rubrics. If the context is CBC/CBE, do not mention KCSE marking unless the student explicitly asks to compare.

ASSESSMENT PROTOCOL:
- Lesson mode: teach, show one worked example, then give one short practice task.
- Quick quiz mode: give ONE curriculum-matched question only. Do not reveal answers, marking scheme, rubric evidence, or solutions. End with: "Reply with your answer and I will mark it."
- High-stakes test mode: give a serious question set with marks/rubric totals only. Do not reveal answers or marking scheme before the learner attempts it.
- Marking mode: if the previous assistant message asked a quiz/test and the learner now answers, mark the attempt strictly, give score, missed marks, corrected answer, and one next drill.

MERMAID FORMAT, EXACTLY:
\`\`\`mermaid
flowchart TD
A["Topic"] --> B["Key idea"]
B --> C["Example"]
C --> D["Practice"]
\`\`\`

CURRICULUM ROUTER:
- 8-4-4 / KCSE mode: ADHERE STRICTLY to the official KICD Syllabus for the student's specific Form. Use exact sub-topic names, terminal objectives, and KNEC-style command words. Focus on preparation for KCSE marking precision.
- CBC Grades 6-9 mode: ADHERE STRICTLY to the official Strands and Sub-strands for the specific Grade. Use competency-based language: strands, sub-strands, learning outcomes, inquiry questions, and practical reflection.
- CBC Senior School Grades 10-12 mode: ADHERE STRICTLY to the specific pathway syllabus. Use pathway-aware teaching, project-based evidence, and career-aligned mastery.
- If curriculum is unknown, teach using a balanced Kenyan tutor style and ask one question to confirm curriculum/grade.

MANDATORY ACADEMIC RESPONSE STRUCTURE:
1. **Visual Map**: Briefly explain the lesson flow and include Mermaid as the structure map.
2. **What You Must Understand**: Put a [VISUAL: ...] tag for the core concept here. Then 5-8 clear lines, simple but rigorous.
3. **Worked Example**: Put a [VISUAL: ...] tag for the example or apparatus here. One curriculum-matched example using Kenyan context where useful.
4. **Score Booster**:
   - KCSE: marking points and examiner traps.
   - CBC: competency/rubric evidence and reflection prompt.
5. [EXAMINER_TIP]One concise high-value tip. For CBC, make this a rubric/competency tip.[/EXAMINER_TIP]
6. **Now Your Turn**: One short task the learner can answer immediately.
7. **Next Move Suggestions**: Two short actions the learner can request next.

SUBJECT VISUAL GUIDANCE:
- Chemistry: include [VISUAL: ...] tags for reactions, separation setups, bonding models, electrolysis, or organic families.
- Biology: include [VISUAL: ...] tags for labelled process diagrams for systems, classification, genetics, or cell function.
- Physics: include [VISUAL: ...] tags for cause-effect diagrams, electricity circuits, waves, pressure, energy, or practical setup.
- Mathematics: include method-flow diagrams and worked steps; use tables for patterns.
- Languages/Humanities: use argument maps, story structure, timeline, cause-effect, or comparison diagrams.
`.trim()

function getModeInstruction(messages: Message[], lastUserMessage: string) {
  const text = lastUserMessage.toLowerCase()
  const previousAssistant = [...messages].reverse().find(m => m.role === 'assistant')?.content?.toLowerCase() || ''

  if (
    previousAssistant.includes('reply with your answer and i will mark it') &&
    !/\b(quick quiz|high-stakes|new question|another question)\b/.test(text)
  ) {
    return `

CURRENT MODE: MARKING MODE.
The learner is answering the previous quiz/test. Mark only this attempt. Do not create a new lesson unless you first finish the marking.
Output:
1. Score
2. What you got right
3. Exact mistake
4. Correct answer
5. One next drill`
  }

  if (/\b(quick quiz|quiz question|test me|short quiz)\b/.test(text)) {
    return `

CURRENT MODE: QUICK QUIZ.
Ask exactly one question matched to the student's curriculum and level. Do not include the answer, marking scheme, rubric evidence, or explanation yet. Include marks or competency target only. End with: "Reply with your answer and I will mark it."`
  }

  if (/\b(high-stakes|exam simulation|challenging task|tough|past paper|mock exam)\b/.test(text)) {
    return `

CURRENT MODE: HIGH-STAKES TEST.
Ask a serious curriculum-matched question set. Show total marks or competency evidence required, but do not reveal answers, marking scheme, or rubric scoring yet. End with: "Reply with your full attempt and I will mark it strictly."`
  }

  if (/\b(continue lesson|next lesson|next step)\b/.test(text)) {
    return `

CURRENT MODE: CONTINUE LESSON.
Continue the same topic as a guided sequence. Name the lesson step, connect it to the previous idea, teach one new point, then give one tiny task.`
  }

  return ''
}

function ensureVisualFirst(content: string, lastUserMessage: string) {
  if (!isAcademicRequest(lastUserMessage)) return content
  if (/!\[Peak lesson visual\]/i.test(content)) return content
  if (/```mermaid/i.test(content)) return content

  const bareDiagram = content.match(/(?:^|\n)(flowchart|graph)\s+(?:TD|LR|BT|RL)[\s\S]*?(?=\n\n[A-Z#*_]|\n(?:What|Worked|Score|Now|Next)\b|$)/i)
  if (bareDiagram?.[0]) {
    const diagram = bareDiagram[0].trim()
    return content.replace(bareDiagram[0], `\n\`\`\`mermaid\n${diagram}\n\`\`\`\n`)
  }

  return `\`\`\`mermaid
flowchart TD
A["Student question"] --> B["Key idea"]
B --> C["Worked example"]
C --> D["Practice task"]
\`\`\`

${content}`
}

// Logic moved to src/lib/ai-utils.ts

async function attachLessonImage(content: string, lastUserMessage: string, curriculumContext: string) {
  if (!shouldGenerateLessonImage(lastUserMessage) || !hasHuggingFaceImageToken()) return content

  try {
    // 1. Find all [VISUAL: ...] placeholders
    const visualRegex = /\[VISUAL:\s*([^\]]+)\]/gi
    const matches = Array.from(content.matchAll(visualRegex))

    if (matches.length > 0) {
      let updatedContent = content
      // Limit to 3 images to prevent excessive loading times
      const maxVisuals = matches.slice(0, 3)

      for (const match of maxVisuals) {
        const fullTag = match[0]
        const conceptDescription = match[1]

        try {
          const image = await generateHuggingFaceLessonImage(
            buildLessonImagePrompt(lastUserMessage, curriculumContext, conceptDescription),
          )
          
          const imageMarkdown = `![Peak lesson visual](${image.dataUri})\n<small>Visual: ${conceptDescription} (via ${image.model})</small>`
          updatedContent = updatedContent.replace(fullTag, imageMarkdown)
        } catch (imgErr) {
          console.warn(`Failed to generate specific visual for "${conceptDescription}":`, imgErr)
          updatedContent = updatedContent.replace(fullTag, '') // Remove the tag if it fails
        }
      }
      return updatedContent
    }

    // 2. Fallback: If no tags were used, generate one at the top (classic behavior)
    const image = await generateHuggingFaceLessonImage(
      buildLessonImagePrompt(lastUserMessage, curriculumContext, content),
    )

    return `![Peak lesson visual](${image.dataUri})\n\n${content}\n\n<small>Visual generated with ${image.model}; Mermaid remains available as the fallback map.</small>`
  } catch (error: any) {
    console.warn('Hugging Face lesson image generation failed; using Mermaid fallback:', error?.message || error)
    return content
  }
}

/**
 * Peak Core Engine: Local Deterministic Assistant
 * Used when the Hugging Face model chain is offline or for specific platform personality.
 */
function getPeakCoreResponse(input: string, context: ChatContext): string {
  const text = input.toLowerCase()
  const name = context.studentName || 'Scholar'
  const streak = context.streak || 0

  if (text.includes('chem')) {
    return `Chemistry works best when we move from particles, to evidence, to exam wording.

\`\`\`mermaid
flowchart TD
A["Chemistry topic"] --> B["Particles"]
B --> C["Evidence"]
C --> D["Equation"]
D --> E["Exam answer"]
\`\`\`

Tell me the exact topic, for example "Form 2 structure and bonding", "moles", "electrolysis", or "organic chemistry". I will teach it visually, give one worked example, then test you without revealing the answer first.`
  }

  if (text.includes('diagram') || text.includes('visual') || text.includes('draw')) {
    return `Send the exact topic and I will build a visual map first, then explain each part. For example: "CBC Grade 8 Integrated Science: acids and bases" or "8-4-4 Form 4 Chemistry: electrolysis".`
  }

  // 1. GREETINGS
  if (text.includes('hello') || text.includes('hi ') || text.trim() === 'hi') {
    return `Hello ${name}! Peak Intelligence Coach is here. I see that solid ${streak}-day streak. Ready to level up your studies today?`
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
    `As your Peak Intelligence Coach, I'm backing you 100%. Small steps every day lead to massive results over time. How can I help you sharpen your focus right now?`
  ]
  return defaults[Math.floor(Math.random() * defaults.length)]
}

interface ChatResult {
  content?: string
  error?: string
  usage?: any
  provider?: HFChatProvider | 'peak-core'
  model?: string
}

export async function chatWithPeakAI(messages: Message[], context: ChatContext = {}): Promise<ChatResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Apply Rate Limiting (10 requests per minute)
  const headerList = await headers()
  const identifier = user?.id || getClientIp(headerList)
  const { success, remaining, reset } = rateLimit(`ai_chat_${identifier}`, {
    limit: 10,
    windowMs: 60 * 1000 // 1 minute
  })

  if (!success) {
    const waitSec = Math.ceil((reset - Date.now()) / 1000)
    return { error: `Slow down! You've reached the peak of your rapid inquiries. Try again in ${waitSec}s.` }
  }
  
  // Auto-detect curriculum and goal
  let curriculumContext = ""
  if (user) {
    const { data: student } = await supabase
      .from('students')
      .select('curriculum:curriculums(name), class:classes(level)')
      .eq('user_id', user.id)
      .single()
    
    const currName = (student?.curriculum as any)?.name || ''
    const currKey = currName.toLowerCase()
    const level = (student?.class as any)?.level || 0
    
    let goal = "Kenyan academic mastery"
    let stage = "Unconfirmed"
    let style = "Visual, rigorous and learner-adaptive"
    
    if (currKey.includes('cbc') || currKey.includes('cbe') || currKey.includes('competency')) {
      if (level <= 6) {
        goal = "KPSEA"
        stage = "CBC Upper Primary"
        style = "Competency-based, practical, simple, visual and reflection-led"
      } else if (level <= 9) {
        goal = "KJSEA"
        stage = "CBC Junior School"
        style = "Strand/sub-strand, practical evidence, inquiry, rubric feedback"
      } else {
        goal = "CBC Senior School pathway readiness"
        stage = "CBC Senior School"
        style = "Pathway-aware, project/lab evidence, portfolio quality and mastery"
      }
    } else if (currKey.includes('8-4-4') || currKey.includes('844')) {
      goal = "KCSE"
      stage = `8-4-4 Form ${level || 'unknown'}`
      style = "Strict examiner marking, keyword mastery, worked examples and past-paper strategy"
    }

    curriculumContext = `\nSTUDENT ACADEMIC CONTEXT:
    - SYSTEM: ${currName}
    - GRADE LEVEL: ${level}
    - STAGE: ${stage}
    - ACTIVE GOAL: ${goal}
    - TEACHING STYLE: ${style}`
  }

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  const modeInstruction = getModeInstruction(messages, lastUserMessage)

  if (hasHuggingFaceToken()) {
    try {
      const response = await callHuggingFaceChat(
        [
          { role: 'system', content: SYSTEM_PROMPT + curriculumContext + modeInstruction + (context.performanceIntel ? `\n\nCURRENT STUDENT INTEL:\n${context.performanceIntel}` : '') },
          ...messages
        ],
        { temperature: 0.35, maxTokens: 1600 },
      )
      const visualFirstContent = ensureVisualFirst(response.content, lastUserMessage)
      const contentWithLessonImage = await attachLessonImage(
        visualFirstContent,
        lastUserMessage,
        curriculumContext,
      )

      return {
        content: contentWithLessonImage,
        usage: response.usage,
        provider: response.provider,
        model: response.model,
      }
    } catch (error: any) {
      console.error('Hugging Face AI chain failed, switching to Peak Core:', error.message)
    }
  } else {
    console.warn('HUGGINGFACE_API_TOKEN/HF_TOKEN missing, using Peak Core.')
  }

  // FALLBACK: Use Peak Core Engine (Local)
  try {
    const fallbackResponse = getPeakCoreResponse(lastUserMessage, context)
    const visualFirstFallback = ensureVisualFirst(fallbackResponse, lastUserMessage)

    return {
      content: await attachLessonImage(visualFirstFallback, lastUserMessage, curriculumContext),
      provider: 'peak-core'
    }
  } catch (err) {
    return { error: 'Peak Intelligence Coach is having a moment of silence. Try again shortly!' }
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

  // Rate limit: 2 plans per minute
  const headerList = await headers()
  const { success } = rateLimit(`save_plan_${user.id}`, { limit: 2, windowMs: 60 * 1000 })
  if (!success) return { error: 'Exceeded plan generation limit. Try again in a minute.' }

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

  // Rate limit: 5 insights per minute
  const headerList = await headers()
  const { success } = rateLimit(`gen_insights_${user.id}`, { limit: 5, windowMs: 60 * 1000 })
  if (!success) return { error: 'Insight engine recharging. Try again in a minute.' }

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
  You are an "AI Behavioral Data Scientist" and the student's personal Peak Intelligence Coach.
  
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
function inferSubjectFromTopic(topic: string) {
  const text = topic.toLowerCase()
  const subjects = [
    'mathematics',
    'chemistry',
    'biology',
    'physics',
    'english',
    'kiswahili',
    'integrated science',
    'social studies',
    'pretechnical',
    'agriculture',
    'history',
    'geography',
    'business',
  ]

  return subjects.find(subject => text.includes(subject)) || null
}

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
    topic: topic.trim(),
    subject: inferSubjectFromTopic(topic)
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
  const { data: trendingLogs } = await supabase
    .from('ai_learning_logs')
    .select('topic, subject, created_at')
    .eq('curriculum_id', student.curriculum_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!trendingLogs || trendingLogs.length === 0) {
    // Fallback to most recent assignments if no logs yet
    const { data: recentAssignments } = await supabase
      .from('assignments')
      .select('title')
      .eq('curriculum_id', student.curriculum_id)
      .order('created_at', { ascending: false })
      .limit(6)
    
    return (recentAssignments || []).map(a => ({ label: a.title, topic: a.title }))
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
    .map(([topic, count]) => ({ label: `${topic} (${count})`, topic }))

  return sorted
}
