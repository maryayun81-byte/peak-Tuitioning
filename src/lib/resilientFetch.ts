/**
 * resilientFetch
 * A low-level "Military-Grade" fetch wrapper designed to handle unstable infrastructure.
 * 
 * Specifically targets:
 * - ECONNRESET (Connection reset by peer)
 * - ETIMEDOUT / ConnectTimeoutError (Network timeouts)
 * - UND_ERR_CONNECT_TIMEOUT (Internal Node/Undici timeouts)
 */

const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 500
const MAX_TIMEOUT_MS = 10000 // 10s per attempt

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Checks if an error is a retryable network-level failure.
 */
function isRetryableError(error: any): boolean {
  const msg = error?.message?.toLowerCase() || ''
  const code = error?.code || ''
  
  return (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ADDRNOTAVAIL' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    msg.includes('fetch failed') ||
    msg.includes('timeout') ||
    msg.includes('network error') ||
    msg.includes('connection reset')
  )
}

/**
 * resilientFetch - Drop-in replacement for global.fetch with auto-retry logic.
 */
export async function resilientFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  let lastError: any = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT_MS)

    try {
      if (attempt > 0) {
        console.warn(`[ResilientFetch] Retry attempt ${attempt}/${MAX_RETRIES} for: ${input.toString().split('?')[0]}`)
      }

      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })

      // If we got a response, clear timeout and return
      clearTimeout(timeoutId)
      return response

    } catch (err: any) {
      clearTimeout(timeoutId)
      lastError = err

      const isTimeout = err.name === 'AbortError'
      const shouldRetry = isTimeout || isRetryableError(err)

      if (shouldRetry && attempt < MAX_RETRIES) {
        // Exponential backoff: 500ms, 1000ms, 2000ms...
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt)
        await sleep(delay)
        continue
      }

      // If not retryable or max retries reached, throw
      console.error(`[ResilientFetch] Critical failure after ${attempt} retries:`, err.message)
      throw err
    }
  }

  throw lastError || new Error('ResilientFetch failed after max retries')
}
