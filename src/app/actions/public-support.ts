'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { callGitHubModelsChat, hasGitHubModelsToken } from '@/lib/github-models-chat'
import { callGroqChat, hasGroqToken } from '@/lib/groq-chat'
import { callHuggingFaceChat, hasHuggingFaceToken } from '@/lib/huggingface-chat'
import { processPublicRegistration } from './event-registration'

export type PublicSupportMessage = {
  role: 'user' | 'assistant'
  content: string
}

type SupportInsight = {
  intent: string
  urgency: 'low' | 'normal' | 'high'
  needsHuman: boolean
}

function formatDate(value: unknown) {
  if (!value) return 'date to be confirmed'
  return new Date(String(value)).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function normalizeClass(value: string) {
  const lower = value.toLowerCase()
  const grade = lower.match(/grade\s*(\d+)/)?.[1]
  const form = lower.match(/form\s*(\d+)/)?.[1]
  if (grade) return `Grade ${grade}`
  if (form) return `Form ${form}`
  return value.trim()
}

function normalizeCurriculum(value: string) {
  const lower = value.toLowerCase()
  if (lower.includes('cbc') || lower.includes('grade')) return 'CBC'
  if (lower.includes('8-4-4') || lower.includes('844') || lower.includes('form')) return '8-4-4'
  return value.trim()
}

async function callSupportModel(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) {
  const providers: Array<() => Promise<{ content: string; provider: string; model: string }>> = []

  if (hasGitHubModelsToken()) {
    providers.push(() => callGitHubModelsChat(messages, { task: 'language', temperature: 0.35, maxTokens: 700 }))
  }
  if (hasGroqToken()) {
    providers.push(() => callGroqChat(messages, { temperature: 0.35, maxTokens: 700 }))
  }
  if (hasHuggingFaceToken()) {
    providers.push(() => callHuggingFaceChat(messages, { temperature: 0.35, maxTokens: 700 }))
  }

  for (const provider of providers) {
    try {
      return await provider()
    } catch (error: any) {
      console.error('[PublicSupport] provider failed:', error?.message || error)
    }
  }

  return {
    content:
      'I am APEX, Peak Performance Tutoring assistant. I can help with KCSE/CBC support, result-slip review, holiday tuition, registration and contact details. For fast human support, call or WhatsApp 0798971625.',
    provider: 'peak-core',
    model: 'rules',
  }
}

async function callResultSlipVisionModel(input: {
  fileName: string
  mimeType: string
  dataUrl: string
  notes?: string
  history?: PublicSupportMessage[]
}) {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_TOKEN
  const endpoint = process.env.GITHUB_MODELS_ENDPOINT || 'https://models.github.ai/inference/chat/completions'
  if (!token) throw new Error('GitHub Models token missing.')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number(process.env.GITHUB_MODELS_TIMEOUT_MS || 18000))
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GITHUB_VISION_MODEL || 'microsoft/phi-4-multimodal-instruct',
        temperature: 0.25,
        max_tokens: 1100,
        messages: [
          {
            role: 'system',
            content:
              'You are APEX, Peak Performance Result Slip Coach, a Kenyan educator with 35 years of experience. Read result slips carefully. Extract visible subjects, marks and grades, but do not make a final diagnosis from grades alone. Give a preliminary academic snapshot, identify what evidence is missing, ask one focused follow-up question, and explain how Peak can help through diagnostic placement, small groups, topic recovery, exam technique and parent-visible progress. Never shame the learner.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyse this uploaded result slip for a parent/student. File: ${input.fileName}. Notes from user: ${input.notes || 'None'}. Give a preliminary baseline only, visible strengths, visible weak subjects, possible causes with low/medium confidence unless there is enough evidence, immediate next step, one focused diagnostic question, and how Peak Performance can help. Do not pretend to know the root cause yet.`,
              },
              {
                type: 'image_url',
                image_url: { url: input.dataUrl },
              },
            ],
          },
        ],
      }),
    })
    clearTimeout(timer)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.error?.message || data?.message || response.statusText)
    }
    const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || data?.output_text
    if (!content || !String(content).trim()) throw new Error('Empty result slip analysis.')
    return {
      content: String(content).trim(),
      provider: 'github-models',
      model: process.env.GITHUB_VISION_MODEL || 'microsoft/phi-4-multimodal-instruct',
    }
  } catch (error) {
    clearTimeout(timer)
    throw error
  }
}

function inferSupportInsight(message: string): SupportInsight {
  const lower = message.toLowerCase()
  const needsHuman = /(human|call|whatsapp|speak|talk|urgent|fee|fees|payment|visit|register|enroll|enrol|result slip|marks|grade|placement)/.test(lower)
  const urgency: SupportInsight['urgency'] = /(urgent|today|now|immediately|deadline|payment|paid|not working|failed)/.test(lower) ? 'high' : needsHuman ? 'normal' : 'low'
  let intent = 'general-support'
  if (/(result slip|marks|grade|report form|transcript|performance)/.test(lower)) intent = 'result-slip-analysis'
  else if (/(register|registration|holiday tuition|enroll|enrol)/.test(lower)) intent = 'registration'
  else if (/(fees|charges|payment|price|cost)/.test(lower)) intent = 'fees'
  else if (/(cbc|grade 6|grade 7|grade 8|grade 9|kpsea|kjsea)/.test(lower)) intent = 'cbc-support'
  else if (/(kcse|form 3|form 4|8-4-4|844)/.test(lower)) intent = 'kcse-support'
  else if (/(location|where|kinoo|contact)/.test(lower)) intent = 'location-contact'
  return { intent, urgency, needsHuman }
}

async function logSupportInteraction(input: {
  kind: 'chat' | 'result_slip' | 'handoff'
  visitorMessage: string
  assistantReply?: string
  insight?: SupportInsight
  path?: string
  attachmentName?: string
  attachmentType?: string
  provider?: string
  model?: string
}) {
  try {
    const admin = await createAdminClient()
    const insight = input.insight || inferSupportInsight(input.visitorMessage)
    await admin.from('public_support_interactions').insert({
      kind: input.kind,
      visitor_message: input.visitorMessage.slice(0, 4000),
      assistant_reply: input.assistantReply?.slice(0, 6000) || null,
      intent: insight.intent,
      urgency: insight.urgency,
      needs_human: insight.needsHuman,
      source_path: String(input.path || '').slice(0, 240) || null,
      attachment_name: input.attachmentName || null,
      attachment_type: input.attachmentType || null,
      provider: input.provider || null,
      model: input.model || null,
    })
  } catch (error: any) {
    console.error('[PublicSupport] interaction log failed:', error?.message || error)
  }
}

async function notifyAdminsOfApexMessage(input: {
  title: string
  body: string
  conversationId?: string
  handoffId?: string | null
}) {
  try {
    const admin = await createAdminClient()
    const { data: admins } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    const notifications = (admins || []).map((profile: any) => ({
      user_id: profile.id,
      title: input.title,
      body: input.body,
      type: 'apex_handoff',
      data: {
        conversationId: input.conversationId || null,
        handoffId: input.handoffId || null,
        source: 'apex',
        href: '/admin/apex-messages',
      },
    }))

    if (notifications.length > 0) {
      await admin.from('notifications').insert(notifications)
    }
  } catch (error: any) {
    console.error('[PublicSupport] admin notification failed:', error?.message || error)
  }
}

function getPeakSupportQuickReply(message: string) {
  const lower = message.toLowerCase()
  if (
    lower.includes('how can peak help') ||
    lower.includes('how peak can help') ||
    lower.includes('help me improve') ||
    lower.includes('how can apex help')
  ) {
    return [
      'Peak can help through two main tuition modes.',
      '- Home Tuition: a tutor supports the learner more personally at home, useful for deep gaps, confidence issues or a busy schedule.',
      '- Group Tuition: guided learning with peers, useful for motivation, exam discipline, competition and structured revision.',
      'Which mode do you prefer: Home Tuition or Group Tuition?',
    ].join('\n')
  }
  if (lower.includes('home tuition') || lower.includes('home tutor') || lower.includes('private tuition')) {
    return [
      'Home Tuition gives the learner more personal attention.',
      '- Best for weak foundations, low confidence, missed topics or learners who need close accountability.',
      '- APEX would first establish class, curriculum, weak subjects and recent marks before recommending the tutor focus.',
      'Which class/grade is the learner in?',
    ].join('\n')
  }
  if (lower.includes('group tuition') || lower.includes('group tution') || lower.includes('group classes')) {
    return [
      'Group Tuition is best when the learner needs structure, pace and exam discipline.',
      '- Students revise in guided groups with teacher support, practice and correction.',
      '- Peak can place the learner by curriculum, class and subject needs so the group is not random.',
      'Which curriculum and class should we place the learner under?',
    ].join('\n')
  }
  if (lower.includes('register') || lower.includes('registration') || lower.includes('holiday tuition')) {
    return [
      'You can register for Peak holiday tuition online.',
      '- Open /events/register.',
      '- Choose the programme, curriculum and class.',
      '- Add learner details, subject performance and submit.',
      'Peak will contact the parent/guardian. For urgent help, WhatsApp 0798971625.',
    ].join('\n')
  }
  if (lower.includes('location') || lower.includes('where')) {
    return 'Peak Performance is at St Ignatius Christian School, Kinoo.\n- Contact: 0798971625.\n- You can also use the Contact page for directions.'
  }
  if (lower.includes('cbc') || lower.includes('grade 9') || lower.includes('grade 6')) {
    return 'Yes, Peak supports CBC learners.\n- Grade 6-9 support is available where programmes are open.\n- Register through /events/register and choose the correct CBC grade.'
  }
  return null
}

async function buildTuitionOptionsReply(input: { curriculum: string; classLevel: string }) {
  const admin = await createAdminClient()
  const curriculum = normalizeCurriculum(input.curriculum)
  const classLevel = normalizeClass(input.classLevel)

  const { data: events } = await admin
    .from('tuition_events')
    .select('id, name, start_date, end_date, status, event_location, session_start_time, session_end_time, charge_amount, charge_currency, charge_unit_label, charge_frequency, pricing_note')
    .in('status', ['active', 'upcoming'])
    .order('start_date', { ascending: true })
    .limit(5)

  const { data: slots } = await admin
    .from('tuition_event_class_slots')
    .select('event_id, capacity, charge_amount, charge_currency, charge_unit_label, charge_frequency, pricing_note, curriculum:curriculums(name), class:classes(name)')

  const matchingSlots = (slots || []).filter((slot: any) => {
    const slotCurriculum = String(slot.curriculum?.name || '').toLowerCase()
    const slotClass = String(slot.class?.name || '').toLowerCase()
    return slotCurriculum.includes(curriculum.toLowerCase()) && slotClass === classLevel.toLowerCase()
  })

  const matchingEventIds = new Set(matchingSlots.map((slot: any) => String(slot.event_id)))
  const matchingEvents = (events || []).filter((event: any) => matchingEventIds.size === 0 || matchingEventIds.has(String(event.id)))

  const { data: subjects } = await admin
    .from('subjects')
    .select('name, curriculum:curriculums(name), class:classes(name)')
    .limit(80)

  const offeredSubjects = [...new Set((subjects || [])
    .filter((subject: any) => {
      const subjectCurriculum = String(subject.curriculum?.name || '').toLowerCase()
      const subjectClass = String(subject.class?.name || '').toLowerCase()
      return subjectCurriculum.includes(curriculum.toLowerCase()) && (!subjectClass || subjectClass === classLevel.toLowerCase())
    })
    .map((subject: any) => String(subject.name || '').trim())
    .filter(Boolean))]
    .slice(0, 8)

  if (!matchingEvents.length) {
    return {
      reply: [
        `For ${curriculum} ${classLevel}, APEX needs Peak admin confirmation before quoting a group slot.`,
        '- I can still collect the learner details for placement.',
        '- Peak will confirm availability, subjects, charges and reporting time.',
        'Would you like me to start the registration details now?',
      ].join('\n'),
      events: [],
      subjects: offeredSubjects,
    }
  }

  const eventLines = matchingEvents.slice(0, 3).map((event: any) => {
    const slot = matchingSlots.find((item: any) => String(item.event_id) === String(event.id))
    const amount = Number(slot?.charge_amount ?? event.charge_amount)
    const charge = Number.isFinite(amount) && amount > 0
      ? `${slot?.charge_currency || event.charge_currency || 'KES'} ${amount.toLocaleString()} ${slot?.charge_unit_label || event.charge_unit_label || slot?.charge_frequency || event.charge_frequency || ''}`.trim()
      : 'charges to be confirmed'
    const time = [event.session_start_time, event.session_end_time].filter(Boolean).map((item: string) => String(item).slice(0, 5)).join(' - ') || 'time to be confirmed'
    return `- ${event.name}: ${formatDate(event.start_date)} to ${formatDate(event.end_date)}, ${event.event_location || 'venue to be confirmed'}, ${time}, ${charge}.`
  })

  return {
    reply: [
      `For ${curriculum} ${classLevel} Group Tuition, these are the available Peak options I can see:`,
      ...eventLines,
      offeredSubjects.length ? `Subjects offered/available: ${offeredSubjects.join(', ')}.` : 'Subjects will be confirmed during placement.',
      'I can register the learner here. I need student name, parent name, parent phone, school, overall grade and weak subjects.',
    ].join('\n'),
    events: matchingEvents,
    subjects: offeredSubjects,
  }
}

export async function askPublicSupport(input: {
  message: string
  history?: PublicSupportMessage[]
  path?: string
  steering?: string
}) {
  const message = String(input.message || '').trim()
  if (!message) return { success: false, error: 'Please type a message.' }
  const insight = inferSupportInsight(message)

  const history = (input.history || [])
    .filter((item) => item?.content && ['user', 'assistant'].includes(item.role))
    .slice(-8)
  const historyText = history.map((item) => item.content).join('\n').toLowerCase()

  if (/(group tuition|group tution|group classes|which curriculum and class|place the learner)/.test(historyText) && /(cbc|8-4-4|844|grade\s*\d+|form\s*\d+)/i.test(message)) {
    const reply = await buildTuitionOptionsReply({ curriculum: message, classLevel: message })
    await logSupportInteraction({
      kind: 'chat',
      visitorMessage: message,
      assistantReply: reply.reply,
      insight: { intent: 'registration', urgency: 'normal', needsHuman: true },
      path: input.path,
      provider: 'peak-core',
      model: 'tuition-events',
    })
    return {
      success: true,
      reply: reply.reply,
      provider: 'peak-core',
      model: 'tuition-events',
      needsHuman: true,
      urgency: 'normal',
      intent: 'registration',
      events: reply.events,
      subjects: reply.subjects,
    }
  }

  const quickReply = getPeakSupportQuickReply(message)
  if (quickReply) {
    await logSupportInteraction({
      kind: 'chat',
      visitorMessage: message,
      assistantReply: quickReply,
      insight,
      path: input.path,
      provider: 'peak-core',
      model: 'rules',
    })
    return {
      success: true,
      reply: quickReply,
      provider: 'peak-core',
      model: 'rules',
      needsHuman: insight.needsHuman,
      urgency: insight.urgency,
      intent: insight.intent,
    }
  }

  const result = await callSupportModel([
    {
      role: 'system',
      content: `You are APEX, the public website assistant and admissions tutor for Peak Performance Tutoring in Kenya.
Behave like a seasoned Kenyan educator, academic counsellor and tutor with 35 years of experience.
Never give generic institution advice. Speak as Peak Performance and make practical decisions.
Format replies for a chat bubble:
- Start with a direct answer in one short sentence.
- Then give short bullets when useful.
- Ask one focused question at a time when you need more evidence.
- End with one clear action or next question.
Keep the reply under 130 words unless analysing performance.
You can help with KCSE tutoring, CBC tutoring, holiday tuition, registration, fees guidance, location, contact, portals, testimonials, result-slip interpretation, baseline academic triage, and how Peak works.
Academic diagnosis rules:
- Never diagnose from grades alone or from a statement like "I am failing Mathematics."
- First collect evidence through a structured academic diagnosis.
- Ask only one focused question at a time so the conversation feels natural.
- Let every learner answer influence the next question.
- Gather academic snapshot: class/grade, curriculum, struggling subjects, approximate marks, whether performance dropped recently or has always been weak.
- Gather learning habits: study days per week, study hours, timetable, consistency, homework independence, what they do when stuck.
- Gather subject-specific evidence: difficult topics, when the struggle began, missing prerequisite topics, easy vs hard questions, forgetting, exam panic.
- Gather environment/classroom/mindset/exam skills: study space, resources, interruptions, teacher pace, missed classes, confidence, careless mistakes, time management, examiner wording.
- Trace prerequisite gaps backwards. For example, Form 4 differentiation may require algebra, indices, logarithms, functions and coordinate geometry.
- Only identify root causes after enough evidence has been collected.
- If evidence is not enough, say "I need one more detail before I can be confident" and ask the next question.
- When ready, give multiple contributing causes with confidence levels and explain which learner answers support each conclusion.
- Then give a personalized plan: daily study schedule, weekly targets, topic order, practice method, milestones, timeline, motivation/accountability.
- Always state how Peak Performance can help: diagnostic placement, small groups, topic recovery, guided practice, timed exam technique, progress tracking and parent follow-up.
Important facts:
- Phone and WhatsApp: 0798971625.
- Location: St Ignatius Christian School, Kinoo.
- Peak supports KCSE/8-4-4 and CBC learners.
- Public registration page: /events/register.
- Contact page: /contact.
- Holiday tuition page: /holiday-tuition-kenya.
If asked how to register for holiday tuition, say:
Register on /events/register, choose the programme, fill learner/parent details, choose curriculum/class, add subject performance, then submit. Peak will contact the parent/guardian.
If the user shares marks or uploads a result slip:
- Give a preliminary snapshot only.
- Do not conclude the root cause yet.
- Ask the next best diagnostic question.
Do not claim a human has been assigned unless the user asks for handoff and the system confirms it.
Do not take payments in chat.
If the learner seems urgent, confused about fees/placement, has very weak marks, or asks for admission, recommend human follow-up and ask for name and phone.
User steering/instructions for this answer: ${String(input.steering || 'None').slice(0, 500)}`,
    },
    ...history,
    { role: 'user', content: message },
  ])

  await logSupportInteraction({
    kind: 'chat',
    visitorMessage: message,
    assistantReply: result.content,
    insight,
    path: input.path,
    provider: result.provider,
    model: result.model,
  })

  return {
    success: true,
    reply: result.content,
    provider: result.provider,
    model: result.model,
    needsHuman: insight.needsHuman,
    urgency: insight.urgency,
    intent: insight.intent,
  }
}

export async function registerFromApex(input: {
  studentName: string
  parentName: string
  parentPhone: string
  studentPhone?: string
  schoolName: string
  curriculum: string
  classLevel: string
  eventId: string
  programmeSelected: string
  preferredMode: string
  overallGrade: string
  subjectResultsText: string
  path?: string
}) {
  const subjectResults = String(input.subjectResultsText || '')
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [subjectPart, ...rest] = line.split(/[:=-]/)
      return {
        subjectName: subjectPart?.trim() || 'Subject',
        grade: rest.join(' ').match(/\b(A|A-|B\+|B|B-|C\+|C|C-|D\+|D|D-|E|Exceeding Expectations|Meeting Expectations|Approaching Expectations|Below Expectations)\b/i)?.[0] || input.overallGrade,
        struggle: rest.join(' ').trim() || 'Needs academic diagnosis from APEX follow-up.',
      }
    })

  const formData = new FormData()
  formData.set('student_full_name', input.studentName)
  formData.set('parent_name', input.parentName)
  formData.set('parent_phone', input.parentPhone)
  formData.set('student_phone', input.studentPhone || '')
  formData.set('school_name', input.schoolName)
  formData.set('curriculum', normalizeCurriculum(input.curriculum))
  formData.set('class_level', normalizeClass(input.classLevel))
  formData.set('event_id', input.eventId)
  formData.set('programme_selected', input.programmeSelected)
  formData.set('preferred_mode', input.preferredMode || 'Group Tuition')
  formData.set('overall_grade', input.overallGrade)
  formData.set('subject_results', JSON.stringify(subjectResults))

  const result = await processPublicRegistration(formData)
  await logSupportInteraction({
    kind: 'handoff',
    visitorMessage: `APEX registration attempt: ${input.studentName}, ${input.curriculum} ${input.classLevel}, ${input.programmeSelected}`,
    assistantReply: result.success ? 'Registration submitted by APEX.' : `Registration failed: ${result.error}`,
    insight: { intent: 'registration', urgency: 'high', needsHuman: true },
    path: input.path,
    provider: 'peak-core',
    model: 'apex-registration',
  })
  return result
}

export async function analyzeResultSlip(input: {
  fileName: string
  mimeType: string
  dataUrl?: string
  extractedText?: string
  notes?: string
  history?: PublicSupportMessage[]
  path?: string
}) {
  const fileName = String(input.fileName || 'result-slip').slice(0, 180)
  const mimeType = String(input.mimeType || '').slice(0, 120)
  const notes = String(input.notes || '').trim()
  const extractedText = String(input.extractedText || '').trim()
  if (!input.dataUrl && !extractedText && !notes) {
    return { success: false, error: 'Upload a result slip or type the learner marks.' }
  }

  const visitorMessage = `Result slip analysis requested. File: ${fileName}. Notes: ${notes || 'None'}. Extracted text: ${extractedText || 'None'}`
  const insight: SupportInsight = { intent: 'result-slip-analysis', urgency: 'normal', needsHuman: true }

  try {
    let result: { content: string; provider: string; model: string }
    if (input.dataUrl && mimeType.startsWith('image/') && hasGitHubModelsToken()) {
      result = await callResultSlipVisionModel({
        fileName,
        mimeType,
        dataUrl: String(input.dataUrl),
        notes,
        history: input.history,
      })
    } else {
      result = await callSupportModel([
        {
          role: 'system',
          content:
            'You are APEX, Peak Performance Result Slip Coach, a Kenyan educator with 35 years of experience. Analyse marks like a tutor, but never diagnose from grades alone. Provide a preliminary baseline, visible strengths, visible weak subjects, missing information, one focused follow-up question, and how Peak can help. Only give root causes with confidence levels after enough evidence is available. If the file text is missing, say exactly what details the parent should type next.',
        },
        {
          role: 'user',
          content: visitorMessage,
        },
      ])
    }

    await logSupportInteraction({
      kind: 'result_slip',
      visitorMessage,
      assistantReply: result.content,
      insight,
      path: input.path,
      attachmentName: fileName,
      attachmentType: mimeType,
      provider: result.provider,
      model: result.model,
    })

    return {
      success: true,
      reply: result.content,
      provider: result.provider,
      model: result.model,
      needsHuman: true,
      urgency: 'normal',
      intent: 'result-slip-analysis',
    }
  } catch (error: any) {
    const fallback =
      'I have received the result-slip request, but the AI reader could not complete the analysis right now. Type the subjects with marks, for example: Mathematics 42, English 55, Chemistry 38, and I will create a recovery plan. For human review, WhatsApp 0798971625.'
    await logSupportInteraction({
      kind: 'result_slip',
      visitorMessage,
      assistantReply: fallback,
      insight,
      path: input.path,
      attachmentName: fileName,
      attachmentType: mimeType,
      provider: 'peak-core',
      model: 'fallback',
    })
    return { success: true, reply: fallback, provider: 'peak-core', model: 'fallback', needsHuman: true, urgency: 'normal', intent: 'result-slip-analysis' }
  }
}

export async function requestHumanSupport(input: {
  name?: string
  phone?: string
  email?: string
  message: string
  transcript?: PublicSupportMessage[]
  path?: string
  conversationId?: string
}) {
  const message = String(input.message || '').trim()
  if (!message) return { success: false, error: 'Please tell us what you need help with.' }

  try {
    const admin = await createAdminClient()
    const conversationId = String(input.conversationId || '').trim() || `apex-${crypto.randomUUID()}`
    const { data: handoff, error } = await admin.from('public_support_handoffs').insert({
      name: String(input.name || '').trim() || null,
      phone: String(input.phone || '').trim() || null,
      email: String(input.email || '').trim() || null,
      message,
      transcript: Array.isArray(input.transcript) ? input.transcript.slice(-20) : [],
      source_path: String(input.path || '').slice(0, 240) || null,
      conversation_id: conversationId,
    }).select('id').single()

    if (error) return { success: false, error: error.message }

    await admin.from('public_support_thread_messages').insert([
      {
        conversation_id: conversationId,
        handoff_id: handoff?.id || null,
        author_role: 'visitor',
        author_name: String(input.name || '').trim() || 'Website visitor',
        body: message,
      },
      {
        conversation_id: conversationId,
        handoff_id: handoff?.id || null,
        author_role: 'system',
        author_name: 'APEX',
        body: 'Human support requested from the public APEX assistant.',
        is_read_by_visitor: true,
      },
    ])

    await notifyAdminsOfApexMessage({
      title: 'New APEX human handoff',
      body: `${String(input.name || 'Website visitor').trim() || 'Website visitor'} needs human support in APEX.`,
      conversationId,
      handoffId: handoff?.id || null,
    })

    await logSupportInteraction({
      kind: 'handoff',
      visitorMessage: message,
      assistantReply: 'Human support request received.',
      insight: { intent: 'human-handoff', urgency: 'high', needsHuman: true },
      path: input.path,
      provider: 'peak-core',
      model: 'handoff',
    })

    return {
      success: true,
      message: 'Human support request received. Peak Performance will follow up. For urgent help, WhatsApp or call 0798971625.',
      conversationId,
    }
  } catch (error: any) {
    console.error('[PublicSupport] handoff failed:', error)
    return { success: false, error: error?.message || 'Could not request human support.' }
  }
}

export async function sendApexVisitorMessage(input: {
  conversationId: string
  message: string
  name?: string
}) {
  const conversationId = String(input.conversationId || '').trim()
  const message = String(input.message || '').trim()
  if (!conversationId || !message) return { success: false, error: 'Missing conversation or message.' }

  try {
    const admin = await createAdminClient()
    const { data: handoff } = await admin
      .from('public_support_handoffs')
      .select('id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { error } = await admin.from('public_support_thread_messages').insert({
      conversation_id: conversationId,
      handoff_id: handoff?.id || null,
      author_role: 'visitor',
      author_name: String(input.name || '').trim() || 'Website visitor',
      body: message,
    })

    if (error) return { success: false, error: error.message }
    await notifyAdminsOfApexMessage({
      title: 'New APEX visitor message',
      body: `${String(input.name || 'Website visitor').trim() || 'Website visitor'} replied: ${message.slice(0, 120)}`,
      conversationId,
      handoffId: handoff?.id || null,
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not send message to admin.' }
  }
}

export async function getApexThreadMessages(input: {
  conversationId: string
  after?: string
}) {
  const conversationId = String(input.conversationId || '').trim()
  if (!conversationId) return { success: false, messages: [], error: 'Missing conversation.' }

  try {
    const admin = await createAdminClient()
    let query = admin
      .from('public_support_thread_messages')
      .select('id, conversation_id, author_role, author_name, body, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(80)

    if (input.after) query = query.gt('created_at', input.after)

    const { data, error } = await query
    if (error) return { success: false, messages: [], error: error.message }

    await admin
      .from('public_support_thread_messages')
      .update({ is_read_by_visitor: true })
      .eq('conversation_id', conversationId)
      .eq('author_role', 'admin')

    return { success: true, messages: data || [] }
  } catch (error: any) {
    return { success: false, messages: [], error: error?.message || 'Could not load thread messages.' }
  }
}
