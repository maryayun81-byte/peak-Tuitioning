'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { callGroqChat, hasGroqToken } from '@/lib/groq-chat'
import { callGeminiChat, hasGeminiToken } from '@/lib/gemini-chat'
import { callHuggingFaceChat, hasHuggingFaceToken } from '@/lib/huggingface-chat'
import { sendPushNotification } from './push'

export type MessageSafetyResult = {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  categories: string[]
  explanation: string
  confidence: number
  provider: string
  suggestedRewrite?: string
}

const SAFETY_PATTERNS: Array<{
  category: string
  pattern: RegExp
  level: MessageSafetyResult['riskLevel']
  explanation: string
}> = [
  { category: 'romantic-boundary', pattern: /\b(i\s+love\s+you|love\s+you|be\s+my\s+(girl|boy)friend|date\s+me|crush\s+on\s+you)\b/i, level: 'medium', explanation: 'Romantic language can cross student-teacher boundaries.' },
  { category: 'sexual-content', pattern: /\b(nudes?|naked|sex|sexy|send\s+(me\s+)?pics?|kiss\s+me|sleep\s+with)\b/i, level: 'critical', explanation: 'Sexual or intimate content is not permitted in learning conversations.' },
  { category: 'secrecy', pattern: /\b(don'?t\s+tell|keep\s+this\s+(a\s+)?secret|between\s+us|delete\s+this\s+chat)\b/i, level: 'high', explanation: 'Requests for secrecy can indicate unsafe boundary testing.' },
  { category: 'private-contact', pattern: /\b(whatsapp|telegram|snapchat|instagram|my\s+number|call\s+me|text\s+me)\b/i, level: 'medium', explanation: 'Moving school communication to private channels can create safeguarding risk.' },
  { category: 'contact-details', pattern: /(?:\+?\d[\d\s-]{7,}\d)|(?:[\w.+-]+@[\w.-]+\.[a-z]{2,})/i, level: 'medium', explanation: 'The message appears to contain private contact information.' },
  { category: 'threat', pattern: /\b(kill|hurt\s+you|beat\s+you|attack|you'?ll\s+pay|watch\s+your\s+back)\b/i, level: 'critical', explanation: 'The message contains threatening language.' },
  { category: 'bullying', pattern: /\b(stupid|idiot|useless|ugly|hate\s+you|loser)\b/i, level: 'medium', explanation: 'The message may contain bullying or degrading language.' },
  { category: 'self-harm', pattern: /\b(kill\s+myself|suicide|end\s+my\s+life|hurt\s+myself|don'?t\s+want\s+to\s+live)\b/i, level: 'critical', explanation: 'The message may indicate immediate wellbeing risk.' },
]

const RISK_ORDER = { low: 0, medium: 1, high: 2, critical: 3 } as const

function cleanJsonResponse(content: string) {
  const trimmed = content.trim()
  if (trimmed.startsWith('```json')) {
    return trimmed.replace(/^```json/, '').replace(/```$/, '').trim()
  }
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```/, '').replace(/```$/, '').trim()
  }
  return trimmed
}

async function callMessagingAI(messages: any[], options: any) {
  const providers: { name: string; call: () => Promise<{ content: string; provider: string; model: string }> }[] = []

  if (hasGroqToken()) {
    providers.push({
      name: 'Groq',
      call: () => callGroqChat(messages, options),
    })
  }

  if (hasGeminiToken()) {
    providers.push({
      name: 'Gemini',
      call: () => callGeminiChat(messages, options),
    })
  }

  if (hasHuggingFaceToken()) {
    providers.push({
      name: 'Hugging Face',
      call: () => callHuggingFaceChat(messages, options),
    })
  }

  if (providers.length === 0) {
    throw new Error('No AI providers configured')
  }

  for (const provider of providers) {
    try {
      const response = await provider.call()
      return { content: cleanJsonResponse(response.content), provider: response.provider, model: response.model }
    } catch (error: any) {
      console.error(`[PeakMessaging] ${provider.name} fallback failed:`, error.message)
    }
  }

  throw new Error('All AI providers failed')
}

function ruleBasedSafety(body: string): MessageSafetyResult {
  const matches = SAFETY_PATTERNS.filter((item) => item.pattern.test(body))
  const strongest = matches.reduce<MessageSafetyResult['riskLevel']>(
    (level, item) => RISK_ORDER[item.level] > RISK_ORDER[level] ? item.level : level,
    'low',
  )

  return {
    riskLevel: strongest,
    categories: [...new Set(matches.map((item) => item.category))],
    explanation: matches.map((item) => item.explanation).join(' ') || 'No safeguarding concern detected.',
    confidence: matches.length ? Math.min(0.98, 0.72 + matches.length * 0.08) : 0.62,
    provider: 'peak-rules',
  }
}

async function classifyMessage(body: string, context: string[]): Promise<MessageSafetyResult> {
  const rules = ruleBasedSafety(body)
  if (!hasGroqToken() && !hasGeminiToken() && !hasHuggingFaceToken()) return rules

  try {
    const result = await callMessagingAI([
      {
        role: 'system',
        content: `You are Peak Safeguarding Intelligence for a school messaging platform.
Classify only concrete communication risk. Do not diagnose, moralize, or punish.
Categories: romantic-boundary, sexual-content, secrecy, private-contact, contact-details, threat, bullying, self-harm, manipulation, none.
Risk levels: low, medium, high, critical.
Return strict JSON: {"riskLevel":"low|medium|high|critical","categories":[],"explanation":"one short sentence","confidence":0.0,"suggestedRewrite":"optional respectful learning-focused rewrite"}.
Critical is reserved for sexual solicitation, credible threats, self-harm, or grooming patterns. Romantic language, private contact sharing, or insults are normally medium unless repeated context escalates them.`,
      },
      {
        role: 'user',
        content: `Recent conversation context:\n${context.slice(-8).join('\n') || '(none)'}\n\nNew message:\n${body}`,
      },
    ], { temperature: 0.1, maxTokens: 320, responseFormat: { type: 'json_object' } })

    const parsed = JSON.parse(result.content)
    const aiLevel = ['low', 'medium', 'high', 'critical'].includes(parsed.riskLevel)
      ? parsed.riskLevel as MessageSafetyResult['riskLevel']
      : 'low'
    const riskLevel = RISK_ORDER[rules.riskLevel] > RISK_ORDER[aiLevel] ? rules.riskLevel : aiLevel

    return {
      riskLevel,
      categories: [...new Set([...(rules.categories || []), ...(Array.isArray(parsed.categories) ? parsed.categories : [])])],
      explanation: riskLevel === rules.riskLevel && rules.riskLevel !== 'low'
        ? rules.explanation
        : String(parsed.explanation || rules.explanation),
      confidence: Math.max(rules.confidence, Number(parsed.confidence) || 0),
      provider: result.provider === 'groq' ? `groq:${result.model}` : `${result.provider}:${result.model}`,
      suggestedRewrite: parsed.suggestedRewrite ? String(parsed.suggestedRewrite) : undefined,
    }
  } catch (error) {
    console.warn('[PeakMessaging] AI safeguarding fallback engaged', error)
    return rules
  }
}

async function getActor(expectedUserId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || expectedUserId
  if (!userId) throw new Error('Authentication required')

  const admin = await createAdminClient()
  const [{ data: student }, { data: teacher }] = await Promise.all([
    admin.from('students').select('id, user_id, full_name, class_id').eq('user_id', userId).maybeSingle(),
    admin.from('teachers').select('id, user_id, full_name').eq('user_id', userId).maybeSingle(),
  ])

  if (!student && !teacher) throw new Error('Messaging profile not found')
  return { user: { id: userId }, admin, student, teacher, role: student ? 'student' as const : 'teacher' as const }
}

async function authorizeConversation(conversationId: string, expectedUserId?: string) {
  const actor = await getActor(expectedUserId)
  const { data: conversation } = await actor.admin
    .from('peak_conversations')
    .select('*, student:students(id, user_id, full_name, class_id), teacher:teachers(id, user_id, full_name)')
    .eq('id', conversationId)
    .single()

  if (!conversation) throw new Error('Conversation not found')
  const allowed = conversation.student?.user_id === actor.user.id || conversation.teacher?.user_id === actor.user.id
  if (!allowed) throw new Error('You cannot access this conversation')
  return { ...actor, conversation }
}

async function getMessagingBootstrapUnsafe(expectedUserId?: string) {
  const actor = await getActor(expectedUserId)
  if (actor.role === 'student') {
    const student = actor.student!
    const [assignmentsResult, conversationsResult] = await Promise.all([
      actor.admin
        .from('teacher_assignments')
        .select('teacher_id, subject_id, is_class_teacher, teacher:teachers(id, full_name, avatar_url), subject:subjects(id, name)')
        .eq('class_id', student.class_id),
      actor.admin
        .from('peak_conversations')
        .select('*, teacher:teachers(id, full_name, avatar_url), subject:subjects(id, name)')
        .eq('student_id', student.id)
        .order('last_message_at', { ascending: false, nullsFirst: false }),
    ])
    if (assignmentsResult.error) throw new Error(`Teacher directory unavailable: ${assignmentsResult.error.message}`)
    if (conversationsResult.error) throw new Error(`Messaging database unavailable: ${conversationsResult.error.message}`)
    const assignments = assignmentsResult.data
    const conversations = conversationsResult.data

    const teacherMap = new Map<string, any>()
    for (const assignment of assignments || []) {
      const teacher = assignment.teacher as any
      if (!teacher) continue
      const existing = teacherMap.get(teacher.id)
      teacherMap.set(teacher.id, {
        ...teacher,
        isClassTeacher: Boolean(existing?.isClassTeacher || assignment.is_class_teacher),
        subjects: [...(existing?.subjects || []), ...((assignment.subject as any)?.name ? [(assignment.subject as any).name] : [])],
      })
    }

    return {
      role: actor.role,
      currentUserId: actor.user.id,
      currentProfile: student,
      contacts: [...teacherMap.values()],
      conversations: conversations || [],
    }
  }

  const teacher = actor.teacher!
  const [assignmentsResult, conversationsResult] = await Promise.all([
    actor.admin.from('teacher_assignments').select('class_id').eq('teacher_id', teacher.id),
    actor.admin
      .from('peak_conversations')
      .select('*, student:students(id, full_name, user_id, class:classes(id, name)), subject:subjects(id, name)')
      .eq('teacher_id', teacher.id)
      .order('last_message_at', { ascending: false, nullsFirst: false }),
  ])
  if (assignmentsResult.error) throw new Error(`Class directory unavailable: ${assignmentsResult.error.message}`)
  if (conversationsResult.error) throw new Error(`Messaging database unavailable: ${conversationsResult.error.message}`)
  const assignments = assignmentsResult.data
  const conversations = conversationsResult.data
  const classIds = [...new Set((assignments || []).map((item) => item.class_id).filter(Boolean))]
  const { data: students } = classIds.length
    ? await actor.admin.from('students').select('id, full_name, user_id, class:classes(id, name)').in('class_id', classIds).order('full_name')
    : { data: [] }
  const studentUserIds = (students || []).map((student: any) => student.user_id).filter(Boolean)
  const { data: studentProfiles } = studentUserIds.length
    ? await actor.admin.from('profiles').select('id, avatar_url, avatar_metadata').in('id', studentUserIds)
    : { data: [] }
  const profileByUserId = new Map((studentProfiles || []).map((profile: any) => [profile.id, profile]))
  const studentsWithAvatars = (students || []).map((student: any) => ({
    ...student,
    profile: profileByUserId.get(student.user_id) || null,
  }))

  const conversationIds = (conversations || []).map((item) => item.id)
  const { data: safety } = conversationIds.length
    ? await actor.admin
        .from('peak_message_safety_reviews')
        .select('conversation_id, risk_level, categories, explanation, created_at, action_taken')
        .in('conversation_id', conversationIds)
        .in('risk_level', ['medium', 'high', 'critical'])
        .order('created_at', { ascending: false })
        .limit(100)
    : { data: [] }

  return {
    role: actor.role,
    currentUserId: actor.user.id,
    currentProfile: teacher,
    contacts: studentsWithAvatars,
    conversations: conversations || [],
    safety: safety || [],
  }
}

export async function getMessagingBootstrap(expectedUserId?: string) {
  try {
    const bootstrap = await getMessagingBootstrapUnsafe(expectedUserId)
    return { ok: true as const, bootstrap }
  } catch (error) {
    console.error('[PeakMessaging] Bootstrap failed', error)
    return {
      ok: false as const,
      error: error instanceof Error && error.message !== 'Authentication required'
        ? error.message
        : 'Messaging is loading your student profile. Please try again in a moment.',
    }
  }
}

export async function startPeakConversation(teacherId: string, expectedUserId?: string) {
  const actor = await getActor(expectedUserId)
  if (actor.role !== 'student') throw new Error('Only students can start a teacher conversation')
  const student = actor.student!

  const { data: assignment } = await actor.admin
    .from('teacher_assignments')
    .select('subject_id')
    .eq('teacher_id', teacherId)
    .eq('class_id', student.class_id)
    .limit(1)
    .maybeSingle()
  if (!assignment) throw new Error('This teacher is not assigned to your class')

  const { data, error } = await actor.admin
    .from('peak_conversations')
    .upsert({
      student_id: student.id,
      teacher_id: teacherId,
      class_id: student.class_id,
      subject_id: assignment.subject_id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,teacher_id' })
    .select('*, teacher:teachers(id, full_name, avatar_url), subject:subjects(id, name)')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/student/messages')
  return data
}

async function startTeacherPeakConversationUnsafe(studentId: string, expectedUserId?: string) {
  const actor = await getActor(expectedUserId)
  if (actor.role !== 'teacher') throw new Error('Only teachers can start a student conversation')
  const teacher = actor.teacher!

  const { data: student } = await actor.admin
    .from('students')
    .select('id, class_id, full_name')
    .eq('id', studentId)
    .single()
  if (!student) throw new Error('Student not found')

  const { data: assignment } = await actor.admin
    .from('teacher_assignments')
    .select('subject_id')
    .eq('teacher_id', teacher.id)
    .eq('class_id', student.class_id)
    .limit(1)
    .maybeSingle()
  if (!assignment) throw new Error('You are not assigned to this student’s class')

  const { data, error } = await actor.admin
    .from('peak_conversations')
    .upsert({
      student_id: student.id,
      teacher_id: teacher.id,
      class_id: student.class_id,
      subject_id: assignment.subject_id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,teacher_id' })
    .select('*, student:students(id, full_name, user_id, class:classes(id, name)), subject:subjects(id, name)')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/teacher/messages')
  return data
}

export async function startTeacherPeakConversation(studentId: string, expectedUserId?: string) {
  try {
    const conversation = await startTeacherPeakConversationUnsafe(studentId, expectedUserId)
    return { ok: true as const, conversation }
  } catch (error) {
    console.error('[PeakMessaging] Teacher could not start conversation', { studentId, error })
    const message = error instanceof Error && !error.message.includes('Server Components render')
      ? error.message
      : 'The conversation could not be opened. Please try again.'
    return { ok: false as const, error: message }
  }
}

export async function getPeakMessages(conversationId: string, expectedUserId?: string) {
  try {
    const actor = await authorizeConversation(conversationId, expectedUserId)
    const { admin, conversation } = actor
    const { data, error } = await admin
      .from('peak_messages')
      .select('*, reactions:peak_message_reactions(emoji, user_id), reply:peak_messages!reply_to_id(id, body, sender_id)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(300)
    if (error) {
      console.error('[PeakMessaging] Thread load failed', { conversationId, error })
      return { ok: false as const, error: 'This conversation could not be loaded.', messages: [] }
    }
    const recipientReadAt = actor.role === 'student'
      ? conversation.teacher_last_read_at
      : conversation.student_last_read_at
    const { data: pins } = await admin
      .from('peak_message_pins')
      .select('message_id, pinned_by, created_at')
      .eq('conversation_id', conversationId)
    const pinsByMessage = new Map<string, any[]>()
    for (const pin of pins || []) {
      pinsByMessage.set(pin.message_id, [...(pinsByMessage.get(pin.message_id) || []), pin])
    }
    const messages = await Promise.all((data || []).map(async (message: any) => {
      let voiceUrl: string | null = null
      if (message.message_type === 'voice' && message.metadata?.storage_path) {
        const { data: signed } = await admin.storage
          .from('peak-message-voice')
          .createSignedUrl(message.metadata.storage_path, 3600)
        voiceUrl = signed?.signedUrl || null
      }
      return {
        ...message,
        pins: pinsByMessage.get(message.id) || [],
        voice_url: voiceUrl,
        delivery_status: message.sender_id !== actor.user.id
          ? null
          : recipientReadAt && new Date(recipientReadAt) >= new Date(message.created_at)
            ? 'seen'
            : 'delivered',
      }
    }))
    return { ok: true as const, messages }
  } catch (error) {
    console.error('[PeakMessaging] Unexpected thread load failure', { conversationId, error })
    return { ok: false as const, error: 'This conversation could not be loaded.', messages: [] }
  }
}

async function notifyMessageRecipient(actor: Awaited<ReturnType<typeof authorizeConversation>>, preview: string) {
  const recipientId = actor.conversation.student?.user_id === actor.user.id
    ? actor.conversation.teacher?.user_id
    : actor.conversation.student?.user_id
  if (!recipientId) return
  const senderName = actor.role === 'student' ? actor.student!.full_name : actor.teacher!.full_name
  const href = `/${actor.role === 'student' ? 'teacher' : 'student'}/messages?conversation=${actor.conversation.id}`
  await actor.admin.from('notifications').insert({
    user_id: recipientId,
    title: `New message from ${senderName}`,
    body: preview,
    type: 'message',
    data: { conversation_id: actor.conversation.id, href },
  })

  await sendPushNotification([recipientId], {
    title: `New message from ${senderName}`,
    body: preview,
    href,
    tag: `peak-message-${actor.conversation.id}`,
  })
}

async function createSpecialMessage(input: {
  conversationId: string
  messageType: 'voice' | 'learning_card'
  body: string
  metadata: Record<string, unknown>
}) {
  const actor = await authorizeConversation(input.conversationId)
  if (actor.conversation.is_archived_by_student || actor.conversation.is_archived_by_teacher) {
    throw new Error('This conversation is paused. Resume it before sending a new message.')
  }
  const { data: message, error } = await actor.admin.from('peak_messages').insert({
    conversation_id: input.conversationId,
    sender_id: actor.user.id,
    body: input.body,
    message_type: input.messageType,
    metadata: input.metadata,
  }).select('*').single()
  if (error) throw new Error(error.message)
  await Promise.all([
    actor.admin.from('peak_conversations').update({
      last_message_preview: input.body.slice(0, 120),
      last_message_at: message.created_at,
      updated_at: message.created_at,
    }).eq('id', input.conversationId),
    notifyMessageRecipient(actor, input.body),
  ])
  revalidatePath('/student/messages')
  revalidatePath('/teacher/messages')
  return message
}

export async function sendPeakVoiceNote(input: {
  conversationId: string
  base64: string
  mimeType: string
  durationSeconds: number
}) {
  try {
    const actor = await authorizeConversation(input.conversationId)
    const allowedTypes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
    if (!allowedTypes.includes(input.mimeType)) return { ok: false as const, error: 'This audio format is not supported.' }
    const bytes = Buffer.from(input.base64, 'base64')
    if (!bytes.length || bytes.length > 8 * 1024 * 1024) return { ok: false as const, error: 'Voice notes must be under 8 MB.' }
    const extension = input.mimeType.includes('ogg') ? 'ogg' : input.mimeType.includes('mp4') ? 'm4a' : input.mimeType.includes('mpeg') ? 'mp3' : 'webm'
    const storagePath = `${input.conversationId}/${actor.user.id}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await actor.admin.storage.from('peak-message-voice').upload(storagePath, bytes, {
      contentType: input.mimeType,
      upsert: false,
    })
    if (uploadError) throw new Error(uploadError.message)
    const message = await createSpecialMessage({
      conversationId: input.conversationId,
      messageType: 'voice',
      body: 'Voice note',
      metadata: { storage_path: storagePath, duration_seconds: Math.max(1, Math.round(input.durationSeconds)), mime_type: input.mimeType },
    })
    const { data: signed } = await actor.admin.storage.from('peak-message-voice').createSignedUrl(storagePath, 3600)
    return { ok: true as const, message: { ...message, voice_url: signed?.signedUrl || null, reactions: [], pins: [] } }
  } catch (error) {
    console.error('[PeakMessaging] Voice note failed', error)
    return { ok: false as const, error: error instanceof Error ? error.message : 'Voice note could not be sent.' }
  }
}

export async function sendPeakLearningCard(input: {
  conversationId: string
  title: string
  description: string
  cardType: 'task' | 'resource' | 'quiz' | 'reminder'
  href?: string
  dueAt?: string
}) {
  try {
    const title = input.title.trim().slice(0, 120)
    if (!title) return { ok: false as const, error: 'Add a title to the learning card.' }
    const message = await createSpecialMessage({
      conversationId: input.conversationId,
      messageType: 'learning_card',
      body: `${input.cardType === 'task' ? 'Learning task' : 'Learning card'}: ${title}`,
      metadata: {
        title,
        description: input.description.trim().slice(0, 800),
        card_type: input.cardType,
        href: input.href?.trim() || null,
        due_at: input.dueAt || null,
      },
    })
    return { ok: true as const, message: { ...message, reactions: [], pins: [] } }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Learning card could not be sent.' }
  }
}

export async function togglePeakMessagePin(messageId: string) {
  const actor = await getActor()
  const { data: message } = await actor.admin.from('peak_messages').select('id, conversation_id').eq('id', messageId).single()
  if (!message) return { ok: false as const, error: 'Message not found.' }
  await authorizeConversation(message.conversation_id)
  const { data: existing } = await actor.admin.from('peak_message_pins')
    .select('message_id').eq('message_id', messageId).eq('conversation_id', message.conversation_id).maybeSingle()
  if (existing) {
    await actor.admin.from('peak_message_pins').delete().eq('message_id', messageId).eq('conversation_id', message.conversation_id)
  } else {
    await actor.admin.from('peak_message_pins').insert({
      message_id: messageId,
      conversation_id: message.conversation_id,
      pinned_by: actor.user.id,
    })
  }
  return { ok: true as const, pinned: !existing }
}

export async function generatePeakConversationSummary(conversationId: string) {
  const actor = await authorizeConversation(conversationId)
  const { data: messages } = await actor.admin.from('peak_messages')
    .select('body, sender_id, message_type, created_at')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(200)
  if (!messages?.length) return { ok: false as const, error: 'There are no messages to summarize yet.' }
  const transcript = messages.map((item) => `${item.sender_id === actor.conversation.teacher.user_id ? 'Teacher' : 'Student'}: ${item.body}`).join('\n')
  let summary = 'The conversation contains a learning discussion. Review the recent messages for the full context.'
  let actionItems: string[] = []
  let provider = 'peak-core'
  if (hasGroqToken() || hasGeminiToken() || hasHuggingFaceToken()) {
    try {
      const result = await callMessagingAI([
        { role: 'system', content: 'Summarize this student-teacher learning conversation. Return strict JSON: {"summary":"2-4 concise sentences","actionItems":["clear next step"]}. Preserve safeguarding boundaries and do not invent facts.' },
        { role: 'user', content: transcript },
      ], { temperature: 0.2, maxTokens: 500, responseFormat: { type: 'json_object' } })
      const parsed = JSON.parse(result.content)
      summary = String(parsed.summary || summary)
      actionItems = Array.isArray(parsed.actionItems) ? parsed.actionItems.map(String).slice(0, 8) : []
      provider = result.model
    } catch (error) {
      console.warn('[PeakMessaging] Summary fallback engaged', error)
    }
  }
  const { data, error } = await actor.admin.from('peak_conversation_summaries').upsert({
    conversation_id: conversationId,
    summary,
    action_items: actionItems,
    generated_by: actor.user.id,
    source_message_count: messages.length,
    provider,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'conversation_id' }).select('*').single()
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, summary: data }
}

export async function getPeakConversationSummary(conversationId: string) {
  const actor = await authorizeConversation(conversationId)
  const { data } = await actor.admin.from('peak_conversation_summaries').select('*').eq('conversation_id', conversationId).maybeSingle()
  return data
}

export async function savePeakPushSubscription(subscription: {
  endpoint: string
  keys: { p256dh: string; auth: string }
  userAgent?: string
}) {
  const actor = await getActor()
  const { error } = await actor.admin.from('peak_push_subscriptions').upsert({
    user_id: actor.user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: subscription.userAgent || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' })
  return error ? { ok: false as const, error: error.message } : { ok: true as const }
}

export async function deletePeakPushSubscription(endpoint: string) {
  const actor = await getActor()
  await actor.admin.from('peak_push_subscriptions').delete().eq('user_id', actor.user.id).eq('endpoint', endpoint)
  return { ok: true as const }
}

async function sendPeakMessageUnsafe(input: {
  conversationId: string
  body: string
  replyToId?: string | null
  confirmed?: boolean
  expectedUserId?: string
}) {
  const body = input.body.trim()
  if (!body || body.length > 4000) throw new Error('Message must be between 1 and 4000 characters')
  const actor = await authorizeConversation(input.conversationId, input.expectedUserId)
  if (actor.conversation.is_archived_by_student || actor.conversation.is_archived_by_teacher) {
    throw new Error('This conversation is paused. Resume it before sending a new message.')
  }

  const { data: recent } = await actor.admin
    .from('peak_messages')
    .select('body, sender_id')
    .eq('conversation_id', input.conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(12)
  const context = (recent || []).reverse().map((item) => `${item.sender_id === actor.user.id ? 'Current user' : 'Other participant'}: ${item.body}`)
  const safety = await classifyMessage(body, context)

  const shouldBlock = safety.riskLevel === 'high' || safety.riskLevel === 'critical'
  const shouldWarn = safety.riskLevel === 'medium' && !input.confirmed
  if (shouldBlock || shouldWarn) {
    await actor.admin.from('peak_message_safety_reviews').insert({
      conversation_id: input.conversationId,
      student_id: actor.conversation.student_id,
      actor_id: actor.user.id,
      risk_level: safety.riskLevel,
      categories: safety.categories,
      explanation: safety.explanation,
      action_taken: shouldBlock ? 'blocked' : 'warned',
      confidence: safety.confidence,
      provider: safety.provider,
    })
    return { sent: false, blocked: shouldBlock, requiresConfirmation: shouldWarn, safety }
  }

  const { data: message, error } = await actor.admin
    .from('peak_messages')
    .insert({
      conversation_id: input.conversationId,
      sender_id: actor.user.id,
      body,
      reply_to_id: input.replyToId || null,
      metadata: { safety_categories: safety.categories },
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  await Promise.all([
    actor.admin.from('peak_conversations').update({
      last_message_preview: body.slice(0, 120),
      last_message_at: message.created_at,
      updated_at: message.created_at,
    }).eq('id', input.conversationId),
    notifyMessageRecipient(actor, body.slice(0, 120)),
  ])

  if (safety.categories.length > 0) {
    await actor.admin.from('peak_message_safety_reviews').insert({
      message_id: message.id,
      conversation_id: input.conversationId,
      student_id: actor.conversation.student_id,
      actor_id: actor.user.id,
      risk_level: safety.riskLevel,
      categories: safety.categories,
      explanation: safety.explanation,
      action_taken: input.confirmed ? 'flagged' : 'allowed',
      confidence: safety.confidence,
      provider: safety.provider,
    })
  }

  revalidatePath('/student/messages')
  revalidatePath('/teacher/messages')
  return { sent: true, message, safety }
}

export async function sendPeakMessage(input: {
  conversationId: string
  body: string
  replyToId?: string | null
  confirmed?: boolean
  expectedUserId?: string
}) {
  try {
    return await sendPeakMessageUnsafe(input)
  } catch (error) {
    console.error('[PeakMessaging] Message send failed', {
      conversationId: input.conversationId,
      error,
    })
    return {
      sent: false,
      error: error instanceof Error && !error.message.includes('Server Components render')
        ? error.message
        : 'Your message could not be sent. Please try again.',
    }
  }
}

export async function editPeakMessage(messageId: string, bodyInput: string, confirmed = false) {
  const body = bodyInput.trim()
  if (!body || body.length > 4000) throw new Error('Message must be between 1 and 4000 characters')
  const actor = await getActor()
  const { data: existing } = await actor.admin.from('peak_messages').select('*').eq('id', messageId).single()
  if (!existing || existing.sender_id !== actor.user.id) throw new Error('You can edit only your own message')
  await authorizeConversation(existing.conversation_id)

  const safety = await classifyMessage(body, [])
  if (safety.riskLevel === 'high' || safety.riskLevel === 'critical' || (safety.riskLevel === 'medium' && !confirmed)) {
    return {
      edited: false,
      blocked: safety.riskLevel === 'high' || safety.riskLevel === 'critical',
      requiresConfirmation: safety.riskLevel === 'medium',
      safety,
    }
  }

  const { data, error } = await actor.admin.from('peak_messages').update({
    body,
    edited_at: new Date().toISOString(),
  }).eq('id', messageId).select('*').single()
  if (error) throw new Error(error.message)
  return { edited: true, message: data, safety }
}

export async function deletePeakMessage(messageId: string) {
  const actor = await getActor()
  const { data: existing } = await actor.admin.from('peak_messages').select('id, sender_id, conversation_id').eq('id', messageId).single()
  if (!existing || existing.sender_id !== actor.user.id) throw new Error('You can delete only your own message')
  await authorizeConversation(existing.conversation_id)
  const { error } = await actor.admin.from('peak_messages').update({
    body: 'Message deleted',
    deleted_at: new Date().toISOString(),
    metadata: {},
  }).eq('id', messageId)
  if (error) throw new Error(error.message)
  return { deleted: true }
}

export async function markPeakConversationRead(conversationId: string, expectedUserId?: string) {
  const actor = await authorizeConversation(conversationId, expectedUserId)
  const column = actor.role === 'student' ? 'student_last_read_at' : 'teacher_last_read_at'
  await actor.admin.from('peak_conversations').update({ [column]: new Date().toISOString() }).eq('id', conversationId)
  return { read: true }
}

export async function getPeakTypingStatus(conversationId: string) {
  const actor = await authorizeConversation(conversationId)
  const { data } = await actor.admin
    .from('peak_typing_presence')
    .select('user_id, is_typing, updated_at')
    .eq('conversation_id', conversationId)
    .neq('user_id', actor.user.id)
  return (data || []).some((item) =>
    item.is_typing && Date.now() - new Date(item.updated_at).getTime() < 5000
  )
}

export async function setPeakConversationPaused(conversationId: string, paused: boolean, expectedUserId?: string) {
  const actor = await authorizeConversation(conversationId, expectedUserId)
  const column = actor.role === 'student' ? 'is_archived_by_student' : 'is_archived_by_teacher'
  const { error } = await actor.admin
    .from('peak_conversations')
    .update({ [column]: paused, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
  if (error) return { ok: false as const, error: 'The conversation setting could not be changed.' }
  return { ok: true as const, paused }
}

export async function togglePeakReaction(messageId: string, emoji: string) {
  const actor = await getActor()
  const { data: message } = await actor.admin.from('peak_messages').select('conversation_id').eq('id', messageId).single()
  if (!message) throw new Error('Message not found')
  await authorizeConversation(message.conversation_id)
  const { data: existing } = await actor.admin
    .from('peak_message_reactions')
    .select('message_id')
    .eq('message_id', messageId)
    .eq('user_id', actor.user.id)
    .eq('emoji', emoji)
    .maybeSingle()
  if (existing) {
    await actor.admin.from('peak_message_reactions').delete().eq('message_id', messageId).eq('user_id', actor.user.id).eq('emoji', emoji)
  } else {
    await actor.admin.from('peak_message_reactions').insert({ message_id: messageId, user_id: actor.user.id, emoji })
  }
  return { active: !existing }
}

export async function generatePeakReply(conversationId: string) {
  const actor = await authorizeConversation(conversationId)
  if (actor.role !== 'teacher') throw new Error('Reply coaching is available to teachers')
  const { data: messages } = await actor.admin
    .from('peak_messages')
    .select('body, sender_id')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  const fallback = 'Thanks for explaining that. Tell me which part feels most difficult, and we will work through it step by step.'
  if (!hasGroqToken() && !hasGeminiToken() && !hasHuggingFaceToken()) return { reply: fallback, provider: 'peak-core' }

  try {
    const transcript = (messages || []).reverse().map((item) => `${item.sender_id === actor.user.id ? 'Teacher' : 'Student'}: ${item.body}`).join('\n')
    const result = await callMessagingAI([
      { role: 'system', content: 'Write one concise, warm, professional teacher reply. Keep communication learning-focused, age-appropriate, and within school boundaries. Do not mention AI.' },
      { role: 'user', content: transcript },
    ], { temperature: 0.3, maxTokens: 180 })
    return { reply: result.content, provider: result.model }
  } catch {
    return { reply: fallback, provider: 'peak-core' }
  }
}

export async function getPeakUnreadCount(expectedUserId?: string) {
  const actor = await getActor(expectedUserId)
  const idColumn = actor.role === 'student' ? 'student_id' : 'teacher_id'
  const id = actor.role === 'student' ? actor.student!.id : actor.teacher!.id
  const readColumn = actor.role === 'student' ? 'student_last_read_at' : 'teacher_last_read_at'
  const { data: conversations } = await actor.admin.from('peak_conversations').select(`id, ${readColumn}`).eq(idColumn, id)
  if (!conversations?.length) return 0

  let count = 0
  for (const conversation of conversations) {
    let query = actor.admin.from('peak_messages').select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversation.id)
      .neq('sender_id', actor.user.id)
    const readAt = (conversation as any)[readColumn]
    if (readAt) query = query.gt('created_at', readAt)
    const { count: unread } = await query
    count += unread || 0
  }
  return count
}
