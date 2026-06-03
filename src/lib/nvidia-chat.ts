import { fetchWithRetry, extractError } from './provider-utils'

export type NvidiaMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type NvidiaProvider = 'nvidia'

type NvidiaOptions = {
  temperature?: number
  maxTokens?: number
}

type NvidiaResult = {
  content: string
  provider: NvidiaProvider
  model: string
  usage?: unknown
}

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY
const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions'

const MODEL_CHAIN: { provider: NvidiaProvider; model: string }[] = [
  { provider: 'nvidia', model: 'meta/llama-3.3-70b-instruct' },
  { provider: 'nvidia', model: 'mistralai/mistral-7b-instruct-v0.3' },
]

export function hasNvidiaToken() {
  return Boolean(NVIDIA_API_KEY)
}

export async function callNvidiaChat(
  messages: NvidiaMessage[],
  options: NvidiaOptions = {},
): Promise<NvidiaResult> {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA API key missing. Set NVIDIA_API_KEY.')
  }

  const errors: string[] = []

  for (const candidate of MODEL_CHAIN) {
    try {
      const response = await fetchWithRetry(NVIDIA_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: candidate.model,
          messages,
          temperature: options.temperature ?? 0.35,
          max_tokens: options.maxTokens ?? 1600,
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
      errors.push(`nvidia-${candidate.model}:${response.status} (${errDetail})`)
    } catch (error: any) {
      errors.push(`nvidia-${candidate.model}:${error?.message || 'request failed'}`)
    }
  }

  throw new Error(`All NVIDIA model fallbacks failed (${errors.join(', ')})`)
}
