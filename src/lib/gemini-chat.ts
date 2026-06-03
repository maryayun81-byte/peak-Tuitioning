import { fetchWithRetry, extractError } from './provider-utils'

export type GeminiMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type GeminiProvider = 'gemini'

type GeminiOptions = {
  temperature?: number
  maxTokens?: number
}

type GeminiResult = {
  content: string
  provider: GeminiProvider
  model: string
  usage?: unknown
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

function buildGeminiContents(messages: GeminiMessage[]) {
  const systemMessages = messages.filter(m => m.role === 'system')
  const conversationMessages = messages.filter(m => m.role !== 'system')

  const contents = conversationMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const systemInstruction = systemMessages.map(m => ({ text: m.content })).join('\n')

  return { contents, systemInstruction }
}

export function hasGeminiToken() {
  return Boolean(GEMINI_API_KEY)
}

export async function callGeminiChat(
  messages: GeminiMessage[],
  options: GeminiOptions = {},
): Promise<GeminiResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key missing. Set GEMINI_API_KEY.')
  }

  const errors: string[] = []

  const models = [GEMINI_MODEL, 'gemini-2.5-pro']

  for (const model of models) {
    try {
      const { contents, systemInstruction } = buildGeminiContents(messages)

      const body: Record<string, any> = {
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.35,
          maxOutputTokens: options.maxTokens ?? 1600,
        },
      }

      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] }
      }

      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (typeof text === 'string' && text.trim()) {
          return {
            content: text.trim(),
            provider: 'gemini',
            model,
            usage: data?.usageMetadata,
          }
        }
      }

      const errDetail = await extractError(response)
      errors.push(`gemini-${model}:${response.status} (${errDetail})`)
    } catch (error: any) {
      errors.push(`gemini-${model}:${error?.message || 'request failed'}`)
    }
  }

  throw new Error(`All Gemini model fallbacks failed (${errors.join(', ')})`)
}
