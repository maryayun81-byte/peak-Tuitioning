'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { callGitHubModelsChat, hasGitHubModelsToken } from '@/lib/github-models-chat'
import { callGroqChat, hasGroqToken } from '@/lib/groq-chat'
import { callHuggingFaceChat, hasHuggingFaceToken } from '@/lib/huggingface-chat'

export type PublicSupportMessage = {
  role: 'user' | 'assistant'
  content: string
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
      'I can help with Peak Performance Tutoring, KCSE/CBC support, holiday tuition, registration and contact details. For the fastest human response, call or WhatsApp 0798971625.',
    provider: 'peak-core',
    model: 'rules',
  }
}

function getPeakSupportQuickReply(message: string) {
  const lower = message.toLowerCase()
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

export async function askPublicSupport(input: {
  message: string
  history?: PublicSupportMessage[]
  path?: string
}) {
  const message = String(input.message || '').trim()
  if (!message) return { success: false, error: 'Please type a message.' }

  const history = (input.history || [])
    .filter((item) => item?.content && ['user', 'assistant'].includes(item.role))
    .slice(-8)

  const quickReply = getPeakSupportQuickReply(message)
  if (quickReply) {
    return {
      success: true,
      reply: quickReply,
      provider: 'peak-core',
      model: 'rules',
    }
  }

  const result = await callSupportModel([
    {
      role: 'system',
      content: `You are Peak Support, the public website assistant for Peak Performance Tutoring in Kenya.
Answer warmly, specifically and concisely.
Never give generic institution advice. Speak as Peak Performance.
Format replies for a chat bubble:
- Start with a direct answer in one short sentence.
- Then give at most 3 short bullet points when useful.
- End with one clear action.
Keep the whole reply under 90 words unless the user asks for detail.
You can help with KCSE tutoring, CBC tutoring, holiday tuition, registration, fees guidance, location, contact, portals, testimonials, and how Peak works.
Important facts:
- Phone and WhatsApp: 0798971625.
- Location: St Ignatius Christian School, Kinoo.
- Peak supports KCSE/8-4-4 and CBC learners.
- Public registration page: /events/register.
- Contact page: /contact.
- Holiday tuition page: /holiday-tuition-kenya.
If asked how to register for holiday tuition, say:
Register on /events/register, choose the programme, fill learner/parent details, choose curriculum/class, add subject performance, then submit. Peak will contact the parent/guardian.
Do not claim a human has been assigned unless the user asks for handoff and the system confirms it.
Do not take payments in chat.
If the user needs a human, ask for name and phone, or tell them to use WhatsApp/call 0798971625.`,
    },
    ...history,
    { role: 'user', content: message },
  ])

  return {
    success: true,
    reply: result.content,
    provider: result.provider,
    model: result.model,
  }
}

export async function requestHumanSupport(input: {
  name?: string
  phone?: string
  email?: string
  message: string
  transcript?: PublicSupportMessage[]
  path?: string
}) {
  const message = String(input.message || '').trim()
  if (!message) return { success: false, error: 'Please tell us what you need help with.' }

  try {
    const admin = await createAdminClient()
    const { error } = await admin.from('public_support_handoffs').insert({
      name: String(input.name || '').trim() || null,
      phone: String(input.phone || '').trim() || null,
      email: String(input.email || '').trim() || null,
      message,
      transcript: Array.isArray(input.transcript) ? input.transcript.slice(-20) : [],
      source_path: String(input.path || '').slice(0, 240) || null,
    })

    if (error) return { success: false, error: error.message }

    return {
      success: true,
      message: 'Human support request received. Peak Performance will follow up. For urgent help, WhatsApp or call 0798971625.',
    }
  } catch (error: any) {
    console.error('[PublicSupport] handoff failed:', error)
    return { success: false, error: error?.message || 'Could not request human support.' }
  }
}
