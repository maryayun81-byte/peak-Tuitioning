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
const MAX_TIMEOUT_MS = 25000 // 25s per attempt — accounts for Vercel/Supabase cold-starts

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

  // If the request was cancelled before it even started, exit immediately.
  if (init?.signal?.aborted) {
    const err = new Error('Aborted')
    err.name = 'AbortError'
    throw err
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Check if the user navigated away between retry delays
    if (init?.signal?.aborted) {
      const err = new Error('Aborted')
      err.name = 'AbortError'
      throw err
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), MAX_TIMEOUT_MS)

    // Bridge the parent's generic abort signal to our internal controller
    const parentAbortHandler = () => {
      clearTimeout(timeoutId)
      controller.abort()
    }

    if (init?.signal) {
      init.signal.addEventListener('abort', parentAbortHandler)
    }

    try {
      if (attempt > 0) {
        console.warn(`[ResilientFetch] Retry attempt ${attempt}/${MAX_RETRIES} for: ${input.toString().split('?')[0]}`)
      }

      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })

      // Buffering the payload ensures that the 25-second timeout protects both the TCP connection
      // AND the entire data download. If the network drops while downloading the payload, arrayBuffer() 
      // will throw, triggering our retry mechanism rather than hanging the application indefinitely.
      const buffer = await response.arrayBuffer()

      // We have the full, valid response. Clean up listeners and exit.
      clearTimeout(timeoutId)
      if (init?.signal) {
        init.signal.removeEventListener('abort', parentAbortHandler)
      }
      
      // Reconstruct the response with the buffered body so downstream clients (supabase-js) can parse it.
      return new Response(buffer, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })

    } catch (err: any) {
      clearTimeout(timeoutId)
      if (init?.signal) {
        init.signal.removeEventListener('abort', parentAbortHandler)
      }
      
      lastError = err

      // If the parent explicitly cancelled the request (e.g. user navigated away), 
      // DO NOT RETRY. Throw immediately to release the connection pool.
      if (init?.signal?.aborted) {
        throw err
      }

      // Check if it's our internal 10s timeout OR a legitimate network reset
      const isInternalTimeout = err.name === 'AbortError' && !init?.signal?.aborted
      const shouldRetry = isInternalTimeout || isRetryableError(err)

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
