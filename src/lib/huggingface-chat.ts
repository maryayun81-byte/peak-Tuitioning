export type HFChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type HFChatProvider = 'reasoning' | 'qwen' | 'deepseek' | 'intelligence'

type HFChatOptions = {
  temperature?: number
  maxTokens?: number
  responseFormat?: { type: 'json_object' }
}

type HFChatResult = {
  content: string
  provider: HFChatProvider
  model: string
  usage?: unknown
}

const HUGGING_FACE_TOKEN = process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN
const HUGGING_FACE_ENDPOINT =
  process.env.HUGGINGFACE_CHAT_ENDPOINT || 'https://router.huggingface.co/v1/chat/completions'

const MODEL_CHAIN: { provider: HFChatProvider; model: string }[] = [
  {
    provider: 'reasoning',
    model: process.env.HF_REASONING_MODEL || 'Qwen/Qwen3-32B',
  },
  {
    provider: 'qwen',
    model: process.env.HF_QWEN_MODEL || 'Qwen/Qwen2.5-72B-Instruct',
  },
  {
    provider: 'deepseek',
    model: process.env.HF_DEEPSEEK_MODEL || 'deepseek-ai/DeepSeek-V3-0324',
  },
  {
    provider: 'intelligence',
    model: process.env.HF_INTELLIGENCE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct',
  },
]

export function hasHuggingFaceToken() {
  return Boolean(HUGGING_FACE_TOKEN)
}

export async function callHuggingFaceChat(
  messages: HFChatMessage[],
  options: HFChatOptions = {},
): Promise<HFChatResult> {
  if (!HUGGING_FACE_TOKEN) {
    throw new Error('Hugging Face token missing. Set HUGGINGFACE_API_TOKEN or HF_TOKEN.')
  }

  const errors: string[] = []

  for (const candidate of MODEL_CHAIN) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 18000)

      const response = await fetch(HUGGING_FACE_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: candidate.model,
          messages,
          temperature: options.temperature ?? 0.4,
          max_tokens: options.maxTokens ?? 1200,
          ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
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

      errors.push(`${candidate.provider}:${response.status}`)
    } catch (error: any) {
      errors.push(`${candidate.provider}:${error?.message || 'request failed'}`)
    }
  }

  throw new Error(`All Hugging Face model fallbacks failed (${errors.join(', ')})`)
}
