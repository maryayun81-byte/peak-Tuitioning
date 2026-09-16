/**
 * Submit reliability — retry with backoff + offline waiting, shared by
 * student assignment / quiz / trivia submissions.
 *
 * Policy: network-like failures retry (default 3 retries = 4 attempts) with
 * exponential backoff; while the browser reports offline we pause and wait
 * for the connection instead of burning attempts. Auth/permission/validation
 * failures are NEVER retried — the student gets a clear message immediately.
 */

export interface RetryState {
  /** 1-based attempt number currently running. */
  attempt: number
  /** Total attempts that will run (1 initial + retries). */
  maxAttempts: number
  /** True while paused waiting for the network to return. */
  waitingOffline: boolean
}

export interface RetryOptions {
  /** Retries after the first attempt (default 3). */
  retries?: number
  /** Base backoff in ms, doubled per retry (default 1000). */
  baseDelayMs?: number
  /** Max wait for the connection to return per pause (default 60000). */
  offlineWaitMs?: number
  /** Called on every state change (drives the submit overlay). */
  onState?: (state: RetryState) => void
}

export class SubmitError extends Error {
  attempts: number
  retryable: boolean
  constructor(message: string, attempts: number, retryable: boolean) {
    super(message)
    this.name = 'SubmitError'
    this.attempts = attempts
    this.retryable = retryable
  }
}

const RETRYABLE_PATTERNS = [
  'fetch failed',
  'failed to fetch',
  'networkerror',
  'network error',
  'network request failed',
  'connection',
  'econnreset',
  'etimedout',
  'timeout',
  'abort',
  'offline',
  'internet',
  '502',
  '503',
  '504',
  'socket',
  'dns',
]

// Postgres / PostgREST / Supabase codes that retrying will never fix.
const FATAL_CODES = new Set([
  '42501', // RLS / permission denied
  '42502',
  '42602',
  'PGRST', // any PostgREST request error prefix is checked below
  '401',
  '403',
  '404',
  '409',
  '422',
])

export function isRetryableError(err: any): boolean {
  if (!err) return true
  const code = String(err.code || err.statusCode || err.status || '')
  if (FATAL_CODES.has(code) || /^PGRST/.test(code)) return false
  if (code === '42501') return false
  const msg = `${err.message || err} ${err.details || ''} ${err.hint || ''}`.toLowerCase()
  if (/permission denied|row-level security|rls|unauthorized|unauthenticated|jwt|expired|invalid.*token|duplicate|conflict|validation|check constraint|not-null|foreign key/i.test(msg)) {
    return false
  }
  if (RETRYABLE_PATTERNS.some((p) => msg.includes(p))) return true
  // Unknown errors fail fast with a clear message rather than a
  // mysterious 4-attempt spin — except obvious fetch TypeErrors.
  if (err instanceof TypeError) return true
  return false
}

function isOnline(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') return true
  return navigator.onLine
}

/** Resolves true when online (immediately if already online). */
export function waitForOnline(timeoutMs = 60000, onWaiting?: (waiting: boolean) => void): Promise<boolean> {
  if (isOnline()) return Promise.resolve(true)
  if (typeof window === 'undefined') return Promise.resolve(false)
  return new Promise((resolve) => {
    onWaiting?.(true)
    const done = (ok: boolean) => {
      window.removeEventListener('online', onOnline)
      onWaiting?.(false)
      resolve(ok)
    }
    const onOnline = () => done(true)
    const timer = setTimeout(() => done(isOnline()), timeoutMs)
    void timer
    window.addEventListener('online', onOnline, { once: true })
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs an async submit fn with retries. The fn must THROW on failure
 * (return values pass through). Rejects with SubmitError carrying the
 * attempt count, so callers can say "tried 4 times" honestly.
 */
export async function submitWithRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const retries = Math.max(opts.retries ?? 3, 0)
  const maxAttempts = retries + 1
  const emit = (attempt: number, waitingOffline: boolean) =>
    opts.onState?.({ attempt, maxAttempts, waitingOffline })

  let lastError: any = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    emit(attempt, false)
    try {
      return await fn(attempt)
    } catch (err: any) {
      lastError = err
      if (!isRetryableError(err)) {
        throw new SubmitError(friendlyMessage(err), attempt, false)
      }
      if (attempt >= maxAttempts) break
      // Offline? Pause the countdown and wait for the network instead of
      // burning attempts into the void.
      if (!isOnline()) {
        emit(attempt, true)
        await waitForOnline(opts.offlineWaitMs ?? 60000, (w) => {
          if (!w) emit(attempt, false)
        })
        emit(attempt, false)
      }
      const backoff = Math.min((opts.baseDelayMs ?? 1000) * Math.pow(2, attempt - 1), 8000)
      await sleep(backoff)
    }
  }
  throw new SubmitError(
    `Couldn't reach Peak after ${maxAttempts} tries. Your work is saved as a draft — check your connection and tap Submit again.`,
    maxAttempts,
    true
  )
}

/** Human, actionable messages for non-retryable failures. */
export function friendlyMessage(err: any): string {
  const code = String(err?.code || err?.statusCode || err?.status || '')
  const msg = `${code} ${err?.message || err || ''} ${err?.details || ''}`
  if (/row-level security|permission denied|42501/i.test(msg)) {
    return 'Your account is not allowed to save this. Try logging out and back in — your work is safe as a draft.'
  }
  if (/jwt|expired|unauthenticated|unauthorized|401/i.test(msg)) {
    return 'Your session expired. Log in again to submit — your answers are saved as a draft.'
  }
  if (/duplicate|conflict|409/i.test(msg)) {
    return 'This was already submitted. Refresh to see the latest status.'
  }
  if (msg && msg.length < 160) return msg
  return 'Submission failed. Your work is saved as a draft — please try again.'
}
