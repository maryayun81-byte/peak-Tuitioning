import { fetchWithRetry, extractError } from './provider-utils'

export type GroqMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type GroqProvider = 'groq'

type GroqOptions = {
  temperature?: number
  maxTokens?: number
  responseFormat?: { type: 'json_object' }
}

type GroqResult = {
  content: string
  provider: GroqProvider
  model: string
  usage?: unknown
}

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

const MODEL_CHAIN: { provider: GroqProvider; model: string }[] = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'groq', model: 'llama-3.1-8b-instant' },
]

export function hasGroqToken() {
  return Boolean(GROQ_API_KEY)
}

export async function callGroqChat(
  messages: GroqMessage[],
  options: GroqOptions = {},
): Promise<GroqResult> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key missing. Set GROQ_API_KEY.')
  }

  const errors: string[] = []

  for (const candidate of MODEL_CHAIN) {
    try {
      const response = await fetchWithRetry(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: candidate.model,
          messages,
          temperature: options.temperature ?? 0.35,
          max_tokens: options.maxTokens ?? 1600,
          ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
        }),
      })

      const data = await response.json().catch(() => ({}))
      const content = data?.choices?.[0]?.message?.content

      if (response.ok && typeof content === 'string' && content.trim()) {
        return {
          content: content.trim(),
          provider: candidate.provider,
          model: candidate.model,
          usage: data.usage,
        }
      }

      const errDetail = await extractError(response)
      errors.push(`groq-${candidate.model}:${response.status} (${errDetail})`)
    } catch (error: any) {
      errors.push(`groq-${candidate.model}:${error?.message || 'request failed'}`)
    }
  }

  throw new Error(`All Groq model fallbacks failed (${errors.join(', ')})`)
}
