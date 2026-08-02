'use server'

/**
 * Peak Coach AI commentary.
 *
 * Takes the serializable CoachInput the admin page already computes, runs it
 * through the same five-provider AI chain used by the chat assistant
 * (Groq → Gemini → Hugging Face → NVIDIA → GitHub Models) and returns a short,
 * clearly-labelled commentary paragraph. The deterministic brief (verdicts,
 * flags, insights) is always computed client-side by buildCoachBrief — the AI
 * only adds context and can never contradict the numbers or change flags.
 * Returns null when every provider fails, so the panel simply shows the
 * deterministic brief without AI commentary.
 */

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { callGroqChat, hasGroqToken } from '@/lib/groq-chat'
import { callGeminiChat, hasGeminiToken } from '@/lib/gemini-chat'
import { callHuggingFaceChat, hasHuggingFaceToken } from '@/lib/huggingface-chat'
import { callNvidiaChat, hasNvidiaToken } from '@/lib/nvidia-chat'
import { callGitHubModelsChat, hasGitHubModelsToken } from '@/lib/github-models-chat'
import type { CoachInput } from '@/lib/weekly-insights'
import {
  COACH_SYSTEM_PROMPT,
  buildCoachSnapshot,
  parseCoachCommentary,
  type CoachCommentary,
} from '@/lib/coach-ai'

type ProviderResult = { content: string; provider: string; model?: string }

export async function generateCoachCommentary(input: CoachInput): Promise<CoachCommentary | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const headerList = await headers()
    const identifier = user.id || getClientIp(headerList)
    const { success } = rateLimit(`coach_commentary_${identifier}`, {
      limit: 10,
      windowMs: 60 * 1000,
    })
    if (!success) return null

    const snapshot = buildCoachSnapshot(input)
    const messages = [
      { role: 'system' as const, content: COACH_SYSTEM_PROMPT },
      { role: 'user' as const, content: snapshot },
    ]
    const options = { temperature: 0.35, maxTokens: 300 }

    const providers: { name: string; call: () => Promise<ProviderResult> }[] = []

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
    if (hasNvidiaToken()) {
      providers.push({
        name: 'NVIDIA',
        call: () => callNvidiaChat(messages, options),
      })
    }
    if (hasGitHubModelsToken()) {
      providers.push({
        name: 'GitHub Models',
        call: () => callGitHubModelsChat(messages, options),
      })
    }

    for (const provider of providers) {
      try {
        const response = await provider.call()
        const text = parseCoachCommentary(response.content)
        if (!text) continue
        return { text, provider: provider.name, model: response.model }
      } catch (error: any) {
        console.error(`[Coach] ${provider.name} failed, trying next provider:`, error?.message || error)
      }
    }

    return null
  } catch (error: any) {
    console.error('[Coach] generateCoachCommentary error:', error?.message || error)
    return null
  }
}

