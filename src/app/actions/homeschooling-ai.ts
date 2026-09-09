'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { headers } from 'next/headers'
import { callGroqChat, hasGroqToken } from '@/lib/groq-chat'
import { callGeminiChat, hasGeminiToken } from '@/lib/gemini-chat'
import { callHuggingFaceChat, hasHuggingFaceToken } from '@/lib/huggingface-chat'
import { callNvidiaChat, hasNvidiaToken } from '@/lib/nvidia-chat'
import { callGitHubModelsChat, hasGitHubModelsToken } from '@/lib/github-models-chat'
import type { LearningObjective, LearningResource } from '@/types/homeschooling'
import { can, denialMessage } from '@/lib/homeschooling/permissions'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatResult {
  content?: string
  error?: string
  provider?: string
}

export async function chatWithPeakCoach(data: {
  sessionId: string
  messages: Message[]
  studentMessage: string
}): Promise<ChatResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized. Please log in.' }

  const headerList = await headers()
  const identifier = user?.id || getClientIp(headerList)
  const { success, reset } = rateLimit(`homeschool_ai_${identifier}`, {
    limit: 15,
    windowMs: 60 * 1000,
  })
  if (!success) {
    const waitSec = Math.ceil((reset - Date.now()) / 1000)
    return { error: `Slow down. Try again in ${waitSec}s.` }
  }

  const admin = await createAdminClient()

  const { data: session, error: sessionErr } = await admin
    .from('learning_sessions')
    .select(`
      id, topic, instructions, ai_assistance_enabled, ai_instructions,
      enrollment_id,
      subject:subjects(id, name),
      objectives:learning_objectives(id, title, description, order_index, is_completed),
      resources:learning_resources(id, title, description, type, url, is_required)
    `)
    .eq('id', data.sessionId)
    .maybeSingle()

  if (sessionErr || !session) return { error: 'Session not found.' }

  if (!session.ai_assistance_enabled) {
    return { error: 'Peak Coach is unavailable for this assessment.' }
  }

  const { data: enrollment } = await admin
    .from('homeschool_enrollments')
    .select('student_id, grade_level, program_name, status')
    .eq('id', session.enrollment_id)
    .maybeSingle()

  if (!enrollment) return { error: 'Enrollment not found.' }

  const role = user.user_metadata?.role || user.app_metadata?.role || 'student'

  if (role === 'student') {
    const { data: owned } = await admin
      .from('students')
      .select('id')
      .eq('id', enrollment.student_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!owned) return { error: "You don't have permission to access this learning session." }
    if (!can('coach.use', role, { enrollmentStatus: enrollment.status, isOwner: true })) {
      return { error: denialMessage('coach.use') }
    }
  } else if (role === 'teacher') {
    const { data: teacher } = await admin
      .from('teachers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!teacher) return { error: 'Teacher profile not found.' }
    const { data: assignment } = await admin
      .from('homeschool_teacher_assignments')
      .select('id')
      .eq('enrollment_id', session.enrollment_id)
      .eq('teacher_id', teacher.id)
      .maybeSingle()
    if (!assignment) return { error: "You don't have permission to access this learning session." }
  } else if (role !== 'admin') {
    return { error: "You don't have permission to access this learning session." }
  }

  const { data: student } = await admin
    .from('students')
    .select('id, full_name')
    .eq('id', enrollment.student_id)
    .maybeSingle()

  const { data: recentSessions } = await admin
    .from('learning_sessions')
    .select(`
      id, topic, status, student_status,
      subject:subjects(name)
    `)
    .eq('enrollment_id', session.enrollment_id)
    .order('created_at', { ascending: false })
    .limit(10)

  const completedObjectives = (recentSessions || [])
    .filter((s: any) => s.student_status === 'completed')
    .map((s: any) => {
      const subj = Array.isArray(s.subject) ? s.subject[0] : s.subject
      return `${subj?.name || 'Unknown'}: ${s.topic}`
    })
    .slice(0, 8)

  const subjectName = Array.isArray(session.subject)
    ? (session.subject[0] as any)?.name
    : (session.subject as any)?.name || 'General'

  const objectives = (session.objectives || []) as LearningObjective[]
  const resources = ((session.resources || []) as LearningResource[]).filter((r: any) => r.is_current !== false)

  const systemPrompt = buildHomeschoolSystemPrompt({
    subjectName,
    topic: session.topic,
    objectives,
    resources,
    instructions: session.instructions,
    aiInstructions: session.ai_instructions,
    studentName: student?.full_name?.split(' ')[0] || 'Student',
    gradeLevel: enrollment.grade_level,
    programName: enrollment.program_name,
    completedObjectives,
  })

  const conversationMessages = data.messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const messagesForAI = [
    { role: 'system' as const, content: systemPrompt },
    ...conversationMessages,
    { role: 'user' as const, content: data.studentMessage },
  ]

  const providers: { name: string; call: () => Promise<{ content: string; provider: string; model: string }> }[] = []

  if (hasGroqToken()) {
    providers.push({
      name: 'groq',
      call: () => callGroqChat(messagesForAI, { temperature: 0.3, maxTokens: 1600 }),
    })
  }

  if (hasGeminiToken()) {
    providers.push({
      name: 'gemini',
      call: () => callGeminiChat(messagesForAI, { temperature: 0.3, maxTokens: 1600 }),
    })
  }

  if (hasHuggingFaceToken()) {
    providers.push({
      name: 'huggingface',
      call: () => callHuggingFaceChat(messagesForAI, { temperature: 0.3, maxTokens: 1600 }),
    })
  }

  if (hasNvidiaToken()) {
    providers.push({
      name: 'nvidia',
      call: () => callNvidiaChat(messagesForAI, { temperature: 0.3, maxTokens: 1600 }),
    })
  }

  if (hasGitHubModelsToken()) {
    providers.push({
      name: 'github-models',
      call: () => callGitHubModelsChat(messagesForAI, { temperature: 0.3, maxTokens: 1600 }),
    })
  }

  for (const provider of providers) {
    try {
      const response = await provider.call()
      return {
        content: response.content,
        provider: provider.name,
      }
    } catch (err: any) {
      console.error(`${provider.name} failed:`, err.message)
    }
  }

  return { error: 'Peak Coach is temporarily unavailable. Please try again shortly.' }
}

function buildHomeschoolSystemPrompt(opts: {
  subjectName: string
  topic: string
  objectives: LearningObjective[]
  resources: LearningResource[]
  instructions: string | null
  aiInstructions: string | null
  studentName: string
  gradeLevel: string
  programName: string
  completedObjectives: string[]
}): string {
  const objectivesBlock = opts.objectives.length > 0
    ? `\nLEARNING OBJECTIVES:\n${opts.objectives.map((o, i) => `${i + 1}. ${o.title}${o.description ? ` — ${o.description}` : ''}${o.is_completed ? ' [COMPLETED]' : ''}`).join('\n')}`
    : ''

  const resourcesBlock = opts.resources.length > 0
    ? `\nATTACHED RESOURCES (use as primary context when relevant):\n${opts.resources.map(r => `- ${r.title}${r.description ? `: ${r.description}` : ''} (${r.type}${r.url ? `, ${r.url}` : ''})`).join('\n')}`
    : ''

  const completedBlock = opts.completedObjectives.length > 0
    ? `\nRECENT COMPLETED TOPICS:\n${opts.completedObjectives.map(c => `- ${c}`).join('\n')}`
    : ''

  const teacherInstructions = opts.instructions
    ? `\nTEACHER SESSION INSTRUCTIONS:\n${opts.instructions}`
    : ''

  const aiOverride = opts.aiInstructions
    ? `\nTEACHER AI OVERRIDE (OBEY THESE INSTRUCTIONS EXACTLY):\n${opts.aiInstructions}`
    : ''

  return `You are Peak Coach, a contextual AI learning companion embedded within a homeschooling session at Peak Performance Tutoring.

### YOUR ROLE
You are an intelligent, encouraging, and pedagogical assistant helping a student during a live learning session. You are NOT a general-purpose chatbot. You are focused exclusively on helping the student understand and master the current session's content.

### SESSION CONTEXT
- Student: ${opts.studentName}
- Program: ${opts.programName} (${opts.gradeLevel})
- Subject: ${opts.subjectName}
- Topic: ${opts.topic}
${objectivesBlock}
${resourcesBlock}
${completedBlock}
${teacherInstructions}
${aiOverride}

### BEHAVIORAL RULES

1. PEDAGOGICAL APPROACH — Always guide, never give the answer directly:
   - First ask: "What have you already tried?" or "What do you think the answer might be?"
   - Identify the specific difficulty the student is facing
   - Provide hints, scaffolding, and conceptual explanations
   - Use worked examples that lead the student through the reasoning process
   - Connect concepts to the learning objectives listed above

2. NEVER REVEAL ANSWERS TO ACTIVE ASSIGNMENTS:
   - If the session has a submission required or an active task, do NOT provide the final answer
   - Instead, break the problem into smaller steps and guide the student to discover the answer themselves
   - If the student explicitly asks for the answer, redirect: "Let's work through this together. What's the first step you'd take?"

3. USE ATTACHED RESOURCES AS PRIMARY CONTEXT:
   - When resources are provided, reference them directly in your explanations
   - If a resource URL is available, point the student to it: "Your resource on [topic] covers this — take a look at [section] and tell me what you find."
   - Build your explanations around the materials the teacher has prepared

4. RESPECT TEACHER AI OVERRIDE:
   - If teacher AI instructions are present, they are your highest priority
   - Follow them exactly, even if they conflict with default pedagogical behavior
   - Example: if the teacher says "only answer questions about photosynthesis," you strictly stay on that topic

5. ADAPT TO STUDENT LEVEL:
   - This is a ${opts.gradeLevel} student in the ${opts.programName} program
   - Use age-appropriate language and examples
   - For younger students: use simple analogies, stories, and visual descriptions
   - For older students: use more rigorous academic language while remaining approachable

6. CONTEXTUAL AWARENESS:
   - Reference the session topic in every response: "In today's lesson on ${opts.topic}..."
   - If the student has completed objectives, acknowledge their progress
   - If objectives remain, gently guide them toward the next one
   - Keep responses focused and session-relevant — avoid tangents

### RESPONSE FORMAT
- Be concise but thorough — responses should be 2-5 short paragraphs
- Use bullet points for clarity when listing steps or concepts
- End each response with a guiding question or next-step prompt
- Never use the phrase "As an AI" or similar disclaimers

### WHAT TO AVOID
- Do not answer questions unrelated to the session topic
- Do not complete assignments or tasks for the student
- Do not provide answers to quiz questions or assessment items
- Do not use overly formal or robotic language
- Do not introduce topics beyond the session scope without redirecting`
}
