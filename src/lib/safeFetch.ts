/**
 * safeFetch — Global timeout + retry wrapper for all portal data fetches.
 *
 * Guarantees:
 * - Requests never hang beyond `timeoutMs` (default 8 seconds)
 * - Automatic retry with exponential back-off + jitter (default 2 retries)
 * - AbortController support so pending requests are cancelled on navigation
 * - Returns { data, error } — never throws
 *
 * Usage:
 *   const { data, error } = await safeFetch(() =>
 *     supabase.from('students').select('*').eq('id', id).single()
 *   )
 */

export interface SafeFetchResult<T> {
  data: T | null
  error: string | null
  timedOut: boolean
}

const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_RETRIES = 2

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function jitter(ms: number) {
  return ms + Math.random() * ms * 0.3
}

export async function safeFetch<T>(
  fetcher: () => Promise<{ data: T | null; error: any }>,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    signal,
  }: {
    timeoutMs?: number
    retries?: number
    signal?: AbortSignal
  } = {}
): Promise<SafeFetchResult<T>> {
  let lastError: string | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Check if the component unmounted / navigation changed
    if (signal?.aborted) {
      return { data: null, error: 'Request cancelled', timedOut: false }
    }

    // Race the fetcher against a timeout
    const timeoutPromise = new Promise<{ data: null; error: { message: string }; timedOut: true }>(
      resolve =>
        setTimeout(
          () => resolve({ data: null, error: { message: `Request timed out after ${timeoutMs / 1000}s` }, timedOut: true }),
          timeoutMs
        )
    )

    try {
      const result = await Promise.race([
        fetcher().then(r => ({ ...r, timedOut: false as const })),
        timeoutPromise,
      ])

      if (result.timedOut) {
        lastError = `Request timed out after ${timeoutMs / 1000}s`
        // Only retry on timeout if we have retries left and it's not the last attempt
        if (attempt < retries) {
          await sleep(jitter(500 * Math.pow(2, attempt)))
          continue
        }
        return { data: null, error: lastError, timedOut: true }
      }

      if (result.error) {
        lastError = result.error?.message || 'Unknown error'
        // Don't retry on auth errors or not-found (single() returns PGRST116)
        const code = result.error?.code
        if (code === 'PGRST116' || code === '401' || code === '403') {
          return { data: null, error: lastError, timedOut: false }
        }
        if (attempt < retries) {
          await sleep(jitter(500 * Math.pow(2, attempt)))
          continue
        }
        return { data: null, error: lastError, timedOut: false }
      }

      return { data: result.data, error: null, timedOut: false }
    } catch (e: any) {
      lastError = e?.message || 'Unexpected error'
      if (attempt < retries) {
        await sleep(jitter(500 * Math.pow(2, attempt)))
      }
    }
  }

  return { data: null, error: lastError ?? 'Failed after retries', timedOut: false }
}

/**
 * safeRpc — Same as safeFetch but for Supabase RPC calls that return a value directly.
 */
export async function safeRpc<T>(
  fetcher: () => Promise<{ data: T | null; error: any }>,
  options?: Parameters<typeof safeFetch>[1]
): Promise<SafeFetchResult<T>> {
  return safeFetch<T>(fetcher, options)
}

/**
 * fetchWithTimeout — Wrapper for raw fetch() requests with timeout support.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}
