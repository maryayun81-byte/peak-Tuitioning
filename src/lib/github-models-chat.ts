export type GitHubModelsMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type GitHubModelsOptions = {
  temperature?: number
  maxTokens?: number
  task?: 'reasoning' | 'language' | 'quick'
}

type GitHubModelsResult = {
  content: string
  provider: 'github-models'
  model: string
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_TOKEN
const GITHUB_MODELS_ENDPOINT = process.env.GITHUB_MODELS_ENDPOINT || 'https://models.github.ai/inference/chat/completions'

const MODEL_CHAINS: Record<NonNullable<GitHubModelsOptions['task']>, string[]> = {
  reasoning: [
    'microsoft/phi-4-reasoning',
    'microsoft/phi-4',
    'microsoft/phi-4-mini-instruct',
  ],
  language: [
    'microsoft/phi-4',
    'microsoft/phi-4-mini-instruct',
    'microsoft/phi-4-reasoning',
  ],
  quick: [
    'microsoft/phi-4-mini-instruct',
    'microsoft/phi-4',
  ],
}

function inferTask(messages: GitHubModelsMessage[]): NonNullable<GitHubModelsOptions['task']> {
  const text = messages.map(message => message.content).join('\n').toLowerCase()
  if (/(math|mathematics|chemistry|physics|calculate|calculation|equation|reasoning|graph|paper 2)/.test(text)) return 'reasoning'
  if (/(english|kiswahili|set book|setbook|poem|ushairi|essay|literature|composition|functional writing)/.test(text)) return 'language'
  return 'quick'
}

export function hasGitHubModelsToken() {
  return Boolean(GITHUB_TOKEN)
}

export async function callGitHubModelsChat(
  messages: GitHubModelsMessage[],
  options: GitHubModelsOptions = {},
): Promise<GitHubModelsResult> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token missing. Set GITHUB_TOKEN or GITHUB_MODELS_TOKEN in .env.local')
  }

  const task = options.task || inferTask(messages)
  const errors: string[] = []

  for (const modelId of MODEL_CHAINS[task]) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Number(process.env.GITHUB_MODELS_TIMEOUT_MS || 15000))
    try {
      const response = await fetch(GITHUB_MODELS_ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4000,
        }),
      })
      clearTimeout(timer)

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const detail = data?.error?.message || data?.message || response.statusText
        errors.push(`github-${modelId}:${response.status} ${detail}`)
        continue
      }

      const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || data?.output_text

      if (text && String(text).trim()) {
        return {
          content: String(text).trim(),
          provider: 'github-models',
          model: modelId,
        }
      }

      errors.push(`github-${modelId}:empty response`)
    } catch (error: any) {
      clearTimeout(timer)
      errors.push(`github-${modelId}:${error?.message || 'request failed'}`)
    }
  }

  throw new Error(`All GitHub Models fallbacks failed (${errors.join(', ')})`)
}
