import { generateText } from 'ai'
import { githubModels } from '@github/models'

export type GitHubModelsMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type GitHubModelsOptions = {
  temperature?: number
  maxTokens?: number
}

type GitHubModelsResult = {
  content: string
  provider: 'github-models'
  model: string
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN

// Model fallback chain — all free via GitHub Models marketplace
const MODEL_CHAIN = [
  'meta/meta-llama-3.1-8b-instruct',
  'openai/gpt-4o-mini',
  'mistral-ai/mistral-small',
]

export function hasGitHubModelsToken() {
  return Boolean(GITHUB_TOKEN)
}

export async function callGitHubModelsChat(
  messages: GitHubModelsMessage[],
  options: GitHubModelsOptions = {},
): Promise<GitHubModelsResult> {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token missing. Set GITHUB_TOKEN in .env.local')
  }

  const errors: string[] = []

  // Convert system messages: GitHub Models via Vercel AI SDK uses a flat
  // prompt for simple calls, but supports messages array via the messages param.
  // We combine system + user into the messages array directly.
  const aiMessages = messages.map(m => ({
    role: m.role as 'system' | 'user' | 'assistant',
    content: m.content,
  }))

  for (const modelId of MODEL_CHAIN) {
    try {
      const { text } = await generateText({
        model: githubModels(modelId),
        messages: aiMessages,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 4000,
      } as any)

      if (text && text.trim()) {
        return {
          content: text.trim(),
          provider: 'github-models',
          model: modelId,
        }
      }

      errors.push(`github-${modelId}:empty response`)
    } catch (error: any) {
      errors.push(`github-${modelId}:${error?.message || 'request failed'}`)
    }
  }

  throw new Error(`All GitHub Models fallbacks failed (${errors.join(', ')})`)
}
